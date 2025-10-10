<?php

namespace App\Domain\Posts\Repositories;

use App\Support\PostgresArray;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PostRepository
{
    public function findById(string $postId): ?object
    {
        return DB::table('posts')->where('id', $postId)->first();
    }

    public function findForProject(string $projectId, string $postId): ?object
    {
        return DB::table('posts')
            ->where('project_id', $projectId)
            ->where('id', $postId)
            ->first();
    }

    /**
     * @param array<int, string> $postIds
     */
    public function findManyForProject(string $projectId, array $postIds): Collection
    {
        if (empty($postIds)) {
            return collect();
        }

        return DB::table('posts')
            ->where('project_id', $projectId)
            ->whereIn('id', $postIds)
            ->get();
    }

    /**
     * @param iterable<int, array{insight_id:string,content:string,hashtags?:array<int,string>,objective?:string}> $drafts
     */
    public function insertDrafts(string $projectId, iterable $drafts): int
    {
        if (empty($drafts)) {
            return 0;
        }

        $driver = DB::connection()->getDriverName();
        $inserted = 0;

        DB::transaction(function () use (&$inserted, $drafts, $projectId, $driver): void {
            $records = [];
            $hashtags = [];
            $now = now();

            foreach ($drafts as $draft) {
                $insightId = (string) $draft['insight_id'];

                $exists = DB::table('posts')
                    ->where('project_id', $projectId)
                    ->where('insight_id', $insightId)
                    ->sharedLock()
                    ->exists();

                if ($exists) {
                    continue;
                }

                $postId = (string) Str::uuid();
                $records[] = [
                    'id' => $postId,
                    'project_id' => $projectId,
                    'insight_id' => $insightId,
                    'content' => (string) $draft['content'],
                    'platform' => 'LinkedIn',
                    'status' => 'pending',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                $tags = $draft['hashtags'] ?? [];
                if (! empty($tags)) {
                    $hashtags[$postId] = $tags;
                }
            }

            if (empty($records)) {
                return;
            }

            DB::table('posts')->insert($records);

            foreach ($hashtags as $postId => $tags) {
                $this->updateHashtags($postId, $tags, $driver);
            }

            $inserted = count($records);
        });

        return $inserted;
    }

    /**
     * @param array<int, string> $hashtags
     */
    public function updateHashtags(string $postId, array $hashtags, ?string $driver = null): void
    {
        $driver ??= DB::connection()->getDriverName();

        $tags = array_values(array_filter(array_map('strval', $hashtags), static fn ($tag) => $tag !== ''));
        if (empty($tags)) {
            DB::table('posts')
                ->where('id', $postId)
                ->update(['hashtags' => null]);

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement(
                'UPDATE posts SET hashtags = ?::text[] WHERE id = ?',
                [PostgresArray::text($tags), $postId],
            );

            return;
        }

        DB::table('posts')
            ->where('id', $postId)
            ->update(['hashtags' => json_encode($tags)]);
    }

    public function updateContent(string $postId, string $content): void
    {
        DB::table('posts')->where('id', $postId)->update([
            'content' => $content,
            'updated_at' => now(),
        ]);
    }

    public function updateStatus(string $postId, string $status): void
    {
        DB::table('posts')->where('id', $postId)->update([
            'status' => $status,
            'updated_at' => now(),
        ]);
    }

    /**
     * @param array<int, string> $ids
     */
    public function bulkUpdateStatus(string $projectId, array $ids, string $status): int
    {
        if (empty($ids)) {
            return 0;
        }

        return DB::table('posts')
            ->where('project_id', $projectId)
            ->whereIn('id', $ids)
            ->update([
                'status' => $status,
                'updated_at' => now(),
            ]);
    }

    public function markPublished(string $postId): void
    {
        DB::table('posts')->where('id', $postId)->update([
            'status' => 'published',
            'published_at' => now(),
            'schedule_status' => null,
            'schedule_error' => null,
            'schedule_attempted_at' => now(),
            'schedule_attempts' => 0,
            'schedule_next_attempt_at' => null,
            'updated_at' => now(),
        ]);
    }

    public function schedule(string $postId, CarbonInterface $scheduledAt): void
    {
        DB::table('posts')->where('id', $postId)->update([
            'scheduled_at' => $scheduledAt->utc(),
            'schedule_status' => 'scheduled',
            'schedule_error' => null,
            'schedule_attempted_at' => null,
            'schedule_attempts' => 0,
            'schedule_next_attempt_at' => null,
            'updated_at' => now(),
        ]);
    }

    public function clearSchedule(string $postId): void
    {
        DB::table('posts')->where('id', $postId)->update([
            'scheduled_at' => null,
            'schedule_status' => null,
            'schedule_error' => null,
            'schedule_attempted_at' => null,
            'schedule_attempts' => 0,
            'schedule_next_attempt_at' => null,
            'updated_at' => now(),
        ]);
    }

    /**
     * @param array<int, string> $postIds
     */
    public function clearScheduleForMany(string $projectId, array $postIds): int
    {
        if (empty($postIds)) {
            return 0;
        }

        return DB::table('posts')
            ->where('project_id', $projectId)
            ->whereIn('id', $postIds)
            ->update([
                'scheduled_at' => null,
                'schedule_status' => null,
                'schedule_error' => null,
                'schedule_attempted_at' => null,
                'schedule_attempts' => 0,
                'schedule_next_attempt_at' => null,
                'updated_at' => now(),
            ]);
    }

    /**
     * @param array<int, string> $ids
     */
    public function touchMany(string $projectId, array $ids, array $attributes): int
    {
        if (empty($ids)) {
            return 0;
        }

        return DB::table('posts')
            ->where('project_id', $projectId)
            ->whereIn('id', $ids)
            ->update($attributes + ['updated_at' => now()]);
    }
}

