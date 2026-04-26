import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  agentStepExecutions,
  claudeAccounts,
  heartbeatRuns,
} from "@paperclipai/db";

/**
 * Phase 6 / D-09, D-10 / PROJ-03 — Cost attribution aggregation per
 * (companyId, accountId).
 *
 * Aggregates `agent_step_executions` cost + token totals via JOIN through
 * `heartbeat_runs.companyId` (multi-tenant scope) and `claude_accounts.label`
 * (display name). The `heartbeat_runs.companyId` predicate is the D-01
 * cross-company isolation invariant — runs of Company B never appear in
 * Company A's aggregate, even though `agent_step_executions` itself has no
 * direct `companyId` column.
 *
 * Note on terminology: 06-CONTEXT D-09 mentions `agent_runs.companyId` — the
 * actual schema is `heartbeat_runs.companyId` (paperclip's run table is named
 * `heartbeat_runs`). No semantic divergence.
 *
 * Consumed by:
 *   - `server/src/routes/claude-accounts.ts` GET /cost-summary endpoint (D-11)
 *   - `ui/src/pages/ClaudeAccounts*.tsx` cost section (D-12, plan 06-04)
 */

export interface CostSummaryRow {
  accountId: string;
  accountLabel: string;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  stepCount: number;
}

export interface CostSummaryRange {
  from?: Date;
  to?: Date;
}

export function claudeAccountCostsService(db: Db) {
  async function aggregateByCompany(
    companyId: string,
    range?: CostSummaryRange,
  ): Promise<CostSummaryRow[]> {
    const conditions = [eq(heartbeatRuns.companyId, companyId)];
    if (range?.from) {
      conditions.push(gte(agentStepExecutions.startedAt, range.from));
    }
    if (range?.to) {
      conditions.push(lte(agentStepExecutions.startedAt, range.to));
    }

    const rows = await db
      .select({
        accountId: agentStepExecutions.accountId,
        accountLabel: claudeAccounts.label,
        totalCostUsd: sql<number>`COALESCE(SUM(${agentStepExecutions.costUsd}), 0)::float8`,
        totalInputTokens: sql<number>`COALESCE(SUM(${agentStepExecutions.inputTokens}), 0)::int`,
        totalOutputTokens: sql<number>`COALESCE(SUM(${agentStepExecutions.outputTokens}), 0)::int`,
        stepCount: sql<number>`COUNT(*)::int`,
      })
      .from(agentStepExecutions)
      .innerJoin(heartbeatRuns, eq(agentStepExecutions.runId, heartbeatRuns.id))
      .innerJoin(
        claudeAccounts,
        eq(agentStepExecutions.accountId, claudeAccounts.id),
      )
      .where(and(...conditions))
      .groupBy(agentStepExecutions.accountId, claudeAccounts.label)
      .orderBy(desc(sql`COALESCE(SUM(${agentStepExecutions.costUsd}), 0)`));

    return rows.map((r) => ({
      accountId: String(r.accountId),
      accountLabel: String(r.accountLabel),
      totalCostUsd: Number(r.totalCostUsd),
      totalInputTokens: Number(r.totalInputTokens),
      totalOutputTokens: Number(r.totalOutputTokens),
      stepCount: Number(r.stepCount),
    }));
  }

  return { aggregateByCompany };
}

export type ClaudeAccountCostsService = ReturnType<typeof claudeAccountCostsService>;
