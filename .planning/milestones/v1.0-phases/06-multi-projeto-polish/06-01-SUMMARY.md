---
phase: 06-multi-projeto-polish
plan: 01
subsystem: db-schema
tags: [schema, migration, drizzle, multi-project, pool-config]
status: complete
requirements: [PROJ-02]
dependency_graph:
  requires:
    - "Phase 5 schemas (claude_accounts created in 05-01)"
    - "drizzle-kit generate pipeline (Phase 2 DB-01..05)"
  provides:
    - "companies.claudeAccountPoolMode (text, default 'per_company')"
    - "claude_accounts.scope (text, default 'company')"
    - "Drizzle migration 0072_clumsy_leader.sql"
  affects:
    - "Plan 06-03 (selectActiveAccount) — Wave 2 consumer"
    - "Plan 06-04 (UI pool mode toggle + scope radio) — Wave 2 consumer"
    - "Plan 06-02 (cost attribution) — independent, ran in parallel"
tech_stack:
  added: []
  patterns:
    - "Drizzle column addition via additive ALTER TABLE (no destructive ops)"
    - "Application-level enum validation (no CHECK constraint hard) — same as status field"
key_files:
  created:
    - "packages/db/src/migrations/0072_clumsy_leader.sql"
    - "packages/db/src/migrations/meta/0072_snapshot.json"
  modified:
    - "packages/db/src/schema/companies.ts (+7 lines: claudeAccountPoolMode column + JSDoc)"
    - "packages/db/src/schema/claude_accounts.ts (+12 lines: scope column + JSDoc + table-level doc)"
    - "packages/db/src/migrations/meta/_journal.json (+entry idx 72)"
decisions:
  - "Default 'per_company' / 'company' — preserves Phase 5 isolation byte-for-byte; opt-in shared mode is operator decision"
  - "Migration NOT applied locally (DB-03 / D-03) — CI-only via .github/workflows/db-migrate.yml"
  - "No new index for scope filter (selectivity 2 values; existing companyStatusIdx suffices for Wave 2 query plan; revisit if 06-03 tests show slow query)"
  - "JSDoc on claude_accounts table-level block updated with scope bullet for discoverability"
metrics:
  duration: "~7 min"
  completed_date: "2026-04-26"
  task_count: 3
  file_count: 5
  parallel_with: ["06-02"]
---

# Phase 6 Plan 01: Pool Config Schema Foundation Summary

Two-column schema addition that unlocks PROJ-02 (per-company vs shared pool toggle) without touching runtime; defaults preserve Phase 5 behavior so Wave 2 (06-03 service + 06-04 UI) can opt-in to shared semantics explicitly.

## What Was Built

### `companies.claudeAccountPoolMode` (Task 1, commit `7e38f8d`)

Added one column to `packages/db/src/schema/companies.ts` immediately after `brandColor`:

```typescript
/**
 * Phase 6 / D-04 / PROJ-02. Valores aceitos:
 * - 'per_company' (default): isolamento total — contas filtradas por companyId + scope='company'
 * - 'shared': permite usar contas com scope='shared' além das próprias
 * Validação aplicacional, sem CHECK constraint hard.
 */
claudeAccountPoolMode: text("claude_account_pool_mode").notNull().default("per_company"),
```

No other field touched; index `companies_issue_prefix_idx` intact; no new imports needed (`text` already imported).

### `claude_accounts.scope` (Task 2, commit `6da289a`)

Added one column to `packages/db/src/schema/claude_accounts.ts` immediately after `status`:

```typescript
/**
 * Phase 6 / D-05 / D-08 / PROJ-02. Valores aceitos:
 * - 'company' (default): exclusiva da companyId declarada (semântica Fase 5)
 * - 'shared': qualquer company com claudeAccountPoolMode='shared' pode usá-la;
 *   companyId continua marcando o owner.
 * Migração Fase 5→6: registros existentes adquirem default 'company' sem
 * precisar de UPDATE explícito (D-08).
 */
scope: text("scope").notNull().default("company"),
```

Plus a one-line bullet added to the table-level JSDoc block (under the `status` description) so the new field is discoverable from the file header.

All 3 existing indexes preserved (`claude_accounts_company_status_idx`, `claude_accounts_company_exhausted_idx`, `claude_accounts_config_dir_slug_unq`); both FKs (`companyId → companies.id`, `ownerUserId → user.id`) intact; no new imports.

### Migration `0072_clumsy_leader.sql` (Task 3, commit `5969f67`)

Generated via `pnpm db:generate` (loaded `.env.local` for `SUPABASE_DB_URL` / `DATABASE_URL`). Final SQL is exactly 2 statements, byte-for-byte:

```sql
ALTER TABLE "claude_accounts" ADD COLUMN "scope" text DEFAULT 'company' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "claude_account_pool_mode" text DEFAULT 'per_company' NOT NULL;
```

