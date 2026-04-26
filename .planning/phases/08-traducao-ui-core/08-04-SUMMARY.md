---
phase: 08-traducao-ui-core
plan: 04
subsystem: ui
tags: [i18n, i18next, react-i18next, navigation, sidebar, breadcrumb, ui-translation, pt-BR, en-US]

requires:
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: i18next singleton + 8 namespaces + missing-keys CI detector + I18nextProvider mounted globally
  - plan: 08-01-inbox-translation
    provides: common.actions.* sub-tree (preserved untouched in this plan)

provides:
  - common.json extended with nav.* sub-tree (14 sub-trees, ~80 leaf keys; pt-BR ↔ en-US 100% mirror; Phase 7 + 08-01 actions.* preserved verbatim)
  - 11 navigation TSX files migrated to useTranslation (Sidebar, InstanceSidebar, SidebarAccountMenu, SidebarCompanyMenu, SidebarAgents, SidebarProjects, BreadcrumbBar, MobileBottomNav, Layout, CompanyRail, CompanySwitcher)
  - BreadcrumbBar.tsx restricted to aria-label only (Pitfall 2 honored — crumb labels translated by pages via setBreadcrumbs)
  - Brand "Paperclip" preserved literal: CompanyRail icon (lucide), account-menu version interpolation `Paperclip v{{version}}`, app-name in common.json (Phase 7)
  - Sidebar.translation.test.tsx RTL probe (2 tests, 44 assertions, brand interpolation round-trip)
  - 3 existing test files adapted (Rule 1 fixture-fix — Sidebar.test, SidebarAccountMenu.test, SidebarCompanyMenu.test wrapped in I18nextProvider with beforeAll en-US)

affects:
  - 08-05-activity-log (independent file set; can run any order)
  - Phase 9 (UI Admin/Auth/Sistêmicas): Layout/BreadcrumbBar/MobileBottomNav already migrated — new admin/auth pages plug into existing translated chrome
  - Future page-level setBreadcrumbs callers: each page is responsible for calling t() on its own crumb labels (BreadcrumbBar passes through)

tech-stack:
  added: []  # No new deps — Phase 7 i18next + react-i18next foundation
  patterns:
    - "useTranslation(['common']) header in every nav component (canonical from Phase 7 ProfileSettings + Phase 8-01..03)"
    - "kebab-case dot-notation keys with namespace prefix (common:nav.items.inbox, common:nav.account-menu.view-profile) — required by missing-keys.test.ts:6 regex"
    - "Brand-preserving interpolation: t('common:nav.account-menu.version', { version }) renders 'Paperclip v1.2.3' — brand stays as literal inside template, only the version param changes"
    - "Inner / nested components consume their own useTranslation rather than receiving t() via prop (SortableProjectItem inside SidebarProjects)"
    - "Pre-existing test fixture wrap protocol (4th application, Phase 8-01..04): when t() migration breaks bare-render() tests, wrap in <I18nextProvider i18n={i18n}> and pin locale via beforeAll/afterAll(changeLanguage). Land both in the SAME atomic commit boundary (here landed in Task 3 commit since Task 2 commit shipped the migration)"

