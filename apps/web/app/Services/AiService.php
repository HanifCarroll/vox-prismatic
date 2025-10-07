<?php

namespace App\Services;

use RuntimeException;
use App\Models\AiUsageEvent;
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
        $temperature = $args['temperature'] ?? 0.3;
        $modelName = $args['model'] ?? env('GEMINI_MODEL', 'models/gemini-2.5-pro');
        $action = $args['action'] ?? 'generate';
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
        
        // If cleaning step is configured to use OpenAI, route there
        $cleanProvider = env('AI_CLEAN_PROVIDER', 'gemini');
        if ($action === 'transcript.normalize' && strtolower($cleanProvider) === 'openai') {
            return $this->generateJsonWithOpenAI([
                'schema' => $schema,
                'prompt' => $prompt,
                'temperature' => $temperature,
                'model' => env('AI_CLEAN_MODEL', 'gpt-5-nano'),
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

        Log::info('ai.generate.start', [
            'action' => $action,
            'model' => $modelName,
            'temperature' => $temperature,
            'prompt_len' => $promptLen,
            'user_id' => $userId,
            'project_id' => $projectId,
            'metadata' => $metadata,
            ...( $promptPreview !== null ? ['prompt_preview' => $promptPreview] : [] ),
        ]);

        $apiKey = env('GEMINI_API_KEY');
        if (!$apiKey) {
            throw new RuntimeException('Gemini API key not configured');
        }
        $client = Gemini::client($apiKey);

        $model = $client->generativeModel(model: $modelName);
        // Configure JSON response; include schema when provided
        $genConfig = is_array($schema)
            ? new GenerationConfig(
                responseMimeType: ResponseMimeType::APPLICATION_JSON,
                temperature: (float) $temperature,
                responseSchema: $this->toGeminiSchema($schema),
            )
            : new GenerationConfig(
                responseMimeType: ResponseMimeType::APPLICATION_JSON,
                temperature: (float) $temperature,
            );
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
                        $modelName,
                        $promptTokens,
                        $outputTokens,
                        $userId,
                        $projectId,
                        $metadataWithUsage,
                    );
                    Log::info('ai.generate.success', [
                        'action' => $action,
                        'model' => $modelName,
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
            'model' => $modelName,
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
        $temperature = (float) ($args['temperature'] ?? 0.1);
        $modelName = (string) ($args['model'] ?? 'gpt-5-nano');
        $action = (string) ($args['action'] ?? 'generate');
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
                    'temperature' => $temperature,
                    'max_completion_tokens' => 1536,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $safePrompt],
                    ],
                ];
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
                            $delta = (string) ($choice->delta->content ?? '');
                            if ($delta !== '') {
                                $buffer .= $delta;
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
                    $content = (string) ($resp->choices[0]->message->content ?? '');
                    $promptTokens = (int) ($resp->usage->promptTokens ?? 0);
                    $outputTokens = (int) ($resp->usage->completionTokens ?? 0);
                    $modelVersion = $resp->model ?? null;
                } else {
                    // Fallback: json_object
                    $pf = $paramsBase; $pf['response_format'] = ['type' => 'json_object'];
                    $resp = $client->chat()->create($pf);
                    $content = (string) ($resp->choices[0]->message->content ?? '');
                    $promptTokens = (int) ($resp->usage->promptTokens ?? 0);
                    $outputTokens = (int) ($resp->usage->completionTokens ?? 0);
                    $modelVersion = $resp->model ?? null;
                }

                $json = $this->parseJsonFromText($content);
                if (!is_array($json)) {
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
                'temperature' => 0.1,
                'model' => self::FLASH_MODEL,
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
                    'temperature' => 0.1,
                    'model' => self::FLASH_MODEL,
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
    public function generateTranscriptTitle(string $text): string
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
                'model' => self::FLASH_MODEL,
                'action' => 'transcript.title',
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

        try {
            AiUsageEvent::create([
                'id' => (string) Str::uuid(),
                'action' => $action,
                'model' => $model,
                'user_id' => $userId,
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
