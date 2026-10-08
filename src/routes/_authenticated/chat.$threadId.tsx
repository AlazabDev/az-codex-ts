// src/routes/_authenticated/chat.$threadId.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { useEffect, useMemo, useState } from "react";
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
  PromptInputActionAddAttachments,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  Attachment,
  AttachmentDownload,
  AttachmentInfo,
  AttachmentPreview,
  Attachments,
} from "@/components/ai-elements/attachments";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { AzLogo } from "@/components/AzLogo";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "محادثة الوكيل — AzCodex" },
      { name: "description", content: "تحدث مع وكيل AzCodex واعرض الردود والرسوم البيانية والمرفقات." },
      { property: "og:title", content: "محادثة الوكيل — AzCodex" },
      { property: "og:description", content: "مساحة محادثتك مع وكيل AzCodex الذكي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
  const [isUploading, setIsUploading] = useState(false);

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

  const busy = status === "submitted" || status === "streaming" || isUploading;

  useEffect(() => {
    if (status === "ready") {
      document.querySelector<HTMLTextAreaElement>("textarea[name='message']")?.focus();
    }
  }, [status]);

  // رفع الملفات الحقيقية إلى مسار التخزين الخاص بالمستخدم
  const uploadFiles = async (files: FileUIPart[]): Promise<FileUIPart[]> => {
    if (!files.length) return [];

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error("يجب تسجيل الدخول لرفع الملفات");

    const uploaded: FileUIPart[] = [];

    for (const file of files) {
      // استخراج الـ Blob من dataUrl أو blobUrl
      const res = await fetch(file.url);
      const blob = await res.blob();
      const safeName = (file.filename || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${threadId}/${Date.now()}_${safeName}`;

      const { data: uploadData, error } = await supabase.storage
        .from("chat-attachments")
        .upload(path, blob, {
          contentType: file.mediaType || blob.type,
          upsert: false,
        });

      if (error) {
        toast.error(`تعذر رفع الملف: ${file.filename}`);
        continue;
      }

      // الحصول على رابط وصول موقع (Signed URL)
      const { data: signedData } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(uploadData.path, 60 * 60 * 24); // صالح لمدة 24 ساعة

      uploaded.push({
        type: "file",
        filename: file.filename,
        mediaType: file.mediaType,
        url: signedData?.signedUrl || file.url,
      });
    }

    return uploaded;
  };

  const handleSend = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    const files = message.files || [];

    if ((!text && files.length === 0) || busy) return;

    try {
      let uploadedParts: FileUIPart[] = [];
      if (files.length > 0) {
        setIsUploading(true);
        toast.loading("جاري رفع المرفقات...", { id: "upload" });
        uploadedParts = await uploadFiles(files);
        toast.dismiss("upload");
      }

      sendMessage({
        text,
        files: uploadedParts,
      });
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء رفع المرفقات");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-8">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<AzLogo size={48} />}
              title="كيف أساعدك اليوم؟"
              description="وكيل AzCodex جاهز للتطوير والتشغيل وFrappe/ERPNext والمرفقات."
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
                      onClick={() => handleSend({ text: s, files: [] })}
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
                  {/* عرض المرفقات التابعة للرسالة */}
                  {m.parts.some((p) => p.type === "file") && (
                    <Attachments variant="list" className="mb-3">
                      {m.parts
                        .filter((p): p is FileUIPart => p.type === "file")
                        .map((f, idx) => (
                          <Attachment key={idx} data={{ ...f, id: `${m.id}-${idx}` }}>
                            <AttachmentPreview />
                            <AttachmentInfo />
                            <AttachmentDownload />
                          </Attachment>
                        ))}
                    </Attachments>
                  )}

                  {/* نصوص وتحليلات الرسالة */}
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
          {(status === "submitted" || isUploading) && (
            <div className="text-sm text-muted-foreground">
              <Shimmer>{isUploading ? "جاري معالجة ورفع الملفات..." : "AzCodex يفكر..."}</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-5">
        <PromptInput
          maxFileSize={10 * 1024 * 1024} // 10 ميغابايت لكل ملف
          onSubmit={handleSend}
          className="rounded-xl border-border bg-card shadow-glow"
        >
          {/* شريط معاينة المرفقات المحملة محلياً قبل الإرسال */}
          <PromptInputHeader>
            <PromptInputAttachments />
          </PromptInputHeader>

          <PromptInputBody>
            <PromptInputTextarea
              autoFocus
              placeholder="اكتب تعليماتك أو اسحب وأفلت الملفات هنا..."
            />
          </PromptInputBody>

          <PromptInputFooter className="justify-between">
            <div className="flex items-center gap-2">
              {/* زر إضافة الملفات والمرفقات */}
              <PromptInputActionAddAttachments
                label="إرفاق ملف أو صورة"
                className="hover:bg-muted text-muted-foreground hover:text-foreground"
              />
              <span className="px-2 font-mono text-[11px] text-muted-foreground">gpt-6-astra</span>
            </div>
            <PromptInputSubmit status={busy ? "submitted" : status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
