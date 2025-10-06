<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_schedule_preferences', function (Blueprint $table) {
            $table->uuid('user_id')->primary();
            $table->text('timezone');
            $table->integer('lead_time_minutes')->default(30);
            $table->timestampsTz();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_schedule_preferences');
    }
};

