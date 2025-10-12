<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            if (Schema::hasColumn('posts', 'review_scores')) {
                $table->dropColumn('review_scores');
            }

            if (Schema::hasColumn('posts', 'review_suggestions')) {
                $table->dropColumn('review_suggestions');
            }

            if (Schema::hasColumn('posts', 'reviewed_at')) {
                $table->dropColumn('reviewed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            if (! Schema::hasColumn('posts', 'review_scores')) {
                $table->jsonb('review_scores')->nullable();
            }

            if (! Schema::hasColumn('posts', 'review_suggestions')) {
                $table->jsonb('review_suggestions')->nullable();
            }

            if (! Schema::hasColumn('posts', 'reviewed_at')) {
                $table->timestampTz('reviewed_at')->nullable();
            }
        });
    }
};
