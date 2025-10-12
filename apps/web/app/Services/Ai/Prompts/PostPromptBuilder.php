<?php

namespace App\Services\Ai\Prompts;

use App\Services\Ai\AiRequest;

class PostPromptBuilder
{
    public function draftFromInsight(
        string $insight,
        ?string $quote,
        ?string $context,
        array $style,
        string $objective,
        array $recentHooks = []
    ): AiRequest {
        $lines = [];

        $lines[] = 'You are a LinkedIn copywriter. Your top priority is to stay faithful to the provided insight.';
        $lines[] = '';
        $lines[] = 'Formatting contract:';
        $lines[] = '- Always return 6-8 paragraphs separated by a blank line (exactly two newline characters). Use real newline characters, never the literal text "\\n".';
        $lines[] = '- The opening hook must be exactly one sentence and stand alone as its own paragraph before the rest of the content.';
        $lines[] = '';
        $lines[] = 'Voice contract:';
        $lines[] = '- Write directly to the ideal customer described below; every paragraph should feel like coaching them personally.';
        $lines[] = '- Anchor the narrative in at least one service/offer and at least one outcome from the profile—make the connection explicit, not implied.';
        $lines[] = '';

        $rules = [
            'Write 6-8 paragraphs and keep the full post between 1,500 and 2,000 characters (≈250-350 words).',
            'Separate each paragraph with a blank line (exactly two newline characters) so every paragraph is visually distinct. Use real newline characters (not the literal text "\\n").',
            'Start with a hook that clearly references the insight’s core problem or opportunity.',
            'The hook must be exactly one sentence and stand as its own paragraph (i.e. a single line followed by a blank line before the next paragraph).',
            'Every paragraph must reinforce or expand on the provided insight—do not introduce unrelated stories or claims.',
            'Vary the opening hook style across this project; balance questions with bold statements, data jolts, micro-stories, and imperatives.',
            'Avoid repeating the same hook scaffolding used in the posts listed under "Recent hooks" below unless the insight explicitly demands it.',
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

        $voiceGuidance = $this->buildVoiceGuidance($style);
        if (!empty($voiceGuidance)) {
            $lines[] = '';
            $lines[] = 'Voice guidelines (apply without changing the insight):';
            foreach ($voiceGuidance as $item) {
                $lines[] = '- ' . $item;
            }
        }

        $contextLines = $this->buildContextLines($style);
        if (!empty($contextLines)) {
            $lines[] = '';
            $lines[] = 'Business context (use only to add colour to the insight, never replace it):';
            foreach ($contextLines as $item) {
                $lines[] = '- ' . $item;
            }
        }

        $lines[] = '';
        $lines[] = 'Return JSON { "content": string, "hashtags": string[] } with up to 5 relevant hashtags.';

        $recentHookLines = $this->buildRecentHookLines($recentHooks);
        if (!empty($recentHookLines)) {
            $lines[] = '';
            foreach ($recentHookLines as $item) {
                $lines[] = $item;
            }
        }

        return new AiRequest(
            action: 'posts.generate',
            prompt: implode("\n", $lines),
            schema: $this->postSchema(),
            temperature: $this->temperatureForAction('posts.generate', config('ai.posts.temperature', 0.4)),
            metadata: ['mode' => 'draft'],
        );
    }

    public function regenerateFromInsight(
        string $insight,
        ?string $instructions,
        ?string $presetDirective,
        ?string $postType = null
    ): AiRequest {
        $lines = [];

        $lines[] = 'Regenerate a high-quality LinkedIn post from this insight.';
        $lines[] = '';
        $lines[] = 'Formatting contract:';
        $lines[] = '- Always return 6-8 paragraphs separated by a blank line (exactly two newline characters). Use real newline characters, never the literal text "\\n".';
        $lines[] = '- The opening hook must be exactly one sentence and stand alone as its own paragraph before the rest of the content.';
        $lines[] = '';
        $lines[] = 'Voice contract:';
        $lines[] = '- Write directly to the ideal customer described below; every paragraph should feel like coaching them personally.';
        $lines[] = '- Anchor the narrative in at least one service/offer and at least one outcome from the profile—make the connection explicit, not implied.';
        $lines[] = 'Write 6-8 paragraphs and keep the full post between 1,500 and 2,000 characters (≈250-350 words).';
        $lines[] = 'Separate each paragraph with a blank line (exactly two newline characters) so every paragraph is visually distinct. Use actual newline characters (not the literal text "\\n").';
        $lines[] = 'Keep the tone crisp and avoid emoji overload.';
        $lines[] = 'The opening hook must be exactly one sentence and occupy its own paragraph (one line, followed by a blank line before the next paragraph).';
        if ($presetDirective) {
            $lines[] = $presetDirective;
        }
        $lines[] = '';
        $lines[] = 'Insight:';
        $lines[] = $insight;

        if ($instructions) {
            $lines[] = '';
            $lines[] = 'Guidance: ' . $instructions;
        }

        $lines[] = '';
        $lines[] = 'Return JSON { "content": string, "hashtags": string[] }.';

        return new AiRequest(
            action: 'post.regenerate',
            prompt: implode("\n", $lines),
            schema: $this->postSchema(),
            temperature: $this->temperatureForAction('post.regenerate', config('ai.posts.temperature', 0.4)),
            metadata: array_filter([
                'mode' => 'regenerate',
                'postType' => $postType,
            ], static fn ($value) => $value !== null),
        );
    }

    private function postSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'content' => ['type' => 'string'],
                'hashtags' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
            ],
            'required' => ['content'],
            'additionalProperties' => false,
        ];
    }

    private function buildContextLines(array $style): array
    {
        $lines = [];

        $offer = $this->cleanString($style['offer'] ?? null);
        if ($offer) {
            $lines[] = 'Offer: ' . $offer;
        }

        $services = $this->extractList($style['services'] ?? null);
        if (!empty($services)) {
            $lines[] = 'Services: ' . implode('; ', $services);
        }

        $idealCustomer = $this->cleanString($style['idealCustomer'] ?? null);
        if ($idealCustomer) {
            $lines[] = 'Audience: ' . $idealCustomer;
        }

        $outcomes = $this->extractList($style['outcomes'] ?? null);
        if (!empty($outcomes)) {
            $lines[] = 'Outcomes delivered: ' . implode('; ', $outcomes);
        }

        $proof = $this->extractList($style['proof'] ?? null);
        if (!empty($proof)) {
            $lines[] = 'Proof points: ' . implode('; ', $proof);
        }

        $audienceNags = $this->extractList($style['audienceNags'] ?? null, 3);
        if (!empty($audienceNags)) {
            $lines[] = 'Audience pain points: ' . implode('; ', $audienceNags);
        }

        return $lines;
    }

    private function buildVoiceGuidance(array $style): array
    {
        $guidance = [];

        if ($tone = $this->describeTonePreset($style['tonePreset'] ?? null)) {
            $guidance[] = $tone;
        }

        if ($style['toneDescriptors'] ?? null) {
            foreach ($this->extractList($style['toneDescriptors'], 3) as $descriptor) {
                $guidance[] = 'Tone descriptor: ' . $descriptor;
            }
        }

        if ($perspective = $this->describePerspective($style['perspective'] ?? null)) {
            $guidance[] = $perspective;
        }

        if ($style['writingSamples'] ?? null) {
            foreach ($this->extractList($style['writingSamples'], 2) as $sample) {
                $guidance[] = 'Capture the spirit of: ' . $sample;
            }
        }

        return $guidance;
    }

    private function objectiveInstruction(string $objective): ?string
    {
        return match ($objective) {
            'educate' => 'Teach a practical takeaway that helps the reader apply the insight.',
            'conversion_lead' => 'Drive replies from qualified coaching/consulting leads. Include one soft CTA inviting a DM or comment.',
            'conversion_waitlist' => 'Drive conversions to a waitlist or launch. Include a direct CTA with link placeholder like [Link in comments].',
            'conversion_event' => 'Drive registrations for an event. Include a clear CTA with link placeholder like [Register via link in comments].',
            default => null,
        };
    }

    /**
     * @param  mixed  $value
     * @return array<int, string>
     */
    private function extractList($value, int $limit = 5): array
    {
        if (!is_array($value)) {
            return [];
        }

        $items = [];
        foreach ($value as $entry) {
            $clean = $this->cleanString($entry ?? null);
            if (!$clean) {
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
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        if ($trimmed === '') {
            return null;
        }

        return mb_substr($trimmed, 0, 240);
    }

    private function temperatureForAction(string $action, $fallback = null): ?float
    {
        $map = config('ai.defaults.temperatures', []);

        if (is_array($map) && array_key_exists($action, $map)) {
            $value = $map[$action];
            if ($value === null || $value === '') {
                return null;
            }

            return (float) $value;
        }

        if ($fallback === null || $fallback === '') {
            return null;
        }

        return (float) $fallback;
    }

    /**
     * @param array<int, string> $recentHooks
     * @return array<int, string>
     */
    private function buildRecentHookLines(array $recentHooks): array
    {
        if (empty($recentHooks)) {
            return [];
        }

        $lines = ['Recent hooks from this project (avoid echoing their format or lead-in):'];
        $count = 0;

        foreach ($recentHooks as $hook) {
            $hook = trim($hook);
            if ($hook === '') {
                continue;
            }
            $lines[] = '- ' . $hook;
            $count++;
            if ($count >= 6) {
                break;
            }
        }

        if ($count === 0) {
            return [];
        }

        $lines[] = 'Keep hooks diverse: mix decisive statements, specific numbers, vivid moments, and only occasional questions.';

        return $lines;
    }
}
