<?php

namespace App\Domain\Posts\Support;

use Illuminate\Support\Str;

final class InsightContextBuilder
{
    public function build(string $transcript, ?int $start, ?int $end): ?string
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

