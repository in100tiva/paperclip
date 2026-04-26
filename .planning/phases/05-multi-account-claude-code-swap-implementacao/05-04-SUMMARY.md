---
phase: 05-multi-account-claude-code-swap-implementacao
plan: 04
subsystem: server-services
tags: [multi-account, claude, service-factory, advisory-lock, w1-fix]

dependency_graph:
  requires:
    - "05-01: claude_accounts, agent_account_bindings, agent_step_executions schemas"
    - "05-03: ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED constant + ClaudeAccountRotatedDetails type"
  provides:
    - "claudeAccountsService(db) factory with 7 methods"
    - "RotationOutcome shape { rotationId, newAccount } for heartbeat coordination"
    - "NoAccountsAvailableError + CredentialDirMissingError custom errors"
    - "QuotaWindowsMap / ClaudeQuotaSubType TypeScript types reused by parse.ts classifier (05-02)"
  affects:
    - "05-06 heartbeat: consumes selectActiveAccount + rotateOnQuotaExhausted + recordSwapOutcome"
    - "05-07 UI: consumes listAccounts"
    - "05-08 smoke: exercises full chain end-to-end"

tech_stack:
  added: []
  patterns:
    - "Service factory pattern: claudeAccountsService(db) returns object with methods (consistent with companyService, heartbeatService)"
    - "Advisory lock via drizzle sql template: pg_advisory_xact_lock(hashtextextended(agentId, 0)) inside db.transaction"
    - "Pending rotation in-memory registry (10min TTL) bridges rotate→recordSwapOutcome split (W1 fix)"
    - "Lazy cooldown sweep: every selectActiveAccount cheap UPDATE flips exhausted→live for accounts whose window expired"
    - "Cached top-level exhaustedUntil = MAX(lastQuotaWindowsJson) recomputed on each rotate to avoid JSONB scans"

key_files:
  created:
    - "server/src/services/claude-accounts.ts (515 lines) — service factory + types + helpers"
    - "server/src/services/claude-accounts.test.ts (554 lines) — 21 vitest cases with manual chainable mock Db"
    - "server/src/errors.test.ts (40 lines) — 4 vitest cases for the two new error classes"
  modified:
    - "server/src/errors.ts (+33 lines) — appended NoAccountsAvailableError + CredentialDirMissingError"

decisions:
  - "Errors live in server/src/errors.ts (existing single errors module), NOT server/src/services/errors.ts (the plan referenced a non-existent path; existing module is the canonical location for HttpError siblings). Documented as deviation Rule 3 (blocker fix)."
  - "rotateOnQuotaExhausted returns { rotationId, newAccount } and stores PendingRotation in module-scoped Map keyed by rotationId; recordSwapOutcome consumes it and emits the activity log with the effective swapStrategy. This is the W1 fix from plan-checker — keeps D-32 observability accurate when the heartbeat falls back to full-context swap (the swapStrategy field reflects what truly worked, not what was planned)."
  - "PendingRotation entries auto-expire after 10 min (PENDING_ROTATION_TTL_MS) as a safety valve in case the caller never confirms (process restart between rotate and recordSwapOutcome). gcPendingRotations runs lazily on each new rotate."
  - "recordSwapOutcome throws on unknown rotationId (vs swallowing) — surfaces caller bugs cleanly during integration with 05-06 heartbeat."
  - "Sticky/manual binding policies are respected ONLY when the pinned account is currently 'live'; otherwise fallback to auto round-robin. Prevents pinned-but-broken account from indefinitely starving the agent."
  - "Default exhaustion fallback when retryNotBefore is null: rpm/tpm 1min, daily 24h, weekly 7d, session_5h 5h, org_tier 5min. Conservative defaults aligned with DECISION-DETECTION-STRATEGY.md."
  - "Lazy cooldown sweep on every selectActiveAccount call (cheap UPDATE … WHERE exhaustedUntil < now AND status='exhausted') chosen over background cron — eliminates a moving part and ensures freshness is measured in heartbeat ticks rather than cron interval."
  - "Test mock Db uses manual chainable stub returning queued result arrays per table rather than drizzle's official test utility — keeps test file self-contained and ~550 lines (the alternative drizzle-pg-test setup would exceed plan budget)."
  - "Tests mock node:fs/promises for resolveCredentialDir; mock activity-log.js for logActivity assertion. Both via vi.mock at top of test file to keep the suite hermetic."

metrics:
  duration: "~25 min"
  completed_date: "2026-04-26"
  loc:
    service: 515
    service_test: 554
    errors_added: 33
    errors_test: 40
    total: 1142
  test_count:
    errors: 4
    service: 21
    total: 25
  commits: 4

