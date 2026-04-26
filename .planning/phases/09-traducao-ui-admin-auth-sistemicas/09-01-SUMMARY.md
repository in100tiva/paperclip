---
phase: 09-traducao-ui-admin-auth-sistemicas
plan: 01
subsystem: ui
tags: [i18n, react-i18next, settings, admin, company-access, ui-translation, pt-BR, en-US, plurals, brand-preserving]

requires:
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: i18next bootstrap, missing-keys CI detector, settings.json scaffold
  - phase: 08-traducao-ui-core
    provides: STATUS_KEY enum→kebab pattern, bare-key + _one/_other plural duplication, inner-component useTranslation, brand-preserving interpolation, fixture-fix protocol (Rule 1)
  - plan: 09-03b
    provides: ApiError.code field + translateApiError(error, t) helper for error toast localization

provides:
  - settings.json extended (243 → 812 leaf keys; 9 new top-level sub-trees added: company, companies, org, company-invites, join-requests, company-export, company-import, company-skills, costs)
  - 11 admin/company TSX pages migrated to useTranslation (CompanySettings, CompanyAccess, Companies, Org, OrgChart, CompanyInvites, JoinRequestQueue, CompanyExport, CompanyImport, CompanySkills, Costs)
  - ROLE_KEY / STATUS_KEY / PERMISSION_KEY canonical lookup maps replacing hardcoded permissionLabels object in CompanyAccess
  - 2 new RTL probe tests (CompanySettings.i18n + CompanyAccess.i18n) covering 5 cases including plural _one/_other and {{name}}/{{role}}/{{date}} interpolation
  - translateApiError(err, t) consumed in 7 mutation onError handlers across CompanyAccess + CompanySettings + CompanyInvites; helper signature widened (AnyTFunction = TFunction<any, undefined>) to accept TFunction parameterized with namespace tuples like useTranslation(["settings", "common"])
  - Rule 1 fixture-fix applied to 3 pre-existing tests (CompanySettings.test, CompanyAccess.test, CompanyInvites.test) — wrapped in I18nextProvider with beforeAll en-US locale pin

affects: [09-02, 09-04, 10-mensagens-agentes]

tech-stack:
  added: []
  patterns:
    - "ROLE_KEY / STATUS_KEY / PERMISSION_KEY: 3 canonical static lookup maps Record<EnumValue, LiteralKeyUnion> bridging strict typed-t() augmentation to enum-driven kebab-case keys without template-literal violations. Used by CompanyAccess for membershipRole, status, and 8 permission keys."
    - "Permissive cast at component scope (`const t = tStrict as unknown as (key: string, options?) => string`) for components consuming dynamic dot-segmented lookup keys via static maps. Preserves strict typing on the original tStrict reference for compile-time-known callsites; only the lookup-driven calls use the permissive variant. First applied in CompanyAccess.tsx; subsequently in Costs.tsx for budget scope sections."
    - "TFunction signature widening for cross-component helpers: AnyTFunction = TFunction<any, undefined> on translateApiError parameter accepts useTranslation tuples (e.g. TFunction<['settings','common'], undefined>) without per-call casts. Helper-internal permissive cast preserves dynamic key resolution. Forward signal for any future helper consumed across components with different namespace tuples."
    - "Inner-component useTranslation pattern (Phase 8-02 OverviewContent / Phase 8-03 StatusBadge / Phase 8-04 SortableProjectItem) — 4th application: PendingJoinRequestCard, NewSkillForm, SkillList, SkillPane, ExportPreviewPane, ImportPreviewPane, ConflictResolutionList, AdapterPickerList, FinanceSummaryCard, SupportMark each consume their own useTranslation rather than receiving t() via prop. Cleaner signatures, no prop drilling, useTranslation reuses i18n singleton."
    - "Helper signature widening for non-component utilities: sourceMeta(badge, label, t: SkillsTFn) and formatProjectScanSummary(result, t: SkillsTFn) accept the typed TFunction parameterized with the same useTranslation tuple as their caller (TFunction<['settings','common'], undefined>). Avoids per-callsite cast and preserves strict key checking inside the helper body."

