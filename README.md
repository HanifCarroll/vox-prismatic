# Vox Prismatic — Content Creation Monorepo

Transforms long‑form source content (transcripts, URLs, or text) into multiple LinkedIn‑ready posts via a guided lifecycle. The system is project‑centric, async, and designed for human approval at the post stage.

## Overview

- AI‑assisted insight extraction from transcripts
- 5–10 LinkedIn‑tailored draft posts per project
- Human approval at the post stage; then publish/schedule
- Realtime progress over WebSockets (Laravel Reverb + Echo)
- One‑command local stack via Docker + pnpm

## Tech Stack

- Web App (API + UI): Laravel 12 + Inertia + Vue 3 + Tailwind 4
- Realtime: Laravel Reverb (WebSockets) + Laravel Echo (Pusher protocol)
- Auth: Session (web guard)
- Queue: Redis + Laravel Horizon
- DB: Postgres
- Desktop (optional): Tauri v2 + React 19
- Package manager: pnpm workspaces

### Monorepo Structure

```
apps/
  web/       # Laravel app (API + Inertia/Vue UI)
  desktop/   # Tauri v2 desktop (optional)
docs/
```

### Services (Dev)

- API/UI: `http://localhost:3001` (health: `/up`)
- Vite (Vue dev): `http://localhost:5173` (service: `web-vite`)
- Reverb (WebSockets): internal at `reverb:8080`
- Redis, Postgres, Horizon (queue‑worker), Scheduler

## Getting Started (Docker)

Prereqs: Docker, pnpm (v10+).

```bash
# Install workspace deps
pnpm install

# Copy app env and adjust if needed (see .env.example)
cp apps/web/.env.example apps/web/.env

# Install PHP vendor deps (and app node deps inside web-vite)
pnpm dev-deps

# Start the full stack
pnpm dev-start
```

Visit `http://localhost:3001`. Register at `/register`, login at `/login`.

Common admin:

```bash
# Rebuild/restart
pnpm dev-build     # rebuild images and start
pnpm dev-restart   # restart all services
pnpm dev-stop      # stop

# Logs & status
pnpm dev-logs
pnpm dev-status
```

If you change `.env`, composer packages, broadcasting, queue config, or migrations, restart `web-app`; for realtime, also restart `reverb`; for queue behavior, restart `queue-worker`.

## Configuration

Minimal env (see `apps/web/.env.example`):

- Reverb (WebSockets): `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`, `REVERB_HOST`, `REVERB_PORT`, `REVERB_SCHEME`
- Vite bridge: `VITE_REVERB_*` vars mirror the above
- Database/Redis: `DB_*`, `REDIS_*`
- LinkedIn OAuth: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` (defaults to `http://localhost/linkedin/callback`)
- AI providers: `GEMINI_API_KEY` (primary). Optional: `OPENAI_API_KEY`

AI model/temperature overrides live in `apps/web/config/ai.php` and are configurable via env (provider:model identifiers like `gemini:models/gemini-2.5-flash`). See `docs/ai-service-guide.md` for details.

## Core Flows

- Create Project: upload/paste transcript → backend auto‑queues processing
- Processing pipeline (queue `processing`):
  - `GenerateInsightsJob` → `GeneratePostsJob` → `FinalizePostsGenerationJob`
  - Realtime events on `project.{projectId}`: `project.progress`, `project.completed`, `project.failed`
  - Post regeneration events: `post.regenerated` on `user.{userId}` and (if available) `project.{projectId}`
- Scheduling/Publishing:
  - Approve posts in UI, then schedule or publish now
  - CLI/cron: `posts:publish-due` (runs via the `scheduler` service every minute)

Key routes (web):

- Projects: `/projects`, `/projects/{project}/{tab}` (transcript|posts), `POST /projects/{project}/process`
- LinkedIn: `GET /settings/linked-in/auth`, `GET /linkedin/callback`, `POST /settings/linked-in/disconnect`
- Publishing: `POST /projects/{project}/posts/{post}/publish`
- Scheduling: `POST /projects/{project}/posts/{post}/schedule`, `DELETE /projects/{project}/posts/{post}/schedule`

## Testing

```bash
# Run feature/unit tests in the Laravel container
docker compose -f docker-compose.dev.yml exec web-app php artisan test

# Example: re-run migrations first
docker compose -f docker-compose.dev.yml exec web-app php artisan migrate --force
```

Prefer database transactions, HTTP fakes for external services (LinkedIn, AI providers), and deterministic tests.

## Desktop (Optional)

```bash
# Start desktop app in dev
pnpm dev:desktop

# Build desktop app
pnpm build:desktop
```

## Build

```bash
pnpm build:web      # Build the web app (Vite)
pnpm build:desktop  # Build the desktop app (Tauri)
```

## License

Proprietary — All rights reserved.
