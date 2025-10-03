Project Processing: Migration from SSE Controller to Queued Jobs (with Live UI Updates)

Overview
- Goal: Move project processing from a synchronous SSE controller to asynchronous queued jobs while preserving (and improving) live UI updates and notifying users when posts are ready for review.
- Scope: Laravel API (apps/api-laravel) and Vite React app (apps/web). Keep existing progress semantics and response shapes, avoid breaking the FE/BE contract. Phased rollout to minimize risk.

Current State (Context)
- Product: Turn a single source of truth (transcript/URL/text) into 5–10 LinkedIn-ready drafts with human approval at the post stage. MVP stages: Processing → Posts → Ready.
- Backend (Laravel 12):
  - Route triggers synchronous processing with a streamed SSE response: `apps/api-laravel/routes/api.php:26`.
  - Status SSE stream for passive updates: `apps/api-laravel/routes/api.php:27`.
  - Controller performs processing inline and emits SSE events: `apps/api-laravel/app/Http/Controllers/ProjectsController.php:150` (process) and `apps/api-laravel/app/Http/Controllers/ProjectsController.php:261` (processStream).
  - Progress persisted on the project: `current_stage`, `processing_progress`, `processing_step` (see `apps/api-laravel/database/migrations/2025_10_01_000200_create_content_projects_table.php`).
  - Posts and insights are created synchronously in the same request.
  - Queue infra exists but unused for this flow yet (default connection `database`; jobs table migrations present; see `apps/api-laravel/config/queue.php`).
- Frontend (Vite React):
  - Initiates processing via POST + reads the streaming body: `apps/web/src/lib/client/projects.ts:113`.
  - Falls back to read-only status stream (`/process/stream`) which polls DB and pushes SSE: `apps/web/src/lib/client/projects.ts:175`.
  - Project detail page displays live progress and stage, auto-switches to Posts when done: `apps/web/src/routes/projects.$projectId.tsx:200` (live updates section) and subsequent handlers routing to Posts on complete.

Why Move to Jobs
- Reliability: long-running work is resilient to client disconnects and PHP-FPM timeouts.
- Scalability: parallelize per-project work, throttle via queues, and monitor with Horizon.
- UX consistency: users can navigate away and still get completion notifications; reconnection is simpler.
- Observability: queue retries/failed jobs provide clearer failure modes.

Target Architecture
- Backend (Jobs + Progress persistence)
  - Replace inline processing with queued jobs:
    - Orchestrator: `ProcessProjectJob` (accepts `projectId`, validates ownership, sets stage to `processing`).
    - Steps: (a) normalize transcript, (b) generate insights, (c) generate posts. Use `Bus::chain` or a single job with internal steps. For parallel post generation, consider `Bus::batch` for per-insight jobs.
    - Persist progress the same way as today: update `content_projects.processing_progress` and `processing_step` at meaningful milestones (10/40/60/90/100%) to keep FE logic unchanged.
    - On success: set `current_stage = 'posts'`, `processing_step = 'complete'`, progress 100.
    - On failure: set `processing_step = 'error'` and log; retries governed by job middleware/backoff.
  - API behavior:
    - POST `/api/projects/{id}/process`: dispatch job(s) and return 202 with `{ jobId }` (or `{ batchId }`), or 409 if already processing.
    - GET `/api/projects/{id}/process/stream`: keep as-is. Continues to SSE-push progress snapshots by polling DB every second. No WebSocket dependency required for MVP.
    - GET `/api/projects/{id}/status`: unchanged. FE uses this to seed progress/state on reconnect.
  - Optional (Post‑MVP): Event broadcasting for push updates instead of polling SSE status stream:
    - Use Laravel Broadcasting with Reverb (self-hosted) or Pusher. Broadcast `ProjectProgressUpdated`, `ProjectCompleted`, `ProjectFailed` to private channel `private-projects.{projectId}`. Keep SSE as a fallback.
  - Notifications: When processing completes, create a notification for the owner (`database` + optional `broadcast` channel). FE listens and shows a toast. Email is optional.

- Frontend (Live UI, Completion Notifications)
  - Start processing: switch `projectsClient.processStream` to:
    1) Fire `POST /api/projects/{id}/process` (no streaming body expected).
    2) Immediately attach to `streamStatus(id, onEvent)` to receive `progress/insights_ready/posts_ready/complete/error` as today.
  - Display: keep the existing progress bar and status text. On `complete`, auto-switch to the Posts tab and surface a “Posts are ready” toast.
  - Reconnect/resume: keep current reconnect loop; on mount, call `getStatus` to seed progress/state, then resubscribe.
  - Optional (Post‑MVP): If broadcasting is enabled, subscribe with Echo to `private-projects.{projectId}` and handle push events. Fall back to SSE stream or periodic status polling if Echo is unavailable.

Single Cutover Plan (All at Once)
1) Backend: Job orchestration and controller changes
   - Implement `ProcessProjectJob` (orchestrator). Steps inside the job mirror the current controller logic:
     - `normalize_transcript` → update `processing_step`, `processing_progress=10`.
     - `generate_insights` → insert insights, `processing_progress=40`, then `insights_ready` at `60`.
     - `generate_posts` → insert post drafts, `processing_progress=90`, then `posts_ready`.
     - Complete → set `current_stage='posts'`, `processing_progress=100`, `processing_step='complete'`.
   - Add a small progress reporter helper to write these fields to `content_projects` (and optionally log milestones).
   - Update `POST /api/projects/{id}/process`:
     - Validate ownership; if `current_stage == 'processing'`, return 409.
     - Otherwise set `current_stage='processing'`, reset progress to 0/`started`, dispatch `ProcessProjectJob`, and return 202 with `{ jobId }` and the seeded project status.
   - Remove streaming from the POST endpoint (no streamed body). Keep response envelopes minimal and stable.

