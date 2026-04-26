import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resources } from "../resources";

const T_CALL_RE = /\bt\(\s*["'`]([a-z0-9.\-]+(?::[a-z0-9.\-]+)?)["'`]/g;
const SRC_DIR = resolve(__dirname, "../..");
const EXCLUDE_DIRS = new Set(["node_modules", "dist", "i18n", "__tests__"]);
const EXCLUDE_FILE_RE = /\.(test|stories)\.(ts|tsx)$/;

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?|ts)$/.test(entry.name) && !EXCLUDE_FILE_RE.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function extractKeys(content: string): string[] {
  const keys: string[] = [];
  for (const m of content.matchAll(T_CALL_RE)) keys.push(m[1]);
  return keys;
}

function lookup(dict: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

describe("i18n missing-keys detector (I18N-04)", () => {
  it("pt-BR + en-US dictionaries cover all t() calls in source", () => {
    const files = walk(SRC_DIR);
    const missing: { file: string; key: string; locale: string }[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const rawKey of extractKeys(content)) {
        const hasNs = rawKey.includes(":");
        const targetNs = hasNs ? rawKey.split(":")[0] : "common";
        const path = hasNs ? rawKey.split(":").slice(1).join(":") : rawKey;
        for (const locale of ["pt-BR", "en-US"] as const) {
          const dict = (resources[locale] as Record<string, unknown>)[targetNs];
          if (!dict || lookup(dict as Record<string, unknown>, path) === undefined) {
            missing.push({ file, key: rawKey, locale });
          }
        }
      }
    }

    if (missing.length > 0) {
      const msg = missing
        .map((m) => `  ${m.locale} ${m.key} (${m.file})`)
        .join("\n");
      if (process.env.CI === "true") {
        expect.fail(`Missing i18n keys:\n${msg}`);
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `[i18n] ${missing.length} missing keys (non-blocking in dev):\n${msg}`,
        );
      }
    }
  });
});
