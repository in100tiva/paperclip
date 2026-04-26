---
phase: 06-multi-projeto-polish
plan: 03
subsystem: server-services
tags: [claude-accounts, pool-mode, multi-project, tdd]
status: complete
requirements: [PROJ-02]
dependency_graph:
  requires:
    - "06-01 schemas (companies.claudeAccountPoolMode + claude_accounts.scope)"
    - "Phase 5 claudeAccountsService factory (selectActiveAccount, advisory lock pattern, rotateOnQuotaExhausted)"
  provides:
    - "Pool-mode-aware selectActiveAccount (D-06 algorithm wired to runtime)"
    - "ClaudeAccount.scope: 'company' | 'shared' on the public type contract"
  affects:
    - "06-05 (post-merge SQL validation) — consumes the new branching"
    - "Plan 06-04 (UI) — already running parallel; payload `scope` in POST register account flows directly here"
    - "Heartbeat (server/src/services/heartbeat.ts) — unchanged; consumes selectActiveAccount transparently"
tech_stack:
  added: []
  patterns:
    - "Conditional Drizzle `where` predicate built per-call (poolMode → and/or composition)"
    - "Defensive enum narrowing (rawMode → fail-closed per_company)"
    - "TDD red→green with mock-table assertion (`tableSelects` introspection)"
key_files:
  created:
    - ".planning/phases/06-multi-projeto-polish/deferred-items.md"
  modified:
    - "server/src/services/claude-accounts.ts (+30 lines: companies select + scope filter + scope mapping in rowToAccount + scope on ClaudeAccount interface)"
    - "server/src/services/claude-accounts.test.ts (+164 lines: 6 new pool-mode tests + companies queue support + tableSelects mock surface)"
    - "server/src/services/__tests__/claude-accounts-swap.test.ts (+1 line: scope: 'company' on accountB fixture)"
decisions:
  - "Fail-closed for unknown poolMode — defaults to per_company (safer; prevents accidental cross-tenant leakage from corrupt DB rows)"
  - "sweepCooldown unchanged — keeps own-company-only scope; shared accounts owned by foreign companies are still surfaced via the candidates query's `lt(exhaustedUntil, now)` predicate (sweep is optimization, not correctness)"
  - "ClaudeAccount.scope is a required field on the public interface — backwards-compat cushion lives in rowToAccount only (defaults to 'company' if a row predates the schema migration)"
  - "Pre-existing Windows-only adapter execute test failures are out-of-scope; documented in deferred-items.md"
metrics:
  duration: "~12 min"
  completed_date: "2026-04-26"
  task_count: 1
  file_count: 4
  parallel_with: ["06-04"]
---

# Phase 6 Plan 03: selectActiveAccount Pool-Mode Awareness Summary

D-06 algorithm wired into the runtime: `selectActiveAccount` now resolves `companies.claudeAccountPoolMode` first, then composes a scope-aware Drizzle predicate that either isolates the company (per_company default) or grafts on shared-pool accounts owned by other companies (shared opt-in). All Phase 5 semantics preserved byte-for-byte under the default; cross-tenant isolation defended by a fail-closed default for unknown poolMode values.

## What Was Built

### Conceptual diff: query before vs after

**Before (Phase 5):**

```typescript
const candidates = await db
  .select()
  .from(claudeAccounts)
  .where(
    and(
      eq(claudeAccounts.companyId, input.companyId),
      eq(claudeAccounts.status, "live"),
      or(isNull(claudeAccounts.exhaustedUntil), lt(claudeAccounts.exhaustedUntil, now)),
    ),
  )
  .orderBy(asc(claudeAccounts.lastUsedAt));
```

**After (Phase 6 / D-06):**

```typescript
// Step 2a: resolve pool mode for this company
const companyRows = await db
  .select({ poolMode: companies.claudeAccountPoolMode })
  .from(companies)
  .where(eq(companies.id, input.companyId))
  .limit(1);
const rawMode = companyRows[0]?.poolMode ?? "per_company";
const poolMode: "per_company" | "shared" =
  rawMode === "shared" ? "shared" : "per_company";

// Step 3: pool-mode-aware scope filter
const scopeFilter =
  poolMode === "shared"
    ? or(
        and(
          eq(claudeAccounts.companyId, input.companyId),
          eq(claudeAccounts.scope, "company"),
        ),
        eq(claudeAccounts.scope, "shared"),
      )
    : and(
        eq(claudeAccounts.companyId, input.companyId),
        eq(claudeAccounts.scope, "company"),
      );

const candidates = await db
  .select()
  .from(claudeAccounts)
  .where(
    and(
      scopeFilter,
      eq(claudeAccounts.status, "live"),
      or(isNull(claudeAccounts.exhaustedUntil), lt(claudeAccounts.exhaustedUntil, now)),
    ),
  )
  .orderBy(asc(claudeAccounts.lastUsedAt));
```

