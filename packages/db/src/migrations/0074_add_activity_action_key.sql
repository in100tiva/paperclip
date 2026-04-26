ALTER TABLE "activity_log" ADD COLUMN "action_key" text;--> statement-breakpoint
ALTER TABLE "activity_log" ADD COLUMN "params_json" jsonb;