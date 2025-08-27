# Content Creation Monorepo

An intelligent content workflow automation system built as a Bun workspace monorepo. It transforms long‑form content (podcasts, videos, articles) into structured social posts with an auditable pipeline and human‑in‑the‑loop checkpoints.

## 🎯 Overview

- **AI-assisted insights** extracted from transcripts
- **Human review** at key stages
- **Post generation** tailored for LinkedIn and X
- **Scheduling** via a background worker
- **One-click local stack** with Docker or Bun

## 🧰 Tech Stack (Current)

- **API**: NestJS 11, Class‑Validator, Swagger, Prisma Client
- **Web**: Next.js 15 (App Router, Turbopack), React 19, Tailwind CSS 4
- **Desktop**: Tauri v2 (Rust + WebView), Vite, React 19
- **Worker**: Bun worker with cron for scheduled publishing
- **Database**: PostgreSQL 16 via Docker, Prisma ORM (migrations + schema)
- **Runtime**: Bun

## 🏗️ Architecture

```
Transcript → Insights → Posts → Review → Schedule
    ↓           ↓         ↓        ↓         ↓
   AI       Human     AI+Human  Human    Worker
```

### Monorepo Structure

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

### Services

- **API (NestJS)**
  - Global prefix: `/api`
  - Docs: `/docs`
  - Health: `/api/health`
  - CORS: `ALLOWED_ORIGINS` (comma‑separated)

- **Web (Next.js)**
  - Uses `NEXT_PUBLIC_API_BASE_URL` (client) and `API_BASE_URL` (SSR) for API calls
  - Dev server with Turbopack

- **Desktop (Tauri v2)**
  - Local desktop client with audio capture and meeting detection
  - Dev: `bun run desktop` (or `cd apps/desktop && bun tauri dev`)

- **Worker**
  - Polls due `scheduled_posts` and marks them published
  - Interval controlled by `WORKER_INTERVAL_SECONDS` (default 60s)

### Desktop Features
- Audio recording with real-time duration tracking
- Meeting detection (Zoom, Google Meet, etc.)
- System tray/background operation
- Local audio file management and playback
- Automatic transcription integration with the API
- Built with Tauri v2, Vite, React 19

## 📦 Database

- **PostgreSQL 16** (via Docker) with `DATABASE_URL`
- Prisma models: `Transcript`, `Insight`, `Post`, `ScheduledPost`, `ProcessingJob`, `Setting`, `AnalyticsEvent`
- Performance indexes for common query patterns

## 🔐 Environment Variables

Create a `.env` at the repo root. Common keys:

```env
# General
NODE_ENV=development
API_VERSION=v2
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/content_creation

# Web
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
# Used server-side in web only (e.g., Docker SSR pointing to service name)
API_BASE_URL=http://api:3000

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

## 🚀 Running Locally (Bun)

```bash
# Install deps
bun install

# Start API
bun run api

# Start Web
bun run web

# Start Worker
bun --filter="worker" dev # or: cd apps/worker && bun dev

# Start Desktop (Tauri)
bun run desktop  # or: cd apps/desktop && bun tauri dev
```

Handy scripts at the repo root (`package.json`):

```bash
bun run dev       # API + Web (+ Desktop) concurrently
bun run dev:full  # API + Web
bun run build     # Build shared packages/types
bun run db:migrate
bun run db:generate
```

API runs at `http://localhost:3000` (health: `/api/health`, docs: `/docs`). Web runs at `http://localhost:3001` by default when using Docker (see below) or `http://localhost:3000` in pure Bun dev.

## 🐳 Docker (Recommended)

A single `docker-compose.yml` runs PostgreSQL, API, Web, and Worker. It supports multi‑stage targets via `TARGET`.

```bash
# Development (default)
docker compose up

# Explicit
TARGET=development docker compose up

# Production
TARGET=production docker compose up
```

- API: `http://localhost:3000`
- Web: `http://localhost:3001` (container maps 3001→3000)
- DB: `postgresql://postgres:postgres@localhost:5432/content_creation`

More details in `DOCKER_SETUP.md`.

## 📚 API Endpoints (high-level)

All routes are behind `/api`.
- Transcripts: `GET/POST /api/transcripts`
- Insights: `GET /api/insights`, `POST /api/insights/bulk`
- Posts: `GET/PATCH /api/posts`, `POST /api/posts/:id/schedule`
- Publisher: `POST /api/publisher/process`
- Docs: `GET /docs`

## 🧪 Development

```bash
# Type checks across workspaces
bun run type-check

# Lint/format in each app
cd apps/api && bun run lint && bun run format:fix
cd apps/web && bun run lint && bun run format
```

## 🔄 Notes & Changes from Prior Version

- Migrated from SQLite to **PostgreSQL + Prisma** with migrations
- Introduced **NestJS API** with global prefix `/api` and Swagger `/docs`
- Added **Worker** service for scheduled publishing (cron)
- Updated **Next.js 15** web app with API base URL helpers (`apps/web/src/lib/api-config.ts`)
- Unified Docker setup with a single `docker-compose.yml` (see `DOCKER_SETUP.md`)

## 📄 License

Proprietary – All rights reserved.