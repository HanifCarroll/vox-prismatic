# Feature: Post Pipeline & Scheduling Refactor

## Context
`App\Domain\Projects\Actions\GeneratePostsAction` combines style profile loading, objective scheduling, prompt construction, AI invocation, hashtag normalization, and transactional persistence. `App\Http\Controllers\Web\PostsController` adds 550+ lines of responsibilities: CRUD, bulk actions, LinkedIn publishing, manual scheduling, auto-scheduling, hook workbench prompts, and repeated state mutations. Post lifecycle updates (pending → approved → scheduled/published) are hand-coded in multiple locations, increasing the risk of diverging invariants.

## Goals
- Extract post drafting, persistence, and scheduling logic into reusable services with clear boundaries between business rules and storage.
- Provide a repository or state machine that centralizes post state transitions (including schedule metadata resets).
- Split controller concerns into focused endpoints backed by services to simplify future API consumption and reduce duplication (e.g., hook framework catalogs).
- Prepare the pipeline for additional channels by removing hard-coded LinkedIn behaviors from core post models/actions.

## Deliverables
- Services under `app/Domain/Posts/` (or similar) covering:
  - Draft generation (prompt assembly, AI call, hashtag normalization).
  - Draft persistence with concurrency safeguards.
  - Scheduling/auto-scheduling logic using user preferences/time slots.
  - LinkedIn publishing integration (HTTP client, error translation).
- A `PostRepository` or state manager responsible for updating post records, ensuring schedule-related fields remain consistent across flows.
- A trimmed `GeneratePostsAction` that coordinates draft generation via the new services without embedding DB queries or prompt strings.
- Reorganized controllers (e.g., `PostDraftsController`, `PostSchedulingController`, `PostPublishingController`, `PostHooksController`) that call the extracted services. The hook workbench should reuse the shared framework catalog rather than redefining arrays.
- Updated routes and Inertia handlers to use the new controllers while preserving existing URLs/responses.

## Implementation Outline
1. Map current responsibilities across `GeneratePostsAction` and `PostsController` to determine service boundaries. Document expected inputs/outputs for each.
2. Create a `PostStateService` (or similar) to encapsulate transitions (pending→approved→scheduled→published) and handle field resets atomically.
3. Move prompt template code into dedicated classes (e.g., `PostPromptBuilder`, `HookPromptBuilder`) using dependency injection for style profiles and transcript context.
4. Implement scheduling services that accept user preferences, query available slots via repositories, and update posts through the state manager instead of manual `DB::table` calls.
5. Pull LinkedIn publishing into a service that wraps HTTP interactions, handles token refresh detection, and surfaces structured errors for the controller to render.
6. Update controllers/jobs/actions to consume the new services. Remove direct `DB::table` usage and repeated framework lists.
7. Ensure routes and Inertia props continue to provide the same data structures, adjusting only the underlying service calls.

## Testing & Verification
- **No automated tests should be written for this feature.**
- Manually verify by running necessary migrations in the dev Docker Compose environment, restarting impacted containers, and using chrome-devtools MCP plus curl or `php artisan tinker` to exercise draft generation, scheduling, publishing, and hook workbench flows.
- Leverage docker logs (web, queue worker, any auxiliary services) to investigate issues during manual testing.
