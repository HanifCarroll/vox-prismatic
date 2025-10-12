<?php

namespace App\Services\Ai\Prompts;

use App\Services\Ai\AiRequest;
use App\Support\StyleProfileFormatter;

final class SpeakerInferencePromptBuilder
{
    /**
     * @param array<string, mixed> $style
     */
    public function infer(array $style, string $transcriptExcerpt, ?string $existingDraft = null): AiRequest
    {
        $lines = [];

        $lines[] = 'You are an investigative editor. Determine which speaker in the transcript matches the author described in the style profile.';
        $lines[] = '';
        $lines[] = 'Process:';
        $lines[] = '- Study the Author Style Profile first to understand their offers, audience, tone, and expertise.';
        $lines[] = '- Read the unlabeled transcript excerpt and look for the speaker whose language, expertise, or stories align with that profile.';
        $lines[] = '- Summarize how you identified the author and rate your confidence between 0 and 1.';
        $lines[] = '- Recommend whether future writing should stay in first-person or shift to a neutral third-person perspective.';
        if ($existingDraft) {
            $lines[] = '- Use the existing post draft as a tiebreaker to confirm which speaker previously voiced the content.';
        }

        $lines[] = '';
        $styleProfile = StyleProfileFormatter::lines($style);
        if (!empty($styleProfile)) {
            $lines[] = 'Author Style Profile:';
            foreach ($styleProfile as $item) {
                $lines[] = '- ' . $item;
            }
            $lines[] = '';
        }

        $lines[] = 'Transcript excerpt (unlabeled speakers):';
        $lines[] = $transcriptExcerpt;

        if ($existingDraft) {
            $lines[] = '';
            $lines[] = 'Existing post draft (reference only):';
            $lines[] = $existingDraft;
        }

        $lines[] = '';
        $lines[] = 'Return ONLY JSON: { "authorSummary": string, "confidence": number, "recommendedVoice": "first_person" | "neutral_third_person", "evidence": string[] }';

        return new AiRequest(
            action: 'posts.speaker_inference',
            prompt: implode("\n", $lines),
            schema: [
                'type' => 'object',
                'properties' => [
                    'authorSummary' => ['type' => 'string'],
                    'confidence' => ['type' => 'number'],
                    'recommendedVoice' => [
                        'type' => 'string',
                        'enum' => ['first_person', 'neutral_third_person'],
                    ],
                    'evidence' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                    ],
                ],
                'required' => ['authorSummary', 'confidence', 'recommendedVoice'],
                'additionalProperties' => false,
            ],
            temperature: 0.1,
            metadata: ['mode' => 'speaker_inference'],
        );
    }
}
