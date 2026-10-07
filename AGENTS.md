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
- Settings live on an authenticated sibling route; non-privileged agent preferences are stored in auth user metadata and validated on the server so chat consistently applies them.
- Theme preferences use a root provider and browser storage with semantic light/dark tokens so every page shares the chosen appearance.
- Agent connection checks use an authenticated server function against the existing model; credentials never reach the browser.
- Curated Git/Frappe reference context is injected into chat independently of user preferences; it distinguishes knowledge from live service access.
- GitHub browsing uses authenticated server functions and encrypted per-user connector keys; the labeled example is isolated from live data.
- Frappe setup stores only validated nonsecret display preferences in user metadata; real connection credentials and live reads remain disabled until authorized.
