OpenAPI Codegen Migration: Remove shared-types and Generate FE Types/Client via Scramble

Overview
- Goal: Remove the `@content/shared-types` package and adopt an automated FE contract generated from the Laravel API using OpenAPI (Scramble). Frontend consumes generated Zod schemas and a typed API client, staying aligned with our normalized envelopes and Sanctum auth.
- Scope: Laravel API (`apps/api`) and Vite React app (`apps/web`). No functional API changes beyond exposing the OpenAPI spec.

Outcomes
- Single source of truth for API contracts: OpenAPI spec generated from Laravel.
- Frontend codegen creates TypeScript types + Zod schemas (and a small client or React Query hooks).
- Remove `apps/shared-types` and all import paths to it.
- Preserve runtime validation on the FE for critical responses (using generated Zod schemas).

Approach
1) Backend emits OpenAPI using Scramble (dedoc/scramble). Inference comes from controller validation rules and response shapes. Serve `openapi.json` in local/dev.
2) Frontend uses the OpenAPI spec to generate:
   - Primary: Zod schemas + a lightweight client via `openapi-zod-client` into `apps/web/src/api/generated`.
   - Optional alternative: Orval to generate React Query hooks if preferred.
3) Replace `@content/shared-types` imports with generated exports or a thin compatibility layer during the cutover.

Non‑Goals / Out of Scope
- Changing endpoint semantics or response envelopes.
- Generating SSE client logic. SSE events remain hand-typed (progress/ping/complete/error).
- Introducing WebSockets/Broadcasting as part of this change.

High‑Level Plan
Phase 1 — Backend Spec (Scramble)
- Add Scramble (dev) to Laravel and publish config.
- Generate spec locally and commit it (or generate on demand; see Build/CI notes).
- Expose `GET /openapi.json` in local/dev only (guard by `app()->isLocal()`).
- Ensure error/pagination schemas are documented in the spec (see Modeling Notes).

Phase 2 — FE Codegen Scaffolding
- Add `openapi-zod-client` to the web app.
- Generate to `apps/web/src/api/generated` from `http://localhost:3001/openapi.json`.
- Introduce a custom fetcher with `credentials: 'include'` and CSRF bootstrap (Sanctum) or configure generator’s base to include cookies.
- Add root scripts: `gen:openapi` (artisan scramble) and `gen:types` (FE codegen). Document local dev flow.

Phase 3 — Replace Imports / Integration
- Create a thin compatibility module (temporary) that re-exports generated types using old names for minimal churn, or bulk‑replace imports from `@content/shared-types` to generated exports.
- Swap FE client calls to use the generated client (or generated hooks if using Orval). Keep SSE logic hand‑written.
- Validate critical flows (auth, projects, posts, scheduling) compile and function in dev.

Phase 4 — Cleanup
- Remove `apps/shared-types` and all references:
  - Root `pnpm-workspace.yaml` and any package.json workspace entries
  - `apps/web/vite.config.ts` alias for `@content/shared-types`
  - `apps/web/tsconfig.json` path mapping
  - Dockerfiles that build/copy `apps/shared-types`
- Commit OpenAPI/FE generated artifacts (or ensure deterministic generation in CI).

Acceptance Criteria
- `apps/web` compiles with no imports from `@content/shared-types`.
- `apps/web` uses generated Zod schemas/types for requests/responses.
- Auth requests include cookies and CSRF is respected (Sanctum SPA flow unchanged).
- OpenAPI served in local/dev at `/openapi.json`; `pnpm gen:openapi && pnpm gen:types` succeeds.
- SSE endpoints continue to function using manual TypeScript types.

Modeling Notes (to improve spec quality)
- Error envelope: define `components.schemas.ErrorResponse = { error, code, status, details? }` and reference it in error responses.
- Pagination: define `components.schemas.PaginationMeta = { page, pageSize, total }` and reuse in list envelopes `{ items, meta }`.
- Auth: document cookie‑based session and CSRF. Optionally define a `cookieAuth` security scheme. Codegen client must set `credentials: 'include'`.
- Rate limiting: document `X-RateLimit-*` headers and `Retry-After` where applicable.
- SSE: document content type `text/event-stream`, but keep FE types/manual parsing for events.

Tooling Choices
- Spec generator: Scramble (dedoc/scramble). Alternatives (not chosen): L5‑Swagger, Laravel‑OpenAPI, Scribe.
- FE codegen: `openapi-zod-client` (primary) to align with our current Zod usage. Optional `orval` if we want generated React Query hooks.

Build/CI
- Add scripts in the root `package.json`:
  - `gen:openapi`: `php apps/api/artisan scramble:generate`
  - `gen:types`: `pnpm -C apps/web exec openapi-zod-client -i http://localhost:3001/openapi.json -o src/api/generated/client.ts --exportSchemas true`
- Local dev sequence: run API (exposes `/openapi.json`) → `pnpm gen:openapi` → `pnpm gen:types` → FE build/dev.
- Optionally commit generated FE artifacts to avoid requiring API to be up for FE CI.

De‑Risking & Mitigations
- Introduce a compatibility adapter during migration to avoid touching all imports at once.
- Start with non‑critical routes (e.g., health/auth) to validate fetcher + cookies.
- Keep `apps/shared-types` until new client/schemas are proven, then remove.

Removal Checklist (shared‑types)
- Remove directory: `apps/shared-types`
- Remove workspace references (root, `apps/web/package.json`)
- Remove Vite/TS path alias: `@content/shared-types`
- Update Dockerfiles removing shared‑types build steps
- Search & replace imports in `apps/web/src/**/*`

Next Steps (execution)
1) Add Scramble and expose `/openapi.json` in local/dev.
2) Add FE codegen + custom fetcher with `credentials: 'include'`.
3) Generate client/schemas and wire one feature (auth) end‑to‑end.
4) Migrate remaining features (projects → transcripts → posts → scheduling → admin).
5) Remove `apps/shared-types` and clean workspace config and Dockerfiles.

