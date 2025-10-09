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

    /** @var array<int, string> */
    public array $capturedPrompts = [];

    public string $normalizedTranscript = 'Normalized transcript body.';
    public string $generatedTitle = 'Generated Transcript Title';

    public function normalizeTranscript(string $text, ?string $projectId = null, ?string $userId = null, ?callable $onProgress = null): array
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
            $this->capturedPrompts[] = (string) ($args['prompt'] ?? '');
            $insightId = (string) ($args['metadata']['insightId'] ?? 'unknown');
            return $this->postResponses[$insightId] ?? [
                'content' => "Post for {$insightId}",
                'hashtags' => ['#Testing'],
            ];
        }

        return [];
    }

    public function generateTranscriptTitle(string $text, ?string $projectId = null, ?string $userId = null): string
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
        Schema::dropIfExists('user_style_profiles');
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
            $table->longText('transcript_cleaned_partial')->nullable();
            $table->integer('cleaning_chunk_index')->nullable();
            $table->integer('cleaning_chunks_total')->nullable();
            $table->string('current_stage')->nullable();
            $table->integer('processing_progress')->default(0);
            $table->string('processing_step')->nullable();
            $table->string('processing_batch_id')->nullable();
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

        Schema::create('user_style_profiles', function (Blueprint $table): void {
            $table->uuid('user_id')->primary();
            $table->json('style')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('posts');
        Schema::dropIfExists('insights');
        Schema::dropIfExists('content_projects');
        Schema::dropIfExists('user_style_profiles');
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

    public function test_generate_posts_uses_style_profile_in_prompt(): void
    {
        Event::fake();

        $ai = new FakeAiService();
        $generate = app(GeneratePostsAction::class);

        $userId = (string) Str::uuid();
        DB::table('users')->insert([
            'id' => $userId,
            'name' => 'Guided User',
            'email' => 'guided@example.com',
            'password' => Hash::make('password'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('user_style_profiles')->insert([
            'user_id' => $userId,
            'style' => json_encode([
                'tonePreset' => 'challenger',
                'toneNote' => 'Keep it witty but grounded.',
                'perspective' => 'third_person',
                'personaPreset' => 'founders',
                'personaCustom' => 'Especially seed-stage SaaS builders.',
                'ctaType' => 'signup',
                'ctaCopy' => 'Book a demo to see it live.',
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $projectId = (string) Str::uuid();
        DB::table('content_projects')->insert([
            'id' => $projectId,
            'user_id' => $userId,
            'title' => 'Guided Project',
            'transcript_original' => 'Transcript needs processing',
            'transcript_cleaned' => 'Cleaned transcript',
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'processing_step' => 'queued',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $insightId = (string) Str::uuid();
        DB::table('insights')->insert([
            'id' => $insightId,
            'project_id' => $projectId,
            'content' => 'Ship small customer-facing improvements weekly to stay close to demand.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $generate->execute($projectId, $ai, 10);

        $this->assertNotEmpty($ai->capturedPrompts);
        $prompt = $ai->capturedPrompts[0];

        $this->assertStringContainsString('Tone: Provocative and willing to challenge conventional wisdom.', $prompt);
        $this->assertStringContainsString('Perspective: Write in third person', $prompt);
        $this->assertStringContainsString('Audience: Startup founders and CEOs', $prompt);
        $this->assertStringContainsString('Call-to-action copy to include near the end: "Book a demo to see it live."', $prompt);
        $this->assertStringContainsString('Ship small customer-facing improvements weekly', $prompt);
    }
}
