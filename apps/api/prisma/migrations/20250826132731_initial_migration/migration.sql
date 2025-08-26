-- CreateTable
CREATE TABLE "transcripts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "raw_content" TEXT NOT NULL,
    "cleaned_content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'raw',
    "source_type" TEXT,
    "source_url" TEXT,
    "file_name" TEXT,
    "duration" INTEGER,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "file_path" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "insights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cleaned_transcript_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "verbatim_quote" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "post_type" TEXT NOT NULL,
    "urgency_score" INTEGER NOT NULL,
    "relatability_score" INTEGER NOT NULL,
    "specificity_score" INTEGER NOT NULL,
    "authority_score" INTEGER NOT NULL,
    "total_score" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "processing_duration_ms" INTEGER,
    "estimated_tokens" INTEGER,
    "estimated_cost" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "insights_cleaned_transcript_id_fkey" FOREIGN KEY ("cleaned_transcript_id") REFERENCES "transcripts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "insight_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "character_count" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "posts_insight_id_fkey" FOREIGN KEY ("insight_id") REFERENCES "insights" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scheduled_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "post_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "scheduled_time" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt" DATETIME,
    "error_message" TEXT,
    "external_post_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scheduled_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "duration_ms" INTEGER,
    "estimated_tokens" INTEGER,
    "estimated_cost" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "event_data" TEXT,
    "value" REAL,
    "occurred_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "transcripts_status_idx" ON "transcripts"("status");

-- CreateIndex
CREATE INDEX "transcripts_created_at_idx" ON "transcripts"("created_at");

-- CreateIndex
CREATE INDEX "insights_cleaned_transcript_id_idx" ON "insights"("cleaned_transcript_id");

-- CreateIndex
CREATE INDEX "insights_status_idx" ON "insights"("status");

-- CreateIndex
CREATE INDEX "insights_total_score_idx" ON "insights"("total_score");

-- CreateIndex
CREATE INDEX "insights_created_at_idx" ON "insights"("created_at");

-- CreateIndex
CREATE INDEX "posts_insight_id_idx" ON "posts"("insight_id");

-- CreateIndex
CREATE INDEX "posts_platform_idx" ON "posts"("platform");

-- CreateIndex
CREATE INDEX "posts_status_idx" ON "posts"("status");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");

-- CreateIndex
CREATE INDEX "scheduled_posts_post_id_idx" ON "scheduled_posts"("post_id");

-- CreateIndex
CREATE INDEX "scheduled_posts_platform_idx" ON "scheduled_posts"("platform");

-- CreateIndex
CREATE INDEX "scheduled_posts_status_idx" ON "scheduled_posts"("status");

-- CreateIndex
CREATE INDEX "scheduled_posts_scheduled_time_idx" ON "scheduled_posts"("scheduled_time");

-- CreateIndex
CREATE INDEX "scheduled_posts_created_at_idx" ON "scheduled_posts"("created_at");

-- CreateIndex
CREATE INDEX "processing_jobs_job_type_status_idx" ON "processing_jobs"("job_type", "status");

-- CreateIndex
CREATE INDEX "processing_jobs_source_id_idx" ON "processing_jobs"("source_id");

-- CreateIndex
CREATE INDEX "processing_jobs_created_at_idx" ON "processing_jobs"("created_at");

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "settings"("category");

-- CreateIndex
CREATE INDEX "analytics_events_entity_type_entity_id_idx" ON "analytics_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_idx" ON "analytics_events"("event_type");

-- CreateIndex
CREATE INDEX "analytics_events_occurred_at_idx" ON "analytics_events"("occurred_at");
