# Content Creation Monorepo

An intelligent content workflow automation system built as a pnpm workspace monorepo. It transforms long‑form content (podcasts, videos, articles) into structured social posts with an advanced pipeline featuring:

- **XState workflow orchestration** for complex multi-step processing
- **Hangfire job queues** with PostgreSQL for reliable background processing  
- **Real-time SSE updates** for live pipeline monitoring
- **OAuth integrations** for seamless social media publishing
- **Comprehensive analytics** and metrics tracking
- **Human-in-the-loop checkpoints** with sophisticated state management

## 🎯 Overview

- **AI-assisted insights** extracted from transcripts
- **Human review** at key stages
- **Post generation** tailored for LinkedIn and X
- **Scheduling** via a background worker
- **One-click local stack** with Docker or Bun

## 🧰 Tech Stack (Current)

- **API**: NestJS 11, Class‑Validator, Swagger, Prisma Client, XState, SSE, BullMQ
- **Web**: Vite, React 19, TanStack Query, Zustand, Tailwind CSS 4, Radix UI
- **Desktop**: Tauri v2 (Rust + WebView), Vite, React 19
- **Worker**: Node.js worker with BullMQ queue processing
- **Database**: PostgreSQL 16 via Docker, Prisma ORM (migrations + schema)
- **Queue**: Hangfire with PostgreSQL for job processing
- **State Management**: XState for complex workflows, Zustand for UI state
- **Real-time**: Server-Sent Events (SSE) for live updates
- **Runtime**: Node.js with pnpm

## 🏗️ Architecture

```
Transcript → Insights → Posts → Review → Schedule
    ↓           ↓         ↓        ↓         ↓
   AI       Human     AI+Human  Human    Hangfire
    ↓           ↓         ↓        ↓         ↓
  XState    SSE      Queue    Events    PostgreSQL
```

### Monorepo Structure

```
content-creation/
├── apps/
│   ├── api/        # NestJS API (SSE, OAuth, Analytics, Queue Management)
│   ├── web/        # Vite + React 19 web app (TanStack Query, SSE)
│   ├── desktop/    # Tauri v2 desktop app (audio, meeting detection)
│   └── worker/     # BullMQ background worker
├── packages/
│   ├── types/      # Shared TypeScript types and utilities  
│   └── queue/      # BullMQ queue abstractions and processors
├── data/           # Local data, analytics
├── docs/           # Documentation
└── docker-compose.yml  # PostgreSQL + API + Worker services
```

### Services

- **API (NestJS)**
  - Global prefix: `/api`
  - Docs: `/docs`
  - Health: `/api/health` 
  - SSE Events: `/api/sse/events/*` for real-time updates
  - OAuth: LinkedIn and X/Twitter integrations
  - Analytics: Comprehensive metrics and event tracking
  - Queue Management: BullMQ job monitoring and control
  - CORS: `ALLOWED_ORIGINS` (comma‑separated)

- **Web (Vite + React)**
  - Dev server on port 3001 with API proxy
  - Real-time updates via Server-Sent Events
  - TanStack Query for server state caching
  - Zustand for client state management

- **Desktop (Tauri v2)**
  - Local desktop client with audio capture and meeting detection
  - Dev: `pnpm run desktop` (or `cd apps/desktop && pnpm tauri dev`)

- **Worker**
  - Hangfire queue processors for background jobs
  - PostgreSQL-based job persistence and retry logic

### Desktop Features
- Audio recording with real-time duration tracking
- Meeting detection (Zoom, Google Meet, etc.)
- System tray/background operation
- Local audio file management and playback
- Automatic transcription integration with the API
- Built with Tauri v2, Vite, React 19

## 📦 Database & Infrastructure

- **PostgreSQL 16** (via Docker) with `DATABASE_URL`
- **Prisma ORM** models: `Transcript`, `Insight`, `Post`, `ScheduledPost`, `ProcessingJob`, `Setting`, `AnalyticsEvent`, `Pipeline`
- **XState Integration**: Complex workflow state management  
- **BullMQ Queues**: Reliable background job processing with retry logic
- Performance indexes optimized for queue operations and analytics

