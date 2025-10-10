<?php

namespace App\Domain\Posts\Services;

use Illuminate\Support\Facades\DB;

final class StyleProfileResolver
{
    /**
     * @return array<string, mixed>
     */
    public function forProject(string $projectId): array
    {
        $userId = DB::table('content_projects')
            ->where('id', $projectId)
            ->value('user_id');

        if (! $userId) {
            return [];
        }

        return $this->forUser((string) $userId);
    }

    /**
     * @return array<string, mixed>
     */
    public function forUser(string $userId): array
    {
        $style = DB::table('user_style_profiles')
            ->where('user_id', $userId)
            ->value('style');

        if (! $style) {
            return [];
        }

        if (is_array($style)) {
            return $style;
        }

        if (is_string($style)) {
            $decoded = json_decode($style, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }
}

