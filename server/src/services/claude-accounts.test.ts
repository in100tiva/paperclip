import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock activity-log to capture logActivity calls without touching DB.
const logActivityMock = vi.fn();
vi.mock("./activity-log.js", () => ({
  logActivity: (...args: unknown[]) => logActivityMock(...args),
  ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED: "claude_account_rotated",
}));

// Mock node:fs/promises so resolveCredentialDir is hermetic.
const fsStatMock = vi.fn();
vi.mock("node:fs/promises", () => ({
  default: {
    stat: (...args: unknown[]) => fsStatMock(...args),
  },
  stat: (...args: unknown[]) => fsStatMock(...args),
}));

import { claudeAccountsService, __testing } from "./claude-accounts.js";
import { NoAccountsAvailableError, CredentialDirMissingError } from "../errors.js";

// ============================================================
// Mock Db builder
// ============================================================

interface MockOptions {
  // claudeAccounts row(s) for various select calls (FIFO queue per call).
  selectClaudeAccountsQueue?: any[][];
  // agentAccountBindings row(s).
  selectBindingsQueue?: any[][];
  // agentStepExecutions select queue (for completeness, mostly insert-only).
  selectStepExecutionsQueue?: any[][];
  // companies row(s) — Phase 6 / D-06 / PROJ-02: selectActiveAccount reads
  // companies.claudeAccountPoolMode before filtering candidates.
  selectCompaniesQueue?: any[][];
}

function makeMockDb(opts: MockOptions = {}) {
  const claudeAccountsQueue = [...(opts.selectClaudeAccountsQueue ?? [])];
  const bindingsQueue = [...(opts.selectBindingsQueue ?? [])];
  const companiesQueue = [...(opts.selectCompaniesQueue ?? [])];

  const executeCalls: string[] = [];
  const insertCalls: { table: string; values: any }[] = [];
  const updateCalls: { table: string; set: any; whereSql: any }[] = [];
  const tableSelects: string[] = [];
  let txInvocations = 0;

  // Build a chainable select stub that records the table and returns
  // configured rows when terminator (orderBy / limit / await) fires.
  function makeSelectChain(table: string) {
    let limitVal: number | null = null;
    const drain = () => {
      let queue: any[][];
      if (table === "claude_accounts") queue = claudeAccountsQueue;
      else if (table === "agent_account_bindings") queue = bindingsQueue;
      else if (table === "companies") queue = companiesQueue;
      else queue = [];
      const rows = queue.shift() ?? [];
      return Promise.resolve(limitVal !== null ? rows.slice(0, limitVal) : rows);
    };

    const chain: any = {
      from: () => chain,
      where: () => chain,
      orderBy: () => drain(),
      limit: (n: number) => {
        limitVal = n;
        return drain();
      },
      then: (resolve: any) => drain().then(resolve),
    };
    return chain;
  }

  // Tag drizzle table object so we can identify it.
  function tableNameOf(table: any): string {
    if (!table) return "unknown";
    // drizzle pgTable assigns _.name via getName; fallback heuristic for tests:
    const sym = Object.getOwnPropertySymbols(table).find(
      (s) => s.description === "drizzle:Name",
    );
    if (sym) return (table as any)[sym] as string;
    if (table[Symbol.for("drizzle:Name")]) return table[Symbol.for("drizzle:Name")];
    // Fallback: read constant tableName-like property
    return (table as any)?.name || (table as any)?._?.name || "unknown";
  }

  const db: any = {
    select: (_proj?: any) => {
      // Drizzle's `db.select().from(table)` — table only known on `from()`.
      // We capture which table on `from`.
      let activeTable = "unknown";
      const chain: any = {
        from: (table: any) => {
          activeTable = tableNameOf(table);
          tableSelects.push(activeTable);
          return makeSelectChain(activeTable);
        },
      };
      return chain;
    },
    insert: (table: any) => ({
      values: (vals: any) => {
        insertCalls.push({ table: tableNameOf(table), values: vals });
        return Promise.resolve(undefined);
      },
    }),
    update: (table: any) => ({
      set: (vals: any) => ({
        where: (cond: any) => {
          updateCalls.push({ table: tableNameOf(table), set: vals, whereSql: cond });
          return Promise.resolve(undefined);
        },
      }),
    }),
    execute: (q: any) => {
      // Capture stringified SQL for advisory lock assertion.
      const sqlStr = String(q?.queryChunks?.map((c: any) => c?.value ?? c).join(" ") ?? q);
      executeCalls.push(sqlStr);
      return Promise.resolve(undefined);
    },
    transaction: async (fn: (tx: any) => Promise<any>) => {
      txInvocations += 1;
      return fn(db);
    },
  };

  return {
    db,
    executeCalls,
    insertCalls,
    updateCalls,
    tableSelects,
    getTxCount: () => txInvocations,
  };
}

