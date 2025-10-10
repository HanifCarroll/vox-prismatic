<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_project_insight_candidates', function (Blueprint $table): void {
            $table->unsignedInteger('source_start_offset')->nullable()->after('content_hash');
            $table->unsignedInteger('source_end_offset')->nullable()->after('source_start_offset');
        });
    }

    public function down(): void
    {
        Schema::table('content_project_insight_candidates', function (Blueprint $table): void {
            $table->dropColumn(['source_start_offset', 'source_end_offset']);
        });
    }
};
