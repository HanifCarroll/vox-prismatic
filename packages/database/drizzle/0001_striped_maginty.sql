ALTER TABLE `transcripts` RENAME COLUMN "content" TO "raw_content";--> statement-breakpoint
ALTER TABLE `transcripts` ADD `cleaned_content` text;--> statement-breakpoint
ALTER TABLE `transcripts` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `transcripts` ADD `file_name` text;--> statement-breakpoint
ALTER TABLE `transcripts` ADD `duration` integer;--> statement-breakpoint
ALTER TABLE `transcripts` ADD `word_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transcripts` DROP COLUMN `duration_seconds`;