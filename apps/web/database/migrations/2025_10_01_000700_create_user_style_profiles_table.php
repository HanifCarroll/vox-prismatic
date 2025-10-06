<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_style_profiles', function (Blueprint $table) {
            $table->uuid('user_id')->primary();
            $table->jsonb('style')->default(DB::raw("'{}'::jsonb"));
            $table->timestampsTz();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_style_profiles');
    }
};

