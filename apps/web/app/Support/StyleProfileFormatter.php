<?php

namespace App\Support;

final class StyleProfileFormatter
{
    /**
     * @param array<string, mixed> $style
     * @return array<int, string>
     */
    public static function lines(array $style): array
    {
        $lines = [];

        $offer = self::cleanString($style['offer'] ?? null);
        if ($offer) {
            $lines[] = 'Offer: ' . $offer;
        }

        $services = self::extractList($style['services'] ?? null);
        if (!empty($services)) {
            $lines[] = 'Services: ' . implode('; ', $services);
        }

        $idealCustomer = self::cleanString($style['idealCustomer'] ?? null);
        if ($idealCustomer) {
            $lines[] = 'Audience: ' . $idealCustomer;
        }

        $outcomes = self::extractList($style['outcomes'] ?? null);
        if (!empty($outcomes)) {
            $lines[] = 'Outcomes delivered: ' . implode('; ', $outcomes);
        }

        $proof = self::extractList($style['proof'] ?? null);
        if (!empty($proof)) {
            $lines[] = 'Proof points: ' . implode('; ', $proof);
        }

        $audienceNags = self::extractList($style['audienceNags'] ?? null, 3);
        if (!empty($audienceNags)) {
            $lines[] = 'Audience pain points: ' . implode('; ', $audienceNags);
        }

        return $lines;
    }

    /**
     * @param mixed $value
     * @return array<int, string>
     */
    private static function extractList($value, int $limit = 5): array
    {
        if (!is_array($value)) {
            return [];
        }

        $items = [];
        foreach ($value as $entry) {
            $clean = self::cleanString($entry ?? null);
            if (!$clean) {
                continue;
            }
            $items[] = $clean;
            if (count($items) >= $limit) {
                break;
            }
        }

        return $items;
    }

    private static function cleanString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        return mb_substr($trimmed, 0, 240);
    }
}
