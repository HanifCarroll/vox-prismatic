<?php

namespace App\Services\Ai;

use App\Models\AiUsageEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiUsageRecorder
{
    private array $projectUserCache = [];

    public function record(
        string $action,
        string $modelIdentifier,
        int $inputTokens,
        int $outputTokens,
        ?string $userId,
        ?string $projectId,
        array $metadata
    ): float {
        $cost = $this->estimateCost($modelIdentifier, $inputTokens, $outputTokens);
        $resolvedUserId = $this->resolveUserId($userId, $projectId);

        try {
            AiUsageEvent::create([
                'id' => (string) Str::uuid(),
                'action' => $action,
                'model' => $modelIdentifier,
                'user_id' => $resolvedUserId,
                'project_id' => $projectId,
                'input_tokens' => $inputTokens,
                'output_tokens' => $outputTokens,
                'cost_usd' => $cost,
                'metadata' => $metadata,
                'created_at' => now(),
            ]);
        } catch (\Throwable $exception) {
            Log::warning('ai_usage_audit_insert_failed', ['error' => $exception->getMessage()]);
        }

        return $cost;
    }

    private function estimateCost(string $model, int $inputTokens, int $outputTokens): float
    {
        $provider = null;
        $modelKey = $model;
        if (str_contains($model, ':')) {
            [$provider, $modelKey] = explode(':', $model, 2);
            $provider = strtolower(trim($provider));
        }

        $pricing = $provider === 'openai'
            ? config('services.openai.pricing', [])
            : config('services.gemini.pricing', []);

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

    private function resolveUserId(?string $userId, ?string $projectId): ?string
    {
        if ($userId !== null && $userId !== '') {
            return $userId;
        }

        if (!$projectId) {
            return null;
        }

        if (array_key_exists($projectId, $this->projectUserCache)) {
            return $this->projectUserCache[$projectId];
        }

        try {
            $found = DB::table('content_projects')
                ->where('id', $projectId)
                ->value('user_id');

            if ($found) {
                return $this->projectUserCache[$projectId] = (string) $found;
            }
        } catch (\Throwable $exception) {
            Log::warning('ai_usage.lookup_user_failed', [
                'project_id' => $projectId,
                'error' => $exception->getMessage(),
            ]);
        }

        return $this->projectUserCache[$projectId] = null;
    }
}