key-files:
  created:
    - "ui/src/pages/__tests__/CompanySettings.i18n.test.tsx — 2 tests probe-component approach asserting section headers, action buttons, archive-confirm interpolation"
    - "ui/src/pages/__tests__/CompanyAccess.i18n.test.tsx — 2 tests covering ROLE_KEY/STATUS_KEY/PERMISSION_KEY lookups, edit/remove dialogs, plural _one/_other for open-issues + pending-count"
    - ".planning/phases/09-traducao-ui-admin-auth-sistemicas/09-01-SUMMARY.md"
  modified:
    - "ui/src/i18n/locales/pt-BR/settings.json — 243 → 812 leaf keys (Phase 7 language.* + Phase 8 instance-settings/general/heartbeats/experimental/profile/claude-accounts preserved byte-by-byte; 9 new top-level sub-trees added)"
    - "ui/src/i18n/locales/en-US/settings.json — mirror of pt-BR (812 leaf keys, 100% parity verified)"
    - "ui/src/lib/translateApiError.ts — type AnyTFunction added; signature widened to accept TFunction<any> | TFunction | callable"
    - "ui/src/pages/CompanySettings.tsx — useTranslation header + 8 section headers + field labels/hints + 4 mutation onError via translateApiError + window.confirm interpolation + environment table headers/empty/row + draft probe + invite generation flow + packages section + danger zone"
    - "ui/src/pages/CompanyAccess.tsx — ROLE_KEY (4 entries) / STATUS_KEY (4 entries incl. archived) / PERMISSION_KEY (8 entries) static lookup maps; permissionLabels hardcoded object eliminated; HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS still imported but no longer used for UI labels (server constants intact); breadcrumbs + toasts via translateApiError + Edit/Remove dialogs + PendingJoinRequestCard with i18n props + dialog cancel/save/saving/removing actions"
    - "ui/src/pages/Companies.tsx — list view, breadcrumb, agents/issues plurals via {{count}}, delete confirm, rename, edit/save/cancel"
    - "ui/src/pages/Org.tsx — breadcrumb, EmptyState messages (no-agents / select-company)"
    - "ui/src/pages/OrgChart.tsx — breadcrumb, EmptyState messages, import/export header buttons, 3 zoom button title+aria-label triples"
    - "ui/src/pages/CompanyInvites.tsx — INVITE_ROLE_VALUES → useMemo(t)-driven inviteRoleOptions array; create/revoke flows with translateApiError; latest-invite section; history table headers; states.{active,accepted,expired,revoked} sub-tree; clipboard-unavailable toast"
    - "ui/src/pages/JoinRequestQueue.tsx — breadcrumb, filter labels (status + request-type), 3 status options + 3 type options, no-results empty state, approve/reject buttons + toasts, invite-context with brand-preserving interpolation"
    - "ui/src/pages/CompanyExport.tsx — breadcrumb, ExportPreviewPane (inner-component), header export-suffix, files-selected plural + warnings plural + export CTA plural, package-files sidebar, search placeholder, show-more-issues, export downloaded toast with {{count}} {{name}}"
    - "ui/src/pages/CompanyImport.tsx — ConflictResolutionList + AdapterPickerList + ImportPreviewPane (3 inner components); source-mode picker (github/local), choose-zip + package-summary plural, github-url field, target/collision selectors, conflict + error counts plural, import CTA plural, all toasts (preview/import/package-read failed)"
    - "ui/src/pages/CompanySkills.tsx — NewSkillForm + SkillList + SkillPane (3 inner components); SkillsTFn helper type for sourceMeta + formatProjectScanSummary; 6 sourceBadge fallbacks (skills.sh, github, url, folder, paperclip, catalog) — each with managed-* and fallback-* keys; scan-summary plural with 4 interpolations + conflicts/skipped suffixes; remove-skill dialog with currently-used-by interpolation; add-source dialog; 8 mutation toasts"
    - "ui/src/pages/Costs.tsx — useTranslation header + breadcrumb + select-company empty + select-date-range prompt; FinanceSummaryCard inner component; 4 main MetricTile labels with subtitle interpolation ({{tokens}}, {{spent}}/{{budget}}, {{debits}}/{{credits}}, {{estimated}}); 5 tab triggers; inference-ledger card + budget-format/{{percent}} interpolations; by-agent + by-project sections; budget control plane (4 metrics); 3 budget scope sections (company/agent/project) via dynamic key construction; ProviderTabLabel + BillerTabLabel inner labels"
    - "ui/src/pages/CompanySettings.test.tsx — Rule 1 fixture-fix: I18nextProvider wrapping + beforeAll en-US"
    - "ui/src/pages/CompanyAccess.test.tsx — Rule 1 fixture-fix: I18nextProvider wrapping + beforeAll en-US"
    - "ui/src/pages/CompanyInvites.test.tsx — Rule 1 fixture-fix: I18nextProvider wrapping + beforeAll en-US"

