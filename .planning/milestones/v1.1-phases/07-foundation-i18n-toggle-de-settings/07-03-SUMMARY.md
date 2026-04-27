---
phase: 07-foundation-i18n-toggle-de-settings
plan: 03
subsystem: ui-i18n
tags: [i18n, i18next, react-i18next, ui-bootstrap, typescript-augmentation, vite-json-imports]

requires:
  - 07-01 (16 JSON dictionaries + RED tests for init.test.ts and missing-keys.test.ts)
provides:
  - i18next + react-i18next dependencies in @paperclipai/ui
  - ui/src/i18n/resources.ts: static imports of all 16 JSON dictionaries + typed `resources` object + `defaultNS`
  - ui/src/i18n/index.ts: configured i18next singleton (8 namespaces, fallbackLng en-US, lng pt-BR, useSuspense:false, returnEmptyString:false, dev-only missingKeyHandler)
  - ui/src/i18n/i18next.d.ts: TypeScript module augmentation (CustomTypeOptions) for typed t() autocomplete
  - GREEN status for I18N-01, I18N-02, I18N-03, I18N-04
affects:
  - 07-04 (server middleware/routes — independent, no direct coupling)
  - 07-05 (ProfileSettings UI — will import `@/i18n` and call `i18n.changeLanguage`; this plan unblocks that import)

tech-stack:
  added:
    - "i18next ^26.0.8 (translation engine, namespaces, fallback chain)"
    - "react-i18next ^17.0.4 (React 19 bindings: useTranslation, Trans, I18nextProvider)"
  patterns:
    - "Static JSON imports for dictionaries (Vite handles natively, no plugin)"
    - "Non-Suspense react-i18next mode (CONTEXT decision: hot-swap without boundary boilerplate)"
    - "TypeScript module augmentation via declare module \"i18next\" + CustomTypeOptions (pt-BR is canonical key shape)"
    - "Dev-only missingKeyHandler that warns to console (saveMissing:true in dev, false in prod/test)"
    - "as const on resources object preserves literal types for typed t() autocomplete"

key-files:
  created:
    - ui/src/i18n/resources.ts
    - ui/src/i18n/index.ts
    - ui/src/i18n/i18next.d.ts
  modified:
    - ui/package.json (added i18next + react-i18next dependencies)
    - pnpm-lock.yaml (resolved new transitive tree)
    - package.json (pnpm.overrides: pinned loupe to 3.2.0 — see Issues Encountered)
    - ui/storybook/fixtures/paperclipData.ts (added locale: "pt-BR" to AuthSession user fixture; carry-over from 07-02 schema extension that the parallel sibling left typecheck-failing)

key-decisions:
  - "Pin loupe to 3.2.0 via pnpm overrides — the 3.2.1 install directory was corrupted at NTFS level on the executor's filesystem (every read/scandir on lib/ returned UNKNOWN errno -4094). 3.2.0 is the immediately prior release; functional diff is none for vitest's needs. Override is local-friction insurance, not a project requirement."
  - "Skipped i18next-browser-languagedetector — RESEARCH §Open Questions recommendation; pre-login default lng:'pt-BR' covers the auth page; once user logs in, Plan 05 syncs i18n.changeLanguage(session.user.locale)."
  - "saveMissing gated on import.meta.env.DEV (true in vite dev + vitest, false in vite build) — keeps prod bundle clean, dev console actionable."
  - "Module augmentation uses `(typeof resources)[\"pt-BR\"]` as the source of truth for typed t() autocomplete — pt-BR is the operator's primary locale (CONTEXT decision); en-US dictionaries can lag without breaking type checks."

requirements-completed:
  - I18N-01
  - I18N-02
  - I18N-03
  - I18N-04

duration: 22min
completed: 2026-04-26
---

# Phase 07 Plan 03: i18n Engine Bootstrap (i18next + react-i18next + module augmentation)

**i18next singleton with 8 namespaces wired in @paperclipai/ui, brings Wave 0 init.test.ts (I18N-01/02/03) and missing-keys.test.ts (I18N-04) GREEN.**

## Performance

- **Duration:** ~22 min (heavily inflated by NTFS-level corruption recovery in node_modules; clean-machine baseline would be ~4 min)
- **Started:** 2026-04-26T12:29:13Z
- **Completed:** 2026-04-26T12:51:03Z
- **Tasks:** 3 / 3
- **Files created:** 3 (resources.ts, index.ts, i18next.d.ts)
- **Files modified:** 4 (ui/package.json, pnpm-lock.yaml, package.json, ui/storybook/fixtures/paperclipData.ts)

## Accomplishments

- i18next ^26.0.8 + react-i18next ^17.0.4 installed in @paperclipai/ui
- pnpm-lock.yaml updated and committed (new transitive tree)
- `ui/src/i18n/resources.ts` exports 16 statically-imported dictionaries + `resources` object + `defaultNS = "common" as const` + `SupportedLocale`/`Namespace` types
- `ui/src/i18n/index.ts` initializes i18next via `initReactI18next`:
  - 8 namespaces (common, inbox, projects, settings, auth, agents, errors, activity)
  - fallbackLng: "en-US", lng: "pt-BR"
  - interpolation.escapeValue: false (React already escapes)
  - returnEmptyString: false
  - react: { useSuspense: false }
  - saveMissing + missingKeyHandler gated on import.meta.env.DEV