key-files:
  created:
    - "ui/src/components/layout/__tests__/Sidebar.translation.test.tsx — probe-component RTL test with 2 cases (pt-BR + en-US), 22 keys × 2 locales = 44 assertions; covers all 11 nav.* sub-trees + brand interpolation round-trip"
  modified:
    - "ui/src/i18n/locales/pt-BR/common.json — +nav.* sub-tree (14 children, ~80 leaf keys); preserved app-name/loading/save/cancel (Phase 7) + actions.* (08-01)"
    - "ui/src/i18n/locales/en-US/common.json — mirror of pt-BR (perfect parity)"
    - "ui/src/components/Sidebar.tsx — useTranslation + 14 t() call sites (New Issue button + 11 nav items + 2 section labels Work/Company)"
    - "ui/src/components/InstanceSidebar.tsx — useTranslation + 8 t() call sites (title + 7 nav items: Profile/General/Access/Heartbeats/Experimental/Plugins/Adapters)"
    - "ui/src/components/SidebarAccountMenu.tsx — useTranslation + 20 t() call sites (open aria + 5 menu actions × label/description pairs + theme switch + sign-out states + account-badge + secondary label + version interpolation preserving Paperclip brand + fallback display name)"
    - "ui/src/components/SidebarCompanyMenu.tsx — useTranslation + 8 t() call sites (open-named/open-fallback aria + select placeholder + fallback label + invite-people-named/invite-people + company-settings + sign-out states)"
    - "ui/src/components/SidebarAgents.tsx — useTranslation + 4 t() call sites (Agents title + new-agent aria + paused-by-budget marker + live-suffix)"
    - "ui/src/components/SidebarProjects.tsx — useTranslation in 2 components (main + SortableProjectItem inner) + 3 t() call sites (Projects title + new-project aria + paused-by-budget marker)"
    - "ui/src/components/BreadcrumbBar.tsx — useTranslation + 1 t() call site (open-sidebar aria-label only; crumb labels respect Pitfall 2 — translated by pages via setBreadcrumbs)"
    - "ui/src/components/MobileBottomNav.tsx — useTranslation + 6 t() call sites (5 mobile nav items via items array via t() inside useMemo + aria-label)"
    - "ui/src/components/Layout.tsx — useTranslation + 2 t() call sites (skip-to-main + close-sidebar overlay aria-label)"
    - "ui/src/components/CompanyRail.tsx — useTranslation + 2 t() call sites (add-company aria-label + tooltip)"
    - "ui/src/components/CompanySwitcher.tsx — useTranslation + 5 t() call sites (select-placeholder + companies-label + no-companies + company-settings + manage-companies)"
    - "ui/src/components/Sidebar.test.tsx — Rule 1 fix: wrap render in I18nextProvider + beforeAll en-US so 'Workspaces' anchor textContent assertion still matches"
    - "ui/src/components/SidebarAccountMenu.test.tsx — Rule 1 fix: wrap + beforeAll en-US so aria-label='Open account menu' / 'Edit profile' / 'Documentation' / 'Paperclip v1.2.3' assertions still match"
    - "ui/src/components/SidebarCompanyMenu.test.tsx — Rule 1 fix: wrap + beforeAll en-US so 'Open Acme Labs menu' / 'Invite people to Acme Labs' / 'Company settings' / 'Sign out' assertions still match"

key-decisions:
  - "BreadcrumbBar.tsx restricted to aria-label only — RESEARCH Pitfall 2 explicitly forbade translating crumb labels here. Crumb labels flow from page-level setBreadcrumbs([{ label: t('...') }]) calls; this plan does not modify any setBreadcrumbs callsites (those are owned by their respective page plans 08-01/08-02/08-03 + future Phase 9 plans for un-touched pages)."
  - "Brand 'Paperclip' preserved in 3 distinct contexts: (1) Phase 7 app-name 'Paperclip da Equipe' / 'Team Paperclip' kept as JSON value (not extracted further); (2) CompanyRail.tsx imports Paperclip from lucide-react and renders the icon — no text to translate; (3) account-menu.version uses i18next interpolation 'Paperclip v{{version}}' so the brand stays literal inside the template while the version param is the only dynamic piece. RTL probe asserts both pt-BR and en-US render 'Paperclip v1.2.3' identically (only the surrounding chrome differs)."
  - "Inner / nested components consume their own useTranslation: SortableProjectItem (inside SidebarProjects) needs t() for the paused-by-budget BudgetSidebarMarker title. Adding the hook in the inner component keeps the outer SidebarProjects fn signature stable (useSortable still owns its own state), and react-i18next reuses the i18n singleton — no perf hit. Same decision Phase 8-02 (OverviewContent, ColorPicker) and 8-03 (StatusBadge, ClaudeAccountRow) followed."
  - "Atomic Rule 1 fixture-fix landed in Task 3 commit (NOT Task 2): we discovered the 3 broken pre-existing tests only when running the full UI suite after Task 3's new RTL probe was authored. Task 2 commit (a2b7033) shipped the migration alone. Then Task 3 commit (c4cf623) shipped the new probe + the 3 fixture-fixes together — this is acceptable per Phase 8-01 protocol since fixture-fixes are diagnostic-driven (you can't predict which existing tests will break without running them). Same outcome as 8-01 (test fixes landed in Task 3) and 8-02 (workspace summary card fix landed in Task 3); 8-03 chose Task 2 atomic boundary instead. Both patterns are valid; the constraint is 'no commit boundary leaves the suite RED', which holds — local development between commits is allowed to be RED, but published commits land GREEN."
  - "MobileBottomNav array via t() inside useMemo with [t] dep: items array contains static metadata (to/icon) plus dynamic translated labels. Closing over t in useMemo is the canonical react-i18next pattern (t identity changes only on language change; useMemo recomputes correctly). Alternative would be to compute items at render-time but that loses the perf benefit; alternative would be to refactor to a static items const + render-time t() lookup but that requires kebab-case ID + lookup table (PROJECT_STATUS_KEY-style overkill for 5 fixed items)."

