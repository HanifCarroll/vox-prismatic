<?php

namespace App\Domain\Projects\Actions;

use App\Services\AiService;
use App\Services\Ai\Prompts\InsightsPromptBuilder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ExtractInsightsAction
{
    public function __construct(private readonly InsightsPromptBuilder $prompts)
    {
    }
    /**
     * Extract insights for a project. Returns number of insights inserted.
     * Optionally accepts a progress callback receiving an int percent (0-100).
     */
    public function execute(string $projectId, AiService $ai, int $max = 10, ?callable $progress = null): int
    {
        $existingCount = (int) DB::table('insights')->where('project_id', $projectId)->count();
        if ($existingCount >= $max) {
            if ($progress) {
                $progress(90);
            }

            return 0;
        }

        $candidateCount = (int) DB::table('content_project_insight_candidates')
            ->where('project_id', $projectId)
            ->count();

        $row = DB::table('content_projects')
            ->select('transcript_original', 'user_id')
            ->where('id', $projectId)
            ->first();
        $transcript = (string) ($row?->transcript_original ?? '');
        $userId = $row?->user_id ? (string) $row->user_id : null;

        if ($candidateCount > 0) {
            Log::info('insights.reduce.from_candidates', [
                'project_id' => $projectId,
                'candidates' => $candidateCount,
            ]);
            return $this->reduceFromCandidates($projectId, $ai, $max, $progress, $userId);
        }

        $threshold = (int) (config('ai.insights.map_reduce_threshold_chars') ?? 12000);
        if (strlen($transcript) <= $threshold) {
            return $this->singlePass($projectId, $ai, $transcript, $max, $userId, $progress);
        }

        Log::info('insights.map_reduce.start', [
            'project_id' => $projectId,
            'chars' => strlen($transcript),
        ]);

        return $this->mapReduce($projectId, $ai, $transcript, $max, $progress, $userId);
    }

    public function chunkTranscript(string $transcript, int $maxChunkSize): array
    {
        return $this->chunkTextOnLines($transcript, $maxChunkSize);
    }

    private function singlePass(string $projectId, AiService $ai, string $transcript, int $max, ?string $userId, ?callable $progress = null): int
    {
        $request = $this->prompts
            ->singlePass($transcript)
            ->withContext($projectId, $userId);

        $json = $ai->complete($request)->data;

        $transcriptLength = mb_strlen($transcript, 'UTF-8');
        if (isset($json['insights']) && is_array($json['insights'])) {
            foreach ($json['insights'] as &$insight) {
                if (is_array($insight)) {
                    $insight['source_start_offset'] = 0;
                    $insight['source_end_offset'] = $transcriptLength;
                }
            }
            unset($insight);
        }

        $inserted = $this->insertInsightsFromJson($projectId, $json, $max);

        if ($progress) {
            $progress(90);
        }

        return $inserted;
    }

    private function mapReduce(string $projectId, AiService $ai, string $transcript, int $max, ?callable $progress, ?string $userId): int
    {
        $config = (array) config('ai.insights', []);
        $chunkSize = (int) ($config['map_chunk_chars'] ?? 9000);
        $perChunk = (int) ($config['map_per_chunk'] ?? 4);
        $poolMax = (int) ($config['reduce_pool_max'] ?? 40);
        $reduceMin = (int) ($config['reduce_target_min'] ?? 5);
        $reduceMaxSetting = $config['reduce_target_max'] ?? null;
        $reduceMax = $reduceMaxSetting !== null ? (int) $reduceMaxSetting : $max;

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
            $chunkText = (string) ($chunk['text'] ?? '');
            $chunkStart = (int) ($chunk['start'] ?? 0);
            $chunkEnd = (int) ($chunk['end'] ?? $chunkStart + mb_strlen($chunkText, 'UTF-8'));
            if ($progress) {
                $pct = 10 + (int) floor((($i + 1) / $total) * 70); // 10→80
                $progress(max(10, min(80, $pct)));
            }

            try {
                $request = $this->prompts
                    ->mapChunk($chunkText, $i, $total, $perChunk, ['chunkSize' => mb_strlen($chunkText, 'UTF-8')])
                    ->withContext($projectId, $userId)
                    ->withMetadata([
                        'chunkStart' => $chunkStart,
                        'chunkEnd' => $chunkEnd,
                    ]);

                $json = $ai->complete($request)->data;
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
                    'start' => $chunkStart,
                    'end' => $chunkEnd,
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
            return $this->singlePass($projectId, $ai, $transcript, $max, $userId, $progress);
        }

        $reduced = $ai->complete(
            $this->prompts
                ->reduce($pool, $reduceMin, $reduceMax, ['pool' => count($pool)])
                ->withContext($projectId, $userId)
        )->data;

        if (isset($reduced['insights']) && is_array($reduced['insights'])) {
            foreach ($reduced['insights'] as &$item) {
                if (! is_array($item) || empty($item['content'])) {
                    continue;
                }

                $normalized = $this->normalize((string) $item['content']);
                $offsets = $this->resolveSourceOffsets($normalized, $pool);
                $item['source_start_offset'] = $offsets['start'];
                $item['source_end_offset'] = $offsets['end'];
            }
            unset($item);
        }

        $inserted = $this->insertInsightsFromJson($projectId, $reduced, $max);

        if ($progress) {
            $progress(90);
        }

        return $inserted;
    }

    public function mapChunk(string $projectId, AiService $ai, string $transcriptChunk, int $chunkIndex, int $totalChunks, ?string $userId = null, ?int $chunkStartOffset = null, ?int $chunkEndOffset = null): int
    {
        $trimmed = trim($transcriptChunk);
        if ($trimmed === '') {
            return 0;
        }

        $perChunk = (int) ((array) config('ai.insights', [])['map_per_chunk'] ?? 4);

        Log::info('insights.map.chunk.start', [
            'project_id' => $projectId,
            'chunk' => $chunkIndex,
            'total' => $totalChunks,
            'chars' => strlen($trimmed),
        ]);

        try {
            $request = $this->prompts
                ->mapChunk($trimmed, max(0, $chunkIndex - 1), $totalChunks, $perChunk)
                ->withContext($projectId, $userId)
                ->withMetadata([
                    'chunkStartOffset' => $chunkStartOffset,
                    'chunkEndOffset' => $chunkEndOffset,
                ]);

            $json = $ai->complete($request)->data;
        } catch (\Throwable $e) {
            Log::warning('insights.map.chunk_failed', [
                'project_id' => $projectId,
                'chunk' => $chunkIndex,
                'error' => $e->getMessage(),
            ]);
            return 0;
        }

        if (!isset($json['insights']) || !is_array($json['insights'])) {
            return 0;
        }

        $candidates = [];
        $now = now();
        foreach ($json['insights'] as $it) {
            if (!is_array($it) || empty($it['content'])) {
                continue;
            }
            $norm = $this->normalize((string) $it['content']);
            if ($norm === '') {
                continue;
            }
            $hash = hash('sha256', $norm);
            $candidates[] = [
                'id' => (string) Str::uuid(),
                'project_id' => $projectId,
                'chunk_index' => $chunkIndex,
                'content' => $norm,
                'content_hash' => $hash,
                'quote' => isset($it['quote']) && is_string($it['quote']) ? $this->shortenQuote($it['quote']) : null,
                'score' => isset($it['score']) && is_numeric($it['score']) ? (float) $it['score'] : null,
                'source_start_offset' => $chunkStartOffset,
                'source_end_offset' => $chunkEndOffset,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (empty($candidates)) {
            return 0;
        }

        DB::table('content_project_insight_candidates')->upsert(
            $candidates,
            ['project_id', 'content_hash'],
            ['chunk_index', 'content', 'quote', 'score', 'source_start_offset', 'source_end_offset', 'updated_at']
        );

        Log::info('insights.map.chunk.success', [
            'project_id' => $projectId,
            'chunk' => $chunkIndex,
            'total' => $totalChunks,
            'candidates' => count($candidates),
        ]);

        return count($candidates);
    }

    private function reduceFromCandidates(string $projectId, AiService $ai, int $max, ?callable $progress, ?string $userId): int
    {
        $config = (array) config('ai.insights', []);
        $poolMax = (int) ($config['reduce_pool_max'] ?? 40);
        $reduceMin = (int) ($config['reduce_target_min'] ?? 5);
        $reduceMaxSetting = $config['reduce_target_max'] ?? null;
        $reduceMax = $reduceMaxSetting !== null ? (int) $reduceMaxSetting : $max;

        $candidates = DB::table('content_project_insight_candidates')
            ->where('project_id', $projectId)
            ->orderBy('created_at')
            ->limit($poolMax)
            ->get();

        if ($candidates->isEmpty()) {
            return 0;
        }

        if ($progress) {
            $progress(85);
        }

        if ($candidates->count() <= $reduceMax) {
            $payload = [
                'insights' => $candidates->map(fn ($candidate) => [
                    'content' => $candidate->content,
                    'quote' => $candidate->quote,
                    'score' => $candidate->score,
                    'source_start_offset' => isset($candidate->source_start_offset) ? (int) $candidate->source_start_offset : null,
                    'source_end_offset' => isset($candidate->source_end_offset) ? (int) $candidate->source_end_offset : null,
                ])->all(),
            ];

            $inserted = $this->insertInsightsFromJson($projectId, $payload, $max);

            if ($progress) {
                $progress(90);
            }

            DB::table('content_project_insight_candidates')->where('project_id', $projectId)->delete();

            Log::info('insights.reduce.skipped', [
                'project_id' => $projectId,
                'candidates' => $candidates->count(),
                'inserted' => $inserted,
            ]);

            return $inserted;
        }

        $poolEntries = [];
        foreach ($candidates as $candidate) {
            $poolEntries[] = [
                'content' => $this->normalize((string) $candidate->content),
                'quote' => isset($candidate->quote) ? $this->shortenQuote((string) $candidate->quote) : null,
                'start' => isset($candidate->source_start_offset) ? (int) $candidate->source_start_offset : null,
                'end' => isset($candidate->source_end_offset) ? (int) $candidate->source_end_offset : null,
            ];
        }

        $reduced = $ai->complete(
            $this->prompts
                ->reduce($poolEntries, $reduceMin, $reduceMax, ['pool' => $candidates->count()])
                ->withContext($projectId, $userId)
        )->data;

        if (isset($reduced['insights']) && is_array($reduced['insights'])) {
            foreach ($reduced['insights'] as &$item) {
                if (! is_array($item) || empty($item['content'])) {
                    continue;
                }

                $normalized = $this->normalize((string) $item['content']);
                $offsets = $this->resolveSourceOffsets($normalized, $poolEntries);
                $item['source_start_offset'] = $offsets['start'];
                $item['source_end_offset'] = $offsets['end'];
            }
            unset($item);
        }

        $inserted = $this->insertInsightsFromJson($projectId, $reduced, $max);

        if ($progress) {
            $progress(90);
        }

        DB::table('content_project_insight_candidates')->where('project_id', $projectId)->delete();

        Log::info('insights.reduce.complete', [
            'project_id' => $projectId,
            'candidates' => $candidates->count(),
            'inserted' => $inserted,
        ]);

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

                $startOffset = null;
                $endOffset = null;
                if (isset($it['source_start_offset']) || isset($it['source_end_offset'])) {
                    $startOffset = isset($it['source_start_offset']) ? (int) $it['source_start_offset'] : null;
                    $endOffset = isset($it['source_end_offset']) ? (int) $it['source_end_offset'] : null;
                }

                $rows[] = [
                    'id' => (string) Str::uuid(),
                    'project_id' => $projectId,
                    'content' => $norm,
                    'content_hash' => $hash,
                    'quote' => isset($it['quote']) && is_string($it['quote']) ? $this->shortenQuote($it['quote']) : null,
                    'score' => isset($it['score']) && is_numeric($it['score']) ? (float) $it['score'] : null,
                    'is_approved' => false,
                    'source_start_offset' => $startOffset,
                    'source_end_offset' => $endOffset,
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
        $length = mb_strlen($text, 'UTF-8');
        $offset = 0;
        $chunks = [];

        while ($offset < $length) {
            $remaining = $length - $offset;
            $take = min($max, $remaining);
            $slice = mb_substr($text, $offset, $take, 'UTF-8');

            if ($take < $remaining) {
                $lastNewline = mb_strrpos($slice, "\n");
                if ($lastNewline !== false && $lastNewline > 0) {
                    $slice = mb_substr($slice, 0, $lastNewline, 'UTF-8');
                    $take = mb_strlen($slice, 'UTF-8');
                }
            }

            if ($take === 0) {
                $take = min($max, $remaining);
                $slice = mb_substr($text, $offset, $take, 'UTF-8');
            }

            $start = $offset;
            $end = $offset + $take;

            $chunks[] = [
                'text' => $slice,
                'start' => $start,
                'end' => $end,
            ];

            $offset = $end;

            while ($offset < $length) {
                $char = mb_substr($text, $offset, 1, 'UTF-8');
                if ($char === "\n" || $char === "\r") {
                    $offset++;
                } else {
                    break;
                }
            }
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

    /**
     * @param  array<int, array{content: string, quote: ?string, score: ?float, start: int, end: int}>  $pool
     * @return array{start: ?int, end: ?int}
     */
    private function resolveSourceOffsets(string $normalizedContent, array $pool): array
    {
        $bestScore = -1;
        $bestStart = null;
        $bestEnd = null;

        foreach ($pool as $entry) {
            $candidateContent = $entry['content'] ?? '';
            $score = 0.0;
            if ($candidateContent !== '') {
                similar_text($normalizedContent, (string) $candidateContent, $percent);
                $score = $percent;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestStart = isset($entry['start']) ? (int) $entry['start'] : null;
                $bestEnd = isset($entry['end']) ? (int) $entry['end'] : null;
            }
        }

        if ($bestScore < 10) {
            return ['start' => null, 'end' => null];
        }

        return ['start' => $bestStart, 'end' => $bestEnd];
    }
}
