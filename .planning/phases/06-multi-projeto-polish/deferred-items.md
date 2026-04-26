# Deferred Items — Phase 6

Pre-existing issues encountered during Phase 6 execution that are explicitly **out of scope** for the plans they surfaced in. Logged for triage in a future cleanup phase.

## Adapter execute tests fail on Windows (discovered during 06-03)

When running the full server vitest suite (`npx vitest run`), 14 test files have failures totalling 63 failed tests, all in adapter `*-execute.test.ts` and adapter `*-environment.test.ts` files plus `workspace-runtime.test.ts`:

- `claude-local-execute.test.ts` — 11/14 fail
- `codex-local-execute.test.ts` — 12/12 fail
- `gemini-local-execute.test.ts` — 3/3 fail
- `pi-local-execute.test.ts` — 3/3 fail
- `cursor-local-execute.test.ts` — 3/3 fail
- `*-environment.test.ts` (gemini, opencode, cursor, pi) — partial fails
- `worktree-config.test.ts` — 1 fail
- `environment-live-ssh.test.ts` — 1 fail
- `workspace-runtime.test.ts` — 22/56 fail

Failure mode: `Failed to start command "C:\Users\...\bin\claude" in "...\workspace". Verify adapter command, working directory, and PATH (...)`. The fake CLI scripts created by these tests use Unix-style shebangs that don't resolve on Windows when spawned via Node's `child_process.spawn`.

**Why deferred:**

- Reproducible on master before any Phase 6 change (same failure mode noted in 05-05 SUMMARY where MULTI-05 tests deliberately used `process.execPath` to bypass this).
- Unrelated to the file under test in 06-03 (`server/src/services/claude-accounts.ts`); claude-accounts unit tests with mocked Db all pass (27/27).
- Cross-platform CI test infrastructure is its own work item (likely v2 / dedicated cleanup plan).

**Action:** Add to `/limpeza` autonomous lifecycle phase OR file as a standalone milestone work item ("port adapter execute test harness to be Windows-spawn-safe"). Not blocking for v1.

**Observed:** 2026-04-26 during Phase 6 plan 06-03 verification.
