<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('title');
            $table->text('source_url')->nullable();
            $table->longText('transcript_original')->nullable();
            $table->longText('transcript_cleaned')->nullable();
            $table->string('current_stage')->default('processing');
            $table->integer('processing_progress')->default(0);
            $table->string('processing_step')->nullable();
            $table->timestampsTz();

            $table->index(['user_id']);
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_projects');
    }
};

