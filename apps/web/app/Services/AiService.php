<?php

namespace App\Services;

use RuntimeException;
use App\Models\AiUsageEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Gemini; // google-gemini-php/client
use OpenAI; // openai-php/client
use Gemini\Data\GenerationConfig;
use Gemini\Enums\ResponseMimeType;
use Gemini\Data\Schema;
use Gemini\Enums\DataType;

class AiService
{
    // Common model aliases used across controllers/jobs
    public const PRO_MODEL = 'models/gemini-2.5-pro';
    public const FLASH_MODEL = 'models/gemini-2.5-flash';

    /**
     * Minimal JSON generation helper via Gemini API.
     */
    public function generateJson(array $args): array
    {
        $schema = $args['schema'] ?? null; // Optional structured schema
        $prompt = $args['prompt'] ?? '';
        $action = (string) ($args['action'] ?? 'generate');

        $hasTemperature = array_key_exists('temperature', $args);
        if ($hasTemperature) {
            $temperature = $args['temperature'];
        } elseif ($action === 'transcript.normalize') {
            $temperature = null;
        } else {
            $temperature = 0.3;
        }
        if ($temperature !== null) {
            $temperature = (float) $temperature;
        }
        $rawModel = (string) ($args['model'] ?? self::modelFor($action, env('GEMINI_MODEL', self::PRO_MODEL)));
        $modelName = $rawModel;
        $userId = $args['userId'] ?? null;
        $projectId = $args['projectId'] ?? null;
        $metadata = $args['metadata'] ?? [];
        $onProgress = $args['onProgress'] ?? null; // optional closure(float $fraction)
        $expectedBytes = isset($args['expectedBytes']) ? (int) $args['expectedBytes'] : null;

        if (!trim($prompt)) {
            throw new RuntimeException('Prompt is required');
        }

        // Structured logging for observability
        $env = (string) config('app.env');
        $promptLen = strlen($prompt);
        $promptPreview = $env === 'local' ? mb_substr($prompt, 0, 300) : null;

        [$provider, $modelName] = $this->resolveModelIdentifier($rawModel, $action);

        if ($provider === 'openai') {
            return $this->generateJsonWithOpenAI([
                'schema' => $schema,
                'prompt' => $prompt,
                'temperature' => $temperature,
                'model' => $modelName,
                'action' => $action,
                'userId' => $userId,
                'projectId' => $projectId,
                'metadata' => $metadata,
                'promptLen' => $promptLen,
                'promptPreview' => $promptPreview,
                'onProgress' => $onProgress,
                'expectedBytes' => $expectedBytes,
            ]);
        }

        if ($provider !== 'gemini') {
            throw new RuntimeException(sprintf('Unsupported AI provider [%s] for action [%s]', $provider, $action));
        }

        $modelIdentifier = $provider ? "{$provider}:{$modelName}" : $modelName;

        Log::info('ai.generate.start', [
            'action' => $action,
            'model' => $modelIdentifier,
            'provider' => $provider,
            'temperature' => $temperature,
            'prompt_len' => $promptLen,
            'user_id' => $userId,
            'project_id' => $projectId,
            'metadata' => $metadata,
            ...( $promptPreview !== null ? ['prompt_preview' => $promptPreview] : [] ),
        ]);

        // Support both GEMINI_API_KEY and GOOGLE_API_KEY (common naming)
        $apiKey = trim((string) env('GEMINI_API_KEY', '')) ?: env('GOOGLE_API_KEY');
        if (!$apiKey) {
            throw new RuntimeException('Gemini API key not configured');
        }
        $client = Gemini::client($apiKey);

        $model = $client->generativeModel(model: $modelName);
        // Configure JSON response; include schema when provided
        $configArgs = [
            'responseMimeType' => ResponseMimeType::APPLICATION_JSON,
        ];
        if ($temperature !== null) {
            $configArgs['temperature'] = $temperature;
        }
        if (is_array($schema)) {
            $configArgs['responseSchema'] = $this->toGeminiSchema($schema);
        }
        $genConfig = new GenerationConfig(...$configArgs);
        $model = $model->withGenerationConfig($genConfig);

        // Basic retry once
        $last = null;
        for ($i = 0; $i < 2; $i++) {
            $attemptStartedAt = microtime(true);
            try {
                Log::info('ai.generate.attempt', ['action' => $action, 'attempt' => $i + 1]);
                $result = $model->generateContent($prompt);
                $usageMetadata = $result->usageMetadata;
                $promptTokens = $usageMetadata->promptTokenCount ?? 0;
                $outputTokens = $usageMetadata->candidatesTokenCount
                    ?? max(0, $usageMetadata->totalTokenCount - $promptTokens);
                $metadataWithUsage = [
                    ...$metadata,
                    'usage' => [
                        'promptTokens' => $promptTokens,
                        'completionTokens' => $outputTokens,
                        'totalTokens' => $usageMetadata->totalTokenCount ?? ($promptTokens + $outputTokens),
                        'modelVersion' => $result->modelVersion,
                    ],
                ];
                // Prefer JSON; fall back to parsing text
                $json = $result->json();
                if (!is_array($json)) {
                    $text = (string) $result->text();
                    $json = json_decode($text, true);
                }
                if (is_array($json)) {
                    $elapsed = microtime(true) - $attemptStartedAt;
                    $cost = $this->recordUsage(
                        $action,
                        $modelIdentifier,
                        $promptTokens,
                        $outputTokens,
                        $userId,
                        $projectId,
                        $metadataWithUsage,
                    );
                    Log::info('ai.generate.success', [
                        'action' => $action,
                        'model' => $modelIdentifier,
                        'keys' => array_keys($json),
                        'duration_ms' => (int) round($elapsed * 1000),
                        'prompt_tokens' => $promptTokens,
                        'completion_tokens' => $outputTokens,
                        'cost_usd' => $cost,
                    ]);
                    return $json;
                }
            } catch (\Throwable $e) {
                $last = $e;
                Log::warning('ai.generate.error', [
                    'action' => $action,
                    'attempt' => $i + 1,
                    'duration_ms' => (int) round((microtime(true) - $attemptStartedAt) * 1000),
                    'error' => $e->getMessage(),
                ]);
            }
        }
        if ($last instanceof RuntimeException) throw $last;
        Log::error('ai.generate.failed', [
            'action' => $action,
            'model' => $modelIdentifier,
            'prompt_len' => $promptLen,
            'duration_ms' => isset($attemptStartedAt) ? (int) round((microtime(true) - $attemptStartedAt) * 1000) : null,
            'error' => $last?->getMessage(),
        ]);
        throw new RuntimeException('AI generation failed');
    }