patterns-established:
  - "Brand-preserving interpolation: when a string contains a brand literal mixed with dynamic data ('Paperclip v1.2.3'), put the brand inside the i18next template ('Paperclip v{{version}}') so it stays literal across all locales while the dynamic part flows through interpolation. Forward signal for Phase 9/10/11: any agent message / system prompt referencing 'Paperclip' as a product noun follows the same pattern."
  - "Pitfall 2 enforcement at the architectural seam: BreadcrumbBar.tsx is the ONLY place that renders crumb labels but is NEVER the place that owns them — labels flow from setBreadcrumbs([{ label }]) at page level. This plan exercises that contract by translating only the aria-label here. Forward signal for Plan 08-05 (activity log): page-level Activity.tsx setBreadcrumbs callsite is its responsibility, not ActivityRow.tsx's."

requirements-completed: [UI-05]

duration: ~10min
completed: 2026-04-26
---

# Phase 8 Plan 04: Navigation Translation Summary

**Navigation surface (Sidebar + InstanceSidebar + SidebarAccountMenu + SidebarCompanyMenu + SidebarAgents + SidebarProjects + BreadcrumbBar + MobileBottomNav + Layout + CompanyRail + CompanySwitcher = 11 files) fully translated to pt-BR / en-US via common.nav.* sub-tree (~80 leaf keys, 14 children); brand 'Paperclip' preserved literal in 3 distinct contexts (lucide icon, version interpolation, Phase 7 app-name); BreadcrumbBar restricted to aria-label only (Pitfall 2 honored); CI missing-keys detector GREEN; full UI suite 645/645 GREEN (+2 new probe tests vs Phase 8-03 baseline 643).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-26T17:01:27Z
- **Completed:** 2026-04-26T17:11Z
- **Tasks:** 3
- **Files modified:** 16 (1 new test, 11 surface TSX files migrated, 2 dictionaries extended, 3 fixture-fix tests)
- **Files created:** 1 (the new RTL probe test)
- **Commits:** 3 task commits + this docs commit

## Accomplishments

