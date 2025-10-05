Title: Clarify TanStack Start SSR Scope in Dev

Current State
- Root route disables SSR globally, making the SSR server entry and cookie-forwarding utilities primarily unnecessary in dev.
- Start server also proxies API routes redundantly with Vite.

Desired State
- If SSR is disabled for now, remove SSR-related dev complexity (duplicate proxies, cookie-forwarding utilities) to simplify the stack.
- If SSR will be enabled soon, document the plan and boundaries to avoid overlap with Vite proxying.

Motivation
- Reduce moving parts that can introduce subtle bugs in dev.
- Keep server entry focused on SSR concerns only, not networking concerns already handled by Vite.

High-Level Plan
1) If staying client-only: remove API/Sanctum proxying in `src/server.ts`, and keep the server entry minimal or disabled.
2) If enabling SSR: keep server entry, but still centralize API proxying in Vite to leverage cookie rewriting; reserve server entry for SSR-only behavior.
3) Document current SSR posture and how it may change.

