<?php

namespace App\Jobs;

use App\Domain\Projects\Actions\CleanTranscriptAction;
use App\Domain\Projects\Actions\ExtractInsightsAction;
use App\Domain\Projects\Actions\GeneratePostsAction;
use App\Events\ProjectProcessingCompleted;
use App\Events\ProjectProcessingFailed;
use App\Events\ProjectProcessingProgress;
use App\Models\ContentProject;
use App\Services\AiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrchestrateProjectJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600; // 10 minutes
    public int $tries = 3;
    public int $backoff = 60; // 1 minute between retries

    public function __construct(
        public string $projectId,
    ) {
        $this->onQueue('processing');
    }

    public function uniqueId(): string
    {
        return (string) $this->projectId;
    }

    public function handle(
        AiService $ai,
        CleanTranscriptAction $clean,
        ExtractInsightsAction $extract,
        GeneratePostsAction $generate,
    ): void {
        $p = ContentProject::query()->where('id', $this->projectId)->first();
        if (!$p) {
            Log::warning('project_not_found', ['projectId' => $this->projectId]);
            return;
        }

        try {
            // Started
            $this->updateProgress(0, 'started');
            $this->sleepIfNotTesting();

            // Normalize transcript
            $this->updateProgress(10, 'normalize_transcript');
            DB::transaction(function () use ($clean, $ai) {
                $clean->execute($this->projectId, $ai);
            });
            $this->sleepIfNotTesting();

            // Extract insights (max 10)
            $this->updateProgress(40, 'generate_insights');
            DB::transaction(function () use ($extract, $ai) {
                $extract->execute($this->projectId, $ai, 10);
            });
            $this->updateProgress(60, 'insights_ready');
            $this->sleepIfNotTesting();

            // Generate posts (one per insight, only if none exist yet)
            $this->updateProgress(80, 'generate_posts');
            $created = 0;
            DB::transaction(function () use (&$created, $generate, $ai) {
                $created = $generate->execute($this->projectId, $ai, 10);
            });
            $this->updateProgress(90, 'posts_ready');
            $this->sleepIfNotTesting();

            // Complete: set stage to 'posts' regardless (no-op if already posts exist)
            DB::table('content_projects')
                ->where('id', $this->projectId)
                ->update([
                    'current_stage' => 'posts',
                    'processing_progress' => 100,
                    'processing_step' => 'complete',
                    'updated_at' => now(),
                ]);

            $this->updateProgress(100, 'complete');
            event(new ProjectProcessingCompleted($this->projectId));
        } catch (\Throwable $e) {
            Log::error('project_process_failed', [
                'projectId' => $this->projectId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            DB::table('content_projects')
                ->where('id', $this->projectId)
                ->update([
                    'processing_step' => 'error',
                    'updated_at' => now(),
                ]);
            event(new ProjectProcessingFailed($this->projectId, 'Processing failed.'));
            throw $e;
        }
    }

    private function updateProgress(int $progress, string $step): void
    {
        DB::table('content_projects')
            ->where('id', $this->projectId)
            ->update([
                'processing_progress' => $progress,
                'processing_step' => $step,
                'updated_at' => now(),
            ]);
        event(new ProjectProcessingProgress($this->projectId, $step, $progress));
    }

    private function sleepIfNotTesting(): void
    {
        if (!app()->environment('testing')) {
            usleep(300000); // 300ms
        }
    }
}

