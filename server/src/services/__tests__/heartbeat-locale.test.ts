import { describe, expect, it, vi } from "vitest";
import type { Db } from "@paperclipai/db";

import { resolveRunOwnerLocale } from "../heartbeat-locale.js";

// AGENT-SKILL-03 unit — covers Plan 11-01 Tarefa 1 (RED) → Tarefa 2 (GREEN).
// Helper resolves the locale chosen by the human operator that triggered the
// wake (via agent_wakeup_requests.requestedByActorType="user"), with a safe
// "pt-BR" fallback for null wakeups, system-driven wakes, and JOIN-misses.
//
// Mock shape mirrors the chained drizzle builder used by the production
// implementation:
//   db.select(...).from(...).leftJoin(...).where(...).limit(1) → Promise<row[]>
// Tests assert the returned literal is narrowed to RuntimeLocale ("pt-BR" | "en-US").

type LocaleRow = {
  actorType: string | null;
  locale: string | null;
};

function buildDbThatReturns(rows: LocaleRow[]): Db {
  const fake = {
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            limit: () => Promise.resolve(rows),
          }),
        }),
      }),
    }),
  };
  return fake as unknown as Db;
}

describe("resolveRunOwnerLocale", () => {
  it("returns 'pt-BR' and short-circuits when wakeupRequestId is null", async () => {
    const select = vi.fn(() => {
      throw new Error("db.select must not be called when wakeupRequestId is null");
    });
    const db = { select } as unknown as Db;
    const result = await resolveRunOwnerLocale(db, null);
    expect(result).toBe("pt-BR");
    expect(select).not.toHaveBeenCalled();
  });

  it("returns 'pt-BR' when actorType is 'system' (timer-driven wake)", async () => {
    const db = buildDbThatReturns([{ actorType: "system", locale: null }]);
    const result = await resolveRunOwnerLocale(db, "wake-system");
    expect(result).toBe("pt-BR");
  });

  it("returns 'pt-BR' when user actor has locale='pt-BR'", async () => {
    const db = buildDbThatReturns([{ actorType: "user", locale: "pt-BR" }]);
    const result = await resolveRunOwnerLocale(db, "wake-user-ptbr");
    expect(result).toBe("pt-BR");
  });

  it("returns 'en-US' when user actor has locale='en-US'", async () => {
    const db = buildDbThatReturns([{ actorType: "user", locale: "en-US" }]);
    const result = await resolveRunOwnerLocale(db, "wake-user-enus");
    expect(result).toBe("en-US");
  });

  it("returns 'pt-BR' (safe fallback) when leftJoin returns user actor but locale is null (race delete + wake)", async () => {
    const db = buildDbThatReturns([{ actorType: "user", locale: null }]);
    const result = await resolveRunOwnerLocale(db, "wake-user-orphan");
    expect(result).toBe("pt-BR");
  });
});
