# Insights Extraction — Map→Reduce Pipeline

## Summary
- Problem: Single‑pass insight extraction on very long transcripts can be slow, flaky, and prone to timeouts. We need reliable, scalable extraction without losing quality.
- Solution: Use a two‑phase Map→Reduce pipeline for large cleaned transcripts. Map generates candidate insights per chunk; Reduce consolidates, dedupes, and selects the top 5–10.
- Scope: Backend only; no API shape changes. Progress events and DB writes remain consistent with current behavior.

## Goals
- Extract 5–10 high‑quality, de‑duplicated insights from arbitrarily long transcripts.
- Keep latency predictable and avoid job timeouts/retries.
- Maintain deterministic DB integrity (unique per content hash) and idempotent behavior on retries.

## Non‑Goals
- No new UI elements. Existing SSE progress is reused.
- No change to the approval model (insights remain internal; posts are approved).

## Triggers & Placement
- Pipeline: `CleanTranscriptJob` → `GenerateInsightsJob` → `GeneratePostsJob`.
- Implementation lives inside `ExtractInsightsAction::execute(...)` with a size‑based switch:
  - If `strlen(transcript_cleaned) <= INSIGHTS_MAP_REDUCE_THRESHOLD_CHARS`: single pass (current behavior).
  - Else: use Map→Reduce.

## Architecture
1) Map phase (chunked):
   - Split cleaned transcript into ~`INSIGHTS_MAP_CHUNK_CHARS` character chunks on line boundaries.
   - For each chunk, call `AiService->generateJson` with action `insights.map` to produce 3–5 candidates.
   - Normalize and hash candidates (`sha256` on squished text). Deduplicate against existing DB hashes and within the batch.
   - Emit progress updates across 50–80% of overall progress (see Progress below).

2) Reduce phase (global):
   - Aggregate up to `INSIGHTS_REDUCE_POOL_MAX` candidates (post‑dedupe).
   - Call `AiService->generateJson` with action `insights.reduce` (model `PRO_MODEL`) to pick the top K (5–10 configurable) unique insights, optionally polishing wording and preserving supporting quotes.
   - Insert selected insights (id, project_id, content, content_hash, quote?, score?) respecting existing uniqueness by content_hash.

3) Handoff:
   - On success, `GenerateInsightsJob` proceeds to `GeneratePostsJob` (unchanged).

## Data Model
- Reuse existing `insights` table: `id`, `project_id`, `content`, `content_hash`, `quote` (nullable), `score` (nullable), timestamps.
- Deduping via `content_hash` (present in current code) prevents repeats across runs.

## Config & Env
- `.env` (defaults in code):
  - `INSIGHTS_MAP_REDUCE_THRESHOLD_CHARS=12000` — switch to Map→Reduce when cleaned transcript exceeds this size.
  - `INSIGHTS_MAP_CHUNK_CHARS=9000` — target chunk size; must be < threshold and <= model prompt limits.
  - `INSIGHTS_MAP_PER_CHUNK=4` — number of candidates to request per chunk (3–5 recommended).
  - `INSIGHTS_REDUCE_TARGET_MIN=5` — minimum insights to keep.
  - `INSIGHTS_REDUCE_TARGET_MAX=10` — maximum insights to keep.
  - `INSIGHTS_REDUCE_POOL_MAX=40` — cap on total candidates passed to Reduce.
  - `INSIGHTS_MAP_MODEL=models/gemini-2.5-flash` — fast model for Map.
  - `INSIGHTS_REDUCE_MODEL=models/gemini-2.5-pro` — higher‑accuracy model for Reduce.
  - `INSIGHTS_TEMPERATURE=0.2` — conservative for crisp insights.

## Prompts & Schemas
- Map (per chunk):
  - Instruction: “Extract 3–5 crisp, non‑overlapping insights from ONLY this part. Prefer specific, actionable statements. Return JSON.”
  - JSON schema: `{ "insights": [{ "content": string, "quote"?: string, "score"?: number }] }`
  - Metadata: `{ mode: 'map', chunk: i, total: n }` in `AiService` logging.

