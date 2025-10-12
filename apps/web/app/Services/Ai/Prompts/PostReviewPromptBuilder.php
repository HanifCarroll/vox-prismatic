<?php

namespace App\Services\Ai\Prompts;

use App\Services\Ai\AiRequest;

class PostReviewPromptBuilder
{
    /**
     * @param array<string, mixed> $styleProfile
     */
    public function review(string $draftContent, array $styleProfile = []): AiRequest
    {
        $lines = [];

        $lines[] = 'You are a LinkedIn content strategist reviewing a draft post. Analyse it and provide actionable feedback that helps the author improve results.';
        $lines[] = '';
        $lines[] = 'Focus areas:';
        $lines[] = '- Clarity: is the core message easy to grasp on a skim?';
        $lines[] = '- Engagement: will this earn reactions, comments, or reposts?';
        $lines[] = '- Readability: are structure, sentence length, and formatting easy to scan?';
        $lines[] = '- Tone consistency: does the voice match the style profile?';
        $lines[] = '- CTA strength: is the next step obvious and motivating?';
        $lines[] = '';
        $lines[] = 'Scoring contract:';
        $lines[] = '- Rate clarity, engagement_potential, and readability from 0-100.';
        $lines[] = '- Use whole numbers only.';
        $lines[] = '- Scores reflect the overall draft, not individual paragraphs.';
        $lines[] = '';
        $lines[] = 'Suggestion contract:';
        $lines[] = '- Provide 2-4 concrete improvements.';
        $lines[] = '- For each suggestion, identify the weakest passage, propose a revision, and explain why it helps.';
        $lines[] = '- Use suggestion_type values: clarity, engagement, readability, or impact (for CTA / overall punch).';
        $lines[] = '- Do not invent new facts. Keep suggestions faithful to the draft.';
        $lines[] = '';
        $lines[] = 'Return ONLY JSON with this shape:';
        $lines[] = '{';
        $lines[] = '  "scores": {';
        $lines[] = '    "clarity": number (0-100),';
        $lines[] = '    "engagement_potential": number (0-100),';
        $lines[] = '    "readability": number (0-100)';
        $lines[] = '  },';
        $lines[] = '  "suggestions": [';
        $lines[] = '    {';
        $lines[] = '      "suggestion_type": "readability" | "engagement" | "clarity" | "impact",';
        $lines[] = '      "original_text": "sentence or paragraph to improve",';
        $lines[] = '      "suggested_improvement": "specific rewrite or instruction",';
        $lines[] = '      "rationale": "why this change improves the post"';
        $lines[] = '    }';
        $lines[] = '  ]';
        $lines[] = '}';
        $lines[] = '';
        $lines[] = 'Draft Post (hook + body):';
        $lines[] = trim($draftContent) !== '' ? $draftContent : 'Draft unavailable.';

        $styleSummary = $this->summarizeStyleProfile($styleProfile);
        if (!empty($styleSummary)) {
            $lines[] = '';
            $lines[] = 'Style Profile (apply when reviewing tone and CTA):';
            foreach ($styleSummary as $item) {
                $lines[] = '- ' . $item;
            }
        }

        $lines[] = '';
        $lines[] = 'Respond with JSON only. Do not include commentary or markdown.';

        return new AiRequest(
            action: 'posts.review',
            prompt: implode("\n", $lines),
            schema: $this->responseSchema(),
            temperature: $this->temperatureForAction('posts.review', config('ai.posts.review_temperature', 0.2)),
            metadata: ['mode' => 'quality_review'],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function responseSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'scores' => [
                    'type' => 'object',
                    'properties' => [
                        'clarity' => ['type' => 'integer'],
                        'engagement_potential' => ['type' => 'integer'],
                        'readability' => ['type' => 'integer'],
                    ],
                    'required' => ['clarity', 'engagement_potential', 'readability'],
                    'additionalProperties' => false,
                ],
                'suggestions' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'suggestion_type' => ['type' => 'string'],
                            'original_text' => ['type' => 'string'],
                            'suggested_improvement' => ['type' => 'string'],
                            'rationale' => ['type' => 'string'],
                        ],
                        'required' => ['suggestion_type', 'original_text', 'suggested_improvement', 'rationale'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
            'required' => ['scores', 'suggestions'],
            'additionalProperties' => false,
        ];
    }

    /**
     * @param array<string, mixed> $style
     * @return array<int, string>
     */
    private function summarizeStyleProfile(array $style): array
    {
        $items = [];

        if ($tone = $this->describeTonePreset($style['tonePreset'] ?? null)) {
            $items[] = $tone;
        }

        if (!empty($style['toneDescriptors'])) {
            foreach ($this->extractList($style['toneDescriptors'] ?? null, 3) as $descriptor) {
                $items[] = 'Tone descriptor: ' . $descriptor;
            }
        }

        if (!empty($style['toneNote'])) {
            $note = $this->cleanString($style['toneNote']);
            if ($note) {
                $items[] = 'Tone note: ' . $note;
            }
        }

        if ($audience = $this->cleanString($style['idealCustomer'] ?? null)) {
            $items[] = 'Audience: ' . $audience;
        }

        if ($offer = $this->cleanString($style['offer'] ?? null)) {
            $items[] = 'Offer: ' . $offer;
        }

        $services = $this->extractList($style['services'] ?? null, 3);
        if (!empty($services)) {
            $items[] = 'Services: ' . implode('; ', $services);
        }

        $outcomes = $this->extractList($style['outcomes'] ?? null, 3);
        if (!empty($outcomes)) {
            $items[] = 'Outcomes delivered: ' . implode('; ', $outcomes);
        }

        if (!empty($style['ctaExpectation']) && is_string($style['ctaExpectation'])) {
            $cta = $this->cleanString($style['ctaExpectation']);
            if ($cta) {
                $items[] = 'Preferred CTA: ' . $cta;
            }
        }

        return $items;
    }

    private function describeTonePreset(?string $value): ?string
    {
        $map = [
            'confident' => 'Keep the voice confident and decisive.',
            'friendly_expert' => 'Voice: friendly, encouraging, and expert.',
            'builder' => 'Voice: practical, builder-in-the-trenches.',
            'coach' => 'Voice: empathetic, directive coach.',
            'visionary' => 'Voice: high-level visionary with concrete proof.',
        ];

        return $map[$value] ?? null;
    }

    /**
     * @param array<int, mixed>|string|null $value
     * @return array<int, string>
     */
    private function extractList(mixed $value, int $limit = 5): array
    {
        if (is_string($value)) {
            $parts = preg_split('/[,;|\n]+/', $value) ?: [];
        } elseif (is_iterable($value)) {
            $parts = [];
            foreach ($value as $entry) {
                if (is_string($entry)) {
                    $parts[] = $entry;
                }
            }
        } else {
            return [];
        }

        $items = [];
        foreach ($parts as $part) {
            $clean = $this->cleanString($part);
            if ($clean === null) {
                continue;
            }
            $items[] = $clean;
            if (count($items) >= $limit) {
                break;
            }
        }

        return $items;
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

        return mb_substr($trimmed, 0, 280);
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
}
