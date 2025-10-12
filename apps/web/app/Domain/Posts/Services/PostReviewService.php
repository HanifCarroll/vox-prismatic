<?php

namespace App\Domain\Posts\Services;

use App\Domain\Posts\Data\PostReviewFeedback;
use App\Services\Ai\Prompts\PostReviewPromptBuilder;
use App\Services\AiService;
use Illuminate\Support\Facades\Log;
use Throwable;

final class PostReviewService
{
    public function __construct(
        private readonly AiService $ai,
        private readonly PostReviewPromptBuilder $prompts,
    ) {
    }

    /**
     * @param array<string, mixed> $styleProfile
     */
    public function reviewDraft(
        string $projectId,
        ?string $userId,
        string $content,
        array $styleProfile = [],
        ?string $insightId = null,
        ?string $postId = null,
    ): ?PostReviewFeedback {
        try {
            $response = $this->ai->complete(
                $this->prompts
                    ->review($content, $styleProfile)
                    ->withContext($projectId, $userId)
                    ->withMetadata(array_filter([
                        'insightId' => $insightId,
                        'postId' => $postId,
                    ]))
            );
        } catch (Throwable $e) {
            Log::warning('posts.review.failed', [
                'projectId' => $projectId,
                'postId' => $postId,
                'insightId' => $insightId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        $data = $response->data ?? [];
        if (!is_array($data)) {
            return null;
        }

        $scores = $this->parseScores($data['scores'] ?? null);
        $suggestions = $this->parseSuggestions($data['suggestions'] ?? null);

        if (empty(array_filter($scores, static fn ($value) => $value !== null)) && empty($suggestions)) {
            return null;
        }

        return new PostReviewFeedback(
            scores: $scores,
            suggestions: $suggestions,
            reviewedAt: new \DateTimeImmutable('now', new \DateTimeZone('UTC')),
            model: $response->modelVersion,
        );
    }

    /**
     * @param mixed $raw
     * @return array<string, int|null>
     */
    private function parseScores(mixed $raw): array
    {
        $keys = ['clarity', 'engagement_potential', 'readability'];
        $scores = [];

        if (!is_array($raw)) {
            foreach ($keys as $key) {
                $scores[$key] = null;
            }
            return $scores;
        }

        foreach ($keys as $key) {
            $value = $raw[$key] ?? null;
            if ($value === null || $value === '') {
                $scores[$key] = null;
                continue;
            }
            $numeric = (int) round((float) $value);
            $scores[$key] = max(0, min(100, $numeric));
        }

        return $scores;
    }

    /**
     * @param mixed $raw
     * @return array<int, array{type: string, originalText: string, suggestion: string, rationale: string|null}>
     */
    private function parseSuggestions(mixed $raw): array
    {
        if (!is_iterable($raw)) {
            return [];
        }

        $acceptedTypes = ['clarity', 'engagement', 'readability', 'impact'];
        $suggestions = [];

        foreach ($raw as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $type = isset($entry['suggestion_type']) ? strtolower(trim((string) $entry['suggestion_type'])) : '';
            if (!in_array($type, $acceptedTypes, true)) {
                $type = 'impact';
            }

            $original = $this->cleanText($entry['original_text'] ?? null);
            $suggested = $this->cleanText($entry['suggested_improvement'] ?? null);
            $rationale = $this->cleanText($entry['rationale'] ?? null);

            if ($original === null || $suggested === null) {
                continue;
            }

            $suggestions[] = [
                'type' => $type,
                'originalText' => $original,
                'suggestion' => $suggested,
                'rationale' => $rationale,
            ];

            if (count($suggestions) >= 4) {
                break;
            }
        }

        return $suggestions;
    }

    private function cleanText(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $normalized = str_replace(["\r\n", "\r"], "\n", trim($value));
        if ($normalized === '') {
            return null;
        }

        return mb_substr($normalized, 0, 800);
    }
}
