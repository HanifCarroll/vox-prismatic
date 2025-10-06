<?php

namespace App\Domain\Projects\Actions;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\AiService;

class ExtractInsightsAction
{
    public function execute(string $projectId, AiService $ai, int $max = 10): int
    {
        $existingCount = (int) DB::table('insights')->where('project_id', $projectId)->count();
        if ($existingCount >= $max) {
            return 0;
        }
        $remaining = $max - $existingCount;

        $row = DB::table('content_projects')
            ->select('transcript_cleaned', 'transcript_original')
            ->where('id', $projectId)
            ->first();
        $transcript = (string) ($row?->transcript_cleaned ?? $row?->transcript_original ?? '');

        $prompt = "Extract 5-10 crisp, high-signal insights from the transcript. Return JSON { \"insights\": [{ \"content\": string }] }. Transcript:\n\"\"\"\n{$transcript}\n\"\"\"";
        $json = $ai->generateJson([
            'prompt' => $prompt,
            'temperature' => 0.2,
            'model' => 'models/gemini-2.5-pro',
            'action' => 'insights.generate',
        ]);

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
                    'quote' => null,
                    'score' => null,
                    'is_approved' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                if (count($rows) >= $remaining) {
                    break;
                }
            }
        }

        if ($rows) {
            DB::table('insights')->insert($rows);
        }

        return count($rows);
    }

    private function normalize(string $text): string
    {
        $trim = trim($text);
        return preg_replace('/\s+/u', ' ', $trim) ?? '';
    }
}

