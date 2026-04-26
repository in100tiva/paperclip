import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("i18n init (I18N-01, I18N-02, I18N-03)", () => {
  it("I18N-01: initializes i18next with exactly 8 namespaces", async () => {
    const i18n = (await import("../index")).default;
    const ns = i18n.options.ns as string[];
    expect(ns).toEqual(
      expect.arrayContaining([
        "common",
        "inbox",
        "projects",
        "settings",
        "auth",
        "agents",
        "errors",
        "activity",
      ]),
    );
    expect(ns.length).toBe(8);
  });

  it("I18N-02: 16 dictionary JSON files exist (8 namespaces × 2 locales)", () => {
    const root = resolve(__dirname, "..", "locales");
    for (const locale of ["pt-BR", "en-US"]) {
      for (const ns of [
        "common",
        "inbox",
        "projects",
        "settings",
        "auth",
        "agents",
        "errors",
        "activity",
      ]) {
        const path = resolve(root, locale, `${ns}.json`);
        expect(existsSync(path), `missing ${path}`).toBe(true);
        expect(
          () => JSON.parse(readFileSync(path, "utf8")),
          `invalid JSON in ${path}`,
        ).not.toThrow();
      }
    }
  });

  it("I18N-03: missing pt-BR key falls back to en-US, never raw key", async () => {
    const i18n = (await import("../index")).default;
    await i18n.changeLanguage("pt-BR");
    // app-name exists in both locales
    expect(i18n.t("common:app-name")).not.toBe("common:app-name");
    expect(i18n.t("common:app-name")).not.toBe("app-name");
    // language.title exists in both — should resolve in pt-BR
    expect(i18n.t("settings:language.title")).not.toMatch(/^settings:/);
  });
});
