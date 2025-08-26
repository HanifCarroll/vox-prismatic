-- CreateTable
CREATE TABLE "public"."transcripts" (
    "id" TEXT NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."insights" (
    "id" TEXT NOT NULL,
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
    "estimated_cost" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."posts" (
    "id" TEXT NOT NULL,
    "insight_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "character_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scheduled_posts" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "scheduled_time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt" TIMESTAMP(3),
    "error_message" TEXT,
    "external_post_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."processing_jobs" (
    "id" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TEXT,
    "completed_at" TEXT,
    "duration_ms" INTEGER,
    "estimated_tokens" INTEGER,
    "estimated_cost" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."analytics_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "event_data" TEXT,
    "value" DOUBLE PRECISION,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transcripts_status_idx" ON "public"."transcripts"("status");

-- CreateIndex
CREATE INDEX "transcripts_created_at_idx" ON "public"."transcripts"("created_at");

-- CreateIndex
CREATE INDEX "insights_cleaned_transcript_id_idx" ON "public"."insights"("cleaned_transcript_id");

-- CreateIndex
CREATE INDEX "insights_status_idx" ON "public"."insights"("status");

-- CreateIndex
CREATE INDEX "insights_total_score_idx" ON "public"."insights"("total_score");

-- CreateIndex
CREATE INDEX "insights_created_at_idx" ON "public"."insights"("created_at");

-- CreateIndex
CREATE INDEX "posts_insight_id_idx" ON "public"."posts"("insight_id");

-- CreateIndex
CREATE INDEX "posts_platform_idx" ON "public"."posts"("platform");

-- CreateIndex
CREATE INDEX "posts_status_idx" ON "public"."posts"("status");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "public"."posts"("created_at");

-- CreateIndex
CREATE INDEX "scheduled_posts_post_id_idx" ON "public"."scheduled_posts"("post_id");

-- CreateIndex
CREATE INDEX "scheduled_posts_platform_idx" ON "public"."scheduled_posts"("platform");

-- CreateIndex
CREATE INDEX "scheduled_posts_status_idx" ON "public"."scheduled_posts"("status");

-- CreateIndex
CREATE INDEX "scheduled_posts_scheduled_time_idx" ON "public"."scheduled_posts"("scheduled_time");

-- CreateIndex
CREATE INDEX "scheduled_posts_created_at_idx" ON "public"."scheduled_posts"("created_at");

-- CreateIndex
CREATE INDEX "processing_jobs_job_type_status_idx" ON "public"."processing_jobs"("job_type", "status");

-- CreateIndex
CREATE INDEX "processing_jobs_source_id_idx" ON "public"."processing_jobs"("source_id");

-- CreateIndex
CREATE INDEX "processing_jobs_created_at_idx" ON "public"."processing_jobs"("created_at");

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "public"."settings"("category");

-- CreateIndex
CREATE INDEX "analytics_events_entity_type_entity_id_idx" ON "public"."analytics_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_idx" ON "public"."analytics_events"("event_type");

-- CreateIndex
CREATE INDEX "analytics_events_occurred_at_idx" ON "public"."analytics_events"("occurred_at");

-- AddForeignKey
ALTER TABLE "public"."insights" ADD CONSTRAINT "insights_cleaned_transcript_id_fkey" FOREIGN KEY ("cleaned_transcript_id") REFERENCES "public"."transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_insight_id_fkey" FOREIGN KEY ("insight_id") REFERENCES "public"."insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scheduled_posts" ADD CONSTRAINT "scheduled_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
