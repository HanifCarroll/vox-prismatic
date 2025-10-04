Project Processing: Migration from SSE Controller to Queued Jobs (with Live UI Updates)

> Update: The SSE controller that streamed project progress has been fully retired. Project processing now runs inside queued jobs and broadcasts progress over Laravel Reverb WebSockets (`project.progress`, `project.completed`, `project.failed`).

Overview
- Goal: keep project processing resilient (queued jobs), preserve near-real-time UI feedback, and surface completion notifications as soon as drafts are ready.
- Scope: Laravel API (`apps/api`) and Vite React app (`apps/web`). Shared types continue to flow through `@content/shared-types`.
- Outcome: clients trigger processing, jobs write progress to the database, Laravel broadcasts milestone events via Reverb, and the frontend listens on private channels to keep the UI in sync.

Final Architecture
- **Queued processing**
  - `apps/api/app/Jobs/ProcessProjectJob.php` encapsulates the end-to-end flow (normalize transcript → generate insights → draft posts).
  - Progress persists on `content_projects` (`current_stage`, `processing_progress`, `processing_step`) so reconnects pull the latest state.
  - POST `/api/projects/{id}/process` (see `apps/api/app/Http/Controllers/ProjectsController.php`) guards against duplicate requests, resets progress, and dispatches the job. It returns `202` with the current project snapshot or `409` if a run is already in flight.
  - Failures flip `processing_step` to `error`, broadcast `project.failed`, and keep retry/backoff logic centralized in the job.

- **Realtime delivery (Laravel Reverb)**
  - Broadcasting defaults to the Reverb driver (`apps/api/config/broadcasting.php`) with server settings in `apps/api/config/reverb.php`.
  - Events: `ProjectProcessingProgress`, `ProjectProcessingCompleted`, `ProjectProcessingFailed` (`apps/api/app/Events`) implement `ShouldBroadcastNow` and emit to the private channel `project.{projectId}`.
  - Auth: `Broadcast::routes()` runs with Sanctum session + CSRF middleware (`apps/api/bootstrap/app.php`), relying on `/broadcasting/auth` to authorize private channels.
  - Environment: `.env` uses `BROADCAST_CONNECTION=reverb` alongside `REVERB_*` keys. Docker (`docker-compose.dev.yml`) boots a `reverb` service via `php artisan reverb:start` and shares the same app code volume.
  - Local CLI: run `php artisan reverb:start --host=127.0.0.1 --port=8080` alongside `queue:work` when developing outside Docker.

- **Frontend consumption**
  - `apps/web/src/lib/realtime/echo.ts` configures `laravel-echo` with the Reverb connector using `VITE_REVERB_*` variables, explicit credentials, and a fetch-based private-channel authorizer.
  - `apps/web/src/hooks/realtime/useProjectProcessingRealtime.ts` subscribes to `project.{projectId}` via a private channel and handles `.project.progress`, `.project.completed`, `.project.failed` payloads.
  - `apps/web/src/routes/projects.$projectId.tsx` drives the experience: it seeds state from the loader, kicks off `startProcessing`, reacts to realtime updates, and shows a toast when processing completes.
  - `apps/web/src/lib/client/projects.ts` exposes `startProcessing` and `getStatus` helpers so reconnects or toasts can query canonical state when needed.

- **Fallbacks & resilience**
  - The database remains the source of truth; on page load we still call `GET /api/projects/{id}/status` to hydrate UI in case a WebSocket reconnects mid-run.
  - If WebSockets fail, the UI will continue showing the last known progress and users can refresh to pull the persisted state. (We no longer maintain the SSE endpoint because Reverb satisfies real-time needs.)
  - Notification hooks (`PostRegenerated`, `ProjectProcessing*`) remain broadcast-capable, so additional listeners (e.g., owner toasts) plug into the same channels without new plumbing.

Configuration + Ops
- API defaults live in `apps/api/.env.example` (`REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`, `REVERB_HOST`, `REVERB_PORT`, etc.). Keep secrets in `.env` and mirror changes in `.env.example`.
- Docker dev stack:
  - `reverb` service runs `php artisan reverb:start --host=0.0.0.0 --port=8080` and exposes `${REVERB_PORT_HOST:-8080}`.
  - `api` and `queue-worker` depend on that service and point `REVERB_HOST=reverb`.
  - The web container exports `VITE_REVERB_APP_KEY`, `VITE_REVERB_HOST`, `VITE_REVERB_PORT`, `VITE_REVERB_SCHEME` for the React app.
- Production: scale Reverb separately if needed. Enable scaling in `config/reverb.php` (Redis fan-out) and point all workers at the same Redis channel when running multiple nodes.
- Monitoring: Horizon still tracks queue health. Reverb emits logs to stdout; aggregate them with app logs (e.g., via ECS task definition) for visibility into connection counts and errors.

Single Release Checklist
- [x] Job-based processing and progress persistence.
- [x] Controller dispatches jobs (`202`/`409` contract kept) without streaming the response body.
- [x] Frontend triggers processing, hydrates status on load, and reacts to realtime updates.
- [x] Laravel Reverb broadcasting (+ Echo client) powers live progress, completion, and failure toasts.
- [ ] QA: verify long transcripts, disconnect/reconnect scenarios, duplicate clicks, and refresh mid-process with WebSockets enabled.

Key Code References
- Jobs & progress updates: `apps/api/app/Jobs/ProcessProjectJob.php`.
- Broadcast events: `apps/api/app/Events/ProjectProcessingProgress.php`, `apps/api/app/Events/ProjectProcessingCompleted.php`, `apps/api/app/Events/ProjectProcessingFailed.php`.
- Reverb + broadcasting config: `apps/api/config/broadcasting.php`, `apps/api/config/reverb.php`, `apps/api/.env.example`.
- Broadcast channel authorization: `apps/api/routes/channels.php`.
- Frontend realtime wiring: `apps/web/src/lib/realtime/echo.ts`, `apps/web/src/hooks/realtime/useProjectProcessingRealtime.ts`, `apps/web/src/routes/projects.$projectId.tsx`.
- HTTP clients/helpers: `apps/web/src/lib/client/projects.ts`.

Historical Context (for posterity)
- The previous implementation streamed progress over SSE directly from the controller, which tied up PHP workers and required polling fallbacks. The migration to jobs + Reverb keeps that history available if we ever need to audit why the shift happened, but the SSE endpoints have been decommissioned.
