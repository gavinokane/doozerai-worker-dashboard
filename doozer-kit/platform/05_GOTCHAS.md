# 05 — Gotchas and hard-won lessons

Every one of these cost real debugging time on the first bolt-on. Read before
writing code; each entry gives the failure signature and the rule that
prevents it.

## 1. Attachments are turn-scoped — SAS links die in ~15 minutes

Chat attachments are re-fetched from their stored SAS links on every later
turn; a failed fetch **drops the document from the prompt with no error**.
So an agent reads a pack at kickoff, and half an hour later is working blind
while the UI says the files were read. Rules:

- Fetch a fresh `download-url` per file **at send time**, never store one.
- "Read by agent" means *was read once*, not *is available now*.
- Have the agent **bank what it needs into memory in the same turn** it
  holds the documents — or better, extract text client-side and bank it into
  a memory key at creation, so workflows recall it with no expiry at all.
- Offer a one-click re-send (fresh link) when the agent asks for a file
  the UI believes it already has.

## 2. Silent turn death — the platform's worst failure mode

A chat turn can end with no error, no `done`, nothing persisted: the stream
shows ~3 minutes of "streaming" then closes; or the turn makes successful
tool calls, incurs real cost, then just stops (completion_tokens ~185, state
untouched). Cause observed: provider config swaps / flaky providers. Rules:

- Treat a stream that closes without a terminal event
  (`done`/`error`/`cancelled`/`iterations_exhausted`) as a platform turn
  failure — a distinct error type, never a parseable reply.
- **Never chain actions off a chat turn** — a chain turns one silent death
  into a stuck entity. No auto-continue.
