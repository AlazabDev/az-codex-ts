import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { agentProfileSchema, parseAgents, resolveAgent } from "@/lib/agents";

export const testAgentConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.auth.getUser();
    const agent = resolveAgent(parseAgents(data.user?.user_metadata["agents"]), undefined);
    return checkAgent(agent);
  });

export const testAgentProfileConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => agentProfileSchema.parse(data))
  .handler(async ({ data }) => checkAgent(data));

async function checkAgent(agent: ReturnType<typeof agentProfileSchema.parse>) {
    try {
      if (agent.model.startsWith("ollama/")) {
        const ollama = await import("./ai/ollama.server");
        return ollama.checkOllamaModel(agent.model);
      }
      const { agentProvider } = await import("./ai/agent-provider.server");
      const { model } = agentProvider(agent);
      const result = streamText({
        model,
        prompt: "Reply with OK only.", maxOutputTokens: 100,
        abortSignal: AbortSignal.timeout(30000),
        maxRetries: 0,
        providerOptions: { openai: { store: false, ...(agent.model.startsWith("openai/") ? { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } : {}) } },
      });
      return (await result.text).trim() ? { ok: true, message: `تم الاتصال بالوكيل «${agent.name}» بنجاح.` } : { ok: false, message: "لم تصل إجابة مكتملة؛ لم ينجح اختبار التوليد." };
    } catch {
      return { ok: false, message: agent.model === "foundry" ? "تعذر الاتصال بـ Microsoft Foundry؛ راجع بيانات Entra وصلاحية Azure AI User واسم الوكيل وإصداره." : "تعذر الاتصال بالوكيل؛ راجع إعدادات الاتصال والرصيد وصلاحية النموذج." };
    }
}