Title: Regenerate With Post Type Preset (Inertia)

Overview
- Add an optional “Post type preset” selector to the Regenerate dialog so users can request a style (e.g., Story, How‑to, Myth‑bust) when regenerating posts.
- Parity with the deprecated TanStack UI’s selector, but align payload with current backend.

Current State
- Backend `POST /api/posts/bulk/regenerate` accepts `{ ids: string[], customInstructions?: string }`.
- There is no `postType` field handled server-side yet.

Plan
- Phase 1 (UI-only, safe):
  - Add a dropdown with presets [story, how_to, myth_bust, listicle, case_study, announcement].
  - When a preset is selected, append a concise hint to `customInstructions` before sending (`e.g., “Preset: how_to — structure as steps with a practical takeaway.”`).
  - This preserves API compatibility while steering generation.
- Phase 2 (optional backend extension):
  - Extend validator in `PostsController::bulkRegenerate` to accept `postType?: string`.
  - Thread `postType` to the job (`RegeneratePostsJob`) and model prompt composition accordingly.
  - Update OpenAPI and orval clients.

Frontend (Inertia/Vue)
- Location: `apps/web/resources/js/Pages/Projects/Show.vue` Regenerate dialog.
- Add a `<select>` for “Post type (optional)”. Store state alongside the existing custom instructions.
- On submit:
  - Phase 1: If `postType` chosen, prefix the `customInstructions` with a well‑formed instruction (no API shape change).
  - Phase 2: Send `{ ids, customInstructions, postType }` once backend supports it.
- Accessibility: label the select, constrain to the known presets, keep dialog keyboard navigable.

Acceptance Criteria (Phase 1)
- Users can choose a preset and regenerate; the request succeeds without backend changes.
- The UI persists selection during a modal session and resets on close.

Testing
- Unit: transform function that composes `customInstructions` with preset hint.
- Manual: verify server receives standard payload; observe qualitative changes in regenerated posts.

Rollout
- Ship Phase 1 immediately; Phase 2 can follow with a small server change and orval refresh.

