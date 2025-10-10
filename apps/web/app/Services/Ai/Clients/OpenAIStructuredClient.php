<?php

namespace App\Services\Ai\Clients;

use App\Services\Ai\AiRequest;
use App\Services\Ai\AiResponse;
use App\Services\Ai\Contracts\StructuredCompletionClient;
use App\Services\Ai\Support\JsonResponseParser;
use Illuminate\Support\Facades\Log;
use OpenAI;
use RuntimeException;

class OpenAIStructuredClient implements StructuredCompletionClient
{
    public function generate(AiRequest $request, string $model): AiResponse
    {
        $apiKey = config('services.openai.api_key') ?: env('OPENAI_API_KEY');

        if (!$apiKey) {
            throw new RuntimeException('OpenAI API key not configured');
        }

        $client = OpenAI::client($apiKey);

        $system = 'You are a precise JSON emitter. Always return only a JSON object that strictly matches the requested schema—no code fences, no extra text.';
        $prompt = JsonResponseParser::forceValidUtf8($request->prompt);
        $hasSchema = is_array($request->schema);

        $lastException = null;

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $started = microtime(true);

            try {
                Log::info('ai.generate.attempt', [
                    'action' => $request->action,
                    'provider' => 'openai',
                    'model' => $model,
                    'attempt' => $attempt,
                ]);

                $baseParams = [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                ];

                if ($request->temperature !== null) {
                    $baseParams['temperature'] = $request->temperature;
                }

                if ($hasSchema) {
                    $baseParams['response_format'] = [
                        'type' => 'json_schema',
                        'json_schema' => [
                            'name' => 'StructuredResult',
                            'strict' => true,
                            'schema' => $request->schema,
                        ],
                    ];
                } else {
                    $baseParams['response_format'] = ['type' => 'json_object'];
                }

                return $hasSchema
                    ? match ($attempt) {
                        1 => $this->nonStream($client, $baseParams),
                        2 => $this->nonStream($client, [
                            ...$baseParams,
                            'response_format' => ['type' => 'json_object'],
                        ]),
                        default => $this->streamIfNeeded($client, $baseParams, $request),
                    }
                    : match ($attempt) {
                        1 => $this->streamIfNeeded($client, $baseParams, $request),
                        2 => $this->nonStream($client, $baseParams),
                        default => $this->nonStream($client, [
                            ...$baseParams,
                            'response_format' => ['type' => 'json_object'],
                        ]),
                    };
            } catch (\Throwable $exception) {
                $lastException = $exception;
                Log::warning('ai.generate.error', [
                    'action' => $request->action,
                    'provider' => 'openai',
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

    /**
     * @param  array<string, mixed>  $params
     */
    private function nonStream($client, array $params): AiResponse
    {
        $response = $client->chat()->create($params);
        $json = $this->extractJsonFromResponse($response);
        $content = $json ? null : JsonResponseParser::stringifyOpenAiContent($response->choices[0]->message->content ?? null);
        if (!$json && $content !== null) {
            $json = JsonResponseParser::parse($content);
        }

        if (!is_array($json)) {
            $this->logDebugNonJson('openai:' . $params['model'], $params['messages'][1]['content'] ?? '', $response, $content);
            throw new RuntimeException('Non-JSON response');
        }

        $usage = $response->usage ?? null;
        $promptTokens = (int) ($usage->promptTokens ?? 0);
        $completionTokens = (int) ($usage->completionTokens ?? 0);
        $modelVersion = $response->model ?? null;

        return new AiResponse(
            data: $json,
            promptTokens: $promptTokens,
            completionTokens: $completionTokens,
            modelVersion: $modelVersion,
            providerMetadata: [
                'usage' => [
                    'promptTokens' => $promptTokens,
                    'completionTokens' => $completionTokens,
                    'totalTokens' => (int) max(0, $promptTokens + $completionTokens),
                    'modelVersion' => $modelVersion,
                ],
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $params
     */
    private function streamIfNeeded($client, array $params, AiRequest $request): AiResponse
    {
        if (!is_callable($request->onProgress)) {
            return $this->nonStream($client, $params);
        }

        $stream = $client->chat()->createStreamed($params);
        $promptTokens = 0;
        $completionTokens = 0;
        $modelVersion = null;
        $buffer = '';

        foreach ($stream as $event) {
            $eventType = $event->type ?? null;

            if ($eventType === 'response.output_text.delta') {
                $delta = $event->delta ?? '';
                if (is_string($delta) && $delta !== '') {
                    $buffer .= $delta;
                    $expected = max(1, $request->expectedBytes ?? strlen($params['messages'][1]['content'] ?? ''));
                    $fraction = strlen($buffer) / $expected;
                    $fraction = max(0.0, min(0.98, $fraction));
                    try {
                        ($request->onProgress)($fraction);
                    } catch (\Throwable $_) {
                    }
                }
            }

            if ($eventType === 'response.completed') {
                $modelVersion = $event->model ?? $modelVersion;
            }

            if ($event->usage) {
                $promptTokens = (int) ($event->usage->promptTokens ?? 0);
                $completionTokens = (int) ($event->usage->completionTokens ?? 0);
            }
        }

        $json = JsonResponseParser::parse($buffer);
        if (!is_array($json)) {
            throw new RuntimeException('Non-JSON response');
        }

        return new AiResponse(
            data: $json,
            promptTokens: $promptTokens,
            completionTokens: $completionTokens,
            modelVersion: $modelVersion,
            providerMetadata: [
                'usage' => [
                    'promptTokens' => $promptTokens,
                    'completionTokens' => $completionTokens,
                    'totalTokens' => (int) max(0, $promptTokens + $completionTokens),
                    'modelVersion' => $modelVersion,
                ],
            ],
        );
    }

    private function extractJsonFromResponse($response): ?array
    {
        try {
            if (is_object($response) && isset($response->choices) && is_array($response->choices) && isset($response->choices[0])) {
                $choice = $response->choices[0];
                $message = $choice->message ?? null;
                if (is_object($message)) {
                    if (isset($message->parsed) && is_array($message->parsed)) {
                        return $message->parsed;
                    }
                    if (isset($message->toolCalls) && is_array($message->toolCalls) && isset($message->toolCalls[0])) {
                        $call = $message->toolCalls[0];
                        $function = $call->function ?? null;
                        if (is_object($function) && isset($function->arguments) && is_string($function->arguments)) {
                            $decoded = json_decode($function->arguments, true);
                            if (is_array($decoded)) {
                                return $decoded;
                            }
                        }
                    }
                    if (isset($message->content) && is_string($message->content)) {
                        $decoded = JsonResponseParser::parse($message->content);
                        if (is_array($decoded)) {
                            return $decoded;
                        }
                    }
                    if (isset($message->content) && is_array($message->content)) {
                        $parts = '';
                        foreach ($message->content as $part) {
                            $parts .= JsonResponseParser::stringifyOpenAiContent($part);
                        }
                        $decoded = JsonResponseParser::parse($parts);
                        if (is_array($decoded)) {
                            return $decoded;
                        }
                    }
                }
            }

            $raw = null;
            if (is_object($response) && method_exists($response, 'toArray')) {
                $raw = $response->toArray();
            } elseif (is_array($response)) {
                $raw = $response;
            }

            if (is_array($raw)) {
                $choices = $raw['choices'] ?? null;
                if (is_array($choices) && isset($choices[0]['message'])) {
                    $message = $choices[0]['message'];
                    if (is_array($message)) {
                        if (isset($message['parsed']) && is_array($message['parsed'])) {
                            return $message['parsed'];
                        }
                        if (isset($message['tool_calls'][0]['function']['arguments'])) {
                            $decoded = json_decode((string) $message['tool_calls'][0]['function']['arguments'], true);
                            if (is_array($decoded)) {
                                return $decoded;
                            }
                        }
                        if (isset($message['content'])) {
                            $decoded = JsonResponseParser::parse(JsonResponseParser::stringifyOpenAiContent($message['content']));
                            if (is_array($decoded)) {
                                return $decoded;
                            }
                        }
                    }
                }
            }
        } catch (\Throwable $_) {
        }

        return null;
    }

    private function logDebugNonJson(string $providerModel, string $prompt, $response, ?string $content): void
    {
        try {
            Log::debug('ai.openai.non_json_payload', [
                'model' => $providerModel,
                'prompt_preview' => mb_substr($prompt, 0, 180),
                'response' => (is_object($response) && method_exists($response, 'toArray'))
                    ? $response->toArray()
                    : null,
                'content' => $content,
            ]);
        } catch (\Throwable $_) {
        }
    }
}
