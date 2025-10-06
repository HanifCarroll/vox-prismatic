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
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('invite_id')->nullable()->after('id');
            $table->uuid('invited_by')->nullable()->after('invite_id');

            $table->foreign('invite_id')->references('id')->on('invites')->nullOnDelete();
            $table->foreign('invited_by')->references('id')->on('users')->nullOnDelete();

            $table->index('invited_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['invite_id']);
            $table->dropForeign(['invited_by']);
            $table->dropIndex(['invited_by']);

            $table->dropColumn(['invite_id', 'invited_by']);
        });
    }
};
