import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, type UIMessage } from "ai";
import { z } from "zod";
import { ollamaModelSchema } from "@/lib/agents";

export class OllamaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

function upstreamError(status: number): OllamaError {
  if (status === 401)
    return new OllamaError(
      "authentication",
      "رفضت بوابة Ollama المصادقة؛ راجع اسم المستخدم وكلمة المرور أو مفتاح الخدمة على الخادم.",
    );
  if (status === 403)
    return new OllamaError(
      "forbidden",
      "رفضت خدمة Ollama الطلب (403)؛ راجع صلاحية الوصول وترويسة Host في البروكسي.",
    );
  if (status === 404)
    return new OllamaError(
      "not_found",
      "نموذج Ollama غير موجود أو أن عنوان الخدمة غير صحيح؛ حدّث قائمة النماذج.",
    );
  return new OllamaError("upstream", `تعذر إكمال الطلب لدى Ollama (${status})؛ راجع سجل الخدمة.`);
}

// Fixed application endpoint. Credentials remain server-side.
export const OLLAMA_BASE_URL = "https://ollama.alazab.com";
export const OLLAMA_TEST_TIMEOUT_MS = 300_000;

export function ollamaConfig() {
  const baseURL = OLLAMA_BASE_URL;
  const username = process.env["OLLAMA_AUTH_USER"];
  const password = process.env["OLLAMA_AUTH_PASS"];
  if (Boolean(username) !== Boolean(password) || username?.includes(":")) {
    throw new OllamaError(
      "configuration",
      "إعداد مصادقة Ollama غير مكتمل؛ اضبط اسم المستخدم وكلمة المرور معًا دون نقطتين في اسم المستخدم.",
    );
  }
  const headers: Record<string, string> = {};
  // Match the existing Nginx auth_basic gateway. A complete Basic pair takes
  // precedence over an optional Bearer key; never embed credentials in the URL.
  if (username && password) {
    headers["Authorization"] =
      `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
  } else if (process.env["OLLAMA_API_KEY"]) {
    headers["Authorization"] = `Bearer ${process.env["OLLAMA_API_KEY"]}`;
  }
  return {
    baseURL,
    headers,
    authMode: username ? "basic" : headers["Authorization"] ? "bearer" : "none",
  };
}

export function ollamaTestTimeoutMs() {
  return OLLAMA_TEST_TIMEOUT_MS;
}

export function ollamaModelName(model: string) {
  return ollamaModelSchema.parse(model).slice(7);
}

async function ollamaRequest(path: string, body?: unknown, signal?: AbortSignal) {
  const { baseURL, headers } = ollamaConfig();
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(`${baseURL}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    redirect: "error",
  });
  if (!response.ok) throw upstreamError(response.status);
  return response.json();
}

export async function listOllamaModels() {
  const data = z
    .object({ models: z.array(z.object({ name: z.string() })) })
    .parse(await ollamaRequest("/api/tags"));
  return [...new Set(data.models.map(({ name }) => `ollama/${name}`))]
    .filter((id) => ollamaModelSchema.safeParse(id).success)
    .sort()
    .map((id) => ({ id: ollamaModelSchema.parse(id), label: id.slice(7) }));
}

export async function ollamaCapabilities(model: string, signal?: AbortSignal) {
  const data = z
    .object({ capabilities: z.array(z.string()).optional() })
    .parse(await ollamaRequest("/api/show", { model: ollamaModelName(model) }, signal));
  // Older Ollama versions omit capabilities. Text chat remains available;
  // tools and images are enabled only when explicitly advertised.
  const capabilities = data.capabilities ?? ["completion"];
  if (!capabilities.includes("completion"))
    throw new OllamaError(
      "unsupported_model",
      "نموذج Ollama المختار لا يدعم المحادثة؛ اختر نموذجًا لغويًا.",
    );
  return {
    tools: capabilities.includes("tools"),
    vision: capabilities.includes("vision"),
    thinking: capabilities.includes("thinking"),
  };
}

export function validateOllamaAttachments(messages: UIMessage[], vision: boolean) {
  const files = messages.flatMap((message) => message.parts.filter((part) => part.type === "file"));
  if (files.some((file) => !file.mediaType.startsWith("image/"))) {
    throw new OllamaError(
      "unsupported_attachment",
      "محادثة Ollama تدعم المرفقات المصورة فقط؛ أرسل محتوى المستند كنص أو اختر المزوّد الحالي.",
    );
  }
  if (files.length && !vision)
    throw new OllamaError(
      "unsupported_attachment",
      "نموذج Ollama المختار لا يدعم الصور؛ اختر نموذجًا يدعم الرؤية أو محادثة نصية.",
    );
}

