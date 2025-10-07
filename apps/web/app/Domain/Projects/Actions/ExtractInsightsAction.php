<?php

namespace App\Domain\Projects\Actions;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\AiService;

class ExtractInsightsAction
{
    /**
     * Extract insights for a project. Returns number of insights inserted.
     * Optionally accepts a progress callback receiving an int percent (0-100).
     */
    public function execute(string $projectId, AiService $ai, int $max = 10, ?callable $progress = null): int
    {
        $existingCount = (int) DB::table('insights')->where('project_id', $projectId)->count();
        if ($existingCount >= $max) {
            return 0;
        }

        $row = DB::table('content_projects')
            ->select('transcript_cleaned', 'transcript_original')
            ->where('id', $projectId)
            ->first();
        $transcript = (string) ($row?->transcript_cleaned ?? $row?->transcript_original ?? '');

        $threshold = (int) env('INSIGHTS_MAP_REDUCE_THRESHOLD_CHARS', 12000);
        if (strlen($transcript) <= $threshold) {
            return $this->singlePass($projectId, $ai, $transcript, $max);
        }

        return $this->mapReduce($projectId, $ai, $transcript, $max, $progress);
    }

    private function singlePass(string $projectId, AiService $ai, string $transcript, int $max): int
    {
        $prompt = "Extract 5-10 crisp, high-signal insights from the transcript. Return JSON { \"insights\": [{ \"content\": string }] }. Transcript:\n\"\"\"\n{$transcript}\n\"\"\"";
        $json = $ai->generateJson([
            'prompt' => $prompt,
            'temperature' => (float) env('INSIGHTS_TEMPERATURE', 0.2),
            'model' => env('INSIGHTS_REDUCE_MODEL', AiService::PRO_MODEL),
            'action' => 'insights.generate',
            'projectId' => $projectId,
        ]);

        return $this->insertInsightsFromJson($projectId, $json, $max);
    }

