# 04 — Platform ops cookbook (operator actions via the public API)

Setup, repair, and diagnostics on workers/tenants. Verified against platform
source and live dev (2026-07-30→08-04). Auth: `X-Api-Key` (dev) or Bearer;
error envelope `{error, detail, correlation_id}`.

**The bolt-on app itself never does any of this** — these are
operator/onboarding actions, run from a terminal or setup script.

## Worker configuration

| Action | Route | Notes |
| --- | --- | --- |
| Read worker (incl. persona) | `GET /tenants/{t}/workers/{w}` | Full doc incl. `tool_guids` |
| Update basics | `PUT /tenants/{t}/workers/{w}` | Fields: `name, role, description, email, picture, hire_status, persona_traits, persona_skills, persona_voice` — `None`/omitted = don't change, `[]` = clear. Also accepts `agent_soul` / `agent_guidelines` (auto-stored as worker memories at scope `worker:{w}`) — but an **empty string is skipped, so you cannot clear either via PUT**, and a failed memory write still returns 200; verify with a memory GET. |
| Custom prompts | **DO NOT USE** | `persona.custom_prompts` has no API write route (Cosmos-only), unused platform feature — decision 2026-07-30. Standing instructions go in the `agent_guidelines` memory instead. |
| Assign tool | `POST /tenants/{t}/workers/{w}/tools/{tool_guid}` | e.g. a KB's query tool |
| Unassign tool | `DELETE /tenants/{t}/workers/{w}/tools/{tool_guid}` | |
| Assign knowledge | `POST /tenants/{t}/workers/{w}/knowledge/{kb_guid}` | |

## Standing instructions: `agent_soul` / `agent_guidelines`

These two worker-memory keys are auto-injected into every conversation —
they are the mechanism for installing a state contract or behavioural rules
on a worker. Install by memory POST (back up the current value first):

```
GET  /tenants/{t}/memory/worker:{w}/agent_guidelines        # backup to a file
POST /tenants/{t}/memory
     {"scope": "worker:{w}", "key": "agent_guidelines",
      "value": "<full text>", "allow_overwrite": true}
```

Trade-off, accepted: memory is agent-editable, so end the contract with a
behavioural "never modify `agent_soul`/`agent_guidelines`" rule. If a worker
ever rewrites its guidelines, restore from backup and report it as a
platform issue.

## Worker memory (state repair)

Scope for a worker: `worker:{worker_guid}`.

| Action | Route | Body |
| --- | --- | --- |
| List entries | `GET /tenants/{t}/memory/{scope}` | — (500-char previews, `value_truncated: true` flags; `?full=true` for full values; includes `memory_guid`) |
| Read one | `GET /tenants/{t}/memory/{scope}/{key}` | — (404 on miss; bumps `recall_count`) |
| Read by prefix (full values) | `GET /tenants/{t}/memory/{scope}/by-prefix?prefix=&limit=` | — (limit default 1000, max 5000; 413 `PrefixOverflow` past it) |
| Grep a big value | `GET /tenants/{t}/memory/{scope}/{key}/grep?pattern=&regex=&context_lines=` | — matching lines with context, without fetching the whole value |
| Create/overwrite | `POST /tenants/{t}/memory` | `{scope, key, value, allow_overwrite: true, memory_type?, category?, ttl?}` — 201 on success; **409 `DuplicateKey`** if the key exists and `allow_overwrite` is false. Overwrite preserves `memory_guid`/`created_at`. `ttl` is **seconds**; omitted ttl gets the category default (`plan`/`todo` 48h, `working_note` 7d, `promotion_candidate` 30d, `lesson`/`guideline` permanent). `memory_type` containing "secret" routes the value to Key Vault. |
| **Surgical edit** | `PATCH /tenants/{t}/memory/{scope}/{key}` | `{old_string, new_string, replace_all?}` — 400 `EditError` if `old_string` not found **or occurs more than once without `replace_all`**; 404 on missing key. Returns `{ok, key, bytes_changed, new_size}`. Ideal for fixing one field without rewriting the value. |
| Delete | `DELETE /tenants/{t}/memory/{scope}/{memory_guid}` | takes the **memory guid**, not the key — list the scope first. 204 on success. |
| Bulk delete by prefix | `POST /tenants/{t}/memory/{scope}/by-prefix/delete` | `{prefix, max_delete?, dry_run?}` — use `dry_run: true` first |
| **History** | `GET /tenants/{t}/memory/history/scope/{scope}` | the write log (`action`: store/update/edit/delete/evict/promote) — the diagnostic for any "key vanished" mystery (shows delete→store pairs, unpaired deletes). Per-doc variant: `GET /tenants/{t}/memory/history/{memory_guid}`. |

