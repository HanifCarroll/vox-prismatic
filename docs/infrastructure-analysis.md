Infrastructure Review and Simplification Opportunities

Scope
- Stack analyzed end-to-end: Docker (dev/prod), Laravel API (Sanctum, CORS/CSRF, queues, Reverb), TanStack Start + Vite, Orval codegen, and realtime (Echo/Reverb).
- Goal: Identify nonstandard/overengineered patterns and simplifications to reduce infra fragility. No changes applied yet.

Overview of the Current Setup
- Containers (dev): `db`, `api`, `queue-worker`, `reverb`, `web` driven by `docker-compose.dev.yml`.
- API: Laravel 12, Sanctum session auth, Reverb for websockets, Dedoc/Scramble for OpenAPI, custom exception/logging middlewares.
- Web: TanStack Start (React) + Vite dev server and SSR server entry present, Orval client generation with Axios + React Query, custom CSRF/credentials handling.
- Codegen: Orval reads the spec from a local file; generated clients live under `apps/web/src/api/*` and rely on a custom Axios instance.

Key Findings: Nonstandard / Overengineered Areas

Docker & Dev Workflow
- Composer installs on container start across three services (api, reverb, queue-worker). This duplicates work and slows startup. See `docker-compose.dev.yml:api/queue-worker/reverb`.
- API runs `php artisan serve` under `php:8.3-cli` for dev and prod-like images in different ways. Dev/prod paths are divergent, which increases drift.
- `queue-worker` split as a dedicated container is fine, but given the scale, you could run it inside the API container during development to reduce complexity.
- Dev web uses bind-mounted repo plus separate volumes for node_modules hydration (`apps/web/Dockerfile.dev`, `apps/web/docker/dev-entrypoint.sh`). Useful optimization but adds moving parts.

Sanctum, CORS, CSRF
- Two proxy layers for API calls in dev: Vite proxy (`apps/web/vite.config.ts:server.proxy`) and a custom Start server proxy (`apps/web/src/server.ts:1`). Maintaining both adds ambiguity (which one handles a given request) and risks cookie handling divergence. Prefer a single proxy.
- Custom CSRF logic is implemented twice: in Axios (`apps/web/src/lib/client/orval-fetcher.ts:1`) and in a separate `fetchJson` helper (`apps/web/src/lib/client/base.ts:1`). This duplication increases surface for subtle differences.
- `sanctum.php` overrides `validate_csrf_token` middleware to a local class (`App\Http\Middleware\ValidateCsrfToken`), but the class is just the default with an empty `$except` list (`apps/api/app/Http/Middleware/ValidateCsrfToken.php:1`). Sanctum 4 docs recommend the core middleware class; the override appears unnecessary.
- OpenAPI security scheme names the session cookie `laravel_session` (`apps/api/app/Providers/AppServiceProvider.php:1`) while `SESSION_COOKIE` is configured as `content_session` (`apps/api/.env:1`, `apps/api/config/session.php:1`). This mismatch can confuse consumers/docs.

Auth & Session State in the Web App
- The app treats auth state primarily via `localStorage` rather than the server session: `AuthProvider` writes/reads `auth:user` and considers that authoritative (`apps/web/src/auth/AuthContext.tsx:1`). `getSession` similarly reads only from `localStorage` (`apps/web/src/lib/session.ts:1`). This is nonstandard for Sanctum session auth and risks drift (e.g., server session expired but UI still “logged-in”). The conventional pattern is to call `/api/auth/me` on load (cookie-based) and treat it as the source of truth.
- Root route explicitly disables SSR (`apps/web/src/routes/__root.tsx:1` via `ssr: false`). With SSR disabled app-wide, several SSR-oriented utilities (server context, cookie forwarding, Start server proxy) are likely unnecessary in dev.

Vite Dev Proxy vs. Start Server Proxy
- Vite proxy: Proxies `/api`, `/sanctum`, and `/broadcasting` to the API, with `cookieDomainRewrite` to strip cookie Domain attributes (good for dev). See `apps/web/vite.config.ts:20`.
- Start server proxy: `apps/web/src/server.ts:1` provides SSR handling; API proxying can be handled solely by Vite during dev to reduce duplication.

Realtime (Reverb + Echo)
- Echo now relies on `authEndpoint` + `withCredentials` (no custom `authorizer`). See `apps/web/src/lib/realtime/echo.ts:70`.
- Echo is configured with `broadcaster: 'reverb'` and a Pusher‑compatible client (`pusher-js`) passed via options. This is the canonical JS setup because Reverb speaks the Pusher protocol.
- API broadcasting routes require `web` + `auth:sanctum` (`apps/api/bootstrap/app.php:16`). With the Vite proxy, Echo’s auth requests send session cookies correctly.

Production notes
- Use `wss` and set `VITE_REVERB_SCHEME=https` (and port 443) in production.
- Restrict Reverb `allowed_origins` in `apps/api/config/reverb.php` and consider rate-limiting the broadcast auth endpoint.

OpenAPI/Orval
- Orval reads from a file path (`../api/storage/app/openapi.json`) in `apps/web/orval.config.ts:1`. There is no dev task ensuring this file is (re)generated before Orval runs. This risks stale specs. Scramble already exposes `openapi.json` in local (`apps/api/routes/api.php:1`). Using that URL would reduce drift, or add a step to write the file first (e.g., `php artisan scramble:openapi`).
- Two different client layers exist: Orval (Axios + React Query) and a separate `fetchJson` helper. Prefer one consistent abstraction to avoid divergence in headers/CSRF/error shapes.

