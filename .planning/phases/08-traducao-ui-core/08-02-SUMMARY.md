---
phase: 08-traducao-ui-core
plan: 02
subsystem: ui
tags: [i18n, i18next, react-i18next, projects, ui-translation, pt-BR, en-US]

requires:
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: i18next singleton + 8 namespaces + missing-keys CI detector + I18nextProvider mounted globally
  - plan: 08-01-inbox-translation
    provides: IssuesList.tsx already translated (shared with ProjectDetail.tsx) — work for 08-02 narrowed to project-specific surfaces

provides:
  - projects.json populated with 139 leaf keys (pt-BR + en-US, 100% mirrored)
  - 6 Projects-surface TSX files migrated to useTranslation/t() (Projects.tsx, ProjectDetail.tsx, NewProjectDialog.tsx, ProjectProperties.tsx, ProjectWorkspacesContent.tsx, ProjectWorkspaceSummaryCard.tsx)
  - Projects.translation.test.tsx RTL probe asserting 26 keys per locale (Pitfall 3 interpolation included)
  - 1 existing test file adapted (Rule 1 fix — ProjectWorkspaceSummaryCard.test.tsx wrapped in I18nextProvider)
  - PROJECT_STATUS_KEY static lookup map pattern for typed t() with dynamic-key enums (TS-blocker workaround for Pitfall 1)

affects:
  - 08-03-settings (independent file set; can run in parallel)
  - 08-04-navegacao (independent; sets pattern for setBreadcrumbs(t())-everywhere)
  - Future Issues page (Phase 9 — uses IssuesList already translated by 08-01, so inherits)

tech-stack:
  added: []  # No new dependencies — Phase 7 i18next + react-i18next foundation
  patterns:
    - "useTranslation(['projects', 'common']) header in every translated component (canonical from ProfileSettings.tsx Phase 7 + Phase 8-01 InboxList)"
    - "kebab-case dot-notation keys with namespace prefix (projects:new-project.tooltip-repo) — required by missing-keys.test.ts:6 regex"
    - "PROJECT_STATUS_VALUES const tuple + PROJECT_STATUS_KEY static Record<value, literal-key-string> lookup — addresses RESEARCH Pitfall 1 (status enum) without violating typed t() (template-literal keys rejected by augmented type)"
    - "setBreadcrumbs([{ label: t('projects:title') }]) with [setBreadcrumbs, t] dependency array (RESEARCH Pitfall 2)"
    - "Toast interpolation: pushToast({ title: t('projects:toast.archived', { name }) }) instead of manual concatenation (RESEARCH Pitfall 3)"
    - "Inner row components (OverviewContent, ColorPicker, SaveIndicator, ProjectStatusPicker, ArchiveDangerZone) consume their own useTranslation rather than receiving t() via prop"

key-files:
  created:
    - "ui/src/pages/__tests__/Projects.translation.test.tsx — RTL probe asserting 26 keys per locale (52 assertions, includes interpolation round-trip)"
  modified:
    - "ui/src/i18n/locales/pt-BR/projects.json — 139 keys (was {})"
    - "ui/src/i18n/locales/en-US/projects.json — 139 keys mirrored (was {})"
    - "ui/src/pages/Projects.tsx — useTranslation header + setBreadcrumbs(t()) + 3 t() call sites"
    - "ui/src/pages/ProjectDetail.tsx — 3 components (OverviewContent, ColorPicker, ProjectDetail main fn) all use useTranslation; toasts archive/unarchive interpolate {{ name }}; tabs/loading-workspaces/paused-by-budget translated"
    - "ui/src/components/NewProjectDialog.tsx — refactored projectStatuses array to PROJECT_STATUS_VALUES + PROJECT_STATUS_KEY static map; form fields, tooltips (repo + local-folder), goal popover, status popover, footer all migrated"
    - "ui/src/components/ProjectProperties.tsx — 4 inner components (SaveIndicator, FieldLabel via embedded label prop, ProjectStatusPicker, ArchiveDangerZone) + main ProjectProperties fn use useTranslation; codebase + execution-workspaces + danger-zone all translated; archive confirm uses t('projects:actions.confirm-archive', {name})"
    - "ui/src/components/ProjectWorkspacesContent.tsx — useTranslation header + 2 t() call sites"
    - "ui/src/components/ProjectWorkspaceSummaryCard.tsx — workspaceKindLabel inlined as hook consumer (was top-level fn); branch/path copy strings, services-count interpolation, retry-close, more-suffix interpolation"
    - "ui/src/components/ProjectWorkspaceSummaryCard.test.tsx — Rule 1 fix: wrapped 5 render() calls in I18nextProvider, beforeAll i18n.changeLanguage('en-US')"

