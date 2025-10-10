<?php

namespace App\Services\Ai\Prompts;

use App\Services\Ai\AiRequest;

class InsightsPromptBuilder
{
    private function temperature(): float
    {
        $configured = config('ai.insights.temperature');
        if ($configured === null) {
            return 0.2;
        }

        return (float) $configured;
    }

    public function singlePass(string $transcript): AiRequest
    {
        $prompt = "Extract 5-10 crisp, high-signal insights from the transcript. Return JSON { \"insights\": [{ \"content\": string }] }. Transcript:\n\"\"\"\n{$transcript}\n\"\"\"";

        return new AiRequest(
            action: 'insights.generate',
            prompt: $prompt,
            schema: [
                'type' => 'object',
                'properties' => [
                    'insights' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'content' => ['type' => 'string'],
                                'quote' => ['type' => 'string'],
                                'score' => ['type' => 'number'],
                            ],
                            'required' => ['content'],
                            'additionalProperties' => false,
                        ],
                    ],
                ],
                'required' => ['insights'],
                'additionalProperties' => false,
            ],
            temperature: $this->temperature(),
            metadata: ['mode' => 'single'],
        );
    }

    public function mapChunk(
        string $chunkText,
        int $chunkIndex,
        int $totalChunks,
        int $perChunk,
        array $metadata = []
    ): AiRequest {
        $prompt = "Extract up to {$perChunk} crisp, non-overlapping insights from ONLY this transcript part. Prefer specific, actionable statements. Return JSON { \"insights\": [{ \"content\": string, \"quote\"?: string, \"score\"?: number }] }.\n\nTranscript Part ("
            . ($chunkIndex + 1) . "/{$totalChunks}):\n\"\"\"\n{$chunkText}\n\"\"\"";

        return new AiRequest(
            action: 'insights.map',
            prompt: $prompt,
            schema: [
                'type' => 'object',
                'properties' => [
                    'insights' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'content' => ['type' => 'string'],
                                'quote' => ['type' => 'string'],
                                'score' => ['type' => 'number'],
                            ],
                            'required' => ['content'],
                            'additionalProperties' => false,
                        ],
                    ],
                ],
                'required' => ['insights'],
                'additionalProperties' => false,
            ],
            temperature: $this->temperature(),
            metadata: [
                'mode' => 'map',
                'chunk' => $chunkIndex + 1,
                'total' => $totalChunks,
                ...$metadata,
            ],
        );
    }

    /**
     * @param  array<int, array{content: string, quote?: ?string, score?: ?float}>  $candidates
     */
    public function reduce(array $candidates, int $reduceMin, int $reduceMax, array $metadata = []): AiRequest
    {
        $lines = [];
        foreach ($candidates as $idx => $candidate) {
            $line = '- ' . ($idx + 1) . ') ' . $candidate['content'];
            if (isset($candidate['quote']) && $candidate['quote'] !== null && $candidate['quote'] !== '') {
                $line .= "\n  Quote: \"" . $candidate['quote'] . '"';
            }
            $lines[] = $line;
        }

        $list = implode("\n", $lines);
        $prompt = "From these candidates, select and lightly edit the best {$reduceMin}-{$reduceMax} unique insights. Remove overlaps, balance themes, keep each standalone and concise. Include the most representative quote when available.\n\nCandidates:\n{$list}\n\nReturn JSON { \"insights\": [{ \"content\": string, \"quote\"?: string }] }.";

        return new AiRequest(
            action: 'insights.reduce',
            prompt: $prompt,
            schema: [
                'type' => 'object',
                'properties' => [
                    'insights' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'content' => ['type' => 'string'],
                                'quote' => ['type' => 'string'],
                            ],
                            'required' => ['content'],
                            'additionalProperties' => false,
                        ],
                    ],
                ],
                'required' => ['insights'],
                'additionalProperties' => false,
            ],
            temperature: $this->temperature(),
            metadata: ['mode' => 'reduce', ...$metadata],
        );
    }
}
