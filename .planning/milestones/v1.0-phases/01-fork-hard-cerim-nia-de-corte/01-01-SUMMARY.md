---
phase: 01-fork-hard-cerim-nia-de-corte
plan: 01
subsystem: infra
tags: [git, fork, monorepo, paperclip, pnpm-workspace]

requires: []
provides:
  - "Repo populated with paperclip source tree at SHA 40782f703d1f4a13f4ceadbe84c9b92be0bfacaf"
  - "Root identity rewritten to `ddd`"
  - "UPSTREAM_REFERENCE.md as single source of truth for imported SHA"
  - "CONTRIBUTING.md declaring hard-fork policy"
  - "Cut upstream remote (no paperclipai/paperclip remote in .git/config)"
affects: [01-02, 02-*, all subsequent phases]

tech-stack:
  added:
    - "Paperclip monorepo (pnpm workspaces): server/, ui/, cli/, packages/db, packages/shared, packages/adapters/*"
    - "Node 20+, TypeScript 5.7.3, pnpm 9.15.4"
    - "Drizzle ORM 0.38.4, Better Auth 1.4.18, Express 5.1, React 19, Vite 6, Tailwind 4"
  patterns:
    - "Hard fork: no upstream remote tracked; manual port with SHA citation when needed"
    - "Identity boundary: root package.json `name` rewritten; workspace packages keep `@paperclipai/*` scope"

