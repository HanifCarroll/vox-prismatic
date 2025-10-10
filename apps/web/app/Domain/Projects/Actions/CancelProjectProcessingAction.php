<?php

namespace App\Domain\Projects\Actions;

use App\Jobs\Projects\GenerateInsightsJob;
use App\Jobs\Projects\GeneratePostsJob;
use App\Models\ContentProject;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class CancelProjectProcessingAction
{
    /**
     * List of unique processing jobs that should have their locks released.
     *
     * @var array<int, class-string>
     */
    private const UNIQUE_JOBS = [
        GenerateInsightsJob::class,
        GeneratePostsJob::class,
    ];

    public function execute(ContentProject $project, bool $clearMetadata = false): void
    {
        $projectId = (string) $project->id;

        if ($project->processing_batch_id) {
            $batch = Bus::findBatch($project->processing_batch_id);
            if ($batch !== null) {
                $batch->cancel();
            }
        }

        $this->releaseUniqueLocks($projectId);

        if ($clearMetadata) {
            DB::table('content_projects')
                ->where('id', $projectId)
                ->update([
                    'processing_batch_id' => null,
                    'updated_at' => now(),
                ]);

            $project->processing_batch_id = null;
        }
    }

    private function releaseUniqueLocks(string $projectId): void
    {
        $store = config('cache.default');
        $cache = Cache::store($store);

        foreach (self::UNIQUE_JOBS as $jobClass) {
            $key = sprintf('laravel_unique_job:%s:%s', $jobClass, $projectId);

            try {
                $cache->lock($key)->forceRelease();
            } catch (Throwable $exception) {
                Log::debug('projects.processing.lock_release_failed', [
                    'project_id' => $projectId,
                    'job' => $jobClass,
                    'cache_store' => $store,
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }
}
