import { describe, expect, it } from "vitest";
import { __testing__ } from "@paperclipai/adapter-claude-local/server";

const { buildClaudePromptBundleKey } = __testing__;

describe("buildClaudePromptBundleKey with locale", () => {
  const baseInput = {
    skills: [],
    instructionsContents: "AGENTS",
  } as const;

  it("differs between pt-BR and en-US for the same skills+instructions", async () => {
    const ptKey = await buildClaudePromptBundleKey({ ...baseInput, locale: "pt-BR" });
    const enKey = await buildClaudePromptBundleKey({ ...baseInput, locale: "en-US" });
    expect(ptKey).not.toBe(enKey);
  });

  it("is stable across calls with same input", async () => {
    const a = await buildClaudePromptBundleKey({ ...baseInput, locale: "pt-BR" });
    const b = await buildClaudePromptBundleKey({ ...baseInput, locale: "pt-BR" });
    expect(a).toBe(b);
  });

  it("returns a 64-char sha256 hex digest", async () => {
    const key = await buildClaudePromptBundleKey({ ...baseInput, locale: "pt-BR" });
    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });
});
