# Worker / tenant setup — pointing this dashboard at a tenant

> Filled 2026-08-07. This app is an **internal read-only ops dashboard**,
> not a customer bolt-on: no worker persona work, no guidelines install, no
> KB, no workflow deployment. Setup is "have identifiers + key, allow the
> origin".

## Per-tenant checklist

- [ ] Tenant + worker exist; record `tenant_guid` / `worker_guid` in
      [ENVIRONMENT.md](ENVIRONMENT.md) (Top Level / Dylan already recorded).
- [ ] A tenant-scoped API key exists (SQL `ApiKey` row → value in Key
      Vault via `KeyVaultSecretId`). The dashboard sends it as `X-Api-Key`
      from the browser — **internal-tool trade-off, accepted**: anyone who
      can open the dashboard config can read the key. Never use a
      production-privileged key here.
- [ ] **CORS**: the dashboard origin must be in the `CORS_ALLOWED_ORIGINS`
      app setting on the **api** function app (declared in the platform's
      function-app bicep — never `az functionapp cors` / portal CORS,
      platform/05_GOTCHAS.md #6). Status on dev, 2026-08-07:
      - `http://localhost:5173` — ✅ allowed
      - `https://agreeable-hill-09a0def1e.2.azurestaticapps.net` —
        ✅ allowed (added 2026-08-07 as an app-setting stopgap via
        `az functionapp config appsettings set`; **<TODO: mirror into the
        function-app bicep in the platform repo — until then an infra
        deploy can revert it>**).
      The stream app is irrelevant here (no chat surface).
- [ ] The workflows the dashboard reports on actually run on this tenant
      (see [WORKFLOWS.md](WORKFLOWS.md)); `Certificate Submit v2` must keep
      its exact name or the certificate panel falls back to "not found".

## Configuring the app itself

Runtime, in the UI: the first-run "Connect to Doozer" screen (or the tenant
dropdown) takes display name, API base URL, tenant GUID, worker GUID, and
API key; stored in browser `localStorage` only. For local dev,
`.env.local` `VITE_DEFAULT_*` values pre-fill the first config
(ENVIRONMENT.md).

## Verification

1. Open the app → worker card shows the worker's name/role/HIRED badge.
2. KPI cards populate for "Today" (or a wider range if the tenant is quiet).
3. Certificate Submissions panel lists rows (or the explicit
   workflow-not-found message on tenants without `Certificate Submit v2`).
4. A wrong key surfaces the platform's `{error, detail, correlation_id}`
   message, not a blank screen.