Drizzle-kit emitted clean output — zero phantom DDL (unlike 05-01 / 0071_lively_azazel which required curation 242→62 lines). Snapshot `meta/0072_snapshot.json` and journal entry `idx: 72` generated automatically.

Migration NOT applied locally — DB-03 keeps Supabase apply gated to `.github/workflows/db-migrate.yml` on merge to `main`. Plan 06-05 will validate post-merge via SQL against Supabase.

## Verification

- `grep -c "claudeAccountPoolMode" packages/db/src/schema/companies.ts` → 1 ✓
- `grep -c "claude_account_pool_mode" packages/db/src/schema/companies.ts` → 1 ✓
- `grep -c "scope: text" packages/db/src/schema/claude_accounts.ts` → 1 ✓
- `grep -c 'default("company")' packages/db/src/schema/claude_accounts.ts` → 1 ✓
- `cd packages/db && npx tsc --noEmit` → exit 0 (clean) ✓
- `grep -c "ALTER TABLE" packages/db/src/migrations/0072_clumsy_leader.sql` → 2 ✓
- `_journal.json` contains `"idx": 72` ✓
- All 3 existing claude_accounts indexes still declared ✓
- FK `references(() => companies.id)` on companyId still present ✓

## Decisions Made

### Defaults preserve Phase 5 semantics

Both new columns default to the value that reproduces pre-Phase-6 behavior exactly (`per_company` + `company`). Operators must explicitly opt in to shared mode via UI (Plan 06-04). Migration of existing rows is automatic — no `UPDATE` statement needed (D-08).

### No new index for scope

`scope` has selectivity 2 (binary domain). Existing `claude_accounts_company_status_idx` (`companyId, status`) already covers the predicate Wave 2 will use:

- per_company branch: `WHERE companyId = ? AND status = 'live' AND scope = 'company'` — index used for first two cols, scope filter is post-index linear scan over small result set
- shared branch: `WHERE (companyId = ? AND scope = 'company') OR scope = 'shared'` — OR splits but companyStatusIdx still drives the first arm

If Plan 06-03 tests show slow query plans, an additional `(scope, status)` partial index can be added in a future micro-plan without breaking the contract here.

### Migration name is auto-generated

Drizzle-kit chose `clumsy_leader` randomly — convention is to accept what the generator emits (precedent: `lively_azazel` in 0071). Renaming would require manual journal/snapshot edits with no benefit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocker] Drizzle-kit invocation needed env injection**

- **Found during:** Task 3
- **Issue:** `pnpm db:generate` failed cold with "drizzle-kit requires SUPABASE_DB_URL or DATABASE_URL" — no script in repo auto-loads `.env.local` before drizzle-kit runs (drizzle.config.ts L17 fail-fast pattern from 02-03).
- **Fix:** Exported the two URL vars inline before invocation: `export $(grep -E "^(DATABASE_URL|SUPABASE_DB_URL)=" .env.local | xargs -d '\n') && pnpm db:generate`. No change to repo scripts — this is the established pattern and `.env.example` line in the error message documents it.
- **Files modified:** none (one-off shell pattern, not committed)
- **Commit:** N/A

### Things that were not deviations (worth noting)

- `pnpm --filter @paperclipai/db tsc --noEmit` returned "None of the selected packages has a 'tsc' script" — used `cd packages/db && npx tsc --noEmit` instead. Both invoke the same compiler; verification result unchanged (exit 0).
- Sibling plan 06-02 (running in parallel per `<parallel_execution>` directive) committed `827b733` between Task 1 and Task 2 here. Files are disjoint (06-02 touches services/cost aggregation tests; 06-01 touches schemas/migrations). No merge conflict; no coordination needed.

## Forward Dependencies

Wave 2 plans can now consume:

- **06-03 (selectActiveAccount):** Read `companies[companyId].claudeAccountPoolMode` then branch query on `claude_accounts.scope` per D-06 algorithm.
- **06-04 (UI):** Render pool mode toggle in `CompanySettings.tsx` reading/writing `claudeAccountPoolMode`; render scope radio in `ClaudeAccounts.tsx` register form reading/writing `scope`.
- **06-05 (post-merge validation):** SQL against Supabase to confirm migration applied cleanly.

## Self-Check: PASSED

- `packages/db/src/schema/companies.ts` — FOUND, contains `claudeAccountPoolMode` ✓
- `packages/db/src/schema/claude_accounts.ts` — FOUND, contains `scope: text` ✓
- `packages/db/src/migrations/0072_clumsy_leader.sql` — FOUND, contains both ALTER TABLE ✓
- `packages/db/src/migrations/meta/0072_snapshot.json` — FOUND ✓
- `packages/db/src/migrations/meta/_journal.json` — contains `"idx": 72` ✓
- Commit `7e38f8d` — FOUND in `git log` ✓
- Commit `6da289a` — FOUND in `git log` ✓
- Commit `5969f67` — FOUND in `git log` ✓
