<?php

namespace App\Domain\Projects\Actions;

use App\Events\ProjectProcessingProgress;
use App\Exceptions\ConflictException;
use App\Jobs\Projects\CleanTranscriptJob;
use App\Jobs\Projects\GenerateInsightsJob;
use App\Jobs\Projects\GeneratePostsJob;
use App\Models\ContentProject;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EnqueueProjectProcessingAction
{
    public function execute(ContentProject $project): void
    {
        $activeSteps = ['queued', 'cleaning', 'insights', 'posts'];

        if ($project->current_stage === 'processing' && in_array($project->processing_step, $activeSteps, true)) {
            throw new ConflictException('Project is already being processed');
        }

        $postCount = (int) DB::table('posts')->where('project_id', $project->id)->count();
        if ($postCount > 0) {
            throw new ConflictException('Posts already exist for this project');
        }

        DB::table('content_projects')->where('id', $project->id)->update([
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'processing_step' => 'queued',
            'updated_at' => now(),
        ]);

        event(new ProjectProcessingProgress((string) $project->id, 'queued', 0));

        $batch = Bus::batch([
            new CleanTranscriptJob((string) $project->id),
            new GenerateInsightsJob((string) $project->id),
            new GeneratePostsJob((string) $project->id),
        ])->onQueue('processing')
            ->name('project-processing:'.$project->id)
            ->dispatch();

        DB::table('content_projects')
            ->where('id', $project->id)
            ->update([
                'processing_batch_id' => $batch->id,
                'updated_at' => now(),
            ]);

        $project->processing_batch_id = $batch->id;

        Log::info('projects.process.queued', [
            'project_id' => (string) $project->id,
            'user_id' => (string) $project->user_id,
            'source' => 'livewire',
        ]);
    }
}
