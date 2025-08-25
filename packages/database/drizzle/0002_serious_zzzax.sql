ALTER TABLE `posts` ADD `content` text NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `hook`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `body`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `soft_cta`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `direct_cta`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `full_content`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `estimated_engagement_score`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `hashtags`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `mentions`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `processing_duration_ms`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `estimated_tokens`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `estimated_cost`;