## 🔐 Environment Variables

Create a `.env` at the repo root. Common keys:

```env
# General
NODE_ENV=development
API_VERSION=v2
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
PORT=3000
HOST=0.0.0.0

# Database & Infrastructure
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/content_creation

# Web (Vite + React)
VITE_API_URL=http://localhost:3000
# Used server-side in containers (e.g., Docker pointing to service name)
API_BASE_URL=http://api:3000

# Logging & Debug
LOG_LEVEL=debug

# AI
GOOGLE_AI_API_KEY=...
DEEPGRAM_API_KEY=...

# LinkedIn
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
LINKEDIN_ACCESS_TOKEN=...

# X (Twitter)
X_CLIENT_ID=...
X_CLIENT_SECRET=...
X_REDIRECT_URI=http://localhost:3000/auth/x/callback
X_BEARER_TOKEN=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...

# Worker
WORKER_INTERVAL_SECONDS=60
```

## 🚀 Running Locally (pnpm)

```bash
# Install deps
pnpm install

# Start API
pnpm run api

# Start Web
pnpm run web

# Start Worker
pnpm --filter="worker" dev # or: cd apps/worker && pnpm dev

# Start Desktop (Tauri)
pnpm run desktop  # or: cd apps/desktop && pnpm tauri dev
```

### Build Commands

```bash
# Build individual projects
pnpm run build:api      # Build NestJS API
pnpm run build:web      # Build Vite + React web app
pnpm run build:desktop  # Build Tauri desktop app
pnpm run build:all      # Build packages + API + web

# Development workflows
pnpm run dev       # API + Web (+ Desktop) concurrently
pnpm run dev:full  # API + Web
pnpm run build     # Build shared packages/types

# Database operations
pnpm run db:migrate
pnpm run db:generate
```

API runs at `http://localhost:3000` (health: `/api/health`, docs: `/docs`). Web runs at `http://localhost:3001` by default when using Docker (see below) or when running with pnpm dev.

## 🐳 Docker (Recommended)

A single `docker-compose.yml` runs PostgreSQL, API, and Worker with health checks and persistent volumes.

**Services:**
- **PostgreSQL 16**: Database with auto-migration
- **API**: NestJS server with SSE, OAuth, and queue management
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
- Web: `http://localhost:3001` (run separately for development)
- Database: `postgresql://postgres:postgres@localhost:5432/content_creation`

More details in `DOCKER_SETUP.md`.

## 📚 API Endpoints (high-level)

All routes are behind `/api`.
- **Core Content**: `GET/POST /api/transcripts`, `GET /api/insights`, `GET/PATCH /api/posts`
- **Pipeline**: `POST /api/content-processing/pipeline`, `GET /api/sse/events/*` (SSE)
- **Publishing**: `POST /api/publisher/process`, `GET/POST /api/scheduler/*`
- **OAuth**: `GET /api/oauth/{linkedin,x}/auth`, `POST /api/oauth/*/exchange`
- **Analytics**: `GET /api/dashboard`, `GET /api/sidebar/counts`
- **Queue Management**: `GET /api/processing-job/*` (Hangfire job status)
- **Documentation**: `GET /docs` (Swagger UI)

## 🧪 Development

```bash
# Type checks across workspaces
pnpm run type-check

# Lint/format in each app
cd apps/api && pnpm run lint && pnpm run format:fix
cd apps/web && pnpm run lint && pnpm run format
```

## 🔄 Architecture Highlights

- **Advanced State Management**: XState workflows for complex content processing pipelines
- **Reliable Job Processing**: Hangfire with PostgreSQL for persistent, retryable background jobs
- **Real-time Updates**: Server-Sent Events (SSE) for live pipeline monitoring 
- **OAuth Integrations**: LinkedIn and X/Twitter with secure token management
- **Comprehensive Analytics**: Event tracking, metrics collection, and performance monitoring
- **Modern Frontend**: Vite + React 19 with TanStack Query and real-time updates
- **Production-Ready**: Multi-stage Docker builds, health checks, persistent volumes

## 📄 License

Proprietary – All rights reserved.