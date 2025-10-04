# Replace Shared Types with OpenAPI + Orval

## Goal
- Remove the `@content/shared-types` package and use a single source of truth generated from the backend:
  - Backend: generate an OpenAPI spec from the Laravel API using Scramble (`dedoc/scramble`).
  - Frontend: consume that OpenAPI spec with Orval to generate TypeScript types and React Query hooks.

## Scope
- Applies to the entire API surface under `apps/api` (`routes/api.php`).
- Frontend (`apps/web`) stops importing `@content/shared-types` and instead relies on Orval-generated clients/types.
- Preserve existing response envelopes and error shape: `{ items?, user?, project?, post?, meta?, ... }` and `{ error, code, status, details? }`.
- Auth remains Sanctum session/cookie based with CSRF handshake (`GET /sanctum/csrf-cookie`).

## Acceptance Criteria
- Backend can produce a valid OpenAPI 3.x spec (JSON or YAML) that includes:
  - All public API routes, grouped by tags (Auth, Projects, Transcripts, Posts, Scheduling, Settings, LinkedIn, Billing, Admin).
  - Request bodies inferred from validation rules or annotated examples.
  - Response envelopes and common `ErrorResponse` schema.
  - Security scheme that reflects cookie-based session auth (Sanctum) and CSRF token.
- Frontend builds with Orval-generated clients and no longer depends on `@content/shared-types`.
- Generated React Query hooks include credentials for cookie-based auth and work with the app’s CSRF flow.

## High-Level Approach
1) Add Scramble to the Laravel API and generate an OpenAPI spec from routes/controllers.
2) Expose the spec at a stable URL and/or persist it to a file for CI and local development.
3) Add Orval to the frontend and configure it to pull from the spec and generate clients/hooks.
4) Migrate frontend modules to the generated clients incrementally, then remove `apps/shared-types`.

---

## Backend (Laravel) — Scramble

Install & Configure
- Composer (dev) dependency: `dedoc/scramble`.
- Publish and tune config: set API info (title/version), servers (local dev URL), and security schemes.
- Add an output location/route for the spec:
  - Option A: expose `GET /api/openapi.json` (preferred for Orval pointing to a URL).
  - Option B: export to a versioned file (e.g., `storage/api-docs/openapi.json`) for CI artifacts.

Modeling Requests & Responses
- Requests: Scramble can infer schemas from `$request->validate([...])`. Prefer explicit FormRequests for complex bodies.
- Responses: Controllers currently return normalized arrays; annotate representative examples where needed so Scramble captures shapes.
- Errors: Define a shared `ErrorResponse` and reference it for 4xx/5xx responses; ensure thrown `AppException` types map to the normalized error envelope.

Security
- Sanctum SPA (session cookie + CSRF): document as cookie/session security in OpenAPI. Ensure spec indicates that requests must include credentials and CSRF header.

Tagging & Grouping
- Use Scramble tags to group endpoints by domain: Auth, Projects, Transcripts, Posts, Scheduling, Settings, LinkedIn, Billing, Admin.

Non-HTTP Realtime
- SSE/broadcast events (e.g., `project.progress`, `post.regenerated`) are out of scope for OpenAPI. Document them separately if needed.

Deliverables (Backend)
- Scramble installed and configured under `apps/api`.
- OpenAPI spec available locally (URL and/or file).
- Minimal annotations/docblocks added where inference is insufficient.

---

## Frontend (Web) — Orval

Install & Configure
- Add Orval as a dev dependency.
- Create `orval.config.ts` in `apps/web`:
  - `input`: the OpenAPI spec URL (e.g., `http://localhost:3000/api/openapi.json`) or a file path.
  - `output`: single SDK file (e.g., `src/api/generated.ts`) with `client: 'react-query'`.
  - Provide a custom fetcher/axios mutator that:
    - Sends `credentials: 'include'` and sets `X-XSRF-TOKEN` (the app already has logic in `src/lib/client/base.ts`).
    - Calls `/sanctum/csrf-cookie` on demand before non-GET requests.

Incremental Migration
- Swap one API area at a time to generated hooks (e.g., Auth → Projects → Posts → Settings → Scheduling → LinkedIn → Billing → Admin).
- Replace imports of `@content/shared-types` types with Orval-generated types.
- Keep Zod usage where needed for client-side validation UX, but source types from Orval.

Remove Shared Types
- After all modules compile against Orval types, delete:
  - `apps/shared-types` workspace.
  - `@content/shared-types` dependency, aliases, and Dockerfile copy steps in `apps/web`.

Deliverables (Frontend)
- `orval.config.ts` with an auth-aware fetcher/mutator.
- Generated `src/api/generated.ts` (types + React Query hooks).
- Frontend modules updated to use generated hooks.
- No imports from `@content/shared-types` remain.

---

## Migration Plan (Phased)

Phase 0 — Inventory & Decision
- Verify routes and envelopes in `apps/api/routes/api.php` and controllers.
- Confirm Orval target structure and query key conventions.

Phase 1 — Backend Spec
- Add Scramble and generate a spec that includes: Auth, Projects, Transcripts, Posts, Scheduling, Settings, LinkedIn, Billing, Admin.
- Add `ErrorResponse` and cookie-based security to the spec.

Phase 2 — Frontend Bootstrap
- Add Orval and a custom fetcher or axios mutator that mirrors `src/lib/client/base.ts` (CSRF + credentials).
- Generate initial SDK file and validate type coverage.

Phase 3 — Feature-by-Feature Swap
- Convert Auth and Projects first to shake out patterns.
- Proceed through Posts, Settings, Scheduling, LinkedIn, Billing, Admin.
- Keep runtime Zod where UX needs it; remove shared types.

Phase 4 — Cleanup
- Remove `apps/shared-types` and workspace references.
- Update `apps/web` Dockerfiles and Vite alias to drop `@content/shared-types`.
- CI: add a Scramble generation check and Orval generation step to ensure CI stays green.

---

## Key Decisions & Notes
- Response envelopes remain stable and small per API guidelines; Orval types should reflect envelopes, not raw models only.
- IDs are strings (UUIDs) across the API; document as `type: string`, `format: uuid` where applicable.
- Arrays like Post `hashtags` are `string[]` in OpenAPI.
- Cookie-based auth requires `withCredentials` on all requests; the generated client must set it.
- Keep error shape consistent across controllers; use exceptions for non-200 flows to simplify spec.

## Risks
- Gaps between inferred schemas and actual shapes if controllers return dynamic arrays.
- CSRF/session handling must be replicated in the generated client or requests will fail.
- Partial migrations can lead to duplicated clients; keep phases small.

## Out of Scope (for this change)
- Rewriting business logic or changing endpoint URLs.
- Replacing SSE/broadcast with documented HTTP endpoints.
- Switching from Sanctum cookie sessions to token-based auth.

---

## Next Steps (Actionable)
1) Backend: `composer require dedoc/scramble --dev` and publish config; expose `GET /api/openapi.json`.
2) Add `ErrorResponse` to spec and tag routes.
3) Frontend: `pnpm add -D orval axios` and create `orval.config.ts` with a mutator that mirrors `src/lib/client/base.ts`.
4) Generate `src/api/generated.ts` and replace Auth + Projects calls.
5) Iterate through remaining modules; remove `apps/shared-types` and all references.

