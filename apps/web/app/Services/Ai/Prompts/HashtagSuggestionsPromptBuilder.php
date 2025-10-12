<?php

namespace App\Services\Ai\Prompts;

use App\Services\Ai\AiRequest;

class HashtagSuggestionsPromptBuilder
{
    public function suggest(
        string $insight,
        string $content,
        ?string $transcriptExcerpt,
        array $styleProfile = []
    ): AiRequest {
        $lines = [];

        $lines[] = 'You are assisting a LinkedIn author with tag selection.';
        $lines[] = 'Generate exactly 3 relevant, specific hashtags for the post. No emojis. No punctuation besides alphanumerics. No spaces.';
        $lines[] = 'Prefer concrete topics, roles, technologies, or outcomes over generic tags. Avoid super generic tags like #success, #growth, #innovation.';
        $lines[] = 'Avoid platform or vanity tags. Keep each under ~24 characters.';
        $lines[] = 'Return ONLY JSON: { "hashtags": [string, string, string] }';
        $lines[] = '';
        $lines[] = 'Project Insight:';
        $lines[] = $insight;
        $lines[] = '';
        $lines[] = 'Draft Post Content (hook + body):';
        $lines[] = $content;

        if ($transcriptExcerpt) {
            $lines[] = '';
            $lines[] = 'Transcript Excerpt (for context; do not quote):';
            $lines[] = $transcriptExcerpt;
        }

        $styleDetails = $this->styleDetails($styleProfile);
        if (!empty($styleDetails)) {
            $lines[] = '';
            $lines[] = 'Style/Business context (use to increase relevance):';
            foreach ($styleDetails as $detail) {
                $lines[] = '- ' . $detail;
            }
        }

        return new AiRequest(
            action: 'hashtags.suggest',
            prompt: implode("\n", $lines),
            schema: [
                'type' => 'object',
                'properties' => [
                    'hashtags' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'minItems' => 3,
                        'maxItems' => 3,
                    ],
                ],
                'required' => ['hashtags'],
                'additionalProperties' => false,
            ],
            temperature: $this->temperature(),
            metadata: ['mode' => 'hashtags.suggest'],
        );
    }

    private function temperature(): ?float
    {
        $value = config('ai.hashtags.temperature');
        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }

    /**
     * @return array<int, string>
     */
    private function styleDetails(array $style): array
    {
        $details = [];
        if ($offer = $this->clean($style['offer'] ?? null)) {
            $details[] = 'Offer: ' . $offer;
        }
        $services = $this->list($style['services'] ?? null, 3);
        if (!empty($services)) {
            $details[] = 'Services: ' . implode('; ', $services);
        }
        $outcomes = $this->list($style['outcomes'] ?? null, 3);
        if (!empty($outcomes)) {
            $details[] = 'Outcomes: ' . implode('; ', $outcomes);
        }
        $idealCustomer = $this->clean($style['idealCustomer'] ?? null);
        if ($idealCustomer) {
            $details[] = 'Audience: ' . $idealCustomer;
        }

        return $details;
    }

    /**
     * @param mixed $value
     * @return array<int, string>
     */
    private function list($value, int $limit = 5): array
    {
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $v) {
            $c = $this->clean($v);
            if (!$c) { continue; }
            $out[] = $c;
            if (count($out) >= $limit) { break; }
        }
        return $out;
    }

    private function clean(mixed $value): ?string
    {
        if (!is_string($value)) { return null; }
        $t = trim($value);
        return $t === '' ? null : mb_substr($t, 0, 240);
    }
}

