<?php

namespace App\Jobs;

use App\Domain\Posts\Repositories\PostRepository;
use App\Domain\Posts\Services\PostRegenerator;
use App\Domain\Posts\Services\PostStateService;
use App\Events\PostRegenerated;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegeneratePostsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600; // 10 minutes
    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public string $postId,
        public ?string $customInstructions = null,
        public ?string $triggeredByUserId = null,
        public ?string $postType = null,
    ) {
        $this->postType = $postType ? strtolower($postType) : null;
        $this->onQueue('processing');
    }

    public function handle(
        PostRegenerator $regenerator,
        PostStateService $state,
        PostRepository $posts,
    ): void
    {
        // Fetch post
        $post = DB::table('posts')
            ->select('id','project_id','insight_id','content')
            ->whereRaw('id::text = ?', [$this->postId])
            ->first();
        if (!$post) {
            Log::warning('regenerate_post.not_found', ['postId' => $this->postId]);
            return;
        }

        $insightText = '';
        if ($post->insight_id) {
            $ins = DB::table('insights')
                ->select('content')
                ->where('id', $post->insight_id)
                ->where('project_id', $post->project_id)
                ->first();
            $insightText = $ins?->content ?? '';
        }

        Log::info('regenerate_post.start', [
            'postId' => $this->postId,
            'projectId' => (string) $post->project_id,
            'postType' => $this->postType,
        ]);

        $result = $regenerator->regenerate(
            (string) $post->project_id,
            (string) $post->id,
            $insightText,
            $this->customInstructions,
            $this->postType,
            $this->triggeredByUserId,
        );

        if (! $result) {
            Log::warning('regenerate_post.no_content', ['postId' => $this->postId]);
            return;
        }

        $state->updateDraft((string) $post->id, [
            'content' => $result['content'],
            'status' => 'pending',
            'review' => $result['review'] ?? null,
        ]);
        $state->resetScheduling((string) $post->id);

        if (! empty($result['hashtags'])) {
            $posts->updateHashtags((string) $post->id, $result['hashtags']);
        } else {
            $posts->updateHashtags((string) $post->id, []);
        }

        $owner = DB::table('content_projects')
            ->select('user_id')
            ->where('id', $post->project_id)
            ->first();

        $fresh = DB::table('posts')
            ->select([
                'id',
                'project_id',
                'insight_id',
                'content',
                'hashtags',
                'platform',
                'status',
                'published_at',
                'scheduled_at',
                'schedule_status',
                'schedule_error',
                'schedule_attempted_at',
                'review_scores',
                'review_suggestions',
                'reviewed_at',
                'created_at',
                'updated_at',
            ])
            ->where('id', $post->id)
            ->first();

        if ($fresh && $owner && $owner->user_id) {
            $payload = $this->mapPostRow($fresh);
            event(new PostRegenerated((string) $owner->user_id, $payload));
        }

        Log::info('regenerate_post.success', ['postId' => $this->postId]);
    }

    /**
     * @param object $row
     * @return array<string, mixed>
     */
    private function mapPostRow(object $row): array
    {
        return [
            'id' => (string) $row->id,
            'projectId' => (string) $row->project_id,
            'insightId' => $row->insight_id ? (string) $row->insight_id : null,
            'content' => (string) $row->content,
            'hashtags' => $this->parsePgTextArray($row->hashtags ?? null),
            'platform' => (string) ($row->platform ?? 'LinkedIn'),
            'status' => (string) $row->status,
            'publishedAt' => $this->formatDate($row->published_at ?? null),
            'scheduledAt' => $this->formatDate($row->scheduled_at ?? null),
            'scheduleStatus' => $row->schedule_status ? (string) $row->schedule_status : null,
            'scheduleError' => $row->schedule_error ? (string) $row->schedule_error : null,
            'scheduleAttemptedAt' => $this->formatDate($row->schedule_attempted_at ?? null),
            'review' => $this->mapReview($row),
            'createdAt' => $this->formatDate($row->created_at ?? null),
            'updatedAt' => $this->formatDate($row->updated_at ?? null),
        ];
    }

    private function mapReview(object $row): ?array
    {
        $scoresRaw = $this->decodeJson($row->review_scores ?? null);
        $suggestionsRaw = $this->decodeJson($row->review_suggestions ?? null);
        $reviewedAt = $this->formatDate($row->reviewed_at ?? null);

        if (empty($scoresRaw) && empty($suggestionsRaw) && $reviewedAt === null) {
            return null;
        }

        $scores = [
            'clarity' => $this->extractScore($scoresRaw, 'clarity'),
            'engagementPotential' => $this->extractScore($scoresRaw, 'engagement_potential'),
            'readability' => $this->extractScore($scoresRaw, 'readability'),
        ];

        $suggestions = [];
        if (is_array($suggestionsRaw)) {
            foreach ($suggestionsRaw as $suggestion) {
                if (!is_array($suggestion)) {
                    continue;
                }
                $type = isset($suggestion['type']) ? (string) $suggestion['type'] : (string) ($suggestion['suggestion_type'] ?? '');
                $original = isset($suggestion['originalText']) ? (string) $suggestion['originalText'] : (string) ($suggestion['original_text'] ?? '');
                $replacement = isset($suggestion['suggestion']) ? (string) $suggestion['suggestion'] : (string) ($suggestion['suggested_improvement'] ?? '');
                $rationale = isset($suggestion['rationale']) ? (string) $suggestion['rationale'] : null;

                if (trim($original) === '' || trim($replacement) === '') {
                    continue;
                }

                $suggestions[] = [
                    'type' => strtolower($type) ?: 'impact',
                    'originalText' => $original,
                    'suggestion' => $replacement,
                    'rationale' => $rationale,
                ];
            }
        }

        return [
            'scores' => $scores,
            'suggestions' => $suggestions,
            'reviewedAt' => $reviewedAt,
        ];
    }

    private function decodeJson(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value) || is_object($value)) {
            return (array) $value;
        }

        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        $decoded = json_decode($trimmed, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
    }

    private function extractScore(mixed $scores, string $key): ?int
    {
        if (!is_array($scores)) {
            return null;
        }

        if (!array_key_exists($key, $scores)) {
            return null;
        }

        $value = $scores[$key];
        if ($value === null || $value === '') {
            return null;
        }

        $numeric = (int) round((float) $value);
        return max(0, min(100, $numeric));
    }

    /**
     * @param mixed $raw
     * @return array<int, string>
     */
    private function parsePgTextArray(mixed $raw): array
    {
        if ($raw === null) {
            return [];
        }
        if (is_string($raw)) {
            $trim = trim($raw, '{}');
            if ($trim === '') {
                return [];
            }
            $parts = preg_split('/,(?=(?:[^\\"]*\\"[^\\"]*\\")*[^\\"]*$)/', $trim) ?: [];
            return array_values(array_filter(array_map(static fn($s) => stripcslashes(trim($s, '"')), $parts), static fn($s) => $s !== ''));
        }
        if (is_array($raw)) {
            return array_values(array_filter(array_map('strval', $raw), static fn($s) => $s !== ''));
        }
        return [];
    }

    private function formatDate(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format(DATE_ATOM);
        }
        $string = (string) $value;
        return $string === '' ? null : $string;
    }
}
