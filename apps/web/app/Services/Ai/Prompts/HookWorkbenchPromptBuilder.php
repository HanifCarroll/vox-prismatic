<?php

namespace App\Services\Ai\Prompts;

use App\Services\Ai\AiRequest;

class HookWorkbenchPromptBuilder
{
    /**
     * @param  array<int, array{id: string, label: string, description: string}>  $frameworks
     */
    public function hooks(
        array $frameworks,
        int $count,
        string $insight,
        string $draftOpening,
        ?string $transcriptExcerpt,
        array $styleProfile = [],
        array $recentHooks = [],
        ?string $customFocus = null
    ): AiRequest {
        $library = [];
        foreach ($frameworks as $framework) {
            $description = trim($framework['description']);
            $library[] = '- ' . $framework['id'] . ': ' . $framework['label'] . ' → ' . $description;
        }

        $lines = [];

        $lines[] = 'You are a hook strategist for high-performing LinkedIn posts.';
        $lines[] = 'Generate scroll-stopping opening lines (<= 210 characters, 1-2 sentences, no emojis).';
        $lines[] = 'Produce ' . $count . ' options.';
        $lines[] = 'Each option must follow one of the approved frameworks below.';
        if ($audience = $this->describeAudience($styleProfile)) {
            $lines[] = $audience;
        } else {
            $lines[] = 'Write to the project’s target audience using language that feels native to them.';
        }
        if ($tone = $this->describeTonePreset($styleProfile['tonePreset'] ?? null)) {
            $lines[] = $tone;
        }
        if ($perspective = $this->describePerspective($styleProfile['perspective'] ?? null)) {
            $lines[] = $perspective;
        }
        if (!empty($styleProfile['toneNote'])) {
            $lines[] = 'Tone note: ' . trim((string) $styleProfile['toneNote']);
        }
        $lines[] = 'Rotate rhetorical forms across the set—mix bold commands, data jolts, micro-stories, vivid statements, and only occasional questions.';
        $lines[] = 'Limit question-led hooks to a single option unless a chosen framework explicitly requires otherwise.';
        $lines[] = 'For every hook, score curiosity and value alignment (0-100). Provide a short rationale.';
        $lines[] = 'Return ONLY JSON with shape { "summary"?: string, "recommendedId"?: string, "hooks": [{ "id", "frameworkId", "label", "hook", "curiosity", "valueAlignment", "rationale" }] }.';
        $lines[] = 'Framework Library:';
        $lines = array_merge($lines, $library);
        $lines[] = '';
        $lines[] = 'Project Insight (anchor the promise to this idea):';
        $lines[] = $insight;

        if ($transcriptExcerpt) {
            $lines[] = '';
            $lines[] = 'Transcript Excerpt (do not quote verbatim; use for credibility only):';
            $lines[] = $transcriptExcerpt;
        }

        if ($styleDetails = $this->buildStyleDetails($styleProfile)) {
            $lines[] = '';
            $lines[] = 'Business anchors (weave in as proof or positioning cues):';
            foreach ($styleDetails as $detail) {
                $lines[] = '- ' . $detail;
            }
        }

        if (!empty($recentHooks)) {
            $lines[] = '';
            $lines[] = 'Recent hooks already used by this project—avoid copying their scaffolding or lead words:';
            $counter = 0;
            foreach ($recentHooks as $hook) {
                $hook = trim((string) $hook);
                if ($hook === '') {
                    continue;
                }
                $lines[] = '- ' . $hook;
                $counter++;
                if ($counter >= 6) {
                    break;
                }
            }
        }

        $lines[] = '';
        $lines[] = 'Current Draft Opening:';
        $lines[] = $draftOpening !== '' ? $draftOpening : 'Current draft opening unavailable.';

        if ($customFocus) {
            $lines[] = '';
            $lines[] = 'Audience Focus: ' . $customFocus;
        }

        $lines[] = '';
        $lines[] = 'Remember: respond with JSON only.';

        return new AiRequest(
            action: 'hook.workbench',
            prompt: implode("\n", $lines),
            schema: [
                'type' => 'object',
                'properties' => [
                    'summary' => ['type' => 'string'],
                    'recommendedId' => ['type' => 'string'],
                    'hooks' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'id' => ['type' => 'string'],
                                'frameworkId' => ['type' => 'string'],
                                'label' => ['type' => 'string'],
                                'hook' => ['type' => 'string'],
                                'curiosity' => ['type' => 'integer'],
                                'valueAlignment' => ['type' => 'integer'],
                                'rationale' => ['type' => 'string'],
                            ],
                            'required' => ['id', 'frameworkId', 'hook', 'curiosity', 'valueAlignment'],
                            'additionalProperties' => false,
                        ],
                    ],
                ],
                'required' => ['hooks'],
                'additionalProperties' => false,
            ],
            temperature: $this->temperature(),
            metadata: ['mode' => 'hook.workbench'],
        );
    }

    private function temperature(): ?float
    {
        $value = config('ai.hook_workbench.temperature');
        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }

    private function describeAudience(array $style): ?string
    {
        $audience = $this->cleanString($style['idealCustomer'] ?? null);
        if ($audience) {
            return 'Speak directly to ' . $audience . '.';
        }

        $services = $this->extractList($style['services'] ?? null, 2);
        if (!empty($services)) {
            return 'Write for buyers evaluating services like: ' . implode('; ', $services) . '.';
        }

        return null;
    }

    private function buildStyleDetails(array $style): array
    {
        $details = [];

        if ($offer = $this->cleanString($style['offer'] ?? null)) {
            $details[] = 'Offer: ' . $offer;
        }

        $services = $this->extractList($style['services'] ?? null, 3);
        if (!empty($services)) {
            $details[] = 'Services: ' . implode('; ', $services);
        }

        $outcomes = $this->extractList($style['outcomes'] ?? null, 3);
        if (!empty($outcomes)) {
            $details[] = 'Outcomes delivered: ' . implode('; ', $outcomes);
        }

        if ($goal = $this->describePromotionGoal($style['promotionGoal'] ?? null)) {
            $details[] = $goal;
        }

        return $details;
    }

    private function describePromotionGoal(?string $goal): ?string
    {
        return match ($goal) {
            'leads' => 'Priority: invite qualified leads to start a conversation.',
            'traffic' => 'Priority: drive clicks to supporting assets without sounding salesy.',
            'launch' => 'Priority: build momentum for an upcoming launch; tease the transformation.',
            default => null,
        };
    }

    private function describeTonePreset(?string $value): ?string
    {
        $map = [
            'confident' => 'Keep the voice confident and decisive.',
            'friendly_expert' => 'Stay warm, encouraging, and consultative while remaining authoritative.',
            'builder' => 'Sound like a hands-on builder sharing lessons from the trenches.',
            'challenger' => 'Lean into a provocative, myth-busting stance.',
            'inspiring' => 'Use uplifting, future-casting energy.',
        ];

        return $map[$value] ?? null;
    }

    private function describePerspective(?string $value): ?string
    {
        $map = [
            'first_person' => 'Write in first-person singular ("I", "me").',
            'first_person_plural' => 'Write in first-person plural ("we", "our").',
            'third_person' => 'Write in third-person, referring to the author or company by name.',
        ];

        return $map[$value] ?? null;
    }

    /**
     * @param mixed $value
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

    private function cleanString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : mb_substr($trimmed, 0, 240);
    }
}
