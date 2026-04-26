import { api } from "./client";

/**
 * MULTI-09 (Phase 5) — UI client helpers for the Claude accounts pool.
 *
 * Mirrors the route shapes in `server/src/routes/claude-accounts.ts` and
 * `ClaudeAccountRotatedDetails` from `server/src/services/activity-log.ts`.
 */
export type ClaudeAccountStatus = "live" | "exhausted" | "cooldown" | "disabled";

export interface ClaudeAccount {
  id: string;
  companyId: string;
  ownerUserId: string;
  label: string;
  configDirSlug: string;
  status: ClaudeAccountStatus;
  lastQuotaWindowsJson: Record<
    string,
    { exhaustedUntil: string; lastTriggeredAt: string; count: number }
  >;
  exhaustedUntil: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
}

export interface PatchClaudeAccountInput {
  status?: ClaudeAccountStatus;
  label?: string;
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
};
