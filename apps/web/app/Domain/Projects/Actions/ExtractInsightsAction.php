<?php

namespace App\Domain\Projects\Actions;

use App\Domain\Projects\Insights\InsightMapper;
use App\Domain\Projects\Insights\InsightReducer;
use App\Domain\Projects\Insights\InsightRepository;
use App\Domain\Projects\Insights\TranscriptChunker;
use App\Services\AiService;
use Illuminate\Support\Facades\Log;

class ExtractInsightsAction
{
    public function __construct(
        private readonly InsightRepository $repository,
        private readonly TranscriptChunker $chunker,
        private readonly InsightMapper $mapper,
        private readonly InsightReducer $reducer,
    ) {
    }

    /**
     * Extract insights for a project. Returns number of insights inserted.
     * Optionally accepts a progress callback receiving an int percent (0-100).
     */
    public function execute(string $projectId, AiService $ai, int $max = 10, ?callable $progress = null): int
    {
        $existingCount = $this->repository->insightCount($projectId);
        if ($existingCount >= $max) {
            if ($progress) {
                $progress(90);
            }

            return 0;
        }

        $context = $this->repository->projectContext($projectId);
        if ($context === null) {
            if ($progress) {
                $progress(90);
            }

            return 0;
        }

        $transcript = $context['transcript'];
        $userId = $context['user_id'];

        $candidateCount = $this->repository->candidateCount($projectId);
        if ($candidateCount > 0) {
            Log::info('insights.reduce.from_candidates', [
                'project_id' => $projectId,
                'candidates' => $candidateCount,
            ]);

            return $this->reduceFromCandidates($projectId, $ai, $max, $userId, $progress);
        }

        if (trim($transcript) === '') {
            if ($progress) {
                $progress(90);
            }

            return 0;
        }

        if ($this->chunker->shouldUseSinglePass($transcript)) {
            return $this->runSinglePass($projectId, $ai, $transcript, $max, $userId, $progress);
        }

        Log::info('insights.map_reduce.start', [
            'project_id' => $projectId,
            'chars' => mb_strlen($transcript, 'UTF-8'),
        ]);

        return $this->mapReduceInline($projectId, $ai, $transcript, $max, $userId, $progress);
    }

    /**
     * Chunk a transcript using the configured heuristics.
     *
     * @return array<int, array{text: string, start: int, end: int}>
     */
    public function chunkTranscript(string $transcript, ?int $maxChunkSize = null): array
    {
        return $this->chunker->chunk($transcript, $maxChunkSize);
    }

    /**
     * Map a single transcript chunk and persist the resulting candidates.
     */
    public function mapChunk(
        string $projectId,
        AiService $ai,
        string $transcriptChunk,
        int $chunkIndex,
        int $totalChunks,
        ?string $userId = null,
        ?int $chunkStartOffset = null,
        ?int $chunkEndOffset = null
    ): int {
        $mapped = $this->mapper->mapChunk(
            $projectId,
            $ai,
            $transcriptChunk,
            max(0, $chunkIndex - 1),
            $totalChunks,
            $userId,
            $chunkStartOffset,
            $chunkEndOffset,
        );

        return $this->repository->persistCandidates($projectId, $chunkIndex, $mapped);
    }

    private function runSinglePass(
        string $projectId,
        AiService $ai,
        string $transcript,
        int $max,
        ?string $userId,
        ?callable $progress
    ): int {
        $insights = $this->reducer->singlePass($projectId, $ai, $transcript, $userId);
        $inserted = $this->repository->persistInsights($projectId, $insights, $max);

        if ($progress) {
            $progress(90);
        }

        return $inserted;
    }