- `ui/src/i18n/i18next.d.ts` declares `module "i18next"` with `CustomTypeOptions` (defaultNS + pt-BR resources) for typed t() autocomplete
- Vitest run (`npx vitest run src/i18n/__tests__/init.test.ts src/i18n/__tests__/missing-keys.test.ts`): 4/4 PASS
  - I18N-01: i18n.options.ns === 8 entries ✓
  - I18N-02: 16 JSON files exist and parse ✓
  - I18N-03: t("common:app-name") and t("settings:language.title") resolve to translated strings (not raw keys) ✓
  - I18N-04: detector finds zero orphan t() calls in source (today there are none — Plan 05 introduces the first ones) ✓
- Carry-over fix: `ui/storybook/fixtures/paperclipData.ts` updated to satisfy the `locale` field that 07-02 added to `AuthSession.user` (Rule 3 — blocker fix scoped to make typecheck cleaner without touching out-of-scope test fixtures)

## Task Commits

Each task committed atomically with `--no-verify` (parallel-executor protocol):

1. **Task 1: Install i18next + react-i18next** — `db25761` (feat)
2. **Task 2: resources.ts (static JSON imports + typed resources object)** — `0eb3d9f` (feat)
3. **Task 3: index.ts (i18next singleton) + i18next.d.ts (module augmentation) + loupe override** — `bffaeb2` (feat)

## Files Created

- `ui/src/i18n/resources.ts` — 16 static JSON imports → typed `resources` object; exports `defaultNS`, `SupportedLocale`, `Namespace`
- `ui/src/i18n/index.ts` — configured i18next singleton (8 ns, en-US fallback, pt-BR default, non-Suspense, dev-only missing-key warn)
- `ui/src/i18n/i18next.d.ts` — declare module "i18next" CustomTypeOptions (defaultNS + pt-BR resources for typed t())

## Files Modified

- `ui/package.json` — added `"i18next": "^26.0.8"` and `"react-i18next": "^17.0.4"` to dependencies
- `pnpm-lock.yaml` — new transitive tree
- `package.json` — added `"loupe": "3.2.0"` to `pnpm.overrides` (recovery from local NTFS corruption — see Issues)
- `ui/storybook/fixtures/paperclipData.ts` — added `locale: "pt-BR"` to `storybookAuthSession.user` (carry-over from 07-02 type extension; the parallel sibling left this fixture mismatched)

## Decisions Made

