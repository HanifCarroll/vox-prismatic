<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('invites', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('code')->unique();
            $table->string('email')->nullable();
            $table->unsignedSmallInteger('max_uses')->default(1);
            $table->unsignedSmallInteger('uses')->default(0);
            $table->timestampTz('expires_at')->nullable();
            $table->uuid('created_by');
            $table->string('notes', 500)->nullable();
            $table->timestampTz('last_used_at')->nullable();
            $table->timestampsTz();

            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
            $table->index('email');
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invites');
    }
};
