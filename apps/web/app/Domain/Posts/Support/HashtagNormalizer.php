<?php

namespace App\Domain\Posts\Support;

final class HashtagNormalizer
{
    /**
     * @param iterable<int, string>|iterable<int, mixed> $value
     * @return array<int, string>
     */
    public static function normalize(iterable $value): array
    {
        $tags = [];

        foreach ($value as $tag) {
            $tag = trim((string) $tag);

            if ($tag === '') {
                continue;
            }

            if ($tag[0] !== '#') {
                $tag = '#' . preg_replace('/\s+/', '', $tag);
            }

            $tag = preg_replace('/\s+/', '', $tag);

            if ($tag === '#') {
                continue;
            }

            $tags[] = $tag;
        }

        $unique = array_values(array_unique($tags));

        if (count($unique) > 5) {
            $unique = array_slice($unique, 0, 5);
        }

        return $unique;
    }
}

