<?php

namespace App\Jobs\Projects;

use App\Domain\Projects\Actions\ExtractInsightsAction;
use App\Jobs\Projects\Concerns\InteractsWithProjectProcessing;
use App\Services\ProjectProcessingMetricsService;
use App\Services\AiService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class GenerateInsightsJob implements ShouldQueue, ShouldBeUnique
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

    public function handle(
        AiService $ai,
        ExtractInsightsAction $extract,
        ProjectProcessingMetricsService $metrics,
    ): void
    {
        $project = DB::table('content_projects')
            ->select('title', 'transcript_original', 'user_id', 'insights_started_at')
            ->where('id', $this->projectId)
            ->first();

        if ($this->batch()?->cancelled()) {
            return;
        }

        if (!$project) {
            Log::warning('projects.processing.project_missing', [
                'stage' => 'insights',
                'project_id' => $this->projectId,
            ]);

            return;
        }

        $title = trim((string) ($project->title ?? ''));
        if ($title === '' || strcasecmp($title, 'Untitled Project') === 0) {
            $transcript = trim((string) ($project->transcript_original ?? ''));
            if ($transcript !== '') {
                try {
                    $userId = isset($project->user_id) ? (string) $project->user_id : null;
                    $generatedTitle = $ai->generateTranscriptTitle($transcript, $this->projectId, $userId);

                    if ($generatedTitle !== '') {
                        DB::table('content_projects')
                            ->where('id', $this->projectId)
                            ->update([
                                'title' => $generatedTitle,
                                'updated_at' => now(),
                            ]);
                    }
                } catch (Throwable $e) {
                    Log::warning('projects.processing.title_generation_failed', [
                        'project_id' => $this->projectId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        $existingStart = $project->insights_started_at ? Carbon::parse($project->insights_started_at) : null;
        $started = $existingStart ?? now();

        if (! $existingStart) {
            DB::table('content_projects')
                ->where('id', $this->projectId)
                ->update([
                    'insights_started_at' => $started,
                    'updated_at' => $started,
                ]);
        }

        $this->updateProgress($this->projectId, 'insights', 10);

        $transcript = trim((string) ($project->transcript_original ?? ''));
        $length = mb_strlen($transcript, 'UTF-8');
        $threshold = (int) config('insights.threshold_chars', 12000);

        if ($length === 0 || $length <= $threshold) {
            try {
                $this->runInlineExtraction($extract, $ai, $metrics, $started);
            } catch (Throwable $e) {
                $this->failStage($this->projectId, 'insights', $e, 10);
            }

            return;
        }

        try {
            $chunks = $extract->chunkTranscript($transcript);

            if (empty($chunks) || count($chunks) === 1) {
                $this->runInlineExtraction($extract, $ai, $metrics, $started);

                return;
            }

            $userId = isset($project->user_id) ? (string) $project->user_id : null;
            $totalChunks = count($chunks);

            $jobs = [];
            foreach ($chunks as $index => $chunk) {
                $chunkText = (string) ($chunk['text'] ?? '');
                $chunkStart = isset($chunk['start']) ? (int) $chunk['start'] : null;
                $chunkEnd = isset($chunk['end']) ? (int) $chunk['end'] : null;
                $jobs[] = new GenerateInsightsChunkJob(
                    $this->projectId,
                    $index + 1,
                    $totalChunks,
                    $chunkText,
                    $chunkStart,
                    $chunkEnd,
                    $userId,
                );
            }

            $projectId = $this->projectId;

            $batch = Bus::batch($jobs)
                ->onQueue('processing')
                ->name('project-insights:' . $projectId)
                ->then(function () use ($projectId): void {
                    ReduceInsightCandidatesJob::dispatch($projectId);
                })
                ->dispatch();

            DB::table('content_projects')
                ->where('id', $this->projectId)
                ->update([
                    'processing_batch_id' => $batch->id,
                    'updated_at' => now(),
                ]);
        } catch (Throwable $e) {
            $this->failStage($this->projectId, 'insights', $e, 10);
        }
    }

    private function runInlineExtraction(
        ExtractInsightsAction $extract,
        AiService $ai,
        ProjectProcessingMetricsService $metrics,
        Carbon $started
    ): void {
        $extract->execute($this->projectId, $ai, 10, function (int $pct): void {
            $bounded = max(10, min(90, $pct));
            $this->updateProgress($this->projectId, 'insights', $bounded);
        });

        $completedAt = now();

        DB::table('content_projects')
            ->where('id', $this->projectId)
            ->update([
                'insights_completed_at' => $completedAt,
                'updated_at' => $completedAt,
            ]);

        $durationMs = (int) max(0, $started->diffInMilliseconds($completedAt));
        $metrics->record($this->projectId, 'insights', $durationMs);

        $next = new GeneratePostsJob($this->projectId);
        if ($batch = $this->batch()) {
            $batch->add([$next]);
        } else {
            GeneratePostsJob::dispatch($this->projectId);
        }
    }
}
