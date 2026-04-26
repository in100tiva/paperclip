---
phase: 08-traducao-ui-core
plan: 01
subsystem: ui
tags: [i18n, i18next, react-i18next, inbox, ui-translation, pt-BR, en-US]

requires:
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: i18next singleton + 8 namespaces + missing-keys CI detector + I18nextProvider mounted globally + session-driven hydration

provides:
  - inbox.json populated with 149 keys (pt-BR + en-US, fully mirrored)
  - common.actions sub-tree extended with 7 shared button keys (preserves Phase 7 keys)
  - 7 Inbox-surface TSX files migrated to useTranslation/t() (Inbox.tsx + IssuesList.tsx + 5 child components)
  - InboxList.translation.test.tsx RTL test asserting both locales render correctly
  - 4 existing test files adapted (Rule 1 fixes) so the suite stays GREEN after the strings flipped to t()
  - Pattern reference for Plans 08-02..08-04: dictionary-first commit, then surface migration, then RTL probe test

affects:
  - 08-02-projects (will mirror this approach for projects.json + ProjectDetail/NewProjectDialog migration)
  - 08-03-settings (mirror approach for settings.json extension + Instance{General,Experimental,Settings}.tsx migration)
  - 08-04-navegacao (mirror approach for common.nav.* sub-tree + Sidebar/Header/BreadcrumbBar migration)
  - Issues page + ProjectDetail (IssuesList.tsx is shared; both inherit translation for free)

tech-stack:
  added: []  # No new dependencies — uses Phase 7 i18next + react-i18next foundation
  patterns:
    - "useTranslation(['inbox', 'common']) header in every translated component (canonical from ProfileSettings.tsx Phase 7)"
    - "kebab-case dot-notation keys with namespace prefix (inbox:filters.live-runs-only) — required by missing-keys.test.ts:6 regex"
    - "Static array → render-time t() for column metadata (IssueColumns.tsx ISSUE_COLUMN_IDS pattern, addresses RESEARCH Pitfall 1)"
    - "setBreadcrumbs([{ label: t('inbox:title') }]) with [setBreadcrumbs, t] dependency array (RESEARCH Pitfall 2)"
    - "Optional translate parameter on shared utility fns (formatJoinRequestInboxLabel) — fallback for pre-migration callers"
    - "Test fixtures wrap render in <I18nextProvider i18n={i18n}> + beforeAll changeLanguage('en-US') for English-asserting tests"

key-files:
  created:
    - "ui/src/components/inbox/__tests__/InboxList.translation.test.tsx — RTL probe asserting 12 keys resolve in both pt-BR + en-US"
  modified:
    - "ui/src/i18n/locales/pt-BR/inbox.json — 149 keys (was {})"
    - "ui/src/i18n/locales/en-US/inbox.json — 149 keys mirrored (was {})"
    - "ui/src/i18n/locales/pt-BR/common.json — added actions.* sub-tree (7 keys)"
    - "ui/src/i18n/locales/en-US/common.json — added actions.* sub-tree (7 keys)"
    - "ui/src/pages/Inbox.tsx — 2563 LOC migrated; 4 inner row components + main Inbox fn use t()"
    - "ui/src/components/IssuesList.tsx — 1311 LOC migrated; covers Inbox + ProjectDetail + Issues page"
    - "ui/src/components/IssueRow.tsx — aria-labels via t()"
    - "ui/src/components/IssueFiltersPopover.tsx — all 13 filter labels + remove-creator aria"
    - "ui/src/components/IssueColumns.tsx — column picker labels/descriptions via t() with ISSUE_COLUMN_IDS array"
    - "ui/src/components/SwipeToArchive.tsx — Archive label via t()"
    - "ui/src/components/IssueGroupHeader.tsx — no migration needed (label comes via prop, callers translate)"
    - "ui/src/components/IssueFiltersPopover.test.tsx — Rule 1 fix: I18nextProvider wrap, assert pt-BR text"
    - "ui/src/components/IssueRow.test.tsx — Rule 1 fix: I18nextProvider wrap, beforeAll en-US"
    - "ui/src/components/IssuesList.test.tsx — Rule 1 fix: I18nextProvider wrap in helper, beforeAll en-US"
    - "ui/src/pages/Inbox.test.tsx — Rule 1 fix: I18nextProvider wrap, beforeAll en-US for InboxIssueMetaLeading"

