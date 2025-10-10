<?php

namespace App\Jobs\Projects;

use App\Domain\Projects\Actions\GeneratePostsAction;
use App\Jobs\Projects\Concerns\InteractsWithProjectProcessing;
use App\Services\AiService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class GeneratePostsJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable;
    use Batchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;
    use InteractsWithProjectProcessing;

    public int $timeout = 600;
    public int $tries = 3;
    public int $backoff = 120;

    public function __construct(public string $projectId)
    {
        $this->onQueue('processing');
    }

    public function uniqueId(): string
    {
        return $this->projectId;
    }

    public function handle(AiService $ai, GeneratePostsAction $generate): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        if (! $this->projectExists($this->projectId)) {
            Log::warning('projects.processing.project_missing', [
                'stage' => 'posts',
                'project_id' => $this->projectId,
            ]);

            return;
        }

        try {
            $projectRow = DB::table('content_projects')
                ->select('user_id', 'posts_started_at')
                ->where('id', $this->projectId)
                ->first();

            $now = now();

            if (! $projectRow?->posts_started_at) {
                DB::table('content_projects')
                    ->where('id', $this->projectId)
                    ->update([
                        'posts_started_at' => $now,
                        'updated_at' => $now,
                    ]);
            }

            $this->updateProgress($this->projectId, 'posts', 90);

            $userId = $projectRow?->user_id ? (string) $projectRow->user_id : null;

            $existingInsightIds = DB::table('posts')
                ->where('project_id', $this->projectId)
                ->pluck('insight_id')
                ->filter()
                ->map(fn ($id) => (string) $id)
                ->values()
                ->all();

            $pendingInsights = DB::table('insights')
                ->select('id')
                ->where('project_id', $this->projectId)
                ->when(count($existingInsightIds) > 0, fn ($query) => $query->whereNotIn('id', $existingInsightIds))
                ->orderBy('created_at')
                ->limit(10)
                ->get();

            if ($pendingInsights->isEmpty()) {
                FinalizePostsGenerationJob::dispatch($this->projectId);
                return;
            }

            $pendingInsights = $pendingInsights->values();
            $styleProfile = $generate->resolveStyleProfile($this->projectId, $userId);
            $objectiveSchedule = $generate->buildObjectiveSchedule($pendingInsights->count(), $styleProfile);

            $jobs = [];
            foreach ($pendingInsights as $index => $insight) {
                $objective = $objectiveSchedule[$index] ?? 'educate';
                $jobs[] = new GeneratePostDraftJob(
                    $this->projectId,
                    (string) $insight->id,
                    $objective,
                    $index + 1,
                    $pendingInsights->count(),
                );
            }

            $projectId = $this->projectId;

            $batch = Bus::batch($jobs)
                ->onQueue('processing')
                ->name('project-posts:' . $projectId)
                ->then(function () use ($projectId): void {
                    FinalizePostsGenerationJob::dispatch($projectId);
                })
                ->dispatch();

            DB::table('content_projects')
                ->where('id', $this->projectId)
                ->update([
                    'processing_batch_id' => $batch->id,
                    'updated_at' => now(),
                ]);
        } catch (Throwable $e) {
            $this->failStage($this->projectId, 'posts', $e, 90);
        }
    }
}
