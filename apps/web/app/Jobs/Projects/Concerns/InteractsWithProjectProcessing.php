<?php

namespace App\Jobs\Projects\Concerns;

use App\Events\ProjectProcessingFailed;
use App\Events\ProjectProcessingProgress;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

trait InteractsWithProjectProcessing
{
    protected function projectExists(string $projectId): bool
    {
        return DB::table('content_projects')->where('id', $projectId)->exists();
    }

    protected function updateProgress(string $projectId, string $step, int $progress, array $extra = []): void
    {
        $eventStep = null;
        $eventProgress = null;

        DB::transaction(function () use (&$eventStep, &$eventProgress, $projectId, $step, $progress, $extra) {
            $record = DB::table('content_projects')
                ->select('processing_progress', 'processing_step')
                ->where('id', $projectId)
                ->lockForUpdate()
                ->first();

            if (! $record) {
                return;
            }

            $currentProgress = (int) ($record->processing_progress ?? 0);
            $nextProgress = max($currentProgress, max(0, min(100, $progress)));

            $order = [
                'queued' => 0,
                'insights' => 1,
                'posts' => 2,
                'complete' => 3,
                'completed' => 3,
                'ready' => 4,
            ];

            $currentStepValue = is_string($record->processing_step) ? strtolower($record->processing_step) : null;
            $incomingStepValue = strtolower($step);
            $currentRank = $order[$currentStepValue] ?? -1;
            $incomingRank = $order[$incomingStepValue] ?? $currentRank;

            $stepToPersist = $incomingRank < $currentRank ? ($record->processing_step ?? $step) : $step;

            DB::table('content_projects')
                ->where('id', $projectId)
                ->update(array_merge([
                    'processing_progress' => $nextProgress,
                    'processing_step' => $stepToPersist,
                    'updated_at' => now(),
                ], $extra));

            $eventStep = $stepToPersist;
            $eventProgress = $nextProgress;
        });

        if ($eventStep !== null && $eventProgress !== null) {
            event(new ProjectProcessingProgress($projectId, $eventStep, $eventProgress));
        }
    }

    protected function failStage(string $projectId, string $stage, Throwable $e, ?int $progress = null): never
    {
        Log::error('projects.processing.failed', [
            'project_id' => $projectId,
            'stage' => $stage,
            'error' => $e->getMessage(),
        ]);

        $update = [
            'processing_step' => 'error',
            'updated_at' => now(),
        ];

        if ($progress !== null) {
            $update['processing_progress'] = $progress;
        }

        DB::table('content_projects')
            ->where('id', $projectId)
            ->update($update);

        $message = Str::of("Processing failed during {$stage}: " . ($e->getMessage() ?: ''))
            ->squish()
            ->limit(180, '…')
            ->toString();

        event(new ProjectProcessingFailed($projectId, $message));

        throw $e;
    }
}
