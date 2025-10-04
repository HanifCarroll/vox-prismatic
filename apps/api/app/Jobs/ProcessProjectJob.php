<?php

namespace App\Jobs;

use App\Events\ProjectProcessingCompleted;
use App\Events\ProjectProcessingFailed;
use App\Events\ProjectProcessingProgress;
use App\Models\ContentProject;
use App\Services\AiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ProcessProjectJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600; // 10 minutes
    public int $tries = 3;
    public int $backoff = 60; // 1 minute between retries

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $projectId,
    ) {
        $this->onQueue('processing');
    }

    /**
     * Execute the job.
     */
    public function handle(AiService $ai): void
    {
        // Load project and validate
        $p = ContentProject::query()->where('id', $this->projectId)->first();
        if (!$p) {
            Log::warning('project_not_found', ['projectId' => $this->projectId]);
            return;
        }

        try {
            // Step 1: Initialize
            $this->updateProgress($p, 0, 'started');
            Log::info('project.process.started', ['projectId' => $this->projectId]);
            $this->sleepIfNotTesting();

            // Step 2: Load and normalize transcript
            $row = DB::table('content_projects')
                ->select('transcript_original', 'transcript_cleaned')
                ->where('id', $this->projectId)
                ->first();
            $original = (string) ($row->transcript_original ?? '');
            $cleaned = $row->transcript_cleaned;

            $this->updateProgress($p, 10, 'normalize_transcript');
            Log::info('project.process.normalize_transcript', ['projectId' => $this->projectId]);
            $this->sleepIfNotTesting();

            if (!$cleaned || trim($cleaned) === '') {
                $out = $ai->normalizeTranscript($original);
                $cleaned = $out['transcript'] ?? $original;
                DB::table('content_projects')
                    ->where('id', $this->projectId)
                    ->update(['transcript_cleaned' => $cleaned, 'updated_at' => now()]);
            }

            // Step 3: Generate insights
            $this->updateProgress($p, 40, 'generate_insights');
            Log::info('project.process.generate_insights', ['projectId' => $this->projectId]);
            $this->sleepIfNotTesting();

            $insightsPrompt = "Extract 5-10 crisp, high-signal insights from the transcript. Return JSON { \"insights\": [{ \"content\": string }] }. Transcript:\n\"\"\"\n{$cleaned}\n\"\"\"";
            $insightsJson = $ai->generateJson([
                'prompt' => $insightsPrompt,
                'temperature' => 0.2,
                // Use Pro for higher quality reasoning on insights
                'model' => 'models/gemini-2.5-pro',
                'action' => 'insights.generate',
            ]);

            $items = [];
            if (isset($insightsJson['insights']) && is_array($insightsJson['insights'])) {
                foreach ($insightsJson['insights'] as $it) {
                    if (!is_array($it) || empty($it['content'])) {
                        continue;
                    }
                    $items[] = [
                        'id' => (string) Str::uuid(),
                        'project_id' => $this->projectId,
                        'content' => trim((string) $it['content']),
                        'quote' => null,
                        'score' => null,
                        'is_approved' => false,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            if ($items) {
                DB::table('insights')->insert($items);
            }

            $this->updateProgress($p, 60, 'insights_ready');
            Log::info('project.process.insights_ready', [
                'projectId' => $this->projectId,
                'insightCount' => count($items),
            ]);
            $this->sleepIfNotTesting();

            // Step 4: Generate posts from insights
            $insights = DB::table('insights')
                ->select('id', 'content')
                ->where('project_id', $this->projectId)
                ->orderBy('id')
                ->get();

            $createdPosts = [];
            $postTagsMap = [];
            foreach ($insights as $ins) {
                $prompt = "Write a LinkedIn post (no emoji unless needed) based on this insight. Keep to 4-6 short paragraphs. Return JSON { \"content\": string, \"hashtags\": string[] }.\n\nInsight:\n".$ins->content;
                try {
                    $postJson = $ai->generateJson([
                        'prompt' => $prompt,
                        'temperature' => 0.4,
                        // Use Flash for faster drafting of multiple posts
                        'model' => 'models/gemini-2.5-flash',
                        'action' => 'post.generate',
                    ]);
                    $content = isset($postJson['content']) ? (string) $postJson['content'] : null;
                    if ($content) {
                        $newId = (string) Str::uuid();
                        // Normalize hashtags if provided
                        $tags = [];
                        if (isset($postJson['hashtags']) && is_array($postJson['hashtags'])) {
                            foreach ($postJson['hashtags'] as $t) {
                                if (!is_string($t)) continue;
                                $t = trim($t);
                                if ($t === '') continue;
                                if ($t[0] !== '#') $t = '#'.preg_replace('/\s+/', '', $t);
                                $t = preg_replace('/\s+/', '', $t);
                                $tags[] = $t;
                            }
                            $tags = array_values(array_unique(array_filter($tags)));
                            // Keep 3-5 tags when available
                            if (count($tags) > 5) $tags = array_slice($tags, 0, 5);
                        }
                        $createdPosts[] = [
                            'id' => $newId,
                            'project_id' => $this->projectId,
                            'insight_id' => (string) $ins->id,
                            'content' => $content,
                            'platform' => 'LinkedIn',
                            'status' => 'pending',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                        $postTagsMap[$newId] = $tags;
                    }
                } catch (\Throwable $e) {
                    Log::warning('post_generation_failed', [
                        'projectId' => $this->projectId,
                        'insightId' => $ins->id,
                        'error' => $e->getMessage(),
                    ]);
                    // Continue with other insights
                }
            }

            if ($createdPosts) {
                DB::table('posts')->insert($createdPosts);
                // Set hashtags (text[]) for each post
                foreach ($postTagsMap as $postId => $tags) {
                    if (!is_array($tags) || count($tags) === 0) continue;
                    $escaped = array_map(fn($t) => '"'.str_replace('"','\\"',$t).'"', $tags);
                    $arraySql = 'ARRAY['.implode(',', $escaped).']::text[]';
                    DB::statement("UPDATE posts SET hashtags = $arraySql WHERE id = ?", [$postId]);
                }
            }

            $this->updateProgress($p, 90, 'posts_ready');
            Log::info('project.process.posts_ready', [
                'projectId' => $this->projectId,
                'postCount' => count($createdPosts),
            ]);
            $this->sleepIfNotTesting();

            // Step 5: Complete
            DB::table('content_projects')
                ->where('id', $this->projectId)
                ->update([
                    'current_stage' => 'posts',
                    'processing_progress' => 100,
                    'processing_step' => 'complete',
                    'updated_at' => now(),
                ]);
            Log::info('project.process.completed', ['projectId' => $this->projectId]);
            event(new ProjectProcessingCompleted($this->projectId));
        } catch (\Throwable $e) {
            Log::error('project_process_failed', [
                'projectId' => $this->projectId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            DB::table('content_projects')
                ->where('id', $this->projectId)
                ->update([
                    'processing_step' => 'error',
                    'updated_at' => now(),
                ]);
            event(new ProjectProcessingFailed($this->projectId, 'Processing failed.'));
            throw $e; // Re-throw to trigger retry logic
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('project_process_job_failed', [
            'projectId' => $this->projectId,
            'error' => $exception->getMessage(),
        ]);

        DB::table('content_projects')
            ->where('id', $this->projectId)
            ->update([
                'processing_step' => 'error',
                'updated_at' => now(),
            ]);
        event(new ProjectProcessingFailed($this->projectId, 'Processing failed.'));
    }

    /**
     * Update progress in the database
     */
    private function updateProgress(ContentProject $p, int $progress, string $step): void
    {
        DB::table('content_projects')
            ->where('id', $this->projectId)
            ->update([
                'processing_progress' => $progress,
                'processing_step' => $step,
                'updated_at' => now(),
            ]);
        event(new ProjectProcessingProgress($this->projectId, $step, $progress));
    }

    /**
     * Sleep for a short duration unless in testing environment
     */
    private function sleepIfNotTesting(): void
    {
        if (!app()->environment('testing')) {
            usleep(300000); // 300ms
        }
    }
}
