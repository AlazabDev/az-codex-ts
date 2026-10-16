import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { UIMessage } from "ai";
import { z } from "zod";
import { ollamaModelSchema } from "@/lib/agents";

// Only deployment configuration can choose the upstream host. Never accept a URL
// from user metadata or RPC input: all authenticated users share this service.
export function ollamaConfig() {
  const url = new URL(process.env["OLLAMA_BASE_URL"] || "http://127.0.0.1:11434");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("إعداد عنوان Ollama على الخادم غير صالح.");
  }
  const baseURL = url.toString().replace(/\/+$/, "").replace(/\/v1$/, "");
  return { baseURL, apiKey: process.env["OLLAMA_API_KEY"] || "ollama" };
}

export function ollamaModelName(model: string) {
  return ollamaModelSchema.parse(model).slice(7);
}

async function ollamaRequest(path: string, body?: unknown, signal?: AbortSignal) {
  const { baseURL, apiKey } = ollamaConfig();
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(`${baseURL}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    redirect: "error",
  });
  if (!response.ok) {
    if (response.status === 404)
      throw new Error("نموذج Ollama غير موجود أو أن عنوان الخدمة غير صحيح؛ حدّث قائمة النماذج.");
    if (response.status === 401 || response.status === 403)
      throw new Error("رفض Ollama الاتصال؛ راجع إعداد مفتاح الخدمة على الخادم.");
    throw new Error(`تعذر الاتصال بخدمة Ollama (${response.status}).`);
  }
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
    throw new Error("نموذج Ollama المختار لا يدعم المحادثة؛ اختر نموذجًا لغويًا.");
  return { tools: capabilities.includes("tools"), vision: capabilities.includes("vision") };
}

export function validateOllamaAttachments(messages: UIMessage[], vision: boolean) {
  const files = messages.flatMap((message) => message.parts.filter((part) => part.type === "file"));
  if (files.some((file) => !file.mediaType.startsWith("image/"))) {
    throw new Error(
      "محادثة Ollama تدعم المرفقات المصورة فقط؛ أرسل محتوى المستند كنص أو اختر المزوّد الحالي.",
    );
  }
  if (files.length && !vision)
    throw new Error("نموذج Ollama المختار لا يدعم الصور؛ اختر نموذجًا يدعم الرؤية أو محادثة نصية.");
}

export function ollamaChatModel(model: string) {
  const { baseURL, apiKey } = ollamaConfig();
  return createOpenAICompatible({
    name: "ollama",
    baseURL: `${baseURL}/v1`,
    apiKey,
    includeUsage: true,
    fetch: (input, init) => fetch(input, { ...init, redirect: "error" }),
  }).chatModel(ollamaModelName(model));
}

export function ollamaErrorMessage(error: unknown) {
  // Preserve only our actionable messages; upstream errors can contain secrets.
  const message = error instanceof Error ? error.message : "";
  return /^(إعداد|نموذج|تعذر الاتصال بخدمة|رفض Ollama|محادثة Ollama)/.test(message)
    ? message
    : "تعذر الوصول إلى Ollama. تأكد أن الخدمة تعمل وأن خادم التطبيق يستطيع الوصول إليها.";
}
