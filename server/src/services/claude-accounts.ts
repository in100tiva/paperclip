import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  claudeAccounts,
  agentAccountBindings,
  agentStepExecutions,
  companies,
} from "@paperclipai/db";
import {
  logActivity,
  ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED,
  type ClaudeAccountRotatedDetails,
} from "./activity-log.js";
import { NoAccountsAvailableError, CredentialDirMissingError } from "../errors.js";

// ============================================================
// Types — D-09 / FINDINGS Finding 3 (lastQuotaWindowsJson schema)
// ============================================================

export type ClaudeAccountStatus = "live" | "exhausted" | "cooldown" | "disabled";

export type ClaudeQuotaSubType =
  | "rpm_transient"
  | "tpm_transient"
  | "daily_quota"
  | "weekly_quota"
  | "session_5h"
  | "org_tier";

export interface QuotaWindowEntry {
  exhaustedUntil: string; // ISO timestamp
  lastTriggeredAt: string; // ISO timestamp
  count: number;
}

export type QuotaWindowsMap = Partial<Record<ClaudeQuotaSubType, QuotaWindowEntry>>;

export interface ClaudeAccount {
  id: string;
  companyId: string;
  ownerUserId: string;
  label: string;
  configDirSlug: string;
  status: ClaudeAccountStatus;
  /**
   * Phase 6 / D-05 / PROJ-02. 'company' = exclusiva da companyId (semântica
   * Fase 5 — default). 'shared' = qualquer company com
   * `companies.claudeAccountPoolMode='shared'` pode usá-la.
   */
  scope: "company" | "shared";
  lastQuotaWindowsJson: QuotaWindowsMap;
  exhaustedUntil: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordStepUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  costUsd: number;
  startedAt: Date;
  completedAt: Date | null;
  errorFamily: string | null;
}

/**
 * MULTI-04 (Phase 5) — W1 fix: rotateOnQuotaExhausted returns this shape so
 * the heartbeat (Phase 5 plan 06) can hold the rotationId across Strategy A
 * (--resume) → Strategy B (full-context fallback) and only emit the activity
 * log AFTER the swap actually settles, via recordSwapOutcome. This keeps D-32
 * observability accurate (the swapStrategy field reflects what truly worked).
 */
export interface RotationOutcome {
  rotationId: string;
  newAccount: ClaudeAccount;
}

function cooldownSeconds(): number {
  const raw = process.env.CLAUDE_ACCOUNT_COOLDOWN_SECONDS;
  const parsed = raw ? Number.parseInt(raw, 10) : 30;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30;
}

// ============================================================
// In-memory rotation registry — W1 fix
// ============================================================
// rotateOnQuotaExhausted records pending rotations here keyed by rotationId.
// recordSwapOutcome consumes them to emit the activity log with the effective
// swapStrategy. Entries auto-expire after 10 min as a safety valve in case the
// caller never confirms (process restart between rotate and outcome).

interface PendingRotation {
  agentId: string;
  companyId: string;
  fromAccountId: string;
  toAccountId: string;
  errorFamily: ClaudeQuotaSubType;
  retryNotBefore: Date | null;
  reason: ClaudeAccountRotatedDetails["reason"];
  actorId: string;
  createdAtMs: number;
}

const PENDING_ROTATION_TTL_MS = 10 * 60 * 1000;
const pendingRotations = new Map<string, PendingRotation>();

function gcPendingRotations(now: number): void {
  for (const [id, entry] of pendingRotations) {
    if (now - entry.createdAtMs > PENDING_ROTATION_TTL_MS) {
      pendingRotations.delete(id);
    }
  }
}

// Exposed for tests: snapshot internal state.
export const __testing = {
  pendingRotations,
  gcPendingRotations,
};

// ============================================================
// Service factory
// ============================================================

