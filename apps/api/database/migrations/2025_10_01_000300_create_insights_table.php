<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('insights', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->longText('content');
            $table->text('quote')->nullable();
            $table->double('score')->nullable();
            $table->boolean('is_approved')->default(false);
            $table->timestampsTz();

            $table->index(['project_id']);
            $table->foreign('project_id')->references('id')->on('content_projects')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insights');
    }
};

