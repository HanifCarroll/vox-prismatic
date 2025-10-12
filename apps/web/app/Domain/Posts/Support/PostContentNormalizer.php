<?php

namespace App\Domain\Posts\Support;

final class PostContentNormalizer
{
    public static function normalize(string $content): string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $content);

        if (str_contains($normalized, '\\n\\n')) {
            $normalized = str_replace('\\n\\n', "\n\n", $normalized);
        }

        if (str_contains($normalized, '\\n')) {
            $escapedCount = substr_count($normalized, '\\n');
            if ($escapedCount >= 2 || !str_contains($normalized, "\n")) {
                $normalized = str_replace('\\n', "\n", $normalized);
            }
        }

        return $normalized;
    }
}