2) Backend: Keep status SSE stream for live updates
   - Keep `GET /api/projects/{id}/process/stream` as-is. It polls DB each second and emits SSE events when `processing_progress` or `processing_step` change. No dependency on WebSockets.
   - Keep `GET /api/projects/{id}/status` unchanged for seeding UI state on load/reconnect.

3) Frontend: Trigger job, then listen on status SSE
   - Change `projectsClient.processStream` to:
     - `POST /api/projects/{id}/process` to trigger processing (expect 202 or 409).
     - Immediately call `streamStatus(id, onEvent)` to receive `progress/insights_ready/posts_ready/complete/error` and update the UI.
   - On `complete`, show a toast “Posts are ready for review” and auto-switch to the Posts tab (behavior already present in `projects.$projectId.tsx`).
   - Keep reconnect semantics (seed from `getStatus`, reattach to `streamStatus`).

4) Ops and resilience (initial setup)
   - Run a worker: `php artisan queue:work` (dev) or `queue:listen` during development. For scale later, switch to Redis and Horizon.
   - Retries/backoff: configure job retry/backoff for AI calls. Map failures to `processing_step='error'` and log.
   - Duplicate requests: return 409 while `current_stage='processing'`.

Minimal Changes Needed (MVP)
- Backend
  - Add job(s) that encapsulate the logic currently in `ProjectsController::process` (`apps/api-laravel/app/Http/Controllers/ProjectsController.php:150`).
  - Change `POST /api/projects/{id}/process` to:
    - If `current_stage == 'processing'`: return 409 (unchanged semantics already handled in FE).
    - Else: set `current_stage = 'processing'`, reset progress, `dispatch(new ProcessProjectJob($id))`, return 202 `{ jobId }`.
  - Keep `processStream` unchanged so the FE keeps receiving progress via SSE that polls DB.

- Frontend
  - Update `projectsClient.processStream` (`apps/web/src/lib/client/projects.ts:113`) to:
    - `await fetch(POST /projects/{id}/process)` for a 202/409 decision.
    - Regardless of 202 or 409, call `streamStatus(id, onEvent)` to receive updates.
  - Keep the rest of `projects.$projectId` route logic as-is (it already reacts to `insights_ready`, `posts_ready`, `complete`).
  - Add a toast on `complete` (“Posts are ready for review”), maintain auto-switch to Posts tab.

API Shapes & Contracts
- No change to envelopes for lists or entities.
- `POST /api/projects/{id}/process` response:
  - 202 Accepted: `{ jobId }` (or `{ batchId }`) and `{ project: { currentStage: 'processing', processingStep, processingProgress } }` if helpful.
  - 409 Conflict: `{ error, code: 'ALREADY_PROCESSING', status: 409 }`.
- `GET /api/projects/{id}/process/stream` events remain: `started`, `progress`, `insights_ready`, `posts_ready`, `complete`, `timeout`, `error`, `ping`.
- `GET /api/projects/{id}/status` remains the seed for reconnection.

Broadcasting (Optional Next Step)
- Server: install broadcasting with Reverb and private channels; broadcast from job milestones.
  - Install: `php artisan install:broadcasting --reverb` then configure env (REVERB_*), start `php artisan reverb:start`.
  - Events: `ProjectProgressUpdated`, `ProjectCompleted`, `ProjectFailed` implementing `ShouldBroadcast` with `broadcastOn()` returning `new PrivateChannel('projects.'.$projectId)`.
- Client: add Echo, subscribe to `private-projects.{projectId}`, update the same progress UI. Fallback to existing SSE.

Operational Notes
- Queue drivers: Start with `database` (already configured), move to `redis` for scale; monitor with Horizon (`composer require laravel/horizon`, `php artisan horizon`).
- Concurrency: tune workers per environment. Consider parallelizing per-insight post generation with `Bus::batch`.
- Error mapping: Map provider/DB issues to consistent error codes (keep FE relying on `{ error, code, status, details? }`).
- Security: all endpoints remain under Sanctum; jobs validate ownership when loading the project.

Single Release Checklist
- [ ] Implement `ProcessProjectJob` and progress reporter.
- [ ] Update controller: dispatch job on POST; return 202/409 (no streaming body).
- [ ] Keep status SSE endpoint (`process/stream`) and `status` endpoint intact.
- [ ] FE: POST to trigger; always attach to `streamStatus` for live updates.
- [ ] On `complete`, show toast and switch to Posts tab.
- [ ] QA: long transcripts, disconnect/reconnect, duplicate clicks, refresh mid-process.
- [ ] Optional (later): broadcasting via Reverb/Echo as an enhancement; SSE stream remains as fallback.

Key Code References
- Routes (SSE endpoints): `apps/api-laravel/routes/api.php:26`, `apps/api-laravel/routes/api.php:27`.
- Controller (inline SSE processing): `apps/api-laravel/app/Http/Controllers/ProjectsController.php:150`.
- Controller (status SSE): `apps/api-laravel/app/Http/Controllers/ProjectsController.php:261`.
- Queue config: `apps/api-laravel/config/queue.php:1`.
- FE client (processing & status SSE): `apps/web/src/lib/client/projects.ts:113`, `apps/web/src/lib/client/projects.ts:175`.
- FE route (live progress UI): `apps/web/src/routes/projects.$projectId.tsx:200`.
