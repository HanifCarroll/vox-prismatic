# Frontend Migration Plan: React (TanStack Start) → Laravel + Inertia + Vue 3

This document outlines how to migrate the frontend from the current React 19 + TanStack Start application in `apps/web` to a Laravel + Inertia + Vue 3 interface served by the Laravel app in `apps/api`.

This supersedes the earlier Livewire plan. Some Livewire scaffolding exists in the repo (routes and views). This plan replaces that approach with Inertia + Vue while keeping product behavior, real‑time progress, and publishing workflows intact.

## Goals

- Keep product behavior and terminology identical: Projects → Posts → Ready with human approval at the post stage only; publish-now and scheduling supported.
- Preserve real-time processing feedback (project.progress/completed/failed) and post regeneration events.
- Maintain the current API surface for non-web clients (desktop Tauri; future integrations) and for gradual migration.
- Reduce overall complexity by serving the app from Laravel using Inertia (no separate SPA shell), and centralize business logic in services/jobs.
- Keep security posture (Sanctum session auth, CSRF, CORS for external clients, broadcast auth via Reverb) and normalized API error handling.

## Pre‑migration Setup (Inertia + Vue)

- Packages (Laravel app under `apps/api`):
  - `composer require inertiajs/inertia-laravel`
  - `pnpm --filter ./apps/api add -D @vitejs/plugin-vue && pnpm --filter ./apps/api add vue @inertiajs/vue3`
- Inertia middleware: `php artisan inertia:middleware` (adds `App\Http\Middleware\HandleInertiaRequests`). Register it for web routes in `apps/api/bootstrap/app.php` via `$middleware->appendToGroup('web', [\App\Http\Middleware\HandleInertiaRequests::class]);`.
- Vite config: Add Vue plugin in `apps/api/vite.config.js` and keep `laravel-vite-plugin` + Tailwind 4.
- Layout: Replace Livewire layout usage with an Inertia root layout that includes `@vite` assets, `@inertiaHead`, and an `@inertia` mount point.
- Echo/Reverb: Reuse existing Echo bootstrap and env (`VITE_REVERB_*`) in `apps/api/resources/js/echo.js`.

## Current Architecture Snapshot

- API/backend: Laravel 12 app in `apps/api`
  - Routes: `apps/api/routes/api.php`, `apps/api/routes/web.php`, broadcasting channels in `apps/api/routes/channels.php`.
  - Controllers: `apps/api/app/Http/Controllers/*` (Auth, Projects, Posts, Transcripts, Scheduling, Settings, LinkedIn, Admin).
  - Jobs: `apps/api/app/Jobs/Projects/*` chain transcript cleaning, insight generation, and post creation with progress/completion/failure events.
  - Events: `apps/api/app/Events/*` broadcast `project.progress`, `project.completed`, `project.failed`, and `post.regenerated` on private channels.
  - Services/Domain: `apps/api/app/Services/AiService.php` and `apps/api/app/Domain/Projects/Actions/*` hold generation logic and DB writes.
  - Models: `apps/api/app/Models/*` (User, ContentProject, Post, Insight, scheduling/style prefs).
  - Realtime: Laravel Reverb configured; Echo bootstrap in `apps/api/resources/js/echo.js`.
  - Vite: `apps/api/vite.config.js` (Tailwind 4, laravel‑vite‑plugin).
- Livewire scaffolding (to be replaced):
  - `apps/api/routes/web.php` references Livewire `LoginPage`, `RegisterPage`, and basic Projects pages.
  - `apps/api/app/Livewire/*` with corresponding Blade views under `apps/api/resources/views/livewire/*` and a Livewire layout at `apps/api/resources/views/layouts/app.blade.php`.
- Web SPA (current): React app in `apps/web`
  - TanStack Start routes in `apps/web/src/routes/*` (projects list/detail/new, login/register, settings, calendar, admin, LinkedIn callback).
  - Orval‑generated Axios + React Query hooks (`apps/web/src/api/**/*`, `apps/web/src/lib/client/orval-fetcher.ts`).
  - Echo + Reverb at `apps/web/src/lib/realtime/echo.ts`.
  - Sanctum session with `/api/sanctum/csrf-cookie`, `POST /api/auth/login|register`.

## Target Architecture (Inertia + Vue 3)

- Single app: Serve all pages from the Laravel app in `apps/api` via Inertia responses and Vue 3 pages. Keep the existing API for external clients and for phased migration.
- State/interactivity: Use Inertia page props for reads, and Inertia `useForm`/actions for mutations. Prefer server‑driven props over ad‑hoc client fetching; reuse services/jobs for business rules.
- Auth: Session‑based via `web` middleware. Keep Sanctum for broadcasting auth and for existing `/api/*` endpoints.
- Realtime: Continue using Reverb + Echo. Initialize Echo in the Vue app and subscribe within page components.
- Styling/UX: Keep Tailwind 4 with Laravel Vite. Recreate current UX and apply accessibility/performance rules consistently.

