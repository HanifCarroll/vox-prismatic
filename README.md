# Content Creation Monorepo (Supabase + Hono + React)

An intelligent content workflow built as a pnpm workspace. It transforms long‑form content (podcasts, videos, articles) into LinkedIn‑ready posts with a project‑centric lifecycle and a Laravel API.

## 🎯 Overview

- **AI-assisted insights** extracted from transcripts
- **Human review** at key stages
- **Post generation** tailored for LinkedIn 
- **Scheduling** via a background worker
- **One-click local stack** with Docker

## 🧰 Tech Stack

- API: Laravel
- Auth: Sanctum
- DB: Postgres
- Web: React 19, TanStack Router/Query, Tailwind 4
- Desktop: Tauri v2 (optional)
- Package manager: pnpm

### Monorepo Structure

```
apps/
  api-laravel/    # Laravel API
  web/            # Vite React app
  desktop-tauri/  # Tauri v2 desktop (optional)
  shared-types/   # Zod schemas + types shared FE/BE
docs/
```

### Services

- API (Laravel): `/api/*`, health at `/api/health`, SSE endpoints for processing/status.
- Web (React): Vite dev at `http://localhost:5173`.
- Desktop (Tauri): optional local tooling; launch via `pnpm desktop`.

### Desktop Features

- Audio recording with real-time duration tracking
- Meeting detection (Zoom, Google Meet, etc.)
- System tray/background operation
- Local audio file management and playback
- Automatic transcription integration with the API
- Built with Tauri v2, Vite, React 19

## 🚀 Running Locally

```bash
# Install JS deps
pnpm install
```

### Development

```bash
# Start all services (API + Web)
pnpm dev

# Desktop app
pnpm dev:desktop
```

### Docker Development

```bash
# Start development environment
pnpm dev-start

# Build and start (rebuild containers)
pnpm dev-build

# Stop services
pnpm dev-stop

# Restart services
pnpm dev-restart

# View logs
pnpm dev-logs

# Check status
pnpm dev-status
```

### Build Commands

```bash
# Build individual projects
pnpm build:api       # Build API
pnpm build:web       # Build React web app
pnpm build:desktop   # Build Tauri desktop app
```

### Web Commands

```bash
# Preview production build
pnpm preview:web

# Run tests
pnpm test:web

# Lint code
pnpm lint:web

# Format code
pnpm format:web
```

API runs at `http://localhost:3000` (health: `/api/health`). Web runs at `http://localhost:5173`.

## 📚 API Endpoints (high-level)

All routes are under `/api`.
- Auth: `GET /auth/me`
- Projects: `GET/POST /projects`, `GET /projects/:id`, `GET /projects/:id/status`
- Processing: `POST /projects/:id/process` (queue trigger), realtime updates broadcast on `private-project.{id}`
- Posts: list/update/bulk, schedule/unschedule/auto-schedule, analytics, publish-now, hook workbench
- Transcripts: `GET/PUT /transcripts/:id`
- LinkedIn: `GET /linkedin/auth`, `GET /linkedin/callback`, `GET /linkedin/status`, `POST /linkedin/disconnect`
- Settings: profile/password/style
- Billing: checkout/portal/status

## 📄 License

Proprietary — All rights reserved.