key-decisions:
  - "Translate IssuesList.tsx fully in this plan even though it is shared with ProjectDetail and Issues page (RESEARCH Open Question #2): marginal cost is low and avoids churn in 08-02"
  - "Refactor IssueColumns.tsx column metadata from static labels Record to ISSUE_COLUMN_IDS array + render-time t() lookup, addressing RESEARCH Pitfall 1 head-on"
  - "Make formatJoinRequestInboxLabel accept an optional translate fn rather than thread useTranslation through; preserves backward-compat for any non-React callers and keeps the export signature stable"
  - "issueActivityText kept as English-only with `// i18n: review` comment — caller can opt into translation; deferring full refactor to v2 (L10N-03) per CONTEXT D-01 strings dynâmicas complexas"

patterns-established:
  - "Dictionary-first migration: Task 1 lands all keys in both locales (pt-BR + en-US, full parity), Task 2 swaps strings to t() calls, Task 3 adds RTL test. This sequence keeps missing-keys.test.ts CI=true GREEN at every commit."
  - "Probe-component RTL test: render a tiny consumer using useTranslation([ns]) and assert testid'd spans match expected pt-BR / en-US strings. Avoids Radix portal edge cases in jsdom while covering the round-trip (key in JSON → t() lookup → render)."
  - "Pre-existing tests adapt by wrapping render(...) in <I18nextProvider i18n={i18n}> and choosing a deterministic locale via beforeAll(async () => i18n.changeLanguage('en-US' | 'pt-BR'))."

requirements-completed: [UI-01]

duration: ~75min
completed: 2026-04-26
---

# Phase 8 Plan 01: Inbox Translation Summary

**Inbox surface (Inbox.tsx + IssuesList.tsx + 5 child components) fully translated to pt-BR / en-US via 149-key inbox.json dictionary; CI missing-keys detector GREEN; full UI suite 639/639 GREEN.**

## Performance

- **Duration:** ~75 min
- **Started:** 2026-04-26T17:53Z
- **Completed:** 2026-04-26T19:07Z
- **Tasks:** 3
- **Files modified:** 14 (5 new, 9 modified)
- **Files created:** 1 (the new RTL test)
- **Commits:** 3 task commits + this docs commit

## Accomplishments

- 149 keys in `inbox` namespace (well over the ~120 target) covering tabs, search, categories, filters, actions, approval-status, empty-states, failed-run/join-request/approval rows, alerts, dialog, group dividers, errors, columns metadata, list toolbar, badges
- 7 keys added to `common.actions.*` (select-all, deselect-all, apply, clear, filter, close, remove) — preserves Phase 7 keys (app-name, loading, save, cancel)
- Full pt-BR ↔ en-US key parity (zero drift, validated programmatically)
- 7 Inbox-surface TSX files migrated to `useTranslation` + `t()`:
  - `Inbox.tsx` (2563 LOC) — 4 inner row components (FailedRunInboxRow, ApprovalInboxRow, JoinRequestInboxRow) + main Inbox function
  - `IssuesList.tsx` (1311 LOC) — toolbar, sort/group dropdowns, search input, no-issues empty state, paused badge, assignee popover, group labels (covers Inbox + ProjectDetail + Issues page in one go)
  - `IssueFiltersPopover.tsx` — 13 filter labels + remove-creator aria
  - `IssueColumns.tsx` — column picker via render-time `t()` keyed by stable column ID
  - `IssueRow.tsx` — aria-labels (Mark as read, Dismiss from inbox)
  - `SwipeToArchive.tsx` — Archive overlay label
  - `IssueGroupHeader.tsx` — no migration needed (label is a passthrough prop)
- New RTL test `InboxList.translation.test.tsx` (probe component approach) covers UI-01 truth #1 in automated form
- 4 existing tests fixed (Rule 1): wrapped renders in `<I18nextProvider i18n={i18n}>`, switched assertions to deterministic locale via `beforeAll`

## Task Commits

Each task was committed atomically:

1. **Task 1: Bootstrap dictionaries inbox + common extensions** — `4fb6d5e` (feat)
2. **Task 2: Migrate Inbox surface to useTranslation t() calls** — `5f5abd4` (feat)
3. **Task 3: RTL test InboxList.translation.test.tsx + adapt existing tests** — `555ede0` (test)

## Files Created/Modified

### Created

