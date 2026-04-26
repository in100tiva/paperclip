import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { detectClaudeQuotaExhausted } from "./detect-quota-exhausted";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadFixture(name: string): string {
  return readFileSync(resolve(__dirname, "fixtures", name), "utf-8");
}

describe("detectClaudeQuotaExhausted (Spike Phase 4 prototype)", () => {
  it("classifies rpm_transient fixture", () => {
    const input = loadFixture("rpm_transient.txt");
    const result = detectClaudeQuotaExhausted(input);
    // Pode classificar como rpm_transient (preferido) OU tpm_transient OU org_tier
    // (partial coverage flagada na taxonomy). Mínimo: NÃO unknown.
    expect(result.type).not.toBe("unknown");
    expect(["rpm_transient", "tpm_transient", "org_tier"]).toContain(result.type);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.source).toBe("regex");
  });

  it("classifies tpm_transient fixture", () => {
    const input = loadFixture("tpm_transient.txt");
    const result = detectClaudeQuotaExhausted(input);
    expect(result.type).not.toBe("unknown");
    expect(["tpm_transient", "rpm_transient"]).toContain(result.type);
    expect(result.source).toBe("regex");
  });

  it("classifies daily_quota fixture with retryAt", () => {
    const input = loadFixture("daily_quota.txt");
    const result = detectClaudeQuotaExhausted(input);
    expect(result.type).toBe("daily_quota");
    expect(result.retryAt).toBeInstanceOf(Date);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("classifies weekly_quota fixture with retryAt", () => {
    const input = loadFixture("weekly_quota.txt");
    const result = detectClaudeQuotaExhausted(input);
    expect(result.type).toBe("weekly_quota");
    expect(result.retryAt).toBeInstanceOf(Date);
  });

  it("classifies org_tier fixture (partial coverage acceptable)", () => {
    const input = loadFixture("org_tier.txt");
    const result = detectClaudeQuotaExhausted(input);
    expect(result.type).not.toBe("unknown");
    // Partial coverage: pode classificar como org_tier OU rpm_transient
    expect(["org_tier", "rpm_transient"]).toContain(result.type);
  });

  it("classifies session_5h fixture with retryAt", () => {
    const input = loadFixture("session_5h.txt");
    const result = detectClaudeQuotaExhausted(input);
    expect(result.type).toBe("session_5h");
    expect(result.retryAt).toBeInstanceOf(Date);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("returns unknown for non-quota input", () => {
    const result = detectClaudeQuotaExhausted("hello world, all good");
    expect(result.type).toBe("unknown");
    expect(result.confidence).toBe(0);
  });

  it("returns unknown for empty input", () => {
    const result = detectClaudeQuotaExhausted("");
    expect(result.type).toBe("unknown");
  });
});