- Anything that must durably happen (a user's approval, a status flip) goes
  through a workflow, not a turn — the step either returns or errors.
- Diagnosis: conversation detail → `stream_status` idle + real cost +
  successful tool_calls + tiny completion. Check the recorded model first;
  provider drift is the usual suspect and one GET kills or confirms the
  theory.

## 3. Output that scales with input silently truncates

Provider default completion cap (~8,192 tokens) truncates mid-JSON and the
step/turn still reports success. Signature: `completion_tokens` sitting
exactly on a power-of-two cap + a parse error deep in the output. Rules:

- Explicit `max_tokens` on every `llm_call` whose output scales with input.
- Better: design shapes where output *can't* scale unboundedly — describe in
  batched parts, then make the single decision over one-line summaries.
- Parse tolerantly: salvage a cut-off array rather than binning everything
  before the cut.

## 4. Never ask a model to re-emit a large object or array

A model regenerating a 41KB state object from context dropped 153 of 168
array entries (exactly the number it had actually been handed) and invented
a timestamp. One cause: regeneration loses fidelity in every field. Rules:

- Models return **deltas** (ids + rationale); an `execute_python` step
  applies them and stamps `updated_at` from the clock.
- Split any large collection (file manifests, registers) into its own memory
  key so it isn't re-emitted or re-read on every state write — measured 38KB
  of a 41KB state being paid for twice per turn.

## 5. Never delete-then-store a contract key

An agent rewriting a key as delete → store loses the key forever if the turn
dies between the calls. Signature in the scope history endpoint: repeated
delete→store pairs, final delete unpaired. Rules: overwrite in place
(`allow_overwrite: true`); install a "never delete a contract key" rule in
the worker's guidelines; use `/memory/history/scope/{scope}` to diagnose any
vanished key.

## 6. CORS: never use Azure platform-level CORS on Doozer function apps

Add the app origin to the `CORS_ALLOWED_ORIGINS` **app setting**
(comma-separated) on both the api and stream function apps, declared in the
function-app bicep (same-commit rule). `az functionapp cors add` / portal
CORS with a non-empty list **overrides the in-app middleware for every
origin** and takes down every other app, including the platform's own UI.

## 7. `entry_step_ids` is the Start edge only

Listing more than the true entry step forks every listed step in parallel
and corrupts memory writes. Audit on every workflow deploy. It lives at
`designer_metadata.entry_step_ids` in the definition (not top level), and is
honoured in `sequential` execution mode only.

## 8. Structured steps fail by degrading, not erroring

A wrong-but-valid LLM verdict surfaces two steps later as mysteriously weak
output with no error to trace back. Rules:

- When downstream quality drops, **diff the upstream structured outputs
  first**, not the model.
- Harden seams so a bad upstream verdict degrades gracefully (e.g. name
  what was excluded so the next stage can ask for it).
- Keep stored instance inputs as regression fixtures; re-run and diff before
  deploying prompt changes.
- Pilot inputs must contain the judgment cases — a test set where the
  letter-of-the-prompt and expert judgment never disagree proves nothing.

## 9. Carve-outs move judgment, and the judgment is invisible until gone

A chat turn that looks mechanical (JSON in, JSON out) may be leaning on the
worker's persona to deviate from the prompt's letter. Before moving any chat
behaviour into a workflow, write down: *what would the worker have done here
that the prompt doesn't say?* — and put that text in the workflow's
`system_prompt`.

## 10. A workflow step reads no synthesis it wasn't configured to write

`query_index` only writes its `synthesis_output` when given at least one of
`system_prompt` / `instructions` / `provider_config_guid` / `model_id`. A
downstream step reading `{answer}` gets nothing and no runtime error. The platform's static check
(`UNDECLARED_VARIABLE_READ` warning on create/PUT) is the net — read the
deploy warnings, and smoke-test deployed workflows end-to-end.

## 11. Prompt caching is per provider — cost assumptions can 30× overnight

Azure OpenAI via the platform measured ~98.8% cached prompt tokens; a
provider swap to deepseek measured 0%. A conversation-heavy design that was
cheap becomes ruinous. Compose context per step instead of accreting it, and
check `cached_prompt_tokens` when costs look wrong.

## 12. Workers cannot browse files — attachments or banked text only

There is no folder-browse tool for chat agents, and typically no
file-reading tool at all. A message *referencing* files without attachments
produces a plausible plan-shaped answer with nothing behind it. A workflow
told to "use your file tools" invents output. Always verify a worker's
actual `tool_guids` before writing a prompt that assumes a capability.

## 13. Misc facts that bite

- Conversation list items use `id`, not `conversation_id`.
- `llm_call` output is a string even with `json_mode` (parse it) — but
  workflow `final_output` and tool-test `output` are typed **Any**: strings
  from LLM/knowledge paths, dicts/lists from HTTP/integration paths. Handle
  all three.
- 404 right after workflow execute: rare since the engine pre-writes a
  `queued` instance doc, but the pre-write is best-effort — stay
  404-tolerant while polling.
- Assets list ignores its folder param — use the folder's `/contents`
  (`entity_type: "FILE"` rows carry the asset guid).
- Folder create requires `folder_type_code` (uploads → `UPLOADS`; full list
  in 02).
- Inbox upload is raw body + `file_name` param. **Multipart is NOT
  rejected — the multipart envelope is stored verbatim as the file
  (silent corruption).**
- Chat attachment `format` values other than `pdf`/`docx`/`text` (e.g.
  `xlsx`) fall through the PDF branch and reach the model as garbage —
  silently. Export spreadsheets to CSV/text first.
- Workflow instance statuses are `complete`/`stopped`, not
  `completed`/`cancelled`; `pending` is a step status, never an instance
  status.
- Memory `value` is `Any` — JSON objects/arrays round-trip natively.
  Readers must tolerate both a JSON string and the parsed shape.
- MSAL: `setActiveAccount()` after redirect or silent auth breaks.
- adapter-node: set `ORIGIN` or text-file uploads 403.
- `ask_user_question` is the tool name the LLM calls; `ask_question` is the
  SSE event name the UI sees. Available to every worker unconditionally, but
  workers won't use it unless their guidelines tell them to.
- Per-key polling of possibly-absent memory keys logs a browser-console 404
  per key per poll regardless of `.catch()` — use by-prefix reads.
- `{var}` resolution applies inside `remember` values — avoid input names
  that could appear in stored prose.
- Never write `{{double}}` braces in workflow step config — the engine
  resolves single braces only; the doubled form passes through as literal
  text (03 §2). Standalone tool templates are the one place `{{param}}` is
  valid.

## 14. `max_cost_usd` defaults to $0.10 — unset means LLM workflows fail mid-run

The engine applies a **$0.10 default cost cap** per run when the definition
doesn't set `max_cost_usd`, and fails the instance the moment cumulative LLM
cost exceeds it (tree-wide for a parent). A workflow that worked in testing
with a cheap model dies in production with a bigger one. Set `max_cost_usd`
explicitly on every workflow that contains an LLM step. Companion:
`max_steps` defaults to 100 — raise it for large loops.

## 15. A bare `model` name without its registry pair fails at runtime

Setting `model: "gpt-4.1-nano"` on an LLM step without the matching
`provider_config_guid` + `model_id` from the tenant's registry falls back to
a default OpenAI path with no tenant credentials — the step fails with
"Missing credentials". Set all three together from a registered provider
entry, or set none and let the tenant default route the call.
