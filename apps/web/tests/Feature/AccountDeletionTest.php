<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Tests\TestCase;

class AccountDeletionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('ai_usage_events');
        Schema::dropIfExists('user_preferred_timeslots');
        Schema::dropIfExists('user_schedule_preferences');
        Schema::dropIfExists('user_style_profiles');
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
            $table->string('current_stage')->nullable();
            $table->integer('processing_progress')->default(0);
            $table->timestamps();
        });

        Schema::create('insights', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->text('content');
            $table->timestamps();
        });

        Schema::create('posts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->uuid('insight_id')->nullable();
            $table->text('content');
            $table->string('platform');
            $table->string('status');
            $table->timestamps();
        });

        Schema::create('user_style_profiles', function (Blueprint $table): void {
            $table->uuid('user_id')->primary();
            $table->text('style')->nullable();
            $table->timestamps();
        });

        Schema::create('user_schedule_preferences', function (Blueprint $table): void {
            $table->uuid('user_id')->primary();
            $table->string('timezone');
            $table->integer('lead_time_minutes');
            $table->timestamps();
        });

        Schema::create('user_preferred_timeslots', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->integer('iso_day_of_week');
            $table->integer('minutes_from_midnight');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('ai_usage_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->uuid('project_id')->nullable();
            $table->text('action');
            $table->text('model');
            $table->integer('input_tokens')->default(0);
            $table->integer('output_tokens')->default(0);
            $table->decimal('cost_usd', 12, 6)->default(0);
            $table->text('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('ai_usage_events');
        Schema::dropIfExists('user_preferred_timeslots');
        Schema::dropIfExists('user_schedule_preferences');
        Schema::dropIfExists('user_style_profiles');
        Schema::dropIfExists('posts');
        Schema::dropIfExists('insights');
        Schema::dropIfExists('content_projects');
        Schema::dropIfExists('users');
        parent::tearDown();
    }

    public function test_user_can_delete_account_and_data_is_removed(): void
    {
        // Seed user and related data
        $userId = (string) Str::uuid();
        DB::table('users')->insert([
            'id' => $userId,
            'name' => 'Delete Me',
            'email' => 'delete@example.com',
            'password' => Hash::make('password-ABC-123!'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Add a project with insights and posts
        $projectId = (string) Str::uuid();
        DB::table('content_projects')->insert([
            'id' => $projectId,
            'user_id' => $userId,
            'title' => 'To be deleted',
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $insightId = (string) Str::uuid();
        DB::table('insights')->insert([
            'id' => $insightId,
            'project_id' => $projectId,
            'content' => 'Insight',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('posts')->insert([
            'id' => (string) Str::uuid(),
            'project_id' => $projectId,
            'insight_id' => $insightId,
            'content' => 'Post',
            'platform' => 'linkedin',
            'status' => 'draft',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Add auxiliary settings tables
        DB::table('user_style_profiles')->insert([
            'user_id' => $userId,
            'style' => json_encode(['tone' => 'concise']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_schedule_preferences')->insert([
            'user_id' => $userId,
            'timezone' => 'UTC',
            'lead_time_minutes' => 60,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_preferred_timeslots')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'iso_day_of_week' => 1,
            'minutes_from_midnight' => 9 * 60,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // AI usage events (no FK) — both user_id and project_id
        DB::table('ai_usage_events')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'project_id' => $projectId,
            'action' => 'test',
            'model' => 'gpt-test',
            'input_tokens' => 10,
            'output_tokens' => 5,
            'cost_usd' => 0.01,
            'metadata' => json_encode([]),
            'created_at' => now(),
        ]);

        // Act as the user and call delete endpoint
        $user = DB::table('users')->where('id', $userId)->first();
        $this->assertNotNull($user);

        $eloquentUser = \App\Models\User::query()->where('id', $userId)->first();
        $this->actingAs($eloquentUser);

        $resp = $this->deleteJson('/api/settings/account', [
            'currentPassword' => 'password-ABC-123!',
            'confirm' => 'DELETE',
        ]);

        $resp->assertStatus(200);
        $resp->assertJson(['success' => true]);

        // Verify all user-owned data is removed
        $this->assertDatabaseMissing('users', ['id' => $userId]);
        $this->assertDatabaseMissing('content_projects', ['user_id' => $userId]);
        $this->assertDatabaseMissing('insights', ['project_id' => $projectId]);
        $this->assertDatabaseMissing('posts', ['project_id' => $projectId]);
        $this->assertDatabaseMissing('user_style_profiles', ['user_id' => $userId]);
        $this->assertDatabaseMissing('user_schedule_preferences', ['user_id' => $userId]);
        $this->assertDatabaseMissing('user_preferred_timeslots', ['user_id' => $userId]);
        $this->assertDatabaseMissing('ai_usage_events', ['user_id' => $userId]);
        $this->assertDatabaseMissing('ai_usage_events', ['project_id' => $projectId]);
    }
}
