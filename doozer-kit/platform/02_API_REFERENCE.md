# 02 — Doozer public API reference for bolt-ons

Every API surface a bolt-on uses. Tags: **VERIFIED** = exercised end-to-end
against dev, or confirmed against the exact response-serialization code in
the platform source; **PROBE** = route confirmed, exact field names unproven —
confirm with one curl before hard-coding a parser. Either way, all parsers
must tolerate unknown/extra fields.

## Conventions — VERIFIED

- Auth on every call: `Authorization: Bearer <token>` or `X-Api-Key: <key>`.
- Errors: non-2xx returns
  `{"error": "<ErrorType>", "detail": "<message>", "correlation_id": "<guid>"}`
  (seen on 400/401/403/404/409/413/429/500). You may set your own
  `X-Correlation-Id` request header and it is echoed back.
- **Which host serves what:** chat send + turn cancel live **only on the
  stream app**; everything else — including conversation list/detail/delete
  and SignalR negotiate/join — lives **only on the API app**. Neither set of
  routes exists on the other host (404, not a redirect).
- List endpoints commonly return
  `{"items": [...], "total_count": n, "page": 1, "page_size": 25}` and accept
  `page` / `page_size` (clamped to max 250). **Exceptions:** the conversation
  list uses `total` (not `total_count`); some endpoints return bare
  `{items, total_count}` with no paging. `search` is not universal (workflows
  accept `q` or `search`; workers and assets have no search). Tolerate bare
  arrays and wrapped items.
- `{tenant}` / `{worker}` below are the configured deployment GUIDs.

Probe example (works for anything below; PowerShell → use `curl.exe`):

```bash
curl -s -H "X-Api-Key: $DEV_API_KEY" "$API_BASE/tenants/$TENANT/workers" | jq
```

## Identity

