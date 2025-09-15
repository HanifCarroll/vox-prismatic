ALTER TABLE "content_projects" ADD COLUMN "tone_preset" varchar(50);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique_idx" ON "users" USING btree (lower("email"));