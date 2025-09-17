ALTER TABLE "posts" ADD COLUMN "scheduled_at" timestamp;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "schedule_status" varchar(20);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "schedule_error" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "schedule_attempted_at" timestamp;
