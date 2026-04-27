import { describe, expect, it } from "vitest";
import { buildLanguageDirectiveBlock } from "../agent-instructions-locale-directive.js";

describe("buildLanguageDirectiveBlock", () => {
  it("returns block containing 'português brasileiro' for pt-BR", () => {
    const out = buildLanguageDirectiveBlock("pt-BR");
    expect(out).toContain("português brasileiro");
    expect(out).toContain("## Idioma de Resposta");
    expect(out.length).toBeGreaterThan(50);
  });

  it("returns empty string for en-US", () => {
    expect(buildLanguageDirectiveBlock("en-US")).toBe("");
  });

  it("is idempotent — repeated calls return byte-identical output", () => {
    const a = buildLanguageDirectiveBlock("pt-BR");
    const b = buildLanguageDirectiveBlock("pt-BR");
    expect(a).toBe(b);
  });

  it("emits leading and trailing newlines so concatenation is safe", () => {
    const out = buildLanguageDirectiveBlock("pt-BR");
    expect(out.startsWith("\n")).toBe(true);
    expect(out.endsWith("\n")).toBe(true);
  });
});
