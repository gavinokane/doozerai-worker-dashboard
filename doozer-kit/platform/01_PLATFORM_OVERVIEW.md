# 01 — Doozer platform overview for bolt-on builders

What the platform is, its core objects, how a bolt-on authenticates, and the
architecture pattern every bolt-on follows. Stable knowledge — verified
against the dev platform 2026-07/08.

## What a bolt-on is

A separate, Docker-deployed web application that talks to the Doozer platform
**exclusively through the public HTTP API** — including login. It is not part
of the platform codebase and has no privileged access. One container instance
per customer, configured entirely by runtime environment variables. The
platform is the database; the bolt-on is a cockpit.

## Core objects

- **Org → Tenant** — the customer boundary. Every API route is tenant-scoped:
  `/tenants/{tenant_guid}/...`. A bolt-on deployment pins one tenant via env
  var. The API enforces tenant access server-side on every call — client-side
  pinning is UX, not security.
- **Worker** — an AI agent with a persona (name, role, description,
  traits/skills/voice), assigned tools, and private memory. A bolt-on usually
  pins one worker per deployment. Two special memory keys, `agent_soul` and
  `agent_guidelines`, are auto-injected into every conversation **and into
  workflow `ask_doozer` steps that carry a `worker_guid`** — this is
  where you install standing instructions (see 04_OPS_COOKBOOK.md).
  `persona.custom_prompts` exists but has no API write route — decision of
  record (2026-07-30): don't build on it.
- **Conversation** — a chat thread with a worker. Turns run the full ReAct
  tool loop. Conversations accrete context forever (see 05_GOTCHAS.md on why
  this made us move button-driven actions to workflows).
- **Worker memory** — a key/value store scoped per worker
  (`worker:{worker_guid}`), tenant-shared (`__tenant__`), or org-shared
  (`__org__`; reads cascade worker → tenant → org). Values are JSON —
  strings, objects, and arrays all round-trip natively (`value` is typed
  `Any`); a bolt-on that stores JSON-as-string must parse it itself, and
  readers should tolerate both forms. This is where a bolt-on's durable
  state contract lives.
- **Workflow** — a tenant-scoped, versioned step graph executed by the
  engine (steps: LLM calls, the full agent loop, python, memory read/write,
  KB queries, tool execution…). The engine owns control flow — a step either
  returns or errors, unlike a chat turn which can die silently. Bolt-ons
  drive every button through workflows (03_WORKFLOWS.md).
- **Knowledge base (KB)** — a document library with embeddings, a metadata
  schema, and an auto-created `knowledge_query` tool that can be assigned to
  workers or called from workflow `query_index` steps. Since 2026-07-29
  (BL 287) a KB holds **many documents sharing one index**, each with typed
  metadata (`keyword`/`number`/`date`/`boolean`); queries accept `filters`
  (number/date support ranges like `{"year": {"gte": 2024}}`) and
  `synthesize: false` returns raw passages instead of a synthesized answer.
- **Tools** — capabilities assignable to workers. `ask_user_question` is
  appended unconditionally to every worker-chat tool list (surfaces to
  clients as the `ask_question` SSE event). Workers have **no file-browsing
  tool** — file content reaches an agent only via message attachments or
  banked text in memory (05_GOTCHAS.md).
- **Folders / Assets** — tenant file storage. Folders have a required
  `folder_type_code` (bolt-on uploads use `UPLOADS`); assets get short-lived
  SAS download URLs on demand.

## Hosts and auth

Two function apps, same path shapes:

- **API** (REST): `{PUBLIC_API_BASE_URL}` — ends in `/api`. Serves
  everything below **except** chat send/cancel — including conversation
  list/detail/delete and SignalR negotiate/join.
- **Stream** (chat SSE): `{PUBLIC_STREAM_API_BASE_URL}` — the **only** host
  that serves the chat POST and turn-cancel routes (the worker-chat
  blueprint is not registered on the API app; those paths 404 there).
  Client code may fall back to the API base when the var is unset, but that
  only works if a deployment fronts both apps behind one host — on dev,
  treat the stream base as required.

Dev reference values:
API `https://func-doozer-c824-api-dev.azurewebsites.net/api`,
stream `https://func-doozer-c824-stream-dev.azurewebsites.net/api`.

Every endpoint accepts **either** credential (VERIFIED):

1. `Authorization: Bearer <JWT>` — Microsoft Entra External ID (CIAM) token.
   Production mode.
2. `X-Api-Key: <key>` — tenant-scoped API key. Dev/server-side mode. All
   api-key traffic belongs to one shared "api-key" principal; `/me` returns
   only `{sub: "api-key", email: null}`.

### CIAM (MSAL) specifics — confirmed working configuration

- Authority: `https://{ciam_tenant}.ciamlogin.com/`; known authorities:
  `[{ciam_tenant}.ciamlogin.com]`.
- Scopes: `openid profile email` **plus**
  `https://{ciam_tenant}.onmicrosoft.com/doozer-api/access_as_user`.
- Redirect URI `{origin}/auth/callback` using `window.location.origin` so
  custom domains work without rebuild; each customer domain must be on the
  app registration.
- **Known gotcha:** after `handleRedirectPromise()`, call
  `setActiveAccount()` with the returned account — without it, silent token
  acquisition breaks after redirects.
- On 401: one `acquireTokenSilent` retry, then interactive.
- After login, `GET /me` → verify the configured tenant GUID is among the
  user's memberships; otherwise show a no-access screen.

### Dev loop

Build everything in api-key mode first — it exercises the full API surface
without auth ceremony. Hard rule: `AUTH_MODE=apikey` must refuse to boot when
`NODE_ENV=production`; the dev key must never reach a production browser.

## The bolt-on architecture pattern (proven, follow it)

1. **API-only, stateless container.** No database, no ORM, no server session
   store. UI-only preferences in `localStorage`. Scale horizontally at will.
2. **All configuration is runtime env vars** (never baked at build time) so
   one image serves every customer. Fail fast at boot with a clear list of
   missing variables. Grep-test: no customer name, colour, or GUID in the
   source tree.
3. **Single-writer state contract.** Machine-readable app state lives in
   worker memory under versioned keys (`contract_version` in every value).
   Exactly one writer per key — the workflow engine (or, legacy pattern, the
   agent). The UI **reads** state and **executes workflows**; it never writes
   contract keys directly. Define the contract in
   `project/AGENT_CONTRACT.md`.
4. **Workflows drive everything; chat is for conversing.** Every
   button-driven action is a workflow, discovered at runtime **by exact
   `workflow_name`** (no per-customer guid config). A free-text "ask the
   worker" box is the only chat surface, and it never writes state. The user
   decides, the app derives available actions from state, the agent/workflow
   produces content. Nothing auto-chains.
5. **Tolerant parsing everywhere.** Unknown fields pass through, missing
   optional fields default, parse failure degrades to a banner — never a
   dead screen.
6. **Stack:** SvelteKit 2 + Svelte 5 (runes), TypeScript, Tailwind,
   adapter-node, `@azure/msal-browser`, `@microsoft/signalr`. Chosen to match
   the platform team's own UI stack — consistency beats preference.
7. **Render all agent/LLM output as markdown with HTML disabled.**

## Stack-specific traps (if you keep the Svelte stack)

- Store reads called from `$derived` must be pure — a `$state` write inside
  one kills the render pass with no error (invisible-UI bug, 2026-08-02).
- adapter-node needs `ORIGIN` set to the public URL or CSRF checks fail
  text-file uploads with a bare 403.
- CSP `connect-src`: the two platform hosts, the CIAM authority, and the
  SignalR host returned by negotiate.
