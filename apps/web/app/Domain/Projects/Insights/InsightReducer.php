<?php

namespace App\Domain\Projects\Insights;

use App\Domain\Projects\Insights\Concerns\HandlesInsightText;
use App\Services\AiService;
use App\Services\Ai\Prompts\InsightsPromptBuilder;

class InsightReducer
{
    use HandlesInsightText;

    public function __construct(private readonly InsightsPromptBuilder $prompts)
    {
    }

    /**
     * Run the single-pass insight extraction for shorter transcripts.
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
    public function singlePass(
        string $projectId,
        AiService $ai,
        string $transcript,
        ?string $userId = null
    ): array {
        $request = $this->prompts
            ->singlePass($transcript)
            ->withContext($projectId, $userId);

        $json = $ai->complete($request)->data;
        $length = mb_strlen($transcript, 'UTF-8');

        return $this->mapResponseToInsights($json, static fn (): array => [0, $length]);
    }

    /**
     * Reduce a pool of candidate insights down to a focused set.
     *
     * @param  array<int, array{
     *     content: string,
     *     content_hash?: string,
     *     quote?: ?string,
     *     score?: ?float,
     *     source_start_offset?: ?int,
     *     source_end_offset?: ?int
     * }>  $pool
     * @return array<int, array{
     *     content: string,
     *     content_hash: string,
     *     quote: ?string,
     *     score: ?float,
     *     source_start_offset: ?int,
     *     source_end_offset: ?int
     * }>
     */
    public function reduce(
        string $projectId,
        AiService $ai,
        array $pool,
        int $reduceMin,
        int $reduceMax,
        ?string $userId = null
    ): array {
        $request = $this->prompts
            ->reduce($pool, $reduceMin, $reduceMax, ['pool' => count($pool)])
            ->withContext($projectId, $userId);

        $json = $ai->complete($request)->data;

        return $this->mapResponseToInsights($json, function (string $normalized) use ($pool): array {
            return $this->resolveSourceOffsets($normalized, $pool);
        });
    }

    /**
     * Translate AI responses into normalized insights with offsets.
     *
     * @param  array<string, mixed>  $response
     * @param  callable(string, array=): array{0: ?int, 1: ?int}  $offsetResolver
     * @return array<int, array{
     *     content: string,
     *     content_hash: string,
     *     quote: ?string,
     *     score: ?float,
     *     source_start_offset: ?int,
     *     source_end_offset: ?int
     * }>
     */
    private function mapResponseToInsights(array $response, callable $offsetResolver): array
    {
        if (!isset($response['insights']) || !is_array($response['insights'])) {
            return [];
        }

        $results = [];
        foreach ($response['insights'] as $item) {
            if (!is_array($item) || empty($item['content'])) {
                continue;
            }

            $normalized = $this->normalizeInsightText((string) $item['content']);
            if ($normalized === '') {
                continue;
            }

            [$start, $end] = $offsetResolver($normalized, $item);

            $quote = isset($item['quote']) && is_string($item['quote'])
                ? $this->shortenInsightQuote($item['quote'])
                : null;

            $score = null;
            if (isset($item['score']) && is_numeric($item['score'])) {
                $score = (float) $item['score'];
            }

            $results[] = [
                'content' => $normalized,
                'content_hash' => $this->hashInsightContent($normalized),
                'quote' => $quote,
                'score' => $score,
                'source_start_offset' => $start,
                'source_end_offset' => $end,
            ];
        }

        return $results;
    }

    /**
     * @param  array<int, array{
     *     content: string,
     *     source_start_offset?: ?int,
     *     source_end_offset?: ?int
     * }>  $pool
     * @return array{0: ?int, 1: ?int}
     */
    private function resolveSourceOffsets(string $normalizedContent, array $pool): array
    {
        $bestScore = -1.0;
        $bestStart = null;
        $bestEnd = null;

        foreach ($pool as $candidate) {
            $candidateContent = $candidate['content'] ?? '';
            $score = 0.0;

            if ($candidateContent !== '') {
                similar_text($normalizedContent, (string) $candidateContent, $percent);
                $score = $percent;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestStart = isset($candidate['source_start_offset']) ? (int) $candidate['source_start_offset'] : null;
                $bestEnd = isset($candidate['source_end_offset']) ? (int) $candidate['source_end_offset'] : null;
            }
        }

        if ($bestScore < 10) {
            return [null, null];
        }

        return [$bestStart, $bestEnd];
    }
}