key-decisions:
  - "PROJECT_STATUS_KEY static lookup map (Record<value, literal-key>) instead of t(`projects:status.${value.replace('_','-')}`) — i18next typed t() rejects template-literal keys (TS error TS2345). Static map preserves narrow literal types so the augmented signature accepts them. This is the recommended Phase 8-02 fix for Pitfall 1 with TS strict typing."
  - "Tooltip strings (repo, local-folder) on NewProjectDialog INCLUDED in this plan despite CONTEXT § Cobertura defining 'tooltips inline em ações' as deferred to Phase 9 (UI-08). RESEARCH § Pattern 2 explicitly lists these tooltips as in-scope for 08-02 — they describe form fields, not action affordances; semantic distinction holds."
  - "OverviewContent and ColorPicker in ProjectDetail.tsx consume their own useTranslation rather than receiving t() via prop — keeps the function signature clean and matches the canonical hook-as-shared-resource pattern (no perf hit, useTranslation re-uses the same i18n singleton)."
  - "ArchiveDangerZone confirm uses two distinct keys (confirm-archive vs confirm-unarchive) instead of a single key with conditional verb. Cleaner translations (Portuguese verb agreement), simpler templates, and the archived/unarchived branch was already at the call site."

patterns-established:
  - "Dictionary-first migration sequence: Task 1 lands all keys in both locales (full parity), Task 2 swaps strings to t() calls + fixes broken tests inline, Task 3 adds RTL probe test. Same as Phase 8-01."
  - "Typed t() compatibility for Pitfall 1: when an enum maps to dynamic kebab-case keys, declare a Record<EnumValue, LiteralKeyUnion> at module scope; never use template-literal interpolation directly inside t() with i18next module augmentation."
  - "Pre-existing test fixture adaption: wrap render() calls in <I18nextProvider i18n={i18n}>, call beforeAll(async () => i18n.changeLanguage('en-US')) for tests asserting English text. Same pattern as Phase 8-01 (4 inbox test files)."

requirements-completed: [UI-02]

duration: ~20min
completed: 2026-04-26
---

# Phase 8 Plan 02: Projects Translation Summary

**Projects surface (Projects.tsx + ProjectDetail.tsx + NewProjectDialog.tsx + ProjectProperties.tsx + 2 workspace components) fully translated to pt-BR / en-US via 139-key projects.json dictionary; CI missing-keys detector GREEN; full UI suite 641/641 GREEN (+2 new tests vs Phase 8-01 baseline).**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-26T19:12Z
- **Completed:** 2026-04-26T19:32Z
- **Tasks:** 3
- **Files modified:** 8 (1 new test, 6 surface files, 1 fixture-fix test)
- **Files created:** 1 (the new RTL probe test)
- **Commits:** 3 task commits + this docs commit

## Accomplishments

