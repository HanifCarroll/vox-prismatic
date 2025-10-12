<?php

namespace App\Domain\Posts\Data;

final class PostDraft
{
    /**
     * @param array<int, string> $hashtags
     */
    public function __construct(
        public readonly string $insightId,
        public readonly string $content,
        public readonly array $hashtags = [],
        public readonly ?string $objective = null,
    ) {
    }
}
