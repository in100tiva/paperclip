#!/usr/bin/env node
// Pre-commit guard: blocks staged diffs that introduce JWT-shaped literals in
// client-side code or VITE_*SERVICE_ROLE*/VITE_*SECRET* env vars anywhere.
// Satisfies AUTH-05 of phase 02 (Migração de Storage para Supabase).
//
// Usage:
//   - Standalone: `node scripts/check-no-service-role-leak.mjs`
//   - Programmatic: `import { checkDiff } from "./check-no-service-role-leak.mjs"`

import { execSync } from "node:child_process";

// Patterns
// JWT structural: three base64url segments joined by dots, header always starts with `eyJ` (b64 of `{"`).
// Minimum total length 30 to avoid matching `eyJ` substrings in unrelated strings.
const JWT_REGEX = /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
// VITE_ prefixed env vars containing forbidden tokens
const VITE_FORBIDDEN_REGEX = /^\+\s*VITE_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET)[A-Z0-9_]*\s*=/;

// Path classification
function isClientSidePath(path) {
  if (!path) return false;
  // Forbidden: ui/src/** OR any *.tsx / *.jsx anywhere
  if (path.startsWith("ui/src/")) return true;
  if (path.endsWith(".tsx") || path.endsWith(".jsx")) return true;
  return false;
}

/**
 * @param {string} diffOutput - output of `git diff --cached --unified=0`
 * @returns {{ exitCode: number, errors: string[] }}
 */
export function checkDiff(diffOutput) {
  const errors = [];
  const lines = diffOutput.split("\n");
  let currentFile = null;
  let lineNumberInNewFile = 0;

  for (const rawLine of lines) {
    // File marker: `+++ b/path`
    const filePlusMatch = rawLine.match(/^\+\+\+ b\/(.+)$/);
    if (filePlusMatch) {
      currentFile = filePlusMatch[1].trim();
      lineNumberInNewFile = 0;
      continue;
    }
    // Hunk header: `@@ -X,Y +A,B @@` — set lineNumberInNewFile = A - 1 (we increment before use)
    const hunkMatch = rawLine.match(/^@@ .* \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      lineNumberInNewFile = Number.parseInt(hunkMatch[1], 10) - 1;
      continue;
    }
    // File header markers we don't care about
    if (rawLine.startsWith("diff --git ") || rawLine.startsWith("--- ") || rawLine.startsWith("index ")) {
      continue;
    }
    // Context line (starts with space): increment counter
    if (rawLine.startsWith(" ")) {
      lineNumberInNewFile += 1;
      continue;
    }
    // Removal (starts with `-` but not `---`): does not advance new-file counter, not a leak vector
    if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
      continue;
    }
    // Addition line — this is what we scan
    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      lineNumberInNewFile += 1;
      const addedContent = rawLine.slice(1);

      // Check 1: VITE_*SERVICE_ROLE* / VITE_*SECRET* — applies to ALL files (env files included)
      if (VITE_FORBIDDEN_REGEX.test(rawLine)) {
        errors.push(
          `${currentFile}:${lineNumberInNewFile}: forbidden env var name (VITE_ prefix exposes to client bundle): ${addedContent.trim()}`,
        );
        continue;
      }

      // Check 2: JWT-shaped literal in client-side path
      if (isClientSidePath(currentFile) && JWT_REGEX.test(addedContent)) {
        errors.push(
          `${currentFile}:${lineNumberInNewFile}: JWT-shaped literal in client-side file (service-role/auth tokens MUST live server-only)`,
        );
        continue;
      }
    }
  }

  return { exitCode: errors.length === 0 ? 0 : 1, errors };
}

function main() {
  let diff;
  try {
    diff = execSync("git diff --cached --unified=0", { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  } catch (err) {
    process.stderr.write(`[pre-commit] failed to read staged diff: ${err.message}\n`);
    process.exit(2);
  }

  const { exitCode, errors } = checkDiff(diff);
  if (exitCode !== 0) {
    process.stderr.write("\n[pre-commit] BLOCKED — service-role / JWT leak detected:\n\n");
    for (const e of errors) process.stderr.write(`  - ${e}\n`);
    process.stderr.write(
      "\nFix:\n" +
      "  - JWTs (Supabase service-role key, Better Auth tokens) must NEVER appear in ui/src/** or *.tsx/*.jsx\n" +
      "  - VITE_ prefix exposes value to the Vite client bundle — never use VITE_*SERVICE_ROLE* or VITE_*SECRET*\n" +
      "  - Move secrets to server-only env files; access via process.env in server/ code only\n" +
      "  - If this is a false positive (e.g. fixture data), git commit --no-verify with justification in commit message\n\n",
    );
  }
  process.exit(exitCode);
}

// Only run main() when invoked as CLI (not when imported by tests)
const invokedPath = process.argv[1] ? process.argv[1].replaceAll("\\", "/") : "";
const isMain = import.meta.url === `file://${invokedPath}` ||
               import.meta.url.endsWith(invokedPath);
if (isMain) main();
