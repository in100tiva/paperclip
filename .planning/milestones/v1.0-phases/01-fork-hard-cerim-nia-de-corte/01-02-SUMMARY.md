---
phase: 01-fork-hard-cerim-nia-de-corte
plan: 02
subsystem: infra
tags: [smoke-test, pnpm, embedded-postgres, windows, vite, baseline]

requires:
  - phase: 01-01
    provides: "Imported paperclip source tree at SHA 40782f7 with identity rewritten to `ddd` and upstream cut"
provides:
  - "Documented baseline that `pnpm install && pnpm dev` works on Windows with embedded Postgres"
  - "SMOKE-TEST-LOG.md as the regression reference for the embedded-postgres fallback path"
  - "Concrete port/timing/health-endpoint values that future Phase 2 changes must preserve in fallback mode"
  - "Documented Windows-specific wart: stale runtime-services registry survives taskkill"
affects: [02-*, 03-* (onboarding/troubleshooting)]

tech-stack:
  added: []
  patterns:
    - "Smoke baseline ceremony: capture install + boot evidence in a single log file before any technical change to the imported tree"
    - "Per-task chore commits during execution (Task 1, Task 2 evidence) followed by a finalizing test commit on user approval — preserves audit trail of what was observed when"

key-files:
  created:
    - .planning/phases/01-fork-hard-cerim-nia-de-corte/SMOKE-TEST-LOG.md
  modified:
    - .gitignore (Task 2 patch — ignore .pnpm-dev.pid transient)

key-decisions:
  - "Default `mode: embedded-postgres` validated — paperclip's runtime-config falls back to embedded when no DATABASE_URL is set; no env override needed for the smoke."
  - "Server + Vite share port 3100 via Vite dev middleware mounted in-process (paperclip pattern; not separate ports)."
  - "Stale runtime-services registry on Windows is a known wart deferred to Phase 3; not a blocker for Phase 1 sign-off."

patterns-established:
  - "Smoke log lives in the phase directory (not at repo root) — co-located with the plan that produced it"
  - "User-verification checkpoints commit only after explicit `aprovado` signal — never speculative success commits"
  - "Document concrete baseline values (ports, migration count, health response) so future regressions can be triaged against a literal reference"

requirements-completed: [FORK-05]

duration: ~15min execution + user verification
completed: 2026-04-25
---

# Phase 1 Plan 2: Smoke Test Baseline Summary

**`pnpm install` (6m7s, exit 0) + `pnpm dev` boot validated on Windows 11 with embedded Postgres on port 54329 and Express+Vite on port 3100; 71 migrations applied; `/api/health` returned 200; user confirmed UI loaded in browser.**

## Performance

- **Duration:** ~15 min agent execution + user browser verification
- **Started:** 2026-04-25 (plan kicked off after 01-01 commit `126a64e`)
- **Completed:** 2026-04-25 (user `aprovado` signal received, finalizing commit `7478fa6`)
- **Tasks:** 3 (Task 1 install, Task 2 dev boot, Task 3 human-verify checkpoint)
- **Files modified:** 2 (`SMOKE-TEST-LOG.md` created and finalized; `.gitignore` patched once)

## Accomplishments

- `pnpm install` ran clean on Windows 11 with Node v24.11.1 and pnpm 9.15.4 (exit 0, 6m7s, embedded-postgres patch applied successfully).
- `pnpm dev` booted end-to-end with embedded Postgres as backend: 71 migrations applied, plugin-sdk built, server bound to 127.0.0.1:3100, embedded pg listening on 127.0.0.1:54329, banner printed.
- `GET /api/health` returned `HTTP 200` with `{"status":"ok","authReady":true,"bootstrapStatus":"ready",...}` — confirms the auth middleware and bootstrap flow are wired and reachable.
- User independently re-ran `pnpm dev` in a fresh terminal, opened the UI in a browser, observed it rendering with dark theme and no 500s, and approved the baseline.
- Documented Windows-specific wart (stale runtime-services registry) so Phase 3 can address it without re-discovery.