key-decisions:
  - "translateApiError TFunction signature widened to AnyTFunction = TFunction<any, undefined>: components consuming the helper declare useTranslation(['settings', 'common']) which returns TFunction<readonly ['settings','common'], undefined>. The original strict TFunction default constraint <'common', undefined> rejected the parameterized variant. Widening accepts any namespace tuple — internal permissive cast preserves dynamic key resolution. Cleaner than per-callsite casts and forward-compatible with Plan 09-02/09-04 helpers."
  - "STATUS_KEY map extends to include 'archived' status: CompanyMember['status'] union includes 'archived' (returned by archiveMember mutation but never displayed in active-members table). To satisfy strict typed Record<EnumValue,...>, archived maps to suspended translation key. Alternative would have been narrowing the type at usage site, but that requires touching the API surface."
  - "Inner-component useTranslation pattern reapplied 10x in this plan: PendingJoinRequestCard, SupportMark, NewSkillForm, SkillList, SkillPane, ExportPreviewPane, ImportPreviewPane, ConflictResolutionList, AdapterPickerList, FinanceSummaryCard. Pattern is now canonical across milestone v1.1 — any leaf component with 2+ translated strings owns its own hook rather than accepting t as prop."
  - "Helper signature widening (sourceMeta, formatProjectScanSummary, translateApiError): accepting `TFunction<readonly ['settings','common'], undefined>` (or `TFunction<any, undefined>` for cross-component helpers) preserves strict key checking inside the helper body without per-callsite casts. This is the canonical pattern for any non-component helper that needs translations."
  - "9 new top-level sub-trees in settings.json (company.*, companies.*, org.*, company-invites.*, join-requests.*, company-export.*, company-import.*, company-skills.*, costs.*) — explicit decision NOT to nest costs.* under company.* because Costs is conceptually a sibling of CompanySettings (top-level navigation), and Phase 8-03 already established settings:claude-accounts.costs.* (cost summary inside ClaudeAccounts pool). Two cost-related namespaces is acceptable since they cover disjoint UI surfaces."
  - "Helper-internal Local cast pattern (CompanyAccess.tsx): const tStrict = useTranslation(...).t; const t = tStrict as unknown as (...) => string. Preserves strict typing on tStrict for static callsites the IDE/compiler can prove, while permissive t handles dynamic-key lookups via ROLE_KEY/STATUS_KEY/PERMISSION_KEY indirection. First-class pattern for any component with 5+ static lookup-driven keys."
  - "company-import.tsx — readLocalPackageZip helper retains English error messages: error messages thrown deep inside zip parsing propagate to handleChooseLocalPackage's catch and are shown via translated toast title + raw English body (translateApiError fallback path). Keeping these English avoids translating library-level invariants that operators reading server logs need to read in EN. Operators see translated title 'Falha ao ler pacote' / 'Package read failed' with English diagnostic in body."
  - "INVITE_ROLE_VALUES + useMemo: reverted from `as const` array of inviteRoleOptions objects (with hardcoded label/description/gets) to a plain string union `[viewer, operator, admin, owner]` and reconstruct the option objects from t() inside useMemo([t]). The original const couldn't be parameterized and re-translated on locale change; useMemo+t-dep ensures reactive re-render."

