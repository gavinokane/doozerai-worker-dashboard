# Deployment — Azure Static Web Apps

> Filled 2026-08-07. This app deviates from the kit's per-customer Docker
> pattern deliberately: it is a **static Vite SPA** on Azure Static Web
> Apps, one shared internal instance, with tenant config entered at runtime
> in the UI (localStorage). No server, no runtime env vars, no MSAL.

## Current setup

| | Value |
| --- | --- |
| Trigger | every push to `master` (+ PR preview envs) |
| Pipeline | `.github/workflows/deploy.yml` — Node 22, `npm ci`, `npm run build`, `Azure/static-web-apps-deploy@v1` uploading `dist/` |
| Azure resource | Static Web App `doozerai-worker-dashboard`, RG `rg-dev01`, sub `c824dd96-acae-40ad-923d-8c30c7a9c916` |
| URL | https://agreeable-hill-09a0def1e.2.azurestaticapps.net |
| Auth to Azure | `AZURE_STATIC_WEB_APPS_API_TOKEN` repo secret (deployment token) |

## Rules

- **No secrets or customer GUIDs in the build.** Tenant config (base URL,
  GUIDs, API key) is entered in the app's first-run screen and lives in the
  browser only. `.env.local` (`VITE_DEFAULT_*`) is a local-dev convenience
  and is gitignored — a populated `.env.local` bakes its values into the
  bundle, so never run a deploy build with the key filled in. CI is safe:
  the file never reaches the repo.
- **CORS is a platform-side prerequisite** — the SWA origin must be in
  `CORS_ALLOWED_ORIGINS` on the api function app (see WORKER_SETUP.md;
  currently NOT allowed on dev → the deployed app cannot reach the dev
  platform until that lands).
- The old v2 platform (`api.doozerai.com/v3` + APIM subscription keys) is
  fully removed from the app as of the 2026-08-07 migration.

## Local development

```powershell
# .env.local pre-fills the first tenant config (see ENVIRONMENT.md)
npm install
npm run dev     # http://localhost:5173 — origin already CORS-allowed on dev
```

## Smoke test after deploy

1. Open the SWA URL, complete (or confirm) the tenant config.
2. Worker card + KPI cards populate; no CORS errors in the console.
3. Certificate Submissions panel shows rows for a range that has runs.
