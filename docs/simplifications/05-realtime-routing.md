Title: Realtime Routing and Authorization (Reverb + Echo)

Current State
- Vite proxies `/api`, `/sanctum`, and `/broadcasting` to the API, so Echo’s auth calls are same-origin with cookies.
- Echo uses `authEndpoint: /broadcasting/auth` with `withCredentials: true`; the custom `authorizer` has been removed.
- Echo is configured with `broadcaster: 'reverb'` and a Pusher‑compatible client (`pusher-js`) passed via options, which is the canonical setup because Reverb speaks the Pusher protocol.

Desired State
- Keep the minimal Echo config: `authEndpoint` + `withCredentials` (no custom authorizer).
- Continue using `laravel-echo` with `broadcaster: 'reverb'` and a Pusher‑compatible client (`pusher-js`) provided via options (not via `window.Pusher`).
- Use `wss` in production and restrict Reverb `allowed_origins`.

Motivation
- Ensure private channels authorize correctly with Sanctum cookies.
- Reduce complexity in Echo setup and remove redundant pathways.

Status / Verification
1) Vite proxy includes `/broadcasting`; Echo auth calls succeed with cookies.
2) Custom `authorizer` removed; Echo relies on default auth flow.
3) Echo uses Pusher client via options; no `window.Pusher` pollution.
4) Smoke test: subscribe to `private-project.{id}` and receive `project.progress/completed/failed` events.
