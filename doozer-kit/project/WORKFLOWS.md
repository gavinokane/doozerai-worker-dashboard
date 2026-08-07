# Project workflow registry

> Filled 2026-08-07. **This repo deploys no workflows.** The dashboard is a
> read-only consumer of workflow instances that other systems (the Titan
> Works / Legendary automation set) create on the Top Level tenant. This
> file records the workflows the app depends on and the response shapes
> verified live.

## Read-only dependencies

| Workflow name | Owned by | How this app uses it | Status |
| --- | --- | --- | --- |
| `Certificate Submit v2` | Legendary/Titan Works automation (v44 on dev, 2026-08-07) | Discovered at runtime by **exact name** in the workflow list, then instances fetched with `workflow_guid` + `fields=full`; renders `data_dictionary.certificate_number / customer_name / customer_email / exact_address` | verified present on Top Level |

Workflows present on the Top Level tenant (Cosmos `workflows`, 2026-08-07),
for context: Titan Works - Send Email Using Connector, TW-LP-Set Email
Status, TW-LP-Dylan Handle 2FA, Certificate Submit v2, TW-LP-Upload To
Service Titan, TW-LP-Process Certificate, TW-LP-Dylan Receive Email, Append
Certificate Lookup, Get ServiceTitan Form QA Data, VBA Cert - HITL + Append
Lookup, ServiceTitan - Get VBA Cert Form From URL, Test.

## Fallback behaviour

`Certificate Submit v2` absent on a tenant → the Certificate Submissions
panel shows "Workflow not found on this tenant" instead of erroring; the
lookup is retried on the next workflow-list refetch. All other panels are
workflow-agnostic.

## Verified shapes log

Verified live against dev (P McCaul tenant — shapes are tenant-independent),
2026-08-07:

- `GET /tenants/{t}/workflows` → `{items, total_count, page, page_size}`;
  items carry `workflow_guid, workflow_name, description, type, version,
  step_count, input_parameters, created_at, updated_at`.
- `GET /tenants/{t}/workflow-instances` → `{items, total_count,
  status_counts, page, page_size}`; summary items carry `id, workflow_guid,
  workflow_short_name, worker_guid, status, start_date, end_date,
  duration_seconds, created_at, error_message, parent_instance_id,
  child_instance_ids`. Filters verified: `date_from`, `date_to` (datetime
  granularity, naive-UTC compare), `status`, `workflow_guid`;
  `fields=full` adds `data_dictionary` + `final_output`.
  **`page_size` clamps to 100 on this endpoint** (kit's 02 says list
  endpoints clamp at 250 — flagged upstream). Params that do NOT filter
  (silently ignored): `start_date_from`, `created_after`, `since`.
- `GET /tenants/{t}/workflows/instances/{id}?steps=full` → instance doc
  with `data_dictionary`, `final_output` (Any), `cumulative_tokens`,
  `cumulative_cost_usd`, and `steps[]` of `{sequence, step_id, step_name,
  status, start_time, end_time, result:{output}, costs, warnings}`
  (note: key is `steps`, not `execution_steps`); `error_message` /
  `failed_step_id` / `failed_step_name` present on failed instances.
- Timestamps are naive-UTC ISO strings — the app suffixes `Z` before
  parsing (`parseInstanceDate` in `src/lib/utils.ts`).
