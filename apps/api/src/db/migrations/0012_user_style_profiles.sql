CREATE TABLE IF NOT EXISTS "user_style_profiles" (
  "user_id" integer PRIMARY KEY REFERENCES "public"."users"("id") ON DELETE cascade,
  "style" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

