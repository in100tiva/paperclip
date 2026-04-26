import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { detectClaudeQuotaExhausted } from "@paperclipai/adapter-claude-local/server";

// Reuse fixtures captured by Phase 4 spike (D-16: relative path reference,
// não duplicar conteúdo). Quando UAT-04-01 substituir os stubs por fixtures
// reais, estes tests pegam a atualização in-place sem alterações.
const FIXTURES_DIR = path.resolve(
  __dirname,
  "../../../.planning/phases/04-spike-multi-account-claude-code-detection/prototype/fixtures",
);

function readFixture(name: string): string {
  const fullPath = path.join(FIXTURES_DIR, name);
  return fs.readFileSync(fullPath, "utf8");
}

describe("detectClaudeQuotaExhausted", () => {
  it("returns detected=false for empty input", () => {
    const result = detectClaudeQuotaExhausted({ stdout: "", stderr: "" });
    expect(result.detected).toBe(false);
    expect(result.type).toBeNull();
    expect(result.retryAt).toBeNull();
    expect(result.rawMatch).toBeNull();
  });

  it("returns detected=false for unrelated text (top-level gate)", () => {
    const result = detectClaudeQuotaExhausted({
      stdout: "Hello world\nNo errors here\nAll good.",
      stderr: "",
    });
    expect(result.detected).toBe(false);
    expect(result.type).toBeNull();
  });

  it("classifies session_5h when '5-hour limit reached' is present", () => {
    const fixture = readFixture("session_5h.txt");
    const result = detectClaudeQuotaExhausted({ stdout: fixture, stderr: "" });
    expect(result.detected).toBe(true);
    expect(result.type).toBe("session_5h");
    expect(result.confidence).toBe("high");
    expect(result.rawMatch).not.toBeNull();
  });

  it("classifies weekly_quota for 'weekly limit reached'", () => {
    const fixture = readFixture("weekly_quota.txt");
    const result = detectClaudeQuotaExhausted({ stdout: fixture, stderr: "" });
    expect(result.detected).toBe(true);
    expect(result.type).toBe("weekly_quota");
    expect(result.confidence).toBe("high");
  });

  it("classifies daily_quota for 'usage limit reached' + reset timestamp (without 5-hour token)", () => {
    const fixture = readFixture("daily_quota.txt");
    const result = detectClaudeQuotaExhausted({ stdout: fixture, stderr: "" });
    expect(result.detected).toBe(true);
    expect(result.type).toBe("daily_quota");
    expect(result.retryAt).not.toBeNull();
    expect(result.confidence).toBe("high");
  });

  it("classifies rpm_transient for rate_limit_error / 429", () => {
    const fixture = readFixture("rpm_transient.txt");
    const result = detectClaudeQuotaExhausted({ stdout: fixture, stderr: "" });
    expect(result.detected).toBe(true);
    expect(result.type).toBe("rpm_transient");
  });

  it("classifies tpm_transient for tokens-per-minute", () => {
    const fixture = readFixture("tpm_transient.txt");
    const result = detectClaudeQuotaExhausted({ stdout: fixture, stderr: "" });
    expect(result.detected).toBe(true);
    expect(result.type).toBe("tpm_transient");
  });

  it("classifies org_tier for 503/overloaded fallback (no RPM/TPM/usage tokens)", () => {
    const fixture = readFixture("org_tier.txt");
    const result = detectClaudeQuotaExhausted({ stdout: fixture, stderr: "" });
    expect(result.detected).toBe(true);
    expect(result.type).toBe("org_tier");
    expect(result.confidence).toBe("low");
  });

  it("disambiguates 'claude usage limit reached' as daily_quota (not session_5h) when '5-hour' is absent (D-15)", () => {
    // Inline literal: bug fix vindo do protótipo Phase 4 (CLAUDE_429_TAXONOMY.md).
    // "claude usage limit reached" aparece em ambos daily e session_5h; sem o
    // token "5-hour" explícito, deve cair em daily_quota (default conservador).
    const input = "Error: claude usage limit reached. Resets at 2026-04-26T20:00:00Z.";
    const result = detectClaudeQuotaExhausted({ stdout: input, stderr: "" });
    expect(result.detected).toBe(true);
    expect(result.type).toBe("daily_quota");
    expect(result.retryAt).not.toBeNull();
  });

  it("reads stderr in addition to stdout (concat blob)", () => {
    const result = detectClaudeQuotaExhausted({
      stdout: "",
      stderr: "rate_limit_error: Too many requests",
    });
    expect(result.detected).toBe(true);
    expect(result.type).toBe("rpm_transient");
  });
});
