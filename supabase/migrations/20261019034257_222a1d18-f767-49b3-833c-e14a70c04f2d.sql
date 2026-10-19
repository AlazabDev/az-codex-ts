REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "chat_attachments_insert_own" ON storage.objects;
ALTER POLICY "own messages" ON public.messages WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.threads t WHERE t.id = messages.thread_id AND t.user_id = auth.uid()));