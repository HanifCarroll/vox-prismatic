Title: Fix Realtime Routing and Authorization (Reverb + Echo)

Current State
- Echo uses `authEndpoint: /broadcasting/auth` with `API_BASE` empty in browser, hitting the frontend origin.
- Vite proxy does not proxy `/broadcasting`, and Start server proxy does not intercept it, leading to 404 or auth issues.
- A custom `authorizer` duplicates `authEndpoint` behavior.

Desired State
- Realtime auth requests are consistently proxied to the API origin with credentials.
- Minimal configuration (no redundant custom authorizer) unless special headers are needed.

Motivation
- Ensure private channels authorize correctly with Sanctum cookies.
- Reduce complexity in Echo setup and remove redundant pathways.

High-Level Plan
1) Add `/broadcasting` to the Vite proxy (same target and cookie rewrite as `/api`).
2) Keep `authEndpoint` at `/broadcasting/auth` (or switch to `/api/broadcasting/auth` if preferred) and rely on the single proxy.
3) Remove custom `authorizer` unless custom headers are required; keep `withCredentials: true` in Echo options.
4) Smoke test subscription and events in the browser and verify cookies are included.

