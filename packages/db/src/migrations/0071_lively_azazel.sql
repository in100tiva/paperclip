-- 05-01: multi-account Claude Code pool schemas (MULTI-01, MULTI-02, MULTI-03).
--
-- Drizzle-kit's auto-generated diff also included DDL for tables/columns/indexes
-- created by hand-authored migrations 0062-0070 (drift between drizzle-kit
-- snapshots in `meta/` and hand-written SQL — pre-existing across migrations
-- 0042/0043/0054/0059/0062..0070, see meta gaps). The phantom DDL was removed
-- here so this migration applies cleanly via CI (DB-03). The `meta/0071_snapshot.json`
-- now reflects current schema state correctly; future `pnpm db:generate` runs
-- will diff against it.
--
-- Re-baselining drizzle snapshots against ground-truth DB state is tracked
-- separately as repo hygiene; not in scope for 05-01.

CREATE TABLE "claude_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"owner_user_id" text NOT NULL,
	"label" text NOT NULL,
	"config_dir_slug" text NOT NULL,
	"status" text DEFAULT 'live' NOT NULL,
	"last_quota_windows_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"exhausted_until" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_account_bindings" (
	"agent_id" uuid PRIMARY KEY NOT NULL,
	"active_account_id" uuid,
	"rotation_policy" text DEFAULT 'auto' NOT NULL,
	"last_rotated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_step_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"error_family" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claude_accounts" ADD CONSTRAINT "claude_accounts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_accounts" ADD CONSTRAINT "claude_accounts_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_account_bindings" ADD CONSTRAINT "agent_account_bindings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_account_bindings" ADD CONSTRAINT "agent_account_bindings_active_account_id_claude_accounts_id_fk" FOREIGN KEY ("active_account_id") REFERENCES "public"."claude_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_step_executions" ADD CONSTRAINT "agent_step_executions_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_step_executions" ADD CONSTRAINT "agent_step_executions_account_id_claude_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."claude_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claude_accounts_company_status_idx" ON "claude_accounts" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "claude_accounts_company_exhausted_idx" ON "claude_accounts" USING btree ("company_id","exhausted_until");--> statement-breakpoint
CREATE UNIQUE INDEX "claude_accounts_config_dir_slug_unq" ON "claude_accounts" USING btree ("config_dir_slug");--> statement-breakpoint
CREATE INDEX "agent_step_executions_run_step_idx" ON "agent_step_executions" USING btree ("run_id","step_id");--> statement-breakpoint
CREATE INDEX "agent_step_executions_account_started_idx" ON "agent_step_executions" USING btree ("account_id","started_at");