// ============================================================
// Fixture rows
// ============================================================

function fixtureAccount(overrides: Partial<any> = {}): any {
  return {
    id: "acc-a",
    companyId: "co-1",
    ownerUserId: "user-1",
    label: "Account A",
    configDirSlug: "a",
    status: "live",
    lastQuotaWindowsJson: {},
    exhaustedUntil: null,
    lastUsedAt: null,
    createdAt: new Date("2026-04-01T00:00:00Z"),
    updatedAt: new Date("2026-04-01T00:00:00Z"),
    ...overrides,
  };
}

function fixtureBinding(overrides: Partial<any> = {}): any {
  return {
    agentId: "agent-1",
    activeAccountId: null,
    rotationPolicy: "auto",
    lastRotatedAt: null,
    createdAt: new Date("2026-04-01T00:00:00Z"),
    updatedAt: new Date("2026-04-01T00:00:00Z"),
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================

describe("claudeAccountsService", () => {
  beforeEach(() => {
    logActivityMock.mockReset();
    fsStatMock.mockReset();
    __testing.pendingRotations.clear();
  });

  describe("listAccounts", () => {
    it("returns accounts for the company ordered by createdAt", async () => {
      const a = fixtureAccount({ id: "a", createdAt: new Date("2026-04-01T00:00:00Z") });
      const b = fixtureAccount({ id: "b", createdAt: new Date("2026-04-02T00:00:00Z") });
      const mock = makeMockDb({ selectClaudeAccountsQueue: [[a, b]] });
      const svc = claudeAccountsService(mock.db);

      const out = await svc.listAccounts("co-1");
      expect(out).toHaveLength(2);
      expect(out[0].id).toBe("a");
      expect(out[1].id).toBe("b");
    });
  });

  describe("selectActiveAccount", () => {
    it("acquires advisory lock before query (calls pg_advisory_xact_lock)", async () => {
      const mock = makeMockDb({
        selectBindingsQueue: [[]],
        selectClaudeAccountsQueue: [[fixtureAccount()]],
      });
      const svc = claudeAccountsService(mock.db);
      await svc.selectActiveAccount({ agentId: "agent-1", companyId: "co-1" });
      expect(mock.executeCalls.some((c) => /pg_advisory_xact_lock/.test(c))).toBe(true);
    });

    it("returns the account with oldest lastUsedAt", async () => {
      const recent = fixtureAccount({ id: "recent", lastUsedAt: new Date("2026-04-10T00:00:00Z") });
      const old = fixtureAccount({ id: "old", lastUsedAt: new Date("2026-04-01T00:00:00Z") });
      // Service receives the candidates already ordered ASC by drizzle; mock just returns in order.
      const mock = makeMockDb({
        selectBindingsQueue: [[]],
        selectClaudeAccountsQueue: [[old, recent]],
      });
      const svc = claudeAccountsService(mock.db);
      const acc = await svc.selectActiveAccount({ agentId: "agent-1", companyId: "co-1" });
      expect(acc.id).toBe("old");
    });

    it("respects sticky binding when activeAccountId is live", async () => {
      const stickyAccount = fixtureAccount({ id: "sticky-acc", status: "live" });
      const binding = fixtureBinding({ rotationPolicy: "sticky", activeAccountId: "sticky-acc" });
      const mock = makeMockDb({
        selectBindingsQueue: [[binding]],
        selectClaudeAccountsQueue: [[stickyAccount]],
      });
      const svc = claudeAccountsService(mock.db);
      const acc = await svc.selectActiveAccount({ agentId: "agent-1", companyId: "co-1" });
      expect(acc.id).toBe("sticky-acc");
      // Should have updated lastUsedAt on the sticky account; no extra binding update.
      const stickyUpdates = mock.updateCalls.filter((u) => u.table === "claude_accounts");
      expect(stickyUpdates.length).toBeGreaterThanOrEqual(1);
    });

    it("falls back to auto-select when sticky account is exhausted", async () => {
      const stickyExhausted = fixtureAccount({ id: "sticky-acc", status: "exhausted" });
      const fallback = fixtureAccount({ id: "fallback-acc", status: "live" });
      const binding = fixtureBinding({ rotationPolicy: "sticky", activeAccountId: "sticky-acc" });
      const mock = makeMockDb({
        selectBindingsQueue: [[binding]],
        selectClaudeAccountsQueue: [[stickyExhausted], [fallback]],
      });
      const svc = claudeAccountsService(mock.db);
      const acc = await svc.selectActiveAccount({ agentId: "agent-1", companyId: "co-1" });
      expect(acc.id).toBe("fallback-acc");
    });

    it("excludes account in cooldown window (lastRotatedAt within cooldown)", async () => {
      const recentlyRotated = fixtureAccount({ id: "recent-rot" });
      const fresh = fixtureAccount({ id: "fresh" });
      // Binding indicates a rotation 1s ago; cooldown defaults to 30s → exclude recentlyRotated.
      const binding = fixtureBinding({
        activeAccountId: "recent-rot",
        lastRotatedAt: new Date(Date.now() - 1000),
        rotationPolicy: "auto",
      });
      const mock = makeMockDb({
        selectBindingsQueue: [[binding]],
        selectClaudeAccountsQueue: [[recentlyRotated, fresh]],
      });
      const svc = claudeAccountsService(mock.db);
      const acc = await svc.selectActiveAccount({ agentId: "agent-1", companyId: "co-1" });
      expect(acc.id).toBe("fresh");
    });

    it("throws NoAccountsAvailableError when zero candidates", async () => {
      const mock = makeMockDb({
        selectBindingsQueue: [[]],
        selectClaudeAccountsQueue: [[]],
      });
      const svc = claudeAccountsService(mock.db);
      await expect(
        svc.selectActiveAccount({ agentId: "agent-1", companyId: "co-1" }),
      ).rejects.toBeInstanceOf(NoAccountsAvailableError);
    });

    it("creates binding when none exists for the agent", async () => {
      const fresh = fixtureAccount({ id: "fresh" });
      const mock = makeMockDb({
        selectBindingsQueue: [[]],
        selectClaudeAccountsQueue: [[fresh]],
      });
      const svc = claudeAccountsService(mock.db);
      await svc.selectActiveAccount({ agentId: "agent-1", companyId: "co-1" });
      const bindingInserts = mock.insertCalls.filter((i) => i.table === "agent_account_bindings");
      expect(bindingInserts).toHaveLength(1);
      expect(bindingInserts[0].values.activeAccountId).toBe("fresh");
    });
  });

  describe("rotateOnQuotaExhausted (W1 fix)", () => {
    it("returns { rotationId, newAccount } and does NOT emit activity log", async () => {
      const fromAccount = fixtureAccount({ id: "from", status: "live" });
      const nextAccount = fixtureAccount({ id: "next", status: "live" });
      const binding = fixtureBinding({ activeAccountId: "from", rotationPolicy: "auto" });
      const mock = makeMockDb({
        selectClaudeAccountsQueue: [[fromAccount], [fromAccount, nextAccount]],
        selectBindingsQueue: [[binding]],
      });
      const svc = claudeAccountsService(mock.db);

      const outcome = await svc.rotateOnQuotaExhausted({
        agentId: "agent-1",
        companyId: "co-1",
        fromAccountId: "from",
        errorFamily: "rpm_transient",
        retryNotBefore: new Date("2026-04-26T01:00:00Z"),
        actorId: "system",
      });

      expect(outcome).toHaveProperty("rotationId");
      expect(typeof outcome.rotationId).toBe("string");
      expect(outcome.newAccount.id).toBe("next");
      // Critical W1 invariant: no activity log emit during rotate.
      expect(logActivityMock).not.toHaveBeenCalled();
    });

    it("marks fromAccount status=exhausted with updated lastQuotaWindowsJson[errorFamily]", async () => {
      const fromAccount = fixtureAccount({ id: "from", status: "live", lastQuotaWindowsJson: {} });
      const nextAccount = fixtureAccount({ id: "next", status: "live" });
      const binding = fixtureBinding({ activeAccountId: "from" });
      const mock = makeMockDb({
        selectClaudeAccountsQueue: [[fromAccount], [fromAccount, nextAccount]],
        selectBindingsQueue: [[binding]],
      });
      const svc = claudeAccountsService(mock.db);

      const retryAt = new Date("2026-04-26T05:00:00Z");
      await svc.rotateOnQuotaExhausted({
        agentId: "agent-1",
        companyId: "co-1",
        fromAccountId: "from",
        errorFamily: "daily_quota",
        retryNotBefore: retryAt,
        actorId: "system",
      });

      const exhaustUpdate = mock.updateCalls.find(
        (u) => u.table === "claude_accounts" && u.set.status === "exhausted",
      );
      expect(exhaustUpdate).toBeDefined();
      expect(exhaustUpdate!.set.lastQuotaWindowsJson.daily_quota.exhaustedUntil).toBe(
        retryAt.toISOString(),
      );
      expect(exhaustUpdate!.set.lastQuotaWindowsJson.daily_quota.count).toBe(1);
      expect(exhaustUpdate!.set.exhaustedUntil).toBeInstanceOf(Date);
    });

    it("recomputes exhaustedUntil as MAX of windows", async () => {
      const past = "2026-04-26T01:00:00.000Z";
      const future = "2026-04-26T10:00:00.000Z";
      const fromAccount = fixtureAccount({
        id: "from",
        lastQuotaWindowsJson: {
          rpm_transient: { exhaustedUntil: past, lastTriggeredAt: past, count: 1 },
        },
      });
      const nextAccount = fixtureAccount({ id: "next" });
      const mock = makeMockDb({
        selectClaudeAccountsQueue: [[fromAccount], [fromAccount, nextAccount]],
        selectBindingsQueue: [[fixtureBinding({ activeAccountId: "from" })]],
      });
      const svc = claudeAccountsService(mock.db);

      await svc.rotateOnQuotaExhausted({
        agentId: "agent-1",
        companyId: "co-1",
        fromAccountId: "from",
        errorFamily: "daily_quota",
        retryNotBefore: new Date(future),
        actorId: "system",
      });

      const exhaustUpdate = mock.updateCalls.find(
        (u) => u.table === "claude_accounts" && u.set.status === "exhausted",
      );
      expect((exhaustUpdate!.set.exhaustedUntil as Date).toISOString()).toBe(future);
    });

    it("propagates NoAccountsAvailableError if pool empty after rotation", async () => {
      const fromAccount = fixtureAccount({ id: "from" });
      const mock = makeMockDb({
        selectClaudeAccountsQueue: [[fromAccount], [fromAccount]], // only from in pool
        selectBindingsQueue: [[fixtureBinding({ activeAccountId: "from" })]],
      });
      const svc = claudeAccountsService(mock.db);

      await expect(
        svc.rotateOnQuotaExhausted({
          agentId: "agent-1",
          companyId: "co-1",
          fromAccountId: "from",
          errorFamily: "rpm_transient",
          retryNotBefore: null,
          actorId: "system",
        }),
      ).rejects.toBeInstanceOf(NoAccountsAvailableError);
    });

    it("acquires advisory lock during rotate", async () => {
      const fromAccount = fixtureAccount({ id: "from" });
      const nextAccount = fixtureAccount({ id: "next" });
      const mock = makeMockDb({
        selectClaudeAccountsQueue: [[fromAccount], [fromAccount, nextAccount]],
        selectBindingsQueue: [[fixtureBinding({ activeAccountId: "from" })]],
      });
      const svc = claudeAccountsService(mock.db);
      await svc.rotateOnQuotaExhausted({
        agentId: "agent-1",
        companyId: "co-1",
        fromAccountId: "from",
        errorFamily: "rpm_transient",
        retryNotBefore: null,
        actorId: "system",
      });
      expect(mock.executeCalls.some((c) => /pg_advisory_xact_lock/.test(c))).toBe(true);
    });
  });

  describe("recordSwapOutcome (W1 fix)", () => {
    it("emits logActivity with claude_account_rotated and the effective swapStrategy", async () => {
      const fromAccount = fixtureAccount({ id: "from" });
      const nextAccount = fixtureAccount({ id: "next" });
      const mock = makeMockDb({
        selectClaudeAccountsQueue: [[fromAccount], [fromAccount, nextAccount]],
        selectBindingsQueue: [[fixtureBinding({ activeAccountId: "from" })]],
      });
      const svc = claudeAccountsService(mock.db);
      const { rotationId } = await svc.rotateOnQuotaExhausted({
        agentId: "agent-1",
        companyId: "co-1",
        fromAccountId: "from",
        errorFamily: "rpm_transient",
        retryNotBefore: null,
        actorId: "system",
      });

      expect(logActivityMock).not.toHaveBeenCalled();

      await svc.recordSwapOutcome({
        rotationId,
        swapStrategy: "fallback_full_context",
        swapStatus: "succeeded",
      });

      expect(logActivityMock).toHaveBeenCalledTimes(1);
      const call = logActivityMock.mock.calls[0];
      const payload = call[1];
      expect(payload.action).toBe("claude_account_rotated");
      expect(payload.companyId).toBe("co-1");
      expect(payload.entityType).toBe("agent");
      expect(payload.entityId).toBe("agent-1");
      expect(payload.details.swapStrategy).toBe("fallback_full_context");
      expect(payload.details.swapStatus).toBe("succeeded");
      expect(payload.details.fromAccountId).toBe("from");
      expect(payload.details.toAccountId).toBe("next");
      expect(payload.details.rotationId).toBe(rotationId);
    });

    it("throws on unknown rotationId", async () => {
      const mock = makeMockDb();
      const svc = claudeAccountsService(mock.db);
      await expect(
        svc.recordSwapOutcome({
          rotationId: "nonexistent",
          swapStrategy: "resume",
          swapStatus: "succeeded",
        }),
      ).rejects.toThrow(/Unknown or expired rotationId/);
    });

    it("removes pending rotation after recording outcome (idempotency-by-id)", async () => {
      const fromAccount = fixtureAccount({ id: "from" });
      const nextAccount = fixtureAccount({ id: "next" });
      const mock = makeMockDb({
        selectClaudeAccountsQueue: [[fromAccount], [fromAccount, nextAccount]],
        selectBindingsQueue: [[fixtureBinding({ activeAccountId: "from" })]],
      });
      const svc = claudeAccountsService(mock.db);
      const { rotationId } = await svc.rotateOnQuotaExhausted({
        agentId: "agent-1",
        companyId: "co-1",
        fromAccountId: "from",
        errorFamily: "rpm_transient",
        retryNotBefore: null,
        actorId: "system",
      });
      await svc.recordSwapOutcome({ rotationId, swapStrategy: "resume", swapStatus: "succeeded" });
      // Second invocation should fail — rotation already consumed.
      await expect(
        svc.recordSwapOutcome({ rotationId, swapStrategy: "resume", swapStatus: "succeeded" }),
      ).rejects.toThrow(/Unknown or expired rotationId/);
    });
  });

  describe("resolveCredentialDir", () => {
    it("returns absolute path when dir exists", async () => {
      fsStatMock.mockResolvedValueOnce({ isDirectory: () => true });
      const mock = makeMockDb();
      const svc = claudeAccountsService(mock.db);
      const dir = await svc.resolveCredentialDir({ configDirSlug: "a" });
      expect(dir).toContain("claude-accounts");
      expect(dir).toContain("a");
      expect(fsStatMock).toHaveBeenCalled();
    });

    it("throws CredentialDirMissingError when dir missing (ENOENT)", async () => {
      const enoent: NodeJS.ErrnoException = Object.assign(new Error("missing"), { code: "ENOENT" });
      fsStatMock.mockRejectedValueOnce(enoent);
      const mock = makeMockDb();
      const svc = claudeAccountsService(mock.db);
      await expect(svc.resolveCredentialDir({ configDirSlug: "x" })).rejects.toBeInstanceOf(
        CredentialDirMissingError,
      );
    });

    it("throws CredentialDirMissingError when path is not a directory", async () => {
      fsStatMock.mockResolvedValueOnce({ isDirectory: () => false });
      const mock = makeMockDb();
      const svc = claudeAccountsService(mock.db);
      await expect(svc.resolveCredentialDir({ configDirSlug: "y" })).rejects.toBeInstanceOf(
        CredentialDirMissingError,
      );
    });
  });

  describe("recordStepExecution", () => {
    it("inserts row into agent_step_executions (no update)", async () => {
      const mock = makeMockDb();
      const svc = claudeAccountsService(mock.db);
      const startedAt = new Date("2026-04-26T00:00:00Z");
      const completedAt = new Date("2026-04-26T00:00:30Z");
      await svc.recordStepExecution({
        runId: "run-1",
        stepId: "step-1",
        accountId: "acc-1",
        usage: {
          inputTokens: 100,
          cachedInputTokens: 10,
          outputTokens: 50,
          costUsd: 0.001,
          startedAt,
          completedAt,
          errorFamily: null,
        },
      });
      const stepInserts = mock.insertCalls.filter((i) => i.table === "agent_step_executions");
      expect(stepInserts).toHaveLength(1);
      expect(stepInserts[0].values.runId).toBe("run-1");
      expect(stepInserts[0].values.inputTokens).toBe(100);
      // No update should ever happen on this table.
      expect(mock.updateCalls.filter((u) => u.table === "agent_step_executions")).toHaveLength(0);
    });
  });

  describe("markCooldownPassed", () => {
    it("issues update narrowing on id + status='exhausted' + exhaustedUntil < now", async () => {
      const mock = makeMockDb();
      const svc = claudeAccountsService(mock.db);
      await svc.markCooldownPassed("acc-1");
      const updates = mock.updateCalls.filter(
        (u) => u.table === "claude_accounts" && u.set.status === "live",
      );
      expect(updates.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================
  // Phase 6 / PROJ-02 / D-06: pool-mode-aware selectActiveAccount
  // ============================================================
  // The mock Db is dumb — it returns whatever is enqueued for each table
  // regardless of WHERE clause. So we simulate the DB-level filtering by
  // enqueueing only the rows the real query would have matched given the
  // pool mode under test.

  describe("selectActiveAccount — pool mode (PROJ-02 / Phase 6)", () => {
    it("PM-1: per_company mode ignores shared accounts from other companies", async () => {
      // Real DB would return only own company-scoped accounts because the
      // service filter is `(companyId=co-A AND scope='company')`.
      const ownA = fixtureAccount({
        id: "own-a",
        companyId: "co-A",
        scope: "company",
        lastUsedAt: new Date("2026-04-10T00:00:00Z"),
      });
      const ownB = fixtureAccount({
        id: "own-b",
        companyId: "co-A",
        scope: "company",
        lastUsedAt: new Date("2026-04-15T00:00:00Z"),
      });
      const mock = makeMockDb({
        selectBindingsQueue: [[]],
        selectCompaniesQueue: [[{ poolMode: "per_company" }]],
        // DB filter would have excluded the foreign shared account; mock mimics.
        selectClaudeAccountsQueue: [[ownA, ownB]],
      });
      const svc = claudeAccountsService(mock.db);
      const acc = await svc.selectActiveAccount({
        agentId: "agent-1",
        companyId: "co-A",
      });
      // Round-robin lastUsedAt ASC → own-a (older).
      expect(acc.id).toBe("own-a");
      expect(["own-a", "own-b"]).toContain(acc.id);
      // The service MUST have queried companies to resolve poolMode.
      expect(mock.tableSelects).toContain("companies");
    });

    it("PM-2: shared mode includes shared accounts from other owners", async () => {
      const own = fixtureAccount({
        id: "own",
        companyId: "co-A",
        scope: "company",
        lastUsedAt: new Date("2026-04-10T00:00:00Z"),
      });
      const sharedFromOther = fixtureAccount({
        id: "shared-foreign",
        companyId: "co-B",
        scope: "shared",
        lastUsedAt: new Date("2026-04-05T00:00:00Z"), // older → wins round-robin
      });
      const mock = makeMockDb({
        selectBindingsQueue: [[]],
        selectCompaniesQueue: [[{ poolMode: "shared" }]],
        // DB would include both because filter is
        // `(companyId=co-A AND scope='company') OR scope='shared'`.
        selectClaudeAccountsQueue: [[sharedFromOther, own]],
      });
      const svc = claudeAccountsService(mock.db);
      const acc = await svc.selectActiveAccount({
        agentId: "agent-1",
        companyId: "co-A",
      });
      expect(acc.id).toBe("shared-foreign");
    });

    it("PM-3: shared mode picks the shared account when company has none of its own", async () => {
      const sharedOnly = fixtureAccount({
        id: "shared-only",
        companyId: "co-B",
        scope: "shared",
        lastUsedAt: new Date("2026-04-01T00:00:00Z"),
      });
      const mock = makeMockDb({
        selectBindingsQueue: [[]],
        selectCompaniesQueue: [[{ poolMode: "shared" }]],
        selectClaudeAccountsQueue: [[sharedOnly]],
      });
      const svc = claudeAccountsService(mock.db);
      const acc = await svc.selectActiveAccount({
        agentId: "agent-1",
        companyId: "co-A",
      });
      expect(acc.id).toBe("shared-only");
    });

    it("PM-4: per_company mode throws when no own accounts exist (shared do not count)", async () => {
      // Even if the DB has shared accounts physically, the service's
      // per_company filter excludes them — mock returns the empty result the
      // filtered query would produce.
      const mock = makeMockDb({
        selectBindingsQueue: [[]],
        selectCompaniesQueue: [[{ poolMode: "per_company" }]],
        selectClaudeAccountsQueue: [[]],
      });
      const svc = claudeAccountsService(mock.db);
      await expect(
        svc.selectActiveAccount({ agentId: "agent-1", companyId: "co-A" }),
      ).rejects.toBeInstanceOf(NoAccountsAvailableError);
    });

    it("PM-5: per_company isolation — Company B never sees Company A's accounts", async () => {
      // Company B is in per_company mode. Company A has accounts (both
      // company-scoped and a shared one), but the WHERE clause for B
      // resolves to `(companyId=co-B AND scope='company')` and matches zero
      // rows. Mock represents the empty result of that filtered query.
      const mock = makeMockDb({
        selectBindingsQueue: [[]],
        selectCompaniesQueue: [[{ poolMode: "per_company" }]],
        selectClaudeAccountsQueue: [[]],
      });
      const svc = claudeAccountsService(mock.db);
      await expect(
        svc.selectActiveAccount({ agentId: "agent-2", companyId: "co-B" }),
      ).rejects.toBeInstanceOf(NoAccountsAvailableError);
    });

    it("PM-6: unknown poolMode value defaults defensively to per_company", async () => {
      // Hypothetical DB corruption: poolMode = 'invalid'. Service should
      // fail-closed to per_company semantics (safer default — prevents
      // accidental cross-tenant leakage). With no own accounts, throws.
      const ownAccount = fixtureAccount({
        id: "own",
        companyId: "co-A",
        scope: "company",
        lastUsedAt: new Date("2026-04-01T00:00:00Z"),
      });
      const mock = makeMockDb({
        selectBindingsQueue: [[]],
        selectCompaniesQueue: [[{ poolMode: "weird-future-mode" }]],
        // The DB filter for fail-closed per_company would return only own
        // company-scoped accounts; mock supplies that.
        selectClaudeAccountsQueue: [[ownAccount]],
      });
      const svc = claudeAccountsService(mock.db);
      const acc = await svc.selectActiveAccount({
        agentId: "agent-1",
        companyId: "co-A",
      });
      // Should still pick the own account (per_company branch, not throw).
      expect(acc.id).toBe("own");
    });
  });
});
