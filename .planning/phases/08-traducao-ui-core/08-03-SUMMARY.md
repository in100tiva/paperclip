---
phase: 08-traducao-ui-core
plan: 03
subsystem: ui
tags: [i18n, i18next, react-i18next, settings, ui-translation, pt-BR, en-US, plurals]

requires:
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: i18next singleton + 8 namespaces + missing-keys CI detector + I18nextProvider mounted globally + ProfileSettings language section (preserved as-is)
  - plan: 08-02-projects-translation
    provides: STATIC_KEY_LOOKUP pattern (PROJECT_STATUS_KEY) reused as STATUS_KEY for Claude account status enum (typed-t() ↔ kebab-case dynamic enum bridge)

provides:
  - settings.json extended (5 leaf keys → 192 leaf keys per locale; pt-BR ↔ en-US 100% mirror; language.* preserved from Phase 7)
  - 5 Settings TSX files migrated to useTranslation (InstanceSettings, InstanceGeneralSettings, InstanceExperimentalSettings, ProfileSettings extension, ClaudeAccounts)
  - i18next built-in plurals working (heartbeats.company, backup-retention.days/weeks/months, heartbeats.actions.confirm-disable-all/disable-failed) with bare-key + _one + _other variants for missing-keys regex compatibility
  - Settings.translation.test.tsx RTL probe (2 tests, 46 assertions, plural round-trip + interpolation)
  - 1 existing test file adapted (Rule 1 fix — ClaudeAccounts.test.tsx wrapped in I18nextProvider, beforeAll en-US)
  - Window.confirm() translated for heartbeats disable-all action

affects:
  - 08-04-navegacao (independent file set; can run in parallel; setBreadcrumbs([{ label: t() }]) pattern reinforced)
  - 08-05-activity-log (independent; sequential with 08-04 only because of migration ordering)
  - Phase 7 baseline (ProfileSettings language section preserved verbatim; ProfileSettings.locale-toggle.test.tsx still 2/2 GREEN)

tech-stack:
  added: []  # No new deps — Phase 7 i18next + react-i18next foundation
  patterns:
    - "useTranslation(['settings', 'common']) header in every translated component (canonical from Phase 7 ProfileSettings + Phase 8-01/02)"
    - "kebab-case dot-notation keys with namespace prefix (settings:general.deployment.bootstrap-status) — required by missing-keys.test.ts:6 regex"
    - "STATUS_KEY: Record<ClaudeAccountStatus, LiteralKeyUnion> static lookup map for dynamic enum keys (mirrors Phase 8-02 PROJECT_STATUS_KEY pattern; bridges typed-t() augmentation to enum-driven kebab-case keys without template-literal violations)"
    - "i18next built-in plurals: bare key in JSON (e.g. backup-retention.days) for missing-keys regex detection; _one/_other variants alongside for runtime resolution via t(key, { count })"
    - "setBreadcrumbs([{ label: t('settings:instance-settings.title') }, { label: t('settings:profile.crumb') }]) with [setBreadcrumbs, t] dep array (Pitfall 2 from RESEARCH)"
    - "Inner row components consume their own useTranslation rather than receiving t() via prop (StatusBadge, ClaudeAccountRow) — singleton reuse, clean signatures"
    - "window.confirm() translated via t('settings:heartbeats.actions.confirm-disable-all', { count: enabledCount }) — runtime plural resolution drives the dialog text"

