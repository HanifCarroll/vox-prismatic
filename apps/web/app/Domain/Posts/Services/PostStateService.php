<?php

namespace App\Domain\Posts\Services;

use App\Domain\Posts\Data\PostReviewFeedback;
use App\Domain\Posts\Repositories\PostRepository;
use App\Domain\Posts\Support\HashtagNormalizer;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class PostStateService
{
    public function __construct(private readonly PostRepository $posts)
    {
    }

    /**
     * @param array<string, mixed> $attributes
     * @param array<int, string>|null $hashtags
     */
    public function updateDraft(string $postId, array $attributes, ?array $hashtags = null): void
    {
        $payload = ['updated_at' => now()];

        if (array_key_exists('content', $attributes)) {
            $payload['content'] = (string) $attributes['content'];
        }

        if (array_key_exists('status', $attributes)) {
            $payload['status'] = (string) $attributes['status'];
        }

        if (array_key_exists('review', $attributes)) {
            $reviewColumns = $this->prepareReviewUpdate($attributes['review']);
            $payload['review_scores'] = $reviewColumns['scores'];
            $payload['review_suggestions'] = $reviewColumns['suggestions'];
            $payload['reviewed_at'] = $reviewColumns['reviewed_at'];
        }

        if (count($payload) > 1) {
            DB::table('posts')
                ->where('id', $postId)
                ->update($payload);
        }

        if ($hashtags !== null) {
            $this->posts->updateHashtags($postId, HashtagNormalizer::normalize($hashtags));
        }
    }

    /**
     * @param array<int, string> $ids
     */
    public function bulkUpdateStatus(string $projectId, array $ids, string $status): int
    {
        return $this->posts->bulkUpdateStatus($projectId, $ids, $status);
    }

    public function markPublished(string $postId): void
    {
        $this->posts->markPublished($postId);
    }

    public function schedule(string $postId, \Carbon\CarbonInterface $scheduledAt): void
    {
        $this->posts->schedule($postId, $scheduledAt);
    }

    public function unschedule(string $postId): void
    {
        $this->posts->clearSchedule($postId);
    }

    /**
     * @param array<int, string> $postIds
     */
    public function bulkUnschedule(string $projectId, array $postIds): int
    {
        return $this->posts->clearScheduleForMany($projectId, $postIds);
    }

    public function resetScheduling(string $postId): void
    {
        $this->posts->clearSchedule($postId);
    }

    /**
     * @return array{scores: ?string, suggestions: ?string, reviewed_at: ?\Carbon\CarbonInterface}
     */
    private function prepareReviewUpdate(mixed $review): array
    {
        if ($review instanceof PostReviewFeedback) {
            return [
                'scores' => $this->encodeJson($review->scores),
                'suggestions' => $this->encodeJson($review->suggestions),
                'reviewed_at' => CarbonImmutable::instance($review->reviewedAt),
            ];
        }

        if ($review === null) {
            return ['scores' => null, 'suggestions' => null, 'reviewed_at' => null];
        }

        if (is_array($review)) {
            $scores = isset($review['scores']) && is_array($review['scores'])
                ? $this->encodeJson($review['scores'])
                : null;

            $suggestions = isset($review['suggestions']) && is_array($review['suggestions'])
                ? $this->encodeJson($review['suggestions'])
                : null;

            $reviewedAt = $review['reviewedAt'] ?? null;
            if ($reviewedAt instanceof \DateTimeInterface) {
                $reviewedAt = CarbonImmutable::instance($reviewedAt);
            } elseif (is_string($reviewedAt) && trim($reviewedAt) !== '') {
                try {
                    $reviewedAt = CarbonImmutable::parse(trim($reviewedAt));
                } catch (\Throwable) {
                    $reviewedAt = null;
                }
            } else {
                $reviewedAt = null;
            }

            return [
                'scores' => $scores,
                'suggestions' => $suggestions,
                'reviewed_at' => $reviewedAt,
            ];
        }

        return ['scores' => null, 'suggestions' => null, 'reviewed_at' => null];
    }

    private function encodeJson(?array $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return $encoded === false ? null : $encoded;
    }
}
