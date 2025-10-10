<?php

namespace App\Domain\Projects\Insights\Concerns;

trait HandlesInsightText
{
    private function normalizeInsightText(string $text): string
    {
        $trimmed = trim($text);

        return preg_replace('/\s+/u', ' ', $trimmed) ?? '';
    }

    private function shortenInsightQuote(?string $quote): ?string
    {
        if ($quote === null) {
            return null;
        }

        $clean = $this->normalizeInsightText($quote);
        if ($clean === '') {
            return null;
        }

        if (mb_strlen($clean, 'UTF-8') > 220) {
            $clean = mb_substr($clean, 0, 220, 'UTF-8') . '…';
        }

        return $clean;
    }

    private function hashInsightContent(string $normalizedContent): string
    {
        return hash('sha256', $normalizedContent);
    }
}