## Task Commits

Tasks were committed incrementally (chore commits) during execution to preserve evidence at each phase, then finalized as a `test` commit upon user approval:

1. **Task 1 (`pnpm install` baseline):** `29aaa42` — `chore(01-02): record pnpm install baseline (Task 1)`
2. **Task 2 (`pnpm dev` boot evidence):** `8eca988` — `chore(01-02): record pnpm dev boot evidence (Task 2)`
3. **Task 2 (.gitignore patch for transient pid file — Rule 3 deviation):** `f7f4131` — `chore(01-02): ignore .pnpm-dev.pid transient`
4. **Task 3 (user-verified outcome appended + finalized):** `7478fa6` — `test(01-02): finalize smoke baseline (user verified UI boot)`

**Plan metadata commit:** appended below this SUMMARY write — `docs(01-02): complete smoke test plan (FORK-05)`.

## Files Created/Modified

### Created
- `.planning/phases/01-fork-hard-cerim-nia-de-corte/SMOKE-TEST-LOG.md` — full smoke evidence (env, install log, dev boot log, ports, health check, user verification, baseline contract).

### Modified
- `.gitignore` — added `.pnpm-dev.pid` (transient file written by the dev runner during the smoke; was leaking as an untracked file otherwise).

## Decisions Made

1. **Did not override `PAPERCLIP_DB_MODE` env var** — verified that paperclip's `runtime-config.ts` already defaults to embedded-postgres when no `DATABASE_URL` is set (log line `Using embedded PostgreSQL because no DATABASE_URL set`). No defensive env override needed; plan's contingency was unused.
2. **Treated the 13× pnpm install warnings (`Failed to create bin at ... .EXE`) as non-blocking** — they affect only the `paperclip-plugin-dev-server` shim from `@paperclipai/plugin-sdk`, which is a plugin-authoring CLI out of scope for the team-baseline smoke. Documented in the install log section so the warning is recognized (not flagged as new) when future devs see it on first run.
3. **Stopped `pnpm dev` via `taskkill //F //T //PID <pid>` on Windows** — `kill $DEV_PID` on bash-on-Windows didn't propagate through the pnpm child-process tree reliably. Documented the side-effect (stale runtime-services registry) as a wart rather than papering over it; Phase 3 will address graceful-shutdown UX.
4. **Captured the boot-time numbers as concrete baseline values** (ports 3100/54329, 71 migrations, health endpoint response shape) — these are now the literal contract Phase 2 must preserve in fallback mode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] `.pnpm-dev.pid` leaking as untracked file**
- **Encontrado durante:** Task 2 (right after `pnpm dev` was launched in background; `git status --short` showed `?? .pnpm-dev.pid`).
- **Problema:** The plan's Task 2 launches `pnpm dev` in background and tracks the PID. The PID was being persisted to `.pnpm-dev.pid` at repo root and `git status` flagged it as untracked. Per `<task_commit_protocol>` (the framework rule about untracked files post-action), runtime-output files should be gitignored. Paperclip's `.gitignore` covers `*.log` but not `.pnpm-dev.pid`.
- **Correção:** Added `.pnpm-dev.pid` to root `.gitignore` and committed as a separate chore commit (`f7f4131`) so the smoke evidence commits stay focused on Task 1/Task 2 outputs.
- **Arquivos modificados:** `.gitignore`.
- **Verificação:** `git status --porcelain | grep '.pnpm-dev.pid'` → empty after the fix.
- **Comitado em:** `f7f4131` (chore commit, separate from Task 2 evidence commit `8eca988`).

