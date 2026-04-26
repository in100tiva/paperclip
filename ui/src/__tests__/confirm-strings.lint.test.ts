import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * UI-08 / Phase 9-04 — Anti-regression lint test for window.confirm().
 *
 * Walks ui/src/ excluding test files and asserts:
 *   1. ALL window.confirm() callsites wrap a t() call (zero raw English/PT strings).
 *   2. At least one window.confirm(t(...)) exists somewhere (sanity check that the
 *      pattern is in active use, otherwise the regex above could pass vacuously).
 *
 * Catches future regressions where a developer adds a raw window.confirm("...") in
 * a non-translated string, breaking pt-BR coverage.
 */

function walkSrc(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkSrc(full, files);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("UI-08 — confirm-strings lint", () => {
  const SRC_ROOT = join(process.cwd(), "src");

  /**
   * Extract the balanced contents of every window.confirm(...) call. Walks the
   * source character-by-character tracking parenthesis depth so that ternaries,
   * nested calls, and multiline templates are treated as a single argument
   * region. Returns { lineNum, body } per match.
   */
  function extractConfirmBodies(
    content: string,
  ): Array<{ lineNum: number; body: string }> {
    const out: Array<{ lineNum: number; body: string }> = [];
    const trigger = /window\.confirm\(/g;
    let m: RegExpExecArray | null;
    while ((m = trigger.exec(content)) !== null) {
      const start = m.index + m[0].length;
      let depth = 1;
      let i = start;
      let inStr: string | null = null;
      let escaped = false;
      while (i < content.length && depth > 0) {
        const ch = content[i];
        if (inStr) {
          if (escaped) {
            escaped = false;
          } else if (ch === "\\") {
            escaped = true;
          } else if (ch === inStr) {
            inStr = null;
          }
        } else if (ch === '"' || ch === "'" || ch === "`") {
          inStr = ch;
        } else if (ch === "(") {
          depth++;
        } else if (ch === ")") {
          depth--;
          if (depth === 0) break;
        }
        i++;
      }
      const body = content.slice(start, i);
      const lineNum = content.slice(0, m.index).split("\n").length;
      out.push({ lineNum, body });
    }
    return out;
  }

  it("all window.confirm() calls wrap a t() expression (no raw strings)", () => {
    const files = walkSrc(SRC_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      for (const { lineNum, body } of extractConfirmBodies(content)) {
        // The body must contain at least one t( ... ) call. We accept t( anywhere
        // because the full string can be assembled via ternary, function call,
        // or expression — all paths must terminate in a t() lookup.
        if (!/\bt\s*\(/.test(body)) {
          const rel = file.replace(process.cwd(), "").replace(/\\/g, "/");
          violations.push(`${rel}:${lineNum}`);
        }
      }
    }

    expect(
      violations,
      `Raw window.confirm() callsites found (must wrap t()):\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  it("at least one window.confirm(...) call references t() (sanity check)", () => {
    const files = walkSrc(SRC_ROOT);
    let count = 0;
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      for (const { body } of extractConfirmBodies(content)) {
        if (/\bt\s*\(/.test(body)) count++;
      }
    }
    expect(count).toBeGreaterThan(0);
  });
});
