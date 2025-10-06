<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_preferred_timeslots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->smallInteger('iso_day_of_week');
            $table->integer('minutes_from_midnight');
            $table->boolean('active')->default(true);
            $table->timestampsTz();
            $table->unique(['user_id', 'iso_day_of_week', 'minutes_from_midnight']);
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_preferred_timeslots');
    }
};

