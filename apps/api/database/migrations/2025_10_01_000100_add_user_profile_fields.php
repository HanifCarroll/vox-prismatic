<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false);
            $table->text('linkedin_token')->nullable();
            $table->text('linkedin_id')->nullable();
            $table->timestampTz('linkedin_connected_at')->nullable();
            $table->text('stripe_customer_id')->nullable();
            $table->text('stripe_subscription_id')->nullable();
            $table->text('subscription_status')->default('inactive');
            $table->text('subscription_plan')->default('pro');
            $table->timestampTz('subscription_current_period_end')->nullable();
            $table->boolean('cancel_at_period_end')->default(false);
            $table->timestampTz('trial_ends_at')->nullable();
            $table->text('trial_notes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'is_admin','linkedin_token','linkedin_id','linkedin_connected_at','stripe_customer_id','stripe_subscription_id',
                'subscription_status','subscription_plan','subscription_current_period_end','cancel_at_period_end','trial_ends_at','trial_notes'
            ]);
        });
    }
};