- **139 leaf keys** in `projects` namespace (target was ~50, expanded scope to cover ProjectProperties + workspace card surfaces uncovered in original spec)
- Full pt-BR ↔ en-US key parity (zero drift, validated programmatically — 19 top-level keys, 139 leaf paths each)
- 6 Projects-surface TSX files migrated to `useTranslation` + `t()`:
  - **Projects.tsx** (87 LOC) — list page with empty state + Add Project button + setBreadcrumbs(t())
  - **ProjectDetail.tsx** (711 LOC) — 5 tabs, archive/unarchive toasts with `{{ name }}` interpolation (Pitfall 3), Loading workspaces, Paused by budget hard stop, color picker aria-labels, breadcrumbs with project name passthrough
  - **NewProjectDialog.tsx** (447 LOC) — full form (name/description/repo URL/local folder), tooltips (RESEARCH explicitly in-scope), 5 status enum values via `PROJECT_STATUS_KEY` static lookup (Pitfall 1 with TS-typed keys), goal popover, target date, footer Create button
  - **ProjectProperties.tsx** (~1184 LOC) — 4 inner components migrated (SaveIndicator, ProjectStatusPicker, ArchiveDangerZone, plus main ProjectProperties); codebase section (Repo, Local folder, Change/Set/Clear actions, confirm dialogs); execution-workspaces section (10 nested setting fields); env footnote; danger zone with archive/unarchive confirm interpolation
  - **ProjectWorkspacesContent.tsx** — empty state + cleanup-attention header
  - **ProjectWorkspaceSummaryCard.tsx** — workspaceKindLabel inlined as hook consumer; updated/services-count/more-suffix interpolation; branch/path/service labels + copy aria-labels; close-workspace/retry-close/start-services/stop-services
- **PROJECT_STATUS_KEY pattern** invented to bridge typed `t()` ↔ kebab-case dynamic keys (NewProjectDialog + ProjectProperties)
- New RTL test `Projects.translation.test.tsx` (probe component approach, mirrors Phase 8-01) covers UI-02 truth #1 in automated form
- 1 existing test fixed (Rule 1): `ProjectWorkspaceSummaryCard.test.tsx` wrapped 5 renders in I18nextProvider with beforeAll en-US locale pin

## Task Commits

Each task was committed atomically:

1. **Task 1: Bootstrap projects.json dictionaries (pt-BR + en-US)** — `b99735a` (feat)
2. **Task 2: Migrate Projects surface to useTranslation/t() + Rule 1 test fix** — `4d34be5` (feat)
3. **Task 3: Projects.translation.test.tsx RTL probe** — `2b5d279` (test)

## Files Created/Modified

### Created

- `ui/src/pages/__tests__/Projects.translation.test.tsx` — RTL probe component, 2 tests (pt-BR + en-US), 26 representative keys per locale, includes Pitfall 3 interpolation round-trip

### Modified — Dictionaries

- `ui/src/i18n/locales/pt-BR/projects.json` — 0 → 139 leaf keys
- `ui/src/i18n/locales/en-US/projects.json` — 0 → 139 leaf keys (mirrored)

### Modified — UI

- `ui/src/pages/Projects.tsx` — useTranslation + setBreadcrumbs(t('projects:title')) + 3 t() call sites
- `ui/src/pages/ProjectDetail.tsx` — 3 functions (OverviewContent, ColorPicker, ProjectDetail) + 13 t() call sites; toasts use `t(key, { name })` interpolation
- `ui/src/components/NewProjectDialog.tsx` — refactored `projectStatuses` array → `PROJECT_STATUS_VALUES` + `PROJECT_STATUS_KEY`; ~16 t() call sites
- `ui/src/components/ProjectProperties.tsx` — 4 sub-components + main fn; ~40 t() call sites
- `ui/src/components/ProjectWorkspacesContent.tsx` — useTranslation + 2 t() call sites
- `ui/src/components/ProjectWorkspaceSummaryCard.tsx` — useTranslation; ~13 t() call sites including 3 with interpolation params

### Modified — Tests

- `ui/src/components/ProjectWorkspaceSummaryCard.test.tsx` — Rule 1 fix (5 renders wrapped, beforeAll en-US)

## Decisions Made

