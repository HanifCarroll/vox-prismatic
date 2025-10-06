Title: Hook Workbench (Inertia)

Overview
- Add a Hook Workbench to the Inertia app so users can generate opening “hook” lines for a selected post, preview them, and apply a chosen hook to the draft.
- This ports parity from the deprecated TanStack UI while aligning with Laravel conventions and the existing API in `PostsController::hookWorkbench`.

Goals
- Generate 3–5 hook variants using selectable frameworks and an optional custom focus.
- Preview a recommended hook and any variant applied to the current post content.
- Apply a selected hook to update the draft (opening line merge) without persisting until the user saves.

Out of Scope
- Persisting hooks separately.
- Editing the frameworks list via UI (server provides fixed list).

Backend
- API already exists: `POST /api/posts/{id}/hooks/workbench` in `apps/web/app/Http/Controllers/PostsController.php`.
- No backend changes required for MVP.

Frontend (Inertia/Vue)
- Location: `apps/web/resources/js/Pages/Projects/Show.vue` and new components under `apps/web/resources/js/Pages/Projects/components/`.
- Add “Hook Workbench” button near the post editor actions (visible when a post is selected).
- Create `HookWorkbenchDrawer.vue` with:
  - Props: `open`, `post`, `baseContent` (string), `onClose`, `onApplyHook(hook: string)`.
  - Fetch frameworks lazily from `GET /api/posts/hooks/frameworks` (or inline list from API response if added server-side in future).
  - Controls: multi-select up to 5 frameworks, variant count (3–5), optional custom focus text (<= 240 chars).
  - On “Generate hooks”: call `POST /api/posts/{id}/hooks/workbench` with `{ frameworkIds?: string[], customFocus?: string, count?: number }`.
  - Show returned `hooks[]`, `summary?`, and `recommendedId`.
  - Allow “Preview” (merge hook into content for side-by-side preview) and “Use hook” (fires `onApplyHook`).
  - Apply reduced-motion preferences and trap focus in the drawer per APG.
- Post editor integration:
  - Add state: `hookWorkbenchOpen`.
  - Add button to open drawer; disable if no post selected.
  - On apply: merge returned hook into current editor content (front-end merge util, same behavior as TS app).

UX Notes
- Respect reduced motion for drawer transitions.
- Keep drawer keyboard navigable; ensure buttons have accessible names.
- Show loading states and inline error toasts.

Acceptance Criteria
- When a post is selected, the user can open Hook Workbench, generate hooks, preview, and apply to the draft.
- The draft content updates locally; saving persists as usual.
- Errors from the API are surfaced as toasts and non-blocking.

Testing
- Unit: content merge utility (opening line detection/replace) and drawer state transitions.
- Feature: happy path (generate → apply), validation errors (invalid count), and API error handling.

Rollout
- Ship behind no flag; feature is self-contained UI using existing API.

