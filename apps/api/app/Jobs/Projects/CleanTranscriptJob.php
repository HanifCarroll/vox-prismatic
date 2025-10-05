<?php

namespace App\Jobs\Projects;

use App\Domain\Projects\Actions\CleanTranscriptAction;
use App\Jobs\Projects\Concerns\InteractsWithProjectProcessing;
use App\Services\AiService;
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
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;
    use InteractsWithProjectProcessing;

    public int $timeout = 300;
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
        if (!$this->projectExists($this->projectId)) {
            Log::warning('projects.processing.project_missing', [
                'stage' => 'cleaning',
                'project_id' => $this->projectId,
            ]);

            return;
        }

        $this->updateProgress($this->projectId, 'cleaning', 10);

        try {
            DB::transaction(function () use ($clean, $ai) {
                $clean->execute($this->projectId, $ai);
            });
        } catch (Throwable $e) {
            $this->failStage($this->projectId, 'cleaning', $e, 10);
        }
    }
}
