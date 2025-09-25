CREATE TABLE IF NOT EXISTS "ai_usage_events" (
  "id" serial PRIMARY KEY,
  "user_id" integer REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "project_id" integer REFERENCES "public"."content_projects"("id") ON DELETE SET NULL,
  "action" varchar(120) NOT NULL,
  "model" varchar(120) NOT NULL,
  "input_tokens" integer NOT NULL DEFAULT 0,
  "output_tokens" integer NOT NULL DEFAULT 0,
  "cost_usd" numeric(12, 6) NOT NULL DEFAULT 0,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);
