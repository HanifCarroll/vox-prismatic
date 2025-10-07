<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_projects', function (Blueprint $table) {
            $table->integer('cleaning_chunk_index')->nullable()->after('transcript_cleaned');
            $table->integer('cleaning_chunks_total')->nullable()->after('cleaning_chunk_index');
            $table->longText('transcript_cleaned_partial')->nullable()->after('cleaning_chunks_total');
        });
    }

    public function down(): void
    {
        Schema::table('content_projects', function (Blueprint $table) {
            $table->dropColumn('transcript_cleaned_partial');
            $table->dropColumn('cleaning_chunks_total');
            $table->dropColumn('cleaning_chunk_index');
        });
    }
};

