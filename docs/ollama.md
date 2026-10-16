# Ollama provider

Ollama is an additional provider in the existing AzCodex application (`src/`).
Foundry and the existing GPT/Gemini gateway choices remain unchanged. The separate
`web/` client is not part of this integration.

## Configure the application server

Set these **server-side** environment variables, then restart the application:

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
# Optional, for an authenticated reverse proxy in front of Ollama:
# OLLAMA_API_KEY=your-proxy-key
```

`OLLAMA_BASE_URL` defaults to `http://127.0.0.1:11434`. A trailing `/v1` is also
accepted. Do not include `/api/chat`, query parameters, or URL credentials. The
application uses native `/api/tags` and `/api/show` for discovery and capabilities,
and `/v1/chat/completions` for streaming inference. The optional API key is used
for both discovery and inference and is never returned to the browser.

The URL is configured by the deployment administrator, not by arbitrary users.
All signed-in users of this deployment connect to that configured Ollama service.
The app's normal Supabase authentication and per-user conversation policies still
apply. No database migration is needed.

**The address is resolved from the application server.** If Ollama runs on your
Windows/WSL machine while the app runs on another server, `127.0.0.1` on the app
server does not reach your PC. Configure a service address reachable from the app
server, such as a private network or tunnel address. A hosted runtime must also
permit access to that network. No browser CORS changes are needed because the
browser never calls Ollama directly.

Install and start Ollama on the intended inference host, then install a model
appropriate for that host. An example for a host with sufficient resources:

```bash
ollama pull gpt-oss:20b
ollama list
```

## Use it

1. Sign in and open **Settings → Agents**.
2. Click **جلب / تحديث نماذج Ollama**.
3. Create an agent or select an existing one, then choose an `Ollama · …` model.
4. Click **اختبار اتصال Ollama**. This performs a real short generation using the
   selected model; the first load can take up to two minutes.
5. Save the agents. Select that agent in the conversation's agent switcher.

Model ids are saved as `ollama/<native-model-name>`, including tags and namespaces.
The catalog is fetched on demand, with explicit loading, offline, and empty states.
Saved selections remain available even when the service is temporarily offline.
No gateway key is required for Ollama, nor for an already configured Foundry agent.
Gateway models continue to require their existing `LOVABLE_API_KEY`.

## Capabilities and behavior

- Answers and separate reasoning fields stream through the existing UI protocol;
  user and assistant messages are saved through the same persistence callback.
- Tools are offered only if `/api/show` advertises `tools`. Existing integration
  and Bench permission checks remain in place. Tool support does not imply the
  model will choose or execute every tool correctly.
- Images require the model's `vision` capability. Other file attachments are
  rejected with a clear message; this addition does not implement document RAG.
- Models that explicitly lack `completion` (for example embedding models) are
  rejected before generation. Older Ollama versions with no capabilities field
  are treated as text-only.
- A missing model or unavailable service returns an error; it never silently
  switches the conversation to another provider.
- Catalog/capability calls time out after 15 seconds. Chat uses the existing
  request abort signal, so Stop/disconnect propagates to the inference request.
- The interface lists models already available in Ollama. Downloading/deleting
  models remains an operation on the inference host.

## Verification

```bash
bun install --frozen-lockfile
bun run test
bunx tsc --noEmit
bun run build
```

The tests cover backward compatibility, catalog discovery, capability handling,
real SDK SSE parsing (including reasoning and tool-call round trips), settings
selection/persistence, and the authenticated chat route's save callback. Upstream
Ollama responses are simulated deterministically; a deployment smoke test with
its actual service/model is still required before production use.
