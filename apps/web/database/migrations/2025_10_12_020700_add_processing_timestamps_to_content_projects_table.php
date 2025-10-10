<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_projects', function (Blueprint $table): void {
            $table->timestampTz('insights_started_at')->nullable()->after('processing_batch_id');
            $table->timestampTz('insights_completed_at')->nullable()->after('insights_started_at');
            $table->timestampTz('posts_started_at')->nullable()->after('insights_completed_at');
            $table->timestampTz('posts_completed_at')->nullable()->after('posts_started_at');
        });
    }

    public function down(): void
    {
        Schema::table('content_projects', function (Blueprint $table): void {
            $table->dropColumn([
                'insights_started_at',
                'insights_completed_at',
                'posts_started_at',
                'posts_completed_at',
            ]);
        });
    }
};
