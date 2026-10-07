<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Chat streams via `src/routes/api/chat.ts` (server route, verifies bearer token, saves UIMessages to `messages` keyed by thread + sdk_id) — keeps model calls and keys server-side.
- Threads are read/written from the browser client under RLS (`src/lib/threads.ts`); thread pages live at `/chat/$threadId` under `_authenticated`.
