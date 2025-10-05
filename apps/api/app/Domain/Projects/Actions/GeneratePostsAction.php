<?php

namespace App\Domain\Projects\Actions;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Services\AiService;

class GeneratePostsAction
{
    /**
     * Generate exactly one post per insight, up to $max, only if no posts exist yet.
     * Returns number of posts created.
     */
    public function execute(string $projectId, AiService $ai, int $max = 10): int
    {
        $existing = (int) DB::table('posts')->where('project_id', $projectId)->count();
        if ($existing > 0) {
            return 0; // do not generate more automatically
        }

        $insights = DB::table('insights')
            ->select('id', 'content')
            ->where('project_id', $projectId)
            ->orderBy('id')
            ->limit($max)
            ->get();

        if ($insights->isEmpty()) {
            return 0;
        }

        $created = [];
        $tagMap = [];

        DB::beginTransaction();
        try {
            foreach ($insights as $ins) {
                $prompt = "Write a LinkedIn post (no emoji unless needed) based on this insight. Keep to 4-6 short paragraphs. Return JSON { \"content\": string, \"hashtags\": string[] }.\n\nInsight:\n".$ins->content;
                try {
                    $out = $ai->generateJson([
                        'prompt' => $prompt,
                        'temperature' => 0.4,
                        'model' => AiService::FLASH_MODEL,
                        'action' => 'posts.generate',
                        'projectId' => $projectId,
                        'metadata' => ['insightId' => (string) $ins->id],
                    ]);
                    $content = isset($out['content']) ? (string) $out['content'] : null;
                    if ($content) {
                        $postId = (string) Str::uuid();
                        $tags = [];
                        if (isset($out['hashtags']) && is_array($out['hashtags'])) {
                            foreach ($out['hashtags'] as $t) {
                                if (!is_string($t)) continue;
                                $t = trim($t);
                                if ($t === '') continue;
                                if ($t[0] !== '#') $t = '#'.preg_replace('/\s+/', '', $t);
                                $t = preg_replace('/\s+/', '', $t);
                                $tags[] = $t;
                            }
                            $tags = array_values(array_unique(array_filter($tags)));
                            if (count($tags) > 5) $tags = array_slice($tags, 0, 5);
                        }
                        $created[] = [
                            'id' => $postId,
                            'project_id' => $projectId,
                            'insight_id' => (string) $ins->id,
                            'content' => $content,
                            'platform' => 'LinkedIn',
                            'status' => 'pending',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                        $tagMap[$postId] = $tags;
                    }
                } catch (\Throwable $e) {
                    Log::warning('post_generation_failed', [
                        'projectId' => $projectId,
                        'insightId' => $ins->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            if ($created) {
                DB::table('posts')->insert($created);
                foreach ($tagMap as $id => $tags) {
                    if (!is_array($tags) || count($tags) === 0) continue;
                    $escaped = array_map(fn($t) => '"'.str_replace('"','\\"',$t).'"', $tags);
                    $arraySql = 'ARRAY['.implode(',', $escaped).']::text[]';
                    DB::statement("UPDATE posts SET hashtags = $arraySql WHERE id = ?", [$id]);
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return count($created);
    }
}

