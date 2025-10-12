<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->jsonb('review_scores')->nullable();
            $table->jsonb('review_suggestions')->nullable();
            $table->timestampTz('reviewed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->dropColumn(['review_scores', 'review_suggestions', 'reviewed_at']);
        });
    }
};
