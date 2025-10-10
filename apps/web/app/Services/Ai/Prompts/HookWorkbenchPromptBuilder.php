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
        $lines[] = 'Each option must follow one of the approved frameworks below. Match the tone to the audience of executive coaches & consultants.';
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

        $lines[] = '';
        $lines[] = 'Current Draft Opening:';
        $lines[] = $draftOpening;

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
}
