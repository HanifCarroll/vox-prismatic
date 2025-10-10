# Feature: Modular AI Service

## Context
The current `App\Services\AiService` (apps/web/app/Services/AiService.php) couples provider selection, prompt templates, streaming logic, transcript helpers, and usage metering in a single 900+ line class. This makes it hard to introduce new providers, adjust prompt behavior, or test error handling without impacting unrelated flows (transcript cleanup, insights extraction, post generation).

## Goals
- Extract provider-specific clients (Gemini, OpenAI) behind a narrow interface that supports JSON generation, streaming progress callbacks, and schema enforcement.
- Split prompt-building helpers for transcript normalization/title generation and project workflows (insights, posts, hook workbench) into dedicated collaborators.
- Isolate usage tracking/billing logic so downstream code can opt in without knowing provider details.
- Preserve existing public entry points so jobs/actions/controllers can migrate incrementally.

## Deliverables
- New provider client classes under `apps/web/app/Services/Ai` (or similar) that encapsulate API setup, retries, and schema handling for Gemini and OpenAI.
- A refactored orchestrator service that routes requests to the correct provider client and delegates prompt construction to dedicated builders.
- Shared configuration objects for temperature defaults, model aliases, and environment overrides (pulled from `.env`).
- Updated call sites (`ExtractInsightsAction`, `GeneratePostsAction`, `PostsController::hookWorkbench`, transcript utilities) to use the new orchestrator interface.
- Documentation in `docs/` describing how to extend the provider set or adjust prompts.
- Remove direct `Gemini::client`/`OpenAI::client` usage from non-provider classes.

## Implementation Outline
1. Introduce small interfaces (e.g., `StructuredCompletionClient`) describing the capabilities the orchestrator needs.
2. Move Gemini/OpenAI specific code (authentication, retries, response parsing) into classes implementing those interfaces. Port logging and usage metadata.
3. Extract prompt builders for transcript normalization/title, insight map/reduce, post drafting, and hook workbench into stateless helper classes. Leave wording unchanged.
4. Create a lightweight usage recorder service (`AiUsageRecorder`) to persist events and estimate cost. Inject it into the orchestrator.
5. Update `AiService` public methods to delegate to the orchestrator/prompt builders, keeping method signatures stable. Remove duplicated normalization helpers once consumers are migrated.
6. Touch dependent actions/jobs/controllers to rely on the new abstractions. Ensure environment-driven knobs (temperature, thresholds) are read through config structs, not scattered `env()` calls.

## Testing & Verification
- **No automated tests should be written for this feature.**
- Testing must be performed manually by running any necessary migrations in the dev Docker Compose environment, restarting affected containers, and exercising the app via chrome-devtools MCP plus curl or `php artisan tinker` calls to confirm AI flows continue working.
- Use docker logs from relevant services to diagnose issues during development.
