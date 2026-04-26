import { api } from "./client";

/**
 * MULTI-09 (Phase 5) — UI client helpers for the Claude accounts pool.
 *
 * Mirrors the route shapes in `server/src/routes/claude-accounts.ts` and
 * `ClaudeAccountRotatedDetails` from `server/src/services/activity-log.ts`.
 */
export type ClaudeAccountStatus = "live" | "exhausted" | "cooldown" | "disabled";

/** Phase 6 / D-05 / PROJ-02. */
export type ClaudeAccountScope = "company" | "shared";

export interface ClaudeAccount {
  id: string;
  companyId: string;
  ownerUserId: string;
  label: string;
  configDirSlug: string;
  status: ClaudeAccountStatus;
  /** Phase 6 / D-05 / PROJ-02. 'company' (default) | 'shared'. */
  scope: ClaudeAccountScope;
  lastQuotaWindowsJson: Record<
    string,
    { exhaustedUntil: string; lastTriggeredAt: string; count: number }
  >;
  exhaustedUntil: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Phase 6 / D-10 / D-11 / PROJ-03. Aggregated cost row for one Claude account
 * within a company over a date range.
 */
export interface CostSummaryRow {
  accountId: string;
  accountLabel: string;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  stepCount: number;
}

export interface ClaudeAccountRotatedDetails {
  agentId: string;
  fromAccountId: string;
  toAccountId: string;
  reason: "exhausted" | "manual" | "cooldown_expired";
  errorFamily: string | null;
  retryNotBefore: string | null;
  swapStrategy: "resume" | "fallback_full_context" | null;
  rotationId?: string;
  swapStatus?: "succeeded" | "failed";
}

export interface RotationHistoryEntry {
  id: string;
  companyId: string;
  action: "claude_account_rotated";
  entityType: string;
  entityId: string;
  agentId: string | null;
  runId: string | null;
  details: ClaudeAccountRotatedDetails | null;
  createdAt: string;
}

export interface CreateClaudeAccountInput {
  label: string;
  configDirSlug: string;
  /** Phase 6 / D-05 / PROJ-02. Defaults to 'company' server-side when omitted. */
  scope?: ClaudeAccountScope;
}

export interface PatchClaudeAccountInput {
  status?: ClaudeAccountStatus;
  label?: string;
  /** Phase 6 / D-05 / PROJ-02. */
  scope?: ClaudeAccountScope;
}

export const claudeAccountsApi = {
  list: (companyId: string) =>
    api.get<{ accounts: ClaudeAccount[] }>(`/companies/${companyId}/claude-accounts`),
  create: (companyId: string, input: CreateClaudeAccountInput) =>
    api.post<{ account: ClaudeAccount }>(`/companies/${companyId}/claude-accounts`, input),
  patch: (companyId: string, accountId: string, input: PatchClaudeAccountInput) =>
    api.patch<{ account: ClaudeAccount }>(
      `/companies/${companyId}/claude-accounts/${accountId}`,
      input,
    ),
  rotationHistory: (companyId: string, limit = 50) =>
    api.get<{ entries: RotationHistoryEntry[] }>(
      `/companies/${companyId}/claude-accounts/rotation-history?limit=${limit}`,
    ),
  /**
   * Phase 6 / D-10 / D-11 / PROJ-03. Aggregated spend per Claude account for
   * the company. Default range (when both bounds omitted) is server-side
   * "since current month start" aligned with `companies.spentMonthlyCents`
   * reset semantics.
   */
  costSummary: (
    companyId: string,
    range?: { from?: string; to?: string },
  ) => {
    const params = new URLSearchParams();
    if (range?.from) params.set("from", range.from);
    if (range?.to) params.set("to", range.to);
    const qs = params.toString();
    return api.get<{ rows: CostSummaryRow[] }>(
      `/companies/${companyId}/claude-accounts/cost-summary${qs ? `?${qs}` : ""}`,
    );
  },
};
