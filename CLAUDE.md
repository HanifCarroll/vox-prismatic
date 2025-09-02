---
description: Use pnpm for JavaScript workspaces (Angular/Tauri) and .NET for API/Worker.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using pnpm for package management for the JavaScript apps (Angular web, Tauri desktop).

- Use `pnpm install` instead of `npm install` or `yarn install`
- Use `pnpm run <script>` instead of `npm run <script>` or `yarn run <script>`
- For Angular, use the Angular CLI (`ng serve`, `ng build`) via package scripts
- For Tauri desktop, use `pnpm tauri dev` and `pnpm tauri build`
- Access environment variables in JS apps via `process.env` where applicable
- The API and Worker are .NET 8 projects; use `dotnet` CLI for build/test/run

## APIs (Project Conventions)

- API server is **ASP.NET Core Web API**.
- Persistence uses **Entity Framework Core** with **PostgreSQL**. Prefer DbContext repositories; avoid ad‑hoc SQL.
- HTTP client:
  - Frontend: Angular `HttpClient` (or `fetch` as needed)
  - Backend: .NET `HttpClient` with Polly for retries/backoff (configured)
- Validation: use DTOs with data annotations and explicit checks in services/controllers.
- OpenAPI/Docs via Swashbuckle (Swagger UI) at `/swagger`. A global prefix `/api` is enforced via an API prefix convention.

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

Use `pnpm --filter web-angular test` (Angular CLI with Karma/Jasmine) for the web app.
Use `dotnet test` for API/Worker solution tests.

Unit test frameworks vary by project; prefer the defaults configured in each app.

## Frontend

The web application uses **Angular 20** with the following practices:
- Standalone components (no NgModules)
- Signals for component and shared state; `computed()` for derived state
- Change detection: `OnPush` for presentational/list components
- Native control flow (`@if`, `@for`, `@switch`), with `track` on lists
- Typed Reactive Forms for complex inputs (wizards, editors)
- SSE integration for real‑time updates
- Tailwind CSS v4 for styling

The desktop application uses **Tauri v2** with React and Vite for native desktop functionality.

# Content Creation Monorepo

An intelligent content workflow automation system built as a pnpm workspace monorepo. It transforms long‑form content (podcasts, videos, articles) into structured social posts with an advanced pipeline featuring:

- **Hangfire job queues** with PostgreSQL for reliable background processing
- **Real-time SSE updates** for live pipeline monitoring
- **OAuth integrations** for LinkedIn publishing
- **Human-in-the-loop checkpoints** with clear project lifecycle stages

## Project Overview (Current)

This monorepo contains a complete content intelligence pipeline with the following components:

### Components
- **API** (`apps/api-dotnet/`) – ASP.NET Core Web API, EF Core (PostgreSQL), Swagger at `/swagger`, global prefix `/api`, SSE events at `/api/events`
- **Web** (`apps/web-angular/`) – Angular 20, Tailwind CSS v4, signals, OnPush
- **Desktop** (`apps/desktop-tauri/`) – Tauri v2 desktop app (audio + meeting detection)
- **Worker** – .NET background worker using Hangfire (in `apps/api-dotnet/ContentCreation.Worker`)

### Pipeline Stages
1. Transcript Processing (AI‑assisted)
2. Insight Review (human)
3. Post Generation (AI + human)
4. Post Review (human)
5. Scheduling & Publishing (worker)

## Architecture & Structure

Built as a pnpm workspace with clear boundaries:

```
content-creation/
├── apps/
│   ├── api-dotnet/     # ASP.NET Core Web API + Worker
│   ├── web-angular/    # Angular 20 web app
│   └── desktop-tauri/  # Tauri v2 desktop app (audio, meeting detection)
├── docs/           # Documentation
└── compose.yml          # PostgreSQL + API + Worker services
```

### Data Management
- **PostgreSQL 16** via Docker
- **EF Core** models/entities: ContentProject, Transcript, Insight, Post, ScheduledPost, ProjectActivity, OAuthToken

### Integrations & Features  
- **AI**: Google Generative AI (Gemini) for insights/posts, Deepgram for transcription
- **Social**: LinkedIn with OAuth2 authentication and posting APIs
- **Queue System**: Hangfire with PostgreSQL for reliable background job processing
- **Real-time**: Server-Sent Events (SSE) for live pipeline updates
- **Notifications**: In-app notifications and alerts system

### Services
- **API (.NET)**
  - Health: `/api/health`
  - Swagger UI: `/swagger`
  - CORS origins via configuration (`Cors:AllowedOrigins`)
  - SSE events: `/api/events` for real-time updates
  - Hangfire dashboard: `/hangfire`
  - OAuth integrations (LinkedIn)
- **Web (Angular)**
  - Dev server on port 4200 (Angular CLI)
  - Real-time updates via Server-Sent Events
- **Desktop (Tauri v2)**
  - Audio recording, meeting detection, system tray operation
- **Worker (.NET)**
  - Hangfire queue processors for background jobs
  - PostgreSQL-based job persistence and retry logic

### Desktop Features
- Audio recording with real-time duration
- Meeting detection (Zoom, Google Meet, etc.)
- System tray/background operation
- Local audio file management and playback
- Transcription integration with the API

## Environment Variables (Essentials)

Define in repo‑root `.env` for Docker compose and shared secrets:

```
# General
ASPNETCORE_ENVIRONMENT=Development

# Database (Docker)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=content_creation

# API keys
GOOGLE_AI_API_KEY=...
DEEPGRAM_API_KEY=...
LINKEDIN_ACCESS_TOKEN=...
```

## Development Workflow

Commands use pnpm workspace features for JS apps and dotnet CLI for API/Worker:

```bash
# Install JS deps
pnpm install

# Start database, API (dotnet watch), and Angular web together
pnpm run dev

# Run individual services
pnpm dev:web-angular   # Angular dev server (4200)
pnpm dev:api           # .NET API via dotnet watch
pnpm dev:desktop       # Tauri desktop app

# Build individual projects
pnpm run build:api      # Build .NET solution (Release)
pnpm run build:web      # Build Angular web app
pnpm run build:desktop  # Build Tauri desktop app

# Tests
pnpm run test:web       # Angular tests
pnpm run test:api       # .NET tests
```

## Docker

Unified `compose.yml` powers the database, API, and Worker with multi‑stage builds via `TARGET`.

**Services:**
- **PostgreSQL 16**: Database with persistent volume
- **API**: ASP.NET Core Web API with EF Core migrations
- **Worker**: .NET background job processor with Hangfire

```bash
# Development (default)
docker compose up

# Explicit targets
TARGET=development docker compose up
TARGET=production docker compose up
```

**Service Endpoints:**
- API: `http://localhost:5001` (health: `/api/health`, Swagger: `/swagger`)
- Web: `http://localhost:4200` (when run separately)
- Database: `postgresql://postgres:postgres@localhost:5432/content_creation`

## Notes for Contributors (Conventions)

- Prefer functional, pure utilities on the frontend. Use explicit error handling.
- In API, use DTOs and data annotations; avoid throwing for flow control.
- Keep EF Core access in services; avoid raw SQL unless necessary.
- Configure API base URLs and CORS origins via environment/appsettings.
- For desktop, follow Tauri v2 patterns (commands → services → threads); avoid blocking the UI thread.