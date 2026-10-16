# Ollama provider

Ollama is an additional provider in the existing AzCodex application (`src/`).
Foundry and the existing GPT/Gemini gateway choices remain unchanged. The separate
`web/` client is not part of this integration.

## Configure the application server

Set these **server-side** environment variables, then restart the application:

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
# Optional Bearer authentication for gateways that use API keys:
# OLLAMA_API_KEY=your-proxy-key
```

`OLLAMA_BASE_URL` defaults to `http://127.0.0.1:11434`. A trailing `/v1` is also
accepted. Do not include `/api/chat`, query parameters, or URL credentials. The
application uses native `/api/tags` and `/api/show` for discovery and capabilities,
and `/v1/chat/completions` for streaming inference. Authentication is applied
consistently to discovery, capability checks and inference, and credentials are
never returned to the browser.

### Existing azab-orchestrator gateway

The supplied server audit confirms Nginx **Basic Auth** at
`https://ollama.alazab.com`; it does not use Bearer authentication. For an app
running outside that server, configure:

```dotenv
OLLAMA_BASE_URL=https://ollama.alazab.com
OLLAMA_AUTH_USER=azureuser
OLLAMA_AUTH_PASS=<the-current-gateway-password>
OLLAMA_TEST_TIMEOUT_SECONDS=300
```

Use the actual gateway password only in the deployment's environment. A complete
Basic username/password pair takes precedence over `OLLAMA_API_KEY`. A partial
pair is rejected instead of silently falling back to another authentication mode.
For direct local access, unset both Basic variables and the optional Bearer key.
A ready-to-fill example is in `deploy/ollama.env.example`.

The gateway already passed authenticated catalog requests after its Nginx
`proxy_set_header Host 127.0.0.1:11434;` correction. Keep that working upstream
Host configuration; do not restore the public hostname in this deployment.
The old `ollama.alazab.cloud` name in the diagnostic script is not the final
configured endpoint.

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
   selected model. The result remains visible beside that model. The first CPU
   load may take several minutes; the default diagnostic timeout is five minutes.
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
- Catalog/capability calls time out after 15 seconds. Generation checks default
  to 300 seconds; `OLLAMA_TEST_TIMEOUT_SECONDS` accepts 15–900 seconds. They
  reserve 1024 output tokens, and use low reasoning effort for thinking GPT-OSS
  models only. A reasoning-only or empty response is an incomplete test, not a
  successful answer or proof of a disconnected service.
- Diagnostics distinguish configuration, 401 authentication, 403 access/Host,
  missing-model, upstream generation, timeout and cancellation errors. Upstream
  bodies and credentials are not included in browser messages.
- Chat uses the existing
  request abort signal, so Stop/disconnect propagates to the inference request.
- The interface lists models already available in Ollama. Downloading/deleting
  models remains an operation on the inference host.

## Server-side smoke check

Load the same environment variables used by the application, then run:

```bash
bun run check:ollama --catalog-only
bun run check:ollama --model llama3.2:1b
bun run check:ollama --model gpt-oss:20b
```

The command uses the application's actual authentication and model adapter. It
reports the catalog, generation stage, elapsed time and capability flags, and
exits nonzero for incomplete or failed tests. It does not print credentials or
raw upstream error bodies. Without arguments it tests `gpt-oss:20b`.

The audit reported 16 logical CPUs, 62 GiB RAM and no VRAM detected by Ollama.
Discovery success therefore must not be confused with generation performance.
The runtime context shown was 4096 tokens, despite much larger model metadata
limits. To change runtime context, configure the Ollama host/model separately;
this integration does not pretend that an OpenAI-compatible request can change
that server setting. A bridge-network container cannot reach the host's
loopback-bound service via its own `127.0.0.1`.

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
responses in automated tests are simulated deterministically. Live gateway
checks use the separate smoke command; these do not replace a signed-in UI
smoke test after the application is deployed.

### Live validation of this change

The shared application adapter was tested against the configured
`https://ollama.alazab.com` Basic Auth gateway using deployment credentials held
only in the test process environment:

| Check                                 | Observed result                    |
| ------------------------------------- | ---------------------------------- |
| Authenticated catalog                 | 13 model names returned            |
| `llama3.2:1b` generation check        | Passed, approximately 16.5 seconds |
| `gpt-oss:20b` generation check        | Passed, approximately 36.3 seconds |
| GPT-OSS streaming and tool round trip | Passed, approximately 20.7 seconds |

The last check emitted separate reasoning and text events, executed a harmless
local `health_echo` tool exactly once, then returned its fixed diagnostic code
`ALAZAB_OLLAMA_OK`. These are observed test durations, not throughput guarantees;
model loading and host workload affect them. The test did not install, delete,
or reconfigure models or Nginx, and did not deploy the application. Signed-in
browser testing and database persistence on the deployed app remain separate
from upstream inference verification.
