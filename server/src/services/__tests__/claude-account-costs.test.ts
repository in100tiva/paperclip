import { beforeEach, describe, expect, it, vi } from "vitest";

import { claudeAccountCostsService } from "../claude-account-costs.js";

// ============================================================
// Mock Db builder — chainable Drizzle-like surface
// ============================================================
//
// Phase 6 / 06-02 / PROJ-03 — service is pure aggregation: it builds a Drizzle
// query and maps the resulting rows. Tests assert (a) the predicate chain
// includes the expected scoping (companyId, optional date range) and (b) the
// row mapping coerces sql<number> values to plain numbers.

interface MockDbState {
  selectQueue: any[][]; // FIFO queue of result rows for each .select() call
  capturedWhere: any[]; // captured args from .where()
  capturedFrom: any[]; // captured tables from .from()
  capturedJoins: { type: "innerJoin" | "leftJoin"; table: any; on: any }[];
  capturedGroupBy: any[];
  capturedOrderBy: any[];
}

function makeMockDb(rowsForNextCall: any[] = []): {
  db: any;
  state: MockDbState;
} {
  const state: MockDbState = {
    selectQueue: [rowsForNextCall],
    capturedWhere: [],
    capturedFrom: [],
    capturedJoins: [],
    capturedGroupBy: [],
    capturedOrderBy: [],
  };

  function makeChain() {
    const drain = () => Promise.resolve(state.selectQueue.shift() ?? []);
    const chain: any = {
      from: (table: any) => {
        state.capturedFrom.push(table);
        return chain;
      },
      innerJoin: (table: any, on: any) => {
        state.capturedJoins.push({ type: "innerJoin", table, on });
        return chain;
      },
      leftJoin: (table: any, on: any) => {
        state.capturedJoins.push({ type: "leftJoin", table, on });
        return chain;
      },
      where: (cond: any) => {
        state.capturedWhere.push(cond);
        return chain;
      },
      groupBy: (...cols: any[]) => {
        state.capturedGroupBy.push(cols);
        return chain;
      },
      orderBy: (col: any) => {
        state.capturedOrderBy.push(col);
        return drain();
      },
      then: (resolve: any) => drain().then(resolve),
    };
    return chain;
  }

  const db: any = {
    select: () => ({
      from: (table: any) => {
        state.capturedFrom.push(table);
        return makeChain();
      },
    }),
  };

  return { db, state };
}

describe("claudeAccountCostsService", () => {
  describe("aggregateByCompany", () => {
    it("returns [] when no executions exist for the company (empty pool)", async () => {
      const { db } = makeMockDb([]);
      const svc = claudeAccountCostsService(db);
      const rows = await svc.aggregateByCompany("co-empty");
      expect(rows).toEqual([]);
    });

    it("aggregates 3 steps for one account into a single row with summed totals", async () => {
      // Drizzle returns already-aggregated rows from groupBy; mock supplies the
      // post-aggregation shape directly.
      const mockResult = [
        {
          accountId: "acc-A",
          accountLabel: "Account A",
          totalCostUsd: 0.03,
          totalInputTokens: 300,
          totalOutputTokens: 150,
          stepCount: 3,
        },
      ];
      const { db } = makeMockDb(mockResult);
      const svc = claudeAccountCostsService(db);
      const rows = await svc.aggregateByCompany("co-1");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        accountId: "acc-A",
        accountLabel: "Account A",
        totalCostUsd: 0.03,
        totalInputTokens: 300,
        totalOutputTokens: 150,
        stepCount: 3,
      });
    });

    it("returns one row per account when multiple accounts exist (multi-account isolation)", async () => {
      const mockResult = [
        {
          accountId: "acc-A",
          accountLabel: "Account A",
          totalCostUsd: 0.05,
          totalInputTokens: 500,
          totalOutputTokens: 250,
          stepCount: 2,
        },
        {
          accountId: "acc-B",
          accountLabel: "Account B",
          totalCostUsd: 0.01,
          totalInputTokens: 100,
          totalOutputTokens: 50,
          stepCount: 1,
        },
      ];
      const { db } = makeMockDb(mockResult);
      const svc = claudeAccountCostsService(db);
      const rows = await svc.aggregateByCompany("co-1");
      expect(rows).toHaveLength(2);
      expect(rows[0].accountId).toBe("acc-A");
      expect(rows[0].totalCostUsd).toBe(0.05);
      expect(rows[1].accountId).toBe("acc-B");
      expect(rows[1].totalCostUsd).toBe(0.01);
    });

    it("passes date range filter conditions when from/to are provided", async () => {
      const { db, state } = makeMockDb([]);
      const svc = claudeAccountCostsService(db);
      const from = new Date("2026-04-01T00:00:00Z");
      const to = new Date("2026-04-30T23:59:59Z");
      await svc.aggregateByCompany("co-1", { from, to });
      // .where() should have been called with a combined predicate
      // (companyId + from + to). We assert at least one .where() call captured.
      expect(state.capturedWhere.length).toBeGreaterThanOrEqual(1);
      // The predicate is a Drizzle SQL fragment; smoke-check that the call
      // happened with a non-empty arg.
      expect(state.capturedWhere[0]).toBeDefined();
    });

    it("scopes the query to the requested companyId via heartbeatRuns join (cross-company isolation, D-01)", async () => {
      const { db, state } = makeMockDb([]);
      const svc = claudeAccountCostsService(db);
      await svc.aggregateByCompany("co-A");

      // Cross-company isolation invariant: query MUST include an innerJoin to
      // heartbeatRuns (the source of companyId scoping). Without this join the
      // company predicate has no column to filter on, leaking other companies'
      // costs.
      const innerJoins = state.capturedJoins.filter((j) => j.type === "innerJoin");
      expect(innerJoins.length).toBeGreaterThanOrEqual(2); // heartbeatRuns + claudeAccounts

      // .where() must have been called with a non-empty predicate.
      expect(state.capturedWhere.length).toBeGreaterThanOrEqual(1);
      expect(state.capturedWhere[0]).toBeDefined();
    });

    it("coerces numeric sql<number> outputs to plain numbers (type mapping)", async () => {
      // Postgres can return numerics as strings under certain drivers; the
      // service must coerce. Mock returns string values to verify.
      const mockResult = [
        {
          accountId: "acc-X",
          accountLabel: "X",
          totalCostUsd: "0.42",
          totalInputTokens: "1000",
          totalOutputTokens: "500",
          stepCount: "7",
        },
      ];
      const { db } = makeMockDb(mockResult);
      const svc = claudeAccountCostsService(db);
      const rows = await svc.aggregateByCompany("co-1");
      expect(rows[0].totalCostUsd).toBe(0.42);
      expect(typeof rows[0].totalCostUsd).toBe("number");
      expect(rows[0].totalInputTokens).toBe(1000);
      expect(rows[0].totalOutputTokens).toBe(500);
      expect(rows[0].stepCount).toBe(7);
    });
  });
});
