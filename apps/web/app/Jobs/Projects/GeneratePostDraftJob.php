<?php

namespace App\Jobs\Projects;

use App\Domain\Posts\Data\PostDraft;
use App\Domain\Posts\Services\PostDraftGenerator;
use App\Domain\Posts\Services\PostDraftPersister;
use App\Domain\Posts\Services\StyleProfileResolver;
use App\Domain\Posts\Support\InsightContextBuilder;
use App\Jobs\Projects\Concerns\InteractsWithProjectProcessing;
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

class GeneratePostDraftJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;
    use InteractsWithProjectProcessing;
    use Batchable;

    public int $tries = 2;
    public int $backoff = 90;
    public int $timeout = 180;

    public function __construct(
        public string $projectId,
        public string $insightId,
        public string $objective,
        public int $position,
        public int $total,
    ) {
        $this->onQueue('processing');
    }

    public function uniqueId(): string
    {
        return $this->projectId . ':post:' . $this->insightId;
    }

    public function handle(
        PostDraftGenerator $generator,
        PostDraftPersister $persister,
        StyleProfileResolver $styleProfiles,
        InsightContextBuilder $contextBuilder,
    ): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        if (! $this->projectExists($this->projectId)) {
            return;
        }

        try {
            $insight = DB::table('insights')
                ->select('content', 'quote', 'source_start_offset', 'source_end_offset')
                ->where('id', $this->insightId)
                ->where('project_id', $this->projectId)
                ->first();

            if (! $insight) {
                $this->updateProgress($this->projectId, 'posts', $this->progressPoint());
                return;
            }

            $exists = DB::table('posts')
                ->where('project_id', $this->projectId)
                ->where('insight_id', $this->insightId)
                ->exists();

            if ($exists) {
                $this->updateProgress($this->projectId, 'posts', $this->progressPoint());
                return;
            }

            $projectRow = DB::table('content_projects')
                ->select('user_id', 'transcript_original')
                ->where('id', $this->projectId)
                ->first();

            $userId = $projectRow?->user_id ? (string) $projectRow->user_id : null;
            $styleProfile = $userId
                ? $styleProfiles->forUser($userId)
                : $styleProfiles->forProject($this->projectId);

            $transcriptValue = $projectRow?->transcript_original ?? null;
            $transcript = is_string($transcriptValue) ? $transcriptValue : '';

            $context = $contextBuilder->build(
                $transcript,
                isset($insight->source_start_offset) ? (int) $insight->source_start_offset : null,
                isset($insight->source_end_offset) ? (int) $insight->source_end_offset : null,
            );

            $draft = $generator->generateFromInsight(
                $this->projectId,
                $this->insightId,
                (string) $insight->content,
                isset($insight->quote) ? trim((string) $insight->quote) : null,
                $context,
                $styleProfile,
                $this->objective,
                $userId,
            );

            if ($draft instanceof PostDraft) {
                $persister->persist($this->projectId, [$draft]);
                $this->updateProgress($this->projectId, 'posts', $this->progressPoint());
            } else {
                Log::warning('projects.posts.draft_skipped', [
                    'project_id' => $this->projectId,
                    'insight_id' => $this->insightId,
                    'reason' => 'draft_generation_failed',
                ]);

                $this->updateProgress($this->projectId, 'posts', $this->progressPoint());
            }
        } catch (Throwable $e) {
            Log::error('projects.posts.draft_error', [
                'project_id' => $this->projectId,
                'insight_id' => $this->insightId,
                'error' => $e->getMessage(),
            ]);

            $this->failStage($this->projectId, 'posts', $e, 90);
        }
    }

    private function progressPoint(): int
    {
        $fraction = $this->total > 0 ? ($this->position / max(1, $this->total)) : 1;
        $value = 90 + (int) floor($fraction * 9);

        return max(90, min(99, $value));
    }
}
