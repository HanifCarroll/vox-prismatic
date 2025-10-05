<?php

namespace App\Services;

use RuntimeException;
use App\Models\AiUsageEvent;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Gemini; // google-gemini-php/client
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

        if (!trim($prompt)) {
            throw new RuntimeException('Prompt is required');
        }

        // Structured logging for observability
        $env = (string) config('app.env');
        $promptLen = strlen($prompt);
        $promptPreview = $env === 'local' ? mb_substr($prompt, 0, 300) : null;
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
            try {
                Log::info('ai.generate.attempt', ['action' => $action, 'attempt' => $i + 1]);
                $result = $model->generateContent($prompt);
                // Prefer JSON; fall back to parsing text
                $json = $result->json();
                if (!is_array($json)) {
                    $text = (string) $result->text();
                    $json = json_decode($text, true);
                }
                if (is_array($json)) {
                    $this->recordUsage($action, $modelName, 0, 0, $userId, $projectId, $metadata);
                    Log::info('ai.generate.success', [
                        'action' => $action,
                        'model' => $modelName,
                        'keys' => array_keys($json),
                    ]);
                    return $json;
                }
            } catch (\Throwable $e) {
                $last = $e;
                Log::warning('ai.generate.error', [
                    'action' => $action,
                    'attempt' => $i + 1,
                    'error' => $e->getMessage(),
                ]);
            }
        }
        if ($last instanceof RuntimeException) throw $last;
        Log::error('ai.generate.failed', [
            'action' => $action,
            'model' => $modelName,
            'prompt_len' => $promptLen,
            'error' => $last?->getMessage(),
        ]);
        throw new RuntimeException('AI generation failed');
    }

    public function normalizeTranscript(string $text): array
    {
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
            ],
            'prompt' => $prompt,
            'temperature' => 0.1,
            // Fast, lower-cost for normalization
            'model' => 'models/gemini-2.5-flash',
            'action' => 'transcript.normalize',
        ]);
        if (!isset($out['transcript']) || !isset($out['length'])) {
            throw new RuntimeException('Failed to normalize transcript');
        }
        return $out;
    }

    private function recordUsage(string $action, string $model, int $inputTokens, int $outputTokens, $userId, $projectId, array $metadata): void
    {
        try {
            AiUsageEvent::create([
                'id' => (string) Str::uuid(),
                'action' => $action,
                'model' => $model,
                'user_id' => $userId,
                'project_id' => $projectId,
                'input_tokens' => $inputTokens,
                'output_tokens' => $outputTokens,
                'cost_usd' => 0,
                'metadata' => $metadata,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('ai_usage_audit_insert_failed', ['error' => $e->getMessage()]);
        }
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