## Routing and Pages (mapping)

Replace SPA routes with Laravel web routes that return Inertia pages. Keep `/api/*` endpoints for external clients and for any transitional client‑side calls.

Recommended top‑level routes (web middleware group):

- GET `/login` → `Auth\LoginController@show` → `Inertia::render('Auth/Login')`
- POST `/login` → `Auth\LoginController@login` (redirect on success/failure)
- GET `/register` → `Auth\RegisterController@show` → `Inertia::render('Auth/Register')`
- POST `/register` → `Auth\RegisterController@register`
- POST `/logout` → invalidate session + redirect to `/login`
- GET `/projects` → `Projects\IndexController@show` → `Inertia::render('Projects/Index', props: { items, meta, filters })`
- GET `/projects/new` → `Projects\CreateController@show` → `Inertia::render('Projects/New')`
- POST `/projects` → `Projects\CreateController@store` (enqueue processing and redirect to show)
- GET `/projects/{project}` → `Projects\ShowController@show` → `Inertia::render('Projects/Show', props: { project, posts, progress })`
- PATCH `/projects/{project}` → update title/transcript
- POST `/projects/{project}/process` → enqueue processing
- Settings, Calendar, Admin, LinkedIn callback pages map 1:1 to current SPA screens

Notes:
- Prefer controllers to perform queries and pass typed props to pages. This keeps Vue components thin and removes the need for Orval/React Query on web.
- For mutation endpoints, redirect back with flash messages; the Vue pages can read shared props/flash via Inertia’s shared data.

Realtime wiring in Vue:
- Initialize Echo once in `resources/js/app.js` and provide on `app.config.globalProperties.$echo`.
- Subscribe in `Projects/Show.vue` to `private-project.{id}` and handle `project.progress`, `project.completed`, `project.failed` and `post.regenerated`.
- Keep a polling fallback to `GET /api/projects/{id}/status` if sockets aren’t available.

## Auth and Security

- Use `web` middleware with sessions and CSRF for all Inertia pages/forms. Inertia’s `useForm` posts to web routes and expects redirects.
- Keep Sanctum’s `statefulApi()` in `apps/api/bootstrap/app.php` so broadcasting auth (`/broadcasting/auth`) accepts session cookies.
- Rate limit sensitive flows using named limiters (login, LinkedIn OAuth) as today.
- Continue normalized API error responses for `/api/*` routes. Web routes render/redirect with flash state, not JSON.

## Data and Business Logic Reuse

- Prefer controllers (for web routes) to call services/domain actions directly (e.g., `AiService`, `GeneratePostsAction`) and Eloquent models for reads/writes.
- Where existing API controllers contain business rules (e.g., `PostsController.php` bulk operations), extract shared logic into `app/Services/*` or `app/Domain/*` for reuse across API + web.
- Preserve DB integrity and constraints; map unique/conflict errors to user‑friendly flash messages on web.

## Testing Strategy

- Feature tests for web routes using Inertia test helpers (`assertInertia`) to verify page/component names and props. Continue API HTTP feature tests for `/api/*`.
- Assert redirects/flash on form submissions and DB writes for mutations.
- Keep tests deterministic; reuse database transactions and stub external services (LinkedIn, Vertex) as today.

## Deployment and Dev Workflow Changes

- Development
  - Serve both API and web from the Laravel app.
  - Vite dev server is configured in `apps/api` (`pnpm --filter ./apps/api dev`).
  - Docker: `docker-compose.dev.yml` runs the API, queue worker, and reverb. `apps/web` can be disabled once major pages are ported.

- Production
  - Remove the `web` SPA service from `docker-compose.prod.yml` when migration is complete.
  - Serve pages from the `api` service behind the reverse proxy. Keep `/api/*` endpoints for external clients.

## Accessibility, UX, and Performance Notes

Apply the existing MUST/SHOULD/NEVER rules from the Project Agent Guide to Inertia + Vue pages:

- Keyboard and focus: visible focus rings, proper focus management in modals/drawers; prefer native semantics.
- Forms: keep submit enabled until request starts; disable during request + show spinner; use idempotency keys for bulk actions; inline errors; focus first error on submit.
- Navigation and state: canonical URLs for deep‑links (filters/tabs via query params); preserve Back/Forward and scroll restoration.
- Realtime feedback: polite `aria-live` regions for toasts/status; confirm destructive actions or provide Undo.
- Performance: minimize reflows; keep mutations <500ms; virtualize only when necessary; preload above‑the‑fold assets; lazy‑load the rest via Vite.

## Phased Migration Plan