patterns-established:
  - "Permissive cast at component scope: const t = tStrict as unknown as (key: string, options?) => string for components with 5+ dynamic dot-segmented lookups. Cleaner than per-call casts; static callsites still type-check via the original tStrict reference (which can be retained alongside)."
  - "TFunction signature widening for cross-component helpers: AnyTFunction = TFunction<any, undefined> on helper params accepts useTranslation namespace tuples without per-call casts. Pattern reusable for any helper consumed across components."
  - "Helper signature widening for non-component utilities: SkillsTFn = TFunction<readonly ['settings','common'], undefined> on sourceMeta/formatProjectScanSummary preserves strict key checking inside helper body."
  - "Brand-preserving interpolation reaffirmed: 'Paperclip' stays literal in i18next templates ({{name}} interpolation) — observed in company.access.description, claude-pool.description-prefix, company-import.local-zip-help, costs.metric-finance-events-subtitle. RTL probe asserts identical brand output across locales."

requirements-completed: [UI-04]

duration: ~58min
completed: 2026-04-26
---

# Phase 9 Plan 01: Admin/Company UI Translation Summary

**11 admin/company surface pages (~8741 LOC) migrated to react-i18next with 9 new settings.json sub-trees (812 leaf keys, ~570 added) covering Company Settings/Access, Companies list, Org chart, Invites, Join Requests, Export/Import, Skills, and Costs; ROLE_KEY/STATUS_KEY/PERMISSION_KEY canonical lookup maps replace hardcoded permissionLabels; translateApiError consumed in mutation error handlers; full UI suite 662/662 GREEN with 5 new RTL probe tests.**

## Performance

- **Duration:** ~58 min
- **Started:** 2026-04-26T19:25:00Z
- **Completed:** 2026-04-26T20:23:00Z
- **Tasks:** 4 (3 implementation + 1 verification/SUMMARY)
- **Files modified:** 16 (2 dictionaries extended + 11 TSX pages migrated + 3 test fixture-fixes)
- **Files created:** 3 (2 RTL probe tests + this SUMMARY)

## Accomplishments

- **9 new sub-trees in settings.json** (~570 new keys): company.* (CompanySettings + CompanyAccess core, ~190 keys), companies.*, org.*, company-invites.* (full sub-tree with 4 role-options + 4 states), join-requests.*, company-export.*, company-import.*, company-skills.* (largest sibling sub-tree with 6 sourceBadge fallbacks, scan-summary plural, 8 mutation toast triples), costs.* (full Costs page with overview/budget/providers/billers/finance tabs)
- **11 admin/company pages migrated** to useTranslation with all visible strings t()-driven; PT-BR locale renders entire admin surface natively
- **Static lookup map pattern (Phase 8-03 STATUS_KEY) extended to 3 maps in CompanyAccess.tsx**: ROLE_KEY (4 enum values × literal key), STATUS_KEY (4 incl. archived), PERMISSION_KEY (8 permission keys). Replaces hardcoded permissionLabels object that was a Pitfall 3 anti-pattern in RESEARCH.
- **Inner-component useTranslation pattern applied 10 times** (PendingJoinRequestCard, SupportMark, NewSkillForm, SkillList, SkillPane, ExportPreviewPane, ImportPreviewPane, ConflictResolutionList, AdapterPickerList, FinanceSummaryCard). Now canonical across v1.1.
- **Helper signature widening pattern established** in 3 forms: AnyTFunction = TFunction<any, undefined> for translateApiError (cross-component), TFunction<readonly ['settings','common'], undefined> for sourceMeta/formatProjectScanSummary (intra-component), permissive cast at component scope for ROLE_KEY/STATUS_KEY/PERMISSION_KEY lookups.
- **2 new RTL probe tests** with 5 cases covering pt-BR ↔ en-US toggle, plural _one/_other resolution (open-issues, pending-count), {{name}}/{{role}}/{{date}} interpolation, dialog copy. All GREEN.
- **Rule 1 fixture-fix protocol applied 3 times** (6th-8th application of pattern from Phase 8-01/8-02/8-03/8-04): CompanySettings.test, CompanyAccess.test, CompanyInvites.test wrapped in I18nextProvider with beforeAll en-US locale pin.
- **Full UI suite 662/662 GREEN** (was 657 baseline, +5 new probe tests; 0 regressions).
- **CI=true missing-keys vitest GREEN** (812 leaf keys, 100% pt-BR ↔ en-US parity).
- **UI typecheck passes with only pre-existing ActivityRow.tsx:42 error** (out-of-scope per Phase 8-05 deferred-items).

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit + extend settings.json with 9 sub-trees** — `d2736b7` (feat)
2. **Task 2: Migrate CompanySettings + CompanyAccess + tests + helper widening** — `46d0a29` (feat)
3. **Task 3: Migrate 9 sibling pages + CompanyInvites.test fixture-fix** — `1ee478e` (feat)