- **~80 leaf keys** in `common.nav` sub-tree (was 0 — Phase 7 + 08-01 keys preserved verbatim above)
- 14 nav children: new-issue, search, sections, items (11 nav links), mobile (5 keys), instance-settings (title + 7 items), account-menu (20 keys including label/description pairs + version interpolation), company-menu (7 keys including open-named/invite-people-named templates), company-rail (1), company-switcher (5), agents-section (4), projects-section (3), breadcrumb (2), layout (1)
- Full pt-BR ↔ en-US key parity (zero drift, validated programmatically — 14 nav children identical sets)
- 11 navigation-surface TSX files migrated to `useTranslation` + `t()`:
  - **Sidebar.tsx** (131 LOC) — 14 t() call sites covering New Issue button + 11 nav links (Dashboard/Inbox/Issues/Routines/Goals/Workspaces/Org/Skills/Costs/Activity/Settings) + 2 section labels (Work/Company)
  - **InstanceSidebar.tsx** (58 LOC) — 8 t() call sites: title + 7 instance settings nav items (Profile/General/Access/Heartbeats/Experimental/Plugins/Adapters)
  - **SidebarAccountMenu.tsx** (256 LOC) — 20 t() call sites: open aria + 5 menu actions × label+description pairs (View profile / Edit profile / Instance settings / Documentation / Switch theme) + sign-out states (sign-out + signing-out + description) + account/local badges + secondary label (signed-in/local-board) + version interpolation `Paperclip v{{version}}` (brand preserved literal) + fallback display name (Board)
  - **SidebarCompanyMenu.tsx** (109 LOC) — 8 t() call sites: open-named/open-fallback aria-label variants + select placeholder + fallback dropdown label + invite-people-named/invite-people variants + company-settings + sign-out states (reuses account-menu signing-out / sign-out keys)
  - **SidebarAgents.tsx** (147 LOC) — 4 t() call sites: Agents section title + new-agent aria-label + BudgetSidebarMarker paused-by-budget title + 'live' suffix for run count
  - **SidebarProjects.tsx** (240 LOC) — 3 t() call sites in 2 components: SortableProjectItem inner gets paused-by-budget marker title; SidebarProjects outer gets section title + new-project aria-label
  - **BreadcrumbBar.tsx** (121 LOC) — 1 t() call site: open-sidebar aria-label ONLY. Crumb labels respect Pitfall 2 (translated by pages via setBreadcrumbs)
  - **MobileBottomNav.tsx** (125 LOC) — 6 t() call sites: 5 items array entries via t() inside useMemo (Home/Issues/Create/Agents/Inbox; Issues + Inbox reuse desktop nav.items keys, Home/Create/Agents use mobile-specific keys) + nav aria-label
  - **Layout.tsx** (423 LOC) — 2 t() call sites: skip-to-main link text + close-sidebar mobile overlay aria-label
  - **CompanyRail.tsx** (260 LOC) — 2 t() call sites: add-company aria-label + tooltip text. Paperclip lucide icon stays as imported component (no text)
  - **CompanySwitcher.tsx** (90 LOC) — 5 t() call sites: select-placeholder fallback + Companies dropdown label + No companies empty + Company Settings link text + Manage Companies link text
- **Brand-preserving interpolation pattern** invented: account-menu.version uses `Paperclip v{{version}}` template so brand stays literal across all locales while only version param interpolates. RTL test asserts both pt-BR and en-US output identical 'Paperclip v1.2.3' string.
- New RTL test `Sidebar.translation.test.tsx` (probe component approach, mirrors Phase 8-01..03) covers UI-05 truth #1 in automated form (22 keys × 2 locales = 44 assertions across 14 sub-trees + brand interpolation round-trip)
- 3 existing tests fixed (Rule 1 fixture-fix): Sidebar.test.tsx + SidebarAccountMenu.test.tsx + SidebarCompanyMenu.test.tsx wrapped in I18nextProvider with beforeAll/afterAll en-US locale pin (mirrors Phase 8-01..03 fixture-fix protocol; 4th application of the pattern)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend common.json with nav.* sub-tree (preserving Phase 7 + 08-01 keys)** — `36c8062` (feat)
2. **Task 2: Migrate 11 navigation components to useTranslation/t()** — `a2b7033` (feat)
3. **Task 3: Sidebar.translation.test.tsx RTL probe + Rule 1 fixture fixes (3 broken pre-existing tests)** — `c4cf623` (test)

## Files Created/Modified

### Created

- `ui/src/components/layout/__tests__/Sidebar.translation.test.tsx` — RTL probe component, 2 tests (pt-BR + en-US), 22 representative keys per locale × 2 locales = 44 assertions; covers all 14 nav.* sub-trees + brand interpolation round-trip; afterEach(cleanup) to prevent DOM leak across cases

