<?php
require __DIR__ . '/../vendor/autoload.php';
/** @var \Illuminate\Foundation\Application $app */
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Domain\Projects\Actions\CleanTranscriptAction;
use App\Domain\Projects\Actions\ExtractInsightsAction;
use App\Domain\Projects\Actions\GeneratePostsAction;
use App\Jobs\Projects\CleanTranscriptJob;
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
    'transcript_cleaned' => null,
    'current_stage' => 'processing',
    'processing_progress' => 0,
    'processing_step' => 'queued',
    'created_at' => now(),
    'updated_at' => now(),
]);

$ai = $app->make(AiService::class);
$clean = $app->make(CleanTranscriptAction::class);
$extract = $app->make(ExtractInsightsAction::class);
$generate = $app->make(GeneratePostsAction::class);

(new CleanTranscriptJob($projectId))->handle($ai, $clean);
(new GenerateInsightsJob($projectId))->handle($ai, $extract);
(new GeneratePostsJob($projectId))->handle($ai, $generate);

echo "DONE: $projectId\n";
