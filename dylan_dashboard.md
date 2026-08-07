# Doozerai Worker Dashboard

## Project Overview
React + TypeScript + Vite dashboard for Doozer AI worker management.

## Build & Dev
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint

## API Reference

> **Superseded 2026-08-07.** The app now targets the current Doozer
> platform — see [CLAUDE.md](CLAUDE.md) and [doozer-kit/](doozer-kit/)
> (API reference, identifiers, deployment). Everything below describes the
> retired v2 platform and is kept for history only.

The legacy v2 API spec (OpenAPI 3.0) is located at:
```
D:\repo\doozer-portal-2\doozer-portal\portal_manager\static\portal_manager\swagger_spec.yaml
```
Legacy base URL: `https://api.doozerai.com/v3`

Available API suites for building features:
- **AI & Conversation** — Direct AI query endpoints
- **Workflow** — Workflow definitions, execution, and management
- **Queue** — Async workflow queueing
- **Worker** — AI worker (Doozer) management
- **Tool** — Tool/ability management
- **Integration** — External service integrations (v2)
- **Auth** — OAuth flows and credential management
- **KnowledgeBase** — RAG knowledge base management
- **Extract** — Document text extraction (OCR/PDF)
- **Folder** — Hierarchical folder management
- **Organization** — Organization and tenant management
- **Customer** — Legacy customer management

When building new features that need API calls, consult the swagger spec for endpoint details, request/response schemas, and authentication requirements (requires `Ocp-Apim-Subscription-Key` and `API_KEY` headers).
