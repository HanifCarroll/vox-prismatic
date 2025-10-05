# Refactor Plan: Bus-Chained Project Processing

## Current State

- Single `OrchestrateProjectJob` performs transcript cleaning, insight extraction, and post generation in one unit of work.
- Failures or restarts require re-running every step, wasting AI calls and risking duplicate row exceptions.
- Progress/state reporting is coarse (`processing_step` just reflects the latest stage inside a long-running transaction).

## Proposed Architecture

Break the pipeline into discrete queue jobs and chain them with Laravel's `Bus::chain()`:

1. **CleanTranscriptJob**
   - Input: project ID.
   - Loads raw transcript, calls `CleanTranscriptAction`, persists normalized text.
   - Emits `project.progress` (~10%).

2. **GenerateInsightsJob**
   - Input: project ID.
   - Reads cleaned transcript, calls `ExtractInsightsAction`, inserts insights (idempotent check per insight).
   - Emits `project.progress` (~50%).

3. **GeneratePostsJob**
   - Input: project ID.
   - Iterates insights, generates posts via AI, writes rows (skip if `posts` table already has `(project_id, insight_id)`), updates hashtags.
   - Emits `project.progress` (~100%), `ProjectProcessingCompleted` event.

Chain execution:
```php
Bus::chain([
    new CleanTranscriptJob($projectId),
    new GenerateInsightsJob($projectId),
    new GeneratePostsJob($projectId),
])->onQueue('processing')->dispatch();
```

If any job fails, the chain stops automatically. Laravel's queue system handles retries according to each job's `tries` / `backoff` configuration.

## Implementation Steps

1. **New Jobs**
   - Create `CleanTranscriptJob`, `GenerateInsightsJob`, `GeneratePostsJob` in `app/Jobs/Projects/`.
   - Move the corresponding logic out of `OrchestrateProjectJob` into these jobs (reuse existing actions).

2. **Idempotency**
   - Ensure each job checks for existing work before calling AI:
     - Transcript: skip if already cleaned.
     - Insights: skip individual insights that exist.
     - Posts: skip insights with existing posts.

3. **Dispatching**
   - Replace current `EnqueueProjectProcessingAction` call to `dispatch(new OrchestrateProjectJob)` with the `Bus::chain` call above.
   - Remove the old `OrchestrateProjectJob` once the pipeline runs end-to-end.

4. **Progress Updates**
   - Each job updates `content_projects.processing_progress` and `processing_step` explicitly (`cleaning`, `insights`, `posts`).
   - Use existing events (`ProjectProcessingProgress`, `ProjectProcessingCompleted`, `ProjectProcessingFailed`) inside each job.

5. **Failure Handling**
   - Let job-specific retry limits handle transient errors; on repeated failure, propagate an error message via `ProjectProcessingFailed` describing the stage that failed.

6. **Cleanup**
   - Drop redundant sleeps/transactions; each job can own its transaction boundaries around the database mutations it needs.
   - Update tests to cover individual job execution and the chained happy-path.

## Benefits

- **Reliability**: retries re-run only the failing stage; no more duplicate post inserts.
- **Cost control**: we avoid regenerating AI output for stages that already succeeded.
- **Observability**: stage-specific progress + failure events make it easier to trace.
- **Extensibility**: easy to insert additional stages (e.g., quality review) or parallelize post generation later.

## Next Steps

- Implement the three jobs and update the processing action.
- Migrate integration tests to drive the chained workflow.
- Monitor queue logs to confirm stage-specific progress emits as expected.
