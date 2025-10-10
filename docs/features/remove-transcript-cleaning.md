# Remove Transcript Cleaning — Direct Insights Pipeline

## Summary
- Problem: The pipeline still performs a transcript cleaning stage before insights, increasing complexity, latency, and maintenance.
- Solution: Remove cleaning entirely and generate insights directly from the raw transcript; then generate posts. Collapse the pipeline to two stages: `insights` → `posts`.
- Scope: Backend, tests, docs, and minor UI copy. Pre‑users, so we will update migrations in place and delete cleaning artifacts with no shims.

## Goals
- Two‑step processing: `GenerateInsightsJob` → `GeneratePostsJob`.
- Remove all cleaning code, tables, migrations, env vars, and config.
- Ensure titles are still generated (from the raw transcript) when missing.
- Keep events/topics and payload shapes stable; update progress ranges for two steps.

## Non‑Goals
- No compatibility shim or queue drain; delete cleaning code and references in one pass.
- No data backfill or partial migration—migrations are edited directly since there’s no existing user data.

## Target Pipeline (After)
- Enqueue chain: `GenerateInsightsJob` → `GeneratePostsJob`.
- Events: `project.progress` (steps: `queued`, `insights`, `posts`), `project.completed`, `project.failed`.
- Progress allocation (two steps):
  - `insights`: start 10, update within 10–90 (Map→Reduce retains its internal interpolation).
  - `posts`: start 90, complete at 100, then emit `project.completed`.

## Single‑Shot Implementation Plan

1) Remove cleaning code and dependencies
- Delete jobs and action:
  - `apps/web/app/Jobs/Projects/CleanTranscriptJob.php`
  - `apps/web/app/Jobs/Projects/CleanTranscriptChunkJob.php`
  - `apps/web/app/Jobs/Projects/CleanTranscriptFinalizeJob.php`
  - `apps/web/app/Domain/Projects/Actions/CleanTranscriptAction.php`
- Delete cleaning services/utilities:
  - `apps/web/app/Domain/Projects/Cleaning/PatchCleaningService.php`
  - `apps/web/app/Support/PatchApplier.php`
  - `apps/web/app/Support/TranscriptCleaner.php`
- Remove related composer dependency if present (diff‑match‑patch) after code deletion.

2) Update job dispatch and chaining
- `apps/web/app/Domain/Projects/Actions/CreateProjectAction.php`
  - Replace batch jobs: enqueue `new GenerateInsightsJob($id)` instead of `CleanTranscriptJob`.
- `apps/web/app/Domain/Projects/Actions/EnqueueProjectProcessingAction.php`
  - Replace batch jobs: enqueue `new GenerateInsightsJob((string) $project->id)` instead of `CleanTranscriptJob`.
  - Keep initial event: `queued` at 0%.
- `apps/web/app/Domain/Projects/Actions/CancelProjectProcessingAction.php`
  - Update `UNIQUE_JOBS` to remove `CleanTranscriptJob::class`.
- `apps/web/app/Jobs/Projects/GenerateInsightsJob.php`
  - Set initial progress for `insights` to 10 (not 50).
  - Bound progress updates to [10, 90]. After completion, enqueue `GeneratePostsJob` (unchanged).
  - Ensure title generation (moved from finalize): if project title is empty/“Untitled Project”, generate with `AiService->generateTranscriptTitle($rawTranscript)` before extraction.

3) Use raw transcript as single source of truth
- `apps/web/app/Domain/Projects/Actions/ExtractInsightsAction.php`
  - Always read from `content_projects.transcript_original`.
  - Remove fallback/reference to `transcript_cleaned` in selection.
  - Keep Map→Reduce thresholds and behavior; treat transcript size the same.

4) Schema and migrations (edit in place; delete cleaning migrations)
- Edit `apps/web/database/migrations/2025_10_01_000200_create_content_projects_table.php`
  - Remove columns: `transcript_cleaned`, `cleaning_chunk_index`, `cleaning_chunks_total`, `transcript_cleaned_partial` (if defined here; otherwise see below).
- Delete cleaning‑related migrations entirely:
  - `apps/web/database/migrations/2025_10_07_001000_add_cleaning_checkpoint_to_content_projects_table.php`
  - `apps/web/database/migrations/2025_10_09_000100_create_content_project_cleaning_chunks_table.php`
  - `apps/web/database/migrations/2025_10_15_000810_add_patch_metadata_to_cleaning_chunks_table.php`
- Keep `content_project_insight_candidates` migration (Map→Reduce) as‑is.

5) Config and environment cleanup
- `apps/web/config/ai.php`
  - Remove actions: `transcript.normalize` and `transcript.normalize.patch`.
  - Keep `transcript.title`, insights, posts, and other non‑cleaning actions.
- `apps/web/.env.example`
  - Remove cleaning env vars: `AI_CLEAN_PROVIDER`, `AI_CLEAN_MODEL`, `CLEANING_CHUNK_SIZE`, `CLEANING_CHUNK_OVERLAP`, `CLEANING_MAX_CONCURRENCY` and any cleaning comments.
  - Remove `AI_MODEL_TRANSCRIPT_NORMALIZE` and `AI_MODEL_TRANSCRIPT_NORMALIZE_PATCH` if present.

