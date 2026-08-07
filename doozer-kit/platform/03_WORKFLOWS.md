# 03 — Doozer workflows: API, routing, step catalogue, authoring pattern

Workflows are the execution layer for everything a bolt-on drives from a
button. API shapes **verified live against dev 2026-08-01→06** and against
engine source (`packages/doozer-workflow/orchestration/`) 2026-08-07. Step
configs marked NEW are source-verified but not exercised in a live run —
probe before relying on one, then record the verified shape in your
project's `project/WORKFLOWS.md`.

## 1. Why workflows, not chat turns

Default: a workflow. A chat turn only when the user is genuinely conversing.
A workflow buys:

- **Declared inputs** (`input_parameters`) instead of prompt-string assembly.
- **JSON-mode enforcement** instead of "reply with ONLY JSON".
- **Per-run cost/latency/trace** (`cumulative_tokens`, `cumulative_cost_usd`,
  step records).
- **The engine owns control flow.** A model can decline to make the next tool
  call; it cannot decline to be step 4. Silent turn death (observed
  repeatedly) is a conversation failure mode with no prompt-layer fix.
- **Composed context instead of accreted context.** A conversation appends
  forever — measured 150k prompt tokens on one turn, 210k on the next, with
  retrieved content re-paid at full rate every turn on non-caching providers.
- Workflow instance records beat conversations as an audit trail —
  `StepResult.trace` captures the actual action graph.

There is no judgment a chat turn can do that a step cannot: `ask_doozer` runs
the full ReAct loop, with worker persona and tools, inside a workflow.

## 2. REST API (dev-verified)

Tenant-scoped, same auth as everything else.

### Create / update / inspect

```
POST   /tenants/{t}/workflows            → 201 full workflow response (incl. workflow_guid, version: 1, warnings: [...])
PUT    /tenants/{t}/workflows/{guid}     full definition, bumps version
PATCH  /tenants/{t}/workflows/{guid}     surgical edits (step_operations — see below)
GET    /tenants/{t}/workflows/{guid}     current definition
GET    /tenants/{t}/workflows            paged list (for name discovery; q/search, sort_by, sort_order)
GET    /tenants/{t}/workflows/{guid}/versions        list; GET .../versions/{n}; POST .../versions/{n}/restore
DELETE /tenants/{t}/workflows/{guid}     → 204  (and DELETE .../{guid}/instances → {"deleted_count": n})
```

Definition body (full accepted top-level set):

```jsonc
{
  "workflow_name": "XX: Do The Thing",   // the discovery contract — exact-match, keep stable (≤100 chars)
  "description": "…",
  "type": "my-app",                      // free-text grouping label
  "steps": [ { /* step shape below */ } ],
  "variables": {},                       // initial data_dictionary defaults — see wiring rule below
  "input_parameters": [
    {"name": "entity_id", "type": "string", "description": "…", "required": true}
  ],
  "output_variable": "result",           // which data_dictionary key becomes final_output
  "designer_metadata": { "entry_step_ids": ["<uuid-of-entry-step>"] },
  "max_steps": 100,                      // engine default 100 — raise for large loops
  "max_cost_usd": 0.10,                  // engine default **$0.10** — raise for any LLM-heavy workflow or it fails mid-run
  "retention_days": 30,
  "available_as_a_tool": false,          // + tool_execution_mode (sync|async), tool_timeout_seconds (300)
  "execution_mode": "sequential"         // "sequential" | "dag" — see caveat below
}
```

- **`max_cost_usd` defaults to $0.10** when unset — the engine fails the run
  the moment cumulative LLM cost exceeds it (tree-wide for a root instance).
  Set it explicitly on every workflow with LLM steps.
- **Variable-wiring rule (source of NameErrors):** every `input_parameter`
  MUST also appear in `variables` with a safe default (`""`, `0`). The
  caller's value overrides the default; without the default, omitting the
  parameter makes any step referencing `{name}` fail. Step outputs do NOT
  need pre-declaring.