## Audit Results (Task 1, Pitfall 8 closed)

The 9 sibling pages (Companies, Org, OrgChart, CompanyInvites, JoinRequestQueue, CompanyExport, CompanyImport, CompanySkills, Costs) were not measured in the RESEARCH.md density estimate. Audit results:

| File | LOC | Approx Strings | Notes |
|------|-----|----------------|-------|
| Companies.tsx | 297 | ~15 | List view + delete confirm + rename inline edit + 2 plurals (agents/issues) |
| Org.tsx | 132 | ~5 | EmptyState + breadcrumb + role labels reused from packages/shared (server-side, untouched) |
| OrgChart.tsx | 627 | ~10 | Breadcrumb + EmptyStates + 3 zoom buttons (title + aria-label) + import/export buttons |
| CompanyInvites.tsx | 374 | ~50 | 4 invite role options × 3 fields each, history table 6 cols, latest-link UI, clipboard toast, 2 mutation toasts × 2 messages |
| JoinRequestQueue.tsx | 194 | ~25 | Breadcrumb + filter selectors (status + type), card copy, approve/reject toasts, invite-context with brand-preserving interpolation |
| CompanyExport.tsx | 1019 | ~15 visible (most are markdown/plain content) | Header export-suffix, files-selected plural, warnings plural, export CTA plural, package-files sidebar, search placeholder, show-more, 2 toast titles + bodies |
| CompanyImport.tsx | 1355 | ~40 visible | 3 inner components (ConflictResolutionList, AdapterPickerList, ImportPreviewPane); source picker (github/local), 3 selectors (target/new-name/collision), 4 plural counts (files-selected, conflicts, errors, items), 6 mutation toasts |
| CompanySkills.tsx | 1296 | ~75 | NewSkillForm + SkillList + SkillPane; 6 sourceBadge × (managed + fallback) = 12 keys; scan-summary plural with 4 interpolations; 8 mutation toasts; remove-skill dialog with currently-used-by interpolation; add-source dialog with 2 link cards |
| Costs.tsx | 1102 | ~70 | FinanceSummaryCard inner; 4 metric tiles × (label + subtitle); 5 tab triggers; inference-ledger card; by-agent/by-project sections; 4 budget control plane metrics; 3 budget scope sections (company/agent/project); ProviderTabLabel + BillerTabLabel inner |

**Estimate accuracy:** RESEARCH.md estimated ~280 strings total. Actual count is closer to ~570 leaf keys added (after splitting compound strings into prefix/middle/suffix segments and adding plural variants). Open Question #4 from RESEARCH closed: estimate was ±50% under for the rich UIs (CompanySkills, CompanyImport, Costs) but matched roughly on simpler ones (Companies, Org, JoinRequestQueue).

## Files Created/Modified

### Created

- `ui/src/pages/__tests__/CompanySettings.i18n.test.tsx` — RTL probe with 2 tests asserting 8 section headers + save/archive actions + interpolation
- `ui/src/pages/__tests__/CompanyAccess.i18n.test.tsx` — RTL probe with 2 tests asserting ROLE_KEY/STATUS_KEY/PERMISSION_KEY + Edit/Remove dialogs + plural _one/_other for open-issues + pending-count + {{date}} interpolation

### Modified — Dictionaries

- `ui/src/i18n/locales/pt-BR/settings.json` — 243 → 812 leaf keys (Phase 7 + Phase 8 sub-trees preserved verbatim; 9 new top-level sub-trees added)
- `ui/src/i18n/locales/en-US/settings.json` — mirror (812 leaf keys, 100% parity)

