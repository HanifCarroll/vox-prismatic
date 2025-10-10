<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_processing_metrics', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->string('stage');
            $table->unsignedInteger('duration_ms');
            $table->timestampsTz();

            $table->index(['stage', 'created_at']);
            $table->index('project_id');
        });

        Schema::create('project_processing_stats', function (Blueprint $table): void {
            $table->string('stage')->primary();
            $table->unsignedBigInteger('sample_count');
            $table->unsignedBigInteger('total_duration_ms');
            $table->unsignedInteger('average_duration_ms');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_processing_stats');
        Schema::dropIfExists('project_processing_metrics');
    }
};
