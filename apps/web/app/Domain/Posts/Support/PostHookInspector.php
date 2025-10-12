<?php

namespace App\Domain\Posts\Support;

final class PostHookInspector
{
    /**
     * Extract the opening hook (first paragraph) from post content.
     */
    public static function extractHook(?string $content): ?string
    {
        if (! is_string($content)) {
            return null;
        }

        $normalized = str_replace(["\r\n", "\r"], "\n", $content);
        $normalized = trim($normalized);

        if ($normalized === '') {
            return null;
        }

        $parts = preg_split('/\n{2,}/', $normalized);
        $first = trim($parts[0] ?? '');

        if ($first === '') {
            return null;
        }

        return preg_replace('/\s+/u', ' ', $first);
    }

    /**
     * @param iterable<int, string|null> $contents
     * @return array<int, string>
     */
    public static function extractHooks(iterable $contents, int $limit = 8): array
    {
        $hooks = [];

        foreach ($contents as $content) {
            $hook = self::extractHook($content);
            if (! $hook) {
                continue;
            }

            if (in_array($hook, $hooks, true)) {
                continue;
            }

            $hooks[] = $hook;

            if (count($hooks) >= $limit) {
                break;
            }
        }

        return $hooks;
    }

    /**
     * Maintain an ordered list of hooks capped at a limit.
     *
     * @param array<int, string> $hooks
     * @return array<int, string>
     */
    public static function appendHook(array $hooks, string $hook, int $limit = 8): array
    {
        if ($hook === '') {
            return $hooks;
        }

        if (in_array($hook, $hooks, true)) {
            return $hooks;
        }

        array_unshift($hooks, $hook);

        if (count($hooks) > $limit) {
            $hooks = array_slice($hooks, 0, $limit);
        }

        return $hooks;
    }
}