    /**
     * Generate JSON using OpenAI (Chat Completions) when configured for cleaning.
     */
    private function generateJsonWithOpenAI(array $args): array
    {
        $schema = $args['schema'] ?? null;
        $prompt = (string) ($args['prompt'] ?? '');
        $modelName = (string) ($args['model'] ?? 'gpt-5-nano');
        $action = (string) ($args['action'] ?? 'generate');

        $hasTemperature = array_key_exists('temperature', $args);
        if ($hasTemperature) {
            $temperature = $args['temperature'];
        } elseif ($action === 'transcript.normalize') {
            $temperature = null;
        } else {
            $temperature = 0.1;
        }
        if ($temperature !== null) {
            $temperature = (float) $temperature;
        }
        $userId = $args['userId'] ?? null;
        $projectId = $args['projectId'] ?? null;
        $metadata = (array) ($args['metadata'] ?? []);
        $promptLen = (int) ($args['promptLen'] ?? strlen($prompt));
        $promptPreview = $args['promptPreview'] ?? null;

        if (!trim($prompt)) {
            throw new RuntimeException('Prompt is required');
        }

        $apiKey = env('OPENAI_API_KEY');
        if (!$apiKey) {
            throw new RuntimeException('OpenAI API key not configured');
        }

        Log::info('ai.generate.start', [
            'action' => $action,
            'model' => 'openai:' . $modelName,
            'temperature' => $temperature,
            'prompt_len' => $promptLen,
            'user_id' => $userId,
            'project_id' => $projectId,
            'metadata' => $metadata,
            ...( $promptPreview !== null ? ['prompt_preview' => $promptPreview] : [] ),
        ]);

        $client = OpenAI::client($apiKey);

        // Build messages: keep existing prompt as user content; enforce JSON-only output via system + response_format
        $system = 'You are a precise JSON emitter. Always return only a JSON object that strictly matches the requested schema—no code fences, no extra text.';

        // Prefer streaming with json_schema; fallback to non-stream, then json_object
        $lastEx = null;
        for ($i = 0; $i < 3; $i++) {
            $attemptStartedAt = microtime(true);
            try {
                Log::info('ai.generate.attempt', ['action' => $action, 'attempt' => $i + 1]);
                // Ensure prompt is valid UTF-8 to avoid transport/JSON errors
                $safePrompt = $this->forceValidUtf8($prompt);

                $paramsBase = [
                    'model' => $modelName,
                    'max_completion_tokens' => 1536,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $safePrompt],
                    ],
                ];
                if ($temperature !== null) {
                    $paramsBase['temperature'] = $temperature;
                }
                // Prefer json_schema when schema is provided
                if (is_array($schema)) {
                    $paramsBase['response_format'] = [
                        'type' => 'json_schema',
                        'json_schema' => [
                            'name' => 'TranscriptPart',
                            'strict' => true,
                            'schema' => $schema,
                        ],
                    ];
                } else {
                    $paramsBase['response_format'] = ['type' => 'json_object'];
                }

                $json = null;
                $promptTokens = 0; $outputTokens = 0; $modelVersion = null;

                if ($i === 0) {
                    // Streaming attempt
                    $stream = $client->chat()->createStreamed($paramsBase);
                    $buffer = '';
                    foreach ($stream as $event) {
                        foreach ($event->choices as $choice) {
                            $deltaText = $this->stringifyOpenAiContent($choice->delta->content ?? null);
                            if ($deltaText !== '') {
                                $buffer .= $deltaText;
                                // Report within-chunk progress if possible
                                // Use expectedBytes (~input chunk size) scaled to 0.8 as rough target
                                // Note: expectedBytes may be null; guard accordingly
                                if (isset($args['onProgress']) && isset($args['expectedBytes']) && $args['expectedBytes'] > 0) {
                                    $den = max(1, (int) round($args['expectedBytes'] * 0.8));
                                    $fraction = strlen($buffer) / $den;
                                    $fraction = max(0.0, min(0.98, $fraction));
                                    try { ($args['onProgress'])($fraction); } catch (\Throwable $_) {}
                                }
                            }
                        }
                        if ($event->usage) {
                            $promptTokens = (int) ($event->usage->promptTokens ?? 0);
                            $outputTokens = (int) ($event->usage->completionTokens ?? 0);
                        }
                        $modelVersion = $event->model ?? $modelVersion;
                    }
                    $content = $buffer;
                } elseif ($i === 1) {
                    // Non-stream with schema
                    $resp = $client->chat()->create($paramsBase);
                    $content = $this->stringifyOpenAiContent($resp->choices[0]->message->content ?? null);
                    $promptTokens = (int) ($resp->usage->promptTokens ?? 0);
                    $outputTokens = (int) ($resp->usage->completionTokens ?? 0);
                    $modelVersion = $resp->model ?? null;
                } else {
                    // Fallback: json_object
                    $pf = $paramsBase; $pf['response_format'] = ['type' => 'json_object'];
                    $resp = $client->chat()->create($pf);
                    $content = $this->stringifyOpenAiContent($resp->choices[0]->message->content ?? null);
                    $promptTokens = (int) ($resp->usage->promptTokens ?? 0);
                    $outputTokens = (int) ($resp->usage->completionTokens ?? 0);
                    $modelVersion = $resp->model ?? null;
                }

                $json = $this->parseJsonFromText($content);
                if (!is_array($json)) {
                    Log::warning('ai.generate.non_json', [
                        'action' => $action,
                        'model' => 'openai:' . $modelName,
                        'content_preview' => mb_substr((string) ($content ?? ''), 0, 240),
                    ]);
                    throw new RuntimeException('Non-JSON response');
                }

                $metadataWithUsage = [
                    ...$metadata,
                    'usage' => [
                        'promptTokens' => $promptTokens,
                        'completionTokens' => $outputTokens,
                        'totalTokens' => (int) max(0, $promptTokens + $outputTokens),
                        'modelVersion' => $modelVersion,
                    ],
                ];

                $elapsed = microtime(true) - $attemptStartedAt;
                $cost = $this->recordUsage(
                    $action,
                    'openai:' . $modelName,
                    $promptTokens,
                    $outputTokens,
                    $userId,
                    $projectId,
                    $metadataWithUsage,
                );
                Log::info('ai.generate.success', [
                    'action' => $action,
                    'model' => 'openai:' . $modelName,
                    'keys' => is_array($json) ? array_keys($json) : [],
                    'duration_ms' => (int) round($elapsed * 1000),
                    'prompt_tokens' => $promptTokens,
                    'completion_tokens' => $outputTokens,
                    'cost_usd' => $cost,
                ]);

                return $json;
            } catch (\Throwable $e) {
                $lastEx = $e;
                Log::warning('ai.generate.error', [
                    'action' => $action,
                    'attempt' => $i + 1,
                    'duration_ms' => (int) round((microtime(true) - $attemptStartedAt) * 1000),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($lastEx instanceof RuntimeException) throw $lastEx;
        Log::error('ai.generate.failed', [
            'action' => $action,
            'model' => 'openai:' . $modelName,
            'prompt_len' => $promptLen,
            'duration_ms' => isset($attemptStartedAt) ? (int) round((microtime(true) - $attemptStartedAt) * 1000) : null,
            'error' => $lastEx?->getMessage(),
        ]);
        throw new RuntimeException('AI generation failed');
    }

    private function resolveModelIdentifier(string $rawModel, string $action): array
    {
        [$provider, $modelName] = $this->parseModelIdentifier($rawModel, 'gemini', '');

        if ($action === 'transcript.normalize') {
            [$provider, $modelName] = $this->applyCleanOverrides($provider, $modelName);
        }

        $provider = $provider !== '' ? $provider : 'gemini';

        if ($provider === 'openai' && ($modelName === '' || str_starts_with($modelName, 'models/'))) {
            $modelName = 'gpt-5-nano';
        } elseif ($provider === 'gemini' && $modelName === '') {
            $modelName = self::PRO_MODEL;
        }

        if ($modelName === '' || $modelName === null) {
            $modelName = $provider === 'openai' ? 'gpt-5-nano' : self::PRO_MODEL;
        }

        return [strtolower($provider), $modelName];
    }

    private function parseModelIdentifier(string $value, string $defaultProvider = 'gemini', ?string $defaultModel = null): array
    {
        $trimmed = trim((string) $value);
        $fallbackProvider = strtolower(trim($defaultProvider));
        if ($trimmed === '') {
            return [$fallbackProvider, $defaultModel ?? ''];
        }

        if (str_contains($trimmed, ':')) {
            [$provider, $model] = explode(':', $trimmed, 2);
            return [strtolower(trim($provider)), trim($model)];
        }

        return [$fallbackProvider, $trimmed];
    }

    private function applyCleanOverrides(string $provider, string $modelName): array
    {
        $explicit = trim((string) env('AI_CLEAN_MODEL', ''));
        if ($explicit !== '') {
            [$provider, $modelName] = $this->parseModelIdentifier($explicit, $provider !== '' ? $provider : 'gemini', $modelName);
        }

        $providerOverride = strtolower(trim((string) env('AI_CLEAN_PROVIDER', '')));
        if ($providerOverride !== '') {
            $provider = $providerOverride;
        }

        return [$provider, $modelName];
    }

    private function forceValidUtf8(string $text): string
    {
        // Drop invalid UTF-8 sequences and normalize common control chars
        $out = @iconv('UTF-8', 'UTF-8//IGNORE', $text);
        if ($out === false) {
            $out = $text; // Fallback to original if iconv fails
        }
        // Remove non-printable control characters except tab/newline/carriage return
        $out = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $out) ?? $out;
        return $out;
    }

    /**
     * Normalize OpenAI response content into a flat string regardless of representation.
     *
     * @param  mixed  $content
     */
    private function stringifyOpenAiContent($content): string
    {
        if ($content === null) {
            return '';
        }

        if (is_string($content)) {
            return $content;
        }

        if (is_scalar($content)) {
            return (string) $content;
        }

        if (is_array($content)) {
            $parts = [];
            foreach ($content as $item) {
                $parts[] = $this->stringifyOpenAiContent($item);
            }
            return implode('', array_filter($parts, fn ($p) => $p !== ''));
        }

        if (is_object($content)) {
            if (isset($content->text) && is_string($content->text)) {
                return $content->text;
            }
            if (method_exists($content, 'text')) {
                $text = $content->text();
                if (is_string($text)) {
                    return $text;
                }
            }
            if (method_exists($content, 'toArray')) {
                $arr = $content->toArray();
                if (is_array($arr) && isset($arr['text']) && is_string($arr['text'])) {
                    return $arr['text'];
                }
            }
            if ($content instanceof \Stringable) {
                return (string) $content;
            }
        }

        return '';
    }

    private function parseJsonFromText(string $text): ?array
    {
        $t = trim($text);
        if ($t === '') return null;
        // Strip Markdown fences if present
        if (preg_match('/```json\s*(.*?)```/is', $t, $m)) {
            $t = $m[1];
        } elseif (preg_match('/```\s*(.*?)```/is', $t, $m)) {
            $t = $m[1];
        }
        $t = trim($t);
        $json = json_decode($t, true);
        if (is_array($json)) return $json;
        return null;
    }

    public function normalizeTranscript(string $text, ?string $projectId = null, ?string $userId = null, ?callable $onProgress = null): array
    {
        $maxChunk = (int) env('AI_MAX_CHARS_PER_REQUEST', 12000);
        $len = strlen($text);

        // Single-shot for small inputs
        if ($len <= $maxChunk) {
            $prompt = "You are a text cleaner for meeting transcripts.\n\n".
                "Clean the transcript by:\n- Removing timestamps and system messages\n- Removing filler words (um, uh) and repeated stutters unless meaningful\n- Converting to plain text (no HTML)\n- Normalizing spaces and line breaks for readability\n- IMPORTANT: If speaker labels like \"Me:\" and \"Them:\" are present, PRESERVE them verbatim at the start of each line. Do not invent or rename speakers.\n\n".
                "Return JSON { \"transcript\": string, \"length\": number } where length is the character count of transcript.\n\nTranscript:\n\"\"\"\n{$text}\n\"\"\"";

            $out = $this->generateJson([
                'schema' => [
                    'type' => 'object',
                    'properties' => [
                        'transcript' => ['type' => 'string'],
                        'length' => ['type' => 'integer'],
                    ],
                    'required' => ['transcript','length'],
                    'additionalProperties' => false,
                ],
                'prompt' => $prompt,
                'action' => 'transcript.normalize',
                'userId' => $userId,
                'projectId' => $projectId,
                'metadata' => ['mode' => 'single'],
                'onProgress' => $onProgress ? function (float $fraction) use ($onProgress) {
                    $fraction = max(0.0, min(1.0, $fraction));
                    $pct = 10 + (int) floor($fraction * 35);
                    try { $onProgress(max(10, min(45, $pct))); } catch (\Throwable $_) {}
                } : null,
                'expectedBytes' => strlen($text),
            ]);
            if (!isset($out['transcript']) || !isset($out['length'])) {
                throw new RuntimeException('Failed to normalize transcript');
            }
            return $out;
        }

        // Chunk for large inputs to avoid model timeouts and excessive latency
        $chunks = $this->chunkTranscript($text, $maxChunk);
        $total = count($chunks);
        $cleanedParts = [];

        foreach ($chunks as $i => $chunk) {
            $partIdx = $i + 1;
            $prompt = "You are a text cleaner for meeting transcripts. This is part {$partIdx} of {$total}.\n\n".
                "Clean this PART ONLY by:\n- Removing timestamps and system messages\n- Removing filler words (um, uh) and repeated stutters unless meaningful\n- Converting to plain text (no HTML)\n- Normalizing spaces and line breaks for readability\n- IMPORTANT: If speaker labels like \"Me:\" and \"Them:\" are present, PRESERVE them verbatim at the start of each line. Do not invent or rename speakers.\n\n".
                "Return JSON { \"transcript\": string, \"length\": number } where transcript is only for this part.\n\nTranscript Part ({$partIdx}/{$total}):\n\"\"\"\n{$chunk}\n\"\"\"";

            try {
                $out = $this->generateJson([
                    'schema' => [
                        'type' => 'object',
                        'properties' => [
                            'transcript' => ['type' => 'string'],
                            'length' => ['type' => 'integer'],
                        ],
                        'required' => ['transcript','length'],
                    ],
                    'prompt' => $prompt,
                    'action' => 'transcript.normalize',
                    'userId' => $userId,
                    'projectId' => $projectId,
                    'metadata' => ['mode' => 'chunked', 'chunk' => $partIdx, 'total' => $total],
                ]);
                $cleaned = trim((string) ($out['transcript'] ?? ''));
                if ($cleaned === '') {
                    // Fallback to basic cleaning if AI returns empty
                    $cleaned = $this->basicClean($chunk);
                }
                $cleanedParts[] = $cleaned;
            } catch (\Throwable $e) {
                // Fallback to basic cleaning for this chunk
                $cleanedParts[] = $this->basicClean($chunk);
            }

            // Emit per-chunk progress into the cleaning band: 10 → 45
            if ($onProgress) {
                $ratio = ($i + 1) / max(1, $total);
                $pct = 10 + (int) floor($ratio * 35); // caps at 45
                $pct = max(10, min(45, $pct));
                try { $onProgress($pct); } catch (\Throwable $_) {}
            }
        }

        $joined = trim(implode("\n\n", array_filter($cleanedParts, fn($p) => trim($p) !== '')));
        // Finalize: signal end-of-cleaning chunk work (optional)
        if ($onProgress) {
            try { $onProgress(45); } catch (\Throwable $_) {}
        }

        return [
            'transcript' => $joined,
            'length' => strlen($joined),
        ];
    }

    private function chunkTranscript(string $text, int $max): array
    {
        // Split on lines and accumulate to stay under character budget
        $lines = preg_split("/\R/", $text) ?: [$text];
        $chunks = [];
        $current = '';
        foreach ($lines as $line) {
            $lineWithNl = ($current === '') ? $line : "\n".$line;
            if (strlen($current) + strlen($lineWithNl) > $max && $current !== '') {
                $chunks[] = $current;
                $current = $line;
            } else {
                $current .= $lineWithNl;
            }
        }
        if (trim($current) !== '') {
            $chunks[] = $current;
        }
        return $chunks;
    }

    private function basicClean(string $text): string
    {
        // Remove timestamps like [00:12:34], (00:12), or 00:12:34 - also system markers
        $out = preg_replace('/\[(?:\d{1,2}:){1,2}\d{1,2}\]/', '', $text) ?? $text;
        $out = preg_replace('/\((?:\d{1,2}:){1,2}\d{1,2}\)/', '', $out) ?? $out;
        $out = preg_replace('/^(?:SYSTEM|META|NOTE):.*$/mi', '', $out) ?? $out;
        // Remove common filler words when standalone
        $out = preg_replace('/\b(?:um+|uh+|er+|ah+|hmm+|mmm+)\b[,.!?]*\s*/i', '', $out) ?? $out;
        // Strip any HTML tags just in case
        $out = strip_tags($out);
        // Normalize whitespace
        $out = preg_replace('/[ \t]+/',' ', $out) ?? $out;
        $out = preg_replace('/\n{3,}/', "\n\n", $out) ?? $out;
        return trim($out);
    }

    /**
     * Generate a concise, human-readable transcript title from text.
     */
    public function generateTranscriptTitle(string $text, ?string $projectId = null, ?string $userId = null): string
    {
        $prompt = "You are titling a cleaned meeting transcript.\n\n".
            "Rules:\n".
            "- Return JSON { \"title\": string }\n".
            "- 4–9 words, Title Case, no quotes/emojis/hashtags.\n".
            "- No trailing punctuation.\n".
            "- Use the same language as the transcript.\n\n".
            "Transcript:\n\"\"\"\n{$text}\n\"\"\"";

        try {
            $out = $this->generateJson([
                'schema' => [
                    'type' => 'object',
                    'properties' => [
                        'title' => ['type' => 'string'],
                    ],
                    'required' => ['title'],
                ],
                'prompt' => $prompt,
                'temperature' => 0.2,
                'action' => 'transcript.title',
                'projectId' => $projectId,
                'userId' => $userId,
            ]);

            $title = isset($out['title']) ? trim((string) $out['title']) : '';
            if ($title !== '') {
                return $title;
            }
        } catch (\Throwable $e) {
            // Fall through to heuristic fallback
        }

        $fallback = trim(Str::of($text)->limit(80, '')->value());
        // Basic heuristic: take first ~8 words, Title Case
        $words = preg_split('/\s+/', $fallback) ?: [];
        $first = implode(' ', array_slice($words, 0, 8));
        $first = trim($first);
        if ($first === '') {
            return 'Untitled Project';
        }
        // Title Case via simple transform; keep punctuation minimal
        $titled = Str::title($first);
        return rtrim($titled, " .!?:;,");
    }

    private function recordUsage(string $action, string $model, int $inputTokens, int $outputTokens, $userId, $projectId, array $metadata): float
    {
        $cost = $this->estimateCost($model, $inputTokens, $outputTokens);

        $resolvedUserId = $this->resolveUserId($userId, $projectId);

        try {
            AiUsageEvent::create([
                'id' => (string) Str::uuid(),
                'action' => $action,
                'model' => $model,
                'user_id' => $resolvedUserId,
                'project_id' => $projectId,
                'input_tokens' => $inputTokens,
                'output_tokens' => $outputTokens,
                'cost_usd' => $cost,
                'metadata' => $metadata,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('ai_usage_audit_insert_failed', ['error' => $e->getMessage()]);
        }

        return $cost;
    }

    private function estimateCost(string $model, int $inputTokens, int $outputTokens): float
    {
        // Support provider prefixes like "openai:{model}"; default to gemini pricing
        $provider = null;
        $modelKey = $model;
        if (str_contains($model, ':')) {
            [$provider, $modelKey] = explode(':', $model, 2);
            $provider = strtolower(trim($provider));
        }

        if ($provider === 'openai') {
            $pricing = config('services.openai.pricing', []);
        } else {
            $pricing = config('services.gemini.pricing', []);
        }

        $modelPricing = $pricing[$modelKey] ?? ($pricing['default'] ?? null);

        if (!$modelPricing) {
            return 0.0;
        }

        $promptRate = (float) ($modelPricing['prompt_per_1m'] ?? $modelPricing['input_per_1m'] ?? 0);
        $completionRate = (float) ($modelPricing['completion_per_1m'] ?? $modelPricing['output_per_1m'] ?? 0);

        $promptCost = ($inputTokens / 1_000_000) * $promptRate;
        $completionCost = ($outputTokens / 1_000_000) * $completionRate;

        return round($promptCost + $completionCost, 6);
    }

    public static function modelFor(string $action, ?string $fallback = null): string
    {
        $map = config('ai.actions', []);
        if (is_array($map) && array_key_exists($action, $map)) {
            $configured = $map[$action];
            if (is_string($configured) && trim($configured) !== '') {
                return $configured;
            }
        }

        $default = config('ai.default_model');
        if (is_string($default) && trim($default) !== '') {
            return $default;
        }

        $fallback = trim((string) ($fallback ?? self::PRO_MODEL));
        return str_contains($fallback, ':') ? $fallback : 'gemini:' . $fallback;
    }

    private function resolveUserId($userId, $projectId): ?string
    {
        if ($userId !== null && $userId !== '') {
            return (string) $userId;
        }

        if (!$projectId) {
            return null;
        }

        static $projectUserCache = [];

        $projectKey = (string) $projectId;
        if (array_key_exists($projectKey, $projectUserCache)) {
            return $projectUserCache[$projectKey];
        }

        try {
            $found = DB::table('content_projects')->where('id', $projectKey)->value('user_id');
            if ($found) {
                return $projectUserCache[$projectKey] = (string) $found;
            }
        } catch (\Throwable $e) {
            Log::warning('ai_usage.lookup_user_failed', [
                'project_id' => $projectKey,
                'error' => $e->getMessage(),
            ]);
        }

        return $projectUserCache[$projectKey] = null;
    }

    private function toGeminiSchema(array $shape): Schema
    {
        // Minimal converter for object/array -> Schema tree
        $type = strtolower((string) ($shape['type'] ?? 'object'));
        switch ($type) {
            case 'array':
                $items = isset($shape['items']) && is_array($shape['items']) ? $this->toGeminiSchema($shape['items']) : null;
                return new Schema(type: DataType::ARRAY, items: $items);
            case 'object':
                $props = [];
                foreach ((array) ($shape['properties'] ?? []) as $key => $prop) {
                    $props[$key] = $this->toGeminiSchema(is_array($prop) ? $prop : []);
                }
                $required = (array) ($shape['required'] ?? []);
                return new Schema(type: DataType::OBJECT, properties: $props, required: $required ?: null);
            case 'integer':
                return new Schema(type: DataType::INTEGER);
            case 'number':
                return new Schema(type: DataType::NUMBER);
            case 'boolean':
                return new Schema(type: DataType::BOOLEAN);
            case 'string':
            default:
                return new Schema(type: DataType::STRING);
        }
    }
}
