<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Projects\Actions\EnqueueProjectProcessingAction;
use App\Domain\Projects\Actions\ExtractInsightsAction;
use App\Domain\Projects\Actions\GeneratePostsAction;
use App\Domain\Posts\Services\StyleProfileResolver;
use App\Domain\Posts\Support\ObjectiveScheduler;
use App\Events\ProjectProcessingCompleted;
use App\Events\ProjectProcessingProgress;
use App\Jobs\Projects\GenerateInsightsJob;
use App\Jobs\Projects\GeneratePostsJob;
use App\Models\ContentProject;
use App\Models\User;
use App\Services\AiService;
use App\Services\ProjectProcessingMetricsService;
use Illuminate\Bus\PendingBatch;
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

    /** @var array<string, array{content: string, hashtags?: array<int, string>}> */
    public array $postResponses = [];

    /** @var array<int, string> */
    public array $insightPrompts = [];

    /** @var array<int, string> */
    public array $postPrompts = [];

    public string $generatedTitle = 'Generated Transcript Title';

    public function generateJson(array $args): array
    {
        $action = (string) ($args['action'] ?? '');

        if (in_array($action, ['insights.generate', 'insights.map', 'insights.reduce'], true)) {
            $this->insightPrompts[] = (string) ($args['prompt'] ?? '');
            return ['insights' => $this->insightResponses];
        }

        if ($action === 'posts.generate') {
            $this->postPrompts[] = (string) ($args['prompt'] ?? '');
            $insightId = (string) ($args['metadata']['insightId'] ?? Str::uuid()->toString());

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

        config(['broadcasting.default' => 'null']);

        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('posts');
        Schema::dropIfExists('insights');
        Schema::dropIfExists('content_project_insight_candidates');
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

        Schema::create('job_batches', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('name');
            $table->integer('total_jobs');
            $table->integer('pending_jobs');
            $table->integer('failed_jobs');
            $table->text('failed_job_ids');
            $table->mediumText('options')->nullable();
            $table->integer('created_at')->nullable();
            $table->integer('cancelled_at')->nullable();
            $table->integer('finished_at')->nullable();
        });

        Schema::create('content_projects', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('title');
            $table->text('source_url')->nullable();
            $table->longText('transcript_original')->nullable();
            $table->string('current_stage')->default('processing');
            $table->integer('processing_progress')->default(0);
            $table->string('processing_step')->nullable();
            $table->string('processing_batch_id')->nullable();
            $table->timestampTz('insights_started_at')->nullable();
            $table->timestampTz('insights_completed_at')->nullable();
            $table->timestampTz('posts_started_at')->nullable();
            $table->timestampTz('posts_completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('content_project_insight_candidates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->unsignedInteger('chunk_index');
            $table->text('content');
            $table->string('content_hash', 64);
            $table->unsignedInteger('source_start_offset')->nullable();
            $table->unsignedInteger('source_end_offset')->nullable();
            $table->text('quote')->nullable();
            $table->float('score')->nullable();
            $table->timestamps();
        });

        Schema::create('insights', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->text('content');
            $table->string('content_hash')->nullable();
            $table->text('quote')->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->unsignedInteger('source_start_offset')->nullable();
            $table->unsignedInteger('source_end_offset')->nullable();
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

        Schema::create('project_processing_metrics', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->string('stage');
            $table->unsignedInteger('duration_ms');
            $table->timestamps();
        });

        Schema::create('project_processing_stats', function (Blueprint $table): void {
            $table->string('stage')->primary();
            $table->unsignedBigInteger('sample_count');
            $table->unsignedBigInteger('total_duration_ms');
            $table->unsignedInteger('average_duration_ms');
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
        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('posts');
        Schema::dropIfExists('insights');
        Schema::dropIfExists('content_project_insight_candidates');
        Schema::dropIfExists('content_projects');
        Schema::dropIfExists('user_style_profiles');
        Schema::dropIfExists('users');
        Schema::dropIfExists('project_processing_stats');
        Schema::dropIfExists('project_processing_metrics');

        parent::tearDown();
    }

    public function test_generate_pipeline_produces_posts_and_progress_events(): void
    {
        Event::fake();

        $ai = new FakeAiService();
        app()->instance(AiService::class, $ai);

        $userId = Str::uuid()->toString();
        DB::table('users')->insert([
            'id' => $userId,
            'name' => 'Pipeline User',
            'email' => 'pipeline@example.com',
            'password' => Hash::make('Password!123'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $projectId = Str::uuid()->toString();
        $transcript = 'Transcript: We will announce product updates, customer insights, and platform improvements.';

        DB::table('content_projects')->insert([
            'id' => $projectId,
            'user_id' => $userId,
            'title' => 'Untitled Project',
            'source_url' => null,
            'transcript_original' => $transcript,
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'processing_step' => 'queued',
            'processing_batch_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        event(new ProjectProcessingProgress($projectId, 'queued', 0));

        $extract = app(ExtractInsightsAction::class);
        $styleProfiles = app(StyleProfileResolver::class);
        $objectiveScheduler = app(ObjectiveScheduler::class);
        $metrics = app(ProjectProcessingMetricsService::class);

        (new GenerateInsightsJob($projectId))->handle($ai, $extract, $metrics);
        (new GeneratePostsJob($projectId))->handle($styleProfiles, $objectiveScheduler);
        (new GeneratePostsJob($projectId))->handle($styleProfiles, $objectiveScheduler);

        $project = DB::table('content_projects')->where('id', $projectId)->first();
        $this->assertNotNull($project);
        $this->assertSame('posts', $project->current_stage);
        $this->assertSame(100, $project->processing_progress);
        $this->assertSame('posts', $project->processing_step);
        $this->assertSame($ai->generatedTitle, $project->title);

        $insights = DB::table('insights')->where('project_id', $projectId)->pluck('content');
        $this->assertSame(2, $insights->count());
        $this->assertTrue($insights->contains('First generated insight'));
        $this->assertTrue($insights->contains('Second generated insight'));

        $posts = DB::table('posts')->where('project_id', $projectId)->pluck('content');
        $this->assertSame(2, $posts->count());

        Event::assertDispatched(ProjectProcessingProgress::class, function (ProjectProcessingProgress $event) use ($projectId): bool {
            return $event->projectId === $projectId && $event->step === 'queued' && $event->progress === 0;
        });

        Event::assertDispatched(ProjectProcessingProgress::class, function (ProjectProcessingProgress $event) use ($projectId): bool {
            return $event->projectId === $projectId && $event->step === 'insights' && $event->progress >= 10 && $event->progress <= 90;
        });

        Event::assertDispatched(ProjectProcessingProgress::class, function (ProjectProcessingProgress $event) use ($projectId): bool {
            return $event->projectId === $projectId && $event->step === 'posts' && $event->progress === 100;
        });

        Event::assertDispatched(ProjectProcessingCompleted::class, function (ProjectProcessingCompleted $event) use ($projectId): bool {
            return $event->projectId === $projectId;
        });

        $this->assertNotEmpty($ai->insightPrompts);
        $this->assertStringContainsString($transcript, $ai->insightPrompts[0]);
    }

    public function test_enqueue_action_dispatches_generate_insights_job(): void
    {
        Bus::fake();
        Event::fake();

        $user = User::query()->create([
            'id' => Str::uuid()->toString(),
            'name' => 'Dispatch User',
            'email' => 'dispatch@example.com',
            'password' => Hash::make('Password!123'),
        ]);

        $project = ContentProject::query()->create([
            'id' => Str::uuid()->toString(),
            'user_id' => $user->id,
            'title' => 'Ready Project',
            'source_url' => null,
            'transcript_original' => 'Needs processing',
            'current_stage' => 'ready',
            'processing_progress' => 100,
            'processing_step' => 'posts',
            'processing_batch_id' => null,
        ]);

        $action = app(EnqueueProjectProcessingAction::class);
        $action->execute($project);

        Bus::assertBatched(function (PendingBatch $batch) use ($project): bool {
            return collect($batch->jobs)->contains(function ($job) use ($project): bool {
                return $job instanceof GenerateInsightsJob && $job->projectId === (string) $project->id;
            });
        });

        Event::assertDispatched(ProjectProcessingProgress::class, function (ProjectProcessingProgress $event) use ($project): bool {
            return $event->projectId === (string) $project->id && $event->step === 'queued' && $event->progress === 0;
        });

        $updated = DB::table('content_projects')->where('id', $project->id)->first();
        $this->assertSame('processing', $updated->current_stage);
        $this->assertSame('queued', $updated->processing_step);
        $this->assertSame(0, $updated->processing_progress);
    }

    public function test_generate_posts_uses_style_profile_in_prompt(): void
    {
        $ai = new FakeAiService();
        app()->instance(AiService::class, $ai);

        $generate = app(GeneratePostsAction::class);

        $userId = Str::uuid()->toString();
        DB::table('users')->insert([
            'id' => $userId,
            'name' => 'Guided User',
            'email' => 'guided@example.com',
            'password' => Hash::make('Password!123'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('user_style_profiles')->insert([
            'user_id' => $userId,
            'style' => json_encode([
                'offer' => 'Done-for-you positioning for founders',
                'services' => ['Weekly coaching sprints', 'Messaging teardown'],
                'audienceShort' => 'Seed-stage SaaS founders',
                'audienceDetail' => 'Founder-led teams trying to scale outbound.',
                'outcomes' => ['Shorten ramp time by 30%', 'Increase reply rates'],
                'promotionGoal' => 'leads',
                'tonePreset' => 'challenger',
                'toneNote' => 'Keep it witty but grounded.',
                'perspective' => 'third_person',
                'personaPreset' => 'founders',
                'personaCustom' => 'Especially seed-stage SaaS builders.',
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $projectId = Str::uuid()->toString();
        DB::table('content_projects')->insert([
            'id' => $projectId,
            'user_id' => $userId,
            'title' => 'Guided Project',
            'source_url' => null,
            'transcript_original' => 'Transcript text for style test',
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'processing_step' => 'queued',
            'processing_batch_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $insightId = Str::uuid()->toString();
        DB::table('insights')->insert([
            'id' => $insightId,
            'project_id' => $projectId,
            'content' => 'Ship small customer-facing improvements weekly to stay close to demand.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $generate->execute($projectId, 10);

        $this->assertNotEmpty($ai->postPrompts);
        $prompt = $ai->postPrompts[0];
        $this->assertStringContainsString('Write 6-8 paragraphs and keep the full post between 1,500 and 2,000 characters', $prompt);
        $this->assertStringContainsString('Tone: Provocative and willing to challenge conventional wisdom.', $prompt);
        $this->assertStringContainsString('Perspective: Write in third person', $prompt);
        $this->assertStringContainsString('Business context (use only to add colour to the insight, never replace it):', $prompt);
        $this->assertStringContainsString('Offer: Done-for-you positioning for founders', $prompt);
        $this->assertStringContainsString('Audience: Seed-stage SaaS founders — Founder-led teams trying to scale outbound.', $prompt);
        $this->assertStringContainsString('Transition into the offer and end with a single confident invite to book a call or request a demo.', $prompt);
        $this->assertStringContainsString('Ship small customer-facing improvements weekly', $prompt);
    }
}
