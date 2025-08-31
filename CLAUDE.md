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

The web application uses **React 19 with Vite** for fast development and building, featuring:
- TanStack Query for server state management and caching
- Zustand for client-side state management  
- Real-time updates via Server-Sent Events (SSE)
- Radix UI components with Tailwind CSS v4
- React Router for navigation

The desktop application uses **Tauri v2** with React and Vite for native desktop functionality.

# Content Creation Monorepo

An intelligent content workflow automation system built as a Bun workspace monorepo. It transforms long‑form content (podcasts, videos, articles) into structured social posts with an advanced pipeline featuring:

- **XState workflow orchestration** for complex multi-step processing
- **BullMQ job queues** with Redis for reliable background processing
- **Real-time SSE updates** for live pipeline monitoring
- **OAuth integrations** for seamless social media publishing
- **Comprehensive analytics** and metrics tracking
- **Human-in-the-loop checkpoints** with sophisticated state management

## Project Overview (Current)

This monorepo contains a complete content intelligence pipeline with the following components:

### Components
- **API** (`apps/api/`) – NestJS 11, Prisma Client, Swagger docs, global prefix `/api`, XState state machines, SSE events
- **Web** (`apps/web/`) – React 19 with Vite, Tailwind CSS v4, TanStack Query, Zustand state management  
- **Desktop** (`apps/desktop/`) – Tauri v2 desktop app (audio + meeting detection)
- **Worker** (`apps/worker/`) – Bun worker with BullMQ queue processing
- **Packages** (`packages/`) – Shared `types/` and `queue/` (BullMQ abstractions)

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
│   ├── web/        # Vite + React 19 web app  
│   ├── desktop/    # Tauri v2 desktop app (audio, meeting detection)
│   └── worker/     # BullMQ background worker
├── packages/
│   ├── types/      # Shared TypeScript types and utilities
│   └── queue/      # BullMQ queue abstractions and processors
├── data/           # Local data, analytics
├── docs/           # Documentation
└── docker-compose.yml  # PostgreSQL + Redis + API + Worker services
```

### Data Management
- **PostgreSQL 16** via Docker, configured with `DATABASE_URL`
- **Redis 7** via Docker for BullMQ job queues and caching
- **Prisma ORM** models: Transcript, Insight, Post, ScheduledPost, ProcessingJob, Setting, AnalyticsEvent, **Pipeline**
- Advanced state management with XState integration
- Comprehensive indexes for performance optimization

### Integrations & Features  
- **AI**: Google Generative AI (Gemini) for insights/posts, Deepgram for transcription
- **Social**: LinkedIn and X (Twitter) with OAuth2 authentication and posting APIs
- **Queue System**: BullMQ with Redis for reliable background job processing
- **State Management**: XState machines for complex workflow orchestration
- **Real-time**: Server-Sent Events (SSE) for live pipeline updates
- **Analytics**: Comprehensive event tracking and metrics collection
- **Notifications**: In-app notifications and alerts system

### Services
- **API (NestJS)**
  - Health: `/api/health`
  - Docs: `/docs` 
  - CORS origins via `ALLOWED_ORIGINS`
  - SSE events: `/api/sse/events/*` for real-time updates
  - Queue management with BullMQ and Redis
  - OAuth integrations (LinkedIn, X/Twitter)
  - Analytics and metrics tracking
  - Content processing pipeline with XState workflows
- **Web (Vite + React)**
  - Dev server on port 3001 with proxy to API (port 3000)
  - Real-time updates via Server-Sent Events
  - TanStack Query for server state management
  - Zustand for client state management
- **Desktop (Tauri v2)**
  - Audio recording, meeting detection, system tray operation
- **Worker**
  - BullMQ queue processors for background jobs
  - Redis-based job persistence and retry logic

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
REDIS_HOST=localhost
REDIS_PORT=6379
VITE_API_URL=http://localhost:3000
API_BASE_URL=http://api:3000
LOG_LEVEL=debug
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

**Services:**
- **PostgreSQL 16**: Database with persistent volume
- **Redis 7**: Queue backend for BullMQ with persistent volume  
- **API**: NestJS server with auto-migration and Prisma generation
- **Worker**: Background job processor with BullMQ

```bash
# Development (default)
docker compose up

# Explicit targets
TARGET=development docker compose up
TARGET=production docker compose up
```

**Service Endpoints:**
- API: `http://localhost:3000` (health: `/api/health`, docs: `/docs`)
- Web: `http://localhost:3001` (when run separately)
- Database: `postgresql://postgres:postgres@localhost:5432/content_creation`
- Redis: `redis://localhost:6379`

## Notes for Contributors (Conventions)

- Prefer functional, pure utilities. Use explicit error handling.
- In API, use DTOs + validation and avoid throwing for flow control.
- Keep Prisma access in services/providers; avoid raw SQL unless necessary.
- Keep environment‑specific URLs behind `getApiBaseUrl()` on web.
- For desktop, follow Tauri v2 patterns (commands → services → threads), avoid blocking the UI thread.