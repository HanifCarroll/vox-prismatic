<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ContentProject;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class InertiaWebTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('content_projects');
        Schema::dropIfExists('users');

        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->timestamps();
        });

        Schema::create('content_projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('title')->nullable();
            $table->string('current_stage')->nullable();
            $table->integer('processing_progress')->nullable();
            $table->string('processing_step')->nullable();
            $table->text('transcript_original')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('content_projects');
        Schema::dropIfExists('users');

        parent::tearDown();
    }
    public function test_login_page_renders_for_guest(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Auth/Login'));
    }

    public function test_projects_index_requires_authentication(): void
    {
        $this->get('/projects')->assertRedirect('/login');
    }

    public function test_projects_index_lists_projects_for_authenticated_user(): void
    {
        $user = User::query()->create([
            'id' => (string) Str::uuid(),
            'name' => 'Casey Tester',
            'email' => 'casey.tester@example.com',
            'password' => Hash::make('password'),
        ]);

        $project = ContentProject::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'title' => 'Sample Project',
            'transcript_original' => 'Example transcript for testing.',
            'current_stage' => 'processing',
            'processing_progress' => 20,
            'processing_step' => 'insights',
        ]);

        $this->actingAs($user)
            ->get('/projects')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Projects/Index')
                ->has('projects.data', 1)
                ->where('projects.data.0.id', $project->id)
                ->where('projects.data.0.title', $project->title)
                ->where('projects.data.0.currentStage', $project->current_stage)
            );
    }
}