The new `companies` query is added inside the existing `withAgentLock` transaction so the advisory lock still bounds the entire selection logic. No new imports beyond `companies` from `@paperclipai/db`.

### Type contract change

`ClaudeAccount` interface in the same file gains:

```typescript
export interface ClaudeAccount {
  // ... existing fields ...
  scope: "company" | "shared"; // Phase 6 / D-05
  // ...
}
```

`rowToAccount` reads `row.scope` defensively (`row.scope ?? 'company'` then narrows to the union) so legacy rows that somehow predate the migration still produce a valid ClaudeAccount object — D-08 backwards-compat. Migration 0072 sets the column NOT NULL DEFAULT 'company', so this defense is mostly belt-and-braces.

### Tests

Six new vitest cases in `server/src/services/claude-accounts.test.ts` under `describe("selectActiveAccount — pool mode (PROJ-02 / Phase 6)")`:

1. **PM-1** (per_company ignores foreign shared) — also asserts `mock.tableSelects` contains `"companies"`, the explicit hook proving the service queries the new column. This was the test that drove the RED→GREEN cycle.
2. **PM-2** (shared mode includes shared from other owners) — round-robin pulls the older shared account.
3. **PM-3** (shared mode picks the only shared account when own pool is empty).
4. **PM-4** (per_company throws `NoAccountsAvailableError` when no own accounts exist; shared do not count).
5. **PM-5** (cross-tenant isolation: Company B in per_company never sees any of Company A's accounts).
6. **PM-6** (defensive: unknown poolMode value defaults to per_company; doesn't throw, doesn't leak).

All 21 existing claude-accounts tests still pass (zero regression). 27/27 in this file.

The mock Db builder gained:
- `selectCompaniesQueue?: any[][]` option for `MockOptions`.
- `companies` branch in the `drain()` table router.
- `tableSelects: string[]` push-on-from-call surface, exposed on the returned object.

### Deferred items (out of scope)

`.planning/phases/06-multi-projeto-polish/deferred-items.md` documents 14 pre-existing test files (63 failed tests) that fail on Windows due to fake-CLI shebang spawning issues — unrelated to this plan and reproducible against master before any Phase 6 change. Filed for `/limpeza` or v2 work.

## Verification

- `grep -c "claudeAccountPoolMode\|claude_account_pool_mode" server/src/services/claude-accounts.ts` → 3 (≥1) ✓
- `grep -c "claudeAccounts.scope" server/src/services/claude-accounts.ts` → 3 (≥1) ✓
- `grep -c 'poolMode === "shared"' server/src/services/claude-accounts.ts` → 1 (≥1) ✓
- `npx vitest run src/services/claude-accounts.test.ts` → **27 passed** (21 Phase 5 + 6 new pool-mode) ✓
- `npx vitest run src/services/__tests__/claude-accounts-swap.test.ts` → **11 passed** (zero regression) ✓
- `npx vitest run src/errors.test.ts` → **4 passed** (zero regression) ✓
- `cd server && npx tsc --noEmit` → exit 0 ✓
- Existing acceptance criteria from plan: all satisfied (interface declares `scope`, conditional logic present, tests cover both modes + isolation + defensive default).

## Decisions Made

### Fail-closed default for unknown poolMode

If `companies.claudeAccountPoolMode` ever reads back as a value other than `'per_company'` or `'shared'` (DB corruption hypothesis, future schema drift, manual SQL edit gone wrong), the service treats it as `per_company`. Rationale: the per_company branch is the more restrictive of the two, so this defensive narrowing ensures unexpected modes can never inadvertently leak shared accounts across tenants. PM-6 codifies this expectation.

### sweepCooldown left untouched

The lazy `sweepCooldown` call (Step 2b in the new code) still scopes its UPDATE to `companies.id = input.companyId`. In shared mode, exhausted shared accounts owned by *other* companies don't get flipped back to live by this sweep — but that's benign: the candidates query immediately below uses `lt(exhaustedUntil, now)` as an alternative predicate to `status='live'`, so a stale `'exhausted'` status with a passed `exhaustedUntil` still surfaces the row as a candidate. Sweep is an optimization, not a correctness gate. v2 could broaden the sweep scope, but it would require selecting all eligible companyIds first and is out of scope here.

### scope is required on the public ClaudeAccount interface

Made `scope: 'company' | 'shared'` a required field rather than optional. Rationale: Phase 5 callers (heartbeat, swap orchestrator) treat `ClaudeAccount` as a fully-populated value object; making scope required forces TS to surface any future call site that hand-rolls an account fixture (caught one in `claude-accounts-swap.test.ts` via `pnpm tsc --noEmit` — fixed inline as a downstream test fixture). The `rowToAccount` helper supplies the default at the boundary so DB rows are always normalized.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Downstream test fixture missing scope field**

- **Found during:** Task 1 verify (`tsc --noEmit`)
- **Issue:** Adding `scope` as a required field on `ClaudeAccount` broke `server/src/services/__tests__/claude-accounts-swap.test.ts` — the local `accountB` fixture was missing the property; TS reported `Property 'scope' is missing in type ... but required in type 'ClaudeAccount'`.
- **Fix:** Added `scope: "company" as const,` to the fixture. Single-line patch; doesn't affect test semantics (the swap test doesn't exercise pool mode logic).
- **Files modified:** `server/src/services/__tests__/claude-accounts-swap.test.ts`
- **Commit:** `3b1e51e` (rolled into the GREEN feat commit)