key-files:
  created:
    - UPSTREAM_REFERENCE.md
    - CONTRIBUTING.md (replaced paperclip's upstream version with hard-fork policy)
    - paperclip-ROADMAP.md (renamed from paperclip's root ROADMAP.md to avoid clash with .planning/ROADMAP.md)
    - "(2125 files total imported from paperclip master tree)"
  modified:
    - package.json (root name: paperclip → ddd)
    - README.md (prepended fork-status header; original paperclip content preserved below)

key-decisions:
  - "Imported via temporary `paperclip-source` remote + `git read-tree -u --reset` (not clone-to-temp + copy) — keeps SHA traceable in git history"
  - "Replaced paperclip's CONTRIBUTING.md entirely (hard-fork policy supersedes upstream contribution guide)"
  - "Renamed paperclip's root ROADMAP.md to paperclip-ROADMAP.md (preserved as historical reference; our roadmap lives in .planning/ROADMAP.md)"
  - "Single atomic commit captured the entire ceremony for clean audit trail"

patterns-established:
  - "Fork-cut ceremony: import-rewrite-cut-document, single atomic commit"
  - "Transient files (.paperclip-sha.tmp) stored at root, deleted before commit; *.tmp gitignore pattern from paperclip prevents accidental commit"

requirements-completed: [FORK-01, FORK-02, FORK-03, FORK-04]

duration: 3min
completed: 2026-04-26
---

# Phase 1 Plan 1: Fork Hard + Identity Rewrite Summary

**Imported paperclip master at SHA `40782f703d1f4a13f4ceadbe84c9b92be0bfacaf` into d:\projetos\ddd; renamed root package to `ddd`; cut upstream remote; documented hard-fork policy in UPSTREAM_REFERENCE.md and CONTRIBUTING.md.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-26T01:29:58Z
- **Completed:** 2026-04-26T01:33:00Z
- **Tasks:** 3
- **Files modified:** 2125 (paperclip tree imported + ceremony files added)

## Accomplishments

- Paperclip master tree (commit `40782f7`) imported into repo root preserving existing `.git/`, `.planning/`, and `.claude/` framework artifacts.
- Root identity rewritten: `package.json` `"name"` is now `"ddd"`. All other paperclip metadata (scripts, deps, packageManager, engines, pnpm patches/overrides) preserved byte-for-byte.
- Upstream remote (`paperclip-source`) removed from `.git/config` after SHA was captured. `git remote -v` is now empty.
- `UPSTREAM_REFERENCE.md` created at repo root with the full 40-char SHA and manual-port policy.
- `CONTRIBUTING.md` rewritten with hard-fork governance rules (no upstream PRs, no upstream merges, manual port with SHA citation).
- Paperclip's upstream `ROADMAP.md` preserved as `paperclip-ROADMAP.md`; our authoritative roadmap remains in `.planning/ROADMAP.md`.

## Task Commits

Per the plan, all three tasks committed atomically as one fork-cut commit (the plan explicitly designed this — no per-task commits between import and ceremony). Plus one preceding chore commit to clear the working tree of routine framework state changes from the init step.

1. **Task 1 (import paperclip tree at SHA), Task 2 (rewrite identity), Task 3 (cut remote + write ceremony docs):** `ce0cc93` — `feat(fork): import paperclipai/paperclip@40782f7 and cut upstream`
2. **Pre-baseline (framework state sync):** `a829c67` — `chore(state): sync framework state for phase 1 execution`

## Files Created/Modified

### Created
- `UPSTREAM_REFERENCE.md` — records imported SHA, manual-port policy, why-hard-fork rationale.
- `CONTRIBUTING.md` — declares Hard Fork Policy (5 rules); replaces paperclip's upstream contribution guide.
- `paperclip-ROADMAP.md` — paperclip's root ROADMAP renamed to avoid clash with `.planning/ROADMAP.md`.
- 2122 additional files imported from paperclip master tree (server/, ui/, cli/, packages/, scripts/, docs/, evals/, tests/, etc.).

### Modified
- `package.json` — root `"name"` changed from `"paperclip"` to `"ddd"`. All other fields untouched.
- `README.md` — prepended one-line fork-status header pointing to UPSTREAM_REFERENCE.md and CONTRIBUTING.md; paperclip's original README content preserved below.

## Decisions Made

1. **Import strategy: `git read-tree -u --reset` from temporary remote**, chosen over `git pull --allow-unrelated-histories` (would create merge commit polluting ceremony intent) and over clone-to-temp + copy (loses SHA traceability). Keeps existing `.planning/` commits intact and produces a single fork-cut commit on top of pre-existing 8-commit framework history.
2. **Replaced paperclip's CONTRIBUTING.md entirely** rather than appending. The upstream contribution guide is irrelevant to a hard fork; merging would confuse contributors. Original upstream version remains accessible at paperclip master `40782f7`.
3. **Renamed paperclip's root ROADMAP.md to paperclip-ROADMAP.md** instead of deleting. Preserves upstream reference for future manual port decisions while establishing our `.planning/ROADMAP.md` as the authoritative roadmap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] `.planning/` directory wiped by `git read-tree -u --reset`**

- **Found during:** Task 1, immediately after `git read-tree` ran.
- **Issue:** The plan asserted that `git read-tree -u --reset paperclip-source/master` would NOT delete files outside paperclip's tree. In practice on this Windows + git environment, `--reset` updated the index to match paperclip exactly, which removed `.planning/` from the index and from the working tree (paperclip has no `.planning/` directory). `.claude/` survived only because it was untracked at the time.
- **Fix:** Restored `.planning/` from HEAD via `git checkout HEAD -- .planning/`. This re-staged all `.planning/` content as part of the working tree before Task 3's `git add -A` consolidated everything into the fork commit.
- **Files modified:** `.planning/**` (entire directory restored from HEAD).
- **Verification:** Re-ran the plan's Task 1 acceptance check — all required paths present. Plan-level verification step 5 (`framework intact`) passed.
- **Committed in:** Same fork commit `ce0cc93` (`.planning/` content was already in HEAD; the restoration ensured it stayed in the working tree through the fork commit so subsequent commits don't lose it).

**2. [Rule 2 - Critical Functionality] paperclip's CONTRIBUTING.md and ROADMAP.md present at root**

- **Found during:** Task 2 / Task 3.
- **Issue:** Plan acknowledged paperclip's root ROADMAP.md (handled via rename to paperclip-ROADMAP.md) but did not explicitly mention paperclip's root CONTRIBUTING.md (which exists at upstream and would clash with our planned new CONTRIBUTING.md from Task 3).
- **Fix:** Read the existing CONTRIBUTING.md to confirm it was paperclip's upstream version, then overwrote with the hard-fork policy version per Task 3 spec. Documented as decision #2 above.
- **Verification:** `grep 'Hard Fork Policy' CONTRIBUTING.md` matches; upstream content not present.

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocker, 1 Rule 2 clarification). 
**Plan impact:** No scope expansion — both fixes were necessary to achieve the plan's stated success criteria.

## Issues Encountered

- **CRLF line-ending warnings** on Windows for `.gitignore`-tracked text files. Cosmetic; git auto-normalizes via `core.autocrlf`. No action needed.
- **`.paperclip-sha.tmp` matched `*.tmp` in paperclip's `.gitignore`** — coincidentally beneficial: file was naturally protected from accidental commit even if cleanup had failed. Plan's transient-file abort check still ran defensively.

## Manual Configuration Required

None — fork-cut ceremony is self-contained. Plan 01-02 (smoke test) will require `pnpm install` from the imported tree.

## Next Phase Readiness

- Source tree is at SHA `40782f703d1f4a13f4ceadbe84c9b92be0bfacaf`. Run `pnpm install` from repo root to validate workspace resolution before smoke test (per plan handoff note).
- Identity boundary established. Subsequent plans modify the imported code freely without merge cost.
- `.planning/`, `.claude/`, and the existing 9-commit framework history are intact (8 prior + 1 baseline state-sync + 1 fork commit = 10 commits visible in `git log`; verification check #7 reported 11 due to count of all branch tips including fetched ref tracking, but plan required ≥9).
- No blockers for Plan 01-02 (smoke test).

## Self-Check: PASSED

- `package.json` has `"name": "ddd"` — confirmed via grep.
- `UPSTREAM_REFERENCE.md` has 40-char SHA `40782f703d1f4a13f4ceadbe84c9b92be0bfacaf` — confirmed.
- `CONTRIBUTING.md` has Hard Fork Policy + No PRs to upstream + Manual port — 3 matches confirmed.
- `git remote -v` is empty — confirmed.
- `.planning/ROADMAP.md` and `.claude/` intact — confirmed.
- `pnpm-workspace.yaml`, `server/package.json`, `packages/db/src` present — confirmed.
- Fork commit `ce0cc93` exists at HEAD with `feat(fork)` prefix — confirmed via `git log`.
- `git status --porcelain` is empty — confirmed.

---
*Phase: 01-fork-hard-cerim-nia-de-corte*
*Completed: 2026-04-26*
