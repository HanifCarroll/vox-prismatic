# Feature: Insight Pipeline Refactor

## Context
`App\Domain\Projects\Actions\ExtractInsightsAction` (apps/web/app/Domain/Projects/Actions/ExtractInsightsAction.php) currently combines transcript chunking, map/reduce orchestration, candidate persistence, dedupe heuristics, and fallback logic in a 570+ line class. Jobs such as `GenerateInsightsJob` and `ReduceInsightCandidatesJob` duplicate branching logic, and configuration (chunk sizes, map limits) is sprinkled across multiple layers.

## Goals
- Separate transcript chunking, AI map calls, reduction, and persistence into dedicated services with clear responsibilities.
- Provide a repository abstraction for reading/writing insights and candidate rows, including deduplication helpers.
- Centralize environment-driven thresholds (chunk sizes, pool caps) so they can be tuned without touching job code.
- Simplify `GenerateInsightsJob` to a small coordinator that defers to the new services and emits progress events.
- Preserve current business behavior (fallback-to-single-pass, offsets) while making each stage independently testable in the future.

## Deliverables
- New services:
  - `TranscriptChunker` to split transcripts based on size/line heuristics.
  - `InsightMapper` to perform map-stage AI requests and normalize responses.
  - `InsightReducer` to consolidate candidate pools into final insights.
  - `InsightRepository` managing DB interactions for insights and candidates (dedupe, upserts, cleanup).
- Updated jobs (`GenerateInsightsJob`, `GenerateInsightsChunkJob`, `ReduceInsightCandidatesJob`) that rely on the new services instead of inlined loops.
- Refreshed configuration file (e.g., `config/insights.php`) capturing chunk sizes, pool limits, and temperature defaults.
- Removal of duplicated fallback logic across jobs/actions in favor of service-level methods.

## Implementation Outline
1. Create `config/insights.php` with the current environment defaults and update jobs/actions to read via `config()` rather than `env()`.
2. Introduce the new services under `app/Domain/Projects/Insights/` (or similar). Move existing logic from `ExtractInsightsAction` into the appropriate classes, keeping method-level comments that explain heuristics.
3. Replace direct `DB::table` calls in extraction flows with repository methods. Handle existing hashing/dedup behavior inside the repository.
4. Simplify `ExtractInsightsAction` to orchestrate the new services (e.g., request chunking, execute map for each chunk, call reducer). Ensure progress callbacks still receive updates at the same milestones.
5. Update `GenerateInsightsJob` to delegate to `ExtractInsightsAction` without re-implementing branching. Ensure batch scheduling continues to function.
6. Remove obsolete helper methods from the original action after migrating code.

## Testing & Verification
- **No automated tests should be written for this feature.**
- Validate behavior by running necessary migrations in the dev Docker Compose setup, restarting any containers affected by code/config changes, and testing the workflow via chrome-devtools MCP plus curl or `php artisan tinker` to enqueue processing. Confirm SSE progress updates and final insights appear in the UI.
- Use docker logs for the web and queue workers to debug issues encountered during manual verification.
