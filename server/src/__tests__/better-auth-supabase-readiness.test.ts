import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { deriveAuthCookiePrefix } from "../auth/better-auth.js";

describe("deriveAuthCookiePrefix (AUTH-02)", () => {
  const originalEnv = process.env.PAPERCLIP_INSTANCE_ID;

  beforeEach(() => {
    delete process.env.PAPERCLIP_INSTANCE_ID;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PAPERCLIP_INSTANCE_ID;
    else process.env.PAPERCLIP_INSTANCE_ID = originalEnv;
  });

  it("Test 1: 'team-shared' → 'paperclip-team-shared'", () => {
    expect(deriveAuthCookiePrefix("team-shared")).toBe("paperclip-team-shared");
  });

  it("Test 2: 'default' → 'paperclip-default'", () => {
    expect(deriveAuthCookiePrefix("default")).toBe("paperclip-default");
  });

  it("Test 3: invalid chars are sanitized", () => {
    expect(deriveAuthCookiePrefix("with spaces & weird@chars!!")).toBe(
      "paperclip-with-spaces-weird-chars",
    );
  });

  it("Test 4: empty string falls back to default", () => {
    expect(deriveAuthCookiePrefix("")).toBe("paperclip-default");
  });

  it("Test 5: env var PAPERCLIP_INSTANCE_ID drives default arg", () => {
    process.env.PAPERCLIP_INSTANCE_ID = "team-shared";
    // deriveAuthCookiePrefix uses resolvePaperclipInstanceId() at CALL time
    // (not import time), so env mutation here is honored.
    expect(deriveAuthCookiePrefix()).toBe("paperclip-team-shared");
  });
});

// Integration test: only runs when SUPABASE_DB_URL or DATABASE_URL is set.
describe("createBetterAuthInstance against real Supabase (AUTH-01) [integration]", () => {
  const supabaseUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  const skipReason = !supabaseUrl
    ? "SUPABASE_DB_URL not set — skipping integration test (run with .env.local loaded to enable)"
    : null;

  it.skipIf(skipReason !== null)(
    "Test 6: createBetterAuthInstance succeeds with Supabase-backed db",
    async () => {
      if (skipReason) return;

      // Dynamic imports because we don't want module-level effects in unit tests
      const { createDb } = await import("@paperclipai/db");
      const { createBetterAuthInstance } = await import("../auth/better-auth.js");

      const db = createDb(supabaseUrl!);

      // Minimal Config shape needed by createBetterAuthInstance.
      // Real Config comes from server/src/config.ts via loadConfig() — but we don't
      // need full config here, just the fields the function reads.
      const fakeConfig = {
        authBaseUrlMode: "implicit" as const,
        authPublicBaseUrl: "",
        authDisableSignUp: false,
        deploymentMode: "authenticated" as const,
        allowedHostnames: [] as string[],
      };

      // Skip if BETTER_AUTH_SECRET not set (env precondition)
      if (!process.env.BETTER_AUTH_SECRET && !process.env.PAPERCLIP_AGENT_JWT_SECRET) {
        console.warn("BETTER_AUTH_SECRET not set; skipping integration test");
        return;
      }

      let instance: ReturnType<typeof createBetterAuthInstance> | null = null;
      let thrown: unknown = null;
      try {
        instance = createBetterAuthInstance(db, fakeConfig as never);
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeNull();
      expect(instance).not.toBeNull();
      // Better Auth instance has `.api` namespace with handlers
      expect((instance as { api?: unknown }).api).toBeDefined();
    },
  );
});

describe("Auth schema tables exported from @paperclipai/db (AUTH-01 dependency)", () => {
  it("Test 7: authUsers, authSessions, authAccounts, authVerifications are exported", async () => {
    const dbExports = await import("@paperclipai/db");
    expect(dbExports.authUsers).toBeDefined();
    expect(dbExports.authSessions).toBeDefined();
    expect(dbExports.authAccounts).toBeDefined();
    expect(dbExports.authVerifications).toBeDefined();
  });
});