Exceptions, Logging, and Headers
- Centralized JSON error rendering and custom error types are reasonable, but `LogAuthRequests` logs both request start/end and exceptions, plus sets `X-Request-Id` headers (`apps/api/app/Http/Middleware/LogAuthRequests.php:1`). Useful, but heavy for dev and can be simplified or guarded by env variables (partially already). Consider whether both middleware and exception report hooks are needed.
- `SecureHeaders` sets legacy or low-impact headers (e.g., `X-XSS-Protection: 0`, `Permissions-Policy: interest-cohort=()`) (`apps/api/app/Http/Middleware/SecureHeaders.php:1`). These are harmless but could be replaced by a smaller, modern set or managed at the reverse proxy.

Security & Secrets
- The repository contains development `.env` with live-looking API keys and OAuth secrets (`apps/api/.env:1`). This is risky even for dev examples. Prefer `.env.example` and local-only `.env` not committed.
- CORS config is fine and driven by env, but ensure the prod origin set (`CORS_ORIGIN`) matches actual deployment for Sanctum to work.

Minor Consistency Issues
- Password policy in `AuthController` uses minimum length 8; product notes suggest stronger policy (12+). See `apps/api/app/Http/Controllers/AuthController.php:1`.
- Rate limiters are defined in `AppServiceProvider` (good) but make sure the route middleware references match the names used.

What To Simplify (Proposals, not implemented)

Unify API Proxying in Dev
- Pick one proxy path:
  - Option A (simplest): Keep Vite proxy for `/api`, `/sanctum`, and add `/broadcasting` (and, if needed, websocket proxy), then remove the API/Sanctum proxying in `apps/web/src/server.ts`.
  - Option B: Remove Vite proxy and let `server.ts` proxy all API routes, but add cookie domain rewriting logic (harder). Option A is preferred.

Single HTTP Client Abstraction
- Choose between Orval (Axios) or `fetchJson`. If Orval is the main client, remove/replace `fetchJson` usages and keep CSRF/error normalization solely in the Axios instance.

Sanctum Source of Truth
- Treat `/api/auth/me` as the auth source of truth. Initialize auth state by calling it on app boot and store only minimal UI caches locally. Avoid `localStorage` as the primary auth authority to prevent drift.

OpenAPI/Orval Flow
- Ensure Orval reads an always-fresh spec:
  - Easiest: point Orval to `http://localhost:3001/openapi.json` via env in dev (or via the Vite proxy using `/openapi.json`).
  - Or, add a step to generate `storage/app/openapi.json` (`php artisan scramble:openapi`) before running Orval.

Realtime Routing
- Ensure the Echo auth endpoint is proxied to the API. Either:
  - Set `authEndpoint` to `/api/broadcasting/auth`, or
  - Add `/broadcasting` to the Vite proxy config and (if using the Start server proxy) mirror it there too.
- If the custom `authorizer` isn’t providing unique value, remove it and rely on Echo’s default auth with `withCredentials: true`.

Laravel Middleware & Headers
- Use Sanctum’s default `ValidateCsrfToken` middleware class in `config/sanctum.php` unless there’s a concrete need for a custom subclass.
- Align the OpenAPI cookie security scheme name with the actual `SESSION_COOKIE`.
- Consider trimming `SecureHeaders` to modern essentials or move them to the reverse proxy in production.

Docker & Dev Quality of Life
- Cache Composer deps in image layers and avoid `composer install` at container startup for every service; run it during image build instead.
- For dev, consider collapsing `queue-worker` into the API container to reduce moving parts, unless you specifically need separate lifecycle.
- Avoid committing `.env` with secrets; keep `.env.example` up to date.

TanStack Start & SSR
- If SSR is disabled globally (`ssr: false`), remove SSR proxy complexities and server-only cookie forwarding (`server-context.ts`) to reduce surface area. If you want SSR later, keep these, but ensure a clear path and no duplication with Vite proxying.

Potential Sources of Bugs Observed
- Realtime auth failures due to `/broadcasting/auth` not being proxied (web dev origin vs API origin mismatch). See `apps/web/src/lib/realtime/echo.ts:1` and `apps/web/vite.config.ts:1`.
- Cookies not sticking if API calls are proxied by `server.ts` instead of Vite (no `cookieDomainRewrite`). See `apps/web/src/server.ts:1`.
- Auth drift when server session expires but `localStorage` still shows a user. See `apps/web/src/auth/AuthContext.tsx:1`, `apps/web/src/lib/session.ts:1`.
- Stale or missing OpenAPI file for Orval if `storage/app/openapi.json` isn’t generated. See `apps/web/orval.config.ts:1`.

References & Notes
- Sanctum SPA session cookies and CSRF: ensure `GET /sanctum/csrf-cookie` before non-GET, send `X-XSRF-TOKEN`, and use stateful domains.
- Vite proxy is capable of rewriting cookie domains (`cookieDomainRewrite`) and proxying websockets. Favor it for dev API proxying.
- Orval supports custom Axios mutators; keep all auth/CSRF behavior localized there to prevent divergence.

Next Steps (If you want me to proceed)
- Implement Option A for proxy unification and fix Echo auth path.
- Consolidate on one HTTP client path (likely Orval + Axios) and remove duplicate CSRF logic.
- Switch Sanctum middleware to the framework default and align OpenAPI cookie name.
- Update Orval input to use a live spec (or add a generation step) and confirm the codegen pipeline.
- Remove committed secrets from the repo and update `.env.example`.