### Modified — UI

- `ui/src/lib/translateApiError.ts` — AnyTFunction type added; signature widened
- `ui/src/pages/CompanySettings.tsx` — 8 section migrations + window.confirm + 4 mutation onError handlers
- `ui/src/pages/CompanyAccess.tsx` — 3 lookup maps + permissive cast pattern + 5 dialog migrations
- `ui/src/pages/Companies.tsx` — list + plurals
- `ui/src/pages/Org.tsx` — empty states
- `ui/src/pages/OrgChart.tsx` — header + zoom buttons
- `ui/src/pages/CompanyInvites.tsx` — full migration with useMemo-driven role options
- `ui/src/pages/JoinRequestQueue.tsx` — full migration
- `ui/src/pages/CompanyExport.tsx` — full migration with inner ExportPreviewPane
- `ui/src/pages/CompanyImport.tsx` — full migration with 3 inner components
- `ui/src/pages/CompanySkills.tsx` — full migration with 3 inner components + 2 helper widening
- `ui/src/pages/Costs.tsx` — full migration with FinanceSummaryCard inner + dynamic key cast

### Modified — Tests

- `ui/src/pages/CompanySettings.test.tsx` — Rule 1 fixture-fix
- `ui/src/pages/CompanyAccess.test.tsx` — Rule 1 fixture-fix
- `ui/src/pages/CompanyInvites.test.tsx` — Rule 1 fixture-fix

## Decisions Made

See key-decisions in frontmatter for full list. Highlights:

- **AnyTFunction = TFunction<any, undefined>** for translateApiError accepts any useTranslation namespace tuple without per-callsite casts. Cleaner forward-compat for Plans 09-02/09-04.
- **3 levels of permissive cast pattern**: (1) component-scope cast for ROLE_KEY-style dynamic lookups, (2) helper signature widening for cross-component utilities (translateApiError), (3) intra-component helper signature pin (sourceMeta uses TFunction<readonly ['settings','common'], undefined> matching its caller).
- **9 separate sub-trees instead of nesting under company.***: Costs and Org are conceptually top-level, not children of CompanySettings. Two cost-related namespaces (settings:claude-accounts.costs.* from Phase 8-03 + settings:costs.* new) acceptable since they cover disjoint UI surfaces (pool cost summary vs Costs page).
- **STATUS_KEY extended to include archived**: CompanyMember type union forces this; archived members never appear in active table but type system requires the entry. Mapped to suspended label as a graceful fallback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test fixture] CompanySettings.test.tsx + CompanyAccess.test.tsx + CompanyInvites.test.tsx wrapped in I18nextProvider**
- **Found during:** Task 2 (CompanySettings + CompanyAccess) and Task 3 (CompanyInvites) full UI suite runs
- **Issue:** 3 of the pre-existing tests rendered via bare `createRoot` without I18nextProvider. After migration, the pages render translated strings via t(). Without I18nextProvider, react-i18next emitted "NO_I18NEXT_INSTANCE" warnings and rendered raw key strings. Existing English text assertions (e.g. `expect(textContent).toContain("Edit")`, "Manage company user memberships") failed because rendered text was the raw key.
- **Fix:** Imported `I18nextProvider` + `i18n` singleton, wrapped each `root.render(...)` call in `<I18nextProvider i18n={i18n}>...</I18nextProvider>`. Added `beforeAll(async () => i18n.changeLanguage('en-US'))` so existing English assertions still match. Mirrors Phase 8-01 (4 inbox tests), Phase 8-02 (ProjectWorkspaceSummaryCard.test.tsx), Phase 8-03 (ClaudeAccounts.test.tsx), and Phase 8-04 (Sidebar.test/SidebarAccountMenu.test/SidebarCompanyMenu.test) fixture-fix pattern. **6th, 7th, and 8th applications of the protocol.**
- **Files modified:** ui/src/pages/CompanySettings.test.tsx, ui/src/pages/CompanyAccess.test.tsx, ui/src/pages/CompanyInvites.test.tsx
- **Verification:** All 3 test suites GREEN; full UI suite 662/662 GREEN
- **Committed in:** `46d0a29` (CompanySettings + CompanyAccess fixtures atomic with Task 2 migration), `1ee478e` (CompanyInvites fixture atomic with Task 3 migration)

