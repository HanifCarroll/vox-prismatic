Project Agent Guide

Scope
- This guide applies to the entire repository. Use these conventions when creating or modifying any backend or shared code. Frontend projects should align with response shapes and schemas defined here.

Product Context
- Goal: Turn a single source of truth (transcript, URL, or text) into multiple LinkedIn-ready posts via a guided lifecycle.
- MVP Focus: LinkedIn only. Processing runs asynchronously via a queued job with realtime progress over WebSockets.
- Core entities: User, ContentProject, Insight (internal), Post. Human approval at the post stage only.
- Key stages: Processing → Posts → Ready. Scheduling/publishing are supported (publish-now + scheduled via command), while approval remains at the post stage.
- UX principles: Project-centric navigation, clear empty states, bulk actions, and consistent terminology.

**IMPORTANT**
- If you ever make a change that requires restarting certain docker containers for it to take effect, please restart it yourself.
- Use ast-grep when possible

Repo Runtime Notes (Local + Docker)
- Monorepo uses pnpm workspaces. Primary app is `apps/web` (Laravel + Inertia/Vue). Optional desktop app lives in `apps/desktop` (Tauri + React).
- Dev stack via `docker-compose.dev.yml`:
  - `web-app` (Laravel API/UI), `web-vite` (Vite dev), `db` (Postgres), `redis`, `reverb` (WebSockets), `scheduler`, `queue-worker`.
  - Ports (dev): API `http://localhost:3001` (health: `/up`), Vite `http://localhost:5173`.
  - Commands: `pnpm dev-deps` (refresh vendor/node deps), `pnpm dev-start`, `pnpm dev-restart`, `pnpm dev-restart:web-app`, `pnpm dev-logs`, `pnpm dev-status`.
- After changing `.env`, composer deps, broadcasting, queue config, or migrations, restart the relevant services (`web-app`; for realtime also `reverb`; for queues `queue-worker`).

Backend Conventions (Laravel)
- Framework: Laravel 12 (PHP 8.2), Postgres. The Laravel app lives under `apps/web`.
- Structure (by domain feature):
  - Routes: `routes/web.php` handles the authenticated Inertia UI; `routes/api.php` remains as an empty placeholder for backward compatibility.
  - Controllers: `app/Http/Controllers/*Controller.php` — request validation and response shaping.
  - Services: `app/Services/*` — business logic (e.g., `AiService`).
- Jobs: `app/Jobs/*` — background processing (e.g., `Projects/GenerateInsightsJob`).
  - Middleware: `app/Http/Middleware/*` (e.g., `HandleInertiaRequests`).
  - Exceptions: `app/Exceptions/*` with `AppException` + `ErrorCode` enum; normalized error rendering in `bootstrap/app.php`.
  - Models: `app/Models/*` with Eloquent + casts.
  - Database: `database/migrations/*` define schema, FKs, constraints (Postgres; includes `text[]` for hashtags).
  - Tests: `tests/Feature` for HTTP integration and `tests/Unit` for utilities.
- Validation:
  - Use `$request->validate([...])` in controllers or dedicated FormRequest classes when complex.
  - Normalize identity fields at boundaries (e.g., `email = strtolower(trim(email))`).
- Errors:
  - Throw `AppException` subclasses where appropriate (Validation, Unauthorized, Forbidden, NotFound, Conflict, Internal).
  - Controllers should translate domain exceptions into user-facing validation errors or flash messages for Inertia responses.
- Auth:
  - Session-based auth via the `web` guard. Login/register live at `/login` and `/register`; logout posts to `/logout`.
  - Use `Auth::login`, `Auth::attempt`, `Auth::logout` for session lifecycle.
  - Passwords hashed with bcrypt (`Hash::make`, rounds via `BCRYPT_ROUNDS`). Enforce strong passwords (min 12, mixed case, numbers, symbols, uncompromised).
- Security:
  - Rate limiting via named limiters in `bootstrap/app.php` (e.g., `throttle:login`, `throttle:linkedin-oauth`).
  - CSRF handled by the `web` middleware stack. Webhook/callback routes are exempted via `validateCsrfTokens(except: ...)` in `bootstrap/app.php`.
- Logging & Errors:
  - Laravel logging (`stack` channel) captures request context by default; controllers should include `X-Request-Id` headers when responding with JSON.
- Database:
  - Postgres via `config/database.php`. Schema managed in migrations. Prefer lower-cased emails at auth layer.
  - Core models: User, ContentProject, Insight (internal), Post. Keep business rules in services/jobs; keep integrity in DB (FKs, unique).