export function ollamaChatModel(model: string) {
  const { baseURL, headers } = ollamaConfig();
  return createOpenAICompatible({
    name: "ollama",
    baseURL: `${baseURL}/v1`,
    headers,
    includeUsage: true,
    fetch: (input, init) => fetch(input, { ...init, redirect: "error" }),
  }).chatModel(ollamaModelName(model));
}

export function ollamaFailure(error: unknown) {
  // Only controlled messages are returned. SDK errors may include request
  // headers, proxy response bodies, or URLs; never relay them to the browser.
  if (error instanceof OllamaError)
    return { ok: false as const, code: error.code, message: error.message };
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return ollamaFailure(upstreamError(error.statusCode));
  }
  const name = error && typeof error === "object" && "name" in error ? error.name : "";
  if (name === "TimeoutError")
    return {
      ok: false as const,
      code: "timeout",
      message:
        "انتهت مهلة Ollama؛ لم يكتمل الاختبار. قد يستغرق تحميل النموذج على المعالج وقتًا أطول؛ راجع السجلات ثم أعد المحاولة.",
    };
  if (name === "AbortError")
    return { ok: false as const, code: "cancelled", message: "أُلغي طلب Ollama قبل اكتماله." };
  return {
    ok: false as const,
    code: "connection",
    message: "تعذر الوصول إلى Ollama. تأكد أن الخدمة تعمل وأن خادم التطبيق يستطيع الوصول إليها.",
  };
}

export function ollamaErrorMessage(error: unknown): string {
  return ollamaFailure(error).message;
}

export async function checkOllamaModel(model: string) {
  const started = Date.now();
  let stage: "capabilities" | "generation" = "capabilities";
  let signal: AbortSignal | undefined;
  try {
    const capabilities = await ollamaCapabilities(model);
    stage = "generation";
    signal = AbortSignal.timeout(ollamaTestTimeoutMs());
    const result = await generateText({
      model: ollamaChatModel(model),
      prompt: "Reply with OK only.",
      // 128 tokens can be consumed entirely by a thinking model. Give the
      // diagnostic enough room for a final answer without changing chat defaults.
      maxOutputTokens: 1024,
      maxRetries: 0,
      abortSignal: signal,
      ...(/(^|\/)gpt-oss(?::|$)/.test(ollamaModelName(model)) && capabilities.thinking
        ? { providerOptions: { ollama: { reasoningEffort: "low" } } }
        : {}),
    });
    const elapsedMs = Date.now() - started;
    if (!result.text.trim()) {
      return {
        ok: false as const,
        code: result.reasoningText?.trim() ? "reasoning_only" : "empty_response",
        stage,
        elapsedMs,
        capabilities,
        message: result.reasoningText?.trim()
          ? "خدمة Ollama متصلة وأعاد النموذج تفكيرًا، لكن لم تصل إجابة نصية مكتملة ضمن حد الاختبار."
          : "خدمة Ollama متصلة، لكن النموذج لم يُرجع إجابة نصية؛ راجع سجل التوليد.",
      };
    }
    if (result.finishReason === "length") {
      return {
        ok: false as const,
        code: "output_limit",
        stage,
        elapsedMs,
        capabilities,
        message: "خدمة Ollama متصلة، لكن الرد توقف عند حد إخراج الاختبار قبل اكتماله.",
      };
    }
    return {
      ok: true as const,
      code: "ready",
      stage,
      elapsedMs,
      capabilities,
      message: `نجح اختبار التوليد عبر Ollama خلال ${(elapsedMs / 1000).toFixed(1)} ثانية. الأدوات: ${capabilities.tools ? "مدعومة" : "غير مدعومة"}، الصور: ${capabilities.vision ? "مدعومة" : "غير مدعومة"}، التفكير: ${capabilities.thinking ? "مدعوم" : "غير معلن"}.`,
    };
  } catch (error) {
    return {
      ...ollamaFailure(signal?.aborted ? signal.reason : error),
      stage,
      elapsedMs: Date.now() - started,
    };
  }
}
