ALTER TABLE "content_projects"
  ADD COLUMN IF NOT EXISTS "transcript_original" text,
  ADD COLUMN IF NOT EXISTS "transcript_cleaned" text;

-- Backfill from existing transcript where present
UPDATE "content_projects"
SET "transcript_original" = COALESCE("transcript_original", "transcript"),
    "transcript_cleaned" = COALESCE("transcript_cleaned", "transcript")
WHERE "transcript" IS NOT NULL;