Generation & Pipeline
- Processing is asynchronous via a chained queue pipeline (`GenerateInsightsJob` → `GeneratePostsJob`) on the `processing` queue. `POST /projects/{id}/process` enqueues work; live status broadcasts emit on private channels.
- Realtime transport: WebSockets via Laravel Reverb + Laravel Echo (Pusher protocol). Clients subscribe to `project.{projectId}` and `user.{userId}` (see `routes/channels.php`).
- Events: `project.progress` ({ step, progress }), `project.completed`, and `project.failed`. Post regeneration emits `post.regenerated` on both `user.{userId}` and (when available) `project.{projectId}`.
- Generate 5–10 post drafts per transcript; insights are persisted internally (not exposed for approval).
- LinkedIn: OAuth via Socialite (`openid profile email w_member_social`). `GET /settings/linked-in/auth` initiates auth; `/linkedin/callback` stores the token; disconnect handled through `/settings/linked-in/disconnect`.
- Publish now: `POST /projects/{project}/posts/{post}/publish` (UGC Posts API). Scheduling: store `scheduled_at`; a scheduled command `posts:publish-due` publishes eligible posts.

Testing
- Don't write tests.

- Vite powers the Inertia front-end build. In Docker dev, the `web-vite` service runs automatically; for bare-metal dev, run `pnpm run dev` within `apps/web`.
- When adding HTTP interactions, prefer standard Inertia form helpers (`useForm`) or Laravel form posts; surface validation errors via session flashes.

Project Start & Listening
- Create project auto-queues processing on the backend. The detail page does not re-trigger processing on mount.
- The UI only subscribes to realtime updates while `stage === 'processing'` and shows “Starting…” if no step yet.
- Expose a user-initiated action (e.g., Regenerate) to call `POST /projects/{id}/process`. If the project is already processing, surface a friendly validation error and leave UI state unchanged.

Notes for Contributors
- Keep changes focused and minimal; prefer small, reviewable PRs.
- Follow Laravel conventions and PHP 8.2 features. Run Pint for style when applicable; keep types/casts explicit on models.
- Don’t commit secrets. Use `.env` for local dev; mirror additions in `.env.example`.
- Refresh PHP dependencies via the shared Docker volume: run `pnpm dev-deps` (powers the `deps` service) after updating `apps/web/composer.lock` and before `pnpm dev-start`.

Concise rules for building accessible, fast, delightful UIs Use MUST/SHOULD/NEVER to guide decisions

## Interactions

- Keyboard
  - MUST: Full keyboard support per [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/)
  - MUST: Visible focus rings (`:focus-visible`; group with `:focus-within`)
  - MUST: Manage focus (trap, move, and return) per APG patterns
