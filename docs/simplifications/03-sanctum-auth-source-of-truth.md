Title: Make Server Session the Auth Source of Truth

Current State
- The app treats `localStorage` (`auth:user`) as the authoritative auth state.
- Session validity on the server is not consistently reconciled on boot; UI can appear logged-in after the server session has expired.

Desired State
- `/api/auth/me` (Sanctum session) is the single source of truth for authentication.
- Client caches only reflect server state and are refreshed at app boot.

Motivation
- Prevent auth drift between client storage and server session.
- Align with Sanctum’s SPA session model for reliability and security.

High-Level Plan
1) On app boot, call `/api/auth/me` (via Orval) to initialize user state; avoid trusting `localStorage` blindly.
2) Keep `localStorage` as an optional UI cache only; always reconcile with `/api/auth/me` on first load.
3) Invalidate cached user state on logout and on 401/419 responses.
4) Update auth guard utilities to redirect on 401/419 instead of trusting local cache.

