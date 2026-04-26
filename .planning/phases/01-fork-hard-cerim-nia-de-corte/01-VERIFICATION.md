---
phase: 01-fork-hard-cerim-nia-de-corte
verified: 2026-04-25T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: null
---

# Phase 1: Fork Hard + Cerimônia de Corte — Verification Report

**Phase Goal:** Repo do paperclip clonado para `d:\projetos\ddd`, identidade reescrita como `ddd`, upstream removido, política de fork hard documentada e smoke test baseline (`pnpm dev` com embedded Postgres) passando em Windows antes de qualquer mudança técnica.

**Verified:** 2026-04-25
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (derived from ROADMAP success criteria)

| #   | Truth                                                                                            | Status     | Evidence                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Any team dev can clone repo and run `pnpm install && pnpm dev` on Windows with embedded Postgres | ✓ VERIFIED | SMOKE-TEST-LOG.md (201 lines) records: install exit code 0 (6m7s), pnpm dev booted on 127.0.0.1:3100, embedded pg on 54329, 71 migrations applied, /api/health → HTTP 200, user typed `aprovado` after browser verification |
| 2   | `git remote -v` does not list `paperclipai/paperclip` as upstream — fork is cut                  | ✓ VERIFIED | `git remote -v` output is empty (zero remotes configured)                                                                                                                              |
| 3   | `UPSTREAM_REFERENCE.md` exists at root with imported SHA + manual port policy                    | ✓ VERIFIED | File exists; contains line `**SHA:** \`40782f703d1f4a13f4ceadbe84c9b92be0bfacaf\``; references "hard fork", "manually ported", `paperclipai/paperclip` (4 mentions)                    |
| 4   | `package.json` root has `"name": "ddd"` (no paperclip identity at root)                          | ✓ VERIFIED | `grep "name" package.json` → `"name": "ddd",` at top-level (workspace packages retain `@paperclipai/*` scope, which is acceptable per FORK-03)                                         |
| 5   | `CONTRIBUTING.md` declares hard-fork policy (no upstream PRs, manual port when useful)           | ✓ VERIFIED | File exists with sections: "Hard Fork Policy", "No PRs to upstream", "Manual port when useful", "Identity is `ddd`" — all four literal strings present                               |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                  | Expected                                          | Status     | Details                                                                                                |
| ------------------------- | ------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `UPSTREAM_REFERENCE.md`   | Records SHA + manual-port policy                  | ✓ VERIFIED | Exists at root; contains 40-char SHA `40782f703d1f4a13f4ceadbe84c9b92be0bfacaf`; mentions paperclipai/paperclip 4 times; declares hard-fork policy |
| `CONTRIBUTING.md`         | Declares hard-fork policy                         | ✓ VERIFIED | Exists at root; contains "Hard Fork Policy", "No PRs to upstream", "Manual port", `Identity is \`ddd\`` |
| `package.json`            | Root has `"name": "ddd"`                          | ✓ VERIFIED | Top-level `"name": "ddd"` confirmed; no paperclip identity at root level                                |
| `pnpm-workspace.yaml`     | Workspace definition imported                     | ✓ VERIFIED | Exists at root                                                                                          |
| `paperclip-ROADMAP.md`    | Upstream paperclip ROADMAP preserved as reference | ✓ VERIFIED | Exists at root (renamed from paperclip's upstream `ROADMAP.md` to avoid clash with `.planning/ROADMAP.md`) |
| `README.md`               | Fork-status header prepended                      | ✓ VERIFIED | First non-empty line: `> **DDD** — hard fork of [paperclipai/paperclip]...`                            |
| `server/package.json`     | Paperclip workspace structure imported            | ✓ VERIFIED | Exists                                                                                                  |
| `ui/package.json`         | Paperclip workspace structure imported            | ✓ VERIFIED | Exists                                                                                                  |
| `packages/db/src/`        | Paperclip db package imported                     | ✓ VERIFIED | Exists as directory                                                                                     |
| `.planning/`              | Pre-existing framework dirs intact                | ✓ VERIFIED | Exists                                                                                                  |
| `.claude/`                | Pre-existing framework dirs intact                | ✓ VERIFIED | Exists                                                                                                  |
| `SMOKE-TEST-LOG.md`       | Smoke evidence with concrete values               | ✓ VERIFIED | 201 lines (well above 20-line minimum); contains pnpm install exit 0, pnpm dev boot signals, port table, /api/health 200, user `aprovado` confirmation |

### Key Link Verification

| From                           | To                                       | Via                | Status     | Details                                                                                       |
| ------------------------------ | ---------------------------------------- | ------------------ | ---------- | --------------------------------------------------------------------------------------------- |
| `.git/config`                  | (no paperclip remote)                    | remote removal     | ✓ WIRED    | `git remote -v` returns empty output — zero remotes; `paperclip-source` was removed in commit `ce0cc93` |
| `UPSTREAM_REFERENCE.md`        | imported SHA `40782f70...`               | documented hash    | ✓ WIRED    | 40-char hex SHA present in `**SHA:** \`...\`` line                                            |
| `package.json`                 | ddd identity                             | name field         | ✓ WIRED    | Top-level `"name": "ddd"` matches pattern                                                     |
| `package.json` (root)          | pnpm workspace install                   | pnpm install       | ✓ WIRED    | SMOKE-TEST-LOG.md records exit 0 + workspace node_modules created at `node_modules/`, `server/node_modules/`, `ui/node_modules/`, `packages/db/node_modules/` |
| `packages/db/src/runtime-config.ts` | embedded-postgres mode               | default config    | ✓ WIRED    | Smoke log line: `Using embedded PostgreSQL because no DATABASE_URL set (dataDir=..., port=54329)` confirms default fallback works |

### Data-Flow Trace (Level 4)

Not applicable — Phase 1 is fork ceremony + infrastructure smoke; no data-rendering artifacts produced.

### Behavioral Spot-Checks

| Behavior                                                  | Command                                              | Result                                  | Status |
| --------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- | ------ |
| Root identity is `ddd`                                    | `grep '"name"' package.json | head -1`               | `"name": "ddd",`                        | ✓ PASS |
| Upstream remote removed                                   | `git remote -v`                                      | (empty output)                          | ✓ PASS |
| UPSTREAM_REFERENCE.md has 40-char SHA                     | `grep -E '\*\*SHA:\*\* `[a-f0-9]{40}`' UPSTREAM_REFERENCE.md` | matches `40782f703d1f4a13f4ceadbe84c9b92be0bfacaf` | ✓ PASS |
| CONTRIBUTING.md declares hard-fork policy                 | `grep -E "Hard Fork Policy|No PRs to upstream|Manual port|Identity is" CONTRIBUTING.md` | 4 matches                               | ✓ PASS |
| Paperclip tree imported (workspace structure)             | `test -f server/package.json && test -d packages/db/src && test -f ui/package.json` | all 3 paths present                     | ✓ PASS |
| Framework dirs preserved                                  | `test -d .planning && test -d .claude`               | both present                            | ✓ PASS |
| Phase 1 commits exist in history                          | `git log --oneline | head -10`                       | `ce0cc93 feat(fork)`, `7478fa6 test(01-02)`, `5c4453d docs(01-02)`, plus pre-existing 8 commits | ✓ PASS |
| Working tree clean                                        | `git status --porcelain`                             | (empty output)                          | ✓ PASS |
| Smoke test baseline pre-Phase-2 (FORK-05)                 | User-verified `pnpm dev` boot + browser UI load      | Recorded in SMOKE-TEST-LOG.md Outcome with `aprovado` signal | ✓ PASS (human-verified) |

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                              | Status      | Evidence                                                                                              |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| FORK-01     | 01-01-PLAN  | Repo `paperclipai/paperclip` clonado para `d:\projetos\ddd` em commit conhecido (SHA registrado)        | ✓ SATISFIED | UPSTREAM_REFERENCE.md records SHA `40782f703d1f4a13f4ceadbe84c9b92be0bfacaf`; commit `ce0cc93` references it in message |
| FORK-02     | 01-01-PLAN  | Remote upstream removido; `UPSTREAM_REFERENCE.md` documenta SHA original e política de port manual      | ✓ SATISFIED | `git remote -v` empty; UPSTREAM_REFERENCE.md exists with SHA + "manually ported" + "We do **NOT** fetch, merge, rebase, or pull from upstream paperclip" policy |
| FORK-03     | 01-01-PLAN  | `package.json` raiz renomeado para `ddd` (sem manter identidade do paperclip)                            | ✓ SATISFIED | Top-level `"name": "ddd"` confirmed                                                                   |
| FORK-04     | 01-01-PLAN  | `CONTRIBUTING.md` declara política de fork hard (sem PRs upstream, port manual quando útil)              | ✓ SATISFIED | CONTRIBUTING.md contains all four literal strings: "Hard Fork Policy", "No PRs to upstream", "Manual port", `Identity is \`ddd\`` |
| FORK-05     | 01-02-PLAN  | `pnpm install` + `pnpm dev` rodam localmente em Windows com embedded Postgres (smoke test baseline)      | ✓ SATISFIED | SMOKE-TEST-LOG.md: install exit 0 (6m7s); dev boot on 127.0.0.1:3100 + embedded pg 54329 + 71 migrations + /api/health 200; user `aprovado` after independent browser verification |

**No orphaned requirements** — REQUIREMENTS.md maps FORK-01..05 to Phase 1, all five are claimed by plans 01-01 and 01-02.

### Anti-Patterns Found

None. Phase artifacts are documentation + ceremony files (UPSTREAM_REFERENCE.md, CONTRIBUTING.md, SMOKE-TEST-LOG.md) plus identity rewrite (package.json `name`) plus imported paperclip tree (not modified by this phase). No TODO/FIXME/placeholder markers in any of the phase-created files. SMOKE-TEST-LOG.md contains real captured output, no `<paste output>` placeholder remnants.

### Human Verification Required

None outstanding — FORK-05's user-verification checkpoint was completed during Plan 01-02 execution (user typed `aprovado` after independently running `pnpm dev` and loading the UI in a browser; recorded in SMOKE-TEST-LOG.md Outcome section, line 162).

### Gaps Summary

No gaps. All five Phase 1 success criteria from ROADMAP are satisfied with concrete on-disk evidence:

1. **Smoke test baseline (Criterion 1):** SMOKE-TEST-LOG.md captures install + dev boot + user browser verification with concrete numbers (port 3100, port 54329, 71 migrations, HTTP 200 health check).
2. **Upstream cut (Criterion 2):** `git remote -v` is empty.
3. **UPSTREAM_REFERENCE.md (Criterion 3):** exists at root with full 40-char SHA `40782f703d1f4a13f4ceadbe84c9b92be0bfacaf` and explicit manual-port policy.
4. **Identity (Criterion 4):** root `package.json` has `"name": "ddd"`.
5. **Hard-fork policy (Criterion 5):** CONTRIBUTING.md contains the canonical four strings (Hard Fork Policy / No PRs to upstream / Manual port / Identity is `ddd`).

All FORK-01..FORK-05 requirements are SATISFIED. Phase 1 is complete and ready for Phase 2 planning. The pre-Phase-2 baseline contract documented in SMOKE-TEST-LOG.md (port 3100, port 54329, 71 migrations, /api/health 200) is now the regression reference for any Phase 2 change to runtime-config.ts, packages/db/src/client.ts, or the dev runner.

---

_Verified: 2026-04-25_
_Verifier: Claude (verifier)_