    private function mapReduceInline(
        string $projectId,
        AiService $ai,
        string $transcript,
        int $max,
        ?string $userId,
        ?callable $progress
    ): int {
        $poolConfig = (array) config('insights.reduce', []);
        $poolMax = (int) ($poolConfig['pool_max'] ?? 40);
        $reduceMin = (int) ($poolConfig['target_min'] ?? 5);
        $reduceMaxSetting = $poolConfig['target_max'] ?? null;
        $reduceMax = $reduceMaxSetting !== null ? (int) $reduceMaxSetting : $max;

        $chunks = $this->chunker->chunk($transcript);
        if ($chunks === []) {
            return $this->runSinglePass($projectId, $ai, $transcript, $max, $userId, $progress);
        }

        $total = count($chunks);
        $pool = [];
        $seen = array_fill_keys($this->repository->insightHashes($projectId), true);

        foreach ($chunks as $index => $chunk) {
            $chunkText = (string) ($chunk['text'] ?? '');
            $chunkStart = isset($chunk['start']) ? (int) $chunk['start'] : null;
            $chunkEnd = isset($chunk['end']) ? (int) $chunk['end'] : null;

            $candidates = $this->mapper->mapChunk(
                $projectId,
                $ai,
                $chunkText,
                $index,
                $total,
                $userId,
                $chunkStart,
                $chunkEnd,
                logLifecycle: false,
            );

            foreach ($candidates as $candidate) {
                $hash = $candidate['content_hash'] ?? null;
                if ($hash === null || isset($seen[$hash])) {
                    continue;
                }

                $seen[$hash] = true;
                $pool[] = $candidate;

                if (count($pool) >= $poolMax) {
                    break 2;
                }
            }

            if ($progress) {
                $pct = 10 + (int) floor((($index + 1) / max(1, $total)) * 70);
                $progress(max(10, min(80, $pct)));
            }
        }

        if ($pool === []) {
            return $this->runSinglePass($projectId, $ai, $transcript, $max, $userId, $progress);
        }

        if ($progress) {
            $progress(85);
        }

        $reduced = $this->reducer->reduce($projectId, $ai, $pool, $reduceMin, $reduceMax, $userId);
        $inserted = $this->repository->persistInsights($projectId, $reduced, $max);

        if ($progress) {
            $progress(90);
        }

        return $inserted;
    }

    private function reduceFromCandidates(
        string $projectId,
        AiService $ai,
        int $max,
        ?string $userId,
        ?callable $progress
    ): int {
        $poolConfig = (array) config('insights.reduce', []);
        $poolMax = (int) ($poolConfig['pool_max'] ?? 40);
        $reduceMin = (int) ($poolConfig['target_min'] ?? 5);
        $reduceMaxSetting = $poolConfig['target_max'] ?? null;
        $reduceMax = $reduceMaxSetting !== null ? (int) $reduceMaxSetting : $max;

        $candidates = $this->repository->candidatePool($projectId, $poolMax);
        if ($candidates->isEmpty()) {
            return 0;
        }

        if ($progress) {
            $progress(85);
        }

        if ($candidates->count() <= $reduceMax) {
            $payload = $candidates
                ->map(fn (array $candidate) => [
                    'content' => $candidate['content'],
                    'content_hash' => $candidate['content_hash'],
                    'quote' => $candidate['quote'],
                    'score' => $candidate['score'],
                    'source_start_offset' => $candidate['source_start_offset'],
                    'source_end_offset' => $candidate['source_end_offset'],
                ])
                ->all();

            $inserted = $this->repository->persistInsights($projectId, $payload, $max);

            if ($progress) {
                $progress(90);
            }

            $this->repository->clearCandidates($projectId);

            Log::info('insights.reduce.skipped', [
                'project_id' => $projectId,
                'candidates' => $candidates->count(),
                'inserted' => $inserted,
            ]);

            return $inserted;
        }

        $reduced = $this->reducer->reduce(
            $projectId,
            $ai,
            $candidates->all(),
            $reduceMin,
            $reduceMax,
            $userId,
        );

        $inserted = $this->repository->persistInsights($projectId, $reduced, $max);

        if ($progress) {
            $progress(90);
        }

        $this->repository->clearCandidates($projectId);

        Log::info('insights.reduce.complete', [
            'project_id' => $projectId,
            'candidates' => $candidates->count(),
            'inserted' => $inserted,
        ]);

        return $inserted;
    }
}