key-files:
  created:
    - "ui/src/pages/__tests__/Settings.translation.test.tsx — probe-component RTL test with 2 cases (pt-BR + en-US), 46 assertions covering all 7 sub-trees, plurals, interpolation"
  modified:
    - "ui/src/i18n/locales/pt-BR/settings.json — 5 → 192 leaf keys (preserved language.*; added instance-settings, common, general, heartbeats, experimental, profile, claude-accounts)"
    - "ui/src/i18n/locales/en-US/settings.json — mirror of pt-BR (192 leaf keys, perfect parity)"
    - "ui/src/pages/InstanceSettings.tsx — useTranslation header + setBreadcrumbs(t()) + heartbeats title/description/empty/loading/load-failed/update-failed/disable-all-failed; counts (active/disabled, company plural via { count }); on/off badges; never label; agent-config-title aria; window.confirm translated; disable-all/disabling/saving/disable-timer/enable-timer actions; disable-failed plural error template"
    - "ui/src/pages/InstanceGeneralSettings.tsx — useTranslation header + setBreadcrumbs(t()); 6 sections fully translated (deployment with 3-mode descriptions + StatusBox labels/values, censor-username, keyboard-shortcuts, backup-retention with daily/weekly/monthly + count-driven button labels via t(key, { count }), ai-feedback with always-allow/dont-allow + retest hint segments + prompt-pending state, sign-out); aria-labels on all 3 ToggleSwitches"
    - "ui/src/pages/InstanceExperimentalSettings.tsx — useTranslation header + setBreadcrumbs(t()) + 4 toggle sections (environments, isolated-workspaces, auto-restart-dev-server, issue-graph-recovery) with title/description/aria-label triples"
    - "ui/src/pages/ProfileSettings.tsx — Phase 7 language section UNCHANGED; extended useEffect setBreadcrumbs(t()), resolveProfileName fallback, 4 mutations (update/upload/remove/locale) error messages, isLoading/error guards, page header + description, avatar Camera/Trash buttons (change-photo/upload-photo/remove), uploadHint with { company } interpolation, avatar-help template, name/email Label+Input+help triples, save button with saving state"
    - "ui/src/pages/ClaudeAccounts.tsx — useTranslation header in main fn + StatusBadge + ClaudeAccountRow inner components; STATUS_KEY static lookup map for typed-t() (4 status enum values); breadcrumbs (3 levels: company-fallback / settings-crumb / claude-accounts.crumb); 4 sections (register form with description-prefix/middle/suffix template + label/slug/scope, accounts list with 7 column headers + scope-shared/scope-company badges + enable/disable button, costs summary with 5 column headers + empty/loading states, rotation history with agent-prefix/swapped/strategy interpolation); register success/error toasts; toggle update-failed toast; load-forbidden 403 message"
    - "ui/src/pages/ClaudeAccounts.test.tsx — Rule 1 fix: 8 render() calls wrapped in <I18nextProvider i18n={i18n}>...</I18nextProvider>; beforeAll(async () => i18n.changeLanguage('en-US')) so existing English text assertions still match. Mirrors Phase 8-01/8-02 fixture-fix pattern."

key-decisions:
  - "Bare keys + _one/_other variants for plurals: missing-keys.test.ts regex `[a-z0-9.\\-]+` rejects underscore in keys (kebab-case only). i18next plural resolution looks for `<key>_one`/`<key>_other` first, falling back to `<key>` if missing. Solution: define BOTH the bare key (e.g. `days`, `company`, `confirm-disable-all`) AND the suffixed variants (`days_one`, `days_other`, etc.) in JSON. The bare key satisfies the detector regex; the suffixed variants drive runtime plural resolution. The bare key is rendered only as a fallback if i18next can't resolve a plural — which never happens since pt-BR/en-US both use one/other rules."
  - "STATUS_KEY static lookup map for ClaudeAccountStatus enum (mirrors Phase 8-02 PROJECT_STATUS_KEY pattern): 4 enum values × 1 literal key string each. Required because typed-t() rejects template-literal keys due to i18next module augmentation in `i18next.d.ts`. Used in StatusBadge inner component."
  - "All 5 TSX files migrated atomically in Task 2 + ClaudeAccounts.test.tsx Rule 1 fixture-fix as part of the same atomic commit. Reason: the migration that broke the fixture must land with the fixture-fix to keep the suite GREEN at every commit boundary. Same protocol Phase 8-01 (4 inbox tests) and Phase 8-02 (ProjectWorkspaceSummaryCard.test.tsx) followed."
  - "InnerComponent (StatusBadge, ClaudeAccountRow) consumes its own useTranslation rather than receiving t() via prop. Cleaner signatures, no prop drilling, useTranslation reuses the i18n singleton (no perf hit). Same decision as Phase 8-02 (OverviewContent, ColorPicker, SaveIndicator, ProjectStatusPicker, ArchiveDangerZone)."
  - "Phase 7 ProfileSettings language section preserved BYTE-PER-BYTE: lines 305-332 untouched (h2 with t('settings:language.title'), 2 radio inputs with t('settings:language.pt-br') / .en-us, fieldset with updateLocaleMutation). UI-03 truth #2 explicitly required regression-free preservation. Verified via ProfileSettings.locale-toggle.test.tsx 2/2 GREEN post-migration."
  - "ai-feedback retest-hint template split into 5 string segments (prefix/from/or-set/suffix/end) interleaved with 3 <code> tags for `feedbackDataSharingPreference`, `instance_settings.general`, and `\"prompt\"`. Reason: the original copy mixes prose with technical literals. Splitting preserves the technical literals in code blocks while letting the prose around them be translated. The result reads naturally in pt-BR even though the literal token positions differ from en-US."

