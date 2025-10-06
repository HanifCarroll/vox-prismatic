<?php

namespace App\Domain\Projects\Actions;

use App\Services\AiService;
use App\Support\PostgresArray;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class GeneratePostsAction
{
    /**
     * Generate posts for insights that do not yet have one. Returns the number of posts created.
     */
    public function execute(string $projectId, AiService $ai, int $max = 10): int
    {
        $existingInsightIds = DB::table('posts')
            ->where('project_id', $projectId)
            ->pluck('insight_id')
            ->filter()
            ->map(fn ($id) => (string) $id)
            ->values()
            ->all();

        $insights = DB::table('insights')
            ->select('id', 'content')
            ->where('project_id', $projectId)
            ->when(count($existingInsightIds) > 0, fn ($query) => $query->whereNotIn('id', $existingInsightIds))
            ->orderBy('created_at')
            ->limit($max)
            ->get();

        if ($insights->isEmpty()) {
            return 0;
        }

        $drafts = $insights->map(function ($insight) use ($ai, $projectId) {
            $prompt = "Write a LinkedIn post (no emoji unless needed) based on this insight. Keep to 4-6 short paragraphs. Return JSON { \"content\": string, \"hashtags\": string[] }.\n\nInsight:\n".$insight->content;

            try {
                $out = $ai->generateJson([
                    'prompt' => $prompt,
                    'temperature' => 0.4,
                    'model' => AiService::FLASH_MODEL,
                    'action' => 'posts.generate',
                    'projectId' => $projectId,
                    'metadata' => ['insightId' => (string) $insight->id],
                ]);
            } catch (Throwable $e) {
                Log::warning('post_generation_failed', [
                    'projectId' => $projectId,
                    'insightId' => $insight->id,
                    'error' => $e->getMessage(),
                ]);

                return null;
            }

            $content = isset($out['content']) ? (string) $out['content'] : null;
            if (!$content) {
                return null;
            }

            $tags = $this->normalizeHashtags($out['hashtags'] ?? []);

            return [
                'insight_id' => (string) $insight->id,
                'content' => $content,
                'hashtags' => $tags,
            ];
        })->filter();

        if ($drafts->isEmpty()) {
            return 0;
        }

        $inserted = 0;

        DB::transaction(function () use ($drafts, $projectId, &$inserted) {
            $now = now();
            $records = [];
            $hashtags = [];
            $driver = DB::connection()->getDriverName();

            /** @var array{insight_id: string, content: string, hashtags: array<int, string>} $draft */
            foreach ($drafts as $draft) {
                $alreadyExists = DB::table('posts')
                    ->where('project_id', $projectId)
                    ->where('insight_id', $draft['insight_id'])
                    ->sharedLock()
                    ->exists();

                if ($alreadyExists) {
                    continue;
                }

                $postId = (string) Str::uuid();
                $records[] = [
                    'id' => $postId,
                    'project_id' => $projectId,
                    'insight_id' => $draft['insight_id'],
                    'content' => $draft['content'],
                    'platform' => 'LinkedIn',
                    'status' => 'pending',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                if (!empty($draft['hashtags'])) {
                    $hashtags[$postId] = $draft['hashtags'];
                }
            }

            if (empty($records)) {
                return;
            }

            DB::table('posts')->insert($records);

            foreach ($hashtags as $postId => $tags) {
                if ($driver === 'pgsql') {
                    DB::statement(
                        'UPDATE posts SET hashtags = ?::text[] WHERE id = ?',
                        [PostgresArray::text($tags), $postId],
                    );
                } else {
                    DB::table('posts')
                        ->where('id', $postId)
                        ->update(['hashtags' => json_encode($tags)]);
                }
            }

            $inserted = count($records);
        });

        return $inserted;
    }

    /**
     * @param  mixed  $value
     * @return array<int, string>
     */
    private function normalizeHashtags($value): array
    {
        if (!is_array($value)) {
            return [];
        }

        $tags = [];
        foreach ($value as $tag) {
            if (!is_string($tag)) {
                continue;
            }

            $trim = trim($tag);
            if ($trim === '') {
                continue;
            }

            if ($trim[0] !== '#') {
                $trim = '#'.preg_replace('/\s+/', '', $trim);
            }

            $trim = preg_replace('/\s+/', '', $trim);
            if ($trim === '#') {
                continue;
            }

            $tags[] = $trim;
        }

        $unique = array_values(array_unique($tags));
        if (count($unique) > 5) {
            $unique = array_slice($unique, 0, 5);
        }

        return $unique;
    }
}
