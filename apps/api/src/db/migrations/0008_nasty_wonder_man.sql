CREATE TABLE "user_preferred_timeslots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"iso_day_of_week" smallint NOT NULL,
	"minutes_from_midnight" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_schedule_preferences" (
	"user_id" integer NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"lead_time_minutes" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferred_timeslots" ADD CONSTRAINT "user_preferred_timeslots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_schedule_preferences" ADD CONSTRAINT "user_schedule_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferred_timeslots_unique_idx" ON "user_preferred_timeslots" USING btree ("user_id","iso_day_of_week","minutes_from_midnight");--> statement-breakpoint
CREATE UNIQUE INDEX "user_schedule_preferences_user_id_unique_idx" ON "user_schedule_preferences" USING btree ("user_id");