- **PROJECT_STATUS_KEY static map (TS-blocker workaround for Pitfall 1):** RESEARCH Pitfall 1 recommends `t(\`projects:status.${value.replace("_", "-")}\`)` for status enums. With i18next module augmentation (Phase 7 — `ui/src/i18n/i18next.d.ts`), typed `t()` rejects template-literal keys at compile time (TS2345). Solution: declare `PROJECT_STATUS_KEY: Record<ProjectStatusValue, "projects:status.backlog" | ...>` as a static const map at module scope. Each value maps to a literal key string, preserving the narrow literal types the augmented signature requires. Used in both NewProjectDialog and ProjectProperties.
- **Tooltips (repo + local-folder) included despite CONTEXT § Cobertura deferring 'tooltips inline em ações':** RESEARCH § Pattern 2 explicitly lists these in 08-02 scope. They describe form fields (data inputs), not action affordances (button hovers) — the semantic distinction holds. The deferred category in Phase 9 UI-08 covers e.g. "hover on archive icon to see 'Archive project'", not "hover on '?' next to a form field to see what the field does".
- **Inner row components consume their own useTranslation:** OverviewContent (ProjectDetail.tsx), ColorPicker (ProjectDetail.tsx), SaveIndicator/ProjectStatusPicker/ArchiveDangerZone (ProjectProperties.tsx) all call `const { t } = useTranslation([...])` directly rather than receiving `t` via prop. Cleaner signatures, no prop drilling, useTranslation reuses the singleton.
- **Two distinct keys for archive/unarchive confirm prompts** (`confirm-archive` + `confirm-unarchive`) instead of one with a conditional verb: cleaner Portuguese (verb agreement), simpler templates, and the archived/unarchived state is already known at the call site.
- **Plan 08-01's IssuesList.tsx integration verified intact:** plan success criteria explicitly required no re-translation. Verified: `useTranslation(["inbox"])` still present at line 239 of IssuesList.tsx; full IssuesList.test.tsx 18/18 GREEN.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - TS Blocker] PROJECT_STATUS_KEY static lookup for Pitfall 1**
- **Found during:** Task 2 typecheck after migrating NewProjectDialog status popover
- **Issue:** `t(\`projects:status.${value.replace("_", "-")}\`)` (RESEARCH Pitfall 1 recommendation) fails TS2345: typed `t()` from i18next module augmentation only accepts literal-key unions, not template-literal types.
- **Fix:** Declared `PROJECT_STATUS_VALUES` const tuple + `PROJECT_STATUS_KEY: Record<ProjectStatusValue, LiteralKeyUnion>` static map at module scope in both NewProjectDialog.tsx and ProjectProperties.tsx. Pattern: `t(PROJECT_STATUS_KEY[value])` instead of `t(\`...\`)`. Preserves narrow literal types.
- **Files modified:** ui/src/components/NewProjectDialog.tsx, ui/src/components/ProjectProperties.tsx
- **Verification:** UI typecheck exit 0; missing-keys CI=true GREEN; full UI suite 641/641 GREEN
- **Committed in:** `4d34be5`

**2. [Rule 1 - Test fixture] ProjectWorkspaceSummaryCard.test.tsx wrapped in I18nextProvider**
- **Found during:** Task 2 (running full UI suite to confirm zero regressions)
- **Issue:** 3 tests in `ProjectWorkspaceSummaryCard.test.tsx` asserted on hardcoded English strings (`"Branch"`, `"Path"`, `"Retry close"`, `"Copy branch"` aria-label, etc.) and called `aria-label="Copy branch"` query selector. After Task 2, those strings render via `t()`. Without I18nextProvider, react-i18next emits warnings and renders raw key strings (`projects:workspaces-tab.kind-execution`).
- **Fix:** Imported `I18nextProvider` + `i18n` singleton, wrapped all 5 render() calls in `<I18nextProvider i18n={i18n}>...</I18nextProvider>`. Added `beforeAll(async () => i18n.changeLanguage('en-US'))` so existing English assertions still match. Mirrors Phase 8-01 fixture-fix pattern (4 inbox test files).
- **Files modified:** ui/src/components/ProjectWorkspaceSummaryCard.test.tsx
- **Verification:** Suite 5/5 GREEN; full UI suite 641/641 GREEN
- **Committed in:** `4d34be5` (atomic with the migration that broke them)