- `ui/src/components/inbox/__tests__/InboxList.translation.test.tsx` — RTL probe component, 2 tests (pt-BR + en-US), 12 representative keys

### Modified — Dictionaries

- `ui/src/i18n/locales/pt-BR/inbox.json` — 0 → 149 keys
- `ui/src/i18n/locales/en-US/inbox.json` — 0 → 149 keys (mirrored)
- `ui/src/i18n/locales/pt-BR/common.json` — added `actions.*` sub-tree (7 keys)
- `ui/src/i18n/locales/en-US/common.json` — added `actions.*` sub-tree (7 keys)

### Modified — UI

- `ui/src/pages/Inbox.tsx` — useTranslation header + ~50 `t()` call sites
- `ui/src/components/IssuesList.tsx` — useTranslation header + ~25 `t()` call sites
- `ui/src/components/IssueFiltersPopover.tsx` — useTranslation header + ~16 `t()` call sites
- `ui/src/components/IssueColumns.tsx` — refactored column metadata to ISSUE_COLUMN_IDS + `t()` lookups; useTranslation in 3 sub-components
- `ui/src/components/IssueRow.tsx` — useTranslation header + 2 `t()` call sites
- `ui/src/components/SwipeToArchive.tsx` — useTranslation header + 1 `t()` call site

### Modified — Tests

- `ui/src/components/IssueFiltersPopover.test.tsx` — Rule 1 fix
- `ui/src/components/IssueRow.test.tsx` — Rule 1 fix
- `ui/src/components/IssuesList.test.tsx` — Rule 1 fix
- `ui/src/pages/Inbox.test.tsx` — Rule 1 fix

## Decisions Made