patterns-established:
  - "Bare-key + plural-suffix duplication for i18next built-in plurals on a custom kebab-case-only detector. Forward signal for Plans 08-04 (nav with badge counts may also need bare + plural variants) and 08-05 (activity log entries with count-driven verbs)."
  - "STATIC_LOOKUP_KEY (Phase 8-02 PROJECT_STATUS_KEY → 8-03 STATUS_KEY) is now the canonical pattern for any TS-strict enum → kebab-case-key translation. Plans 08-04/05 should reuse this pattern for any sidebar nav-item enums or activity action enums."
  - "Pre-existing test fixture wrap protocol (3rd application, started Phase 8-01): when a translated component is rendered by an existing bare-render() test, wrap with `<I18nextProvider i18n={i18n}>` and add `beforeAll(async () => i18n.changeLanguage('en-US'))` so existing English assertions still match. Land both in the SAME atomic commit as the migration (test-fix-with-feature pattern, not test-fix-after-feature)."

requirements-completed: [UI-03]

duration: ~19min
completed: 2026-04-26
---

# Phase 8 Plan 03: Settings Translation Summary

**Settings surface (InstanceSettings + InstanceGeneralSettings + InstanceExperimentalSettings + ProfileSettings extension + ClaudeAccounts) fully translated to pt-BR / en-US via 192-key settings.json dictionary; CI missing-keys detector GREEN; full UI suite 643/643 GREEN (+2 new probe tests vs Phase 8-02 baseline 641); Phase 7 ProfileSettings language section preserved regression-free.**

## Performance

- **Duration:** ~19 min
- **Started:** 2026-04-26T19:37:09Z
- **Completed:** 2026-04-26T19:56Z
- **Tasks:** 3
- **Files modified:** 8 (1 new test, 5 surface TSX files migrated, 2 dictionaries extended, 1 fixture-fix test)
- **Files created:** 1 (the new RTL probe test)
- **Commits:** 3 task commits + this docs commit

## Accomplishments

- **192 leaf keys** in `settings` namespace (was 5 — Phase 7 language.* preserved verbatim)
- Full pt-BR ↔ en-US key parity (zero drift, validated programmatically)
- 5 Settings-surface TSX files migrated to `useTranslation` + `t()`:
  - **InstanceSettings.tsx** (283 LOC) — heartbeats listing with active/disabled counts, company plural badge, on/off status badges, never label for missing timestamps, full translated `window.confirm` dialog driven by `t('settings:heartbeats.actions.confirm-disable-all', { count })`, disable-all/saving/disable-timer/enable-timer button labels, error/loading guards, plural disable-failed error template with `{ failures, total, detail }` interpolation
  - **InstanceGeneralSettings.tsx** (382 LOC, biggest Settings surface) — 6 sections: deployment (3-mode descriptions, 3 StatusBox triples), censor-username + keyboard-shortcuts toggles with aria-labels, backup-retention with daily/weekly/monthly headers and `t(key, { count })`-driven button labels (1 day vs 7 days), ai-feedback with always-allow/dont-allow buttons + descriptions + retest hint with 5 prose segments around 3 `<code>` tags, sign-out section
  - **InstanceExperimentalSettings.tsx** (157 LOC) — 4 toggle sections (environments, isolated-workspaces, auto-restart-dev-server, issue-graph-recovery), each with title/description/toggle-aria triple
  - **ProfileSettings.tsx** (336 LOC, Phase 7 partial) — language section UNCHANGED; everything else (breadcrumbs, page header, avatar Camera/Trash buttons, uploadHint with `{ company }` interpolation, avatar-help template, name/email Label+Input+help triples, save button with saving state, 4 mutation error messages) migrated
  - **ClaudeAccounts.tsx** (480 LOC) — 4 sections (register form with description-prefix/middle/suffix template, accounts list with 7 column headers + scope/status badges, costs summary with 5 columns + empty state, rotation history with agent-prefix/swapped/strategy interpolation); register success/error toasts; STATUS_KEY static lookup map (mirrors Phase 8-02 PROJECT_STATUS_KEY pattern) for ClaudeAccountStatus enum