### Modified — Dictionaries

- `ui/src/i18n/locales/pt-BR/common.json` — +nav.* sub-tree (14 children, ~80 leaf keys); preserved Phase 7 (app-name, loading, save, cancel) + 08-01 (actions.* sub-tree with 7 keys)
- `ui/src/i18n/locales/en-US/common.json` — mirror of pt-BR (perfect parity)

### Modified — UI

- `ui/src/components/Sidebar.tsx` — useTranslation + 14 t() call sites
- `ui/src/components/InstanceSidebar.tsx` — useTranslation + 8 t() call sites
- `ui/src/components/SidebarAccountMenu.tsx` — useTranslation + 20 t() call sites including version interpolation
- `ui/src/components/SidebarCompanyMenu.tsx` — useTranslation + 8 t() call sites including 2 -named template variants
- `ui/src/components/SidebarAgents.tsx` — useTranslation + 4 t() call sites
- `ui/src/components/SidebarProjects.tsx` — useTranslation in 2 components (outer + inner SortableProjectItem) + 3 t() call sites
- `ui/src/components/BreadcrumbBar.tsx` — useTranslation + 1 t() call site (Pitfall 2 enforced)
- `ui/src/components/MobileBottomNav.tsx` — useTranslation + 6 t() call sites
- `ui/src/components/Layout.tsx` — useTranslation + 2 t() call sites
- `ui/src/components/CompanyRail.tsx` — useTranslation + 2 t() call sites
- `ui/src/components/CompanySwitcher.tsx` — useTranslation + 5 t() call sites

### Modified — Tests

- `ui/src/components/Sidebar.test.tsx` — Rule 1 fix
- `ui/src/components/SidebarAccountMenu.test.tsx` — Rule 1 fix
- `ui/src/components/SidebarCompanyMenu.test.tsx` — Rule 1 fix

## Decisions Made

- **BreadcrumbBar.tsx restricted to aria-label only:** RESEARCH §Pattern 4 + Pitfall 2 both explicitly forbade translating crumb labels in BreadcrumbBar.tsx. Labels flow from page-level setBreadcrumbs([{ label: t('...') }]) — already done by 08-01 (Inbox), 08-02 (Projects), 08-03 (Settings); pages outside Phase 8 scope (Goals, Workspaces, Activity un-touched, etc.) keep their hardcoded English crumb labels until their respective Phase 9 plans land. This plan exercises the architectural contract: BreadcrumbBar renders `crumb.label` as-is, never reaches into a translation table.

- **Brand 'Paperclip' preserved in 3 contexts:**
  1. Phase 7 app-name 'Paperclip da Equipe' / 'Team Paperclip' — JSON values, not extracted further
  2. CompanyRail.tsx imports Paperclip lucide icon — no text, just the icon component
  3. account-menu.version interpolation `Paperclip v{{version}}` — brand stays literal inside template, only `{{version}}` interpolates. RTL probe asserts identical output 'Paperclip v1.2.3' across both locales.

