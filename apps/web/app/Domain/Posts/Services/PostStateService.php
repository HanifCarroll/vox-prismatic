<?php

namespace App\Domain\Posts\Services;

use App\Domain\Posts\Repositories\PostRepository;
use App\Domain\Posts\Support\HashtagNormalizer;
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
}