- **`execution_mode` caveat:** it exists only on update/patch (not create —
  a create always lands `sequential`), and GET currently always reports
  `"sequential"` regardless of the stored value (response-mapping gap; only
  `GET .../{guid}/steps` shows the true value). Sequential + `next_step`
  wiring is the normal mode; `dag` ignores `next_step` entirely and runs
  pure dependency topological order.
- **Workflow-as-tool:** `available_as_a_tool: true` exposes the workflow as
  a callable tool for workers (`tool_execution_mode: "sync"` blocks and
  returns `final_output`; `"async"` returns `{instance_id}` immediately).
  Always set `output_variable` on a tool workflow.

Step shape (all types):

```jsonc
{
  "step_id": "<uuid>",        // any unique string; auto-generated if omitted
  "step_type": "llm_call",
  "name": "do_thing",
  "config": { /* per-type config — including routing: next_step lives HERE */ },
  "dependencies": []          // step_ids that must complete first — mirror next_step edges (below)
}
```

`PATCH` takes `step_operations: [{op: add|update|remove, step_id, ...}]` —
atomic (one version bump), `config` is deep-merged on `update` (send only
changed keys; `null` removes a key; lists are replaced whole). `remove` does
NOT fix neighbours' `next_step`/`dependencies` — send update ops for them.

### Routing — how the engine picks the next step

This is the part naive authors get wrong. The engine's precedence per step:

1. `result.next_step` set by the step type itself (loop controllers, etc.)
2. Branch evaluation for `switch` / `llm_decision` config
3. `config.next_step` — the explicit forward link (**sequential mode only**)
4. No route found: in a workflow where **any** step sets `next_step`
   ("strict routing", BL 275), the branch **ends** and a
   `no_outgoing_route` warning is recorded on the instance. Only legacy
   deps-only workflows fall back to dependency topological order.

