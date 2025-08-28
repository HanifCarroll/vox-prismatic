-- AlterTable
ALTER TABLE "public"."posts" ADD COLUMN     "queue_job_id" TEXT;

-- CreateIndex
CREATE INDEX "posts_queue_job_id_idx" ON "public"."posts"("queue_job_id");
