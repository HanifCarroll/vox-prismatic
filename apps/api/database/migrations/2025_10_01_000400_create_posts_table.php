<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->uuid('insight_id')->nullable();
            $table->longText('content');
            // hashtags text[] (Postgres array)
            $table->text('platform')->default('LinkedIn');
            $table->text('status')->default('pending');
            $table->timestampTz('published_at')->nullable();
            $table->timestampTz('scheduled_at')->nullable();
            $table->text('schedule_status')->nullable();
            $table->text('schedule_error')->nullable();
            $table->timestampTz('schedule_attempted_at')->nullable();
            $table->timestampsTz();

            $table->index(['project_id']);
            $table->foreign('project_id')->references('id')->on('content_projects')->onDelete('cascade');
            $table->foreign('insight_id')->references('id')->on('insights')->onDelete('set null');
        });

        // Add text[] column for hashtags
        DB::statement("ALTER TABLE posts ADD COLUMN hashtags text[] NOT NULL DEFAULT '{}'::text[]");
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};

