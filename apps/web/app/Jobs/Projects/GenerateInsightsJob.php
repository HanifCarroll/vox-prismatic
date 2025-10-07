<?php

namespace App\Jobs\Projects;

use App\Domain\Projects\Actions\ExtractInsightsAction;
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

    public function handle(AiService $ai, ExtractInsightsAction $extract): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        if (!$this->projectExists($this->projectId)) {
            Log::warning('projects.processing.project_missing', [
                'stage' => 'insights',
                'project_id' => $this->projectId,
            ]);

            return;
        }

        $this->updateProgress($this->projectId, 'insights', 50);

        try {
            $extract->execute($this->projectId, $ai, 10, function (int $pct) {
                // Bound to [50, 90] during insights phase
                $bounded = max(50, min(90, $pct));
                $this->updateProgress($this->projectId, 'insights', $bounded);
            });

            $next = new GeneratePostsJob($this->projectId);
            if ($batch = $this->batch()) {
                $batch->add([$next]);
            } else {
                GeneratePostsJob::dispatch($this->projectId);
            }
        } catch (Throwable $e) {
            $this->failStage($this->projectId, 'insights', $e, 50);
        }
    }
}
