<?php

namespace App\Services;

use App\Exceptions\ValidationException;
use App\Models\AiUsageEvent;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Google\Cloud\AIPlatform\V1\PredictionServiceClient;
use Google\Cloud\AIPlatform\V1\PredictRequest;

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
            throw new ValidationException('Prompt is required');
        }

        $client = new PredictionServiceClient($this->googleClientOptions());

        $instances = [
            ['prompt' => $prompt]
        ];
        $parameters = ['temperature' => $temperature, 'response_mime_type' => 'application/json'];

        $request = (new PredictRequest())
            ->setEndpoint($this->model($modelName))
            ->setInstances([json_encode($instances)])
            ->setParameters(json_encode($parameters));

        // Basic retry once
        $last = null;
        for ($i = 0; $i < 2; $i++) {
            try {
                $response = $client->predict($request);
                $predictions = $response->getPredictions();
                foreach ($predictions as $p) {
                    $json = json_decode($p->getValue(), true);
                    if (is_array($json)) {
                        $this->recordUsage($action, $modelName, (int)($response->getMetadata()['total_tokens'] ?? 0), 0, $userId, $projectId, $metadata);
                        return $json;
                    }
                }
            } catch (\Throwable $e) {
                $last = $e;
            }
        }
        if ($last instanceof ValidationException) throw $last;
        throw new ValidationException('AI generation failed');
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
            throw new ValidationException('Failed to normalize transcript');
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
