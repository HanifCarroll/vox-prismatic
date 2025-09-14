ALTER TABLE "content_projects" ADD COLUMN "transcript_original" text;--> statement-breakpoint
ALTER TABLE "content_projects" ADD COLUMN "transcript_cleaned" text;--> statement-breakpoint
ALTER TABLE "content_projects" DROP COLUMN "transcript";