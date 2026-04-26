import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock postgres-js so we don't actually open connections.
vi.mock("postgres", () => {
  const mockSql = Object.assign(vi.fn(), {
    end: vi.fn(),
    unsafe: vi.fn(),
  });
  return {
    default: vi.fn(() => mockSql),
  };
});

// Mock drizzle so we don't try to introspect schema.
vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn(() => ({ select: vi.fn() })),
  migrate: vi.fn(),
}));

import postgres from "postgres";
import { createDb, buildPostgresOptions } from "../client.js";

describe("createDb pool config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Test 1: pooler 6543 → prepare:false + max:5 + idle_timeout:20", () => {
    const url = "postgres://user:pwd@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";
    expect(buildPostgresOptions(url)).toEqual({
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    createDb(url);
    expect(vi.mocked(postgres).mock.calls[0][1]).toEqual({
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  });

  it("Test 2: session 5432 → max:5 + idle_timeout:20 (no prepare:false)", () => {
    const url = "postgres://user:pwd@aws-1-sa-east-1.pooler.supabase.com:5432/postgres";
    expect(buildPostgresOptions(url)).toEqual({
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  });

  it("Test 3: embedded 54329 → undefined (default postgres-js behavior)", () => {
    const url = "postgres://paperclip:paperclip@127.0.0.1:54329/postgres";
    expect(buildPostgresOptions(url)).toBeUndefined();
  });

  it("Test 4: createDb returns drizzle-shaped object", () => {
    const db = createDb("postgres://user:pwd@aws-1-sa-east-1.pooler.supabase.com:6543/postgres");
    expect(typeof (db as { select?: unknown }).select).toBe("function");
  });
});