6) Tests update (remove cleaning paths; assert two‑step pipeline)
- `apps/web/tests/Feature/ProjectProcessingPipelineTest.php`
  - Remove all references to `CleanTranscript*` jobs, chunk tables, and patch metrics.
  - Seed projects with only `transcript_original`.
  - Adjust progress assertions to two steps: `queued` 0 → `insights` [10..90] → `posts` 90..100 → `ProjectProcessingCompleted`.
  - Keep idempotency test for `GeneratePostsJob` and existing insights/post behaviors.
- Remove any unit tests for `PatchApplier`, `PatchCleaningService`, and cleaning fallbacks.

7) Scripts and docs
- `apps/web/scripts/run_full_project.php`
  - Remove cleaning imports and calls; run `GenerateInsightsJob` then `GeneratePostsJob` only.
- Update feature docs that reference cleaning:
  - `docs/features/insights-map-reduce.md`: remove “cleaned transcripts” phrasing and pipeline reference to cleaning.
  - Delete or archive `docs/features/transcript-cleaning-patch-editor.md`.

8) UI copy
- `apps/web/resources/views/marketing/home.blade.php`
  - Replace “Cleaning transcript and extracting insights…” with “Extracting insights…”.
  - No other UI changes required; SSE step names remain `queued|insights|posts`.

9) Logging and observability
- Remove/adjust log keys with `projects.clean.*`; introduce no new event types.
- Keep request context and usage audits unaffected.

10) Containers & dev workflow
- After code changes, restart the app and queue workers to load new job classes:
  - From repo root: `pnpm dev-deps` (if composer.lock changed), then `pnpm dev-start`.
  - Or with Docker: `docker compose down && docker compose up -d --build`.

## Acceptance Criteria
- Creating/processing a project enqueues `GenerateInsightsJob` followed by `GeneratePostsJob`, with no references to cleaning anywhere in code, tests, config, or docs.
- `project.progress` steps: `queued` 0 → `insights` (starts at 10, advances to <=90) → `posts` 90 → `completed`.
- `ExtractInsightsAction` uses only `transcript_original`; Map→Reduce still yields 5–10 insights; posts are generated for insights without duplicates.
- Titles are generated for untitled projects from the raw transcript.
- Migrations run cleanly on a fresh database; there is no `content_project_cleaning_chunks` table or cleaning columns in `content_projects`.
- `.env.example` and `config/ai.php` have no cleaning‑related entries.

## File Touches (expected)
- Delete
  - apps/web/app/Jobs/Projects/CleanTranscriptJob.php
  - apps/web/app/Jobs/Projects/CleanTranscriptChunkJob.php
  - apps/web/app/Jobs/Projects/CleanTranscriptFinalizeJob.php
  - apps/web/app/Domain/Projects/Actions/CleanTranscriptAction.php
  - apps/web/app/Domain/Projects/Cleaning/PatchCleaningService.php
  - apps/web/app/Support/PatchApplier.php
  - apps/web/app/Support/TranscriptCleaner.php
  - apps/web/database/migrations/2025_10_07_001000_add_cleaning_checkpoint_to_content_projects_table.php
  - apps/web/database/migrations/2025_10_09_000100_create_content_project_cleaning_chunks_table.php
  - apps/web/database/migrations/2025_10_15_000810_add_patch_metadata_to_cleaning_chunks_table.php
  - docs/features/transcript-cleaning-patch-editor.md (archive/remove)
- Modify
  - apps/web/app/Domain/Projects/Actions/CreateProjectAction.php
  - apps/web/app/Domain/Projects/Actions/EnqueueProjectProcessingAction.php
  - apps/web/app/Domain/Projects/Actions/CancelProjectProcessingAction.php
  - apps/web/app/Jobs/Projects/GenerateInsightsJob.php
  - apps/web/app/Domain/Projects/Actions/ExtractInsightsAction.php
  - apps/web/config/ai.php
  - apps/web/.env.example
  - apps/web/database/migrations/2025_10_01_000200_create_content_projects_table.php
  - apps/web/scripts/run_full_project.php
  - apps/web/resources/views/marketing/home.blade.php
  - docs/features/insights-map-reduce.md (pipeline reference)
  - apps/web/tests/Feature/ProjectProcessingPipelineTest.php

## Risks
- Hard deletion: any overlooked reference to removed classes will break at runtime—search broadly for `CleanTranscript`, `cleaning`, `transcript_cleaned`.
- Title generation regression: ensure `GenerateInsightsJob` includes the moved logic to set titles for untitled projects.

## Verification
- Fresh migrate: `php artisan migrate:fresh` in `apps/web` boots with no cleaning tables/columns.
- Manual run: create a project; confirm events step through `insights` then `posts`; posts are created; no cleaning logs appear.
- Tests pass after updates; no test references to cleaning remain.