- Targets & input
  - MUST: Hit target ≥24px (mobile ≥44px) If visual <24px, expand hit area
  - MUST: Mobile `<input>` font-size ≥16px or set:
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    ```
  - NEVER: Disable browser zoom
  - MUST: `touch-action: manipulation` to prevent double-tap zoom; set `-webkit-tap-highlight-color` to match design
- Inputs & forms (behavior)
  - MUST: Hydration-safe inputs (no lost focus/value)
  - NEVER: Block paste in `<input>/<textarea>`
  - MUST: Loading buttons show spinner and keep original label
  - MUST: Enter submits focused text input In `<textarea>`, ⌘/Ctrl+Enter submits; Enter adds newline
  - MUST: Keep submit enabled until request starts; then disable, show spinner, use idempotency key
  - MUST: Don’t block typing; accept free text and validate after
  - MUST: Allow submitting incomplete forms to surface validation
  - MUST: Errors inline next to fields; on submit, focus first error
  - MUST: `autocomplete` + meaningful `name`; correct `type` and `inputmode`
  - SHOULD: Disable spellcheck for emails/codes/usernames
  - SHOULD: Placeholders end with ellipsis and show example pattern (eg, `+1 (123) 456-7890`, `sk-012345…`)
  - MUST: Warn on unsaved changes before navigation
  - MUST: Compatible with password managers & 2FA; allow pasting one-time codes
  - MUST: Trim values to handle text expansion trailing spaces
  - MUST: No dead zones on checkboxes/radios; label+control share one generous hit target
- State & navigation
  - MUST: URL reflects state (deep-link filters/tabs/pagination/expanded panels) Prefer libs like [nuqs](https://nuqs.dev)
  - MUST: Back/Forward restores scroll
  - MUST: Links are links—use `<a>/<Link>` for navigation (support Cmd/Ctrl/middle-click)
- Feedback
  - SHOULD: Optimistic UI; reconcile on response; on failure show error and rollback or offer Undo
  - MUST: Confirm destructive actions or provide Undo window
  - MUST: Use polite `aria-live` for toasts/inline validation
  - SHOULD: Ellipsis (`…`) for options that open follow-ups (eg, “Rename…”)
- Touch/drag/scroll
  - MUST: Design forgiving interactions (generous targets, clear affordances; avoid finickiness)
  - MUST: Delay first tooltip in a group; subsequent peers no delay
  - MUST: Intentional `overscroll-behavior: contain` in modals/drawers
  - MUST: During drag, disable text selection and set `inert` on dragged element/containers
  - MUST: No “dead-looking” interactive zones—if it looks clickable, it is
- Autofocus
  - SHOULD: Autofocus on desktop when there’s a single primary input; rarely on mobile (to avoid layout shift)

## Animation

- MUST: Honor `prefers-reduced-motion` (provide reduced variant)
- SHOULD: Prefer CSS > Web Animations API > JS libraries
- MUST: Animate compositor-friendly props (`transform`, `opacity`); avoid layout/repaint props (`top/left/width/height`)
- SHOULD: Animate only to clarify cause/effect or add deliberate delight
- SHOULD: Choose easing to match the change (size/distance/trigger)
- MUST: Animations are interruptible and input-driven (avoid autoplay)
- MUST: Correct `transform-origin` (motion starts where it “physically” should)

## Layout

- SHOULD: Optical alignment; adjust by ±1px when perception beats geometry
- MUST: Deliberate alignment to grid/baseline/edges/optical centers—no accidental placement
- SHOULD: Balance icon/text lockups (stroke/weight/size/spacing/color)
- MUST: Verify mobile, laptop, ultra-wide (simulate ultra-wide at 50% zoom)
- MUST: Respect safe areas (use env(safe-area-inset-*))
- MUST: Avoid unwanted scrollbars; fix overflows

## Content & Accessibility

- SHOULD: Inline help first; tooltips last resort
- MUST: Skeletons mirror final content to avoid layout shift
- MUST: `<title>` matches current context
- MUST: No dead ends; always offer next step/recovery
- MUST: Design empty/sparse/dense/error states
- SHOULD: Curly quotes (“ ”); avoid widows/orphans
- MUST: Tabular numbers for comparisons (`font-variant-numeric: tabular-nums` or a mono like Geist Mono)
- MUST: Redundant status cues (not color-only); icons have text labels
- MUST: Don’t ship the schema—visuals may omit labels but accessible names still exist
- MUST: Use the ellipsis character `…` (not '...')
- MUST: `scroll-margin-top` on headings for anchored links; include a “Skip to content” link; hierarchical `<h1–h6>`
- MUST: Resilient to user-generated content (short/avg/very long)
- MUST: Locale-aware dates/times/numbers/currency
- MUST: Accurate names (`aria-label`), decorative elements `aria-hidden`, verify in the Accessibility Tree
- MUST: Icon-only buttons have descriptive `aria-label`
- MUST: Prefer native semantics (`button`, `a`, `label`, `table`) before ARIA
- SHOULD: Right-clicking the nav logo surfaces brand assets
- MUST: Use non-breaking spaces to glue terms: `10&nbsp;MB`, `⌘&nbsp;+&nbsp;K`, `Vercel&nbsp;SDK`

## Performance

- SHOULD: Prefer uncontrolled inputs; make controlled loops cheap (keystroke cost)
- MUST: Virtualize large lists (eg, `virtua`)
- MUST: Preload only above-the-fold images; lazy-load the rest
- MUST: Prevent CLS from images (explicit dimensions or reserved space)

## Design

- SHOULD: Layered shadows (ambient + direct)
- SHOULD: Crisp edges via semi-transparent borders + shadows
- SHOULD: Nested radii: child ≤ parent; concentric
- SHOULD: Hue consistency: tint borders/shadows/text toward bg hue
- MUST: Accessible charts (color-blind-friendly palettes)
- MUST: Meet contrast—prefer [APCA](https://www.myndex.com/APCA/) over WCAG 2
- MUST: Increase contrast on `:hover/:active/:focus`
- SHOULD: Match browser UI to bg
- SHOULD: Avoid gradient banding (use masks when needed)
