<?php

namespace App\Domain\Projects\Actions;

use App\Events\ProjectProcessingProgress;
use App\Jobs\Projects\CleanTranscriptJob;
use App\Jobs\Projects\GenerateInsightsJob;
use App\Jobs\Projects\GeneratePostsJob;
use App\Models\ContentProject;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CreateProjectAction
{
    public function execute(
        string $userId,
        string $transcript,
        ?string $title = null,
        ?string $sourceUrl = null,
        string $source = 'create_action',
    ): ContentProject {
        $id = (string) Str::uuid();
        $now = now();
        $resolvedTitle = is_string($title) && trim($title) !== '' ? trim($title) : 'Untitled Project';

        DB::table('content_projects')->insert([
            'id' => $id,
            'user_id' => $userId,
            'title' => $resolvedTitle,
            'source_url' => $sourceUrl,
            'transcript_original' => trim($transcript),
            'transcript_cleaned' => null,
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'processing_step' => 'queued',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $project = ContentProject::query()->where('id', $id)->firstOrFail();

        event(new ProjectProcessingProgress($id, 'queued', 0));

        Bus::chain([
            new CleanTranscriptJob($id),
            new GenerateInsightsJob($id),
            new GeneratePostsJob($id),
        ])->onQueue('processing')->dispatch();

        Log::info('projects.create', [
            'project_id' => $id,
            'user_id' => $userId,
        ]);

        Log::info('projects.process.queued', [
            'project_id' => $id,
            'user_id' => $userId,
            'source' => $source,
        ]);

        return $project;
    }
}
