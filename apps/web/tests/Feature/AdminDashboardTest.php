<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('ai_usage_events');
        Schema::dropIfExists('content_projects');
        Schema::dropIfExists('users');

        Schema::create('users', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name')->nullable();
            $table->string('email')->unique();
            $table->string('password');
            $table->boolean('is_admin')->default(false);
            $table->string('subscription_status')->nullable();
            $table->string('subscription_plan')->nullable();
            $table->timestamp('subscription_current_period_end')->nullable();
            $table->boolean('cancel_at_period_end')->default(false);
            $table->timestamp('trial_ends_at')->nullable();
            $table->string('stripe_customer_id')->nullable();
            $table->text('trial_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('content_projects', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('title')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_usage_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->uuid('project_id')->nullable();
            $table->string('action');
            $table->string('model');
            $table->integer('input_tokens')->default(0);
            $table->integer('output_tokens')->default(0);
            $table->decimal('cost_usd', 12, 6)->default(0);
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('ai_usage_events');
        Schema::dropIfExists('content_projects');
        Schema::dropIfExists('users');

        parent::tearDown();
    }

    public function test_admin_route_requires_admin(): void
    {
        $user = User::query()->create([
            'id' => (string) Str::uuid(),
            'name' => 'Non Admin',
            'email' => 'user@example.com',
            'password' => Hash::make('password'),
            'is_admin' => false,
            'subscription_status' => 'inactive',
        ]);

        $this->actingAs($user)
            ->get('/admin')
            ->assertForbidden();
    }

    public function test_admin_route_returns_initial_usage(): void
    {
        $admin = User::query()->create([
            'id' => (string) Str::uuid(),
            'name' => 'Zeta Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'is_admin' => true,
            'subscription_status' => 'active',
        ]);

        $customer = User::query()->create([
            'id' => (string) Str::uuid(),
            'name' => 'Beta User',
            'email' => 'beta@example.com',
            'password' => Hash::make('password'),
            'is_admin' => false,
            'subscription_status' => 'active',
            'subscription_plan' => 'pro',
            'subscription_current_period_end' => Carbon::now()->addDays(5),
            'cancel_at_period_end' => true,
            'trial_ends_at' => Carbon::now()->addDays(3),
            'stripe_customer_id' => 'cus_1234',
            'trial_notes' => 'Handles beta features.',
        ]);

        $recent = Carbon::now()->subDays(5);
        $older = Carbon::now()->subDays(60);

        // Within range event
        \DB::table('ai_usage_events')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $customer->id,
            'project_id' => null,
            'action' => 'posts.generate',
            'model' => 'models/gemini-2.5-pro',
            'input_tokens' => 500,
            'output_tokens' => 800,
            'cost_usd' => 0.5,
            'metadata' => json_encode(['seed' => 1]),
            'created_at' => $recent,
            'updated_at' => $recent,
        ]);
        \DB::table('ai_usage_events')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $customer->id,
            'project_id' => null,
            'action' => 'posts.generate',
            'model' => 'models/gemini-2.5-pro',
            'input_tokens' => 600,
            'output_tokens' => 900,
            'cost_usd' => 0.6,
            'metadata' => json_encode(['seed' => 2]),
            'created_at' => $recent->copy()->addHour(),
            'updated_at' => $recent->copy()->addHour(),
        ]);
        // Outside default 30d window
        \DB::table('ai_usage_events')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $customer->id,
            'project_id' => null,
            'action' => 'posts.generate',
            'model' => 'models/gemini-2.5-pro',
            'input_tokens' => 700,
            'output_tokens' => 1000,
            'cost_usd' => 10,
            'metadata' => json_encode(['seed' => 3]),
            'created_at' => $older,
            'updated_at' => $older,
        ]);

        $this->actingAs($admin)
            ->get('/admin')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Index')
                ->where('initialRange', '30d')
                ->where('initialUsage', function ($usage) use ($customer): bool {
                    $list = collect($usage);
                    $this->assertGreaterThanOrEqual(2, $list->count());
                    $entry = $list->firstWhere('userId', $customer->id);
                    $this->assertNotNull($entry, 'Expected customer usage entry to be present.');
                    $this->assertSame($customer->email, $entry['email']);
                    $this->assertSame('active', $entry['subscriptionStatus']);
                    $this->assertSame('pro', $entry['subscriptionPlan']);
                    $this->assertSame('cus_1234', $entry['stripeCustomerId']);
                    $this->assertSame('Handles beta features.', $entry['trialNotes']);
                    $this->assertSame(true, $entry['cancelAtPeriodEnd']);
                    $this->assertSame(2, $entry['totalActions']);
                    $this->assertEqualsWithDelta(1.1, (float) $entry['totalCostUsd'], 0.000001);
                    $this->assertNotNull($entry['lastActionAt']);
                    // Trial end should be serialized ISO string
                    $this->assertNotNull($entry['trialEndsAt']);
                    // Old usage should be excluded from totals
                    $this->assertLessThan(5, abs((new Carbon($entry['lastActionAt']))->diffInDays(Carbon::now())));
                    return true;
                })
                ->where('initialFrom', fn ($from) => $from !== null)
                ->where('initialTo', fn ($to) => $to !== null)
            );
    }

    public function test_admin_can_delete_user_account(): void
    {
        $admin = User::query()->create([
            'id' => (string) Str::uuid(),
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'is_admin' => true,
            'subscription_status' => 'active',
        ]);

        $user = User::query()->create([
            'id' => (string) Str::uuid(),
            'name' => 'Regular User',
            'email' => 'person@example.com',
            'password' => Hash::make('password'),
            'is_admin' => false,
            'subscription_status' => 'trialing',
        ]);

        $projectId = (string) Str::uuid();
        DB::table('content_projects')->insert([
            'id' => $projectId,
            'user_id' => $user->id,
            'title' => 'Sample',
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        DB::table('ai_usage_events')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'project_id' => $projectId,
            'action' => 'posts.generate',
            'model' => 'models/gemini-2.5-pro',
            'input_tokens' => 1000,
            'output_tokens' => 1200,
            'cost_usd' => 1.23,
            'metadata' => json_encode(['test' => true]),
            'created_at' => Carbon::now(),
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/admin/users/{$user->id}")
            ->assertOk()
            ->assertJson(['deleted' => true]);

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('ai_usage_events', ['user_id' => $user->id]);
    }

    public function test_admin_cannot_delete_self_via_admin_api(): void
    {
        $admin = User::query()->create([
            'id' => (string) Str::uuid(),
            'name' => 'Solo Admin',
            'email' => 'solo.admin@example.com',
            'password' => Hash::make('password'),
            'is_admin' => true,
            'subscription_status' => 'active',
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/admin/users/{$admin->id}")
            ->assertStatus(422)
            ->assertJson([
                'code' => 'CANNOT_DELETE_SELF',
            ]);

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }
}