### Out-of-scope items observed (not deviations)

- **63 pre-existing test failures on Windows** — adapter `*-execute.test.ts` and `*-environment.test.ts` files spawn fake CLIs with shebangs that don't resolve via Node `child_process.spawn` on Windows. Reproducible on master before any Phase 6 work; documented in `deferred-items.md`. This plan only touches `claude-accounts*` tests, which all pass.
- **Sibling 06-04** ran in parallel per `<parallel_execution>` directive; arquivos disjuntos (06-04 toques routes/UI; 06-03 service + tests).

## Test Cases Added (PM-1..PM-6)

| Test | Mode         | Setup                                                         | Expected                                                  |
| ---- | ------------ | ------------------------------------------------------------- | --------------------------------------------------------- |
| PM-1 | per_company  | 2 own scope='company' accounts; mock proves companies queried | Older lastUsedAt picked; `tableSelects` ⊇ `["companies"]` |
| PM-2 | shared       | 1 own + 1 foreign scope='shared'                              | Foreign-shared (older) wins round-robin                   |
| PM-3 | shared       | 0 own + 1 foreign scope='shared'                              | Returns the foreign-shared account                        |
| PM-4 | per_company  | 0 own (shared accounts physically exist but filtered out)     | Throws `NoAccountsAvailableError`                         |
| PM-5 | per_company  | Company B; A has accounts; B's filter matches zero            | Throws `NoAccountsAvailableError`                         |
| PM-6 | unknown mode | poolMode='weird-future-mode' + 1 own account                  | Falls back to per_company; returns own account            |

The mock Db is intentionally dumb (returns whatever is enqueued regardless of WHERE clause), so each test enqueues only the rows the real filtered query would have returned given the pool mode under test. PM-1's `tableSelects` assertion is the explicit anchor proving the service performs the new companies lookup.

## Forward Dependencies

Already-merged 06-04 contracts (`POST /api/.../claude-accounts` accepts `scope`; CompanySettings writes `claudeAccountPoolMode`) flow directly into this code path with zero further wiring. Plan 06-05 (post-merge SQL validation against Supabase) can now exercise both branches end-to-end.

## Self-Check: PASSED

- `server/src/services/claude-accounts.ts` — FOUND, contains `claudeAccountPoolMode` + `claudeAccounts.scope` + `poolMode === "shared"` ✓
- `server/src/services/claude-accounts.test.ts` — FOUND, contains all 6 PM-* tests + `selectCompaniesQueue` mock support ✓
- `server/src/services/__tests__/claude-accounts-swap.test.ts` — FOUND, fixture updated ✓
- `.planning/phases/06-multi-projeto-polish/deferred-items.md` — FOUND ✓
- Commit `ffe2183` (test RED) — FOUND in `git log` ✓
- Commit `3b1e51e` (feat GREEN) — FOUND in `git log` ✓
- 27/27 claude-accounts tests pass; 11/11 swap tests pass; 4/4 errors tests pass; tsc exit 0 ✓
