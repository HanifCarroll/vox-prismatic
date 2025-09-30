# Content Creation Monorepo (Supabase + Hono + React)

An intelligent content workflow built as a pnpm workspace. It transforms long‑form content (podcasts, videos, articles) into LinkedIn‑ready posts with a project‑centric lifecycle, Supabase Auth/DB, and a Hono API.

## 🎯 Overview

- **AI-assisted insights** extracted from transcripts
- **Human review** at key stages
- **Post generation** tailored for LinkedIn and X
- **Scheduling** via a background worker
- **One-click local stack** with Docker or Bun

## 🧰 Tech Stack

- API: Hono (TypeScript, ESM), supabase-js, SSE, Pino logger
- Auth: Supabase Auth (JWT). Frontend signs in via supabase-js; API validates tokens with Supabase
- DB: Supabase Postgres with RLS (see `docs/supabase/schema.sql`)
- Web: React 19, TanStack Router/Query, Tailwind 4
- Desktop: Tauri v2 (optional)
- Package manager: pnpm

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
apps/
  api/            # Hono API (TypeScript, supabase-js)
  web/            # Vite React app
  desktop-tauri/  # Tauri v2 desktop (optional)
  shared-types/   # Zod schemas + types shared FE/BE
docs/
  supabase/       # SQL schema + RLS policies
```

### Services

- API (Hono): `/api/*`, health at `/api/health`, SSE endpoints for processing/status.
- Web (React): Vite dev at `http://localhost:5173`.
- Desktop (Tauri): optional local tooling; launch via `pnpm desktop`.

### Desktop Features
- Audio recording with real-time duration tracking
- Meeting detection (Zoom, Google Meet, etc.)
- System tray/background operation
- Local audio file management and playback
- Automatic transcription integration with the API
- Built with Tauri v2, Vite, React 19

## 📦 Database & Infrastructure

- Supabase Postgres with RLS (no ORM migrations). Apply `docs/supabase/schema.sql` in the Supabase SQL editor.
- Profiles (uuid=auth.users.id) store LinkedIn and Stripe fields; app data tables reference profiles.id.

## 🔐 Environment Variables

See `apps/api/.env.example` and `apps/web/.env` for complete lists. Core keys:

API (`apps/api/.env`)
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CORS_ORIGIN=http://localhost:5173
GEMINI_API_KEY=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/linkedin/callback
LINKEDIN_FE_REDIRECT_URL=http://localhost:5173/integrations/linkedin/callback
```

Web (`apps/web/.env`)
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 🚀 Running Locally

```bash
# Install JS deps
pnpm install

# Start API + Web together
pnpm dev

# Start individually
pnpm dev:api      # Hono API (http://localhost:3000)
pnpm dev:web      # Vite React (http://localhost:5173)
pnpm desktop      # Tauri app
```

### Build Commands

```bash
# Build individual projects
pnpm run build:api      # Build .NET solution (Release)
pnpm run build:web      # Build Angular web app
pnpm run build:desktop  # Build Tauri desktop app
```

API runs at `http://localhost:3000` (health: `/api/health`). Web runs at `http://localhost:5173`.

## 🐳 Docker

`docker-compose.prod.yml` builds the API and Web. Supply Supabase env vars (see file). DB is managed by Supabase; no local Postgres required.

## 📚 API Endpoints (high-level)

All routes are under `/api`.
- Auth: `GET /auth/me`
- Projects: `GET/POST /projects`, `GET /projects/:id`, `GET /projects/:id/status`
- Processing: `POST /projects/:id/process` (SSE), `GET /projects/:id/process/stream` (SSE)
- Posts: list/update/bulk, schedule/unschedule/auto-schedule, analytics, publish-now, hook workbench
- Transcripts: `GET/PUT /transcripts/:id`
- LinkedIn: `GET /linkedin/auth`, `GET /linkedin/callback`, `GET /linkedin/status`, `POST /linkedin/disconnect`
- Settings: profile/password/style
- Billing: checkout/portal/status

## 🧪 Development

```bash
# Type check
pnpm --filter api typecheck
pnpm --filter web typecheck

# Lint/format
pnpm --filter api check && pnpm --filter api format
pnpm --filter web check && pnpm --filter web format
```

## 🔄 Architecture Highlights

- Project‑centric workflow with SSE and optimistic UI
- Supabase Auth + RLS simplify identity and access control
- Frontend uses shared Zod schemas for runtime validation + typing
- Background scheduler (service‑role) publishes due posts to LinkedIn

## 📄 License

Proprietary — All rights reserved.
