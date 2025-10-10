<?php

namespace App\Services\Ai\Clients;

use App\Services\Ai\AiRequest;
use App\Services\Ai\AiResponse;
use App\Services\Ai\Contracts\StructuredCompletionClient;
use App\Services\Ai\Support\JsonResponseParser;
use Gemini;
use Gemini\Data\GenerationConfig;
use Gemini\Data\Schema;
use Gemini\Enums\DataType;
use Gemini\Enums\ResponseMimeType;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GeminiStructuredClient implements StructuredCompletionClient
{
    public function generate(AiRequest $request, string $model): AiResponse
    {
        $apiKey = config('services.gemini.api_key')
            ?: trim((string) env('GEMINI_API_KEY', ''))
            ?: env('GOOGLE_API_KEY');

        if (!$apiKey) {
            throw new RuntimeException('Gemini API key not configured');
        }

        $client = Gemini::client($apiKey);
        $modelClient = $client->generativeModel(model: $model);

        $configArgs = [
            'responseMimeType' => ResponseMimeType::APPLICATION_JSON,
        ];

        if ($request->temperature !== null) {
            $configArgs['temperature'] = $request->temperature;
        }

        if (is_array($request->schema)) {
            $configArgs['responseSchema'] = $this->toGeminiSchema($request->schema);
        }

        $generationConfig = new GenerationConfig(...$configArgs);
        $modelClient = $modelClient->withGenerationConfig($generationConfig);

        $lastException = null;

        for ($attempt = 1; $attempt <= 2; $attempt++) {
            $started = microtime(true);

            try {
                Log::info('ai.generate.attempt', [
                    'action' => $request->action,
                    'provider' => 'gemini',
                    'model' => $model,
                    'attempt' => $attempt,
                ]);

                $result = $modelClient->generateContent($request->prompt);
                $usage = $result->usageMetadata;

                $promptTokens = (int) ($usage->promptTokenCount ?? 0);
                $completionTokens = (int) (
                    $usage->candidatesTokenCount
                    ?? max(0, ($usage->totalTokenCount ?? 0) - $promptTokens)
                );

                $payload = $result->json();
                if (!is_array($payload)) {
                    $payload = JsonResponseParser::parse((string) $result->text());
                }

                if (is_array($payload)) {
                    return new AiResponse(
                        data: $payload,
                        promptTokens: $promptTokens,
                        completionTokens: $completionTokens,
                        modelVersion: $result->modelVersion ?? null,
                        durationMs: (microtime(true) - $started) * 1000,
                        providerMetadata: [
                            'usage' => [
                                'promptTokens' => $promptTokens,
                                'completionTokens' => $completionTokens,
                                'totalTokens' => $usage->totalTokenCount ?? ($promptTokens + $completionTokens),
                                'modelVersion' => $result->modelVersion ?? null,
                            ],
                        ],
                    );
                }
            } catch (\Throwable $exception) {
                $lastException = $exception;
                Log::warning('ai.generate.error', [
                    'action' => $request->action,
                    'provider' => 'gemini',
                    'model' => $model,
                    'attempt' => $attempt,
                    'duration_ms' => (int) round((microtime(true) - $started) * 1000),
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        if ($lastException instanceof RuntimeException) {
            throw $lastException;
        }

        if ($lastException) {
            throw new RuntimeException($lastException->getMessage(), previous: $lastException);
        }

        throw new RuntimeException('AI generation failed');
    }

    private function toGeminiSchema(array $shape): Schema
    {
        $type = strtolower((string) ($shape['type'] ?? 'object'));

        return match ($type) {
            'array' => new Schema(
                type: DataType::ARRAY,
                items: isset($shape['items']) && is_array($shape['items'])
                    ? $this->toGeminiSchema($shape['items'])
                    : null,
            ),
            'object' => new Schema(
                type: DataType::OBJECT,
                properties: $this->mapObjectProperties((array) ($shape['properties'] ?? [])),
                required: ($shape['required'] ?? []) ?: null,
            ),
            'integer' => new Schema(type: DataType::INTEGER),
            'number' => new Schema(type: DataType::NUMBER),
            'boolean' => new Schema(type: DataType::BOOLEAN),
            default => new Schema(type: DataType::STRING),
        };
    }

    private function mapObjectProperties(array $properties): array
    {
        $mapped = [];

        foreach ($properties as $key => $prop) {
            $mapped[$key] = $this->toGeminiSchema(is_array($prop) ? $prop : []);
        }

        return $mapped;
    }
}