1) Foundations (Day 1–2)
- Add Inertia + Vue, Vue plugin for Vite, and the Inertia middleware.
- Replace the Livewire layout with an Inertia root layout including `@inertiaHead` and `@inertia`.
- Create `resources/js/app.js` with `createInertiaApp`, register Echo, and a base `AppLayout.vue`.

2) Auth and Shell (Day 2–3)
- Build `Auth/Login.vue` and `Auth/Register.vue` using Inertia `useForm` that post to web routes; server handles Auth and redirects.
- Build the app shell (sidebar/topbar) in Vue; share `auth.user` via Inertia’s shared props.

3) Projects (Day 3–6)
- Index: controller returns paginated projects with filters; page shows list, filter chips, and delete action.
- New: form to create a project (title + transcript/URL); on submit, create and redirect to Show; backend enqueues processing.
- Show: transcript and posts tabs; inline edit/save; progress bar listens to Echo events with polling fallback.

4) Posts (Day 6–9)
- Implement inline edit/save; status changes; bulk actions; autoschedule; schedule/unschedule; publish now, reusing service/domain logic.

5) Settings, Scheduling, LinkedIn (Day 9–11)
- Profile, Password, Style pages mapping to existing validation rules.
- Scheduling preferences and time slots using existing tables.
- LinkedIn connect/disconnect/status: call existing `/api/linkedin/*` endpoints; redirect from callback to an Inertia page.

6) Admin and Cleanup (Day 11–12)
- Admin dashboard (usage + user trial updates).
- Remove SPA `apps/web` from production compose; keep API endpoints stable.
- Add Inertia feature tests for critical flows.

7) Decommission SPA and Livewire (Day 13–14)
- Remove/disable `apps/web` after parity validation.
- Remove Livewire classes and views; update `apps/api/routes/web.php` to Inertia controllers only.
- Update README and deployment docs accordingly.

## Backwards Compatibility

- Keep all `/api/*` endpoints and error shapes unchanged for the Tauri app and future integrations.
- Broadcasting channels and events remain identical. Frontend listeners move from React hooks to Echo listeners in Vue.
- Cookies and CSRF behavior remain compatible; only the consumer changes.

## Risks and Mitigation

- Business logic duplication between API controllers and web controllers
  - Mitigation: extract shared logic into `app/Services/*` and `app/Domain/*`; migrate progressively.

- Realtime event handling differences
  - Mitigation: reuse Echo setup; provide polling fallback; keep handlers small and resilient to payload shape.

- OAuth callback flow with different route hostnames
  - Mitigation: keep using existing `/api/linkedin/*` endpoints; redirect to an Inertia page on success/failure.

## Quick References (files in this repo)

- Events: `apps/api/app/Events/ProjectProcessingProgress.php`, `apps/api/app/Events/ProjectProcessingCompleted.php`, `apps/api/app/Events/ProjectProcessingFailed.php`, `apps/api/app/Events/PostRegenerated.php`
- Jobs: `apps/api/app/Jobs/Projects/CleanTranscriptJob.php`, `GenerateInsightsJob.php`, `GeneratePostsJob.php`
- Channels: `apps/api/routes/channels.php`
- Controllers: `apps/api/app/Http/Controllers/*`
- Services/Domain: `apps/api/app/Services/AiService.php`, `apps/api/app/Domain/Projects/Actions/*`
- Echo (API app): `apps/api/resources/js/echo.js`
- Echo (SPA reference): `apps/web/src/lib/realtime/echo.ts`
- SPA routes of interest: `apps/web/src/routes/projects.$projectId.tsx`, `apps/web/src/routes/projects.index.tsx`, `apps/web/src/routes/login.tsx`, `apps/web/src/routes/register.tsx`

---

Implementation notes and code stubs (for later PRs):

- Vite config (Vue plugin) in `apps/api/vite.config.js`:
  ```js
  import vue from '@vitejs/plugin-vue';
  // ...
  export default defineConfig({
    plugins: [laravel({ input: ['resources/css/app.css', 'resources/js/app.js'], refresh: true }), tailwindcss(), vue()],
  });
  ```
- Inertia/Vue bootstrap in `apps/api/resources/js/app.js`:
  ```js
  import { createApp, h } from 'vue';
  import { createInertiaApp } from '@inertiajs/vue3';
  import './bootstrap';
  import '../css/app.css';

  createInertiaApp({
    resolve: (name) => import(`./Pages/${name}.vue`),
    setup({ el, App, props, plugin }) {
      const app = createApp({ render: () => h(App, props) });
      app.use(plugin);
      app.config.globalProperties.$echo = window.Echo;
      app.mount(el);
    },
  });
  ```
- Root Blade layout in `apps/api/resources/views/app.blade.php`:
  ```blade
  <!DOCTYPE html>
  <html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @inertiaHead
  </head>
  <body class="font-sans antialiased bg-zinc-50 text-zinc-900 min-h-screen">
    @inertia
  </body>
  </html>
  ```
