-- AlterTable
ALTER TABLE "public"."scheduled_posts" ADD COLUMN     "queue_job_id" TEXT;

-- CreateIndex
CREATE INDEX "scheduled_posts_queue_job_id_idx" ON "public"."scheduled_posts"("queue_job_id");
