# Content Creation Monorepo

An intelligent content workflow automation system built as a pnpm workspace monorepo. It transforms long‑form content (podcasts, videos, articles) into structured social posts with an advanced pipeline featuring:

- **Hangfire job queues** with PostgreSQL for reliable background processing  
- **Real-time SSE updates** for live pipeline monitoring
- **OAuth integrations** for LinkedIn publishing
- **Human-in-the-loop checkpoints** with a project‑centric lifecycle

## 🎯 Overview

- **AI-assisted insights** extracted from transcripts
- **Human review** at key stages
- **Post generation** tailored for LinkedIn and X
- **Scheduling** via a background worker
- **One-click local stack** with Docker or Bun

## 🧰 Tech Stack (Current)

- **API**: ASP.NET Core Web API (.NET 8), Swagger (Swashbuckle), EF Core, SSE, Polly
- **Web**: Angular 20 (standalone components, signals), Tailwind CSS 4
- **Desktop**: Tauri v2 (Rust + WebView), Vite, React 19
- **Worker**: .NET Worker with Hangfire queue processing
- **Database**: PostgreSQL 16 via Docker, EF Core for migrations
- **Queue**: Hangfire with PostgreSQL for job processing
- **Real-time**: Server-Sent Events (SSE) for live updates
- **Package manager**: pnpm for JS workspaces

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
│   ├── api-dotnet/     # ASP.NET Core Web API + Worker
│   ├── web-angular/    # Angular 20 web app
│   └── desktop-tauri/  # Tauri v2 desktop app (audio, meeting detection)
├── docs/               # Documentation
└── compose.yml         # PostgreSQL + API + Worker services
```

### Services

- **API (.NET)**
  - Global prefix: `/api`
  - Docs: Swagger UI at `/swagger`
  - Health: `/api/health`
  - SSE Events: `/api/events`
  - OAuth: LinkedIn integration
  - Hangfire Dashboard: `/hangfire`
  - CORS: configured via `Cors:AllowedOrigins` in `appsettings.json`

- **Web (Angular)**
  - Dev server on port 4200 (Angular CLI)
  - Real-time updates via Server-Sent Events

- **Desktop (Tauri v2)**
  - Local desktop client with audio capture and meeting detection
  - Dev: `pnpm run desktop` (or `cd apps/desktop-tauri && pnpm tauri dev`)

- **Worker (.NET)**
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

- **PostgreSQL 16** (via Docker)
- **EF Core** entities: `ContentProject`, `Transcript`, `Insight`, `Post`, `ScheduledPost`, `ProjectActivity`, `OAuthToken`
- **Hangfire Queues**: Reliable background job processing with retry logic

## 🔐 Environment Variables

Create a `.env` at the repo root (used by Docker compose and services). Common keys:

```env
# General
ASPNETCORE_ENVIRONMENT=Development

# Database & Infrastructure
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=content_creation

# API/Web
# Angular dev server runs on 4200; API runs on 5001 (mapped from 5000 in container)

# AI
GOOGLE_AI_API_KEY=...
DEEPGRAM_API_KEY=...

# LinkedIn
LINKEDIN_ACCESS_TOKEN=...
```

## 🚀 Running Locally (pnpm + dotnet)

```bash
# Install JS deps
pnpm install

# Start DB + API (.NET watch) + Angular web concurrently
pnpm run dev

# Start individually
pnpm dev:api            # .NET API
pnpm dev:web-angular    # Angular web (http://localhost:4200)
pnpm dev:desktop        # Tauri desktop app
```

### Build Commands

```bash
# Build individual projects
pnpm run build:api      # Build .NET solution (Release)
pnpm run build:web      # Build Angular web app
pnpm run build:desktop  # Build Tauri desktop app
```

API runs at `http://localhost:5001` (health: `/api/health`, docs: `/swagger`). Web runs at `http://localhost:4200` by default in development.

## 🐳 Docker (Recommended)

A single `compose.yml` runs PostgreSQL, API, and Worker with health checks and persistent volumes.

**Services:**
- **PostgreSQL 16**: Database with EF Core migrations
- **API**: ASP.NET Core API with SSE, OAuth (LinkedIn), Hangfire Dashboard
- **Worker**: .NET background worker with Hangfire

```bash
# Development (default)
docker compose up

# Explicit targets
TARGET=development docker compose up
TARGET=production docker compose up
```

**Service Endpoints:**
- API: `http://localhost:5001` (health: `/api/health`, docs: `/swagger`)
- Web: `http://localhost:4200` (run separately for development)
- Database: `postgresql://postgres:postgres@localhost:5432/content_creation`

More details in `DOCKER_SETUP.md`.

## 📚 API Endpoints (high-level)

All routes are behind `/api`.
- **Core Content**: `GET/POST /api/projects`, `GET /api/projects/{id}`, `GET /api/projects/{id}/insights`, `GET /api/projects/{id}/posts`
- **Actions**: `POST /api/projects/{id}/process-content`, `extract-insights`, `generate-posts`, `schedule-posts`, `publish-now`
- **Dashboard**: `GET /api/dashboard/project-overview`, `GET /api/dashboard/action-items`
- **Events**: `GET /api/events` (SSE)
- **Health**: `GET /api/health`
- **Docs**: `GET /swagger`

## 🧪 Development

```bash
# Lint/format in Angular app
cd apps/web-angular && pnpm run test

# .NET tests
dotnet test apps/api-dotnet/ContentCreation.sln
```

## 🔄 Architecture Highlights

- **Project-Centric Workflow**: Clear lifecycle stages from processing to publishing
- **Reliable Job Processing**: Hangfire with PostgreSQL for persistent, retryable background jobs
- **Real-time Updates**: Server-Sent Events (SSE) for live pipeline monitoring 
- **OAuth Integrations**: LinkedIn with secure token management
- **Modern Frontend**: Angular 20 with signals, OnPush, Tailwind CSS v4
- **Production-Ready**: Multi-stage Docker builds, health checks, persistent volumes

## 📄 License

Proprietary – All rights reserved.