export function claudeAccountsService(db: Db) {
  async function withAgentLock<T>(agentId: string, fn: () => Promise<T>): Promise<T> {
    return db.transaction(async (_tx) => {
      // pg_advisory_xact_lock requires int8; hashtextextended produces bigint
      // deterministically (D-09 + agent-start-lock pattern reference).
      await db.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${agentId}, 0))`,
      );
      return fn();
    });
  }

  async function listAccounts(companyId: string): Promise<ClaudeAccount[]> {
    const rows = await db
      .select()
      .from(claudeAccounts)
      .where(eq(claudeAccounts.companyId, companyId))
      .orderBy(asc(claudeAccounts.createdAt));
    return rows.map(rowToAccount);
  }

  async function selectActiveAccount(input: {
    agentId: string;
    companyId: string;
  }): Promise<ClaudeAccount> {
    return withAgentLock(input.agentId, async () => {
      const now = new Date();
      const cooldown = cooldownSeconds();

      // Step 1: check binding for sticky/manual policy
      const bindingRows = await db
        .select()
        .from(agentAccountBindings)
        .where(eq(agentAccountBindings.agentId, input.agentId))
        .limit(1);
      const binding = bindingRows[0] ?? null;

      if (
        binding &&
        (binding.rotationPolicy === "sticky" || binding.rotationPolicy === "manual") &&
        binding.activeAccountId
      ) {
        const accRows = await db
          .select()
          .from(claudeAccounts)
          .where(eq(claudeAccounts.id, binding.activeAccountId))
          .limit(1);
        const acc = accRows[0];
        if (acc && acc.status === "live") {
          await db
            .update(claudeAccounts)
            .set({ lastUsedAt: now, updatedAt: now })
            .where(eq(claudeAccounts.id, acc.id));
          return rowToAccount({ ...acc, lastUsedAt: now });
        }
        // sticky/manual but the pinned account isn't live → fall back to auto-select
      }

      // Step 2a: resolve pool mode for this company (Phase 6 / D-06 / PROJ-02).
      // Reads `companies.claudeAccountPoolMode`; unknown values fail-closed to
      // 'per_company' to prevent accidental cross-tenant leakage.
      const companyRows = await db
        .select({ poolMode: companies.claudeAccountPoolMode })
        .from(companies)
        .where(eq(companies.id, input.companyId))
        .limit(1);
      const rawMode = companyRows[0]?.poolMode ?? "per_company";
      const poolMode: "per_company" | "shared" =
        rawMode === "shared" ? "shared" : "per_company";

      // Step 2b: lazy cooldown sweep — exhausted accounts whose window has passed.
      // Sweep stays scoped to own companyId (per Phase 5 semantics): for shared
      // accounts owned by other companies, the candidates query below already
      // covers the case via `lt(exhaustedUntil, now)` — sweep is an
      // optimization, not a correctness gate.
      await sweepCooldown(input.companyId, now);

      // Step 3: query candidates with pool-mode-aware scope filter (D-06).
      const cooldownThreshold = new Date(now.getTime() - cooldown * 1000);
      const scopeFilter =
        poolMode === "shared"
          ? or(
              and(
                eq(claudeAccounts.companyId, input.companyId),
                eq(claudeAccounts.scope, "company"),
              ),
              eq(claudeAccounts.scope, "shared"),
            )
          : and(
              eq(claudeAccounts.companyId, input.companyId),
              eq(claudeAccounts.scope, "company"),
            );

      const candidates = await db
        .select()
        .from(claudeAccounts)
        .where(
          and(
            scopeFilter,
            eq(claudeAccounts.status, "live"),
            or(
              isNull(claudeAccounts.exhaustedUntil),
              lt(claudeAccounts.exhaustedUntil, now),
            ),
          ),
        )
        .orderBy(asc(claudeAccounts.lastUsedAt));

      // Filter by binding cooldown — exclude the just-rotated account if still cooling.
      const eligible =
        binding && binding.lastRotatedAt && binding.lastRotatedAt > cooldownThreshold
          ? candidates.filter((c) => c.id !== binding.activeAccountId)
          : candidates;

      if (eligible.length === 0) {
        throw new NoAccountsAvailableError(input.companyId, input.agentId);
      }

      const chosen = eligible[0];

      // Step 4: update lastUsedAt
      await db
        .update(claudeAccounts)
        .set({ lastUsedAt: now, updatedAt: now })
        .where(eq(claudeAccounts.id, chosen.id));

      // Step 5: ensure binding exists / points at chosen
      if (!binding) {
        await db.insert(agentAccountBindings).values({
          agentId: input.agentId,
          activeAccountId: chosen.id,
          rotationPolicy: "auto",
        });
      } else if (binding.activeAccountId !== chosen.id) {
        await db
          .update(agentAccountBindings)
          .set({ activeAccountId: chosen.id, updatedAt: now })
          .where(eq(agentAccountBindings.agentId, input.agentId));
      }

      return rowToAccount({ ...chosen, lastUsedAt: now });
    });
  }

  async function rotateOnQuotaExhausted(input: {
    agentId: string;
    companyId: string;
    fromAccountId: string;
    errorFamily: ClaudeQuotaSubType;
    retryNotBefore: Date | null;
    actorId: string;
    reason?: ClaudeAccountRotatedDetails["reason"];
  }): Promise<RotationOutcome> {
    return withAgentLock(input.agentId, async () => {
      const now = new Date();

      // Step 1: load fromAccount, update its windows
      const fromRows = await db
        .select()
        .from(claudeAccounts)
        .where(eq(claudeAccounts.id, input.fromAccountId))
        .limit(1);
      const from = fromRows[0];
      if (!from) {
        throw new Error(`fromAccountId ${input.fromAccountId} not found`);
      }

      const windows: QuotaWindowsMap = (from.lastQuotaWindowsJson as QuotaWindowsMap) ?? {};
      const previous = windows[input.errorFamily];
      const exhaustedUntilDate =
        input.retryNotBefore ?? defaultExhaustionFallback(input.errorFamily, now);
      windows[input.errorFamily] = {
        exhaustedUntil: exhaustedUntilDate.toISOString(),
        lastTriggeredAt: now.toISOString(),
        count: (previous?.count ?? 0) + 1,
      };

      const cachedExhaustedUntil = computeMaxExhaustion(windows);

      await db
        .update(claudeAccounts)
        .set({
          status: "exhausted",
          lastQuotaWindowsJson: windows,
          exhaustedUntil: cachedExhaustedUntil,
          updatedAt: now,
        })
        .where(eq(claudeAccounts.id, input.fromAccountId));

      // Step 2: pick next eligible account (cannot be from)
      const candidates = await db
        .select()
        .from(claudeAccounts)
        .where(
          and(
            eq(claudeAccounts.companyId, input.companyId),
            eq(claudeAccounts.status, "live"),
            or(
              isNull(claudeAccounts.exhaustedUntil),
              lt(claudeAccounts.exhaustedUntil, now),
            ),
          ),
        )
        .orderBy(asc(claudeAccounts.lastUsedAt));
      const eligible = candidates.filter((c) => c.id !== input.fromAccountId);
      if (eligible.length === 0) {
        throw new NoAccountsAvailableError(input.companyId, input.agentId);
      }
      const next = eligible[0];

      // Step 3: update binding (upsert-like — create row if missing)
      const bindingRows = await db
        .select()
        .from(agentAccountBindings)
        .where(eq(agentAccountBindings.agentId, input.agentId))
        .limit(1);
      if (bindingRows[0]) {
        await db
          .update(agentAccountBindings)
          .set({
            activeAccountId: next.id,
            lastRotatedAt: now,
            updatedAt: now,
          })
          .where(eq(agentAccountBindings.agentId, input.agentId));
      } else {
        await db.insert(agentAccountBindings).values({
          agentId: input.agentId,
          activeAccountId: next.id,
          rotationPolicy: "auto",
          lastRotatedAt: now,
        });
      }

      await db
        .update(claudeAccounts)
        .set({ lastUsedAt: now, updatedAt: now })
        .where(eq(claudeAccounts.id, next.id));

      // Step 4: register pending rotation — heartbeat will call recordSwapOutcome
      // once Strategy A (--resume) or Strategy B (full-context) finishes.
      const rotationId = randomUUID();
      gcPendingRotations(now.getTime());
      pendingRotations.set(rotationId, {
        agentId: input.agentId,
        companyId: input.companyId,
        fromAccountId: input.fromAccountId,
        toAccountId: next.id,
        errorFamily: input.errorFamily,
        retryNotBefore: input.retryNotBefore,
        reason: input.reason ?? "exhausted",
        actorId: input.actorId,
        createdAtMs: now.getTime(),
      });

      // NOTE: we deliberately do NOT emit the activity log here (W1 fix).
      // recordSwapOutcome emits it with the effective swapStrategy.

      return {
        rotationId,
        newAccount: rowToAccount({ ...next, lastUsedAt: now }),
      };
    });
  }

  async function recordSwapOutcome(input: {
    rotationId: string;
    swapStrategy: "resume" | "fallback_full_context" | null;
    swapStatus: "succeeded" | "failed";
  }): Promise<void> {
    const pending = pendingRotations.get(input.rotationId);
    if (!pending) {
      // Caller passed a stale or unknown rotationId — surface clearly.
      throw new Error(`Unknown or expired rotationId: ${input.rotationId}`);
    }

    const details: ClaudeAccountRotatedDetails = {
      agentId: pending.agentId,
      fromAccountId: pending.fromAccountId,
      toAccountId: pending.toAccountId,
      reason: pending.reason,
      errorFamily: pending.errorFamily,
      retryNotBefore: pending.retryNotBefore?.toISOString() ?? null,
      swapStrategy: input.swapStrategy,
    };

    await logActivity(db, {
      companyId: pending.companyId,
      actorType: "system",
      actorId: pending.actorId,
      action: ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED,
      entityType: "agent",
      entityId: pending.agentId,
      agentId: pending.agentId,
      details: {
        ...(details as unknown as Record<string, unknown>),
        rotationId: input.rotationId,
        swapStatus: input.swapStatus,
      },
    });

    pendingRotations.delete(input.rotationId);
  }

  async function resolveCredentialDir(account: { configDirSlug: string }): Promise<string> {
    const dir = path.join(os.homedir(), ".paperclip", "claude-accounts", account.configDirSlug);
    try {
      const stat = await fs.stat(dir);
      if (!stat.isDirectory()) {
        throw new CredentialDirMissingError(account.configDirSlug, dir);
      }
    } catch (err) {
      if (err instanceof CredentialDirMissingError) throw err;
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new CredentialDirMissingError(account.configDirSlug, dir);
      }
      throw err;
    }
    return dir;
  }

  async function recordStepExecution(input: {
    runId: string;
    stepId: string;
    accountId: string;
    usage: RecordStepUsage;
  }): Promise<void> {
    await db.insert(agentStepExecutions).values({
      runId: input.runId,
      stepId: input.stepId,
      accountId: input.accountId,
      inputTokens: input.usage.inputTokens,
      cachedInputTokens: input.usage.cachedInputTokens,
      outputTokens: input.usage.outputTokens,
      costUsd: input.usage.costUsd,
      startedAt: input.usage.startedAt,
      completedAt: input.usage.completedAt,
      errorFamily: input.usage.errorFamily,
    });
  }

  async function markCooldownPassed(accountId: string): Promise<void> {
    const now = new Date();
    await db
      .update(claudeAccounts)
      .set({ status: "live", updatedAt: now })
      .where(
        and(
          eq(claudeAccounts.id, accountId),
          eq(claudeAccounts.status, "exhausted"),
          lt(claudeAccounts.exhaustedUntil, now),
        ),
      );
  }

  async function sweepCooldown(companyId: string, now: Date): Promise<void> {
    // Lazy: any company account whose exhaustedUntil has passed flips back to live.
    await db
      .update(claudeAccounts)
      .set({ status: "live", updatedAt: now })
      .where(
        and(
          eq(claudeAccounts.companyId, companyId),
          eq(claudeAccounts.status, "exhausted"),
          lt(claudeAccounts.exhaustedUntil, now),
        ),
      );
  }

  return {
    listAccounts,
    selectActiveAccount,
    rotateOnQuotaExhausted,
    recordSwapOutcome,
    resolveCredentialDir,
    recordStepExecution,
    markCooldownPassed,
  };
}

// ============================================================
// Helpers
// ============================================================

function rowToAccount(row: typeof claudeAccounts.$inferSelect): ClaudeAccount {
  // D-08 fallback: rows pre-Phase 6 default to 'company' if scope is missing.
  const rawScope = (row as { scope?: string }).scope ?? "company";
  const scope: "company" | "shared" = rawScope === "shared" ? "shared" : "company";
  return {
    id: row.id,
    companyId: row.companyId,
    ownerUserId: row.ownerUserId,
    label: row.label,
    configDirSlug: row.configDirSlug,
    status: row.status as ClaudeAccountStatus,
    scope,
    lastQuotaWindowsJson: (row.lastQuotaWindowsJson as QuotaWindowsMap) ?? {},
    exhaustedUntil: row.exhaustedUntil,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function computeMaxExhaustion(windows: QuotaWindowsMap): Date | null {
  const dates = Object.values(windows)
    .map((w) => (w?.exhaustedUntil ? new Date(w.exhaustedUntil) : null))
    .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function defaultExhaustionFallback(type: ClaudeQuotaSubType, now: Date): Date {
  // Per DECISION-DETECTION-STRATEGY.md: org_tier without retry-after → 5min fallback.
  // Other types: conservative defaults aligned with typical Claude windows.
  const minutesByType: Record<ClaudeQuotaSubType, number> = {
    rpm_transient: 1,
    tpm_transient: 1,
    daily_quota: 60 * 24,
    weekly_quota: 60 * 24 * 7,
    session_5h: 60 * 5,
    org_tier: 5,
  };
  const minutes = minutesByType[type];
  return new Date(now.getTime() + minutes * 60 * 1000);
}
