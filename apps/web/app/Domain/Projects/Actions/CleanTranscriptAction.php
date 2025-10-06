<?php

namespace App\Domain\Projects\Actions;

use Illuminate\Support\Facades\DB;
use App\Services\AiService;

class CleanTranscriptAction
{
    public function execute(string $projectId, AiService $ai): void
    {
        $row = DB::table('content_projects')
            ->select('title', 'transcript_original', 'transcript_cleaned', 'updated_at')
            ->where('id', $projectId)
            ->first();

        $original = (string) ($row?->transcript_original ?? '');
        $cleaned = $row?->transcript_cleaned;
        $currentTitle = (string) ($row?->title ?? '');

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

        // If title is empty or default, generate a better one from cleaned transcript.
        $needsTitle = ($currentTitle === '' || trim($currentTitle) === 'Untitled Project');
        if ($needsTitle) {
            try {
                $generated = trim($ai->generateTranscriptTitle($next));
            } catch (\Throwable $_) {
                $generated = '';
            }

            if ($generated !== '' && strcasecmp($generated, 'Untitled Project') !== 0) {
                DB::table('content_projects')
                    ->where('id', $projectId)
                    ->where(function ($query) {
                        $query->whereNull('title')
                            ->orWhere('title', '=', 'Untitled Project');
                    })
                    ->update([
                        'title' => $generated,
                        'updated_at' => now(),
                    ]);
            }
        }
    }
}