- **i18next-browser-languagedetector skipped (per RESEARCH §Open Questions)** — pre-login UI defaults to pt-BR; post-login Plan 05 syncs `i18n.changeLanguage(session.user.locale)`.
- **saveMissing on isDev only** — keeps prod bundle silent; vitest test runs trigger it (MODE === "test", DEV === true), which is intended.
- **pt-BR as canonical resources type** — module augmentation uses `(typeof resources)["pt-BR"]` so t() autocomplete reflects the operator's primary locale; en-US dictionaries can lag without breaking compile.
- **Loupe pinned to 3.2.0 via pnpm overrides** — see Issues Encountered. Functional substitute (no diff for vitest's expect API surface).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Storybook fixture missing `locale` field**
- **Found during:** Task 1 (typecheck verification step)
- **Issue:** `ui/storybook/fixtures/paperclipData.ts:104-108` constructs `AuthSession.user` without the `locale` field that the parallel sibling 07-02 added to the type. `pnpm --filter @paperclipai/ui typecheck` fails with TS2741 on `paperclipData.ts:104`.
- **Fix:** Added `locale: "pt-BR"` to the storybook fixture user object.
- **Files modified:** `ui/storybook/fixtures/paperclipData.ts`
- **Commit:** `db25761` (rolled into Task 1)
- **Rationale:** This fixture is consumed by storybook stories that the typecheck includes. The 07-02 sibling extended the type but didn't update this fixture (likely scoped out). Fixing here unblocks Task 1's typecheck acceptance criterion.

**2. [Rule 3 - Blocker] node_modules/.pnpm/loupe@3.2.1 NTFS corruption**
- **Found during:** Task 3 (vitest run verification step)
- **Issue:** `npx vitest run` errored with `Cannot find module 'D:\projetos\ddd\node_modules\.pnpm\loupe@3.2.1\node_modules\loupe\lib\array.js'`. Investigation revealed the directory had two `.` entries (corrupted inode), every `readdirSync` failed with `UNKNOWN errno -4094`, files reported as "exists" but were unreadable, and `rm -rf` / `Remove-Item` / `cmd rmdir` all failed with "O arquivo ou pasta está corrompido e ilegível". This is an NTFS-level filesystem corruption, not a pnpm bug — it requires `chkdsk D: /f` (admin reboot) to fully remediate.
- **Fix:** Pinned `loupe` to `3.2.0` (the immediately prior release; no functional diff for vitest's expect API surface) via `pnpm.overrides` in root `package.json`. `pnpm install` resolved a fresh `loupe@3.2.0` directory cleanly. After this, `npx vitest run` passes 4/4 tests.
- **Files modified:** `package.json` (overrides), `pnpm-lock.yaml` (new resolution)
- **Commit:** `bffaeb2` (rolled into Task 3)
- **Rationale:** Recovery from local-machine NTFS corruption is genuinely outside the project's behavior surface; the override is a hostile-environment shim that costs zero (3.2.0 → 3.2.1 is a patch with no breaking changes). When the operator next runs `chkdsk D: /f`, the override can be safely removed (or left in for reproducibility — overrides cost nothing in CI which uses fresh clones).

### Non-deviations

- The plan's verify steps used `pnpm --filter @paperclipai/ui test:run`; the workspace doesn't expose a `test:run` script (root has `pnpm test:run` which calls `node scripts/run-vitest-stable.mjs`). I substituted `npx vitest run <files>` from the `ui/` directory — same intent, same vitest binary, same output. Already documented in Plan 01 as the actual UI test invocation pattern.

## Issues Encountered

### NTFS-level corruption on `node_modules\.pnpm\loupe@3.2.1\node_modules\loupe\lib`

Symptoms:
- `readdirSync` returns 0 entries OR throws `UNKNOWN errno -4094`
- `cmd dir` shows "Arquivo não encontrado" while `cmd rmdir` fails with "A pasta não está vazia"
- The directory has two `.` self-entries (NTFS index corruption signature)
- `Remove-Item` (PowerShell), `[System.IO.Directory]::Delete` (.NET long-path), `cp -rf`, `rm -rf`, `cmd ren`, `mv` all fail with corruption errors
- Tried robocopy mirror (succeeded in clearing visible content but the inode itself remained corrupt and unrenamable)

Root cause: Earlier `pnpm install --force` was interrupted by an `EBUSY` lock on `cross-env-shell.ps1`. The interrupted install left `loupe@3.2.1`'s lib directory in a half-deleted half-recreated state that the NTFS journal could not fully roll back.

Resolution: Pinned `loupe@3.2.0` via pnpm overrides; pnpm resolved a fresh hash-named directory and bypassed the corrupted 3.2.1 entirely. The corrupted directory remains on disk as zombie data but doesn't affect any code path.

Recommendation for operator (out of scope for this plan): run `chkdsk D: /f` (requires reboot) to reclaim the corrupt inode and remove the loupe override.

## Manual Setup Required

None.

## Self-Check

Verified:
- 3 created files exist at expected paths (`ui/src/i18n/{resources,index,i18next.d}.ts`)
- 3 commits exist in git log: `db25761`, `0eb3d9f`, `bffaeb2`
- 16 JSON imports in resources.ts (`grep -c 'import .* from "./locales/'` returns 16)
- `i18next` and `react-i18next` present in `ui/package.json` dependencies at the verified majors
- `npx vitest run src/i18n/__tests__/init.test.ts src/i18n/__tests__/missing-keys.test.ts` from `ui/`: **4/4 PASS** (Test Files 2 passed, Tests 4 passed in 2.60s)
- `import.meta.env.DEV` evaluation gates dev-only saveMissing/console.warn (no console noise in prod build)

Known typecheck residue (out of scope — RED contract from Plan 01, brought GREEN by Plan 05):
- `src/pages/__tests__/ProfileSettings.locale-toggle.test.tsx` errors on `@testing-library/react`, `@testing-library/user-event`, and `toBeInTheDocument` matchers. Plan 01's RED contract explicitly stated these would stay RED until Plan 05 lands the UI implementation + testing-library deps. This is the expected Wave-pipeline state — not a regression introduced here.

## Self-Check: PASSED

## Next Phase Readiness

**Plan 03 unblocks Plan 05** (ProfileSettings toggle UI):
- `import i18n from "@/i18n"` now resolves
- `useTranslation()` is available
- The 8 namespaces are loaded with bootstrap content (settings.language.{title,description,pt-br,en-us} ready for radio labels)
- Module augmentation gives Plan 05 typed t() autocomplete from day one

**Plan 03 is independent of Plan 04** (server middleware/routes) — Wave 1 parallel execution rationale validated.

**No blockers** for Wave 2 (Plans 04 + 05).

## Known Stubs

None. Every dictionary key consumed by tests in this plan resolves to a real translated string. Empty namespaces (inbox, projects, auth, agents, errors, activity) are intentional placeholders — Phases 8-11 populate them as their respective UIs land. The init test (I18N-01) only asserts `ns.length === 8`; it does not require non-empty content. The missing-keys detector (I18N-04) finds zero orphan keys today because no `t()` calls exist in non-test source yet — Plan 05 introduces the first ones with `settings:language.*` keys that already exist in both pt-BR and en-US dictionaries (verified inline).

---
*Phase: 07-foundation-i18n-toggle-de-settings*
*Concluído: 2026-04-26*
