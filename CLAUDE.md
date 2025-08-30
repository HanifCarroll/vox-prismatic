---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env in Bun processes; for the API we access env via `process.env`

## APIs (Project Conventions)

- API server is **NestJS** (not Bun.serve). Prefer Nest controllers/providers, DTOs, pipes, guards.
- Database access uses **Prisma Client** with **PostgreSQL** via `DATABASE_URL`. Do not use `Bun.sql`, `pg`, or ad-hoc SQL in this repo.
- HTTP client: prefer native `fetch` in web and worker contexts.
- Validation: use `class-validator`/`class-transformer` in the API.
- OpenAPI/Docs via Nest Swagger (`/docs`). Global prefix for API routes is `/api`.

## Tauri v2

This project uses **Tauri v2**. Always use the latest Tauri v2 syntax and APIs:

### API Imports
- Use `import { invoke } from "@tauri-apps/api/core"` (NOT `@tauri-apps/api/tauri`)
- Use `import { getCurrentWindow } from "@tauri-apps/api/window"`
- Use `import { listen } from "@tauri-apps/api/event"`

### Tauri Commands
- Commands are registered with `tauri::generate_handler![]`
- Use `#[tauri::command]` attribute for command functions
- Command functions can be `async` and return `Result<T, String>`
- State management uses `State<'_, AppState>` parameter

### Backend (Rust)
- Use `tauri::Builder::default()` for app setup
- Use `AppHandle` for accessing app functionality
- Use `Manager` trait for path operations: `app_handle.path().app_data_dir()`
- Use proper async patterns with `tokio` runtime

### Frontend Integration
- Use modern Tauri v2 event system with `listen()`
- Use `invoke()` for calling backend commands
- Handle `Result` types properly in TypeScript

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

The web application uses **React with Vite** for fast development and building. The desktop application uses **Tauri v2** with React and Vite.

# Content Creation Monorepo

An intelligent content workflow automation system built as a Bun workspace monorepo. It transforms long‑form content (podcasts, videos, articles) into structured social posts with an auditable pipeline and human‑in‑the‑loop checkpoints.

## Project Overview (Current)

This monorepo contains a complete content intelligence pipeline with the following components:

### Components
- **API** (`apps/api/`) – NestJS 11, Prisma Client, Swagger docs, global prefix `/api`
- **Web** (`apps/web/`) – React with Vite and Tailwind CSS v4
- **Desktop** (`apps/desktop/`) – Tauri v2 desktop app (audio + meeting detection)
- **Worker** (`apps/worker/`) – Bun worker with cron for scheduled publishing
- **Packages** (`packages/`) – Shared `config/` and `types/`

### Pipeline Stages
1. Transcript Processing (AI‑assisted)
2. Insight Review (human)
3. Post Generation (AI + human)
4. Post Review (human)
5. Scheduling (worker)

## Architecture & Structure

Built as a Bun workspace with clear boundaries:

```
content-creation/
├── apps/
│   ├── api/        # NestJS API (global prefix `/api`, Swagger `/docs`)
│   ├── web/        # Next.js 15 web app
│   ├── desktop/    # Tauri v2 desktop app (audio, meeting detection)
│   └── worker/     # Background worker for scheduled publishing
├── packages/
│   ├── config/     # Shared config
│   └── types/      # Shared types
├── data/           # Local data, analytics
├── docs/           # Documentation
└── docker-compose.yml
```

### Data Management
- **PostgreSQL 16** via Docker, configured with `DATABASE_URL`
- **Prisma ORM** models: Transcript, Insight, Post, ScheduledPost, ProcessingJob, Setting, AnalyticsEvent
- Indexed for common query patterns

### Integrations
- **AI**: Google Generative AI (Gemini) for insights/posts, Deepgram for transcription
- **Social**: LinkedIn and X (Twitter) via API modules (not Postiz)

### Services
- **API**
  - Health: `/api/health`
  - Docs: `/docs`
  - CORS origins via `ALLOWED_ORIGINS`
- **Web**
  - Uses `VITE_API_URL` (client-side environment variable)
- **Desktop**
  - Audio recording, meeting detection, tray/background operation
- **Worker**
  - Cron interval via `WORKER_INTERVAL_SECONDS` (default 60s)

### Desktop Features
- Audio recording with real-time duration
- Meeting detection (Zoom, Google Meet, etc.)
- System tray/background operation
- Local audio file management and playback
- Transcription integration with the API

## Environment Variables (Essentials)

Define in repo‑root `.env`:

```
NODE_ENV=development
API_VERSION=v2
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/content_creation
VITE_API_URL=http://localhost:3000
API_BASE_URL=http://api:3000
GOOGLE_AI_API_KEY=...
DEEPGRAM_API_KEY=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
LINKEDIN_ACCESS_TOKEN=...
X_CLIENT_ID=...
X_CLIENT_SECRET=...
X_REDIRECT_URI=http://localhost:3000/auth/x/callback
X_BEARER_TOKEN=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...
WORKER_INTERVAL_SECONDS=60
```

## Development Workflow

All commands use Bun workspace features:

```bash
# Install all deps
bun install

# Run individual services
bun run api        # Start NestJS API
bun run web        # Start Next.js web app
bun run desktop    # Start Tauri desktop app
bun --filter="worker" dev  # Start background worker

# Run apps in parallel
bun run dev       # API + Web (+ Desktop) concurrently
bun run dev:full  # API + Web

# Build individual projects
bun run build:api      # Build NestJS API
bun run build:web      # Build Next.js web app
bun run build:desktop  # Build Tauri desktop app
bun run build:all      # Build packages + API + web in sequence
bun run build          # Build shared packages/types only

# Database operations
bun run db:migrate
bun run db:generate
```

## Docker

Unified `docker-compose.yml` powers the full stack with multi‑stage builds via `TARGET`.

```bash
# Development (default)
docker compose up

# Explicit targets
TARGET=development docker compose up
TARGET=production docker compose up
```

- API: `http://localhost:3000`
- Web: `http://localhost:3001`
- DB: `postgresql://postgres:postgres@localhost:5432/content_creation`

## Notes for Contributors (Conventions)

- Prefer functional, pure utilities. Use explicit error handling.
- In API, use DTOs + validation and avoid throwing for flow control.
- Keep Prisma access in services/providers; avoid raw SQL unless necessary.
- Keep environment‑specific URLs behind `getApiBaseUrl()` on web.
- For desktop, follow Tauri v2 patterns (commands → services → threads), avoid blocking the UI thread.