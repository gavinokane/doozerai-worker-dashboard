# Bootstrap prompt — build out `project/` for a new bolt-on

Copy `doozer-kit/` into the new repo root first, then paste everything below
the line into the first AI session in that repo.

---

You are bootstrapping a new **Doozer bolt-on application** in this repo.

**Context:** A bolt-on is a standalone, white-label, per-customer container
that talks to the Doozer platform exclusively through the public HTTP API. A
Doozer worker (AI agent) drives a domain process; the app renders that
process's state and drives every action through platform workflows. This repo
contains `doozer-kit/` — a documentation pack copied from the master in the
doozer-platform repo. `doozer-kit/platform/` is finished platform knowledge
(treat as read-only; it can be refreshed wholesale from the master).
`doozer-kit/project/` contains five templates with `<PLACEHOLDERS>` that you
will now fill **in place** for this project.

**Do this, in order:**

1. Read `doozer-kit/README.md`, `doozer-kit/platform/01_PLATFORM_OVERVIEW.md`,
   and `doozer-kit/platform/05_GOTCHAS.md` in full. Skim the other three
   platform docs so you know what exists.

2. Interview me to get the project definition. Ask focused questions, one
   topic at a time, and propose defaults from the kit's proven patterns so I
   can just confirm. You need at minimum:
   - The domain and the app's one-paragraph purpose: what process does the
     worker drive, what does the app render?
   - The core entity (the "bid" equivalent): its noun, its stage model
     (enum + who/what advances each stage), and what a "done" entity means.
   - The worker: persona name/role the customer will see.
   - Inputs: what documents/files enter the process, and roughly how large
     (this drives the banked-text and triage design).
   - Whether there's a reference library (knowledge base), and its metadata
     categories.
   - The workflow set: map the domain's SOP stages onto the recommended
     baseline (Setup, State Write, the main dissection step, Analyze,
     per-item Draft, user-triggered Score/Review, advisory Ask) — rename per
     domain, add/drop with a reason. Pick the workflow name prefix
     (like "BW: ").
   - Platform identifiers: if you have SQL/API access (see
     `platform/04_OPS_COOKBOOK.md § Bootstrap GUID discovery`),
     **discover the org/tenant/worker/workflow/tool/KB GUIDs yourself**
     rather than asking, and record them in `ENVIRONMENT.md` /
     `WORKFLOWS.md` so no later thread has to look again. Ask only for
     what discovery can't settle (which of several tenants is ours, where
     the API key lives). If the resources don't exist yet, leave the
     placeholders and add a TODO — **never invent a GUID or endpoint
     value.**
   - Branding/env basics: app name, category list, any label overrides.

3. Fill the five `doozer-kit/project/` templates in place with what you
   learned: `ENVIRONMENT.md`, `AGENT_CONTRACT.md` (draft the actual memory
   key schemas for the entity — follow the ten pre-made contract rules in
   the template), `WORKFLOWS.md` (the registry with names, engine shapes,
   inputs/outputs, all statuses `planned`), `WORKER_SETUP.md`,
   `DEPLOYMENT.md`. Anything unknown stays a clearly marked
   `<PLACEHOLDER — TODO: …>`, never a guess.

4. Write the repo's `CLAUDE.md` from `doozer-kit/CLAUDE.md.template`, filled
   in. Keep the ground rules verbatim — especially the identifier-registry
   rule: `CLAUDE.md` is how every future session learns that the GUIDs and
   endpoints live in `doozer-kit/project/ENVIRONMENT.md` / `WORKFLOWS.md`
   rather than being re-discovered per thread.

5. Finish with a short summary: the decisions recorded, the open TODOs (with
   owners — me or the platform team), and the recommended first milestone
   (per the kit: config loader + healthz + Docker skeleton, then api-key
   auth, before any feature work).

**Rules:** don't scaffold application code in this pass unless I ask —
this pass is the documentation build-out. Don't edit anything under
`doozer-kit/platform/`. If something in the platform docs seems wrong or
missing, note it in your summary so it can be fixed in the master kit, not
patched locally.