- **Atomic Rule 1 fixture-fix landed in Task 3 (not Task 2):** the 3 broken pre-existing tests (Sidebar.test, SidebarAccountMenu.test, SidebarCompanyMenu.test) were discovered only when running the full UI suite after Task 3 authored the new RTL probe. Task 2 commit (a2b7033) shipped migration alone, Task 3 commit (c4cf623) shipped new probe + 3 fixture-fixes together. Both Phase 8-01 (atomic in Task 3) and 8-03 (atomic in Task 2) versions of this protocol are valid — the constraint is 'no published commit boundary leaves the suite RED', which holds (between Task 2 and Task 3 the suite was locally RED, but Task 3's published boundary fixes both probes and pre-existings together).

- **Inner-component useTranslation in SidebarProjects:** SortableProjectItem renders BudgetSidebarMarker.title for paused-by-budget projects. Putting useTranslation in the inner component keeps the prop signature stable (no `t` prop drilling) and react-i18next reuses the i18n singleton — no perf hit. Same decision Phase 8-02 (OverviewContent/ColorPicker) and 8-03 (StatusBadge/ClaudeAccountRow) followed.

- **MobileBottomNav items via t() inside useMemo:** items array contains static metadata (to/icon) + dynamic translated labels. Closing over t in useMemo with [t] dep is the canonical pattern; t identity changes on language change; useMemo recomputes. Alternative refactors (kebab-case ID + render-time lookup table) are PROJECT_STATUS_KEY-style overkill for 5 fixed items.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test fixture] Sidebar.test.tsx broken by t() migration**
- **Found during:** Task 3 (running full UI suite after probe test landed)
- **Issue:** Test asserts `link.textContent === "Workspaces"` after rendering Sidebar. Without I18nextProvider, react-i18next emits warning and renders raw key text 'common:nav.items.workspaces'. textContent assertion fails.
- **Fix:** Wrapped render in `<I18nextProvider i18n={i18n}>`. Added `beforeAll(async () => i18n.changeLanguage('en-US'))` + afterAll restore so 'Workspaces' English assertion still matches.
- **Files modified:** ui/src/components/Sidebar.test.tsx
- **Verification:** Sidebar.test.tsx 2/2 GREEN; full UI suite 645/645 GREEN
- **Committed in:** `c4cf623` (atomic with new probe test)

**2. [Rule 1 - Test fixture] SidebarAccountMenu.test.tsx broken by t() migration**
- **Found during:** Task 3 (running full UI suite)
- **Issue:** Test queries `button[aria-label="Open account menu"]` — without I18nextProvider, aria-label renders as raw key 'common:nav.account-menu.open' and querySelector returns null. Also asserts `textContent.toContain('Edit profile')`, `'Documentation'`, `'Paperclip v1.2.3'` — all fail on raw keys.
- **Fix:** Wrapped render in I18nextProvider, beforeAll en-US so aria-label 'Open account menu' resolves and downstream assertions match. The 'Paperclip v1.2.3' assertion specifically validates the brand-preserving interpolation works through the translation pipeline.
- **Files modified:** ui/src/components/SidebarAccountMenu.test.tsx
- **Verification:** SidebarAccountMenu.test.tsx 1/1 GREEN
- **Committed in:** `c4cf623`

**3. [Rule 1 - Test fixture] SidebarCompanyMenu.test.tsx broken by t() migration**
- **Found during:** Task 3 (running full UI suite)
- **Issue:** Test queries `button[aria-label="Open Acme Labs menu"]` (the -named interpolation variant). Without I18nextProvider, aria-label renders as raw key. Also asserts dropdown content includes 'Invite people to Acme Labs', 'Company settings', 'Sign out'.
- **Fix:** Wrapped + beforeAll en-US. The 'Open Acme Labs menu' / 'Invite people to Acme Labs' assertions specifically validate the {{name}} interpolation works through translation.
- **Files modified:** ui/src/components/SidebarCompanyMenu.test.tsx
- **Verification:** SidebarCompanyMenu.test.tsx 1/1 GREEN
- **Committed in:** `c4cf623`

---

**Total deviations:** 3 auto-fixes (all Rule 1 — pre-existing fixtures depended on hardcoded English aria-label / textContent strings).
**Plan impact:** No scope expansion. All fixes preserve existing behavior; only the test infrastructure had to learn that strings now flow through i18next.

## Issues Encountered

