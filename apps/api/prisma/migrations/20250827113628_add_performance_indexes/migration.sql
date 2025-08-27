-- CreateIndex
CREATE INDEX "insights_status_total_score_idx" ON "public"."insights"("status", "total_score" DESC);

-- CreateIndex
CREATE INDEX "insights_cleaned_transcript_id_status_idx" ON "public"."insights"("cleaned_transcript_id", "status");

-- CreateIndex
CREATE INDEX "insights_category_post_type_idx" ON "public"."insights"("category", "post_type");

-- CreateIndex
CREATE INDEX "insights_status_created_at_idx" ON "public"."insights"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "insights_category_status_total_score_idx" ON "public"."insights"("category", "status", "total_score" DESC);

-- CreateIndex
CREATE INDEX "posts_platform_status_created_at_idx" ON "public"."posts"("platform", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_insight_id_status_idx" ON "public"."posts"("insight_id", "status");

-- CreateIndex
CREATE INDEX "posts_status_created_at_idx" ON "public"."posts"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_platform_status_idx" ON "public"."posts"("platform", "status");

-- CreateIndex
CREATE INDEX "scheduled_posts_status_scheduled_time_idx" ON "public"."scheduled_posts"("status", "scheduled_time");

-- CreateIndex
CREATE INDEX "scheduled_posts_platform_status_idx" ON "public"."scheduled_posts"("platform", "status");

-- CreateIndex
CREATE INDEX "scheduled_posts_scheduled_time_status_idx" ON "public"."scheduled_posts"("scheduled_time", "status");

-- CreateIndex
CREATE INDEX "scheduled_posts_status_created_at_idx" ON "public"."scheduled_posts"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transcripts_status_created_at_idx" ON "public"."transcripts"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transcripts_source_type_status_idx" ON "public"."transcripts"("source_type", "status");
