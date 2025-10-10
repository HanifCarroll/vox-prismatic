<?php

namespace App\Jobs\Projects;

use App\Domain\Projects\Actions\ExtractInsightsAction;
use App\Jobs\Projects\Concerns\InteractsWithProjectProcessing;
use App\Services\AiService;
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
use Throwable;

class ReduceInsightCandidatesJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;
    use InteractsWithProjectProcessing;
    use Batchable;

    public int $tries = 3;
    public int $backoff = 120;
    public int $timeout = 300;

    public function __construct(public string $projectId, public int $maxInsights = 10)
    {
        $this->onQueue('processing');
    }

    public function uniqueId(): string
    {
        return $this->projectId . ':reduce_insights';
    }

    public function handle(
        AiService $ai,
        ExtractInsightsAction $extract,
        ProjectProcessingMetricsService $metrics,
    ): void {
        if ($this->batch()?->cancelled()) {
            return;
        }

        if (! $this->projectExists($this->projectId)) {
            return;
        }

        $startedAt = DB::table('content_projects')->where('id', $this->projectId)->value('insights_started_at');
        $started = $startedAt ? Carbon::parse($startedAt) : now();

        try {
            $extract->execute($this->projectId, $ai, $this->maxInsights, function (int $pct): void {
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
        } catch (Throwable $e) {
            $this->failStage($this->projectId, 'insights', $e, 85);
        }
    }
}