- **Bare-key + _one/_other duplication pattern** invented to bridge missing-keys regex (kebab-case only, rejects underscore) with i18next built-in plural resolution
- **STATUS_KEY static lookup map** applied to ClaudeAccountStatus enum (4 values), demonstrating Phase 8-02 PROJECT_STATUS_KEY pattern is reusable across the milestone
- New RTL test `Settings.translation.test.tsx` (probe component approach, mirrors Phase 8-01/02) covers UI-03 truth #1 in automated form (46 assertions across 7 sub-trees + plurals + interpolation)
- 1 existing test fixed (Rule 1): `ClaudeAccounts.test.tsx` wrapped 8 renders in I18nextProvider with beforeAll en-US locale pin
- **Phase 7 baseline preserved:** ProfileSettings.locale-toggle.test.tsx 2/2 GREEN post-migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend settings.json dictionaries (preserving language.* from Phase 7)** — `6bb9b52` (feat) + plural-bare-keys follow-up landed in Task 2 commit (atomic with the t() calls that needed them)
2. **Task 2: Migrate Settings surface to useTranslation/t() + Rule 1 test fix** — `3eb597c` (feat)
3. **Task 3: Settings.translation.test.tsx RTL probe** — `b16e5bc` (test)

## Files Created/Modified

### Created

- `ui/src/pages/__tests__/Settings.translation.test.tsx` — RTL probe component, 2 tests (pt-BR + en-US), 23 representative keys per locale × 2 locales = 46 assertions; covers all 7 sub-trees (instance-settings, language, general/deployment/censor/keyboard/backup/feedback/sign-out, heartbeats, experimental, profile, claude-accounts); plural round-trip via i18next built-in (count=1 → _one, count=3/7 → _other); interpolation round-trip for `profile.upload-hint-with-company { company }`; afterEach(cleanup) to prevent DOM leak across cases

### Modified — Dictionaries

- `ui/src/i18n/locales/pt-BR/settings.json` — 5 → 192 leaf keys (Phase 7 `language.*` preserved verbatim; new sub-trees: instance-settings, common, general, heartbeats, experimental, profile, claude-accounts; plural duplication pattern for backup-retention.days/weeks/months and heartbeats.company/.actions.confirm-disable-all/.actions.disable-failed)
- `ui/src/i18n/locales/en-US/settings.json` — 5 → 192 leaf keys (mirrored)

### Modified — UI

- `ui/src/pages/InstanceSettings.tsx` — useTranslation + setBreadcrumbs(t()) + ~22 t() call sites
- `ui/src/pages/InstanceGeneralSettings.tsx` — useTranslation + setBreadcrumbs(t()) + ~38 t() call sites including `t(key, { count })` interpolations
- `ui/src/pages/InstanceExperimentalSettings.tsx` — useTranslation + setBreadcrumbs(t()) + ~14 t() call sites
- `ui/src/pages/ProfileSettings.tsx` — Phase 7 language section UNCHANGED; extended useEffect setBreadcrumbs(t()) + ~18 t() call sites including `t(key, { company })` and `t(key, { hint })` interpolations
- `ui/src/pages/ClaudeAccounts.tsx` — useTranslation in 3 components (main, StatusBadge, ClaudeAccountRow); STATUS_KEY static lookup map; ~38 t() call sites; register description template split into prefix/middle/suffix segments around 2 `<code>` tags; rotation-history strategy interpolation

### Modified — Tests

- `ui/src/pages/ClaudeAccounts.test.tsx` — Rule 1 fix (8 renders wrapped in I18nextProvider + beforeAll en-US)

## Decisions Made

- **Bare-key + _one/_other plural duplication for missing-keys regex compatibility:** missing-keys.test.ts:6 regex `[a-z0-9.\\-]+` rejects underscore. i18next plural resolution looks for `<key>_one`/`<key>_other` first, fallback to `<key>` if missing. Solution: define BOTH bare and suffixed variants. Bare satisfies detector; suffixed drive runtime resolution. Pattern applied to: `heartbeats.company`, `heartbeats.actions.confirm-disable-all`, `heartbeats.actions.disable-failed`, `general.backup-retention.days/weeks/months`. Forward signal for Plans 08-04/05 if they hit count-driven labels.

