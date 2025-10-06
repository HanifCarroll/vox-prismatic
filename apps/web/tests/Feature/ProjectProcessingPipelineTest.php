<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Projects\Actions\CleanTranscriptAction;
use App\Domain\Projects\Actions\EnqueueProjectProcessingAction;
use App\Domain\Projects\Actions\ExtractInsightsAction;
use App\Domain\Projects\Actions\GeneratePostsAction;
use App\Events\ProjectProcessingCompleted;
use App\Events\ProjectProcessingProgress;
use App\Jobs\Projects\CleanTranscriptJob;
use App\Jobs\Projects\GenerateInsightsJob;
use App\Jobs\Projects\GeneratePostsJob;
use App\Models\ContentProject;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class FakeAiService extends AiService
{
    /** @var array<int, array{content: string}> */
    public array $insightResponses = [
        ['content' => 'First generated insight'],
        ['content' => 'Second generated insight'],
    ];

    /** @var array<string, array{content: string, hashtags: array<int, string>}> */
    public array $postResponses = [];

    public string $normalizedTranscript = 'Normalized transcript body.';
    public string $generatedTitle = 'Generated Transcript Title';

    public function normalizeTranscript(string $text): array
    {
        return [
            'transcript' => $this->normalizedTranscript,
            'length' => strlen($this->normalizedTranscript),
        ];
    }

    public function generateJson(array $args): array
    {
        $action = $args['action'] ?? '';

        if ($action === 'insights.generate') {
            return ['insights' => $this->insightResponses];
        }

        if ($action === 'posts.generate') {
            $insightId = (string) ($args['metadata']['insightId'] ?? 'unknown');
            return $this->postResponses[$insightId] ?? [
                'content' => "Post for {$insightId}",
                'hashtags' => ['#Testing'],
            ];
        }

        return [];
    }

    public function generateTranscriptTitle(string $text): string
    {
        return $this->generatedTitle;
    }
}

class ProjectProcessingPipelineTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('posts');
        Schema::dropIfExists('insights');
        Schema::dropIfExists('content_projects');
        Schema::dropIfExists('users');

        Schema::create('users', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->timestamps();
        });

        Schema::create('content_projects', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('title')->nullable();
            $table->string('source_url')->nullable();
            $table->text('transcript_original')->nullable();
            $table->text('transcript_cleaned')->nullable();
            $table->string('current_stage')->nullable();
            $table->integer('processing_progress')->default(0);
            $table->string('processing_step')->nullable();
            $table->timestamps();
        });

        Schema::create('insights', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->text('content');
            $table->string('content_hash')->nullable();
            $table->text('quote')->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->boolean('is_approved')->default(false);
            $table->timestamps();
        });

        Schema::create('posts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->uuid('insight_id')->nullable();
            $table->text('content');
            $table->string('platform');
            $table->string('status');
            $table->text('hashtags')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('posts');
        Schema::dropIfExists('insights');
        Schema::dropIfExists('content_projects');
        Schema::dropIfExists('users');

        parent::tearDown();
    }

    public function test_jobs_run_in_sequence_and_emit_progress(): void
    {
        Event::fake();

        $ai = new FakeAiService();
        $clean = app(CleanTranscriptAction::class);
        $extract = app(ExtractInsightsAction::class);
        $generate = app(GeneratePostsAction::class);

        $userId = (string) Str::uuid();
        DB::table('users')->insert([
            'id' => $userId,
            'name' => 'Pipeline User',
            'email' => 'pipeline@example.com',
            'password' => Hash::make('password'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $projectId = (string) Str::uuid();
        DB::table('content_projects')->insert([
            'id' => $projectId,
            'user_id' => $userId,
            'title' => 'Pipeline Project',
            'transcript_original' => 'Original transcript content',
            'transcript_cleaned' => null,
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'processing_step' => 'queued',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        (new CleanTranscriptJob($projectId))->handle($ai, $clean);
        (new GenerateInsightsJob($projectId))->handle($ai, $extract);
        (new GeneratePostsJob($projectId))->handle($ai, $generate);

        $project = DB::table('content_projects')->where('id', $projectId)->first();
        $this->assertNotNull($project);
        $this->assertSame('posts', $project->current_stage);
        $this->assertSame(100, $project->processing_progress);
        $this->assertSame('posts', $project->processing_step);
        $this->assertSame($ai->normalizedTranscript, $project->transcript_cleaned);

        $this->assertSame(2, DB::table('insights')->where('project_id', $projectId)->count());
        $this->assertSame(2, DB::table('posts')->where('project_id', $projectId)->count());

        Event::assertDispatched(ProjectProcessingProgress::class, fn ($event) => $event->projectId === $projectId && $event->step === 'cleaning' && $event->progress === 10);
        Event::assertDispatched(ProjectProcessingProgress::class, fn ($event) => $event->projectId === $projectId && $event->step === 'insights' && $event->progress === 50);
        Event::assertDispatched(ProjectProcessingProgress::class, fn ($event) => $event->projectId === $projectId && $event->step === 'posts' && $event->progress === 100);
        Event::assertDispatched(ProjectProcessingCompleted::class, fn ($event) => $event->projectId === $projectId);
    }

    public function test_enqueue_action_dispatches_chain(): void
    {
        Bus::fake();
        Event::fake();

        $user = User::query()->create([
            'id' => (string) Str::uuid(),
            'name' => 'Dispatch User',
            'email' => 'dispatch@example.com',
            'password' => Hash::make('password'),
        ]);

        $project = ContentProject::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'title' => 'Dispatch Project',
            'transcript_original' => 'Needs processing',
            'current_stage' => 'ready',
            'processing_progress' => 100,
            'processing_step' => 'posts',
        ]);

        $action = app(EnqueueProjectProcessingAction::class);
        $action->execute($project);

        Bus::assertChained([
            CleanTranscriptJob::class,
            GenerateInsightsJob::class,
            GeneratePostsJob::class,
        ]);

        $updated = DB::table('content_projects')->where('id', $project->id)->first();
        $this->assertNotNull($updated);
        $this->assertSame('processing', $updated->current_stage);
        $this->assertSame('queued', $updated->processing_step);
        $this->assertSame(0, $updated->processing_progress);

        Event::assertDispatched(ProjectProcessingProgress::class, fn ($event) => $event->projectId === (string) $project->id && $event->step === 'queued' && $event->progress === 0);
    }

    public function test_generate_posts_job_skips_existing_posts(): void
    {
        Event::fake();

        $ai = new FakeAiService();
        $clean = app(CleanTranscriptAction::class);
        $extract = app(ExtractInsightsAction::class);
        $generate = app(GeneratePostsAction::class);

        $userId = (string) Str::uuid();
        DB::table('users')->insert([
            'id' => $userId,
            'name' => 'Idempotent User',
            'email' => 'idempotent@example.com',
            'password' => Hash::make('password'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $projectId = (string) Str::uuid();
        DB::table('content_projects')->insert([
            'id' => $projectId,
            'user_id' => $userId,
            'title' => 'Idempotent Project',
            'transcript_original' => 'Transcript needs cleaning',
            'transcript_cleaned' => null,
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'processing_step' => 'queued',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Run cleaning and insight generation once to seed data.
        (new CleanTranscriptJob($projectId))->handle($ai, $clean);
        (new GenerateInsightsJob($projectId))->handle($ai, $extract);

        $insights = DB::table('insights')->where('project_id', $projectId)->pluck('id');
        $this->assertCount(2, $insights);

        // Pre-seed a post for the first insight.
        $existingInsightId = (string) $insights->first();
        DB::table('posts')->insert([
            'id' => (string) Str::uuid(),
            'project_id' => $projectId,
            'insight_id' => $existingInsightId,
            'content' => 'Existing post content',
            'platform' => 'LinkedIn',
            'status' => 'pending',
            'hashtags' => json_encode(['#Existing']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $generateJob = new GeneratePostsJob($projectId);
        $generateJob->handle($ai, $generate);

        $this->assertSame(2, DB::table('posts')->where('project_id', $projectId)->count());

        // Running the posts job again should keep the count stable.
        $generateJob->handle($ai, $generate);
        $this->assertSame(2, DB::table('posts')->where('project_id', $projectId)->count());

        $project = DB::table('content_projects')->where('id', $projectId)->first();
        $this->assertSame('posts', $project->current_stage);
        $this->assertSame(100, $project->processing_progress);
        $this->assertSame('posts', $project->processing_step);

        Event::assertDispatched(ProjectProcessingProgress::class, fn ($event) => $event->projectId === $projectId && $event->step === 'posts' && $event->progress === 100);
    }

    public function test_clean_transcript_generates_title_when_missing(): void
    {
        $ai = new FakeAiService();
        $clean = app(CleanTranscriptAction::class);

        $userId = (string) Str::uuid();
        DB::table('users')->insert([
            'id' => $userId,
            'name' => 'Titleless User',
            'email' => 'titleless@example.com',
            'password' => Hash::make('password'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $projectId = (string) Str::uuid();
        DB::table('content_projects')->insert([
            'id' => $projectId,
            'user_id' => $userId,
            'title' => null,
            'transcript_original' => 'Some original transcript to clean and title.',
            'transcript_cleaned' => null,
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'processing_step' => 'queued',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        (new CleanTranscriptJob($projectId))->handle($ai, $clean);

        $project = DB::table('content_projects')->where('id', $projectId)->first();
        $this->assertNotNull($project);
        $this->assertSame($ai->normalizedTranscript, $project->transcript_cleaned);
        $this->assertSame($ai->generatedTitle, $project->title);

        // Running clean again should not overwrite existing title.
        $ai->generatedTitle = 'Different Title';
        (new CleanTranscriptJob($projectId))->handle($ai, $clean);
        $project2 = DB::table('content_projects')->where('id', $projectId)->first();
        $this->assertSame($ai->generatedTitle, 'Different Title');
        $this->assertSame('Generated Transcript Title', $project2->title);
    }
}