---

# Phase 5 Plan 4: Claude Accounts Service Summary

claudeAccountsService(db) factory with 7 methods (listAccounts, selectActiveAccount, rotateOnQuotaExhausted, recordSwapOutcome, resolveCredentialDir, recordStepExecution, markCooldownPassed), pessimistic advisory lock via pg_advisory_xact_lock, and the W1 split where rotate registers a pending rotation and recordSwapOutcome emits the activity log with the effective swapStrategy.

## What Was Built

### server/src/errors.ts

Added two custom error classes appended after the existing HttpError helpers (notFound/conflict/etc), without touching the existing exports:

- `NoAccountsAvailableError(companyId, agentId, message?)` — thrown by selectActiveAccount and rotateOnQuotaExhausted when no eligible Claude account is available for the agent's company.
- `CredentialDirMissingError(configDirSlug, expectedPath, message?)` — thrown by resolveCredentialDir when `~/.paperclip/claude-accounts/<slug>/` does not exist or is not a directory.

Both subclass `Error`, expose typed readonly props, and have actionable default messages (the second references `claude login`).

### server/src/services/claude-accounts.ts

Service factory `claudeAccountsService(db: Db)` returning an object with 7 methods. Internal helpers:

- `withAgentLock<T>(agentId, fn)` — wraps `fn` in `db.transaction` and acquires `pg_advisory_xact_lock(hashtextextended(agentId, 0))` before running. Used by selectActiveAccount and rotateOnQuotaExhausted.
- `sweepCooldown(companyId, now)` — lazy UPDATE flipping exhausted→live for accounts whose window has passed.
- `rowToAccount(row)` — DB row → ClaudeAccount domain type.
- `computeMaxExhaustion(windows)` — recomputes top-level cached exhaustedUntil = MAX(window dates).
- `defaultExhaustionFallback(type, now)` — conservative default minutes per quota family when retryNotBefore is null.

Public methods (D-09 + W1 fix):

1. `listAccounts(companyId)` — all company accounts ordered by createdAt ASC.
2. `selectActiveAccount({ agentId, companyId })` — under advisory lock: respects sticky/manual binding when live; otherwise sweeps cooldowns, picks `status='live' AND (exhaustedUntil IS NULL OR < now)` ordered by `lastUsedAt ASC`, filters by binding cooldown, throws NoAccountsAvailableError on empty pool, updates lastUsedAt, upserts binding.
3. `rotateOnQuotaExhausted({ agentId, companyId, fromAccountId, errorFamily, retryNotBefore, actorId, reason? })` — under advisory lock: marks `from` exhausted with updated lastQuotaWindowsJson[errorFamily], recomputes cached exhaustedUntil, picks next eligible account excluding `from`, updates binding (insert if missing) with lastRotatedAt=now, updates lastUsedAt on next, registers a pending rotation entry, **returns `{ rotationId, newAccount }` WITHOUT emitting the activity log**.
4. `recordSwapOutcome({ rotationId, swapStrategy, swapStatus })` — looks up the pending rotation, emits `claude_account_rotated` via logActivity with the effective swapStrategy ('resume' | 'fallback_full_context' | null) and swapStatus ('succeeded' | 'failed') in the details payload, deletes the pending entry. Throws on unknown/expired rotationId.
5. `resolveCredentialDir(account)` — returns `path.join(os.homedir(), '.paperclip', 'claude-accounts', configDirSlug)`, validates with fs.stat, throws CredentialDirMissingError on ENOENT or non-directory.
6. `recordStepExecution({ runId, stepId, accountId, usage })` — append-only INSERT into agent_step_executions; no UPDATE path exists.
7. `markCooldownPassed(accountId)` — narrow UPDATE flipping a single account from exhausted→live when its window has expired (exposed for explicit operator-driven recovery in addition to the lazy sweep).

### Pending Rotation Registry (W1 Fix)

Module-scoped `Map<rotationId, PendingRotation>` with 10-minute TTL. Records:

```typescript
interface PendingRotation {
  agentId: string;
  companyId: string;
  fromAccountId: string;
  toAccountId: string;
  errorFamily: ClaudeQuotaSubType;
  retryNotBefore: Date | null;
  reason: 'exhausted' | 'manual' | 'cooldown_expired';
  actorId: string;
  createdAtMs: number;
}
```

`gcPendingRotations(now)` runs at the start of every `rotateOnQuotaExhausted` call to evict stale entries. The `__testing` named export exposes the registry for test setup/teardown.

### server/src/services/claude-accounts.test.ts (21 cases)

Manual chainable mock Db with per-table queue of result arrays. Mocks `./activity-log.js` (logActivity + ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED) and `node:fs/promises` (stat) at top of file via `vi.mock`. Cases:

