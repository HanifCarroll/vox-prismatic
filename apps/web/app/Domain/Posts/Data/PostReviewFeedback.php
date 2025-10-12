<?php

namespace App\Domain\Posts\Data;

final class PostReviewFeedback
{
    /**
     * @param array<string, int|null> $scores
     * @param array<int, array{type: string, originalText: string, suggestion: string, rationale: string|null}> $suggestions
     */
    public function __construct(
        public readonly array $scores,
        public readonly array $suggestions,
        public readonly \DateTimeImmutable $reviewedAt,
        public readonly ?string $model = null,
    ) {
    }

    public function isEmpty(): bool
    {
        if (!empty(array_filter($this->scores, static fn ($value) => $value !== null))) {
            return false;
        }

        return empty($this->suggestions);
    }

    /**
     * @return array{scores: array<string, int|null>, suggestions: array<int, array{type: string, originalText: string, suggestion: string, rationale: string|null}>, reviewedAt: string, model?: string}
     */
    public function toArray(): array
    {
        $payload = [
            'scores' => $this->scores,
            'suggestions' => $this->suggestions,
            'reviewedAt' => $this->reviewedAt->format(DATE_ATOM),
        ];

        if ($this->model !== null && $this->model !== '') {
            $payload['model'] = $this->model;
        }

        return $payload;
    }
}
