import { z } from "zod";

export const AGENT_MODELS = [
  { id: "foundry", label: "Microsoft Foundry · az-agent-copilot" },
  { id: "openai/gpt-6-astra", label: "GPT-6 Astra" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (سريع)" },
] as const;
export type AgentModel = (typeof AGENT_MODELS)[number]["id"];

export const agentProfileSchema = z.object({
  id: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(40),
  model: z.enum(["foundry", "openai/gpt-6-astra", "google/gemini-2.5-flash"]),
  instructions: z.string().max(2000).default(""),
  benchTools: z.boolean().default(false),
});
export type AgentProfile = z.infer<typeof agentProfileSchema>;

export const DEFAULT_AGENTS: AgentProfile[] = [
  { id: "azcodex", name: "AzCodex", model: "foundry", instructions: "", benchTools: true },
  { id: "astra", name: "مساعد عام", model: "openai/gpt-6-astra", instructions: "", benchTools: false },
  { id: "flash", name: "سريع", model: "google/gemini-2.5-flash", instructions: "أجب باختصار وسرعة.", benchTools: false },
];
export const MAX_AGENTS = 10;

const agentsSchema = z.object({
  list: z.array(agentProfileSchema).min(1).max(MAX_AGENTS),
  activeId: z.string().default("azcodex"),
});
export type AgentsConfig = z.infer<typeof agentsSchema>;

export function parseAgents(value: unknown): AgentsConfig {
  const parsed = agentsSchema.safeParse(value);
  if (!parsed.success) return { list: DEFAULT_AGENTS, activeId: "azcodex" };
  const ids = new Set<string>();
  const list = parsed.data.list.filter((a) => !ids.has(a.id) && ids.add(a.id));
  const activeId = list.some((a) => a.id === parsed.data.activeId) ? parsed.data.activeId : list[0]!.id;
  return { list, activeId };
}

export function resolveAgent(config: AgentsConfig, id: unknown): AgentProfile {
  return config.list.find((a) => a.id === id) ?? config.list.find((a) => a.id === config.activeId) ?? config.list[0]!;
}
