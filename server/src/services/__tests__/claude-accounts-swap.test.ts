import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Mocks — claude-accounts service + quota detector
// ============================================================

const mockRotate = vi.fn();
const mockResolveDir = vi.fn();
const mockRecordSwapOutcome = vi.fn();
const mockSelectActiveAccount = vi.fn();
const mockListAccounts = vi.fn();
const mockRecordStepExecution = vi.fn();
const mockMarkCooldownPassed = vi.fn();

vi.mock("../claude-accounts.js", () => ({
  claudeAccountsService: () => ({
    listAccounts: mockListAccounts,
    selectActiveAccount: mockSelectActiveAccount,
    rotateOnQuotaExhausted: mockRotate,
    recordSwapOutcome: mockRecordSwapOutcome,
    resolveCredentialDir: mockResolveDir,
    recordStepExecution: mockRecordStepExecution,
    markCooldownPassed: mockMarkCooldownPassed,
  }),
}));

const mockDetectQuota = vi.fn();
vi.mock("@paperclipai/adapter-claude-local/server", () => ({
  detectClaudeQuotaExhausted: (...args: unknown[]) => mockDetectQuota(...args),
}));

import {
  orchestrateClaudeSwap,
  orchestrateFallbackFullContext,
  detectResumeFailed,
} from "../claude-accounts-swap.js";
import { NoAccountsAvailableError } from "../../errors.js";

// ============================================================
// Fixtures
// ============================================================

