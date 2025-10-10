<?php

namespace App\Domain\Projects\Insights;

use App\Domain\Projects\Insights\Concerns\HandlesInsightText;
use App\Services\AiService;
use App\Services\Ai\Prompts\InsightsPromptBuilder;
use Illuminate\Support\Facades\Log;

class InsightMapper
{
    use HandlesInsightText;

    public function __construct(private readonly InsightsPromptBuilder $prompts)
    {
    }

    /**
     * Perform the map-stage request for a single transcript chunk.
     *
     * @return array<int, array{
     *     content: string,
     *     content_hash: string,
     *     quote: ?string,
     *     score: ?float,
     *     source_start_offset: ?int,
     *     source_end_offset: ?int
     * }>
     */
    public function mapChunk(
        string $projectId,
        AiService $ai,
        string $chunkText,
        int $chunkIndex,
        int $totalChunks,
        ?string $userId = null,
        ?int $chunkStartOffset = null,
        ?int $chunkEndOffset = null,
        bool $logLifecycle = true
    ): array {
        $trimmed = trim($chunkText);
        if ($trimmed === '') {
            return [];
        }

        $perChunk = (int) config('insights.chunk.per_chunk', 4);
        $chunkSize = mb_strlen($trimmed, 'UTF-8');

        if ($logLifecycle) {
            Log::info('insights.map.chunk.start', [
                'project_id' => $projectId,
                'chunk' => $chunkIndex + 1,
                'total' => $totalChunks,
                'chars' => $chunkSize,
            ]);
        }

        try {
            $request = $this->prompts
                ->mapChunk($trimmed, $chunkIndex, $totalChunks, $perChunk, ['chunkSize' => $chunkSize])
                ->withContext($projectId, $userId)
                ->withMetadata([
                    'chunkStartOffset' => $chunkStartOffset,
                    'chunkEndOffset' => $chunkEndOffset,
                ]);

            $json = $ai->complete($request)->data;
        } catch (\Throwable $e) {
            if ($logLifecycle) {
                Log::warning('insights.map.chunk_failed', [
                    'project_id' => $projectId,
                    'chunk' => $chunkIndex + 1,
                    'error' => $e->getMessage(),
                ]);
            }

            return [];
        }

        if (!isset($json['insights']) || !is_array($json['insights'])) {
            return [];
        }

        $candidates = [];
        foreach ($json['insights'] as $item) {
            if (!is_array($item) || empty($item['content'])) {
                continue;
            }

            $normalized = $this->normalizeInsightText((string) $item['content']);
            if ($normalized === '') {
                continue;
            }

            $quote = null;
            if (isset($item['quote']) && is_string($item['quote'])) {
                $quote = $this->shortenInsightQuote($item['quote']);
            }

            $score = null;
            if (isset($item['score']) && is_numeric($item['score'])) {
                $score = (float) $item['score'];
            }

            $candidates[] = [
                'content' => $normalized,
                'content_hash' => $this->hashInsightContent($normalized),
                'quote' => $quote,
                'score' => $score,
                'source_start_offset' => $chunkStartOffset,
                'source_end_offset' => $chunkEndOffset,
            ];
        }

        if ($logLifecycle) {
            Log::info('insights.map.chunk.success', [
                'project_id' => $projectId,
                'chunk' => $chunkIndex + 1,
                'total' => $totalChunks,
                'candidates' => count($candidates),
            ]);
        }

        return $candidates;
    }
}
