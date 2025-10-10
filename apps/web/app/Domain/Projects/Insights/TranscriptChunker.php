<?php

namespace App\Domain\Projects\Insights;

class TranscriptChunker
{
    public function __construct(private readonly ?int $defaultChunkSize = null)
    {
    }

    /**
     * Split transcripts into roughly even chunks while respecting line boundaries.
     *
     * @return array<int, array{text: string, start: int, end: int}>
     */
    public function chunk(string $transcript, ?int $maxChunkSize = null): array
    {
        $size = $maxChunkSize ?? $this->defaultChunkSize ?? (int) config('insights.chunk.max_chars', 9000);
        if ($size <= 0) {
            $size = 9000;
        }

        return $this->chunkTextOnLines($transcript, $size);
    }

    /**
     * Determine whether the transcript should fall back to a single-pass extraction.
     */
    public function shouldUseSinglePass(string $transcript): bool
    {
        $threshold = (int) config('insights.threshold_chars', 12000);

        return mb_strlen($transcript, 'UTF-8') <= $threshold;
    }

    /**
     * Adapted from the original ExtractInsightsAction implementation.
     * Keeps line endings intact where possible to avoid mid-sentence splits.
     *
     * @return array<int, array{text: string, start: int, end: int}>
     */
    private function chunkTextOnLines(string $text, int $max): array
    {
        $length = mb_strlen($text, 'UTF-8');
        $offset = 0;
        $chunks = [];

        while ($offset < $length) {
            $remaining = $length - $offset;
            $take = min($max, $remaining);
            $slice = mb_substr($text, $offset, $take, 'UTF-8');

            if ($take < $remaining) {
                $lastNewline = mb_strrpos($slice, "\n");
                if ($lastNewline !== false && $lastNewline > 0) {
                    $slice = mb_substr($slice, 0, $lastNewline, 'UTF-8');
                    $take = mb_strlen($slice, 'UTF-8');
                }
            }

            if ($take === 0) {
                $take = min($max, $remaining);
                $slice = mb_substr($text, $offset, $take, 'UTF-8');
            }

            $start = $offset;
            $end = $offset + $take;

            $chunks[] = [
                'text' => $slice,
                'start' => $start,
                'end' => $end,
            ];

            $offset = $end;

            while ($offset < $length) {
                $char = mb_substr($text, $offset, 1, 'UTF-8');
                if ($char === "\n" || $char === "\r") {
                    $offset++;
                } else {
                    break;
                }
            }
        }

        return $chunks;
    }
}
