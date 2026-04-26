import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// Mocks — claudeAccountCostsService + claudeAccountsService
// ============================================================
//
// 06-02 / D-11 — route test isolates the HTTP contract from the DB layer by
// mocking the service factory. We assert: status code, body shape, query
// param parsing (Date conversion, validation), permission gating via
// assertCompanyAccess.

const mockAggregateByCompany = vi.hoisted(() => vi.fn());
const mockListAccounts = vi.hoisted(() => vi.fn());
const mockSelectActive = vi.hoisted(() => vi.fn());
const mockRotate = vi.hoisted(() => vi.fn());
const mockRecordOutcome = vi.hoisted(() => vi.fn());
const mockResolveDir = vi.hoisted(() => vi.fn());
const mockRecordStep = vi.hoisted(() => vi.fn());
const mockMarkCooldown = vi.hoisted(() => vi.fn());

vi.mock("../services/claude-account-costs.js", () => ({
  claudeAccountCostsService: () => ({
    aggregateByCompany: mockAggregateByCompany,
  }),
}));

vi.mock("../services/claude-accounts.js", () => ({
  claudeAccountsService: () => ({
    listAccounts: mockListAccounts,
    selectActiveAccount: mockSelectActive,
    rotateOnQuotaExhausted: mockRotate,
    recordSwapOutcome: mockRecordOutcome,
    resolveCredentialDir: mockResolveDir,
    recordStepExecution: mockRecordStep,
    markCooldownPassed: mockMarkCooldown,
  }),
}));

async function createApp(
  actor: Record<string, unknown> = {
    type: "board",
    userId: "user-1",
    companyIds: ["company-1"],
    source: "session",
    isInstanceAdmin: false,
    memberships: [
      { companyId: "company-1", status: "active", membershipRole: "operator" },
    ],
  },
) {
  vi.resetModules();
  const [{ errorHandler }, { claudeAccountsRoutes }] = await Promise.all([
    import("../middleware/index.js") as Promise<typeof import("../middleware/index.js")>,
    import("../routes/claude-accounts.js") as Promise<typeof import("../routes/claude-accounts.js")>,
  ]);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      ...actor,
      companyIds: Array.isArray(actor.companyIds) ? [...actor.companyIds] : actor.companyIds,
    };
    next();
  });
  app.use("/api", claudeAccountsRoutes({} as any));
  app.use(errorHandler);
  return app;
}

async function requestApp(
  app: express.Express,
  buildRequest: (baseUrl: string) => request.Test,
) {
  const { createServer } = await vi.importActual<typeof import("node:http")>("node:http");
  const server = createServer(app);
  try {
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected HTTP server to listen on a TCP port");
    }
    return await buildRequest(`http://127.0.0.1:${address.port}`);
  } finally {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }
}

describe.sequential("claude account costs route", () => {
  beforeEach(() => {
    mockAggregateByCompany.mockReset();
    mockListAccounts.mockReset();
    mockSelectActive.mockReset();
    mockRotate.mockReset();
    mockRecordOutcome.mockReset();
    mockResolveDir.mockReset();
    mockRecordStep.mockReset();
    mockMarkCooldown.mockReset();
  });

  it("Test A: returns 200 with aggregated rows for an authenticated company member", async () => {
    const fakeRows = [
      {
        accountId: "acc-1",
        accountLabel: "Account 1",
        totalCostUsd: 1.23,
        totalInputTokens: 1000,
        totalOutputTokens: 500,
        stepCount: 4,
      },
    ];
    mockAggregateByCompany.mockResolvedValue(fakeRows);
    const app = await createApp();
    const res = await requestApp(app, (base) =>
      request(base).get("/api/companies/company-1/claude-accounts/cost-summary"),
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rows: fakeRows });
    expect(mockAggregateByCompany).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({ from: undefined, to: undefined }),
    );
  });

  it("Test B: rejects requests from users without company access (403)", async () => {
    const app = await createApp({
      type: "board",
      userId: "user-x",
      companyIds: ["company-other"], // not company-1
      source: "session",
      isInstanceAdmin: false,
      memberships: [],
    });
    const res = await requestApp(app, (base) =>
      request(base).get("/api/companies/company-1/claude-accounts/cost-summary"),
    );
    expect(res.status).toBe(403);
    expect(mockAggregateByCompany).not.toHaveBeenCalled();
  });

  it("Test C: parses ISO from/to query params into Date objects passed to the service", async () => {
    mockAggregateByCompany.mockResolvedValue([]);
    const app = await createApp();
    const from = "2026-04-01T00:00:00Z";
    const to = "2026-04-30T23:59:59Z";
    const res = await requestApp(app, (base) =>
      request(base)
        .get("/api/companies/company-1/claude-accounts/cost-summary")
        .query({ from, to }),
    );
    expect(res.status).toBe(200);
    expect(mockAggregateByCompany).toHaveBeenCalledTimes(1);
    const [companyArg, rangeArg] = mockAggregateByCompany.mock.calls[0];
    expect(companyArg).toBe("company-1");
    expect(rangeArg.from).toBeInstanceOf(Date);
    expect(rangeArg.to).toBeInstanceOf(Date);
    expect(rangeArg.from!.toISOString()).toBe(new Date(from).toISOString());
    expect(rangeArg.to!.toISOString()).toBe(new Date(to).toISOString());
  });

  it("Test D: returns 400 when query params are not valid ISO datetimes", async () => {
    const app = await createApp();
    const res = await requestApp(app, (base) =>
      request(base)
        .get("/api/companies/company-1/claude-accounts/cost-summary")
        .query({ from: "not-a-date" }),
    );
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(mockAggregateByCompany).not.toHaveBeenCalled();
  });

  it("Test E: accepts only one of from/to (single bound) and forwards undefined for the missing side", async () => {
    mockAggregateByCompany.mockResolvedValue([]);
    const app = await createApp();
    const from = "2026-04-01T00:00:00Z";
    const res = await requestApp(app, (base) =>
      request(base)
        .get("/api/companies/company-1/claude-accounts/cost-summary")
        .query({ from }),
    );
    expect(res.status).toBe(200);
    const [, rangeArg] = mockAggregateByCompany.mock.calls[0];
    expect(rangeArg.from).toBeInstanceOf(Date);
    expect(rangeArg.to).toBeUndefined();
  });
});
