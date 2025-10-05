<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add content_hash to insights for dedupe
        if (!Schema::hasColumn('insights', 'content_hash')) {
            Schema::table('insights', function ($table) {
                $table->string('content_hash', 64)->nullable()->after('content');
            });
        }

        // Backfill content_hash using normalized content
        $this->backfillInsightHashes();

        // Add unique index for (project_id, content_hash)
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS insights_project_content_hash_unique ON insights (project_id, content_hash)');

        // Add partial unique to enforce one post per insight per project
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS posts_project_insight_unique ON posts (project_id, insight_id) WHERE insight_id IS NOT NULL');
    }

    public function down(): void
    {
        // Drop unique indices
        DB::statement('DROP INDEX IF EXISTS posts_project_insight_unique');
        DB::statement('DROP INDEX IF EXISTS insights_project_content_hash_unique');

        // Drop content_hash column
        if (Schema::hasColumn('insights', 'content_hash')) {
            Schema::table('insights', function ($table) {
                $table->dropColumn('content_hash');
            });
        }
    }

    private function backfillInsightHashes(): void
    {
        $chunk = 500;
        $lastId = null;
        while (true) {
            $rows = DB::table('insights')
                ->select('id', 'content', 'content_hash')
                ->when($lastId, fn($q) => $q->where('id', '>', $lastId))
                ->orderBy('id')
                ->limit($chunk)
                ->get();
            if ($rows->isEmpty()) {
                break;
            }
            foreach ($rows as $row) {
                $lastId = $row->id;
                $hash = $row->content_hash;
                if ($hash) {
                    continue;
                }
                $norm = $this->normalize((string) $row->content);
                $digest = hash('sha256', $norm);
                DB::table('insights')->where('id', $row->id)->update(['content_hash' => $digest]);
            }
        }
    }

    private function normalize(string $text): string
    {
        $trim = trim($text);
        return preg_replace('/\s+/u', ' ', $trim) ?? '';
    }
};

