Project Agent Guide

Scope
- This guide applies to the entire repository. Use these conventions when creating or modifying any backend or shared code. Frontend projects should align with response shapes and schemas defined here.

Product Context (from docs/prd.md)
- Goal: Turn a single source of truth (transcript, URL, or text) into multiple LinkedIn-ready posts via a guided lifecycle.
- MVP Focus: LinkedIn only. No background jobs; use synchronous processing with SSE.
- Core entities: User, ContentProject, Insight (internal), Post. Human approval at the post stage only.
- Key stages: Processing → Posts → Ready (MVP). Scheduling/publishing are deferred for post-MVP.
- UX principles: Project-centric navigation, clear empty states, bulk actions, and consistent terminology.

Backend Conventions (API)
- Framework: Hono (TypeScript, ESM). One module folder per domain feature.
- Module structure:
  - module.routes.ts: Route definitions, request validation.
  - module.middleware.ts: Domain-specific middleware.
  - module.service.ts or module.ts: Business logic and database access.
  - index.ts: Public exports for the module.
  - __tests__/: Integration and utility tests.
- Validation:
  - Use Zod schemas with `validateRequest(target, schema)` middleware.
  - Normalize identity fields at boundaries (e.g., `email.trim().toLowerCase()`).
- Errors:
  - Throw only `AppException` subclasses (e.g., ValidationException, UnauthorizedException).
  - Error response shape is consistent: `{ error, code, status, details? }`.
  - Map low-level errors (e.g., DB unique violations) to appropriate exceptions (e.g., Conflict).
- Auth:
  - Use bcrypt for password hashing. Enforce password strength with utility.
  - JWT: HS256, expiration from `JWT_EXPIRES_IN`.
  - Token verification failures use a consistent code (`INVALID_TOKEN`).
  - `extractBearerToken` is case-insensitive and trims whitespace; returns `null` if missing/empty.
  - For MVP, trust JWT payload in middleware; for stricter flows, fetch from DB.
- Security:
  - Security headers via `secureHeaders` middleware.
  - CORS defaults to Vite (`http://localhost:5173`). Allow overriding with `CORS_ORIGIN`.
  - Rate limiting: Use preconfigured limiters for sensitive routes. Allow disabling in dev via `DISABLE_RATE_LIMIT=true`.
- Logging & Errors:
  - Pino logger with file + console streams. Keep request/response logs at info level.
  - Central `errorHandler` attaches safe details only in development.
- Database:
  - Drizzle ORM + Postgres. Keep constraints in schema (e.g., unique email). Consider citext or unique index on lower(email) for case-insensitive emails.

Shared Types (packages)
- Package: `@content/shared-types` under `apps/shared-types` for FE/BE contract.
  - Export Zod schemas and inferred types for common payloads (users, auth requests/responses, error shape).
- Frontends should import schemas for runtime validation and type inference.

Generation & pipeline (MVP)
- Processing generates 5–10 post drafts per transcript with SSE progress.
- Insights are persisted internally for traceability and future improvements but not exposed for approval.
 - LinkedIn OAuth + publish-now supported (UGC posts API).
-

API Design Guidelines
- Responses:
  - Keep small, stable envelopes (e.g., `{ user, token }` for auth, `{ items, meta }` for lists).
  - Never leak sensitive fields (e.g., passwordHash).
- Pagination:
  - Use `page`, `pageSize`; respond with `meta: { page, pageSize, total }`.
- Rate limiting headers:
  - Send `X-RateLimit-*` and `Retry-After` when applicable.

Testing
- Integration tests using Hono’s `app.request`.
- Unit tests for utils (e.g., password validation, token extraction).
- Mock DB and rate limiter in tests to keep them fast and deterministic.

FE Integration (Vite React)
- Default CORS origin is `http://localhost:5173` with `credentials: true` and `Authorization` header allowed.
- Error handling in FE should rely on `{ error, code, status, details? }` shape.
- Consume shared Zod schemas from `@content/shared-types` for request/response validation and typing.

Notes for Contributors
- Keep changes focused and minimal; prefer small, reviewable PRs.
- Follow TS strict mode. Avoid any unless necessary; type narrow aggressively at boundaries.
- Don’t commit secrets. Use `.env` for local dev; mirror additions in `.env.example`.

Concise rules for building accessible, fast, delightful UIs Use MUST/SHOULD/NEVER to guide decisions

## Interactions

- Keyboard
  - MUST: Full keyboard support per [WAI-ARIA APG](https://wwww3org/WAI/ARIA/apg/patterns/)
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
- MUST: Use the ellipsis character `…` (not ``)
- MUST: `scroll-margin-top` on headings for anchored links; include a “Skip to content” link; hierarchical `<h1–h6>`
- MUST: Resilient to user-generated content (short/avg/very long)
- MUST: Locale-aware dates/times/numbers/currency
- MUST: Accurate names (`aria-label`), decorative elements `aria-hidden`, verify in the Accessibility Tree
- MUST: Icon-only buttons have descriptive `aria-label`
- MUST: Prefer native semantics (`button`, `a`, `label`, `table`) before ARIA
- SHOULD: Right-clicking the nav logo surfaces brand assets
- MUST: Use non-breaking spaces to glue terms: `10&nbsp;MB`, `⌘&nbsp;+&nbsp;K`, `Vercel&nbsp;SDK`

## Performance

- SHOULD: Test iOS Low Power Mode and macOS Safari
- MUST: Measure reliably (disable extensions that skew runtime)
- MUST: Track and minimize re-renders (React DevTools/React Scan)
- MUST: Profile with CPU/network throttling
- MUST: Batch layout reads/writes; avoid unnecessary reflows/repaints
- MUST: Mutations (`POST/PATCH/DELETE`) target <500 ms
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
- MUST: Meet contrast—prefer [APCA](https://apcacontrastcom/) over WCAG 2
- MUST: Increase contrast on `:hover/:active/:focus`
- SHOULD: Match browser UI to bg
- SHOULD: Avoid gradient banding (use masks when needed)