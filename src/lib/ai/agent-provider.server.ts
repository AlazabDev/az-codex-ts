import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AgentProfile } from "@/lib/agents";
import { foundryConfigured, foundryProvider } from "./foundry.server";
import { ollamaChatModel } from "./ollama.server";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

export function agentProvider(agent: AgentProfile, initialRunId?: string) {
  const gateway = createLovableAiGatewayRunIdFetch(initialRunId);
  if (agent.model.startsWith("ollama/")) return { model: ollamaChatModel(agent.model), gateway: undefined };
  if (agent.model === "foundry") {
    if (!foundryConfigured()) throw new Error("بيانات Microsoft Foundry غير مكتملة؛ راجع إعدادات المشروع السرية.");
    return { model: foundryProvider(agent.foundryAgent ?? (agent.id === "azcodex" ? "az-agent-sol" : `az-agent-${agent.id}`), agent.foundryVersion).responses("foundry-agent"), gateway: undefined };
  }
  const directKey = agent.model.startsWith("openai/") ? process.env["OPENAI_API_KEY"] : process.env["GEMINI_API_KEY"];
  if (directKey) {
    const provider = createOpenAI({ apiKey: directKey, ...(agent.model.startsWith("google/") ? { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai" } : {}) });
    return { model: agent.model.startsWith("openai/") ? provider.responses(agent.model.slice(7)) : provider.chat(agent.model.slice(7)), gateway: undefined };
  }
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("إعدادات اتصال Lovable AI غير مكتملة.");
  const headers = { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" };
  const model = agent.model.startsWith("openai/")
    ? createOpenAI({ apiKey: key, baseURL: "https://ai.gateway.lovable.dev/v1", headers, fetch: gateway.fetch }).responses(agent.model)
    : createOpenAICompatible({ name: "lovable", baseURL: "https://ai.gateway.lovable.dev/v1", headers, fetch: gateway.fetch }).chatModel(agent.model);
  return { model, gateway };
}