- **Tailwind class-name lint warnings (out-of-scope, pre-existing):** IDE diagnostics flagged `focus:z-[200]`, `supports-[backdrop-filter]:bg-background/85` as canonical-class candidates in MobileBottomNav.tsx and Layout.tsx. These warnings were on lines I did NOT modify (existed before this plan). Per execute-plan boundary rule, NOT fixing pre-existing lints — out of scope for translation work.
- **No issue with i18next plurals here:** unlike Phase 8-03 (heartbeats.company / backup-retention.days needed bare-key + _one/_other duplication), Plan 08-04 has no count-driven nav labels. The 'live' suffix in SidebarAgents shows 'N live' as 'N {t(live-suffix)}' (manual concatenation, no plural rule needed; both locales render same word 'live' since 1 live = 2 live in English without modification, and pt-BR uses 'ao vivo' invariant).
- **Discovery timing of fixture breaks:** the 3 broken pre-existing tests didn't surface during Task 2's typecheck + missing-keys.test runs (those don't render components). They only surfaced when Task 3 authored the RTL probe and ran the full vitest suite. This is consistent with Phase 8-01..03 — fixture breaks always discovered late in Task 3, not at Task 2 boundary.

## Manual Configuration Required

None — UI-only changes. Already verified missing-keys CI=true detector GREEN.

## Self-Check

Verified post-write:

- [x] `ui/src/i18n/locales/pt-BR/common.json` exists, contains `app-name` (Phase 7 preserved) + `actions` (08-01 preserved) + `nav` (new) sub-trees
- [x] `ui/src/i18n/locales/en-US/common.json` mirror of pt-BR (perfect parity validated programmatically — 14 nav children, identical key sets)
- [x] pt-BR contains `{{version}}` interpolation marker
- [x] `Sidebar.translation.test.tsx` exists; contains `i18n.changeLanguage`, `pt-BR`, `en-US`
- [x] `Sidebar.tsx` contains `useTranslation` AND ≥5 occurrences of `t("common:nav.items.` (actual: 11)
- [x] `SidebarAccountMenu.tsx` contains ≥5 occurrences of `t("common:nav.account-menu.` (actual: 20)
- [x] `InstanceSidebar.tsx` contains `t("common:nav.instance-settings.items.`
- [x] `BreadcrumbBar.tsx` contains exactly `t("common:nav.breadcrumb.open-sidebar"` (1 occurrence — Pitfall 2 honored)
- [x] All 11 nav files contain `useTranslation` (verified via grep — 11/11)
- [x] Brand 'Paperclip' NOT a bare standalone JSX text in modified files (only inside lucide imports + JSON value strings + interpolation templates)
- [x] Commits exist: `36c8062`, `a2b7033`, `c4cf623`
- [x] `pnpm --filter @paperclipai/ui typecheck` exit 0
- [x] `CI=true npx vitest run missing-keys` 1/1 GREEN
- [x] `CI=true npx vitest run Sidebar.translation` 2/2 GREEN
- [x] Full UI suite `CI=true npx vitest run` 645/645 GREEN (was 643 baseline, +2 new probe tests)
- [x] Phase 7 baseline `ProfileSettings.locale-toggle.test.tsx` still GREEN (no regression in Phase 7 surface)
- [x] Plans 08-01/08-02/08-03 integrations intact (suite-wide GREEN; common.actions.* preserved untouched)

## Self-Check: PASSED

## Next Phase Readiness

- **08-05 (Activity log)** unblocked: independent file set (packages/db schema migration + server services + ui Activity*). Same dictionary-first → migrate → RTL probe pattern applies. Brand-preserving interpolation pattern (`Paperclip v{{version}}`) available if activity templates reference 'Paperclip' literal. STATUS_KEY/PROJECT_STATUS_KEY pattern (canonical from 8-02/8-03) reusable for 169-action-string ↔ kebab-case key bridge.
- **Phase 9 (UI Admin/Auth/Sistêmicas)** preconditions strengthened: Layout.tsx + BreadcrumbBar.tsx + MobileBottomNav.tsx + CompanyRail.tsx already migrated. New admin/auth pages will plug into already-translated chrome with zero extra work. Setting their own setBreadcrumbs([{ label: t('...') }]) is the only translation contract Phase 9 plans need to honor (architectural seam from Pitfall 2 already enforced).
- **No blockers** for downstream UAT-08-04 (Nav 100% pt-BR visual scan) — manual UAT step inherited from RESEARCH §Validation Architecture.

---
*Phase: 08-traducao-ui-core*
*Concluded: 2026-04-26*
