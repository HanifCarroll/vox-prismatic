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
            ->select('id', 'content', 'quote', 'source_start_offset', 'source_end_offset')
            ->where('project_id', $projectId)
            ->when(count($existingInsightIds) > 0, fn ($query) => $query->whereNotIn('id', $existingInsightIds))
            ->orderBy('created_at')
            ->limit($max)
            ->get();

        if ($insights->isEmpty()) {
            return 0;
        }

        $insights = $insights->values();
        $objectiveSchedule = $this->buildObjectiveSchedule($insights->count(), $styleProfile);

        $transcript = DB::table('content_projects')->where('id', $projectId)->value('transcript_original');
        $transcript = is_string($transcript) ? $transcript : '';

        $drafts = $insights->map(function ($insight, $index) use ($ai, $projectId, $styleProfile, $userId, $objectiveSchedule, $transcript) {
            $objective = $objectiveSchedule[$index] ?? 'educate';
            $context = $this->buildInsightContext(
                $transcript,
                isset($insight->source_start_offset) ? (int) $insight->source_start_offset : null,
                isset($insight->source_end_offset) ? (int) $insight->source_end_offset : null,
            );

            return $this->generateDraftForInsight(
                $projectId,
                (string) $insight->id,
                (string) $insight->content,
                isset($insight->quote) ? trim((string) $insight->quote) : null,
                $context,
                $ai,
                $objective,
                $styleProfile,
                $userId,
            );
        })->filter()->values();

        if ($drafts->isEmpty()) {
            return 0;
        }

        return $this->persistDrafts($projectId, $drafts->all());
    }

    public function generateDraftForInsight(
        string $projectId,
        string $insightId,
        string $insightContent,
        ?string $insightQuote,
        ?string $supportingContext,
        AiService $ai,
        string $objective,
        array $styleProfile,
        ?string $userId = null,
    ): ?array {
        $prompt = $this->buildPostPrompt($insightContent, $insightQuote, $supportingContext, $styleProfile, $objective);

        try {
            $out = $ai->generateJson([
                'prompt' => $prompt,
                'temperature' => 0.4,
                'action' => 'posts.generate',
                'projectId' => $projectId,
                'userId' => $userId,
                'metadata' => [
                    'insightId' => $insightId,
                    'objective' => $objective,
                ],
            ]);
        } catch (Throwable $e) {
            Log::warning('post_generation_failed', [
                'projectId' => $projectId,
                'insightId' => $insightId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        $content = isset($out['content']) ? (string) $out['content'] : null;
        if (! $content) {
            return null;
        }

        return [
            'insight_id' => $insightId,
            'content' => $content,
            'hashtags' => $this->normalizeHashtags($out['hashtags'] ?? []),
        ];
    }

    public function persistDrafts(string $projectId, array $drafts): int
    {
        if (empty($drafts)) {
            return 0;
        }

        $inserted = 0;

        DB::transaction(function () use (&$inserted, $drafts, $projectId): void {
            $now = now();
            $records = [];
            $hashtags = [];
            $driver = DB::connection()->getDriverName();

            foreach ($drafts as $draft) {
                if (! is_array($draft) || empty($draft['insight_id']) || empty($draft['content'])) {
                    continue;
                }

                $insightId = (string) $draft['insight_id'];

                $alreadyExists = DB::table('posts')
                    ->where('project_id', $projectId)
                    ->where('insight_id', $insightId)
                    ->sharedLock()
                    ->exists();

                if ($alreadyExists) {
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

                $tags = isset($draft['hashtags']) && is_array($draft['hashtags']) ? $draft['hashtags'] : [];
                if (! empty($tags)) {
                    $hashtags[$postId] = $tags;
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
    public function resolveStyleProfile(string $projectId, ?string $userId = null): array
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
    private function buildPostPrompt(string $insight, ?string $quote, ?string $context, array $style, string $objective): string
    {
        $lines = [];

        $lines[] = 'You are a LinkedIn copywriter. Your top priority is to stay faithful to the provided insight.';

        $rules = [
            'Write 6-8 paragraphs and keep the full post between 1,500 and 2,000 characters (≈250-350 words).',
            'Start with a hook that clearly references the insight’s core problem or opportunity.',
            'Every paragraph must reinforce or expand on the provided insight—do not introduce unrelated stories or claims.',
            'If the insight is too thin to hit the word count without inventing facts, respond with {"error":"insufficient_insight"}.',
        ];

        if ($objectiveInstruction = $this->objectiveInstruction($objective)) {
            $rules[] = $objectiveInstruction;
        }

        $lines[] = 'Rules:';
        foreach ($rules as $rule) {
            $lines[] = '- ' . $rule;
        }

        $lines[] = '';
        $lines[] = 'Insight:';
        $lines[] = $insight;

        if ($quote) {
            $lines[] = '';
            $lines[] = 'Supporting quote:';
            $lines[] = '“' . $quote . '”';
        }

        if ($context) {
            $lines[] = '';
            $lines[] = 'Supporting context from transcript:';
            $lines[] = $context;
        }

        $contextLines = $this->buildContextLines($style);
        $voiceGuidance = $this->buildVoiceGuidance($style);

        if (! empty($voiceGuidance)) {
            $lines[] = '';
            $lines[] = 'Voice guidelines (apply without changing the insight):';
            foreach ($voiceGuidance as $item) {
                $lines[] = '- ' . $item;
            }
        }

        if (! empty($contextLines)) {
            $lines[] = '';
            $lines[] = 'Business context (use only to add colour to the insight, never replace it):';
            foreach ($contextLines as $item) {
                $lines[] = '- ' . $item;
            }
        }

        $lines[] = '';
        $lines[] = 'Return JSON { "content": string, "hashtags": string[] } with up to 5 relevant hashtags.';

        return implode("\n", $lines);
    }

    /**
     * @param  array<string, mixed>  $style
     * @return array<int, string>
     */
    private function buildContextLines(array $style): array
    {
        $lines = [];

        $offer = $this->cleanString($style['offer'] ?? null);
        if ($offer) {
            $lines[] = 'Offer: ' . $offer;
        }

        $services = $this->extractList($style['services'] ?? null);
        if (! empty($services)) {
            $lines[] = 'Services: ' . implode('; ', $services);
        }

        $audienceShort = $this->cleanString($style['audienceShort'] ?? null);
        $audienceDetail = $this->cleanString($style['audienceDetail'] ?? null);
        if ($audienceShort || $audienceDetail) {
            $line = 'Audience: ' . ($audienceShort ?: 'Not specified');
            if ($audienceDetail) {
                $line .= ' — ' . $audienceDetail;
            }
            $lines[] = $line;
        }

        $outcomes = $this->extractList($style['outcomes'] ?? null);
        if (! empty($outcomes)) {
            $lines[] = 'Outcomes: ' . implode('; ', $outcomes);
        }

        return $lines;
    }

    /**
     * @param  array<string, mixed>  $style
     * @return array<int, string>
     */
    private function buildVoiceGuidance(array $style): array
    {
        $guidance = [];

        $tone = $this->describeTonePreset($style['tonePreset'] ?? null);
        if ($tone) {
            $guidance[] = 'Tone: ' . $tone;
        }

        $toneNote = $this->cleanString($style['toneNote'] ?? null);
        if ($toneNote) {
            $guidance[] = 'Tone note: ' . $toneNote;
        }

        $perspective = $this->describePerspective($style['perspective'] ?? null);
        if ($perspective) {
            $guidance[] = 'Perspective: ' . $perspective;
        }

        return $guidance;
    }

    private function objectiveInstruction(string $objective): ?string
    {
        if ($objective === 'educate') {
            return 'Deliver a practical takeaway and close with a soft CTA that invites replies, shares, or saves.';
        }

        if (str_starts_with($objective, 'conversion_')) {
            $goal = substr($objective, strlen('conversion_'));
            return match ($goal) {
                'traffic' => 'Highlight the value of visiting the resource and end with one clear invite to check it out (no stacked CTAs).',
                'leads' => 'Transition into the offer and end with a single confident invite to book a call or request a demo.',
                'launch' => 'Explain what is new and end with a concise invite to try it now or learn more.',
                default => null,
            };
        }

        return null;
    }

    public function buildObjectiveSchedule(int $count, array $style): array
    {
        if ($count <= 0) {
            return [];
        }

        $schedule = array_fill(0, $count, 'educate');
        $goal = $style['promotionGoal'] ?? 'none';
        if ($goal === 'none') {
            return $schedule;
        }

        $conversionCount = max(1, (int) round($count * 0.2));
        if ($conversionCount >= $count) {
            return array_fill(0, $count, 'conversion_' . $goal);
        }

        $step = $count / $conversionCount;
        $used = [];
        for ($i = 0; $i < $conversionCount; $i++) {
            $index = (int) round(($i + 1) * $step) - 1;
            $index = max(0, min($count - 1, $index));
            while (in_array($index, $used, true)) {
                $index = ($index + 1) % $count;
            }
            $schedule[$index] = 'conversion_' . $goal;
            $used[] = $index;
        }

        return $schedule;
    }

    /**
     * @param  mixed  $value
     * @return array<int, string>
     */
    private function extractList($value, int $limit = 5): array
    {
        if (! is_array($value)) {
            return [];
        }

        $items = [];
        foreach ($value as $entry) {
            $clean = $this->cleanString($entry ?? null);
            if (! $clean) {
                continue;
            }
            $items[] = $clean;
            if (count($items) >= $limit) {
                break;
            }
        }

        return $items;
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

    private function cleanString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        if ($trimmed === '') {
            return null;
        }

        return mb_substr($trimmed, 0, 240);
    }

    public function buildInsightContext(string $transcript, ?int $start, ?int $end): ?string
    {
        if ($transcript === '' || $start === null || $end === null || $start < 0 || $end <= $start) {
            return null;
        }

        $length = mb_strlen($transcript, 'UTF-8');
        $start = max(0, min($start, $length));
        $end = max($start, min($end, $length));

        if ($end <= $start) {
            return null;
        }

        $padding = 200;
        $contextStart = max(0, $start - $padding);
        $contextEnd = min($length, $end + $padding);
        $contextLength = max(0, $contextEnd - $contextStart);

        if ($contextLength <= 0) {
            return null;
        }

        $snippet = mb_substr($transcript, $contextStart, $contextLength, 'UTF-8');
        $snippet = trim($snippet);

        if ($snippet === '') {
            return null;
        }

        if (mb_strlen($snippet, 'UTF-8') > 600) {
            $snippet = mb_substr($snippet, 0, 600, 'UTF-8') . '…';
        }

        return $snippet;
    }
}
