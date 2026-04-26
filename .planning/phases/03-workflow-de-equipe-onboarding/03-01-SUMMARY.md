---
phase: 03-workflow-de-equipe-onboarding
plan: 01
subsystem: infra
tags: [tsx, supabase, drizzle, env-validation, onboarding, dx]

requires:
  - phase: 02-migra-o-de-storage-para-supabase
    provides: createDb factory with prepare:false on pooler 6543; PAPERCLIP_INSTANCE_ID=team-shared cookie prefix; .env.example template
provides:
  - scripts/setup.ts: 7-check environment validator (Node, pnpm, .env.local, critical env vars, claude CLI, Supabase ping, Better Auth schema)
  - package.json scripts.setup entry: invokes node-tsx form
affects: [03-02-onboarding-doc, 03-05-troubleshooting, TEAM-02, TEAM-05]

tech-stack:
  added: []
  patterns:
    - "Path-relative import of workspace packages from root scripts/"
    - "Postgres-js .unsafe() raw query via drizzle $client (avoids drizzle-orm/sql import in scripts/)"
    - "Setup script uses ANSI colors inline (no chalk dep); returns CheckResult discriminated union"

key-files:
  created:
    - scripts/setup.ts
  modified:
    - package.json

key-decisions:
  - "Path-relative import (../packages/db/src/index.js) instead of @paperclipai/db package specifier — root has no workspace deps and self-ref of workspace fails under pnpm hoisting on this repo"
  - "Use db.$client.unsafe(query) for raw SELECT — avoids drizzle-orm/sql dep import that does not resolve from scripts/"
  - "Invocation form is `pnpm run setup` (the bare `pnpm setup` triggers pnpm CLI builtin that configures PNPM_HOME) — to be documented in 03-02 ONBOARDING.md"
  - "`tsx scripts/setup.ts` form unusable (tsx not on PATH); use node cli/node_modules/tsx/dist/cli.mjs (mirrors preflight:workspace-links)"

patterns-established:
  - "Validator scripts in root scripts/ import workspace code via relative path + run via node-tsx form"
  - "CheckResult union (ok|fail|warn) + printCheck renderer = consistent ✓/✗/⚠ output for setup-style scripts"

requirements-completed: [TEAM-03]

duration: 5min
completed: 2026-04-26
---

# Phase 3 Plan 01: pnpm setup environment validator Summary

**TypeScript setup script (`pnpm run setup`) that runs 7 ordered checks (Node, pnpm, .env.local, critical env vars, claude CLI, Supabase ping via createDb, Better Auth `user` table) and exits non-zero with actionable messages on any required-check failure.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-26T04:38:26Z
- **Completed:** 2026-04-26T04:43:21Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `scripts/setup.ts` (333 lines) reusing `createDb` factory — auto-applies `prepare:false` on pooler 6543 (preserves Phase 2 invariant)
- 7 fail-fast checks in CONTEXT.md D-02 order: Node ≥20 → pnpm ≥9.15.4 → `.env.local` exists → critical vars (DATABASE_URL, SUPABASE_DB_URL, BETTER_AUTH_SECRET, PAPERCLIP_INSTANCE_ID=team-shared literal) → claude CLI (warn-only) → Supabase `SELECT 1` → Better Auth `SELECT count(*) FROM "user"`
- Each failure prints actionable command + cross-references TROUBLESHOOTING.md (placeholder — to be created in 03-05)
- ANSI colored output (✓/✗/⚠) without chalk dep
- Exit codes: 0 success, 1 required-check failure, 2 uncaught error
- Validated end-to-end against real Supabase: all 7 checks PASS for filled .env.local; exit 1 with correct message when .env.local absent or PAPERCLIP_INSTANCE_ID diverges

## Task Commits

1. **Task 1: scripts/setup.ts with ordered checks** — `cd5d4c0` (feat)
2. **Task 2: register pnpm setup script entry** — `251fc97` (chore)

## Files Created/Modified
- `scripts/setup.ts` (CREATED) — environment validator entry; 7 checks + ANSI renderer + safe-end teardown
- `package.json` (MODIFIED) — added `"setup": "node cli/node_modules/tsx/dist/cli.mjs scripts/setup.ts"` after `prepare`

## Decisions Made

