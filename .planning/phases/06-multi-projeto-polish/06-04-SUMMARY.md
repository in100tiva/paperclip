---
phase: 06-multi-projeto-polish
plan: 04
subsystem: ui-multi-project
tags:
  - phase-6
  - proj-02
  - proj-03
  - ui
  - companies
  - claude-accounts
  - cost-summary
  - pool-mode
  - scope
requirements:
  - PROJ-02
  - PROJ-03
dependency_graph:
  requires:
    - 06-01 (companies.claudeAccountPoolMode + claude_accounts.scope columns)
    - 06-02 (GET /cost-summary endpoint server-side)
  provides:
    - "UI: pool mode toggle in CompanySettings"
    - "UI: scope radio + shared badge in ClaudeAccounts register/list"
    - "UI: cost summary section in ClaudeAccounts consuming GET /cost-summary"
    - "Server route POST /claude-accounts accepts scope (default 'company')"
    - "Server route PATCH /claude-accounts accepts scope (mid-life promotion)"
    - "Shared validator updateCompanySchema accepts claudeAccountPoolMode"
    - "Shared Company type carries claudeAccountPoolMode"
  affects:
    - "06-05 smoke can exercise both PROJ-02 toggle paths and PROJ-03 cost endpoint via UI"
tech_stack:
  added: []
  patterns:
    - "Form scope radio inside register form, native HTML radios with data-testid"
    - "Locale-agnostic test assertions for thousand-separator formatting via toLocaleString()"
    - "Optional fields on Zod schemas with .default() to preserve back-compat for existing clients"
key_files:
  created: []
  modified:
    - packages/shared/src/validators/company.ts
    - packages/shared/src/types/company.ts
    - server/src/routes/claude-accounts.ts
    - server/src/services/companies.ts
    - ui/src/api/claude-accounts.ts
    - ui/src/api/companies.ts
    - ui/src/pages/CompanySettings.tsx
    - ui/src/pages/ClaudeAccounts.tsx
    - ui/src/pages/ClaudeAccounts.test.tsx
    - ui/storybook/fixtures/paperclipData.ts
decisions:
  - "Cost summary rendered as a section inside ClaudeAccounts.tsx (not a new page) — D-12; minimizes navigation, groups all Claude account management in one place."
  - "Pool mode toggle placed in CompanySettings.tsx — D-07; settings is the canonical location for company-wide configuration."
  - "PATCH /claude-accounts also accepts scope (D-05 mid-life promotion) for symmetry with create — operator can flip an existing account between scopes without delete-and-recreate."
  - "Default scope='company' is server-applied via Zod .default() on createAccountSchema — UI may omit the field and the legacy behavior is preserved."
  - "Cost summary token formatting uses toLocaleString(); tests assert via the same call to stay locale-agnostic (jsdom uses host ICU)."
  - "Storybook Company fixtures hydrated with claudeAccountPoolMode='per_company' (Rule 3 blocker fix once the field became required on the Company type)."
metrics:
  duration_minutes: 12
  completed_date: "2026-04-26"
  tasks_completed: 2
  files_changed: 10
  commits:
    - hash: "860be18"
      message: "feat(06-04): accept scope + claudeAccountPoolMode in API contracts"
    - hash: "fcba897"
      message: "feat(06-04): UI for pool mode toggle, scope radio, and cost summary"
---

# Phase 6 Plan 04: Multi-Project UI (pool mode + scope + cost summary) Summary

PROJ-02/PROJ-03 user-facing surface delivered: CompanySettings exposes the pool-mode toggle (`per_company` | `shared`), the ClaudeAccounts register form accepts scope (`company` | `shared`) with a corresponding shared badge in the listing table, and a new Cost summary section consumes the GET `/cost-summary` endpoint shipped by 06-02.

## What Was Built

### Task 1 — API Contracts (commit `860be18`)

**`packages/shared/src/validators/company.ts`** — `updateCompanySchema` gains an optional `claudeAccountPoolMode: z.enum(["per_company", "shared"])`. PATCH `/api/companies/:companyId` round-trips the field through the existing `companies` service spread.

