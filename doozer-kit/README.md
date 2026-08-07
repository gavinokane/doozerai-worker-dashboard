# Doozer bolt-on kit

Drop-in documentation pack for building a **bolt-on application** against the
Doozer platform — a standalone app that talks to the platform exclusively
through the public HTTP API. Copy this folder into the root of every new
bolt-on project.

Everything here was distilled from building Bid Writer (the first bolt-on),
verified against the live dev platform between 2026-07 and 2026-08, then
audited against the platform source (2026-08-07). Where a shape says
**VERIFIED** it was exercised end-to-end or confirmed against the exact
serialization code; where it says **PROBE** the route is confirmed but field
names deserve one curl before you hard-code a parser.

**This copy (in the doozer-platform repo) is the MASTER.** Its `project/`
templates stay neutral `<PLACEHOLDERS>` forever. Consuming repos get a copy
and fill `project/` **in place** — see the flow below.

## Structure

```
doozer-kit/
  platform/     Platform knowledge. In a consuming repo: read-only —
                fix errors in the master (doozer-platform repo) and re-copy;
                platform/ can be re-copied wholesale at any time because
                consumers never edit it.
  project/      In the MASTER: neutral templates, never filled in.
                In a consuming repo: filled in place at kickoff and kept
                current for the life of the project — this folder is owned
                by the project and never overwritten by a kit refresh.
  BOOTSTRAP.md  The kickoff prompt: paste it into the first AI session in a
                new repo to interview you and build out project/.
  CLAUDE.md.template   Becomes the new project's CLAUDE.md.
```

## How to slot into a new project

1. Copy `doozer-kit/` from this repo into the new repo root.
2. Paste the prompt in [BOOTSTRAP.md](BOOTSTRAP.md) into your first AI
   session there — it reads the platform docs, interviews you about the
   domain, fills `project/` in place, and writes the project's `CLAUDE.md`
   from the template.
3. Refreshing later: re-copy `platform/` only. Never touch the consuming
   repo's `project/`.

## Read in this order

| File | What it gives you |
| --- | --- |
| [platform/01_PLATFORM_OVERVIEW.md](platform/01_PLATFORM_OVERVIEW.md) | Concepts (tenant, worker, memory, workflows, knowledge), auth, and the bolt-on architecture pattern |
| [platform/02_API_REFERENCE.md](platform/02_API_REFERENCE.md) | Every API surface a bolt-on uses: REST conventions, chat SSE, SignalR reconnect, memory, files, knowledge |
| [platform/03_WORKFLOWS.md](platform/03_WORKFLOWS.md) | The workflow engine: API, routing rules, step catalogue, authoring/deploy pattern, invariants |
| [platform/04_OPS_COOKBOOK.md](platform/04_OPS_COOKBOOK.md) | Operator actions: worker config, memory repair, diagnostics, direct DB access (Cosmos/SQL) for run investigation |
| [platform/05_GOTCHAS.md](platform/05_GOTCHAS.md) | **Read before writing code.** Every failure mode we hit, its signature, and the rule that prevents it |
| [project/](project/) | The five templates: environment, agent contract, worker setup, workflow registry, deployment |

## The one-paragraph architecture

A bolt-on is a stateless, white-label container (one instance per customer,
configured entirely by runtime env vars) that renders the *state* of a process
a Doozer worker drives. Durable state lives in the platform: worker memory
holds the machine-readable state contract, conversations hold free-text
dialogue, workflows execute every button-driven action, assets/folders hold
files, knowledge bases hold reference libraries. The app reads state and
executes workflows; the free-text chat box is the only conversational surface.
No database, no server session store, no customer-specific code.
