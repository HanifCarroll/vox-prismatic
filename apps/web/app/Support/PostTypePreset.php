<?php

namespace App\Support;

final class PostTypePreset
{
    /**
     * @var array<string, string>
     */
    private const HINTS = [
        'story' => 'Tell a vivid narrative with stakes, tension, and a takeaway for the reader.',
        'how_to' => 'Structure as clear, ordered steps that lead to a practical takeaway.',
        'myth_bust' => 'Open with the myth, debunk it fast, and replace it with the surprising truth.',
        'listicle' => 'Deliver a punchy numbered list with scannable, high-utility points.',
        'case_study' => 'Highlight the problem, actions, and measurable results with proof where possible.',
        'announcement' => 'Lead with the headline, spotlight the impact, and spell out what happens next.',
    ];

    /**
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return array_keys(self::HINTS);
    }

    public static function hint(?string $postType): ?string
    {
        if ($postType === null) {
            return null;
        }

        $lower = strtolower($postType);
        return self::HINTS[$lower] ?? null;
    }

    public static function mergeCustomInstructions(?string $customInstructions, ?string $postType): ?string
    {
        $custom = is_string($customInstructions) ? trim($customInstructions) : '';
        $hint = self::hint($postType);

        if ($hint === null) {
            return $custom === '' ? null : $custom;
        }

        $presetLine = sprintf('Preset: %s — %s', $postType, $hint);

        if ($custom === '') {
            return $presetLine;
        }

        if (self::includesPresetLine($custom, $postType)) {
            return $custom;
        }

        return $presetLine . "\n" . $custom;
    }

    private static function includesPresetLine(string $custom, string $postType): bool
    {
        $lines = preg_split("/\r\n|\n|\r/", $custom) ?: [];
        foreach ($lines as $line) {
            if (self::extractPresetSlug($line) === strtolower($postType)) {
                return true;
            }
        }

        return false;
    }

    private static function extractPresetSlug(string $line): ?string
    {
        if (!preg_match('/^Preset:\s*([a-z0-9_\-]+)/i', trim($line), $matches)) {
            return null;
        }

        return strtolower($matches[1]);
    }
}

