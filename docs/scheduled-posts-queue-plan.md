Scheduled Posts: Queue-Based Publishing Plan (with Worker Coverage and Realtime Notes)

Context
- We now have queue-backed project processing (jobs + DB-backed progress + SSE status stream). Posts already support scheduling metadata (columns: `scheduled_at`, `schedule_status`, `schedule_error`, `schedule_attempted_at`) and immediate publish via LinkedIn (`publishNow`).
- Goal: Use the same queue infra to automatically publish scheduled posts at their intended time, provide reliable status transitions, and surface timely UI feedback.

Objectives
- Publish scheduled posts at/after `scheduled_at` with retries and clear status tracking.
- Ensure idempotency so a post is published once even if multiple workers race.
- Keep UI updated with minimal complexity. Prefer existing SSE or lightweight polling; optionally evaluate Reverb (WebSockets) for push.
- Ensure Docker dev/prod stacks run a queue worker (and scheduler) by default.

Backend Design
1) Job: PublishPostJob
   - Input: `postId` (string), optional `userId` (to scope tokens).
   - Preconditions: row still eligible — same `scheduled_at` (or <= now), `schedule_status in ('scheduled','queued')`, status is `approved`.
   - Flow:
     - Acquire lock by atomically transitioning `schedule_status` to `queued` (or `publishing`) via an UPDATE … WHERE clause and checking affected rows (avoids double dispatch).
     - Fetch LinkedIn token/ID for the owning user; if missing, set `schedule_status='error'` with `schedule_error='LINKEDIN_NOT_CONNECTED'`.
     - Publish via LinkedIn UGC API; on success: set `status='published'`, `published_at=now()`, clear schedule fields; on failure: set `schedule_status='error'`, persist `schedule_error`, `schedule_attempted_at=now()`.
   - Reliability: `tries`, `backoff`, and `RateLimited` job middleware for provider throttling.
   - Queue: use a dedicated `publishing` queue (`$this->onQueue('publishing')`) to isolate from processing.

2) Dispatcher: Kernel scheduler (scan and dispatch)
   - Add a scheduled task to scan for due posts every minute and dispatch `PublishPostJob` for each due row while ensuring idempotency via an UPDATE state change.
   - Pseudocode (Postgres):
     - `UPDATE posts SET schedule_status='queued', schedule_attempted_at=now() WHERE status='approved' AND schedule_status='scheduled' AND scheduled_at <= now() RETURNING id;`
     - For each returned `id`, `dispatch(new PublishPostJob(id))->onQueue('publishing')`.
   - Why scanning rather than delayed jobs: it’s robust to reschedules/cancellations and container restarts; avoids managing delayed DB jobs when schedule times change.

3) API surface (no breaking changes)
   - Keep existing scheduling endpoints. When a post is scheduled/unscheduled, only DB is updated; the scheduler picks it up.
   - Consider adding an internal admin endpoint to force a “scheduling tick” in dev/test.

State Model (server)
- Post.status: `pending|approved|published|…` (unchanged)
- Post.schedule_status: `scheduled|queued|publishing|error|null`
- Transitions:
  - User schedules → `scheduled_at=T`, `schedule_status='scheduled'`.
  - Scheduler tick (T<=now) → atomically set `queued` and dispatch job.
  - Job starts → set `publishing`.
  - Job success → `status='published'`, `published_at=now()`, clear schedule_* fields.
  - Job failure → `schedule_status='error'`, set `schedule_error`, `schedule_attempted_at=now()` (retries may still occur depending on error).

Frontend Integration
- Scheduled list view already exists (`/posts/scheduled`). Ensure it refetches on focus and after any post mutation.
- Optional: Push UX
  - Keep it simple: rely on refetch on focus/interval or trigger a targeted invalidation after the server confirms publish.
  - Optional enhancement: SSE or Reverb broadcasting to push a “publish complete” event to the owner; show toast and invalidate the scheduled list.

Dev/Prod Docker: Worker + Scheduler
- Both docker-compose.dev.yml and docker-compose.prod.yml should run:
  - A queue worker service: `php artisan queue:work --queue=publishing,default --tries=3 --backoff=60` (order to prioritize publishing), or use Horizon in prod.
  - A scheduler service: `php artisan schedule:work` (or cron + `schedule:run` every minute).
- Suggested services (add alongside api and db):
  - `worker`: same image/build as `api`, command: `php artisan queue:work --queue=publishing,default`.
  - `scheduler`: same image/build as `api`, command: `php artisan schedule:work`.
  - Ensure they share the same env (DB, Redis if used, OAuth creds) and depend_on `db`.

Error Handling & Idempotency
- Ensure a single-inflight publish per post using an atomic UPDATE to mark `queued`/`publishing`.
- Job retries/backoff with structured errors (`LINKEDIN_PUBLISH_FAILED`, `TOKEN_EXPIRED`, etc.).
- For token failures, surface `LINKEDIN_NOT_CONNECTED` in `schedule_error` and guide user to reconnect.

Security & Rate Limits
- Leverage Laravel job middleware `RateLimited('linkedin')` to throttle publish attempts; consider exponential backoff for 429/5xx.
- Keep error response shape consistent if an API endpoint is later added for on-demand re-queueing.

SSE vs Reverb (Push Updates)
- SSE (current approach)
  - Pros: Simple, HTTP-only, works via existing endpoints, zero extra infra. Good for single-project pages; adequate for scheduled publishing with occasional refetch.
  - Cons: One-way (server→client), typically one stream per view; less ideal for app-wide, many-to-many real-time updates.
- Reverb (WebSockets)
  - Pros: Bi-directional, scalable push; great for app-wide notifications (e.g., “Post published” anywhere in the app), lower latency, horizontal scale with Redis.
  - Cons: Extra infra and runtime services (Reverb server), configuration complexity (WS ingress, scaling), more surface area to maintain.
- Recommendation
  - Short term: stick with SSE + targeted refetch or minimal polling for scheduled posts. Cost/benefit favors SSE given we already have it and the event cadence is low.
  - If we later add richer realtime features (multi-user collaboration, live edits, presence), adopt Reverb and broadcast `PostPublished` events to `private-users.{userId}` and/or `private-projects.{projectId}` channels. Keep SSE as a fallback.

Implementation Checklist
- [ ] Add `PublishPostJob` with acquire/transition logic, LinkedIn publish, retries, backoff, status updates.
- [ ] Add scheduler in `app/Console/Kernel.php` to run every minute and dispatch due posts using atomic UPDATE…RETURNING.
- [ ] Update Docker: add `worker` and `scheduler` services in dev/prod compose; ensure env parity.
- [ ] FE: Ensure scheduled list refetches on focus/interval; show toast on publish success if using push.
- [ ] Optional: add a manual “Retry publish” action that re-queues posts with `schedule_status='error'`.

Key References
- Existing publish-now flow: `apps/api-laravel/app/Http/Controllers/PostsController.php:168`.
- Scheduling data model: `apps/api-laravel/database/migrations/2025_10_01_000400_create_posts_table.php:1` (schedule_* columns).
- Queue config: `apps/api-laravel/config/queue.php:1`.
- Docker compose (needs worker/scheduler): `docker-compose.dev.yml:1`, `docker-compose.prod.yml:1`.