**`packages/shared/src/types/company.ts`** — `Company.claudeAccountPoolMode: "per_company" | "shared"` is now required on the type, so UI consumers (CompanySettings, switcher state) can read it without casting. Storybook fixtures were updated as a Rule 3 fix to keep the type system green.

**`server/src/routes/claude-accounts.ts`** — Three changes:
1. `createAccountSchema` accepts optional `scope` with `.default("company")` so legacy clients keep their semantics.
2. The POST handler passes `body.scope` into the `claude_accounts` insert.
3. `patchAccountSchema` also accepts optional `scope`, and the PATCH handler propagates it into the `updates` object — operators can promote an existing `company`-scoped account to `shared` without delete-and-recreate.

**`server/src/services/companies.ts`** — Adds `claudeAccountPoolMode: companies.claudeAccountPoolMode` to the `companySelection` so GET responses carry the field. The existing `update` flow already passes it through via `...companyPatch` — no further wiring needed.

### Task 2 — UI Surface (commit `fcba897`)

**`ui/src/api/claude-accounts.ts`** — Type extensions:
- `ClaudeAccountScope = "company" | "shared"`
- `ClaudeAccount.scope: ClaudeAccountScope`
- `CreateClaudeAccountInput.scope?` (optional — server defaults)
- `PatchClaudeAccountInput.scope?` (mid-life promotion)
- New helper: `claudeAccountsApi.costSummary(companyId, range?)` returning `{ rows: CostSummaryRow[] }` and serializing optional `from`/`to` query params.

**`ui/src/api/companies.ts`** — `companiesApi.update` Pick includes `claudeAccountPoolMode`.

**`ui/src/pages/CompanySettings.tsx`** — Pool mode toggle (D-07):
- New `useState<"per_company" | "shared">` initialized from `selectedCompany.claudeAccountPoolMode`
- Hydration in the existing `useEffect([selectedCompany])` block
- `generalDirty` extended to compare against the company's current value
- `generalMutation.mutationFn` payload type extended with `claudeAccountPoolMode`
- `handleSaveGeneral` includes the value
- New section "Claude Account Pool" with two radio inputs (`pool-mode-per-company`, `pool-mode-shared`), placed after Hiring per D-07's "settings is the canonical place"

**`ui/src/pages/ClaudeAccounts.tsx`** — Three additions in one file:
1. **Scope radio** in the register form — new `<div>` row below the existing `grid-cols-[1fr_1fr_auto]` block; `data-testid="scope-company"` / `"scope-shared"`. The form layout was wrapped in a `<div className="space-y-3">` and the inner grid kept intact, so visual width and spacing of label/slug/Register survive untouched.
2. **Scope column** in the Accounts table — header "Scope" cell + body cell rendering `<Badge variant="secondary">shared</Badge>` for `scope='shared'` and a muted `"company"` text otherwise. Each cell exposes `data-scope` for assertions.
3. **Cost summary section** between the Accounts table and Rotation history. Three states: loading, empty (`data-testid="costs-empty"`), populated (`data-testid="costs-table"`). Columns: Account / Cost (USD, 4 decimals) / Input tokens / Output tokens / Steps. Numeric columns formatted via `toLocaleString()`.
4. New `useQuery` for `costsKey` keyed by `["claude-accounts", "cost-summary", companyId]`.
5. `createMutation`'s `mutationFn` and `handleSubmit` thread the `scope` field through to the API call. `onSuccess` resets `newScope` back to `"company"`.

