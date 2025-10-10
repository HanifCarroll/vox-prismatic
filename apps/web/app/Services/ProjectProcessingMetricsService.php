<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ProjectProcessingMetricsService
{
    public function record(string $projectId, string $stage, int $durationMs): void
    {
        if ($durationMs < 0) {
            $durationMs = 0;
        }

        DB::transaction(function () use ($projectId, $stage, $durationMs): void {
            DB::table('project_processing_metrics')->insert([
                'id' => (string) Str::uuid(),
                'project_id' => $projectId,
                'stage' => $stage,
                'duration_ms' => $durationMs,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $existing = DB::table('project_processing_stats')
                ->where('stage', $stage)
                ->lockForUpdate()
                ->first();

            if (!$existing) {
                DB::table('project_processing_stats')->insert([
                    'stage' => $stage,
                    'sample_count' => 1,
                    'total_duration_ms' => $durationMs,
                    'average_duration_ms' => $durationMs,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $average = $durationMs;
                $count = 1;
            } else {
                $count = ((int) $existing->sample_count) + 1;
                $total = ((int) $existing->total_duration_ms) + $durationMs;
                $average = (int) round($total / max(1, $count));

                DB::table('project_processing_stats')
                    ->where('stage', $stage)
                    ->update([
                        'sample_count' => $count,
                        'total_duration_ms' => $total,
                        'average_duration_ms' => $average,
                        'updated_at' => now(),
                    ]);
            }

            Log::info('projects.metrics.stage_average', [
                'stage' => $stage,
                'latest_duration_ms' => $durationMs,
                'average_duration_ms' => $average,
                'sample_count' => $count,
            ]);
        });
    }
}
