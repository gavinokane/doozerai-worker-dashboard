# DoozerAI Worker Dashboard — Doozer bolt-on

Read-only internal ops dashboard for one Doozer worker's workflow activity:
KPIs, execution volume, status breakdown, workflow distribution, recent
runs/errors, and a Certificate Submissions lookup (from `Certificate Submit
v2` instances). React 19 + TypeScript + Vite + Tailwind + TanStack Query,
deployed as a static Azure Static Web App. It renders platform data and
executes nothing: no chat, no memory writes, no workflow execution.

This is a **bolt-on application** for the Doozer platform. Platform knowledge
and project conventions live in [doozer-kit/](doozer-kit/):

- **Before writing any platform-facing code**, read
  [doozer-kit/platform/05_GOTCHAS.md](doozer-kit/platform/05_GOTCHAS.md) and
  the relevant sections of
  [doozer-kit/platform/02_API_REFERENCE.md](doozer-kit/platform/02_API_REFERENCE.md)
  (REST/chat/memory/files) or
  [doozer-kit/platform/03_WORKFLOWS.md](doozer-kit/platform/03_WORKFLOWS.md)
  (workflow engine).
- **Identifier registry** — every GUID this project uses (org, tenant,
  worker, KBs, tools, folders, connections) plus base URLs and key
  location: [doozer-kit/project/ENVIRONMENT.md](doozer-kit/project/ENVIRONMENT.md).
  Workflow GUIDs: the registry table in
  [doozer-kit/project/WORKFLOWS.md](doozer-kit/project/WORKFLOWS.md).
  **Read these before hunting for any identifier.**
- The state contract (memory keys, ownership):
  [doozer-kit/project/AGENT_CONTRACT.md](doozer-kit/project/AGENT_CONTRACT.md)
  — this app has none; that file says what it reads instead.
- This project's workflows: [doozer-kit/project/WORKFLOWS.md](doozer-kit/project/WORKFLOWS.md).
- Onboarding/deploying:
  [doozer-kit/project/WORKER_SETUP.md](doozer-kit/project/WORKER_SETUP.md),
  [doozer-kit/project/DEPLOYMENT.md](doozer-kit/project/DEPLOYMENT.md).

Project specifics that deviate from the kit's default bolt-on shape
(deliberate, recorded in DEPLOYMENT.md): static SPA instead of a Docker
container; tenant config (base URL, GUIDs, API key) entered at runtime in
the UI and held in `localStorage` instead of server env vars; api-key mode
only (internal tool, no MSAL).

`swagger_spec.yaml` and the API notes in `dylan_dashboard.md` describe the
**retired v2 platform** — historical reference only; the kit docs are the
API source of truth.

## Build & dev

- `npm run dev` — dev server on http://localhost:5173
- `npm run build` — typecheck + production build
- `npm run lint` — ESLint

## Ground rules

1. **API-only.** No database, no server session store. All durable state
   lives in the platform (worker memory, conversations, knowledge, assets).
   The container is stateless.
2. **Single writer per memory key.** The UI reads state and executes
   workflows; it never writes contract keys. See AGENT_CONTRACT.md.
3. **Workflows drive every button; chat is only for conversing.** Nothing
   auto-chains off a chat turn.
4. **White-label from day one.** All config is runtime env vars. Grep-test:
   no customer name, colour, or GUID in the source tree.
5. **VERIFIED vs PROBE.** Probe-tagged API shapes get one curl against dev
   before parsers are hard-coded; all parsing tolerates unknown fields.
   Record newly verified shapes in the kit docs.
6. **Dev loop without MSAL.** Build everything in `AUTH_MODE=apikey` first;
   apikey mode must refuse to boot in production.
7. **Keep `doozer-kit/project/*` current** as decisions are made; treat
   `doozer-kit/platform/*` as read-only (fix errors upstream in the source
   repo).
8. **GUIDs come from the registry, never from memory or guesswork.** Look
   in `doozer-kit/project/ENVIRONMENT.md` / `WORKFLOWS.md` first. If an
   identifier isn't recorded there, discover it (SQL/API — see
   `doozer-kit/platform/04_OPS_COOKBOOK.md § Bootstrap GUID discovery`)
   and **record it in the registry in the same session** so no future
   thread repeats the search.
