Queued Processing Implementation — Review Notes and Follow‑Ups

Summary
- The cutover to queued jobs is largely in place: `ProcessProjectJob` implements the full processing pipeline, the POST trigger now dispatches a job and returns 202/409, and the frontend attaches to the status SSE stream instead of reading a streaming body from the POST. Live progress UI still works via `process/stream`.
- A few critical items need attention to ensure the path works end‑to‑end and to avoid deadlocks/regressions.

Critical Issues
- AiService method scope bug
  - `googleClientOptions()` is outside the `AiService` class, but `generateJson()` calls `$this->googleClientOptions()`.
  - This will cause a fatal error when jobs run.
  - File: apps/api-laravel/app/Services/AiService.php:121

- Process trigger blocked by initial stage
  - `create()` sets `current_stage='processing'` (with `processing_step=null`).
  - `process()` now returns 409 if `current_stage==='processing'` and never dispatches.
  - Net effect: newly created projects can’t start processing; the FE will attach to status SSE and hang with no progress.
  - Files:
    - apps/api-laravel/app/Http/Controllers/ProjectsController.php:50
    - apps/api-laravel/app/Http/Controllers/ProjectsController.php:146

High‑Priority Fixes
- Fix AiService class scope
  - Move `googleClientOptions()` inside the `AiService` class (below `recordUsage()`), or change to a private static helper referenced safely.
  - Validate after change that `AiService::generateJson()` and `normalizeTranscript()` run without throwing on basic smoke tests.

- Allow first dispatch when stage is “processing” but not started
  - Option A (preferred): Change `create()` to start as a neutral state (e.g., `current_stage='processing'` only after POST /process), or set initial `current_stage='draft'` and transition to `processing` within `process()`.
  - Option B (minimal change): Keep `current_stage='processing'` on create, but modify `process()` to dispatch when `processing_step` is null or 'queued'; return 409 only if `processing_step` is one of the active/running steps (`started`, `normalize_transcript`, `generate_insights`, `insights_ready`, `posts_ready`).
  - Ensure idempotency by setting `processing_step='queued'` before dispatch and checking for an existing running state before re‑queueing.

- Status SSE stream duration
  - Current loop runs ~2 minutes (`for ($i=0; $i<120; $i++)`). Jobs can exceed 2 minutes (timeout set to 10 minutes).
  - Make the stream open‑ended (loop until stage != 'processing') or extend to cover job timeout + cushion. Keep heartbeat (`ping`).
  - File: apps/api-laravel/app/Http/Controllers/ProjectsController.php:234

Important Consistency / DX Tweaks
- POST /process response envelope
  - `jobId` is returned via `$job->job?->getJobId()` which is likely null for database queues. If unused, either omit or return `{ queued: true }` alongside the seeded project status for clarity.
  - File: apps/api-laravel/app/Http/Controllers/ProjectsController.php:190

- Queue naming & connection
  - Consider setting a named queue for processing: `ProcessProjectJob::__construct()` → `$this->onQueue('processing');`
  - Ensure `QUEUE_CONNECTION=database` (or `redis`) is set and a worker is running (`php artisan queue:work`). Dev script already includes `queue:listen`.

- Error shape & exceptions
  - 409 uses manual JSON; elsewhere we throw domain exceptions. Consider a `ConflictException` that maps to `{ error, code, status }` for consistency.

Frontend Notes
- Client trigger path updated correctly
  - `processStream()` now POSTs to trigger and immediately calls `streamStatus()`; no dependency on POST streaming. File: apps/web/src/lib/client/projects.ts:40

- Live UI behavior
  - Detail page only enters streaming mode when `stage==='processing'`. With the server fix above (dispatch even when stage was set during create), UI flow resumes. File: apps/web/src/routes/projects.$projectId.tsx:88
  - Added toast on completion looks good; ensures user feedback. File: apps/web/src/routes/projects.$projectId.tsx:152

Nice‑to‑Have Improvements (Post‑MVP)
- Broadcasting push updates
  - Keep SSE `process/stream` as the default; optionally add Reverb broadcasting and FE Echo subscription for richer realtime without polling.

- Observability & scale
  - Switch to Redis + Horizon for queue monitoring in non‑dev environments. Add alerts on failure rate/queue depth.

QA Checklist
- Create project → trigger processing → end‑to‑end completes; posts appear; UI auto‑switches to Posts; toast appears.
- Duplicate trigger: second POST returns 409 when job is running; allowed when nothing has started yet.
- Long job (>2 min): SSE stays connected or reconnects seamlessly until completion.
- Network hiccups: client reconnect logic continues to reflect server progress (seed via `/status`).
- Failure path: job throws → `processing_step='error'` visible in UI; no spinner deadlocks.