    private function mapReduce(string $projectId, AiService $ai, string $transcript, int $max, ?callable $progress): int
    {
        $chunkSize = (int) env('INSIGHTS_MAP_CHUNK_CHARS', 9000);
        $perChunk = (int) env('INSIGHTS_MAP_PER_CHUNK', 4);
        $poolMax = (int) env('INSIGHTS_REDUCE_POOL_MAX', 40);
        $reduceMin = (int) env('INSIGHTS_REDUCE_TARGET_MIN', 5);
        $reduceMax = (int) env('INSIGHTS_REDUCE_TARGET_MAX', $max);

        $chunks = $this->chunkTextOnLines($transcript, $chunkSize);
        $total = max(1, count($chunks));

        $existingHashes = DB::table('insights')
            ->where('project_id', $projectId)
            ->pluck('content_hash')
            ->filter()
            ->map(fn($h) => (string) $h)
            ->all();
        $seen = array_fill_keys($existingHashes, true);
        $pool = [];

        foreach ($chunks as $i => $chunk) {
            if ($progress) {
                $pct = 50 + (int) floor((($i) / $total) * 30); // 50→80
                $progress(max(50, min(80, $pct)));
            }

            $prompt = "Extract up to {$perChunk} crisp, non-overlapping insights from ONLY this transcript part. Prefer specific, actionable statements. Return JSON { \"insights\": [{ \"content\": string, \"quote\"?: string, \"score\"?: number }] }.\n\nTranscript Part (".($i+1)."/{$total}):\n\"\"\"\n{$chunk}\n\"\"\"";

            try {
                $json = $ai->generateJson([
                    'prompt' => $prompt,
                    'temperature' => (float) env('INSIGHTS_TEMPERATURE', 0.2),
                    'model' => env('INSIGHTS_MAP_MODEL', AiService::FLASH_MODEL),
                    'action' => 'insights.map',
                    'projectId' => $projectId,
                    'metadata' => ['mode' => 'map', 'chunk' => $i + 1, 'total' => $total],
                ]);
            } catch (\Throwable $_) {
                $json = [];
            }

            if (!isset($json['insights']) || !is_array($json['insights'])) {
                continue;
            }

            foreach ($json['insights'] as $it) {
                if (!is_array($it) || empty($it['content'])) {
                    continue;
                }
                $norm = $this->normalize((string) $it['content']);
                if ($norm === '') {
                    continue;
                }
                $hash = hash('sha256', $norm);
                if (isset($seen[$hash])) {
                    continue;
                }
                $seen[$hash] = true; // prevent across chunks

                $pool[] = [
                    'content' => $norm,
                    'quote' => isset($it['quote']) && is_string($it['quote']) ? $this->shortenQuote($it['quote']) : null,
                    'score' => isset($it['score']) && is_numeric($it['score']) ? (float) $it['score'] : null,
                ];

                if (count($pool) >= $poolMax) {
                    break 2; // stop collecting
                }
            }
        }

        if ($progress) {
            $progress(85); // Reduce start
        }

        if (empty($pool)) {
            // Fallback to single pass
            return $this->singlePass($projectId, $ai, $transcript, $max);
        }

        // Build reduce prompt from pooled candidates
        $items = [];
        foreach ($pool as $idx => $c) {
            $n = $idx + 1;
            $line = "- {$n}) ". $c['content'];
            if (!empty($c['quote'])) {
                $line .= "\n  Quote: \"". $this->shortenQuote($c['quote']) ."\"";
            }
            $items[] = $line;
        }
        $list = implode("\n", $items);

        $reducePrompt = "From these candidates, select and lightly edit the best {$reduceMin}-{$reduceMax} unique insights. Remove overlaps, balance themes, keep each standalone and concise. Include the most representative quote when available.\n\nCandidates:\n{$list}\n\nReturn JSON { \"insights\": [{ \"content\": string, \"quote\"?: string }] }.";

        $reduced = $ai->generateJson([
            'prompt' => $reducePrompt,
            'temperature' => (float) env('INSIGHTS_TEMPERATURE', 0.2),
            'model' => env('INSIGHTS_REDUCE_MODEL', AiService::PRO_MODEL),
            'action' => 'insights.reduce',
            'projectId' => $projectId,
            'metadata' => ['mode' => 'reduce', 'pool' => count($pool)],
        ]);

        $inserted = $this->insertInsightsFromJson($projectId, $reduced, $max);

        if ($progress) {
            $progress(90);
        }

        return $inserted;
    }

    private function insertInsightsFromJson(string $projectId, array $json, int $max): int
    {
        $existingHashes = DB::table('insights')
            ->where('project_id', $projectId)
            ->pluck('content_hash')
            ->filter()
            ->map(fn($h) => (string) $h)
            ->all();
        $seen = array_fill_keys($existingHashes, true);

        $batchSeen = [];
        $rows = [];
        if (isset($json['insights']) && is_array($json['insights'])) {
            foreach ($json['insights'] as $it) {
                if (!is_array($it) || empty($it['content'])) {
                    continue;
                }
                $norm = $this->normalize((string) $it['content']);
                if ($norm === '') {
                    continue;
                }
                $hash = hash('sha256', $norm);
                if (isset($seen[$hash]) || isset($batchSeen[$hash])) {
                    continue;
                }
                $batchSeen[$hash] = true;
                $rows[] = [
                    'id' => (string) Str::uuid(),
                    'project_id' => $projectId,
                    'content' => $norm,
                    'content_hash' => $hash,
                    'quote' => isset($it['quote']) && is_string($it['quote']) ? $this->shortenQuote($it['quote']) : null,
                    'score' => isset($it['score']) && is_numeric($it['score']) ? (float) $it['score'] : null,
                    'is_approved' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                if (count($rows) >= $max) {
                    break;
                }
            }
        }

        if ($rows) {
            DB::transaction(function () use ($rows) {
                DB::table('insights')->insert($rows);
            });
        }

        return count($rows);
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

    private function shortenQuote(string $quote): string
    {
        $clean = trim($this->normalize($quote));
        if (mb_strlen($clean) > 220) {
            $clean = mb_substr($clean, 0, 220).'…';
        }
        return $clean;
    }

    private function normalize(string $text): string
    {
        $trim = trim($text);
        return preg_replace('/\s+/u', ' ', $trim) ?? '';
    }
}