- Reduce (global):
  - Instruction: “From these candidates, select and lightly edit the best 5–10 unique insights. Remove overlaps, balance themes, keep them standalone and concise. Include the most representative quote when available. Return JSON.”
  - JSON schema: same shape as Map.
  - Metadata: `{ mode: 'reduce', pool: <count> }` in logging.

## Progress
- Maintain existing step name `insights`.
- Progress allocation within `GenerateInsightsJob`:
  - Start: `updateProgress(projectId, 'insights', 50)` (unchanged).
  - Map: interpolate `50 + floor( (chunkIndex / totalChunks) * 30 )` → caps at 80.
  - Reduce: set to 85 on start; 90 on success before queueing `GeneratePostsJob`.

## Error Handling
- Per‑chunk failures: log warning and continue (skip that chunk). `AiService` already retries once.
- If Map yields zero candidates: fall back to single‑pass (current prompt) once; if still empty, fail the stage via `failStage`.
- DB writes are outside long transactions. Only the final insert is wrapped in a short transaction.

## Observability
- Logs: `ai.generate.start|success|error` with actions `insights.map` and `insights.reduce`, chunk indices and usage metadata.
- Events: `project.progress` during Map/Reduce; `project.failed` unchanged on failure.
- Audit: `AiUsageEvent` captures token usage and cost across both phases.

## Performance & Cost
- Calls ≈ `numChunks + 1` (Map per chunk + Reduce). Each Map call is small; Reduce payload is the only global call.
- Cost budgets controlled by `FLASH` for Map and `PRO` for Reduce; can downshift Reduce to FLASH if needed.

## Backwards Compatibility
- Behavior for small transcripts remains single‑pass.
- No changes to routes, controllers, or public response shapes.

## Implementation Plan (Incremental)
1) Add config/env defaults (read via `env()` inside action for now).
2) Update `ExtractInsightsAction::execute(...)` to: size check → branch to `mapReduce()`.
3) Implement `mapReduce()` helpers in `ExtractInsightsAction`:
   - `chunkTextOnLines(string $text, int $max): array`
   - `mapChunkToCandidates(string $chunk): array`
   - `reduceCandidates(array $candidates, int $min, int $max): array`
   - `normalize(string $text): string` (reuse existing) and hashing.
4) Update `GenerateInsightsJob` to emit progress during Map and Reduce.
5) Keep current single‑pass logic for small inputs as a fast path.
6) Tests: unit tests for chunking/dedupe; feature tests with HTTP fakes to simulate Map/Reduce; ensure end‑to‑end creates 5–10 insights.

## File Touches
- Modify: `apps/web/app/Domain/Projects/Actions/ExtractInsightsAction.php`
- Modify: `apps/web/app/Jobs/Projects/GenerateInsightsJob.php` (progress updates within job after calling action, or surface callbacks)
- Optional: expose a public chunking helper in `AiService` if reuse is desired.

## Risks & Mitigations
- Duplicate/near‑duplicate candidates: content hashing + Reduce prompt to prune overlaps.
- Chunk boundary context loss: Map prompt focuses on self‑contained insights; Reduce reconciles redundancy.
- Very long reduce input: enforce `INSIGHTS_REDUCE_POOL_MAX` cap and let Reduce choose best subset.

## Acceptance Criteria
- For transcripts > `INSIGHTS_MAP_REDUCE_THRESHOLD_CHARS`, the system:
  - Emits `insights` progress events stepping from 50 → 80 across chunks, 85 at reduce start, 90 on completion.
  - Inserts 5–10 insights with unique `content_hash`.
  - Proceeds to `GeneratePostsJob` without timeouts or retries.
- For smaller transcripts, behavior matches current single‑pass extraction.

## Future Enhancements
- Persist per‑candidate provenance (chunk index, offsets) for debugging.
- Optional semantic dedupe via embeddings if needed for tighter pruning.
- Use `score` to auto‑prioritize which insights feed early post generation.