**`ui/src/pages/ClaudeAccounts.test.tsx`** — 4 new test cases (5 existing kept intact, 9 total now passing):
- `renders cost summary table when rows present` — mocks 2 rows, asserts `[data-testid="costs-table"]` exists, account labels and formatted token counts render. Uses `toLocaleString()` for the expected formatting to stay locale-agnostic in jsdom (initially asserted literal `"12,345"` and failed against jsdom's default ICU rendering as `"12.345"` — fixed Rule 1).
- `renders empty cost summary state when no rows` — mocks `{ rows: [] }`, asserts `[data-testid="costs-empty"]`.
- `submits register form with scope=shared when shared radio selected` — clicks the `scope-shared` radio, submits, asserts `createMock` was called with `scope: "shared"`.
- `renders shared badge for accounts with scope=shared` — mocks two accounts (one shared, one company), asserts the shared badge and muted `"company"` text render via `[data-scope]` selectors.

The existing register-form test was updated to expect `scope: "company"` in the payload (the new default).

The mock module `vi.mock("@/api/claude-accounts")` gained a `costSummary` entry; the `beforeEach` hook resets `costSummaryMock` to `{ rows: [] }`; `makeAccount()` factory now defaults `scope: "company"` (the new required field on `ClaudeAccount`).

**`ui/storybook/fixtures/paperclipData.ts`** — Three fixture companies hydrated with `claudeAccountPoolMode: "per_company"` to satisfy the now-required `Company` type field.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Storybook Company fixtures missing claudeAccountPoolMode**
- **Found during:** Task 2 typecheck (`pnpm --filter @paperclipai/ui exec tsc --noEmit`)
- **Issue:** Adding `claudeAccountPoolMode` as a required field on `Company` (so CompanySettings can read it without an unsafe cast) broke storybook fixtures — three companies in `ui/storybook/fixtures/paperclipData.ts` lacked the property.
- **Fix:** Added `claudeAccountPoolMode: "per_company"` to all three fixtures via `replace_all` on the shared `logoAssetId: null,\n    logoUrl: null,\n    createdAt:` anchor.
- **Files modified:** `ui/storybook/fixtures/paperclipData.ts`
- **Commit:** `fcba897` (folded in)

**2. [Rule 1 - Bug] Cost summary token assertion failed against jsdom locale**
- **Found during:** Task 2 vitest run
- **Issue:** Test asserted `expect(textContent).toContain("12,345")` but jsdom's default ICU locale rendered `(12345).toLocaleString()` as `"12.345"` (German-style). Test failed.
- **Fix:** Replaced literal string assertions with computed expectations using the same `toLocaleString()` call the component uses. Test is now host-locale-agnostic.
- **Files modified:** `ui/src/pages/ClaudeAccounts.test.tsx`
- **Commit:** `fcba897` (folded in)

**3. [Rule 2 - Critical Functionality] PATCH scope field**
- **Found during:** Task 1 design review
- **Issue:** Plan made `scope` optional in `patchAccountSchema` listed as "Optional", framed as a discretion call. Without it, operators have no path from `scope='company'` to `scope='shared'` for an existing account other than disable + delete + recreate.
- **Fix:** Added `scope` to `patchAccountSchema` and propagated it to the `updates` object in the PATCH handler. Symmetric with create; preserves D-05's "mid-life mudança" framing.
- **Files modified:** `server/src/routes/claude-accounts.ts`
- **Commit:** `860be18`

### Honest Notes

- The pre-existing TypeScript error in `server/src/services/claude-accounts.test.ts` (`Property 'tableSelects' does not exist`) is from sibling plan 06-03 running in parallel and is **out of scope** for this plan. Confirmed by stashing our changes — the error remained. No action taken.
- No checkpoints in this plan; auto mode active and constraints from `<critical_constraint>` honored verbatim (UI labels in English, pool toggle in CompanySettings, scope radio in ClaudeAccounts, cost summary as section in ClaudeAccounts).

## Self-Check: PASSED

Verifications run after writing this summary:

- `[ -f packages/shared/src/validators/company.ts ]` → FOUND, contains `claudeAccountPoolMode`
- `[ -f packages/shared/src/types/company.ts ]` → FOUND, `Company.claudeAccountPoolMode` declared
- `[ -f server/src/routes/claude-accounts.ts ]` → FOUND, scope on POST + PATCH
- `[ -f ui/src/pages/CompanySettings.tsx ]` → FOUND, 11 occurrences of `claudeAccountPoolMode`
- `[ -f ui/src/pages/ClaudeAccounts.tsx ]` → FOUND, `costs-table`, `costs-empty`, `data-scope`, `newScope`
- `[ -f ui/src/pages/ClaudeAccounts.test.tsx ]` → FOUND, 9 tests pass
- `git log | grep 860be18` → FOUND
- `git log | grep fcba897` → FOUND
- `pnpm --filter @paperclipai/ui exec tsc --noEmit` → exit 0
- `pnpm --filter @paperclipai/ui exec vitest run ClaudeAccounts` → 9/9 passing