- `GET /me` — VERIFIED. Under an api key returns just
  `{sub: "api-key", email: null}`. Under Bearer returns the full profile:
  `user_guid`, `email`, `display_name`, `role`, `org_guid`, `tenant_guid`,
  `permissions[]` (`{resource_type, can_write, access_level}`), `org_role`,
  and `memberships[]` (`{tenant_guid, tenant_name, role, invite_status}`) —
  check the configured tenant GUID is among `memberships`. The response is
  scoped by an optional `X-Active-Tenant` header (role/permissions become
  that tenant's).

## Workers

- `GET /tenants/{t}/workers` — list (setup verification).
- `GET /tenants/{t}/workers/{w}` — profile: `name`, `role`, `description`,
  `email`, `picture` (the avatar **URL** — fetch it directly; there is no
  GET avatar route), `hire_status`, `persona` (`{traits, skills, voice,
  custom_prompts}`), `tool_guids`, `knowledge_guids`. VERIFIED.

## Conversations (API app)

- `GET /tenants/{t}/workers/{w}/conversations` — VERIFIED. Scoped to the
  authenticated identity (`user_sub`) — note all api-key traffic shares one
  "api-key" principal, so api-key mode only sees api-key-created threads.
  Envelope `{items, total, page, page_size}` (this one is `total`, not
  `total_count`; default page_size 20); item fields: **`id`** (not
  `conversation_id`), `title`, `message_count`, `total_cost_usd`, `status`,
  `continued_in`/`continued_from` (handover linkage), `created_at`,
  `updated_at`. Ordered `updated_at DESC`.
- `GET .../conversations/{id}` — VERIFIED. Returns the full conversation
  doc: `messages[]` (`message_id`, `role` `user|assistant`, `content`,
  `attachments[]`, `tool_calls[]`, `cost`, `error`, `created_at`),
  `stream_status` (**`"idle"` | `"streaming"`** — the reconnect/polling
  source of truth), `status` (`active|deleted|archived_oversized`),
  `last_model`, `total_cost_usd`, `continued_in`/`continued_from`. 404 if
  the conversation belongs to a different principal.
- `DELETE .../conversations/{id}` — VERIFIED. Soft delete (sets
  `status: "deleted"`); returns `{"deleted": true}`.
- `POST {STREAM_BASE}/tenants/{t}/conversations/{id}/cancel` — VERIFIED —
  **on the stream app**, not the API app. Cancels an in-flight turn; wire to
  a stop button. Best-effort: returns 200 whether or not a turn was found
  (the task registry is per-instance in-memory), and a successful cancel
  emits a `cancelled` SSE event and persists the partial reply.

## Chat (send + stream) — VERIFIED transport

`POST {STREAM_BASE}/tenants/{t}/workers/{w}/chat`

```json
{ "conversation_id": "optional — omit to start a new conversation",
  "message": "text",
  "attachments": [
    { "type": "document", "url": "<SAS download URL>", "format": "pdf", "name": "x.pdf" }
  ] }
```

Other accepted body fields: `mode` (`chat` default; `build`/`plan` are
platform-builder surfaces — bolt-ons never send them) and
`provider_config_guid` + `model_id` (per-turn model override — only applied
when **both** are present).

`attachments` is **how an agent reads files** — the platform extracts
PDF/DOCX/text inline into the agent's context; there is no folder-browsing
tool. `type`: `document` | `image`; `format`: `pdf` | `docx` | `text`.
**Any other format value (including `xlsx`) falls through the PDF branch and
is sent to the model as broken base64 "PDF" — silently useless, not
rejected** (VERIFIED in source). For spreadsheets, export CSV/text and send
`format: "text"`. Fetch each `url` from the asset `download-url` endpoint
immediately before sending — SAS links expire in ~15 minutes, and
**attachments are turn-scoped** (05_GOTCHAS.md #1).

Response: `text/event-stream` (`event: <name>` / `data: <json>` frames).
Handle all of these events:

| Event | Payload (data JSON) | Client behaviour |
| --- | --- | --- |
| `conversation_started` | `{conversation_id}` | persist the id immediately |
| `text_delta` | `{content}` | append to streaming message |
| `status` | `{message}` | subtle "working" line |
| `tool_call_start` | `{id, name, args}` | activity chip |
| `tool_progress` | `{id, type, ...}` (`type`: `text_delta`/`nested_tool_call`/`nested_tool_result`/`error`) | activity chip detail |
| `tool_call_result` | `{id, result, duration_ms, success}` (`result` is a truncated preview) | close the chip |
| `ask_question` | `{id, message, questions:[{id, text, options, allow_other, type, default?, placeholder?}]}` — VERIFIED | render option buttons (+ free text if `allow_other`); the answer goes back as a normal chat message |
| `secure_input` | `{id, message, fields, target_api, metadata}` | masked input; never echo the value |
| `plan_published` / `plan_updated` | plan payload | ignore unless trivially renderable |
| `conversation_handed_over` | `{old_conversation_id, new_conversation_id, reason}` | swap the stored conversation id, continue |
| `iterations_exhausted` | `{iterations}` | show "agent stopped mid-task — say 'continue'" |
| `cancelled` | `{conversation_id}` | after a cancel POST — end streaming state, keep partial text |
| `keepalive` | `{elapsed_s}` | normal during long tool runs (every ~15s idle) |
| `model_resolved` | `{provider_config_guid, model_id}` | diagnostics; ignore |
| `error` | `{message}` | error bubble, end streaming state |
| `done` | `{cost_usd, model, total_tokens, prompt_tokens, completion_tokens, cached_prompt_tokens, context_window, conversation_id, ...}` | turn complete → refresh app state |

Notes:

- Streams can run minutes. Disable send while streaming; support cancel.
- **A failed provider call can end the stream silently** — connection closes
  with no `error`, no `done`, nothing persisted (OBSERVED 2026-08-01). Treat
  a stream that closes without a terminal event
  (`done`/`error`/`cancelled`/`iterations_exhausted`) as a platform-side
  turn failure — throw a distinct error, don't parse a partial reply as an
  answer.
- Never auto-retry a chat POST (double-sends). Idempotent GETs: retry ×2
  with backoff on 5xx/network.
- 429 = org credit exhaustion or provider limits — surface the platform's
  message verbatim, it is user-meaningful.
- Timeouts: REST 30s; SSE none (keepalives arrive during tool runs).
- Order by server timestamps from payloads, not client time.

## Reconnect (SignalR) — routes VERIFIED (API app)

For page load / dropped stream while a turn is running (check
`stream_status` on conversation detail):

1. `POST /tenants/{t}/chat/signalr/negotiate` → `{url, accessToken}`
   (503 `SignalRNotConfigured` if the platform has no SignalR configured).
2. Connect with `@microsoft/signalr`, `accessTokenFactory: () => accessToken`.
3. `POST /tenants/{t}/chat/signalr/join` with body
   `{"connection_id": "<hub connection id>"}` → `{status: "joined", group}`
   (the group is per-user: `user-{sub}`). VERIFIED.
4. Handle target `workflowEvent`: `{event_type, group_id, data}` — filter by
   your conversation id. `chat_progress` carries
   `{conversation_id, content, tool_calls}` (batched ~100 chars);
   `chat_complete` carries `{conversation_id}` only → reload the
   conversation via REST.
5. Poll conversation detail every ~10s as a safety net.

## Worker memory (state reads)

Scopes a bolt-on uses: `worker:{worker_guid}` (private) or `__tenant__`
(shared). Others exist (`__org__`, `workflow:{guid}`, `session:{id}`, …);
reads on a worker scope can cascade worker → `__tenant__` → `__org__` where
an endpoint supports it. `value` is typed **`Any`** — strings, objects, and
arrays all round-trip; if you store JSON as a string, parse it yourself, and
tolerate both forms when reading.

- `GET /tenants/{t}/memory/{scope}` — VERIFIED. `{items, total_count, page,
  page_size}` with **truncated previews** (500 chars + a literal
  "… [truncated …]" suffix; truncated items carry `value_truncated: true`);
  includes `memory_guid`. `?full=true` returns full values. Diagnostics only.
- `GET /tenants/{t}/memory/{scope}/{key}` — VERIFIED. One entry (bare
  object, not wrapped); 404 `NotFound` on a missing key. Reading bumps
  `recall_count`/`last_recalled_at`.
- `GET /tenants/{t}/memory/{scope}/by-prefix?prefix=&limit=` — VERIFIED.
  `{items:[{key, value, …}], matched_count, limit, truncated}` with **full**
  values (`truncated` is always false by design); returns **413
  `PrefixOverflow`** rather than truncating past `limit` (default 1000, max
  5000), so a 200 is authoritative. **Prefer one by-prefix call per app
  entity over per-key GETs** — absent keys 404 per poll and spam the browser
  console regardless of your `.catch()`.
- `GET /tenants/{t}/memory/{scope}/{key}/grep?pattern=&context_lines=&regex=&max_matches=`
  — VERIFIED (**GET**, not POST). Returns
  `{key, scope, total_matches, returned_matches, truncated, matches, mode}`.
  Cheap way to probe a huge value without fetching it.
- Write/patch/delete routes exist — **operator and workflow use only**
  (04_OPS_COOKBOOK.md). The UI never writes contract keys.
- `GET /tenants/{t}/memory/history/scope/{scope}` — the diagnostic for any
  "key vanished" mystery (05_GOTCHAS.md #5). Note the route is
  tenant-prefixed like everything else.

## Knowledge (read-only from a bolt-on) — VERIFIED end to end

Since BL 287 (2026-07-29) a KB is a **multi-document library** sharing one
index: per-document metadata, typed schema fields, query filters.

- `GET /tenants/{t}/knowledge/{kb}` — `knowledge_guid`, `display_name`,
  `embedding_status`, `chunk_count`, `source_count` (both are aggregates
  over documents), `metadata_schema`
  (list of `{key, label?, type?, allowed_values?, default?, multi?}`;
  `type` ∈ `keyword` (default) | `number` | `date` | `boolean`;
  `multi`/`allowed_values` are keyword-only),
  `tool_guid` (the KB's query tool), `qdrant_collection`.
- `GET /tenants/{t}/knowledge/{kb}/documents` —
  `{items:[{source_id, display_name, source_type, source_format,
  embedding_status, chunk_count, metadata{...}, created_at}], total_count}`
  (unpaginated).

Library document upload is an operator activity in the platform UI (or via
`POST .../knowledge/{kb}/documents/upload`), not a bolt-on feature. App
files go through Folders/Assets below.

## Direct tool execution (diagnostics only) — VERIFIED

`POST /tenants/{t}/tools/{tool_guid}/test` with `{"parameters": {...}}` →
`{success, output, execution_time_ms, return_direct, cached, ...}`.
`output` is **`Any`** — knowledge/LLM tools return a JSON **string**,
HTTP/integration tools return dicts/lists; handle all three. For a
`knowledge_query` tool: parameters `{query, filters?, synthesize?}` —
`filters` matches the KB's `metadata_schema` keys (number/date accept range
objects like `{"year": {"gte": 2024}}`), `synthesize: false` returns raw
passages; parsed output `{answer?, passages?, sources?, filters_applied?,
note?}`. Good for an admin diagnostics page; normal users never call tools
directly.

## Files: folders, upload, assets — shapes VERIFIED 2026-07-30

- `POST /tenants/{t}/folders` — **requires `folder_type_code`** (valid:
  GENERAL, KNOWLEDGE, PROJECT, TOOLS, UPLOADS, WORKERS, WORKFLOWS); bolt-on
  uploads use `UPLOADS` ("File Inbox"). Also `GET /folders`,
  `GET /folders/{guid}`, `GET /folders/{guid}/contents` →
  `{folder: {...}, items: [{folder_item_guid, entity_type, entity_guid,
  display_order}]}` — uploaded files appear as `entity_type: "FILE"` with
  `entity_guid` = the asset guid (other entity types: TOOL, WORKFLOW,
  KNOWLEDGE, WORKER, SCHEDULE, INTEGRATION, EXTRACTION_SCHEMA). Pattern:
  one folder per app entity, named with the entity id.
- `POST /tenants/{t}/inbox/{folder_guid}/upload` — **raw body** + `file_name`
  query param (or `X-File-Name` header; 400 if neither). The folder must be
  an `UPLOADS` folder (400 `InvalidFolder` otherwise); 50 MB cap. **Do not
  send multipart — it is NOT rejected; the multipart envelope is stored
  verbatim as the file content (silent corruption).** Returns 201 with the
  asset record incl. `asset_guid` and `download_url`. `?sync=true` runs
  extraction + file-upload trigger dispatch inline and adds
  `extracted_data` / `triggered_workflows` / `workflow_instance_id`.
- `GET /tenants/{t}/assets` — **the folder query param is IGNORED** (returns
  all tenant assets; confirmed live 2026-08-01 and in source). Scope to a
  folder via the folder's `/contents` (`entity_type: "FILE"` rows). Assets
  name files `file_name`.
- `GET /tenants/{t}/assets/{asset_guid}` and
  `GET .../assets/{asset_guid}/download-url` → `{url, expires_at}` —
  short-lived SAS (default 15 min, `?expiry_minutes=` up to 60).
- Three link kinds on an asset record — don't conflate: `blob_url` (SAS,
  currently ~7 days, re-minted per response — a stopgap, don't persist it),
  `download_url` (stable revocable capability link, ~90-day TTL, resolves
  via an anonymous redirect route), and the `download-url` endpoint above
  (fresh short SAS — use this for chat attachments). Persist `asset_guid`,
  mint links on demand.

## Out of scope for bolt-ons

Worker/tool/knowledge management UIs, integrations, marketplace,
org/platform admin, build-chat, human-tasks, voice. Don't surface platform
vocabulary to end users at all — bolt-on users get a chat-only role and must
never see "workers", "tools", or "knowledge bases".
