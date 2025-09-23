-- Lucia auth tables: auth_keys and auth_sessions
CREATE TABLE IF NOT EXISTS "auth_keys" (
    "id" text PRIMARY KEY,
    "user_id" integer NOT NULL,
    "hashed_password" text,
    "primary_key" boolean NOT NULL DEFAULT true,
    "expires_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "auth_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "auth_sessions" (
    "id" text PRIMARY KEY,
    "user_id" integer NOT NULL,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);