## Ground rules for operator writes

1. Back up first: `GET` the current value to a file (e.g. under `d:\tmp\`).
2. Prefer `PATCH` (old/new string) over wholesale `POST` overwrite.
3. Never edit memory while a turn or workflow is actively writing.
4. Operator writes are for repairing corruption, not driving the product.
5. Before the contract is installed, a worker may invent its own state keys —
   delete those; the app only reads contract keys.

## Diagnostics quick reference

- **Turn seems dead / state didn't update**: `GET` conversation detail —
  check `stream_status`, `messages[].tool_calls`, and the recorded model.
  Real cost + successful tool calls + tiny completion = silent turn death
  (05_GOTCHAS.md #2), not an app bug.
- **Memory key vanished**: scope history endpoint (above).
- **KB returns 0 passages silently**: suspect stream-app config drift
  (missing QDRANT_* settings was the actual cause once) — test the KB's
  query tool directly via `POST /tenants/{t}/tools/{tool_guid}/test`.
- **Which model actually ran**: workflow instance per-step `costs`, or
  conversation `model_resolved` / `last_model` — check before theorising.
- **Replay a stored user message**: curl the stream endpoint with the same
  body and watch for `model_resolved`/`done`.

## Direct database access (dev diagnostics — NOT for app runtime)

For workflow-building and investigation sessions with Azure access. **The
bolt-on app itself never touches a database** — this is for a human/AI
operator session diagnosing "what actually happened in run X" when the API
surface isn't enough. Prereqs for both: `az login` against the platform's
Entra tenant. Resource naming: `{type}-doozer-{deployId}-{env}` (dev
deployId `c824`, RG `rg-doozer-c824-dev`).

### Cosmos (runtime state — workflow runs, memory, conversations)

- **Account (dev):** `https://cosmos-doozer-c824-dev.documents.azure.com:443/`
- **Auth is AAD-only** — key auth is disabled; a key string fails with
  "Local Authorization is disabled". You need the **data-plane** RBAC role
  *Cosmos DB Built-in Data Contributor* (or Reader) on the account —
  subscription-level Contributor alone is NOT enough.
- **TWO databases** (not one):
  - `agentos-hot` — runtime data: `workflow-instances` (PK `tenant_guid` —
    `data_dictionary`, `status`, `final_output`, lineage), `workflow-steps`
    (PK `instance_id` — per-step `result`, `trace`, `costs`, `warnings`),
    `workflows` (PK `tenant_guid` — definitions), `cosmos-cache`
    (checkpoints/signals, 7d TTL), `agent-memory`, `conversations`,
    `worker-config`, `tools`, `human-tasks`. **Run investigations live
    here.**
  - `agentos-cold` — reference/long-tail: `agent-memory-history` (PK
    `memory_doc_id`), `knowledge`, `knowledge-chunks`, `tenant-secrets`,
    `tenant-settings`, `llm-*`, `integration-*`, `sandbox-logs`, …

```python
from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential

client = CosmosClient(
    "https://cosmos-doozer-c824-dev.documents.azure.com:443/",
    credential=DefaultAzureCredential(),
)
db = client.get_database_client("agentos-hot")
steps = db.get_container_client("workflow-steps")
rows = list(steps.query_items(
    "SELECT c.step_name, c.status, c.result FROM c",
    partition_key=instance_id,        # single-partition — much cheaper
))
```

Rules that prevent real incidents:
1. Pass the partition key instead of `enable_cross_partition_query=True`
   whenever you have it (`workflow-steps` → `instance_id`).
2. **No `ORDER BY` on cross-partition queries** unless the field is indexed
   — pull matches and sort client-side.
3. **Back up before any write**: dump the original doc to a local JSON
   file, then `replace_item` with the etag + `MatchConditions.IfNotModified`
   (the enum from `azure.core` — the string form raises `TypeError`).
4. Writing to `workflows` races the designer cache — if anyone has the
   workflow open in the designer, their next save overwrites you.
5. Investigation scripts are disposable — keep them in a temp dir, don't
   commit them.

### Azure SQL (identity, billing, triggers, cost attribution)

- **Server (dev):** `sql-doozer-c824-dev.database.windows.net`, database
  `db-doozer-c824-dev`. **Entra ID-only auth** — there is no SQL
  username/password; every connection presents an AAD token for scope
  `https://database.windows.net/.default`.
- Your public IP must be in the server firewall
  (`az sql server firewall-rule create …`).
- What lives here that an ops session actually needs: `ApiKey` (hashes of
  tenant API keys), `PlatformUser` / `Tenant` / `Organization`,
  `WorkflowTrigger` (trigger rows), `Asset`, and **`LlmUsageLog`** — the
  per-call cost ledger. Per-run cost rollup = sum `LlmUsageLog` by
  `WorkflowInstanceId` (steps without instance context show $0 in the UI).

```python
# pip install pyodbc azure-identity  (+ Microsoft ODBC Driver 18)
import struct, pyodbc
from azure.identity import DefaultAzureCredential

token = DefaultAzureCredential().get_token(
    "https://database.windows.net/.default").token
tok = token.encode("utf-16-le")
conn = pyodbc.connect(
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=tcp:sql-doozer-c824-dev.database.windows.net,1433;"
    "Database=db-doozer-c824-dev;"
    "Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;",
    attrs_before={1256: struct.pack(f"=I{len(tok)}s", len(tok), tok)},
)  # 1256 = SQL_COPT_SS_ACCESS_TOKEN
```

(In the doozer-platform repo the same recipe is packaged as
`infra/sql/_connect.py`; `sqlcmd` 18+ with
`--authentication-method ActiveDirectoryDefault` also works.)

Ground rules: reads are fair game; **never write to SQL or Cosmos to drive
the product** — schema and reference data are deploy-managed, and runtime
rows belong to the engine. Direct writes are for repairing corruption only,
same discipline as memory repair above.

### Bootstrap GUID discovery — do this ONCE, then record locally

Every session needs the same handful of GUIDs (org, tenant, worker(s),
workflows, tools, KBs, folders). **Discover them once at project start and
record them in `project/ENVIRONMENT.md` (workflow guids in
`project/WORKFLOWS.md`)** — subsequent threads read the project files; they
do not re-discover, and they never guess a GUID.

Org / tenant / worker come from SQL (exact schema, verified):

```sql
SELECT OrgGUID, OrgName FROM Organization WHERE IsActive = 1;
SELECT TenantGUID, Name FROM Tenant WHERE OrgGUID = '<org>' AND IsActive = 1;
SELECT w.WorkerGUID, w.Name, w.Role
FROM   Worker w JOIN TenantWorker tw ON tw.WorkerGUID = w.WorkerGUID
WHERE  tw.TenantGUID = '<tenant>';
```

Workflows / tools / KBs / folders: once you have the tenant guid and an API
key, the **API lists are the preferred source** (they're the same view the
app will use): `GET /tenants/{t}/workflows` (grab `workflow_guid` +
`workflow_name`), `/tools`, `/knowledge`, `/folders`, `/workers`. Cosmos
fallback when there's no key yet (`agentos-hot`, cross-partition):

```sql
SELECT c.id, c.workflow_name FROM c WHERE c.tenant_guid = '<tenant>'   -- workflows container
```

(same pattern on `tools`; KBs live in `agentos-cold` `knowledge`). Verify
any Cosmos-discovered guid via the API before hard-coding it anywhere.
