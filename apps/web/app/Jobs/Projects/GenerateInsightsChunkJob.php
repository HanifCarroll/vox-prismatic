<?php

namespace App\Jobs\Projects;

use App\Domain\Projects\Actions\ExtractInsightsAction;
use App\Jobs\Projects\Concerns\InteractsWithProjectProcessing;
use App\Services\AiService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class GenerateInsightsChunkJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;
    use InteractsWithProjectProcessing;
    use Batchable;

    public int $tries = 2;
    public int $backoff = 60;
    public int $timeout = 120;

    public function __construct(
        public string $projectId,
        public int $chunkIndex,
        public int $totalChunks,
        public string $chunkContent,
        public ?int $chunkStartOffset = null,
        public ?int $chunkEndOffset = null,
        public ?string $userId = null,
    ) {
        $this->onQueue('processing');
    }

    public function handle(AiService $ai, ExtractInsightsAction $extract): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        if (! $this->projectExists($this->projectId)) {
            return;
        }

        try {
            $extract->mapChunk(
                $this->projectId,
                $ai,
                $this->chunkContent,
                $this->chunkIndex,
                $this->totalChunks,
                $this->userId,
                $this->chunkStartOffset,
                $this->chunkEndOffset,
            );

            $progress = 10 + (int) floor(($this->chunkIndex / max(1, $this->totalChunks)) * 70);
            $this->updateProgress($this->projectId, 'insights', max(10, min(80, $progress)));
        } catch (Throwable $e) {
            $this->failStage($this->projectId, 'insights', $e, 10);
        }
    }
}
