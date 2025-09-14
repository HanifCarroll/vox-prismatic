Project Agent Guide

Scope
- This guide applies to the entire repository. Use these conventions when creating or modifying any backend or shared code. Frontend projects should align with response shapes and schemas defined here.

Product Context (from docs/prd.md)
- Goal: Turn a single source of truth (transcript, URL, or text) into multiple LinkedIn-ready posts via a guided lifecycle.
- MVP Focus: LinkedIn only. No background jobs; use synchronous processing with SSE.
- Core entities: User, ContentProject, Insight, Post. Basic approvals on insights/posts and simple publishing flow.
- Key stages: Processing → Review → Posts → Ready (MVP). Scheduling/publishing are deferred for post-MVP.
- UX principles: Project-centric navigation, clear empty states, bulk actions, and consistent terminology.

Backend Conventions (API)
- Framework: Hono (TypeScript, ESM). One module folder per domain feature.
- Module structure:
  - module.routes.ts: Route definitions, request validation.
  - module.middleware.ts: Domain-specific middleware.
  - module.service.ts or module.ts: Business logic and database access.
  - index.ts: Public exports for the module.
  - __tests__/: Integration and utility tests.
- Validation:
  - Use Zod schemas with `validateRequest(target, schema)` middleware.
  - Normalize identity fields at boundaries (e.g., `email.trim().toLowerCase()`).
- Errors:
  - Throw only `AppException` subclasses (e.g., ValidationException, UnauthorizedException).
  - Error response shape is consistent: `{ error, code, status, details? }`.
  - Map low-level errors (e.g., DB unique violations) to appropriate exceptions (e.g., Conflict).
- Auth:
  - Use bcrypt for password hashing. Enforce password strength with utility.
  - JWT: HS256, expiration from `JWT_EXPIRES_IN`.
  - Token verification failures use a consistent code (`INVALID_TOKEN`).
  - `extractBearerToken` is case-insensitive and trims whitespace; returns `null` if missing/empty.
  - For MVP, trust JWT payload in middleware; for stricter flows, fetch from DB.
- Security:
  - Security headers via `secureHeaders` middleware.
  - CORS defaults to Vite (`http://localhost:5173`). Allow overriding with `CORS_ORIGIN`.
  - Rate limiting: Use preconfigured limiters for sensitive routes. Allow disabling in dev via `DISABLE_RATE_LIMIT=true`.
- Logging & Errors:
  - Pino logger with file + console streams. Keep request/response logs at info level.
  - Central `errorHandler` attaches safe details only in development.
- Database:
  - Drizzle ORM + Postgres. Keep constraints in schema (e.g., unique email). Consider citext or unique index on lower(email) for case-insensitive emails.

Shared Types (packages)
- Package: `@content/shared-types` under `apps/shared-types` for FE/BE contract.
  - Export Zod schemas and inferred types for common payloads (users, auth requests/responses, error shape).
  - Frontends should import schemas for runtime validation and type inference.

API Design Guidelines
- Responses:
  - Keep small, stable envelopes (e.g., `{ user, token }` for auth, `{ items, meta }` for lists).
  - Never leak sensitive fields (e.g., passwordHash).
- Pagination:
  - Use `page`, `pageSize`; respond with `meta: { page, pageSize, total }`.
- Rate limiting headers:
  - Send `X-RateLimit-*` and `Retry-After` when applicable.

Testing
- Integration tests using Hono’s `app.request`.
- Unit tests for utils (e.g., password validation, token extraction).
- Mock DB and rate limiter in tests to keep them fast and deterministic.

FE Integration (Vite React)
- Default CORS origin is `http://localhost:5173` with `credentials: true` and `Authorization` header allowed.
- Error handling in FE should rely on `{ error, code, status, details? }` shape.
- Consume shared Zod schemas from `@content/shared-types` for request/response validation and typing.

Notes for Contributors
- Keep changes focused and minimal; prefer small, reviewable PRs.
- Follow TS strict mode. Avoid any unless necessary; type narrow aggressively at boundaries.
- Don’t commit secrets. Use `.env` for local dev; mirror additions in `.env.example`.

