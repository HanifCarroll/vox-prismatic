---
description: Use pnpm for package management and Node.js for runtime.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using pnpm for package management.

- Use `node <file>` or `tsx <file>` for running TypeScript files
- Use `vitest` for testing
- Use `vite build` for building web applications
- Use `pnpm install` instead of `npm install` or `yarn install`
- Use `pnpm run <script>` instead of `npm run <script>` or `yarn run <script>`
- Access environment variables via `process.env`

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

Use `pnpm test` to run tests with Vitest.

```ts#index.test.ts
import { test, expect } from "vitest";

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

An intelligent content workflow automation system built as a pnpm workspace monorepo. It transforms long‑form content (podcasts, videos, articles) into structured social posts with an advanced pipeline featuring:

- **XState workflow orchestration** for complex multi-step processing
- **Hangfire job queues** with PostgreSQL for reliable background processing
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
- **Worker** (`apps/worker/`) – Node.js worker with Hangfire queue processing
- **Packages** (`packages/`) – Shared `types/` and `queue/` (Hangfire abstractions)

### Pipeline Stages
1. Transcript Processing (AI‑assisted)
2. Insight Review (human)
3. Post Generation (AI + human)
4. Post Review (human)
5. Scheduling (worker)

## Architecture & Structure

Built as a pnpm workspace with clear boundaries:

```
content-creation/
├── apps/
│   ├── api/        # NestJS API (global prefix `/api`, Swagger `/docs`)
│   ├── web/        # Vite + React 19 web app  
│   ├── desktop/    # Tauri v2 desktop app (audio, meeting detection)
│   └── worker/     # Hangfire background worker
├── packages/
│   ├── types/      # Shared TypeScript types and utilities
│   └── queue/      # Hangfire queue abstractions and processors
├── data/           # Local data, analytics
├── docs/           # Documentation
└── docker-compose.yml  # PostgreSQL + API + Worker services
```

### Data Management
- **PostgreSQL 16** via Docker, configured with `DATABASE_URL`
- **Prisma ORM** models: Transcript, Insight, Post, ScheduledPost, ProcessingJob, Setting, AnalyticsEvent, **Pipeline**
- Advanced state management with XState integration
- Comprehensive indexes for performance optimization

### Integrations & Features  
- **AI**: Google Generative AI (Gemini) for insights/posts, Deepgram for transcription
- **Social**: LinkedIn and X (Twitter) with OAuth2 authentication and posting APIs
- **Queue System**: Hangfire with PostgreSQL for reliable background job processing
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
  - Queue management with Hangfire and PostgreSQL
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
  - Hangfire queue processors for background jobs
  - PostgreSQL-based job persistence and retry logic

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

All commands use pnpm workspace features:

```bash
# Install all deps
pnpm install

# Run individual services
pnpm run api        # Start NestJS API
pnpm run web        # Start Vite + React web app
pnpm run desktop    # Start Tauri desktop app
pnpm --filter="worker" dev  # Start background worker

# Run apps in parallel
pnpm run dev       # API + Web (+ Desktop) concurrently
pnpm run dev:full  # API + Web

# Build individual projects
pnpm run build:api      # Build NestJS API
pnpm run build:web      # Build Vite + React web app
pnpm run build:desktop  # Build Tauri desktop app
pnpm run build:all      # Build packages + API + web in sequence
pnpm run build          # Build shared packages/types only

# Database operations
pnpm run db:migrate
pnpm run db:generate
```

## Docker

Unified `docker-compose.yml` powers the full stack with multi‑stage builds via `TARGET`.

**Services:**
- **PostgreSQL 16**: Database with persistent volume
- **API**: NestJS server with auto-migration and Prisma generation
- **Worker**: Background job processor with Hangfire

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

## Notes for Contributors (Conventions)

- Prefer functional, pure utilities. Use explicit error handling.
- In API, use DTOs + validation and avoid throwing for flow control.
- Keep Prisma access in services/providers; avoid raw SQL unless necessary.
- Keep environment‑specific URLs behind `getApiBaseUrl()` on web.
- For desktop, follow Tauri v2 patterns (commands → services → threads), avoid blocking the UI thread.