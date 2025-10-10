<?php
require __DIR__ . '/../vendor/autoload.php';
/** @var \Illuminate\Foundation\Application $app */
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Domain\Projects\Actions\ExtractInsightsAction;
use App\Domain\Posts\Services\StyleProfileResolver;
use App\Domain\Posts\Support\ObjectiveScheduler;
use App\Jobs\Projects\GenerateInsightsJob;
use App\Jobs\Projects\GeneratePostsJob;
use App\Services\AiService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

$uid = DB::table('users')->value('id');
if (!$uid) {
    $uid = (string) Str::uuid();
    DB::table('users')->insert([
        'id' => $uid,
        'name' => 'QA User',
        'email' => 'qa' . bin2hex(random_bytes(3)) . '@example.com',
        'password' => 'dummy',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

$projectId = (string) Str::uuid();
DB::table('content_projects')->insert([
    'id' => $projectId,
    'user_id' => $uid,
    'title' => 'QA Full Run',
    'source_url' => null,
    'transcript_original' => 'Transcript: We will announce product updates, customer insights, and platform improvements.',
    'current_stage' => 'processing',
    'processing_progress' => 0,
    'processing_step' => 'queued',
    'created_at' => now(),
    'updated_at' => now(),
]);

$ai = $app->make(AiService::class);
$extract = $app->make(ExtractInsightsAction::class);
$styleProfiles = $app->make(StyleProfileResolver::class);
$objectiveScheduler = $app->make(ObjectiveScheduler::class);

(new GenerateInsightsJob($projectId))->handle($ai, $extract);
(new GeneratePostsJob($projectId))->handle($styleProfiles, $objectiveScheduler);

echo "DONE: $projectId\n";
