-- CreateTable
CREATE TABLE "public"."pipelines" (
    "id" TEXT NOT NULL,
    "transcript_id" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'idle',
    "current_step" TEXT,
    "total_steps" INTEGER NOT NULL DEFAULT 0,
    "completed_steps" INTEGER NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "template" TEXT NOT NULL DEFAULT 'standard',
    "options" JSONB,
    "insight_ids" TEXT[],
    "post_ids" TEXT[],
    "failed_steps" JSONB,
    "successful_steps" JSONB,
    "blocking_items" JSONB,
    "metadata" JSONB,
    "estimated_duration_ms" INTEGER,
    "actual_duration_ms" INTEGER,
    "started_at" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipelines_transcript_id_idx" ON "public"."pipelines"("transcript_id");

-- CreateIndex
CREATE INDEX "pipelines_state_idx" ON "public"."pipelines"("state");

-- CreateIndex
CREATE INDEX "pipelines_template_idx" ON "public"."pipelines"("template");

-- CreateIndex
CREATE INDEX "pipelines_created_at_idx" ON "public"."pipelines"("created_at");

-- CreateIndex
CREATE INDEX "pipelines_state_created_at_idx" ON "public"."pipelines"("state", "created_at" DESC);