- listAccounts: ordering by createdAt
- selectActiveAccount (7 cases): advisory lock, oldest-lastUsedAt ordering, sticky-live respect, sticky-exhausted fallback, cooldown exclusion, NoAccountsAvailableError on empty pool, binding insert when missing
- rotateOnQuotaExhausted (5 cases — W1 invariants): returns RotationOutcome shape, does NOT call logActivity, marks from exhausted with windows update, recomputes MAX(windows), propagates NoAccountsAvailableError, acquires advisory lock
- recordSwapOutcome (3 cases): emits logActivity with full payload after a rotation, throws on unknown rotationId, idempotency-by-id (second consume fails)
- resolveCredentialDir (3 cases): happy path, ENOENT, non-directory
- recordStepExecution (1 case): insert-only, no update calls
- markCooldownPassed (1 case): narrow update with status filter

### server/src/errors.test.ts (4 cases)

Two cases per error class — instance check + props + default message + custom message.

## Verification

```
pnpm vitest run src/errors.test.ts src/services/claude-accounts.test.ts
# 25/25 passed
pnpm tsc --noEmit
# exit 0
```

Acceptance criteria from PLAN.md:

- [x] server/src/services/claude-accounts.ts exports claudeAccountsService(db) with 7 methods
- [x] rotateOnQuotaExhausted returns { rotationId: string, newAccount: ClaudeAccount }
- [x] rotateOnQuotaExhausted does NOT call logActivity (verified by `expect(logActivityMock).not.toHaveBeenCalled()` in test "returns { rotationId, newAccount } and does NOT emit activity log")
- [x] recordSwapOutcome emits activity log entry with swapStrategy in payload (verified by `expect(payload.details.swapStrategy).toBe("fallback_full_context")`)
- [x] Custom errors (NoAccountsAvailableError, CredentialDirMissingError) defined in server/src/errors.ts
- [x] Test suite passes — 25/25
- [x] All tasks committed individually with --no-verify

## Deviations from Plan

### [Rule 3 — Blocker Fix] Errors path: `server/src/errors.ts` (not `server/src/services/errors.ts`)

- **Found during:** Task 1 read_first
- **Issue:** Plan frontmatter listed `server/src/services/errors.ts` but the file does not exist; the actual errors module lives at `server/src/errors.ts` (HttpError + notFound/conflict/etc).
- **Fix:** Append the two new error classes to the existing `server/src/errors.ts` and import via `from "../errors.js"` in claude-accounts.ts. Preserves single-source-of-truth for server errors.
- **Files modified:** server/src/errors.ts
- **Commit:** 27f3ddc

### [Rule 2 — Critical Functionality] Idempotency-by-id on recordSwapOutcome

- **Found during:** Task 2 design
- **Issue:** Without consuming the pending rotation, a buggy heartbeat could double-emit the same claude_account_rotated event (corrupting D-32 observability).
- **Fix:** recordSwapOutcome deletes the pending entry after logActivity returns; second invocation with the same rotationId throws `Unknown or expired rotationId`. Test case `removes pending rotation after recording outcome (idempotency-by-id)` enforces this contract.
- **Commit:** 6255a21

### [Rule 2 — Critical Functionality] PendingRotation TTL safety valve

- **Found during:** Task 2 design
- **Issue:** If the heartbeat process restarts between rotateOnQuotaExhausted and recordSwapOutcome, the in-memory entry would leak indefinitely.
- **Fix:** 10-minute TTL with lazy GC at the start of each rotate call. Aligned with operator expectation that an unconfirmed swap older than 10 min is observably broken (heartbeat would have re-rotated by then).
- **Commit:** 6255a21

## Auth Gates

None — no auth required during execution.

## Known Stubs

None — all 7 methods have real DB-touching implementations and complete test coverage.

## Self-Check: PASSED

- [x] FOUND: server/src/services/claude-accounts.ts
- [x] FOUND: server/src/services/claude-accounts.test.ts
- [x] FOUND: server/src/errors.test.ts
- [x] FOUND: server/src/errors.ts (modified)
- [x] FOUND commit 2f7de6f (RED test for errors)
- [x] FOUND commit 27f3ddc (GREEN errors implementation)
- [x] FOUND commit 6255a21 (claudeAccountsService factory + tests)

## Commits

- `2f7de6f` test(05-04): add failing test for NoAccountsAvailableError + CredentialDirMissingError
- `27f3ddc` feat(05-04): add NoAccountsAvailableError + CredentialDirMissingError
- `6255a21` feat(05-04): implement claudeAccountsService(db) factory with 7 methods
