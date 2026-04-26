import { pgTable, uuid, text, timestamp, integer, real, index } from "drizzle-orm/pg-core";
import { claudeAccounts } from "./claude_accounts.js";
import { heartbeatRuns } from "./heartbeat_runs.js";

/**
 * `agent_step_executions` — append-only attribution de cada step de heartbeat
 * para conta + custo + erro (D-05 / MULTI-03).
 *
 * **Append-only:** cada step é uma linha imutável; sem campo de mutação
 * pós-INSERT. Schema-level imposição: ausência do campo de modificação.
 * Service-level: rota de UPDATE não existe em
 * `claudeAccountsService.recordStepExecution`.
 *
 * Permite responder:
 * - "Quanto a conta A consumiu nas últimas 24h?" via `(accountId, startedAt)`
 *   index → input para Phase 6 cost attribution per-account.
 * - "Onde aconteceu o swap dentro deste run?" via `(runId, stepId)` index →
 *   detecta sequências `accountId=A,A,A,B,B` que marcam rotação.
 *
 * `runId` referencia `heartbeat_runs.id` (uuid) em vez de string opaca para
 * integridade referencial. `stepId` é text — definido pelo orchestrator do
 * heartbeat (pode ser timestamp, sequencial, ou nome de etapa). `errorFamily`
 * é nullable: sucesso = null; valores possíveis (de execute.ts): 'transient_upstream'
 * (candidato a swap), 'auth', 'cli_missing', 'crash', etc.
 */
export const agentStepExecutions = pgTable(
  "agent_step_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => heartbeatRuns.id),
    stepId: text("step_id").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => claudeAccounts.id),
    inputTokens: integer("input_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: real("cost_usd").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorFamily: text("error_family"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    runStepIdx: index("agent_step_executions_run_step_idx").on(table.runId, table.stepId),
    accountStartedIdx: index("agent_step_executions_account_started_idx").on(
      table.accountId,
      table.startedAt,
    ),
  }),
);
