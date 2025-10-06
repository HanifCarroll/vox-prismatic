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
        DB::table('content_projects')
            ->where('id', $projectId)
            ->update(array_merge([
                'processing_progress' => $progress,
                'processing_step' => $step,
                'updated_at' => now(),
            ], $extra));

        event(new ProjectProcessingProgress($projectId, $step, $progress));
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