- **Path-relative import of @paperclipai/db.** Plan suggested `from "@paperclipai/db"`. Discovery: root `node_modules` has no `@paperclipai/db` symlink (workspace hoisting on this repo only links into `cli/`, `server/`, `packages/db` themselves). Self-ref via `pnpm --filter @paperclipai/db exec tsx ../../scripts/setup.ts` also fails because the script file itself sits outside the workspace and `tsx` is not on PATH. Cleanest fix: `import { createDb } from "../packages/db/src/index.js"`. Drizzle/postgres-js transitives resolve from `packages/db/node_modules/`. Documented as Rule 3 deviation below.
- **Use `db.$client.unsafe(query)` for raw SELECT instead of `drizzle-orm.sql` tag.** Same resolution issue: `drizzle-orm` not in root `node_modules`. Postgres-js client is exposed on the drizzle handle as `$client`; calling `.unsafe(query)` for fixed strings (`SELECT 1`, `SELECT count(*) FROM "user"`) is safe (no user input).
- **`pnpm run setup` (not `pnpm setup`).** Bare `pnpm setup` triggers pnpm's CLI builtin that configures `PNPM_HOME` in PATH — does NOT invoke the package.json script. Confirmed empirically. The literal `pnpm setup` in ROADMAP success criterion remains satisfiable: documentation in 03-02 (ONBOARDING.md) will instruct devs to use `pnpm run setup`. Script entry naming itself is preserved as `setup` (per plan acceptance criteria).
- **Node-tsx invocation form.** `tsx` is not on PATH (verified: `pnpm exec tsx --version` fails; `secrets:migrate-inline-env` script in repo is also broken). Used `node cli/node_modules/tsx/dist/cli.mjs scripts/setup.ts` form, matching `preflight:workspace-links` (the only working tsx invocation in current package.json).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocker] Replaced `@paperclipai/db` package import with path-relative import**
- **Found during:** Task 1 verification (post-write sanity check)
- **Issue:** Plan action spec said `import { createDb } from "@paperclipai/db"`. Empirical: ERR_MODULE_NOT_FOUND when running `node cli/node_modules/tsx/dist/cli.mjs scripts/setup.ts`. Root `node_modules` does not contain `@paperclipai/` directory. Self-ref via `pnpm --filter` also fails because (a) `tsx` not on PATH inside that workspace, and (b) the script file is outside any workspace.
- **Fix:** Changed to `import { createDb } from "../packages/db/src/index.js"`. Drizzle and postgres-js transitively resolve via `packages/db/node_modules/`.
- **Files modified:** `scripts/setup.ts`
- **Verification:** `node cli/node_modules/tsx/dist/cli.mjs scripts/setup.ts` runs end-to-end; 7 checks PASS against live Supabase
- **Committed in:** `cd5d4c0` (Task 1)

**2. [Rule 3 — Blocker] Replaced `drizzle-orm.sql` tagged template with `db.$client.unsafe(query)`**
- **Found during:** Task 1 verification (same module resolution probe)
- **Issue:** Plan action spec used `db.execute(sql\`SELECT 1\`)` requiring `import { sql } from "drizzle-orm"`. Same resolution problem as #1.
- **Fix:** Helper `pingViaClient(db, query)` calls `db.$client.unsafe(query)` directly (postgres-js raw query). Both queries use literal strings only.
- **Files modified:** `scripts/setup.ts`
- **Verification:** Both Supabase ping and Better Auth schema check return correct results.
- **Committed in:** `cd5d4c0` (Task 1)

**3. [Rule 3 — Discovery] `pnpm setup` shadowed by pnpm CLI builtin**
- **Found during:** Task 2 verification (running `pnpm setup`)
- **Issue:** Bare `pnpm setup` (without `run`) runs pnpm's builtin command that adds `PNPM_HOME` to PATH — completely bypasses our package.json script.
- **Fix:** No code change. Documented invocation as `pnpm run setup`. Future plan 03-02 (ONBOARDING.md) will document this. Script entry name preserved as `setup` (matches plan acceptance criteria).
- **Files modified:** none
- **Verification:** `pnpm run setup` runs script; 7 checks PASS.
- **Committed in:** `251fc97` (Task 2 commit message documents the constraint)

---

**Total deviations:** 3 (all Rule 3 — blockers/discoveries)
**Impact on plan:** None — both code adjustments preserve the spirit of the plan (reuse the createDb factory, validate environment exhaustively). Naming-shadow finding is a doc concern for 03-02, not a code concern.

## Issues Encountered
- Module resolution from `scripts/` (root, outside any workspace) — resolved as deviations #1 and #2 above.
- `pnpm setup` builtin shadowing — resolved as deviation #3 (documentation handoff).

## Manual Configuration Required
None — all checks are automated. Devs running the script for the first time still need a filled `.env.local` (per plan; the script's purpose is to detect that condition with actionable error).

## Self-Check: PASSED

- ✓ FOUND: scripts/setup.ts (333 lines)
- ✓ FOUND: package.json scripts.setup entry
- ✓ FOUND: commit cd5d4c0
- ✓ FOUND: commit 251fc97
- ✓ Empirical: `pnpm run setup` returns exit 0 with all 7 checks PASS against live Supabase
- ✓ Empirical: missing `.env.local` returns exit 1 with `cp .env.example .env.local` message
- ✓ Empirical: PAPERCLIP_INSTANCE_ID=wrong-prefix returns exit 1 with TROUBLESHOOTING.md "Cookie prefix divergente" cross-reference

## Next Phase Readiness

- TEAM-03 satisfied (1/5 of Phase 3 requirements).
- 03-02 ONBOARDING.md must document `pnpm run setup` (not `pnpm setup`) and reference TROUBLESHOOTING.md sections that error messages link to.
- 03-05 TROUBLESHOOTING.md must include the cross-references this script emits: "Cookie prefix divergente", "Supabase no limite de conexões", "Schema desatualizado".

---
*Phase: 03-workflow-de-equipe-onboarding*
*Completed: 2026-04-26*
