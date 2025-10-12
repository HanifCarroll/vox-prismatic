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

        $lines[] = 'You are a LinkedIn copywriter. Generate ONLY the body of the post based on the provided insight. Do NOT write an opening hook.';
        $lines[] = '';
        $lines[] = 'Formatting contract (body only):';
        $lines[] = '- Return 5-7 short paragraphs separated by a blank line (exactly two newline characters). Use real newline characters, never the literal text "\\n".';
        $lines[] = '- The first paragraph is part of the body, not a hook. Do not craft a standalone hook.';
        $lines[] = '';
        $lines[] = 'Voice contract:';
        $lines[] = '- Write directly to the ideal customer described below; every paragraph should feel like coaching them personally.';
        $lines[] = '- Anchor the narrative in at least one service/offer and at least one outcome from the profile—make the connection explicit, not implied.';
        $lines[] = '';

        $rules = [
            'Write 5-7 paragraphs and keep the body between 1,200 and 1,800 characters (≈200-300 words).',
            'Separate each paragraph with a blank line (exactly two newline characters) so every paragraph is visually distinct. Use real newline characters (not the literal text "\\n").',
            'Do NOT include an opening hook. Focus on clear, actionable, insight-driven paragraphs.',
            'Every paragraph must reinforce or expand on the provided insight—do not introduce unrelated stories or claims.',
            'Identify the speaker who matches the Style Profile before drafting; only use first-person statements for that inferred author.',
            'When referencing other speakers, frame them as clients, prospects, or peers using clear attribution or direct quotes.',
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
        $lines[] = 'Speaker inference protocol:';
        $lines[] = '- Review the Author Style Profile to understand their offers, expertise, tone, and ideal audience.';
        $lines[] = '- Study the transcript excerpt to determine which speaker acts as the expert whose words align with that profile.';
        $lines[] = '- Attribute first-person statements only to the inferred author. Treat contributions from other speakers as client quotes, questions, or observations with clear framing.';
        $lines[] = '- If you cannot confidently identify the author, write in a neutral third-person voice grounded in the insight.';
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
            $lines[] = 'Transcript excerpt (unlabeled speakers):';
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

        $styleProfile = $this->buildStyleProfileLines($style);
        if (!empty($styleProfile)) {
            $lines[] = '';
            $lines[] = 'Author Style Profile (treat as the fingerprint for speaker inference):';
            foreach ($styleProfile as $item) {
                $lines[] = '- ' . $item;
            }
        }

        $lines[] = '';
        $lines[] = 'Return ONLY JSON: { "body": string }';

        // Previous recent-hook guidance is intentionally removed in body-first mode

        return new AiRequest(
            action: 'posts.generate',
            prompt: implode("\n", $lines),
            schema: $this->bodySchema(),
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

        $lines[] = 'Regenerate ONLY the body of a high-quality LinkedIn post from this insight. Do NOT write an opening hook.';
        $lines[] = '';
        $lines[] = 'Formatting contract (body only):';
        $lines[] = '- Return 5-7 paragraphs separated by a blank line (exactly two newline characters). Use actual newline characters (not the literal text "\\n").';
        $lines[] = '- The first paragraph is part of the body, not a hook.';
        $lines[] = '';
        $lines[] = 'Voice contract:';
        $lines[] = '- Write directly to the ideal customer described below; every paragraph should feel like coaching them personally.';
        $lines[] = '- Anchor the narrative in at least one service/offer and at least one outcome from the profile—make the connection explicit, not implied.';
        $lines[] = 'Keep the tone crisp and avoid emoji overload.';
        if ($presetDirective) {
            $lines[] = $presetDirective;
        }
        $lines[] = '';
        $lines[] = 'Speaker inference protocol:';
        $lines[] = '- Preserve the same voice alignment as the original draft: only use first-person statements for the inferred author.';
        $lines[] = '- Frame contributions from other speakers as quotes, questions, or observations with clear attribution.';
        $lines[] = '- If the transcript context remains ambiguous, shift to a neutral third-person perspective rather than guessing.';
        $lines[] = '';
        $lines[] = 'Insight:';
        $lines[] = $insight;

        if ($instructions) {
            $lines[] = '';
            $lines[] = 'Guidance: ' . $instructions;
        }

        $lines[] = '';
        $lines[] = 'Return ONLY JSON: { "body": string }';

        return new AiRequest(
            action: 'post.regenerate',
            prompt: implode("\n", $lines),
            schema: $this->bodySchema(),
            temperature: $this->temperatureForAction('post.regenerate', config('ai.posts.temperature', 0.4)),
            metadata: array_filter([
                'mode' => 'regenerate',
                'postType' => $postType,
            ], static fn ($value) => $value !== null),
        );
    }

    private function bodySchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'body' => ['type' => 'string'],
            ],
            'required' => ['body'],
            'additionalProperties' => false,
        ];
    }

    private function buildStyleProfileLines(array $style): array
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

    // Recent hook guidance intentionally removed in body-first generation
}
