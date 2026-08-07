# Agent/state contract — memory keys and ownership

> Filled 2026-08-07. **This app has no memory contract.** It is a read-only
> ops dashboard: it renders worker profile and workflow-instance data from
> the platform API and never writes worker memory, never chats, and never
> executes workflows.

## What this app reads

| Source | Route | Used for |
| --- | --- | --- |
| Worker profile | `GET /tenants/{t}/workers/{w}` | name/role/hire_status/tool count cards |
| Workflow list | `GET /tenants/{t}/workflows` | discovery of `Certificate Submit v2` by exact name |
| Instance list | `GET /tenants/{t}/workflow-instances` | KPIs, charts, recent runs, errors |
| Instance list (`fields=full`) | same + `workflow_guid` filter | certificate submissions (`data_dictionary` fields) |
| Instance detail | `GET /tenants/{t}/workflows/instances/{id}?steps=full` | available for drill-down (hook exists; no UI yet) |

## Data consumed from `Certificate Submit v2` instances

From each instance's `data_dictionary` (written by the workflow, owned by
the workflow — this app only reads): `certificate_number`, `customer_name`,
`customer_email`, `exact_address`. Missing fields render as `-`; parsing is
tolerant per the kit rules.

## If this app ever grows write paths

Re-read the template history of this file (git) and
`doozer-kit/platform/01_PLATFORM_OVERVIEW.md` §single-writer contract:
buttons go through workflows discovered by exact name, the UI never writes
contract keys, and this file becomes the key registry.
