ALTER TABLE "users"
  ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL,
  ADD COLUMN "stripe_customer_id" varchar(255),
  ADD COLUMN "stripe_subscription_id" varchar(255),
  ADD COLUMN "subscription_status" varchar(50) DEFAULT 'inactive' NOT NULL,
  ADD COLUMN "subscription_plan" varchar(100) DEFAULT 'pro' NOT NULL,
  ADD COLUMN "subscription_current_period_end" timestamp,
  ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  ADD COLUMN "trial_ends_at" timestamp,
  ADD COLUMN "trial_notes" text;

CREATE INDEX IF NOT EXISTS "users_stripe_customer_id_idx" ON "users" ("stripe_customer_id") WHERE "stripe_customer_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "users_stripe_subscription_id_idx" ON "users" ("stripe_subscription_id") WHERE "stripe_subscription_id" IS NOT NULL;
