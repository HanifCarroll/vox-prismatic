<?php

namespace App\Services\Ai;

use RuntimeException;

class AiRequest
{
    public string $action;
    public string $prompt;
    public ?array $schema;
    public ?float $temperature;
    public ?string $model;
    public $onProgress;
    public ?int $expectedBytes;
    public ?string $projectId;
    public ?string $userId;
    public array $metadata;

    /**
     * @param  callable|null  $onProgress
     */
    public function __construct(
        string $action,
        string $prompt,
        ?array $schema = null,
        ?float $temperature = null,
        ?string $model = null,
        ?callable $onProgress = null,
        ?int $expectedBytes = null,
        ?string $projectId = null,
        ?string $userId = null,
        array $metadata = [],
    ) {
        $action = trim($action) !== '' ? $action : 'generate';
        $prompt = trim($prompt);

        if ($prompt === '') {
            throw new RuntimeException('Prompt is required');
        }

        $this->action = $action;
        $this->prompt = $prompt;
        $this->schema = $schema;
        $this->temperature = $temperature;
        $this->model = $model;
        $this->onProgress = $onProgress;
        $this->expectedBytes = $expectedBytes;
        $this->projectId = $projectId;
        $this->userId = $userId;
        $this->metadata = $metadata;
    }

    public static function fromArray(array $payload): self
    {
        $temperature = null;
        if (array_key_exists('temperature', $payload)) {
            $temperature = $payload['temperature'];
            if ($temperature !== null) {
                $temperature = (float) $temperature;
            }
        }

        return new self(
            action: (string) ($payload['action'] ?? 'generate'),
            prompt: (string) ($payload['prompt'] ?? ''),
            schema: isset($payload['schema']) && is_array($payload['schema']) ? $payload['schema'] : null,
            temperature: $temperature,
            model: isset($payload['model']) ? (string) $payload['model'] : null,
            onProgress: $payload['onProgress'] ?? null,
            expectedBytes: isset($payload['expectedBytes']) ? (int) $payload['expectedBytes'] : null,
            projectId: isset($payload['projectId']) ? (string) $payload['projectId'] : null,
            userId: isset($payload['userId']) ? (string) $payload['userId'] : null,
            metadata: isset($payload['metadata']) && is_array($payload['metadata']) ? $payload['metadata'] : [],
        );
    }

    public function withMetadata(array $metadata): self
    {
        if (empty($metadata)) {
            return $this;
        }

        $clone = clone $this;
        $clone->metadata = [...$this->metadata, ...$metadata];

        return $clone;
    }

    public function withContext(?string $projectId, ?string $userId): self
    {
        $clone = clone $this;
        if ($projectId !== null) {
            $clone->projectId = $projectId;
        }
        if ($userId !== null) {
            $clone->userId = $userId;
        }

        return $clone;
    }

    /**
     * @param  callable|null  $onProgress
     */
    public function withProgress(?callable $onProgress): self
    {
        if ($onProgress === null) {
            return $this;
        }

        $clone = clone $this;
        $clone->onProgress = $onProgress;

        return $clone;
    }

    public function withTemperature(?float $temperature): self
    {
        $clone = clone $this;
        $clone->temperature = $temperature;

        return $clone;
    }

    public function withModel(?string $model): self
    {
        if ($model === null) {
            return $this;
        }

        $clone = clone $this;
        $clone->model = $model;

        return $clone;
    }

    public function withExpectedBytes(?int $bytes): self
    {
        $clone = clone $this;
        $clone->expectedBytes = $bytes;

        return $clone;
    }
}