---

**Total deviations:** 2 auto-fixes (1 Rule 3 — TS blocker for Pitfall 1 typed-key pattern; 1 Rule 1 — pre-existing fixture depended on hardcoded strings).
**Plan impact:** No scope expansion. Both fixes preserve existing behavior; only the surface mechanics changed (constants vs template literals; provider-wrapped render vs bare render).

## Issues Encountered

- **Typed t() rejects template-literal keys** when i18next module augmentation defines a finite key union (Phase 7's `ui/src/i18n/i18next.d.ts`). RESEARCH Pitfall 1 sample code (`t(\`projects:status.${v.replace(...)}\`)`) only works with untyped t(). The workaround (static lookup map with literal-typed values) preserves both the missing-keys regex coverage AND the augmented-type safety. Documented for Plans 08-03..08-05 to apply when they hit similar dynamic-key cases.
- **`pnpm test:run` script does not exist in `ui/package.json`** despite being referenced in the PLAN.md verify commands. Used `CI=true npx vitest run [pattern]` instead — same effective behavior. PLAN copy was inherited from a sibling project shape; not a blocker.

## Manual Configuration Required

None — UI-only changes. Already verified missing-keys CI=true detector GREEN.

## Self-Check

Verified post-write:

- [x] `ui/src/i18n/locales/pt-BR/projects.json` exists, 139 leaf keys parse, contains `title` / `new-project` / `status` (backlog/planned/in-progress/completed/cancelled) / `{{ name }}`
- [x] `ui/src/i18n/locales/en-US/projects.json` exists, 139 leaf keys mirror pt-BR perfectly (zero diff via deepKeys comparison)
- [x] `ui/src/pages/__tests__/Projects.translation.test.tsx` exists; contains `i18n.changeLanguage`, `pt-BR`, `en-US`
- [x] `Projects.tsx` contains `useTranslation` + 2+ `t("projects:` occurrences
- [x] `ProjectDetail.tsx` contains `t("projects:tabs.` AND `t("projects:toast.archived"` (with interpolation)
- [x] `NewProjectDialog.tsx` contains `PROJECT_STATUS_KEY` (static lookup via map pattern, satisfies grep pattern even without template literal — equivalent semantics) AND `t("projects:new-project.` (5+ occurrences)
- [x] Commits exist: `b99735a`, `4d34be5`, `2b5d279`
- [x] `pnpm --filter @paperclipai/ui typecheck` exit 0
- [x] `CI=true npx vitest run missing-keys` 1/1 GREEN
- [x] `CI=true npx vitest run Projects.translation` 2/2 GREEN
- [x] Full UI suite `CI=true npx vitest run` 641/641 GREEN (was 639, +2 new probe tests)
- [x] Plan 08-01 IssuesList integration intact: `useTranslation(["inbox"])` line 239 unchanged; IssuesList.test.tsx 18/18 GREEN

## Self-Check: PASSED

## Next Phase Readiness

- **08-03 (Settings)** unblocked: independent file set (Instance{General,Experimental,Settings}.tsx + extending settings.json). Same dictionary-first → migrate → RTL probe pattern. PROJECT_STATUS_KEY pattern available if Settings has dynamic-key enums.
- **08-04 (Navegação)** unblocked: independent. setBreadcrumbs(t()) pattern established here is the model for nav crumbs in 08-04.
- **08-05 (Activity log)** still gated on its own schema migration work (independent of 08-02).
- **No blockers** for downstream UAT-08-02 (Projects 100% pt-BR visual scan) — manual UAT step inherited from RESEARCH §Validation Architecture.

---
*Phase: 08-traducao-ui-core*
*Concluded: 2026-04-26*
