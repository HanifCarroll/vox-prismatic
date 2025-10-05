<?php
require __DIR__ . '/../vendor/autoload.php';
/** @var \Illuminate\Foundation\Application $app */
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

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

$job = new \App\Jobs\OrchestrateProjectJob($projectId);
$job->handle(app(\App\Services\AiService::class));

echo "DONE: $projectId\n";
