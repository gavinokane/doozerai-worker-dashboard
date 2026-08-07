# Project environment — identifiers and endpoints

> Filled 2026-08-07 during the v2 → current-platform migration. Identifiers
> discovered via dev SQL/Cosmos per 04_OPS_COOKBOOK.md. Never commit API
> keys — record only *where* they live.

## This project

| | Value |
| --- | --- |
| App name | DoozerAI Worker Dashboard |
| One-line purpose | Read-only ops dashboard for one worker's workflow activity (KPIs, volume, status, recent runs, errors) plus a Certificate Submissions lookup; no chat, no writes |
| Repo | `d:\repo\doozerai-worker-dashboard` → github.com/gavinokane/doozerai-worker-dashboard |

## Dev platform

| | Value |
| --- | --- |
| API base | `https://func-doozer-c824-api-dev.azurewebsites.net/api` |
| Stream base | `https://func-doozer-c824-stream-dev.azurewebsites.net/api` (unused — this app has no chat surface) |
| Org name / guid | Legendary / `9c0f29b1-8841-4afa-9573-c853eed0c660` |
| Tenant name / guid | Top Level / `ff761288-99aa-46bb-9833-0c0169e171cf` |
| Worker name / guid | Dylan / `0c545bde-750c-4669-924e-9b981c7571d9` |
| Other workers on tenant | Builder Agent / `b41c1799-91ee-4431-9b05-952f35e11de7` (platform builder — not this app's worker) |
| Knowledge base | none used |
| Dev API key location | gitignored `.env.local` at the repo root (`VITE_DEFAULT_API_KEY`) — populated 2026-08-07 (key supplied by Gavin; verified against Top Level). Canonical store: Key Vault via SQL `ApiKey.KeyVaultSecretId`. |
| CIAM tenant / client id | n/a — dashboard runs api-key mode only (internal ops tool) |

Reference bolt-on env with a working dev key for a *different* tenant
(P McCaul / bid_writer — useful for probing response shapes only):
`d:\repo\bid_writer\.env.docker`.

## Env var contract

This app is a static Vite SPA on Azure Static Web Apps — there is no
runtime-env container. Tenant configs (base URL, tenant guid, worker guid,
API key) are entered at runtime in the UI and live in `localStorage`
(`doozer_tenants_v2`). Vite `VITE_DEFAULT_*` vars in gitignored `.env.local`
seed the first tenant config for local dev only — they are baked into a
local build, so never build for deploy with a populated `.env.local`.

```
VITE_DEFAULT_API_BASE_URL=https://func-doozer-c824-api-dev.azurewebsites.net/api
VITE_DEFAULT_TENANT_GUID=ff761288-99aa-46bb-9833-0c0169e171cf
VITE_DEFAULT_WORKER_GUID=0c545bde-750c-4669-924e-9b981c7571d9
VITE_DEFAULT_TENANT_NAME=Legendary / Top Level
VITE_DEFAULT_API_KEY=          # dev only — never set when building for deploy
```

## Deployed dev instance

| | Value |
| --- | --- |
| URL | https://agreeable-hill-09a0def1e.2.azurestaticapps.net |
| CI/CD | `.github/workflows/deploy.yml` → Azure Static Web Apps (`AZURE_STATIC_WEB_APPS_API_TOKEN` secret) |
| Resource | Static Web App `doozerai-worker-dashboard`, RG `rg-dev01`, sub `c824dd96-acae-40ad-923d-8c30c7a9c916` |

## Quick probe (proves the environment works)

```powershell
# PowerShell — note curl.exe
$k = "<Top Level tenant key>"
$b = "https://func-doozer-c824-api-dev.azurewebsites.net/api/tenants/ff761288-99aa-46bb-9833-0c0169e171cf"
curl.exe -s -H "X-Api-Key: $k" "$b/workers" | ConvertFrom-Json
```

## Direct DB lookups (operator sessions, per 04_OPS_COOKBOOK.md)

- SQL `sql-doozer-c824-dev` / `db-doozer-c824-dev` (Entra auth): `Organization`
  (`OrgGUID, OrgName`), `Tenant` (`TenantGUID, Name, OrgGUID`), `Worker` +
  `TenantWorker` (worker names + tenant mapping), `ApiKey`
  (`TenantGUID, ApiKeyHash, KeyVaultSecretId` — hash only; real key in KV).
- Cosmos `cosmos-doozer-c824-dev` / `agentos-hot`: `worker-config`,
  `workflows`, `workflow-instances` (PK `tenant_guid`), `workflow-steps`
  (PK `instance_id`).
