<?php

namespace App\Jobs\Projects;

use App\Domain\Projects\Actions\GeneratePostsAction;
use App\Events\ProjectProcessingCompleted;
use App\Jobs\Projects\Concerns\InteractsWithProjectProcessing;
use App\Services\AiService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
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

        if (!$this->projectExists($this->projectId)) {
            Log::warning('projects.processing.project_missing', [
                'stage' => 'posts',
                'project_id' => $this->projectId,
            ]);

            return;
        }

        $this->updateProgress($this->projectId, 'posts', 90);

        try {
            $generate->execute($this->projectId, $ai, 10);

            $this->updateProgress($this->projectId, 'posts', 100, [
                'current_stage' => 'posts',
            ]);

            event(new ProjectProcessingCompleted($this->projectId));
        } catch (Throwable $e) {
            $this->failStage($this->projectId, 'posts', $e, 90);
        }
    }
}
