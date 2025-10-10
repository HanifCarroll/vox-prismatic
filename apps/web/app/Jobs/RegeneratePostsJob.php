<?php

namespace App\Jobs;

use App\Events\PostRegenerated;
use App\Services\AiService;
use App\Services\Ai\Prompts\PostPromptBuilder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Support\PostTypePreset;

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

    public function handle(AiService $ai, PostPromptBuilder $prompts): void
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

        $instructions = PostTypePreset::mergeCustomInstructions($this->customInstructions, $this->postType);
        $presetDirective = '';
        if ($this->postType && ($hint = PostTypePreset::hint($this->postType))) {
            $presetDirective = "\nPreset target: {$this->postType} — {$hint}";
        }

        Log::info('regenerate_post.start', [
            'postId' => $this->postId,
            'projectId' => (string) $post->project_id,
            'postType' => $this->postType,
        ]);

        $out = $ai->complete(
            $prompts
                ->regenerateFromInsight($insightText, $instructions, $presetDirective, $this->postType)
                ->withContext((string) $post->project_id, $this->triggeredByUserId)
                ->withMetadata([
                    'postId' => (string) $post->id,
                ])
        )->data;

        $content = $out['content'] ?? null;
        if (!$content) {
            Log::warning('regenerate_post.no_content', ['postId' => $this->postId]);
            return;
        }

        DB::table('posts')->where('id', $post->id)->update([
            'content' => $content,
            'status' => 'pending',
            'updated_at' => now(),
            'schedule_status' => null,
            'schedule_error' => null,
            'schedule_attempted_at' => null,
        ]);

        if (isset($out['hashtags']) && is_array($out['hashtags'])) {
            $tags = [];
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
            if (count($tags) > 0) {
                DB::statement('UPDATE posts SET hashtags = ?::text[] WHERE id = ?', [\App\Support\PostgresArray::text($tags), $post->id]);
            }
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
            'createdAt' => $this->formatDate($row->created_at ?? null),
            'updatedAt' => $this->formatDate($row->updated_at ?? null),
        ];
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
