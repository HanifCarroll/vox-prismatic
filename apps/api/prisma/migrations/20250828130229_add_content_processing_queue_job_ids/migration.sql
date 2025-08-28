-- AlterTable
ALTER TABLE "public"."insights" ADD COLUMN     "queue_job_id" TEXT;

-- AlterTable
ALTER TABLE "public"."transcripts" ADD COLUMN     "queue_job_id" TEXT;