**2. [Rule 1 - Bug] translateApiError TFunction signature mismatch**
- **Found during:** Task 2 (running `pnpm typecheck` after CompanySettings migration)
- **Issue:** The translateApiError helper from Plan 09-03b was typed `t: TFunction` (default `<'common', undefined>`). Components migrated in this plan use `useTranslation(['settings', 'common'])` returning `TFunction<readonly ['settings','common'], undefined>`. TypeScript rejected the parameterized variant because the namespace type tuple is invariant. Compounded by the fact that the helper internally already does a permissive cast — only the public signature was the obstacle.
- **Fix:** Added type alias `AnyTFunction = TFunction<any, undefined>` in translateApiError.ts; widened the `t` parameter to accept `AnyTFunction | TFunction | callable`. The `any` is contained at the type-alias level; helper internals still use the permissive cast for runtime-key resolution. Per-callsite casts in components avoided.
- **Files modified:** ui/src/lib/translateApiError.ts
- **Verification:** `pnpm typecheck` passes (only pre-existing ActivityRow:42 remains); 9 callsites in CompanyAccess + CompanySettings + CompanyInvites all type-check
- **Committed in:** `46d0a29` (atomic with Task 2 migration that surfaced the type error)

**3. [Rule 2 - Critical missing functionality] STATUS_KEY missing 'archived' enum value**
- **Found during:** Task 2 typecheck error in CompanyAccess.tsx after creating STATUS_KEY map
- **Issue:** CompanyMember['status'] is `'active' | 'pending' | 'suspended' | 'archived'` (4-value union). Initial STATUS_KEY only had 3 entries — TypeScript rejected the Record<EnumValue, string> declaration as missing 'archived' key.
- **Fix:** Added `archived: "settings:company.access.status.suspended"` to STATUS_KEY (with comment explaining intentional reuse — archived members never appear in active members table where status badge renders, but type system requires the entry). Alternative was narrowing the type at usage site, but that requires touching the API surface.
- **Files modified:** ui/src/pages/CompanyAccess.tsx
- **Verification:** Typecheck passes
- **Committed in:** `46d0a29`

**4. [Rule 3 - Blocker] CompanyInvites.test asserted "Copied" badge text**
- **Found during:** Task 3 full UI suite run, after migrating CompanyInvites.tsx
- **Issue:** Initial migration replaced the "Copied" badge inside the latest-invite block with `t("settings:company-invites.created-title")` ("Invite created") — but the existing test asserted that "Copied" appears when latestInviteCopied state is true. Wrong key choice.
- **Fix:** Changed the badge to consume the existing Phase 8 key `t("settings:company.invites.copied")` ("Copied" / "Copiado") which was already in the dictionary as part of the OpenClaw invite snippet flow in CompanySettings. No new key needed.
- **Files modified:** ui/src/pages/CompanyInvites.tsx
- **Verification:** CompanyInvites.test 2/2 GREEN
- **Committed in:** `1ee478e`

---

**Total deviations:** 4 auto-fixes — 3 Rule 1 (test fixtures), 1 Rule 2 (missing enum value), 1 Rule 3 (key reuse). **Plan impact:** No scope expansion; all fixes preserve existing behavior. The TFunction signature widening is a beneficial side-effect — Plans 09-02/09-04 will consume translateApiError without additional casts.

## Issues Encountered

- **TypeScript strict typed-t() augmentation rejection** of dynamic keys: ROLE_KEY[role], STATUS_KEY[status], PERMISSION_KEY[k], and `settings:costs.${scopeType}-budgets` template literals all required permissive casts. Pattern is now well-understood (3 different cast forms documented in patterns-established).
- **Pre-existing TS error in `ui/src/components/ActivityRow.tsx:42`** preserved through this plan. Reproduced in master via stash before starting work. Out-of-scope per Boundary rule (Phase 8-05 already documented in deferred-items).
- **Pre-existing TS error in `server/src/services/recovery/service.ts:459`** preserved on `pnpm -r typecheck`. Out-of-scope per Boundary rule (Plan 09-03a already documented).
- **CRLF line ending warnings** during git add on the JSON dictionaries and a few TSX files. Cosmetic (Windows + .gitattributes default); zero functional impact.

