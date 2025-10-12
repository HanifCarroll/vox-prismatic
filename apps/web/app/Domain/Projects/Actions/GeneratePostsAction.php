<?php

namespace App\Domain\Projects\Actions;

use App\Domain\Posts\Data\PostDraft;
use App\Domain\Posts\Services\PostDraftGenerator;
use App\Domain\Posts\Services\PostDraftPersister;
use App\Domain\Posts\Services\StyleProfileResolver;
use App\Domain\Posts\Support\InsightContextBuilder;
use App\Domain\Posts\Support\ObjectiveScheduler;
use App\Domain\Posts\Support\PostHookInspector;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class GeneratePostsAction
{
    public function __construct(
        private readonly PostDraftGenerator $generator,
        private readonly PostDraftPersister $persister,
        private readonly StyleProfileResolver $styleProfiles,
        private readonly ObjectiveScheduler $objectives,
        private readonly InsightContextBuilder $contextBuilder,
    ) {
    }

    public function execute(string $projectId, int $max = 10): int
    {
        $projectRow = DB::table('content_projects')
            ->select('user_id', 'transcript_original')
            ->where('id', $projectId)
            ->first();

        if (! $projectRow) {
            return 0;
        }

        $userId = $projectRow->user_id ? (string) $projectRow->user_id : null;
        $styleProfile = $userId
            ? $this->styleProfiles->forUser($userId)
            : $this->styleProfiles->forProject($projectId);

        $insights = $this->pendingInsights($projectId, $max);

        if ($insights->isEmpty()) {
            return 0;
        }

        $objectiveSchedule = $this->objectives->build($insights->count(), $styleProfile);
        $transcript = $this->normalizeTranscript($projectRow->transcript_original ?? null);
        $recentHooks = $this->recentHooksForProject($projectId);

        $drafts = [];

        foreach ($insights as $index => $insight) {
            $context = $this->contextBuilder->build(
                $transcript,
                isset($insight->source_start_offset) ? (int) $insight->source_start_offset : null,
                isset($insight->source_end_offset) ? (int) $insight->source_end_offset : null,
            );

            $objective = $objectiveSchedule[$index] ?? 'educate';

            $draft = $this->generator->generateFromInsight(
                $projectId,
                (string) $insight->id,
                (string) $insight->content,
                isset($insight->quote) ? trim((string) $insight->quote) : null,
                $context,
                $styleProfile,
                $objective,
                $recentHooks,
                $userId,
            );

            if ($draft instanceof PostDraft) {
                $drafts[] = $draft;
                $hook = PostHookInspector::extractHook($draft->content);
                if ($hook) {
                    $recentHooks = PostHookInspector::appendHook($recentHooks, $hook);
                }
            }
        }

        if (empty($drafts)) {
            return 0;
        }

        return $this->persister->persist($projectId, $drafts);
    }

    private function pendingInsights(string $projectId, int $max): Collection
    {
        $existingInsightIds = DB::table('posts')
            ->where('project_id', $projectId)
            ->pluck('insight_id')
            ->filter()
            ->map(fn ($id) => (string) $id)
            ->values()
            ->all();

        return DB::table('insights')
            ->select('id', 'content', 'quote', 'source_start_offset', 'source_end_offset')
            ->where('project_id', $projectId)
            ->when(count($existingInsightIds) > 0, fn ($query) => $query->whereNotIn('id', $existingInsightIds))
            ->orderBy('created_at')
            ->limit($max)
            ->get();
    }

    private function normalizeTranscript(mixed $value): string
    {
        return is_string($value) ? $value : '';
    }

    /**
     * @return array<int, string>
     */
    private function recentHooksForProject(string $projectId): array
    {
        $contents = DB::table('posts')
            ->where('project_id', $projectId)
            ->orderByDesc('created_at')
            ->limit(8)
            ->pluck('content');

        return PostHookInspector::extractHooks($contents);
    }
}
