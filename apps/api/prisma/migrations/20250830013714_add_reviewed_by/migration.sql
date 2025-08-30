-- AlterTable
ALTER TABLE "public"."insights" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_by" TEXT,
ADD COLUMN     "archived_reason" TEXT,
ADD COLUMN     "failed_at" TIMESTAMP(3),
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT;

-- AlterTable
ALTER TABLE "public"."posts" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_reason" TEXT,
ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "failed_at" TIMESTAMP(3),
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejected_by" TEXT,
ADD COLUMN     "rejected_reason" TEXT;

-- AlterTable
ALTER TABLE "public"."processing_jobs" ADD COLUMN     "last_error" JSONB,
ADD COLUMN     "max_retries" INTEGER,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'queued';

-- AlterTable
ALTER TABLE "public"."transcripts" ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "failed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "processing_jobs_status_idx" ON "public"."processing_jobs"("status");

-- CreateIndex
CREATE INDEX "processing_jobs_status_started_at_idx" ON "public"."processing_jobs"("status", "started_at");
