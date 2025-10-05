Title: Unify Dev API Proxying

Current State
- Two proxy layers exist in development:
  - Vite dev server proxies `/api` and `/sanctum` to `api:3000` with `cookieDomainRewrite` enabled.
  - TanStack Start server entry (`src/server.ts`) also intercepts `/api` and `/sanctum` and forwards them without cookie rewriting.
- Realtime auth path `/broadcasting/auth` is not proxied by Vite and is not handled by the Start server proxy, leading to potential 404s and cookie/origin mismatches.

Desired State
- Use exactly one proxy for all backend calls during development.
- Ensure `/api`, `/sanctum`, and `/broadcasting` consistently go to the API service with correct cookie handling.
- Eliminate duplicate proxy logic and the risk of divergent behavior.

Motivation
- Reduce ambiguity about which proxy handles a request.
- Fix inconsistent cookie handling (Set-Cookie domain attributes) and CSRF/session reliability in dev.
- Shrink surface area for infra-related bugs and simplify mental model.

High-Level Plan
1) Keep Vite as the single dev proxy:
   - Add a `/broadcasting` proxy entry mirroring `/api` and `/sanctum` (with `cookieDomainRewrite`).
2) Remove Start server proxying of `/api` and `/sanctum` from `apps/web/src/server.ts`.
3) Verify cookies (XSRF-TOKEN, session) flow via the browser devtools and confirm authenticated endpoints work.
4) Document the single-proxy approach in README to prevent regressions.

Implementation
- Edit `apps/web/vite.config.ts` and add `server.proxy['/broadcasting']` pointing to `http://api:3000` with `cookieDomainRewrite: { '*': '' }`.
- Edit `apps/web/src/server.ts` and remove the conditional that intercepted `/api` and `/sanctum`; keep only the health check and the default SSR handler.

Quick Verification
- Start dev stack: `docker compose -f docker-compose.dev.yml up -d`.
- From the host, confirm Vite proxying works end-to-end:
  - `curl -i http://localhost:5173/sanctum/csrf-cookie` → 204 + `Set-Cookie: XSRF-TOKEN` and `content_session`.
  - `curl -i http://localhost:5173/api/auth/me` → 401 JSON (unauthorized when not logged in).
  - `curl -i -X POST http://localhost:5173/broadcasting/auth` → non-200 expected without session/CSRF, but proves the `/broadcasting` proxy path.
- Check API logs for routed paths: `docker compose -f docker-compose.dev.yml logs --tail=200 api`.
