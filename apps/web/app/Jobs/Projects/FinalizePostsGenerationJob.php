<?php

namespace App\Jobs\Projects;

use App\Events\ProjectProcessingCompleted;
use App\Jobs\Projects\Concerns\InteractsWithProjectProcessing;
use App\Services\ProjectProcessingMetricsService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FinalizePostsGenerationJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;
    use InteractsWithProjectProcessing;
    use Batchable;

    public int $tries = 3;
    public int $backoff = 120;
    public int $timeout = 180;

    public function __construct(public string $projectId)
    {
        $this->onQueue('processing');
    }

    public function uniqueId(): string
    {
        return $this->projectId . ':posts_finalize';
    }

    public function handle(ProjectProcessingMetricsService $metrics): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        if (! $this->projectExists($this->projectId)) {
            return;
        }

        $projectRow = DB::table('content_projects')
            ->select('posts_started_at', 'insights_started_at', 'created_at')
            ->where('id', $this->projectId)
            ->first();

        $postsStartedAt = $projectRow?->posts_started_at ? Carbon::parse($projectRow->posts_started_at) : now();
        $pipelineStartedAt = $projectRow?->insights_started_at
            ? Carbon::parse($projectRow->insights_started_at)
            : ($projectRow?->created_at ? Carbon::parse($projectRow->created_at) : now());

        $completedAt = now();

        $this->updateProgress($this->projectId, 'posts', 100, [
            'current_stage' => 'posts',
        ]);

        DB::table('content_projects')
            ->where('id', $this->projectId)
            ->update([
                'posts_completed_at' => $completedAt,
                'updated_at' => $completedAt,
            ]);

        $postsDurationMs = (int) max(0, $postsStartedAt->diffInMilliseconds($completedAt));
        $metrics->record($this->projectId, 'posts', $postsDurationMs);

        Log::info('projects.posts.total_duration', [
            'project_id' => $this->projectId,
            'duration_ms' => $postsDurationMs,
            'result' => 'success',
        ]);

        $totalDurationMs = (int) max(0, $pipelineStartedAt->diffInMilliseconds($completedAt));
        Log::info('projects.processing.completed', [
            'project_id' => $this->projectId,
            'duration_ms' => $totalDurationMs,
            'posts_duration_ms' => $postsDurationMs,
        ]);

        event(new ProjectProcessingCompleted($this->projectId));
    }
}
