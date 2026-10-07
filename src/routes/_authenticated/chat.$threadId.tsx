import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { messagesQuery } from "@/lib/threads";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { ChartedResponse } from "@/components/ai-elements/agent-chart";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { AzLogo } from "@/components/AzLogo";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({ meta: [
    { title: "محادثة الوكيل — AzCodex" },
    { name: "description", content: "تحدث مع وكيل AzCodex واعرض الردود والرسوم البيانية التفاعلية." },
    { property: "og:title", content: "محادثة الوكيل — AzCodex" },
    { property: "og:description", content: "مساحة محادثتك مع وكيل AzCodex الذكي." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { data, isLoading, error } = useQuery(messagesQuery(threadId));
  if (error) return <p className="m-auto text-destructive">تعذر تحميل المحادثة</p>;
  if (isLoading || !data)
    return (
      <div className="m-auto text-muted-foreground">
        <Shimmer>جاري التحميل...</Shimmer>
      </div>
    );
  return <ChatWindow key={threadId} threadId={threadId} initial={data} />;
}

const SUGGESTIONS = [
  "اشرح لي بنية تطبيق Frappe مخصص",
  "كيف أنفذ bench migrate بأمان في الإنتاج؟",
  "راجع هذا الكود وحدد المشاكل",
  "اكتب DocType لإدارة طلبات الصيانة",
];

function ChatWindow({ threadId, initial }: { threadId: string; initial: UIMessage[] }) {
  const qc = useQueryClient();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId },
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => toast.error(e.message || "حدث خطأ أثناء الاتصال"),
    onFinish: ({ messages: all }) => {
      qc.setQueryData(messagesQuery(threadId).queryKey, all);
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "ready") {
      document.querySelector<HTMLTextAreaElement>("textarea[name='message']")?.focus();
    }
  }, [status]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
  };

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-8">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<AzLogo size={48} />}
              title="كيف أساعدك اليوم؟"
              description="وكيل AzCodex جاهز للتطوير والتشغيل وFrappe/ERPNext."
            >
              <div className="flex flex-col items-center gap-4">
                <AzLogo size={48} />
                <div>
                  <h2 className="text-xl font-semibold">كيف أساعدك اليوم؟</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    وكيل AzCodex جاهز للتطوير والتشغيل و Frappe / ERPNext.
                  </p>
                </div>
                <div className="mt-2 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border border-border bg-card/60 px-3 py-2.5 text-right text-sm text-card-foreground transition-colors hover:border-primary/60"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.parts.map((part, i) => {
                    if (part.type === "text")
                      return m.role === "user" ? (
                        <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                      ) : (
                        <ChartedResponse key={i} text={part.text} isStreaming={part.state === "streaming"} />
                      );
                    if (part.type === "reasoning" && part.text)
                      return (
                        <Reasoning key={i} isStreaming={part.state === "streaming"} defaultOpen={false}>
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <div className="text-sm text-muted-foreground">
              <Shimmer>AzCodex يفكر...</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-5">
        <PromptInput
          onSubmit={(msg) => send(msg.text)}
          className="rounded-xl border-border bg-card shadow-glow"
        >
          <PromptInputBody>
            <PromptInputTextarea autoFocus placeholder="اكتب تعليمات التطوير أو التشغيل..." />
          </PromptInputBody>
          <PromptInputFooter className="justify-between">
            <span className="px-2 font-mono text-[11px] text-muted-foreground">gpt-6-astra</span>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
