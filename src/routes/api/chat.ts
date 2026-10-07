import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { Database, Json } from "@/integrations/supabase/types";
import { parseAgentSettings, agentPreferencePrompt } from "@/lib/agent-settings";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai/run-id.server";

const SYSTEM = `أنت AzCodex، وكيل هندسة وتشغيل ذكي لمجموعة العزب (Alazab Group).
تساعد في تطوير البرمجيات، Frappe و ERPNext، Git، البنية التحتية، والتشخيص.
أجب بلغة المستخدم (العربية افتراضياً)، بوضوح واحترافية، واستخدم Markdown وكتل الكود عند الحاجة.
نبّه دائماً قبل أي عملية خطرة في بيئة الإنتاج (مثل drop-site أو reinstall أو restore).

## الرسوم البيانية
عندما يطلب المستخدم رسماً بيانياً أو تكون البيانات الرقمية أوضح كرسم (مقارنات، اتجاهات، نسب)، أخرج كتلة كود بلغة chart تحتوي JSON صالحاً فقط، وستُعرض كرسم تفاعلي:
\`\`\`chart
{"type":"bar","title":"عنوان","description":"وصف اختياري","xKey":"name","series":[{"key":"sales","label":"المبيعات"}],"stacked":false,"data":[{"name":"يناير","sales":400},{"name":"فبراير","sales":600}]}
\`\`\`
- type: bar | line | area | pie | donut. للدائري استخدم سلسلة واحدة (قيمة لكل شريحة).
- يمكن إضافة عدة سلاسل للمقارنة. القيم أرقام وليست نصوصاً. لا تضع تعليقات داخل JSON.
- لا تقل إنك لا تستطيع رسم المخططات؛ أنت تستطيع عبر هذه الصيغة. أضف شرحاً موجزاً قبل الرسم أو بعده.`;

function json(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json(401, "يجب تسجيل الدخول");

        const supabase = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          },
        );
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return json(401, "جلسة غير صالحة");
        const userId = userData.user.id;
        const settings = parseAgentSettings(userData.user.user_metadata["agent_settings"]);
        if (!settings.enabled) return json(403, "اتصال الوكيل متوقف؛ فعّله من الإعدادات.");

        const body = (await request.json()) as { messages?: UIMessage[]; threadId?: string };
        const messages = body.messages;
        const threadId = body.threadId;
        if (!Array.isArray(messages) || !threadId) return json(400, "طلب غير صالح");

        const { data: thread } = await supabase
          .from("threads")
          .select("id,title")
          .eq("id", threadId)
          .maybeSingle();
        if (!thread) return json(404, "المحادثة غير موجودة");

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, "إعدادات الذكاء الاصطناعي غير مكتملة");

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          system: SYSTEM + "\n\n" + agentPreferencePrompt(settings),
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "medium",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          sendReasoning: true,
          onError: (err) => {
            console.error("chat error", err);
            const msg = String((err as Error)?.message ?? err);
            if (msg.includes("402")) return "نفد رصيد الذكاء الاصطناعي.";
            if (msg.includes("429")) return "تم تجاوز حد الطلبات، حاول بعد قليل.";
            return "تعذر إكمال الرد.";
          },
          onFinish: async ({ messages: all }) => {
            const rows = all.map((m) => ({
              thread_id: threadId,
              user_id: userId,
              sdk_id: m.id,
              role: m.role,
              parts: JSON.parse(JSON.stringify(m.parts)) as Json,
            }));
            const { error } = await supabase
              .from("messages")
              .upsert(rows, { onConflict: "thread_id,sdk_id" });
            if (error) console.error("save messages failed", error);
            const update: { updated_at: string; title?: string } = {
              updated_at: new Date().toISOString(),
            };
            if (thread.title === "محادثة جديدة") {
              const first = all.find((m) => m.role === "user");
              const text = first?.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join(" ")
                .trim();
              if (text) update.title = text.slice(0, 60);
            }
            const { error: tErr } = await supabase.from("threads").update(update).eq("id", threadId);
            if (tErr) console.error("update thread failed", tErr);
          },
        });
        return withLovableAiGatewayRunIdHeader(response, runIdFetch);
      },
    },
  },
});