- **STATUS_KEY static lookup map for ClaudeAccountStatus (Phase 8-02 PROJECT_STATUS_KEY pattern):** RESEARCH Pitfall 1 recommends `t(\`prefix.${value}\`)` for dynamic enums. Typed t() (i18next module augmentation) rejects template-literal keys at compile time. Solution: declare `STATUS_KEY: Record<ClaudeAccountStatus, LiteralKeyUnion>` as static const map. 4 status values × 1 literal key each. Pattern is now canonical across the milestone.

- **Phase 7 ProfileSettings language section preserved verbatim:** UI-03 truth #2 explicitly required regression-free preservation. Lines 305-332 (h2 + 2 radio inputs + fieldset with updateLocaleMutation) untouched. Verified via `ProfileSettings.locale-toggle.test.tsx 2/2 GREEN` post-migration.

- **ai-feedback retest-hint split into 5 prose segments:** the original copy mixes prose with 3 technical literals (`feedbackDataSharingPreference`, `instance_settings.general`, `"prompt"`). Splitting into prefix/from/or-set/suffix/end keys preserves the literals in `<code>` blocks while letting the surrounding prose translate naturally. pt-BR reads as natural Portuguese even though literal positions differ.

- **All 5 TSX migrations + Rule 1 fixture-fix in single atomic commit (Task 2):** the migration that breaks the fixture lands with the fix to keep the suite GREEN at every commit boundary. Same protocol Phase 8-01 / 8-02 followed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Detector regex blocker] Bare-key duplication for plurals**
- **Found during:** Task 2 missing-keys CI run after the first migration pass
- **Issue:** missing-keys regex `[a-z0-9.\\-]+` only allows kebab-case + dot-notation; underscore in `_one`/`_other` is rejected. After migrating to `t("settings:heartbeats.company", { count })` and similar, the detector reported 6 missing keys (heartbeats.company, .actions.confirm-disable-all, .actions.disable-failed, general.backup-retention.days/weeks/months) because the dictionaries had only the suffixed variants.
- **Fix:** Added the bare key alongside `_one`/`_other` variants in both pt-BR and en-US dictionaries (e.g. `"days": "{{count}} day"`, `"days_one": "{{count}} day"`, `"days_other": "{{count}} days"`). Bare key satisfies the detector regex; suffixed variants drive i18next runtime plural resolution.
- **Files modified:** ui/src/i18n/locales/pt-BR/settings.json, ui/src/i18n/locales/en-US/settings.json
- **Verification:** missing-keys CI=true vitest GREEN; pt-BR 192 keys ↔ en-US 192 keys mirror; Settings.translation.test.tsx plural assertions GREEN (count=1 → _one resolves "1 day" / "1 dia"; count=7 → _other resolves "7 days" / "7 dias")
- **Committed in:** `3eb597c` (atomic with the t() migration that introduced the missing keys)

**2. [Rule 1 - Test fixture] ClaudeAccounts.test.tsx wrapped in I18nextProvider**
- **Found during:** Task 2 (running full UI suite to confirm zero regressions)
- **Issue:** 8 of 9 tests in `ClaudeAccounts.test.tsx` rendered via bare `root.render(<MemoryRouter><QueryClientProvider><ClaudeAccounts /></QueryClientProvider></MemoryRouter>)` without I18nextProvider. After Task 2, the page renders ~38 strings via `t()`. Without I18nextProvider, react-i18next emits warnings and renders raw key strings (`settings:claude-accounts.title`). Test assertions like `expect(textContent).toContain("Claude Accounts")` and `find(button => button.textContent === "Register")` failed because the rendered text was the raw key.
- **Fix:** Imported `I18nextProvider` + `i18n` singleton, wrapped 8 `root.render(...)` calls in `<I18nextProvider i18n={i18n}>...</I18nextProvider>`. Added `beforeAll(async () => i18n.changeLanguage('en-US'))` so existing English assertions still match. Mirrors Phase 8-01 (4 inbox tests) and Phase 8-02 (ProjectWorkspaceSummaryCard.test.tsx) fixture-fix pattern.
- **Files modified:** ui/src/pages/ClaudeAccounts.test.tsx
- **Verification:** ClaudeAccounts suite 9/9 GREEN; full UI suite 641/641 GREEN before Task 3 added 2 new probes
- **Committed in:** `3eb597c` (atomic with the migration that broke them)

