<?php

namespace App\Services\Ai\Support;

class JsonResponseParser
{
    public static function parse(string $text): ?array
    {
        $trimmed = trim($text);
        if ($trimmed === '') {
            return null;
        }

        if (preg_match('/```json\s*(.*?)```/is', $trimmed, $match)) {
            $trimmed = $match[1];
        } elseif (preg_match('/```\s*(.*?)```/is', $trimmed, $match)) {
            $trimmed = $match[1];
        }

        $decoded = json_decode(trim($trimmed), true);

        return is_array($decoded) ? $decoded : null;
    }

    public static function forceValidUtf8(string $text): string
    {
        $converted = @iconv('UTF-8', 'UTF-8//IGNORE', $text);
        if ($converted === false) {
            $converted = $text;
        }

        return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $converted) ?? $converted;
    }

    /**
     * Normalize OpenAI response content into a string regardless of representation.
     *
     * @param  mixed  $content
     */
    public static function stringifyOpenAiContent($content): string
    {
        if ($content === null) {
            return '';
        }

        if (is_string($content)) {
            return $content;
        }

        if (is_scalar($content)) {
            return (string) $content;
        }

        if (is_array($content)) {
            $parts = [];
            foreach ($content as $item) {
                $parts[] = self::stringifyOpenAiContent($item);
            }
            return implode('', array_filter($parts, fn ($part) => $part !== ''));
        }

        if (is_object($content)) {
            if (isset($content->text) && is_string($content->text)) {
                return $content->text;
            }
            if (method_exists($content, 'text')) {
                $text = $content->text();
                if (is_string($text)) {
                    return $text;
                }
            }
            if (method_exists($content, 'toArray')) {
                $array = $content->toArray();
                if (is_array($array) && isset($array['text']) && is_string($array['text'])) {
                    return $array['text'];
                }
            }
            if ($content instanceof \Stringable) {
                return (string) $content;
            }
        }

        return '';
    }
}
