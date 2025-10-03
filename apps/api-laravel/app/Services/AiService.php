<?php

namespace App\Services;

use RuntimeException;
use App\Models\AiUsageEvent;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Google\Cloud\AIPlatform\V1\PredictionServiceClient;
use Google\Cloud\AIPlatform\V1\PredictRequest;
use Google\Protobuf\Struct;
use Google\Protobuf\Value;

class AiService
{
    // Model resource names on Vertex AI; configurable via env
    const PRO_MODEL = 'projects/'.'{PROJECT}'.'/locations/'.'{LOCATION}'.'/publishers/google/models/gemini-2.5-pro';
    const FLASH_MODEL = 'projects/'.'{PROJECT}'.'/locations/'.'{LOCATION}'.'/publishers/google/models/gemini-2.5-flash';

    private function model(string $name): string
    {
        $project = env('GOOGLE_PROJECT');
        $location = env('GOOGLE_LOCATION', 'us-central1');
        if (!$project) {
            throw new ValidationException('Vertex AI not configured: GOOGLE_PROJECT missing');
        }
        return str_replace(['{PROJECT}','{LOCATION}'], [$project, $location], $name);
    }

    /**
     * Minimal JSON generation helper via Vertex AI Predict API.
     * Note: For production, consider the Generative Language API client when available.
     */
    public function generateJson(array $args): array
    {
        $schema = $args['schema'] ?? null; // Unused placeholder to mirror TS signature
        $prompt = $args['prompt'] ?? '';
        $temperature = $args['temperature'] ?? 0.3;
        $modelName = $args['model'] ?? self::PRO_MODEL;
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

        $client = new PredictionServiceClient($this->googleClientOptions());

        // Build instances as Protobuf Values (Struct)
        $instanceStruct = new Struct();
        $instanceStruct->setFields([
            'prompt' => (new Value())->setStringValue($prompt),
        ]);
        $instanceValue = new Value();
        $instanceValue->setStructValue($instanceStruct);

        // Build parameters as Protobuf Value (Struct)
        $paramsStruct = new Struct();
        $paramsStruct->setFields([
            'temperature' => (new Value())->setNumberValue((float) $temperature),
            'response_mime_type' => (new Value())->setStringValue('application/json'),
        ]);
        $paramsValue = new Value();
        $paramsValue->setStructValue($paramsStruct);

        $endpoint = $this->model($modelName);

        // Basic retry once
        $last = null;
        for ($i = 0; $i < 2; $i++) {
            try {
                Log::info('ai.generate.attempt', ['action' => $action, 'attempt' => $i + 1]);
                // Signature: predict(string $endpoint, Value[] $instances, array $optionalArgs = ['parameters' => Value])
                $response = $client->predict($endpoint, [$instanceValue], ['parameters' => $paramsValue]);
                $predictions = $response->getPredictions();
                foreach ($predictions as $p) {
                    // Convert prediction Value to array
                    $jsonStr = method_exists($p, 'serializeToJsonString') ? $p->serializeToJsonString() : null;
                    $json = $jsonStr ? json_decode($jsonStr, true) : null;
                    if (is_array($json)) {
                        $totalTokens = 0;
                        $meta = $response->getMetadata();
                        if (is_array($meta) && isset($meta['total_tokens'])) {
                            $totalTokens = (int) $meta['total_tokens'];
                        }
                        $this->recordUsage($action, $modelName, $totalTokens, 0, $userId, $projectId, $metadata);
                        Log::info('ai.generate.success', [
                            'action' => $action,
                            'model' => $modelName,
                            'total_tokens' => $totalTokens,
                            'keys' => array_keys($json),
                        ]);
                        return $json;
                    }
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
            'schema' => null,
            'prompt' => $prompt,
            'temperature' => 0.1,
            'model' => self::FLASH_MODEL,
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

    private function googleClientOptions(): array
    {
        $opts = [
            'apiEndpoint' => env('GOOGLE_LOCATION', 'us-central1').'-aiplatform.googleapis.com',
        ];
        // Prefer base64-encoded credentials JSON
        $b64 = env('GOOGLE_CREDENTIALS_B64');
        if (is_string($b64) && $b64 !== '') {
            $json = base64_decode($b64, true);
            if ($json !== false) {
                $arr = json_decode($json, true);
                if (is_array($arr) && isset($arr['client_email'])) {
                    $opts['credentials'] = $arr; // pass keyFile array directly
                    return $opts;
                }
            }
        }
        // Fallback: relative path from env (resolved to absolute)
        $rel = env('GOOGLE_CREDENTIALS_PATH');
        if (is_string($rel) && $rel !== '') {
            $path = str_starts_with($rel, DIRECTORY_SEPARATOR) ? $rel : base_path($rel);
            $opts['credentials'] = $path;
            return $opts;
        }
        // Final fallback: ADC via GOOGLE_APPLICATION_CREDENTIALS or gcloud ADC
        return $opts;
    }
}