**2. [Rule 1 - Bug] Stale runtime-services registry orphan between executor runs**
- **Encontrado durante:** Task 2 retry / Task 3 user verification.
- **Problema:** After the first executor run killed `pnpm dev` via `taskkill`, paperclip's `~/.paperclip/instances/default/runtime-services/` directory retained a registry file pointing at the dead PID/port. On the user's subsequent `pnpm dev`, this would have caused either a stale-service warning or a port-bind conflict.
- **Correção:** Deleted the orphan file from `~/.paperclip/instances/default/runtime-services/` before user re-ran the smoke. Also documented the wart explicitly in the SMOKE-TEST-LOG.md `Outcome` section with three candidate fixes (PowerShell graceful-shutdown wrapper / paperclip-side `SIGBREAK` handler / defensive PID-alive check at startup) so Phase 3 can pick one.
- **Arquivos modificados:** none in the repo (filesystem cleanup outside the working tree). Documentation only: `SMOKE-TEST-LOG.md` Outcome section.
- **Verificação:** User-confirmed `pnpm dev` boot succeeded after cleanup; baseline contract holds.
- **Comitado em:** `7478fa6` (the wart documentation, not the cleanup itself — cleanup was outside the repo).

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocker for gitignore hygiene, 1 Rule 1 bug-doc for the runtime-services wart).
**Plan impact:** No scope expansion. Both fixes were necessary to keep the working tree clean and to give the team a documented reference for a Windows-DX issue that would otherwise be re-discovered every time someone restarts dev.

## Issues Encountered

- **First-run `pnpm install` was slow (6m7s).** Expected per `<known_pitfalls>` (embedded-postgres binary download + full registry pull on cold cache). Documented in the log so future devs understand subsequent runs will be faster.
- **`taskkill` on Windows leaves orphans** — see Deviation #2. Captured as a documented wart, not a blocker.
- **CRLF warnings on git commit** for `SMOKE-TEST-LOG.md` — paperclip's `.gitattributes` / git's `core.autocrlf` normalizes; cosmetic only.

## Manual Configuration Required

None for Phase 1 itself. **Phase 2 will require manual configuration** (Supabase project link, env vars for `SUPABASE_DB_URL` / `BETTER_AUTH_SECRET` / `PAPERCLIP_CREDENTIAL_ENCRYPTION_KEY`) — that work is scoped to Phase 2's plans, not this one.

## Next Phase Readiness

- **Phase 1 is complete.** All five ROADMAP success criteria for Phase 1 are verified (see SMOKE-TEST-LOG.md `Outcome` section for the verification map).
- **Pre-Phase-2 baseline is captured.** Phase 2 changes to `runtime-config.ts`, `packages/db/src/client.ts`, or the dev runner that switch the default to Supabase MUST preserve the embedded fallback path. The smoke (Tasks 1 + 2) can be re-run against Phase 2 code; if it doesn't match the baseline values in this log (port 3100, 54329, 71 migrations, /api/health 200, dark UI loads), Phase 2 has regressed the fallback.
- **Phase 3 backlog seeded:** the Windows runtime-services orphan wart is documented for future workflow/onboarding work.
- **No blockers** for `/planejar-fase 2`.

## Self-Check: PASSED

- `SMOKE-TEST-LOG.md` exists at `.planning/phases/01-fork-hard-cerim-nia-de-corte/SMOKE-TEST-LOG.md` — confirmed via Read.
- `Step 1: pnpm install` shows `Exit code: 0` literal — confirmed.
- `Step 2: pnpm dev smoke` shows `Result: SUCCESS` — confirmed.
- `Outcome` section is non-empty (no `_Filled in by Task 3._` placeholder) — confirmed by post-edit state.
- All four task commits exist in `git log --oneline`: `29aaa42`, `8eca988`, `f7f4131`, `7478fa6` — confirmed.
- `git status --porcelain` was empty before this SUMMARY write — confirmed.
- FORK-05 mapped to evidence: install (`pnpm install` exit 0) + boot (`pnpm dev` ready + UI 200) + user verification (`aprovado` signal) — all three legs present.

---
*Phase: 01-fork-hard-cerim-nia-de-corte*
*Concluída: 2026-04-25*
