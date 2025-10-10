<?php

namespace App\Services\Ai;

class AiResponse
{
    public function __construct(
        public array $data,
        public int $promptTokens,
        public int $completionTokens,
        public ?string $modelVersion = null,
        public ?float $durationMs = null,
        public array $providerMetadata = [],
    ) {
    }

    public function totalTokens(): int
    {
        return max(0, $this->promptTokens + $this->completionTokens);
    }
}