Rules that follow (mirrors the platform's own authoring schema):

- **Set `config.next_step` on every non-switch, non-loop-return step.**
  It may be a string or a list — a list of >1 forks those steps in parallel.
- **Mirror every `next_step` edge into the target's `dependencies`**
  (`A.config.next_step="B"` ⇒ `B.dependencies=["A"]`). Dependencies drive
  the designer render, resume/skip walks, and topo fallback; `next_step`
  drives execution. Both must be written. Exceptions that keep
  `dependencies: []`: entry steps and switch/loop branch targets.
- **`"__end__"` is the terminate-branch sentinel.** Route a terminal step to
  End with `config.next_step: "__end__"` (or as a `logical_switch` value /
  `default_step` / `loop_done_step`). Never delete an `__end__` reference to
  "tidy a dangling link" — without it the branch ends implicitly with a
  warning.
- **`entry_step_ids` lives in `designer_metadata`** (not top level). It is
  the Start edge only — more than one entry forks every listed step in
  parallel (this corrupted memory writes in production; 05_GOTCHAS.md #7).
  When absent, every zero-dependency step is treated as an entry. Honoured
  in sequential mode only.
- **Last step of a loop body** (named in `loop_return_from`): do NOT set
  `next_step` — the engine routes back to the loop controller.
- `switch` routing lives in config keys `input`, `logical_switch`,
  `regex_switch`, `llm_decision` (`true_step`/`false_step`), `default_step`.
  (NOT `input_variable`/`branches`/`default_branch` — those are silently
  ignored.)

**Read the create/update/patch `warnings`** — static analysis emits
`UNDECLARED_VARIABLE_READ`, `ORPHANED_VARIABLE`, `UNREACHABLE_STEP`,
`SWITCH_NO_FALLBACK`, `STALE_STEP_REF`, `EXECUTE_FLOW_*` (child-contract
drift), `LOOP_RETURN_FROM_TYPE`. Advisory, never blocks — but a variable one
step reads and no step writes is invisible to unit tests; this is the net.

### Execute and poll

```
POST /tenants/{t}/workflows/{guid}/execute   body {"data_dictionary": {…inputs…}, "worker_guid"?: "…", "callback_url"?: "…"}
                                             → 202 {"instance_id": "…"}
     …?sync=true&timeout=120                 → 200 full instance doc (or 202 on timeout; timeout cap 300s)
GET  /tenants/{t}/workflows/instances/{id}   (?steps=none|brief|light|full; ?include_steps=true = steps=full)
GET  /tenants/{t}/workflows/{guid}/instances          per-workflow run list
GET  /tenants/{t}/workflow-instances                  tenant-wide list (note the hyphen); default fields=summary
                                                      OMITS data_dictionary/final_output — pass fields=full when you need outputs
POST /tenants/{t}/workflows/instances/{id}/signal    body {"signal": "stop"|"pause"|"resume"|"step"} — stop cascades to children
```

- Execution is **by guid only** — there is no execute-by-name route; name
  discovery (§4) means list-and-match, then execute the matched guid.
- A `queued` instance doc is written synchronously before the Service Bus
  enqueue, so an immediate poll normally finds it; the pre-write is
  best-effort though, so still treat a **404 right after execute as
  in-progress**, not failure. Proven client: 2s poll, 120s ceiling,
  404-tolerant.
- Statuses — non-terminal: `queued | running | paused | awaiting_child`;
  terminal: `complete | failed | stopped` (exactly these strings — not
  `completed`/`cancelled`; `pending` is a step status, never an instance
  status). Poll until terminal. Note `?sync=true` only waits for
  `complete|failed` — a `stopped` run rides to timeout.
- Terminal `complete` puts the output variable's value in **`final_output`**
  — typed **Any**: `llm_call` writes strings (JSON comes back as a JSON
  string even with `json_mode` — parse it), but non-LLM steps can land
  dicts/lists there. On failure `final_output` is overwritten with the error
  string and `error_message`/`failed_step_id`/`failed_step_name` are set.
- Instance carries `duration_seconds`, `cumulative_tokens`,
  `cumulative_cost_usd`, `warnings` (incl. `no_outgoing_route`), and —
  with `steps=light|full` — per-step `costs` (including the **actual model
  used** — check it before theorising about model swaps).
- Re-running a stored instance's `data_dictionary` is a free regression
  fixture — diff outputs before PUTting a new prompt version.

### Variable interpolation — the gotcha that matters

`{name}` / `{a.b.c}` / `{a.b.0.c}` (list indices work) placeholders anywhere
in step config resolve from the data_dictionary. A config value that is
*exactly* one placeholder preserves the value's type (dict/list/number);
placeholders embedded in a longer string stringify. **Literal JSON braces
pass through untouched** (unresolvable spans are left as-is — verified in
`variable_resolver.py` and live), so a prompt may safely embed a JSON output
template next to real placeholders. **Never write `{{double}}` braces** —
the engine substitutes single braces only; a doubled reference reaches the
runtime as literal text (classic failure: `Integration connection
'{{connection_id}}' not found`). The lone exception is standalone *tool*
definitions (http/llm/sql/sftp `tool_configuration` templates), which accept
`{{param}}`.

Reserved namespaces: `{memory:KEY}` (worker→tenant→org cascade; scoped
forms `{memory:worker:KEY}`, `{memory:workspace:KEY}` = tenant,
`{memory:org:KEY}`) and `{key:SECRET_NAME}` (tenant secret, then platform
vault) — don't create input names that collide. BL 233 note: legacy forms
(`{{key.NAME}}`, `{memory.A.B}`, bare-name switch inputs) still resolve
during a deprecation window and stamp a `BL233-LEGACY-REMOVE-ON-WRAPUP`
warning on the step — write only the current syntax; the fallbacks are
scheduled for removal (Stage 4).

Run-context placeholders the engine injects into every step (read-only —
use for correlation tokens, instance-scoped memory keys, audit rows):
`{__instance_id}`, `{__workflow_guid}`, `{__step_id}`, `{__step_name}`,
`{__recursion_depth}`. Inside `execute_python` code they are
`doozer.instance_id` etc. — `{…}` placeholders are NOT substituted inside
`code`/`script` fields (deliberately exempt, so Python f-strings survive).

Caveat: `remember` values also pass through the resolver, so stored prose
containing a literal `{input_name}` token could be substituted — avoid input
names likely to appear in prose.

## 3. Step catalogue

Registered types (engine registry, verified 2026-08-07): `ask_doozer`,
`ask_system`, `browser_action`, `classify_document`, `create_asset`,
`execute_flow`, `execute_python`, `execute_sub_process`, `execute_tool`
(deprecated alias `execute_ability`), `execute_ws` (+ `execute_ws_get` /
`_post` / `_put` / `_patch` / `_delete`), `expression` (alias `calculate`),
`extract_document`, `goto`, `human_in_loop`, `integration`, `llm_call`,
`loop_ability`, `mcp_tool`, `message`, `query_index`, `recall`, `remember`,
`sandbox_python`, `set_variable`, `switch`, `sync`. (No new step type has
been added since 2026-05; `ask_doozer_stream` and `nl_browser_agent` are
internal helpers, not step types.)

Every step's config accepts `output_variable` (canonical; legacy `output`
also read) naming the data_dictionary key for its result, plus the routing
keys from §2. The platform's own schemas are the source of truth, and they
are **self-serve over HTTP** (same auth as everything else) — the exact
dicts the platform's own build agent reads:

```
GET /platform-tools/workflow-step-schema?step_type=llm_call   # per-step config schema (omit param to list all)
GET /platform-tools/workflow-schema?section=all               # definition fields, routing/entry-exit/substitution conventions
GET /platform-tools/workflow-trigger-schema?trigger_type=…    # variables a trigger injects
GET /platform-tools/tool-type-schema?tool_type=http           # standalone tool config schemas
```

Curl these whenever this doc and reality might have drifted; the notes below
are the bolt-on-relevant subset.

### `llm_call` — the workhorse

Config: `query` (required), `output_variable` (default `llm_response`),
optional `system_prompt`, `temperature` (default 0.3), `json_mode: true`,
`max_tokens` (no engine default — the provider's own completion cap
applies), `attachments` (same `{url,type,format,name}` shape as chat), and
model override (below).

**Always set `max_tokens` when output scales with input.** The provider
default caps completion (~8,192) and **silently truncates** — the step still
reports `complete`; the only symptoms are `completion_tokens` sitting exactly
on a round cap plus unparseable JSON downstream.

**Model override — set all of `model` + `provider_config_guid` + `model_id`
together from a registered provider entry, or none of them.** A bare model
name without the registry pair falls back to a default OpenAI path with no
tenant credentials and fails at runtime with "Missing credentials". Leaving
all unset applies the tenant's registry default.

### `expression` / `set_variable` — cheap plumbing

`expression` (alias `calculate`) computes one value from a Python expression
— **prefer it over `execute_python` for string formatting, arithmetic,
boolean checks, list/dict access**. `set_variable` assigns literal or
templated values. Zero tokens, near-zero latency.

### `ask_doozer` — the agent as a step

Full ReAct tool loop inside a step. Config: `query` (required),
`system_prompt`, `output_variable` (default `doozer_response`), `mode`
(`react` default | `rewoo` = plan-and-execute; memory tools are
react-only), `max_iterations` (default 10), `include_history` (default
false — and effectively a no-op in a plain workflow run: it only replays
history when the run originates from a conversation context),
`tool_guids`, `worker_guid`, `enable_memory` (default false; true grants
memory tools scoped to `worker:{worker_guid}`, falling back to
`workflow:{guid}` when no worker is set),
`model`/`provider_config_guid`/`model_id` (same all-or-none rule as
`llm_call`), `compact_context` (default true). With a `worker_guid` the
step injects the worker persona via `build_worker_system_prompt` — note the
worker's `persona.system_prompt`, when set, **replaces** your config
`system_prompt` as the base — and auto-injects `agent_soul` /
`agent_guidelines` even when `enable_memory` is false. Persists its
execution trace in `StepResult.trace`.

**But prefer single-shot `llm_call` with composed context wherever
possible** — the tool loop is the shape that dies silently on flaky
providers. Proven rule: keep `ask_doozer` out of any workflow that writes
state.

### `query_index` — KB lookup as a step

Config: `knowledge_guid`, `query`, `top_k` (5), `score_threshold` (0.35),
`embedding_model` (default `text-embedding-3-small`), `output_variable`
(default `search_results` — the raw chunks), `filters` (validated against
the KB's `metadata_schema`; number/date accept range objects — BL 287).
Supplying **any** of `system_prompt` / `instructions` /
`provider_config_guid` / `model_id` additionally triggers an LLM synthesis
pass into `synthesis_output` (default key `answer`). **Without one of those
four there is no synthesis output** — a downstream step reading `{answer}`
gets nothing and no error. Zero passages with synthesis on writes the
literal string "No relevant information found." Same retrieval path as the
`knowledge_query` tool, so a step and a tool call give the same passages.
(`include_sources` appears in older examples but is dead in the step path —
don't rely on it.)

### `recall` / `execute_python` / `remember` — free state mechanics

The no-LLM triple for state writes: recall keys → python computes the delta →
remember writes. ~1–5s, zero tokens. Facts:

- Workflows have no worker of their own — **pass the memory scope in as an
  input** (e.g. `worker_scope` = `worker:{guid}`). When scope is omitted the
  steps default to `worker:{context.worker_guid}` if the run carries a
  worker, else the literal scope `"default"` — never rely on that.
- `recall`: `memory_name` (single) or `memory_names` (list — each key lands
  as its own variable and `output_variable` is ignored), `cascade` (default
  false), `output_variable` (default `recalled_value`). Returns null on a
  missing key, never errors.
- `remember`: `memory_name`, `value`, `operation` ∈ `set` (default) |
  `append` | `prepend` | `increment` | `decrement` | `merge` | `push` |
  `pop`, plus `scope`, `category`, `ttl` (seconds, set-only).
- `execute_python`: `code`, `output_variable` (default `python_result`),
  `timeout` (default 30s). Stdlib is unrestricted; third-party imports are
  **allowlisted** (`requests`, `openpyxl`, `openai`, `markdown`,
  `azure-storage-blob`, a few more — `azure.identity`/`cosmos`/`keyvault`
  deliberately blocked); no cross-step code sharing — see §5 for the
  include/build pattern. Reads variables via the injected `var` manager and
  `doozer` context object; supports top-level `await`.
- `sandbox_python` is the heavyweight sibling: runs in an isolated ACA
  session with `_inputs`/`_outputs` dict contract, real filesystem, output
  files auto-registered as Assets, `pip install`, 120s default timeout. Use
  `execute_python` unless you need packages or files.

### Document steps — schema-bound, one source each

`classify_document` / `extract_document` take a single `source` that is a
URL **or an asset guid** (resolved server-side via blob access — prefer the
asset guid: anonymous blob URLs no longer resolve and signed URLs expire).
`classify_document`: `schema_guids` (list). `extract_document`:
`schema_guid`, `on_review_required` (`pause` default | `continue_partial`).
Both are extraction-schema-bound and take one source per step; **there is no
generic "read file → text variable" step**. For multi-document input, the
proven pattern is: extract text client-side, bank it into a memory key at
entity creation, and have workflows `recall` it. Banked text has no SAS
expiry and turns document-reading workflows into single-shot `llm_call`s.

### Sub-workflows — `execute_flow` vs `execute_sub_process`

`execute_flow` runs **one** child (always async under the hood: parent
suspends `awaiting_child`, resumes on child completion): `workflow_guid`,
input control (`inherit` / `selected_variables` / `input_mapping` /
`renames`), `output_mapping`, `on_child_failure`, output default
`child_result`. `execute_sub_process` fans out **many**: `workflows[]`,
`mode: parallel|sequential`, `max_parallel`, `wait_for_completion` (default
false — fire-and-forget unless set). Both refuse self-reference. The
contract-drift warnings (`EXECUTE_FLOW_*`) exist because parent/child input
contracts drift silently — read them.

### Triggers (operator-configured, not bolt-on API calls)

Workflows can also start from platform triggers: `webhook` (per-trigger
auth; provider descriptors for smartsheet/stripe/github/jira), `schedule`
(5-field cron + IANA timezone), `file_upload` (watches an UPLOADS folder;
fires on inbox upload — relevant if your bolt-on uploads files there), and
`email_m365`. Trigger-injected variables land in the data_dictionary from
step one. A bolt-on normally drives everything through `/execute`, but know
these exist — an inbox upload with `?sync=true` can dispatch a file_upload
trigger inline.

## 4. App wiring — name discovery

No per-customer workflow config. The app discovers each workflow at runtime
by **exact `workflow_name`** (paged list match — there is no
execute-by-name route, so match then call the guid), cached once per
session:

- Found → execute the workflow.
- Absent or lookup failed → fall back (chat turn, or a disabled button) —
  a failed lookup is retried next time, never surfaced as an error.
- Renaming a workflow in the platform designer silently reverts that tenant
  to fallback — give the app a settings/status card showing which mode each
  workflow is in.

Model/cost pinning: `provider_config_guid` + `model_id` on each LLM step and
`max_cost_usd` per workflow live **in the versioned JSON, never set in the
designer** — a redeploy PUTs the local file and silently reverts anything
only set server-side. `provider_config_guid` is **tenant-scoped**: a new
customer tenant means re-pointing it.

## 5. Authoring pattern (proven in production)

The JSON definition is the deployable artifact, versioned in the repo
(`platform/workflows/*.json`). Python steps are not maintained hand-escaped
in JSON strings:

- Source files: `platform/workflows/src/<json-basename>.<step-name>.py`.
- `# @include _shared.py` splices common helpers (workflow python has no
  cross-step sharing — this is the only way to avoid drifting copies).
- `build.py` injects src → JSON (compile-checks each snippet; `--check`
  verifies sync, `--extract` bootstraps from existing JSON).
- `test_workflows.py` runs every python step against fixture state and
  canned LLM replies.
- `deploy.ps1 -TenantGuid <guid>` builds, tests, then POSTs or PUTs each
  definition **by name** (idempotent, `-WhatIf` supported), and audits
  `designer_metadata.entry_step_ids`.
- `smoke.ps1` executes the deployed workflows against a throwaway entity,
  asserts on what lands in memory, then deletes it.

Unit tests can't catch wiring; the deploy warnings and the smoke run can.
Run both.

**`entry_step_ids` is the Start edge only.** Listing more than the true
entry step forks every listed step in parallel and corrupts memory writes.
Audit it on every deploy.

## 6. Invariants for state-writing workflows

These encode failures that actually happened (05_GOTCHAS.md). Pin them with
tests:

- **A user decision is never reverted** — LLM steps skip items already in a
  user-approved status.
- **Re-running is safe** — a second run adds nothing and duplicates nothing;
  it only fills what is still open.
- **The engine stamps `updated_at`**, never the model.
- **The model returns deltas** (ids + rationale); a python step applies them.
  Never ask a model to re-emit a large array or whole state object.
- **Anything the model could not read becomes a visible blocker row**, not a
  silent omission; "I need X" becomes an owned item, not a stalled plan.
- **Every `llm_call` carries an explicit `max_tokens`** — and every workflow
  with LLM steps carries an explicit `max_cost_usd` (the engine default is
  $0.10 and fails the run when exceeded).
- **Every `ask_doozer` sets `include_history: false`** and caps iterations.
- **The advisory/ask workflow has no `remember` step** — asking cannot
  change state.
- If required input text is missing, return empty + one blocker — a step
  that cannot read its input must fail loudly, not guess.
