import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ollamaModelSchema } from "@/lib/agents";

export const getOllamaModels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const ollama = await import("./ai/ollama.server");
    try {
      return {
        ok: true as const,
        models: await ollama.listOllamaModels(),
        message: "تم الاتصال بخدمة Ollama.",
      };
    } catch (error) {
      return { ok: false as const, models: [], message: ollama.ollamaErrorMessage(error) };
    }
  });

export const testOllamaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ollamaModelSchema.parse(data))
  .handler(async ({ data }) => {
    const ollama = await import("./ai/ollama.server");
    try {
      const capabilities = await ollama.ollamaCapabilities(data);
      const result = await generateText({
        model: ollama.ollamaChatModel(data),
        prompt: "Reply with OK only.",
        maxOutputTokens: 128,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(120_000),
      });
      return {
        ok: Boolean(result.text.trim()),
        message: result.text.trim()
          ? `نجح اختبار Ollama. الأدوات: ${capabilities.tools ? "مدعومة" : "غير مدعومة"}، الصور: ${capabilities.vision ? "مدعومة" : "غير مدعومة"}.`
          : "اتصل Ollama لكن لم يصل رد نصي؛ جرّب نموذجًا آخر.",
      };
    } catch (error) {
      return { ok: false, message: ollama.ollamaErrorMessage(error) };
    }
  });
