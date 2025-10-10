<?php

namespace App\Domain\Projects\Insights;

use App\Domain\Projects\Insights\Concerns\HandlesInsightText;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InsightRepository
{
    use HandlesInsightText;

    public function insightCount(string $projectId): int
    {
        return (int) DB::table('insights')->where('project_id', $projectId)->count();
    }

    public function candidateCount(string $projectId): int
    {
        return (int) DB::table('content_project_insight_candidates')
            ->where('project_id', $projectId)
            ->count();
    }

    /**
     * Retrieve the transcript and user context for a project.
     *
     * @return array{transcript: string, user_id: ?string}|null
     */
    public function projectContext(string $projectId): ?array
    {
        $row = DB::table('content_projects')
            ->select('transcript_original', 'user_id')
            ->where('id', $projectId)
            ->first();

        if (!$row) {
            return null;
        }

        $transcript = isset($row->transcript_original) ? (string) $row->transcript_original : '';
        $userId = isset($row->user_id) ? (string) $row->user_id : null;

        return [
            'transcript' => $transcript,
            'user_id' => $userId,
        ];
    }

    /**
     * Persist mapped candidates for a project chunk.
     *
     * @param  array<int, array{
     *     content: string,
     *     content_hash: string,
     *     quote: ?string,
     *     score: ?float,
     *     source_start_offset: ?int,
     *     source_end_offset: ?int
     * }>  $candidates
     */
    public function persistCandidates(string $projectId, int $chunkIndex, array $candidates): int
    {
        if ($candidates === []) {
            return 0;
        }

        $existingHashes = $this->insightHashes($projectId);
        $seen = array_fill_keys($existingHashes, true);
        $batchSeen = [];
        $rows = [];
        $now = now();

        foreach ($candidates as $candidate) {
            $normalized = $this->normalizeInsightText($candidate['content'] ?? '');
            if ($normalized === '') {
                continue;
            }

            $hash = $candidate['content_hash'] ?? $this->hashInsightContent($normalized);
            if (isset($seen[$hash]) || isset($batchSeen[$hash])) {
                continue;
            }

            $batchSeen[$hash] = true;

            $rows[] = [
                'id' => (string) Str::uuid(),
                'project_id' => $projectId,
                'chunk_index' => $chunkIndex,
                'content' => $normalized,
                'content_hash' => $hash,
                'quote' => $this->shortenInsightQuote($candidate['quote'] ?? null),
                'score' => isset($candidate['score']) ? (float) $candidate['score'] : null,
                'source_start_offset' => $candidate['source_start_offset'] ?? null,
                'source_end_offset' => $candidate['source_end_offset'] ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if ($rows === []) {
            return 0;
        }

        DB::table('content_project_insight_candidates')->upsert(
            $rows,
            ['project_id', 'content_hash'],
            ['chunk_index', 'content', 'quote', 'score', 'source_start_offset', 'source_end_offset', 'updated_at']
        );

        return count($rows);
    }

    /**
     * @return Collection<int, array{
     *     content: string,
     *     content_hash: string,
     *     quote: ?string,
     *     score: ?float,
     *     source_start_offset: ?int,
     *     source_end_offset: ?int
     * }>
     */
    public function candidatePool(string $projectId, int $limit): Collection
    {
        return DB::table('content_project_insight_candidates')
            ->where('project_id', $projectId)
            ->orderBy('created_at')
            ->limit($limit)
            ->get()
            ->map(function ($row) {
                return [
                    'content' => $this->normalizeInsightText((string) $row->content),
                    'content_hash' => isset($row->content_hash) ? (string) $row->content_hash : $this->hashInsightContent((string) $row->content),
                    'quote' => isset($row->quote) ? $this->shortenInsightQuote((string) $row->quote) : null,
                    'score' => isset($row->score) ? (float) $row->score : null,
                    'source_start_offset' => isset($row->source_start_offset) ? (int) $row->source_start_offset : null,
                    'source_end_offset' => isset($row->source_end_offset) ? (int) $row->source_end_offset : null,
                ];
            });
    }

    public function clearCandidates(string $projectId): void
    {
        DB::table('content_project_insight_candidates')->where('project_id', $projectId)->delete();
    }

    /**
     * Persist final insights while avoiding duplicates.
     *
     * @param  array<int, array{
     *     content: string,
     *     content_hash?: string,
     *     quote: ?string,
     *     score: ?float,
     *     source_start_offset: ?int,
     *     source_end_offset: ?int
     * }>  $insights
     */
    public function persistInsights(string $projectId, array $insights, int $max): int
    {
        if ($insights === []) {
            return 0;
        }

        $existingHashes = $this->insightHashes($projectId);
        $seen = array_fill_keys($existingHashes, true);
        $batchSeen = [];
        $rows = [];
        $now = now();

        foreach ($insights as $insight) {
            $normalized = $this->normalizeInsightText($insight['content'] ?? '');
            if ($normalized === '') {
                continue;
            }

            $hash = $insight['content_hash'] ?? $this->hashInsightContent($normalized);
            if (isset($seen[$hash]) || isset($batchSeen[$hash])) {
                continue;
            }

            $batchSeen[$hash] = true;

            $rows[] = [
                'id' => (string) Str::uuid(),
                'project_id' => $projectId,
                'content' => $normalized,
                'content_hash' => $hash,
                'quote' => $this->shortenInsightQuote($insight['quote'] ?? null),
                'score' => isset($insight['score']) ? (float) $insight['score'] : null,
                'is_approved' => false,
                'source_start_offset' => $insight['source_start_offset'] ?? null,
                'source_end_offset' => $insight['source_end_offset'] ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($rows) >= $max) {
                break;
            }
        }

        if ($rows === []) {
            return 0;
        }

        DB::table('insights')->insert($rows);

        return count($rows);
    }

    /**
     * @return array<int, string>
     */
    public function insightHashes(string $projectId): array
    {
        return DB::table('insights')
            ->where('project_id', $projectId)
            ->pluck('content_hash')
            ->filter()
            ->map(fn ($hash) => (string) $hash)
            ->all();
    }
}
