<?php

namespace App\Jobs\Projects;

use App\Domain\Projects\Actions\CleanTranscriptAction;
use App\Jobs\Projects\Concerns\InteractsWithProjectProcessing;
use App\Services\AiService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class CleanTranscriptJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable;
    use Batchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;
    use InteractsWithProjectProcessing;

    public int $timeout = 600;
    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(public string $projectId)
    {
        $this->onQueue('processing');
    }

    public function uniqueId(): string
    {
        return $this->projectId;
    }

    public function handle(AiService $ai, CleanTranscriptAction $clean): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        if (!$this->projectExists($this->projectId)) {
            Log::warning('projects.processing.project_missing', [
                'stage' => 'cleaning',
                'project_id' => $this->projectId,
            ]);

            return;
        }

        $this->updateProgress($this->projectId, 'cleaning', 10);

        try {
            $startedAt = microtime(true);

            Log::info('projects.clean.start', [
                'project_id' => $this->projectId,
            ]);

            if ($this->batch()?->cancelled()) {
                Log::info('projects.clean.cancelled', ['project_id' => $this->projectId, 'phase' => 'before-execution']);
                return;
            }

            $clean->execute($this->projectId, $ai, function (int $pct) {
                // Clamp to cleaning band [10,45]
                $bounded = max(10, min(45, $pct));
                $this->updateProgress($this->projectId, 'cleaning', $bounded);
            });

            if ($this->batch()?->cancelled()) {
                Log::info('projects.clean.cancelled', ['project_id' => $this->projectId, 'phase' => 'after-execution']);
                return;
            }

            // Mark cleaning as finished before handing off
            $this->updateProgress($this->projectId, 'cleaning', 50);

            Log::info('projects.clean.finished', [
                'project_id' => $this->projectId,
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);

            $next = new GenerateInsightsJob($this->projectId);
            if ($batch = $this->batch()) {
                $batch->add([$next]);
            } else {
                GenerateInsightsJob::dispatch($this->projectId);
            }
        } catch (Throwable $e) {
            $this->failStage($this->projectId, 'cleaning', $e, 10);
        }
    }
}
