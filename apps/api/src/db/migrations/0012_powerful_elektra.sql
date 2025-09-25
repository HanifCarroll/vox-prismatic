ALTER TABLE "content_projects" ADD COLUMN "processing_progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "content_projects" ADD COLUMN "processing_step" varchar(100);