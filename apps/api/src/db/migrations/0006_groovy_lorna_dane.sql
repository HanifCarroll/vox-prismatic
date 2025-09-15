ALTER TABLE "posts" ADD COLUMN "status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "is_approved";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "is_reviewed";