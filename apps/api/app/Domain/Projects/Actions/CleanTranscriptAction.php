<?php

namespace App\Domain\Projects\Actions;

use Illuminate\Support\Facades\DB;
use App\Services\AiService;

class CleanTranscriptAction
{
    public function execute(string $projectId, AiService $ai): void
    {
        $row = DB::table('content_projects')
            ->select('transcript_original', 'transcript_cleaned', 'updated_at')
            ->where('id', $projectId)
            ->first();

        $original = (string) ($row?->transcript_original ?? '');
        $cleaned = $row?->transcript_cleaned;

        if ($cleaned !== null && trim((string) $cleaned) !== '') {
            return;
        }

        $out = $ai->normalizeTranscript($original);
        $next = $out['transcript'] ?? $original;

        DB::table('content_projects')
            ->where('id', $projectId)
            ->where(function ($query) {
                $query->whereNull('transcript_cleaned')
                    ->orWhere(DB::raw("trim(transcript_cleaned) = ''"));
            })
            ->update([
                'transcript_cleaned' => $next,
                'updated_at' => now(),
            ]);
    }
}
