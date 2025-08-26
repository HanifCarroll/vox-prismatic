CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`event_data` text,
	`value` real,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_entity` ON `analytics_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_analytics_event_type` ON `analytics_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_analytics_occurred_at` ON `analytics_events` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `insights` (
	`id` text PRIMARY KEY NOT NULL,
	`cleaned_transcript_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`verbatim_quote` text NOT NULL,
	`category` text NOT NULL,
	`post_type` text NOT NULL,
	`urgency_score` integer NOT NULL,
	`relatability_score` integer NOT NULL,
	`specificity_score` integer NOT NULL,
	`authority_score` integer NOT NULL,
	`total_score` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`processing_duration_ms` integer,
	`estimated_tokens` integer,
	`estimated_cost` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`cleaned_transcript_id`) REFERENCES `transcripts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_insights_cleaned_transcript_id` ON `insights` (`cleaned_transcript_id`);--> statement-breakpoint
CREATE INDEX `idx_insights_status` ON `insights` (`status`);--> statement-breakpoint
CREATE INDEX `idx_insights_total_score` ON `insights` (`total_score`);--> statement-breakpoint
CREATE INDEX `idx_insights_created_at` ON `insights` (`created_at`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`insight_id` text NOT NULL,
	`title` text NOT NULL,
	`platform` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`character_count` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`insight_id`) REFERENCES `insights`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_posts_insight_id` ON `posts` (`insight_id`);--> statement-breakpoint
CREATE INDEX `idx_posts_platform` ON `posts` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_posts_status` ON `posts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_posts_created_at` ON `posts` (`created_at`);--> statement-breakpoint
CREATE TABLE `processing_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_type` text NOT NULL,
	`source_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` integer DEFAULT 0,
	`result_count` integer DEFAULT 0,
	`error_message` text,
	`started_at` text,
	`completed_at` text,
	`duration_ms` integer,
	`estimated_tokens` integer,
	`estimated_cost` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_type_status` ON `processing_jobs` (`job_type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_jobs_source_id` ON `processing_jobs` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_jobs_created_at` ON `processing_jobs` (`created_at`);--> statement-breakpoint
CREATE TABLE `scheduled_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`platform` text NOT NULL,
	`content` text NOT NULL,
	`scheduled_time` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`retry_count` integer DEFAULT 0,
	`last_attempt` text,
	`error_message` text,
	`external_post_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_scheduled_posts_post_id` ON `scheduled_posts` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_posts_platform` ON `scheduled_posts` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_posts_status` ON `scheduled_posts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_posts_scheduled_time` ON `scheduled_posts` (`scheduled_time`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_posts_created_at` ON `scheduled_posts` (`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_settings_category` ON `settings` (`category`);--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`raw_content` text NOT NULL,
	`cleaned_content` text,
	`status` text DEFAULT 'raw' NOT NULL,
	`source_type` text,
	`source_url` text,
	`file_name` text,
	`duration` integer,
	`word_count` integer DEFAULT 0 NOT NULL,
	`file_path` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_transcripts_status` ON `transcripts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_transcripts_created_at` ON `transcripts` (`created_at`);