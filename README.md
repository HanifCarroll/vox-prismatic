# Content Creation Monorepo (Laravel + Vue)

An intelligent content workflow built as a pnpm workspace. It transforms long‑form content (podcasts, videos, articles) into LinkedIn‑ready posts with a project‑centric lifecycle and a Laravel web app (API + Inertia/Vue UI).

## 🎯 Overview

- **AI-assisted insights** extracted from transcripts
- **Human review** at key stages
- **Post generation** tailored for LinkedIn 
- **Scheduling** via a background worker
- **One-click local stack** with Docker

## 🧰 Tech Stack

- Web App (UI + API): Laravel + Inertia + Vue 3
- Auth: Sanctum (cookie-based SPA)
- DB: Postgres
- Web (legacy): React 19, TanStack Router/Query, Tailwind 4
- HTTP Client (legacy): Axios + React Query wrappers (manually maintained)
- Desktop: Tauri v2 (optional)
- Package manager: pnpm

### Monorepo Structure

```
apps/
  web/              # Laravel app (API + Inertia/Vue UI)
  desktop/          # Tauri v2 desktop (optional)
docs/
```

### Services

- Web App (Laravel): `/api/*`, health at `/api/health`, realtime via Reverb/Echo.
- Vue Dev (Vite): `http://localhost:5173` (service: `web-vite`).
- Desktop (Tauri): optional local tooling; launch via `pnpm dev:desktop`.

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

Use Docker for a consistent local stack:

```bash
# Start Laravel app, Vite dev server, DB, etc.
pnpm dev-start

# Desktop app (optional)
pnpm dev:desktop
```

### Docker Development

```bash
# Refresh PHP dependencies (shared vendor volume)
pnpm dev-deps

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

> Run `pnpm dev-deps` whenever `apps/web/composer.lock` changes to refresh the shared vendor volume before starting containers. If you add JS deps for the Vue app, `pnpm dev-deps` also installs them inside the `web-vite` container.

### Build Commands

```bash
# Build individual projects
pnpm build:web-app    # Build Laravel (UI + API)
pnpm build:web        # Build legacy React app
pnpm build:desktop    # Build Tauri desktop app
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

Laravel serves API at `http://localhost:3000` (health: `/api/health`). Vue dev server runs at `http://localhost:5173`. Legacy React dev at `http://localhost:5174`.

## 📄 License

Proprietary — All rights reserved.
