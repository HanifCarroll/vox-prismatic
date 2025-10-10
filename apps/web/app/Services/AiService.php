<?php

namespace App\Services;

use App\Services\Ai\AiModels;
use App\Services\Ai\AiModelResolver;
use App\Services\Ai\AiRequest;
use App\Services\Ai\AiResponse;
use App\Services\Ai\AiUsageRecorder;
use App\Services\Ai\Contracts\StructuredCompletionClient;
use App\Services\Ai\Clients\GeminiStructuredClient;
use App\Services\Ai\Clients\OpenAIStructuredClient;
use App\Services\Ai\Prompts\TranscriptPromptBuilder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class AiService
{
    public const PRO_MODEL = AiModels::GEMINI_PRO;
    public const FLASH_MODEL = AiModels::GEMINI_FLASH;

    /**
     * @var array<string, StructuredCompletionClient>
     */
    private array $clients;

    public function __construct(
        private readonly AiModelResolver $modelResolver,
        private readonly AiUsageRecorder $usageRecorder,
        GeminiStructuredClient $geminiClient,
        OpenAIStructuredClient $openAiClient,
        private readonly TranscriptPromptBuilder $transcriptPrompts,
    ) {
        $this->clients = [
            'gemini' => $geminiClient,
            'openai' => $openAiClient,
        ];
    }

    public function generateJson(array $args): array
    {
        $request = AiRequest::fromArray($args);
        $response = $this->complete($request);

        return $response->data;
    }

    public function complete(AiRequest $request): AiResponse
    {
        $prepared = $this->applyDefaults($request);
        $resolved = $this->modelResolver->resolve($prepared);

        $provider = $resolved['provider'];
        $model = $resolved['model'];
        $identifier = $resolved['identifier'];

        $client = $this->clients[$provider] ?? null;
        if (!$client instanceof StructuredCompletionClient) {
            throw new RuntimeException(sprintf('Unsupported AI provider [%s]', $provider));
        }

        $promptLength = strlen($prepared->prompt);
        $promptPreview = config('app.env') === 'local' ? mb_substr($prepared->prompt, 0, 300) : null;

        Log::info('ai.generate.start', [
            'action' => $prepared->action,
            'provider' => $provider,
            'model' => $identifier,
            'temperature' => $prepared->temperature,
            'prompt_len' => $promptLength,
            'user_id' => $prepared->userId,
            'project_id' => $prepared->projectId,
            'metadata' => $prepared->metadata,
            ...( $promptPreview !== null ? ['prompt_preview' => $promptPreview] : [] ),
        ]);

        $startedAt = microtime(true);

        try {
            $response = $client->generate($prepared->withModel($model), $model);
        } catch (\Throwable $exception) {
            Log::error('ai.generate.failed', [
                'action' => $prepared->action,
                'provider' => $provider,
                'model' => $identifier,
                'prompt_len' => $promptLength,
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
                'error' => $exception->getMessage(),
            ]);

            throw $exception instanceof RuntimeException
                ? $exception
                : new RuntimeException($exception->getMessage(), 0, $exception);
        }

        $metadataWithUsage = [
            ...$prepared->metadata,
            'usage' => [
                'promptTokens' => $response->promptTokens,
                'completionTokens' => $response->completionTokens,
                'totalTokens' => $response->totalTokens(),
                'modelVersion' => $response->modelVersion,
            ],
        ];

        $cost = $this->usageRecorder->record(
            $prepared->action,
            $identifier,
            $response->promptTokens,
            $response->completionTokens,
            $prepared->userId,
            $prepared->projectId,
            $metadataWithUsage,
        );

        Log::info('ai.generate.success', [
            'action' => $prepared->action,
            'provider' => $provider,
            'model' => $identifier,
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'prompt_tokens' => $response->promptTokens,
            'completion_tokens' => $response->completionTokens,
            'cost_usd' => $cost,
        ]);

        return $response;
    }

    public function normalizeTranscript(
        string $text,
        ?string $projectId = null,
        ?string $userId = null,
        ?callable $onProgress = null,
        array $metadataOverride = []
    ): array {
        $metadata = $metadataOverride ?: ['mode' => 'single'];
        $request = $this->transcriptPrompts
            ->normalization($text, $metadata)
            ->withContext($projectId, $userId);

        if ($onProgress) {
            $wrapper = function (float $fraction) use ($onProgress) {
                $fraction = max(0.0, min(1.0, $fraction));
                $percent = 10 + (int) floor($fraction * 35);
                try {
                    $onProgress(max(10, min(45, $percent)));
                } catch (\Throwable $_) {
                }
            };
            $request = $request->withProgress($wrapper);
        }

        $response = $this->complete($request);
        $data = $response->data;

        if (!isset($data['transcript'], $data['length'])) {
            throw new RuntimeException('Failed to normalize transcript');
        }

        return $data;
    }

    public function generateTranscriptTitle(
        string $text,
        ?string $projectId = null,
        ?string $userId = null
    ): string {
        $request = $this->transcriptPrompts
            ->title($text)
            ->withContext($projectId, $userId);

        try {
            $response = $this->complete($request);
            $title = isset($response->data['title']) ? trim((string) $response->data['title']) : '';
            if ($title !== '') {
                return $title;
            }
        } catch (\Throwable $_) {
        }

        $fallback = trim(Str::of($text)->limit(80, '')->value());
        $words = preg_split('/\s+/', $fallback) ?: [];
        $first = implode(' ', array_slice($words, 0, 8));
        $first = trim($first);
        if ($first === '') {
            return 'Untitled Project';
        }

        $titled = Str::title($first);

        return rtrim($titled, " .!?:;,");
    }

    public static function modelFor(string $action, ?string $fallback = null): string
    {
        return app(AiModelResolver::class)->modelFor($action, $fallback);
    }

    private function applyDefaults(AiRequest $request): AiRequest
    {
        $request = $this->applyModelDefault($request);
        $request = $this->applyTemperatureDefault($request);

        return $request;
    }

    private function applyModelDefault(AiRequest $request): AiRequest
    {
        if ($request->model === null || trim($request->model) === '') {
            return $request->withModel($this->modelResolver->modelFor($request->action));
        }

        return $request;
    }

    private function applyTemperatureDefault(AiRequest $request): AiRequest
    {
        if ($request->temperature !== null) {
            return $request;
        }

        $map = config('ai.defaults.temperatures', []);
        if (is_array($map) && array_key_exists($request->action, $map)) {
            $value = $map[$request->action];
            if ($value === null || $value === '') {
                return $request;
            }
            return $request->withTemperature((float) $value);
        }

        $default = $map['default'] ?? null;
        if ($default === null || $default === '') {
            return $request;
        }

        return $request->withTemperature((float) $default);
    }
}