- **Cover IssuesList.tsx fully despite shared usage** (RESEARCH Open Question #2): the file is referenced from Inbox + ProjectDetail + Issues page; translating it once in 08-01 saves churn in 08-02 and Phase 9. Marginal cost low — single file, well-bounded.
- **IssueColumns.tsx refactor to ISSUE_COLUMN_IDS array + render-time t()**: directly addresses RESEARCH Pitfall 1 (strings in JS literal arrays bypass missing-keys regex). Keeps column id stable while making labels live-translated.
- **formatJoinRequestInboxLabel with optional translate parameter** instead of converting to a hook: preserves the function's `export` signature (used by Inbox.tsx tests in 4 places) and avoids forcing the translate dependency on any non-React caller. Includes a deterministic English fallback for tests that pass no translator.
- **issueActivityText kept English-only** with explicit `// i18n: review` comment: it returns "Updated {{when}}" used in mobileMeta which gets `.toLowerCase()`'d (line 1166) — translating now risks breaking that assumption. Defer to v2 L10N-03 (CONTEXT D-01 complex template).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test fixture] runFailureMessage signature changed to accept fallback string**
- **Found during:** Task 2 (migrating FailedRunInboxRow)
- **Issue:** runFailureMessage hardcoded the English fallback `"Run exited with an error."`. Translating inline would require importing useTranslation in a non-component fn.
- **Fix:** Added `fallback: string` parameter; callers (one in FailedRunInboxRow, one in search filter at line 1099) pass `t("inbox:failed-run.exit-error-fallback")`.
- **Files modified:** ui/src/pages/Inbox.tsx
- **Verification:** UI typecheck exit 0; missing-keys CI=true GREEN; full UI suite 639/639 GREEN
- **Committed in:** `5f5abd4`

**2. [Rule 1 - Test fixture] formatJoinRequestInboxLabel takes optional translate fn**
- **Found during:** Task 2 (migrating JoinRequestInboxRow)
- **Issue:** formatJoinRequestInboxLabel is exported and called from inside a React component. To translate without a hook, needed to thread the translator. But the function is also referenced in Inbox.test.tsx in 4 places without React context.
- **Fix:** Added optional `translate?: JoinRequestLabelTranslate` parameter with English fallback for non-translated callers. Loose `(key: any, options?: any) => string` signature avoids friction with i18next's typed `t`. Caller in JoinRequestInboxRow passes the live `t`.
- **Files modified:** ui/src/pages/Inbox.tsx
- **Verification:** UI typecheck exit 0; Inbox.test.tsx still passes formatJoinRequestInboxLabel tests without changes
- **Committed in:** `5f5abd4`

**3. [Rule 1 - Test fixture] 4 pre-existing tests broke after t() migration; wrapped in I18nextProvider**
- **Found during:** Task 3 (running full UI suite to confirm zero regressions)
- **Issue:** 12 tests across IssueFiltersPopover.test.tsx, IssueRow.test.tsx, IssuesList.test.tsx, Inbox.test.tsx asserted on hardcoded English strings (e.g. `aria-label="Mark as read"`, `textContent toContain "Live"`). After Task 2, those strings were rendered via `t()`. With no I18nextProvider, react-i18next emitted `NO_I18NEXT_INSTANCE` warnings and rendered raw key strings (`inbox:filters.title`).
- **Fix:** Wrapped renders in `<I18nextProvider i18n={i18n}>` (using shared singleton). Added `beforeAll(async () => i18n.changeLanguage('en-US'))` for tests that explicitly assert English text. IssueFiltersPopover.test asserted on `'Apenas execuções ao vivo'` (pt-BR — i18n init default per Phase 7 SETTINGS-03) since the test only verifies that *some* translated label is present in the popover content.
- **Files modified:** 4 test files
- **Verification:** Full UI suite 639/639 GREEN (was 627/639 with 12 failures)
- **Committed in:** `555ede0`

---

**Total deviations:** 3 auto-fixes (all Rule 1 — pre-existing fixtures depended on hardcoded strings).
**Plan impact:** No scope expansion. All fixes preserve existing behavior; only the test infrastructure had to learn that strings now flow through i18next.

## Issues Encountered

- **First RTL approach (real `IssueFiltersPopover` render) hit Radix Popover portal edge cases in jsdom**: the popover content is conditionally portal-rendered after click, and `userEvent.click` couldn't reliably toggle it across two sequential tests. Pivoted to a probe-component approach (`InboxStringsProbe`) that consumes `useTranslation` directly — same coverage of the round-trip (key → JSON → t() → render) without portal flakiness.
- **RTL `cleanup()` not automatic** in this project's Vitest setup — needed to call manually in `afterEach` to avoid `data-testid` collisions across the two language tests.

## Manual Configuration Required

None — no external service configuration needed. UI-only changes.

## Self-Check: PASSED

Verified post-write:

- ✓ `ui/src/i18n/locales/pt-BR/inbox.json` exists, 149 keys parse, contains `title` / `filters` / `categories`
- ✓ `ui/src/i18n/locales/en-US/inbox.json` exists, 149 keys parse, contains `title`
- ✓ pt-BR ↔ en-US inbox.json key sets fully mirrored (zero diff)
- ✓ pt-BR ↔ en-US common.json key sets fully mirrored
- ✓ `ui/src/components/inbox/__tests__/InboxList.translation.test.tsx` exists; contains `i18n.changeLanguage`, `pt-BR`, `en-US`
- ✓ `Inbox.tsx` contains `useTranslation` and ≥5 `t("inbox:` occurrences (actual: 50+)
- ✓ `IssuesList.tsx` contains `useTranslation`
- ✓ `IssueFiltersPopover.tsx` contains `t("inbox:filters.`
- ✓ `IssueRow.tsx` contains `useTranslation`
- ✓ Commits exist: `4fb6d5e`, `5f5abd4`, `555ede0`
- ✓ `pnpm --filter @paperclipai/ui typecheck` exit 0
- ✓ `CI=true npx vitest run missing-keys` exit 0
- ✓ Full UI suite `npx vitest run` exit 0 (118 files, 639 tests, all passing)

## Next Phase Readiness

- **08-02 (Projects)** unblocked: same dictionary-first → migrate → RTL probe pattern applies. The shared `IssuesList.tsx` is already translated, so ProjectDetail.tsx work shrinks to project-specific surfaces (NewProjectDialog, ProjectProperties, ProjectWorkspacesContent).
- **08-03 (Settings)** unblocked: independent file set. Can run in parallel with 08-02 (Wave 2 per CONTEXT § Granularidade).
- **08-04 (Navegação)** unblocked: independent. The `setBreadcrumbs([{ label: t("inbox:title") }])` pattern from this plan is the model for nav 08-04.
- **No blockers** for downstream UAT-08-01 (Inbox 100% pt-BR visual scan) — manual UAT step inherited from RESEARCH §Validation Architecture.

---
*Phase: 08-traducao-ui-core*
*Concluded: 2026-04-26*