---

**Total deviations:** 2 auto-fixes (1 Rule 3 — detector regex blocker resolved with bare-key duplication; 1 Rule 1 — pre-existing fixture depended on hardcoded strings).
**Plan impact:** No scope expansion. Both fixes preserve existing behavior; the bare-key duplication introduces ~6 redundant keys to satisfy the detector but they never render at runtime (always shadowed by _one/_other resolution).

## Issues Encountered

- **i18next plural keys vs missing-keys regex:** the v4 plural suffix scheme (`_one`/`_other`) uses underscores, which the kebab-case regex rejects. The fix (bare key duplication) is mechanical but adds 1 extra entry per pluralized key in BOTH locales. For Plans 08-04/05 if they need plurals, apply the same pattern. Long-term improvement (deferred to v2 L10N-03): teach the detector regex about plural suffixes (`/_(zero|one|two|few|many|other)$/` allowed) — out of scope for this milestone.
- **Phase 7 ProfileSettings language section preservation:** required careful diff to ensure lines 305-332 untouched. Used surgical Edit calls scoped to specific functions (mutations, useEffect, JSX above line 305) rather than mass replace_all. ProfileSettings.locale-toggle.test.tsx 2/2 GREEN was the regression check.

## Manual Configuration Required

None — UI-only changes. Already verified missing-keys CI=true detector GREEN.

## Self-Check

Verified post-write:

- [x] `ui/src/i18n/locales/pt-BR/settings.json` exists, 192 leaf keys parse, contains `language` (preserved Phase 7) / `general` / `heartbeats` / `claude-accounts` / `experimental` / `profile` / `instance-settings` (grep-checkable)
- [x] `ui/src/i18n/locales/en-US/settings.json` exists, 192 leaf keys mirror pt-BR perfectly (zero drift validated programmatically)
- [x] pt-BR contains `_other` plural marker (grep-checkable)
- [x] `Settings.translation.test.tsx` exists; contains `i18n.changeLanguage`, `pt-BR`, `en-US`
- [x] `InstanceGeneralSettings.tsx` contains `useTranslation` AND ≥5 `t("settings:general.` occurrences
- [x] `InstanceSettings.tsx` contains `t("settings:heartbeats.` AND `{ count` interpolation
- [x] `ProfileSettings.tsx` contains `t("settings:profile.` AND `t("settings:instance-settings` (breadcrumb)
- [x] `ClaudeAccounts.tsx` contains `t("settings:claude-accounts.`
- [x] Commits exist: `6bb9b52`, `3eb597c`, `b16e5bc`
- [x] `pnpm --filter @paperclipai/ui typecheck` exit 0
- [x] `CI=true npx vitest run missing-keys` 1/1 GREEN
- [x] `CI=true npx vitest run Settings.translation` 2/2 GREEN
- [x] Full UI suite `CI=true npx vitest run` 643/643 GREEN (was 641, +2 new probe tests)
- [x] Phase 7 baseline `ProfileSettings.locale-toggle.test.tsx` 2/2 GREEN (regression-free preservation of language section)
- [x] Plan 08-01 IssuesList integration intact (no edits in this plan; protected by suite-wide GREEN)
- [x] Plan 08-02 Projects integration intact (no edits in this plan; protected by suite-wide GREEN)

## Self-Check: PASSED

## Next Phase Readiness

- **08-04 (Navegação)** unblocked: independent file set (Sidebar, InstanceSidebar, SidebarAccountMenu, SidebarCompanyMenu, SidebarAgents, SidebarProjects, BreadcrumbBar, MobileBottomNav, Layout, CompanyRail, CompanySwitcher) + `common.json` nav.* sub-tree. Same dictionary-first → migrate → RTL probe pattern. STATIC_LOOKUP_KEY pattern (PROJECT_STATUS_KEY → STATUS_KEY) available if nav has dynamic-key enums. Bare-key + plural duplication pattern available if nav badges have count-driven labels.
- **08-05 (Activity log)** still gated on its own schema migration work (independent of 08-03).
- **No blockers** for downstream UAT-08-03 (Settings 100% pt-BR visual scan) — manual UAT step inherited from RESEARCH §Validation Architecture.

---
*Phase: 08-traducao-ui-core*
*Concluded: 2026-04-26*
