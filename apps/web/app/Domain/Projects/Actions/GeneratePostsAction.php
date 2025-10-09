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

        $userId = DB::table('content_projects')->where('id', $projectId)->value('user_id');
        $userId = $userId ? (string) $userId : null;

        $styleProfile = $this->resolveStyleProfile($projectId, $userId);

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

        $drafts = $insights->map(function ($insight) use ($ai, $projectId, $styleProfile, $userId) {
            $prompt = $this->buildPostPrompt((string) $insight->content, $styleProfile);

            try {
                $out = $ai->generateJson([
                    'prompt' => $prompt,
                    'temperature' => 0.4,
                    'action' => 'posts.generate',
                    'projectId' => $projectId,
                    'userId' => $userId,
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

    /**
     * @return array<string, mixed>
     */
    private function resolveStyleProfile(string $projectId, ?string $userId = null): array
    {
        $resolvedUserId = $userId ?? DB::table('content_projects')->where('id', $projectId)->value('user_id');
        if (! $resolvedUserId) {
            return [];
        }

        $styleValue = DB::table('user_style_profiles')->where('user_id', $resolvedUserId)->value('style');
        if (! $styleValue) {
            return [];
        }

        if (is_string($styleValue)) {
            $decoded = json_decode($styleValue, true);
        } elseif (is_array($styleValue)) {
            $decoded = $styleValue;
        } else {
            $decoded = null;
        }

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param  array<string, mixed>  $style
     */
    private function buildPostPrompt(string $insight, array $style): string
    {
        $instructions = [
            'Write a LinkedIn post from the insight provided below.',
            'Structure the post as 4-5 short paragraphs with tight sentences (under 25 words).',
            'Open with a compelling hook and end with a clear call-to-action that matches the goal.',
            'Return JSON { "content": string, "hashtags": string[] } with up to 5 relevant hashtags.',
        ];

        $guidance = [];

        $tone = $this->describeTonePreset($style['tonePreset'] ?? null);
        if ($tone) {
            $guidance[] = 'Tone: '.$tone;
        }

        $toneNote = $this->cleanString($style['toneNote'] ?? null);
        if ($toneNote) {
            $guidance[] = 'Tone note: '.$toneNote;
        }

        $perspective = $this->describePerspective($style['perspective'] ?? null);
        if ($perspective) {
            $guidance[] = 'Perspective: '.$perspective;
        }

        $audience = $this->describeAudience(
            $style['personaPreset'] ?? null,
            $this->cleanString($style['personaCustom'] ?? null)
        );
        if ($audience) {
            $guidance[] = 'Audience: '.$audience;
        }

        $cta = $this->describeCtaType($style['ctaType'] ?? null);
        if ($cta) {
            $guidance[] = 'Goal: '.$cta;
        }

        $ctaCopy = $this->cleanString($style['ctaCopy'] ?? null);
        if ($ctaCopy) {
            $guidance[] = 'Call-to-action copy to include near the end: "'.$ctaCopy.'"';
        }

        $prompt = implode("\n", $instructions);

        if (! empty($guidance)) {
            $prompt .= "\n\nVoice guidelines:\n- " . implode("\n- ", $guidance);
        }

        $prompt .= "\n\nInsight:\n".$insight;

        return $prompt;
    }

    private function describeTonePreset(?string $value): ?string
    {
        $map = [
            'confident' => 'Confident and decisive with a clear point of view.',
            'friendly_expert' => 'Warm, encouraging, and consultative while staying authoritative.',
            'builder' => 'Hands-on, practical lessons from building in public.',
            'challenger' => 'Provocative and willing to challenge conventional wisdom.',
            'inspiring' => 'Uplifting and motivational, highlighting possibilities.',
        ];

        return $map[$value] ?? null;
    }

    private function describePerspective(?string $value): ?string
    {
        $map = [
            'first_person' => 'Write in first-person singular using "I" and "me".',
            'first_person_plural' => 'Write in first-person plural using "we" and "our" to reflect a team voice.',
            'third_person' => 'Write in third person, referring to the author or company by name.',
        ];

        return $map[$value] ?? null;
    }

    private function describeAudience(?string $preset, ?string $custom): ?string
    {
        $map = [
            'founders' => 'Startup founders and CEOs building companies.',
            'product_leaders' => 'Product directors and heads of product teams.',
            'revenue_leaders' => 'Sales and revenue leaders focused on growth.',
            'marketing_leaders' => 'Marketing leaders scaling demand programs.',
            'operators' => 'Operators who keep teams shipping smoothly.',
        ];

        $parts = [];

        if ($preset && isset($map[$preset])) {
            $parts[] = $map[$preset];
        }

        if ($custom) {
            $parts[] = $custom;
        }

        if (empty($parts)) {
            return null;
        }

        return implode('; ', $parts);
    }

    private function describeCtaType(?string $value): ?string
    {
        $map = [
            'conversation' => 'Spark conversation and invite comments from readers.',
            'traffic' => 'Drive readers to click through to a linked resource.',
            'product' => 'Spotlight a product or offering and highlight its value.',
            'signup' => 'Encourage signups, demos, or lead capture.',
        ];

        return $map[$value] ?? null;
    }

    private function cleanString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