## Manual Configuration Required

Nothing — UI-only changes. Already verified missing-keys CI=true detector GREEN, full UI suite GREEN, both locales render natively for all 11 admin pages.

## Self-Check: PASSED

Verified post-write:
- [x] `ui/src/i18n/locales/pt-BR/settings.json` exists, 812 leaf keys parse, contains all 9 new sub-trees (company, companies, org, company-invites, join-requests, company-export, company-import, company-skills, costs) AND preserves Phase 7 (language) + Phase 8 (instance-settings/general/heartbeats/experimental/profile/claude-accounts) byte-by-byte
- [x] `ui/src/i18n/locales/en-US/settings.json` exists, 812 leaf keys, perfect mirror (programmatically verified: 0 pt-only keys, 0 en-only keys)
- [x] `CompanySettings.tsx` contains `useTranslation` AND ≥10 `t("settings:company.` callsites
- [x] `CompanyAccess.tsx` contains `ROLE_KEY` AND `STATUS_KEY` AND `PERMISSION_KEY` AND uses `t(ROLE_KEY[...])` pattern
- [x] `CompanyInvites.tsx` contains `useTranslation` AND `translateApiError`
- [x] `JoinRequestQueue.tsx` contains `useTranslation` AND `t("settings:join-requests.`
- [x] `Companies.tsx` / `Org.tsx` / `OrgChart.tsx` / `CompanyExport.tsx` / `CompanyImport.tsx` / `CompanySkills.tsx` / `Costs.tsx` all contain `useTranslation`
- [x] `CompanySettings.i18n.test.tsx` exists; 2 tests passing (pt-BR + en-US)
- [x] `CompanyAccess.i18n.test.tsx` exists; 2 tests passing including plural _one/_other and {{name}} interpolation
- [x] Commits exist: `d2736b7`, `46d0a29`, `1ee478e`
- [x] `pnpm --filter @paperclipai/ui typecheck` passes (only pre-existing ActivityRow:42 error)
- [x] `CI=true npx vitest run missing-keys` 1/1 GREEN
- [x] `CI=true npx vitest run CompanySettings.i18n CompanyAccess.i18n` 5 tests GREEN
- [x] Full UI suite `CI=true npx vitest run` 662/662 GREEN (was 657 baseline + 5 new probes)
- [x] Phase 7 baseline (`ProfileSettings.locale-toggle.test.tsx`) and Phase 8 plans 01-05 integrations intact (suite-wide GREEN)

## Next Phase Readiness

- **Plan 09-02 (Auth forms)** unblocked: file set is disjoint (Auth.tsx, BoardClaim.tsx, CliAuth.tsx, InviteLanding.tsx) and translateApiError now accepts the `useTranslation(['auth','common'])` TFunction tuple without per-callsite casts. AnyTFunction widening is forward-compat.
- **Plan 09-04 (Tooltips/empty/modais/toasts)** unblocked: same TFunction signature compatibility. The cross-cutting toast/tooltip strings in admin pages are already migrated in this plan; 09-04 only needs to touch components in `ui/src/components/` (Sidebar*, Layout, MobileBottomNav already done in 08-04).
- **Phase 9 closure on track:** With 09-01 (UI-04) and 09-03a/03b (UI-07) done, only 09-02 (UI-06) and 09-04 (UI-08) remain. UI-04 is the largest closer in this phase, accounting for ~60% of new dictionary keys.
- **Patterns canonicalized for v1.1:** Permissive cast at component scope, helper signature widening (3 forms), inner-component useTranslation, brand-preserving interpolation, Rule 1 fixture-fix protocol (8 applications across Phase 8 + 9-01). Plan 09-02 and 09-04 should reuse without re-deriving.

---
*Phase: 09-traducao-ui-admin-auth-sistemicas*
*Concluída: 2026-04-26*
