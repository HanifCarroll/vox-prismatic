<?php

namespace App\Domain\Projects\Actions;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\AiService;

class CleanTranscriptAction
{
    public function execute(string $projectId, AiService $ai, ?callable $progress = null): void
    {
        $row = DB::table('content_projects')
            ->select('title', 'transcript_original', 'transcript_cleaned', 'transcript_cleaned_partial', 'cleaning_chunk_index', 'cleaning_chunks_total')
            ->where('id', $projectId)
            ->first();

        $original = (string) ($row?->transcript_original ?? '');
        $cleaned = $row?->transcript_cleaned;
        $partial = (string) ($row?->transcript_cleaned_partial ?? '');
        $currentTitle = (string) ($row?->title ?? '');
        $doneChunks = (int) ($row?->cleaning_chunk_index ?? 0);
        $existingTotal = (int) ($row?->cleaning_chunks_total ?? 0);

        if ($cleaned !== null && trim((string) $cleaned) !== '') {
            return;
        }

        // Determine chunks
        $chunkSize = (int) env('AI_MAX_CHARS_PER_REQUEST', 12000);
        $chunks = $this->chunkTextOnLines($original, $chunkSize);
        $total = max(1, count($chunks));

        // Repair inconsistent checkpoint state
        if ($doneChunks < 0 || $doneChunks > $total) {
            $doneChunks = 0;
            $partial = '';
        }

        // Initialize checkpoint in DB if missing or changed
        if ($existingTotal !== $total) {
            DB::table('content_projects')
                ->where('id', $projectId)
                ->update([
                    'cleaning_chunks_total' => $total,
                    'updated_at' => now(),
                ]);
        }

        // Emit initial progress for resumed runs and log resume state
        if ($doneChunks > 0) {
            Log::info('projects.clean.resume', [
                'project_id' => $projectId,
                'completed' => $doneChunks,
                'total' => $total,
            ]);
        }

        // Emit initial progress for resumed runs
        if ($progress) {
            $pct = 10 + (int) floor(($doneChunks / max(1, $total)) * 35);
            $progress(max(10, min(45, $pct)));
        }

        // Process remaining chunks sequentially with per-chunk persistence
        for ($i = $doneChunks; $i < $total; $i++) {
            $partIdx = $i + 1;
            $chunk = $chunks[$i];
            $prompt = "You are a text cleaner for meeting transcripts. This is part {$partIdx} of {$total}.\n\n".
                "Clean this PART ONLY by:\n- Removing timestamps and system messages\n- Removing filler words (um, uh) and repeated stutters unless meaningful\n- Converting to plain text (no HTML)\n- Normalizing spaces and line breaks for readability\n- IMPORTANT: If speaker labels like \"Me:\" and \"Them:\" are present, PRESERVE them verbatim at the start of each line. Do not invent or rename speakers.\n\n".
                "Return JSON { \"transcript\": string, \"length\": number } where transcript is only for this part.\n\nTranscript Part ({$partIdx}/{$total}):\n\"\"\"\n{$chunk}\n\"\"\"";

            $started = microtime(true);
            Log::info('projects.clean.chunk.start', [
                'project_id' => $projectId,
                'chunk' => $partIdx,
                'total' => $total,
            ]);

            try {
                $json = $ai->generateJson([
                    'schema' => [
                        'type' => 'object',
                        'properties' => [
                            'transcript' => ['type' => 'string'],
                            'length' => ['type' => 'integer'],
                        ],
                        'required' => ['transcript','length'],
                        'additionalProperties' => false,
                    ],
                    'prompt' => $prompt,
                    'temperature' => 0.1,
                    'model' => AiService::FLASH_MODEL,
                    'action' => 'transcript.normalize',
                    'projectId' => $projectId,
                    'metadata' => ['mode' => 'chunked', 'chunk' => $partIdx, 'total' => $total],
                    // Stream progress within this chunk into the cleaning band [10,45]
                    'onProgress' => $progress ? function (float $fraction) use ($progress) {
                        $fraction = max(0.0, min(1.0, $fraction));
                        $pct = 10 + (int) floor($fraction * 35);
                        $progress(max(10, min(45, $pct)));
                    } : null,
                    'expectedBytes' => strlen($chunk),
                ]);

                $cleanedPart = trim((string) ($json['transcript'] ?? ''));
                if ($cleanedPart === '') {
                    throw new \RuntimeException('Empty transcript returned');
                }
            } catch (\Throwable $e) {
                Log::warning('projects.clean.chunk.fallback', [
                    'project_id' => $projectId,
                    'chunk' => $partIdx,
                    'total' => $total,
                    'error' => $e->getMessage(),
                ]);
                $cleanedPart = $this->basicClean($chunk);
            }

            $duration = (int) round((microtime(true) - $started) * 1000);
            Log::info('projects.clean.chunk.done', [
                'project_id' => $projectId,
                'chunk' => $partIdx,
                'total' => $total,
                'duration_ms' => $duration,
                'mem_mb' => (int) round(memory_get_usage(true) / 1048576),
            ]);

            // Persist partial and checkpoint atomically for this chunk
            $partial = $this->appendPart($partial, $cleanedPart);
            $partial = $this->forceValidUtf8($partial);
            DB::table('content_projects')
                ->where('id', $projectId)
                ->update([
                    'transcript_cleaned_partial' => $partial,
                    'cleaning_chunk_index' => $partIdx, // number of completed chunks
                    'cleaning_chunks_total' => $total,
                    'updated_at' => now(),
                ]);

            // Progress after chunk
            if ($progress) {
                $ratio = $partIdx / max(1, $total);
                $pct = 10 + (int) floor($ratio * 35);
                $progress(max(10, min(45, $pct)));
            }
        }

        // Finalize: write cleaned transcript and clear checkpoints
        $final = $this->forceValidUtf8($partial);
        DB::table('content_projects')
            ->where('id', $projectId)
            ->update([
                'transcript_cleaned' => $final,
                'transcript_cleaned_partial' => null,
                'cleaning_chunk_index' => null,
                'cleaning_chunks_total' => null,
                'updated_at' => now(),
            ]);

        // If title is empty or default, generate a better one from cleaned transcript.
        $needsTitle = ($currentTitle === '' || trim($currentTitle) === 'Untitled Project');
        if ($needsTitle) {
            try {
                $generated = trim($ai->generateTranscriptTitle($partial));
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

    private function appendPart(string $accum, string $part): string
    {
        $a = trim($accum);
        $p = trim($part);
        if ($a === '') return $p;
        if ($p === '') return $a;
        return $a . "\n\n" . $p;
    }

    private function basicClean(string $text): string
    {
        $out = preg_replace('/\[(?:\d{1,2}:){1,2}\d{1,2}\]/', '', $text) ?? $text;
        $out = preg_replace('/\((?:\d{1,2}:){1,2}\d{1,2}\)/', '', $out) ?? $out;
        $out = preg_replace('/^(?:SYSTEM|META|NOTE):.*$/mi', '', $out) ?? $out;
        $out = preg_replace('/\b(?:um+|uh+|er+|ah+|hmm+|mmm+)\b[,.!?]*\s*/i', '', $out) ?? $out;
        $out = strip_tags($out);
        $out = preg_replace('/[ \t]+/',' ', $out) ?? $out;
        $out = preg_replace('/\n{3,}/', "\n\n", $out) ?? $out;
        return trim($out);
    }

    private function chunkTextOnLines(string $text, int $max): array
    {
        $lines = preg_split("/\R/", $text) ?: [$text];
        $chunks = [];
        $current = '';
        foreach ($lines as $line) {
            $lineWithNl = ($current === '') ? $line : "\n".$line;
            if (strlen($current) + strlen($lineWithNl) > $max && $current !== '') {
                $chunks[] = $current;
                $current = $line;
            } else {
                $current .= $lineWithNl;
            }
        }
        if (trim($current) !== '') {
            $chunks[] = $current;
        }
        return $chunks;
    }

    private function forceValidUtf8(string $text): string
    {
        $out = @iconv('UTF-8', 'UTF-8//IGNORE', $text);
        if ($out === false) {
            $out = $text;
        }
        // Remove non-printable control characters except tab/newline/carriage return
        $out = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $out) ?? $out;
        return $out;
    }
}