const fakeDb = {} as never; // not used by mocks
const accountB = {
  id: "acc-b",
  companyId: "co-1",
  ownerUserId: "user-1",
  label: "Account B",
  configDirSlug: "b",
  status: "live" as const,
  lastQuotaWindowsJson: {},
  exhaustedUntil: null,
  lastUsedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function baseInput(overrides: Partial<Parameters<typeof orchestrateClaudeSwap>[0]> = {}) {
  return {
    db: fakeDb,
    agentId: "agent-1",
    companyId: "co-1",
    runId: "run-1",
    stepId: "step-7",
    fromAccountId: "acc-a",
    previousSessionId: "sess-prev",
    adapterStdout: "rate_limit_error: too many requests",
    adapterStderr: "",
    continuationSummary: "summary so far",
    alreadyRotatedThisStep: false,
    actorId: "system",
    ...overrides,
  };
}

beforeEach(() => {
  mockRotate.mockReset();
  mockResolveDir.mockReset();
  mockRecordSwapOutcome.mockReset();
  mockDetectQuota.mockReset();
});

// ============================================================
// Tests
// ============================================================

describe("orchestrateClaudeSwap", () => {
  it("Test 1: returns no_detection when detector reports no exhaustion", async () => {
    mockDetectQuota.mockReturnValue({
      detected: false,
      type: null,
      retryAt: null,
      confidence: "low",
      rawMatch: null,
    });

    const result = await orchestrateClaudeSwap(baseInput());

    expect(result.swapped).toBe(false);
    expect(result.reason).toBe("no_detection");
    expect(result.rotationId).toBeNull();
    expect(mockRotate).not.toHaveBeenCalled();
  });

  it("Test 2: calls rotateOnQuotaExhausted with detected sub-type and retryAt — does NOT pass swapStrategy (W1)", async () => {
    const retryAt = new Date("2026-04-26T12:00:00Z");
    mockDetectQuota.mockReturnValue({
      detected: true,
      type: "rpm_transient",
      retryAt,
      confidence: "medium",
      rawMatch: "429",
    });
    mockRotate.mockResolvedValue({ rotationId: "rot-1", newAccount: accountB });
    mockResolveDir.mockResolvedValue("/home/x/.paperclip/claude-accounts/b");

    await orchestrateClaudeSwap(baseInput());

    expect(mockRotate).toHaveBeenCalledTimes(1);
    const callArg = mockRotate.mock.calls[0][0];
    expect(callArg.errorFamily).toBe("rpm_transient");
    expect(callArg.retryNotBefore).toBe(retryAt);
    expect(callArg.fromAccountId).toBe("acc-a");
    // W1 invariant: swapStrategy is NEVER passed to rotateOnQuotaExhausted.
    expect(callArg).not.toHaveProperty("swapStrategy");
  });

  it("Test 3: forwards continuation summary in input — caller controls capture (no-op for orchestrate itself)", async () => {
    // The orchestrator does not currently consume the summary itself for Strategy A.
    // Strategy B uses it via orchestrateFallbackFullContext. This test asserts the
    // input is accepted (type contract) and passed through without error.
    mockDetectQuota.mockReturnValue({
      detected: true,
      type: "daily_quota",
      retryAt: null,
      confidence: "high",
      rawMatch: "daily quota",
    });
    mockRotate.mockResolvedValue({ rotationId: "rot-2", newAccount: accountB });
    mockResolveDir.mockResolvedValue("/dir/b");

    const result = await orchestrateClaudeSwap(
      baseInput({ continuationSummary: "important progress" }),
    );

    expect(result.swapped).toBe(true);
    // Summary itself is kept for the caller; orchestrate does not embed it in Strategy A.
    expect(result.retryPrompt).toBeNull();
  });

  it("Test 4: returns rotationId for the caller to pass to recordSwapOutcome later", async () => {
    mockDetectQuota.mockReturnValue({
      detected: true,
      type: "session_5h",
      retryAt: null,
      confidence: "high",
      rawMatch: "5-hour limit reached",
    });
    mockRotate.mockResolvedValue({ rotationId: "rot-deadbeef", newAccount: accountB });
    mockResolveDir.mockResolvedValue("/dir/b");

    const result = await orchestrateClaudeSwap(baseInput());

    expect(result.rotationId).toBe("rot-deadbeef");
    expect(result.newAccount?.id).toBe("acc-b");
    expect(result.newCredentialDir).toBe("/dir/b");
  });

  it("Test 5: defaults to Strategy A (resume) and forwards previousSessionId as retrySessionId", async () => {
    mockDetectQuota.mockReturnValue({
      detected: true,
      type: "rpm_transient",
      retryAt: null,
      confidence: "medium",
      rawMatch: "429",
    });
    mockRotate.mockResolvedValue({ rotationId: "rot-3", newAccount: accountB });
    mockResolveDir.mockResolvedValue("/dir/b");

    const result = await orchestrateClaudeSwap(
      baseInput({ previousSessionId: "sess-from-A" }),
    );

    expect(result.strategy).toBe("resume");
    expect(result.retrySessionId).toBe("sess-from-A");
    expect(result.retryPrompt).toBeNull();
  });

  it("Test 6: detectResumeFailed identifies session-not-found in stderr", () => {
    expect(
      detectResumeFailed({
        stdout: "",
        stderr: "Error: session not found",
        exitCode: 1,
      }),
    ).toBe(true);
    expect(
      detectResumeFailed({
        stdout: "",
        stderr: "invalid session id: abc",
        exitCode: 1,
      }),
    ).toBe(true);
    expect(
      detectResumeFailed({
        stdout: "",
        stderr: "no conversation found with session id xyz",
        exitCode: 1,
      }),
    ).toBe(true);
    // Exit non-zero with no system:init also signals failure.
    expect(
      detectResumeFailed({ stdout: "", stderr: "boom", exitCode: 2 }),
    ).toBe(true);
    // Successful run with init event — NOT a failure.
    expect(
      detectResumeFailed({
        stdout: '{"type":"system","subtype":"init","session_id":"x"}',
        stderr: "",
        exitCode: 0,
      }),
    ).toBe(false);
  });

  it("Test 7: orchestrateFallbackFullContext builds Strategy B prompt with summary embedded", async () => {
    const result = await orchestrateFallbackFullContext({
      db: fakeDb,
      agentId: "agent-1",
      companyId: "co-1",
      newAccount: accountB,
      newCredentialDir: "/dir/b",
      continuationSummary: "Did A, B, then C",
      lastInstruction: "Continue with D",
      actorId: "system",
    });

    expect(result.strategy).toBe("fallback_full_context");
    expect(result.retryPrompt).toContain("Continuation of prior work");
    expect(result.retryPrompt).toContain("Did A, B, then C");
    expect(result.retryPrompt).toContain("Continue with D");
    // W1 invariant: orchestrateFallbackFullContext does NOT emit activity log.
    expect(mockRecordSwapOutcome).not.toHaveBeenCalled();
  });

  it("Test 8: NoAccountsAvailableError → returns reason=pool_empty, no rotationId", async () => {
    mockDetectQuota.mockReturnValue({
      detected: true,
      type: "rpm_transient",
      retryAt: null,
      confidence: "medium",
      rawMatch: "429",
    });
    mockRotate.mockRejectedValue(new NoAccountsAvailableError("co-1", "agent-1"));

    const result = await orchestrateClaudeSwap(baseInput());

    expect(result.swapped).toBe(false);
    expect(result.reason).toBe("pool_empty");
    expect(result.rotationId).toBeNull();
    expect(mockResolveDir).not.toHaveBeenCalled();
  });

  it("Test 9 (D-19): alreadyRotatedThisStep=true returns rotation_cap_reached without invoking service", async () => {
    const result = await orchestrateClaudeSwap(
      baseInput({ alreadyRotatedThisStep: true }),
    );

    expect(result.swapped).toBe(false);
    expect(result.reason).toBe("rotation_cap_reached");
    expect(mockDetectQuota).not.toHaveBeenCalled();
    expect(mockRotate).not.toHaveBeenCalled();
  });

  it("Test 10 (W1 critical): orchestrate NEVER emits activity log directly — caller is sole emitter", async () => {
    mockDetectQuota.mockReturnValue({
      detected: true,
      type: "rpm_transient",
      retryAt: null,
      confidence: "medium",
      rawMatch: "429",
    });
    mockRotate.mockResolvedValue({ rotationId: "rot-x", newAccount: accountB });
    mockResolveDir.mockResolvedValue("/dir/b");

    await orchestrateClaudeSwap(baseInput());
    await orchestrateFallbackFullContext({
      db: fakeDb,
      agentId: "agent-1",
      companyId: "co-1",
      newAccount: accountB,
      newCredentialDir: "/dir/b",
      continuationSummary: "x",
      lastInstruction: "y",
      actorId: "system",
    });

    // W1 absolute invariant: neither helper invokes recordSwapOutcome.
    expect(mockRecordSwapOutcome).not.toHaveBeenCalled();
    // And rotateOnQuotaExhausted is invoked WITHOUT swapStrategy.
    if (mockRotate.mock.calls.length > 0) {
      expect(mockRotate.mock.calls[0][0]).not.toHaveProperty("swapStrategy");
    }
  });

  it("Test 11 (edge): missing_credentials when resolveCredentialDir throws — preserves rotationId", async () => {
    mockDetectQuota.mockReturnValue({
      detected: true,
      type: "rpm_transient",
      retryAt: null,
      confidence: "medium",
      rawMatch: "429",
    });
    mockRotate.mockResolvedValue({ rotationId: "rot-creds", newAccount: accountB });
    mockResolveDir.mockRejectedValue(new Error("ENOENT: no such directory"));

    const result = await orchestrateClaudeSwap(baseInput());

    expect(result.swapped).toBe(true);
    expect(result.reason).toBe("missing_credentials");
    expect(result.rotationId).toBe("rot-creds");
    expect(result.newCredentialDir).toBeNull();
    // Strategy is null — no spawn possible.
    expect(result.strategy).toBeNull();
  });
});
