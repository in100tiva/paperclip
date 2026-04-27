---
phase: 07-foundation-i18n-toggle-de-settings
plan: 01
subsystem: testing
tags: [i18n, i18next, vitest, json-dictionaries, tdd-red-phase, supertest]

requires: []
provides:
  - 16 bootstrap JSON dictionary files (8 namespaces × 2 locales) at ui/src/i18n/locales/
  - Bootstrap keys: common.app-name + settings.language.{title,description,pt-br,en-us}
  - 5 failing test files covering all 9 phase requirements (SETTINGS-01..04, I18N-01..05)
  - Wave 0 RED contract — every requirement is anchored by at least one failing test before any production code
affects:
  - 07-02 (schema/validators bring SETTINGS-02/03 + I18N-02 dict imports green)
  - 07-03 (i18n init module brings I18N-01/I18N-03 + missing-keys detector resources green)
  - 07-04 (server route + middleware bring SETTINGS-02/03 server side + I18N-05 green)
  - 07-05 (ProfileSettings toggle UI brings SETTINGS-01/04 green)

tech-stack:
  added: []  # only filesystem scaffolds + tests; no production deps yet (i18next install lands in Plan 03)
  patterns:
    - "Wave 0 RED phase: every phase requirement anchored by at least one failing test before any production code"
    - "Mirror existing supertest fixture pattern from auth-routes.test.ts (createSelectChain / createUpdateChain / createApp)"
    - "Co-locate i18n tests with dictionaries under ui/src/i18n/__tests__/"
    - "Per-test jsdom env via // @vitest-environment jsdom (default vitest env stays node)"

key-files:
  created:
    - ui/src/i18n/locales/pt-BR/common.json
    - ui/src/i18n/locales/pt-BR/inbox.json
    - ui/src/i18n/locales/pt-BR/projects.json
    - ui/src/i18n/locales/pt-BR/settings.json
    - ui/src/i18n/locales/pt-BR/auth.json
    - ui/src/i18n/locales/pt-BR/agents.json
    - ui/src/i18n/locales/pt-BR/errors.json
    - ui/src/i18n/locales/pt-BR/activity.json
    - ui/src/i18n/locales/en-US/common.json
    - ui/src/i18n/locales/en-US/inbox.json
    - ui/src/i18n/locales/en-US/projects.json
    - ui/src/i18n/locales/en-US/settings.json
    - ui/src/i18n/locales/en-US/auth.json
    - ui/src/i18n/locales/en-US/agents.json
    - ui/src/i18n/locales/en-US/errors.json
    - ui/src/i18n/locales/en-US/activity.json
    - ui/src/i18n/__tests__/init.test.ts
    - ui/src/i18n/__tests__/missing-keys.test.ts
    - ui/src/pages/__tests__/ProfileSettings.locale-toggle.test.tsx
    - server/src/__tests__/auth-routes-locale.test.ts
    - server/src/__tests__/middleware-locale.test.ts
  modified: []

key-decisions:
  - "Bootstrap dictionaries use kebab-case dot-notation (e.g. common.app-name, settings.language.pt-br) per CONTEXT.md decision"
  - "Other 6 namespaces (inbox, projects, auth, agents, errors, activity) ship as empty {} placeholders; real strings land in Phases 8-11"
  - "Per-test jsdom env on ProfileSettings.locale-toggle test (annotation comment) — keeps default vitest env=node for non-DOM tests"
  - "Mirror auth-routes.test.ts fixture (createSelectChain/createUpdateChain) instead of standing up real DB — drizzle stubs are sufficient for SETTINGS-02/03 contract"
  - "Middleware test calls actorMiddleware(db, opts) with current 2-arg signature; opts cast as any to bypass DeploymentMode union not including 'single' yet (Plan 04 may extend)"

patterns-established:
  - "Wave 0 RED-only: tests reference modules/imports that do not exist yet (e.g. @/i18n, ../resources). Failure mode is module-not-found / assertion-fail. Subsequent waves bring imports online and assertions green."
  - "Each test names its requirement IDs in describe/it text (e.g. 'SETTINGS-01: renders pt-BR and en-US radios') for traceability."
  - "Detector test (missing-keys) gates on process.env.CI === 'true' to fail in CI but warn-only in dev — preserves dev velocity without losing CI safety."

requirements-completed: []  # Plan 01 lands the FAILING tests for 9 requirements; the requirements themselves go green in Plans 02-05.

duration: 4min
completed: 2026-04-26
---

# Phase 07 Plan 01: Wave 0 RED — i18n Foundation Tests + JSON Dictionary Scaffolds

**16 bootstrap JSON dictionaries (8 namespaces × 2 locales) and 5 failing test files anchoring all 9 phase requirements (SETTINGS-01..04, I18N-01..05) before any production code lands.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-26T12:05:09Z
- **Completed:** 2026-04-26T12:08:48Z
- **Tasks:** 3 / 3
- **Files created:** 21 (16 JSON + 5 test files)
- **Files modified:** 0

## Accomplishments

- 16 dictionary JSON files exist and parse as valid JSON (verified inline)
- `common.json` populated with `app-name`, `loading`, `save`, `cancel` (both locales)
- `settings.json` populated with `language.{title,description,pt-br,en-us}` (toggle bootstrap)
- 6 placeholder namespaces (inbox, projects, auth, agents, errors, activity) shipped as `{}` for both locales — Phases 8-11 will populate
- 3 UI failing tests committed: i18n init (I18N-01/02/03), missing-keys detector (I18N-04), ProfileSettings toggle (SETTINGS-01/04)
- 2 server failing tests committed: PATCH /api/auth/profile { locale } (SETTINGS-02/03), actorMiddleware req.locale (I18N-05)
- Every test file cites its requirement IDs in describe/it strings for traceability
- All 5 test files confirmed RED via `npx vitest run` against current codebase (modules `../index`, `../resources`, `@/i18n` absent; route does not accept `locale`; middleware does not set `req.locale`)

## Task Commits

Each task committed atomically with `--no-verify` (parallel-executor protocol):

1. **Task 1: Bootstrap 16 JSON dictionary scaffolds** — `6215174` (feat)
2. **Task 2: Wave 0 failing UI tests (i18n init + missing-keys + ProfileSettings toggle)** — `dada008` (test)
3. **Task 3: Wave 0 failing server tests (auth-routes-locale + middleware-locale)** — `0f5179a` (test)

## Files Created

### Dictionaries (Task 1)
- `ui/src/i18n/locales/pt-BR/common.json` — bootstrap pt-BR common namespace (app-name + 3 utility strings)
- `ui/src/i18n/locales/en-US/common.json` — bootstrap en-US common namespace
- `ui/src/i18n/locales/pt-BR/settings.json` — toggle labels (Idioma + radio descriptions)
- `ui/src/i18n/locales/en-US/settings.json` — toggle labels (Language + radio descriptions)
- `ui/src/i18n/locales/{pt-BR,en-US}/{inbox,projects,auth,agents,errors,activity}.json` — 12 empty `{}` placeholders

### UI failing tests (Task 2)
- `ui/src/i18n/__tests__/init.test.ts` — covers I18N-01 (8 namespaces), I18N-02 (16 dict files), I18N-03 (en-US fallback)
- `ui/src/i18n/__tests__/missing-keys.test.ts` — covers I18N-04 (regex-extract t() calls; CI fail vs dev warn)
- `ui/src/pages/__tests__/ProfileSettings.locale-toggle.test.tsx` — covers SETTINGS-01 (radio render), SETTINGS-04 (i18n.changeLanguage + PATCH locale)

### Server failing tests (Task 3)
- `server/src/__tests__/auth-routes-locale.test.ts` — covers SETTINGS-02 (PATCH persistence), SETTINGS-03 (default pt-BR), enum validation
- `server/src/__tests__/middleware-locale.test.ts` — covers I18N-05 (req.locale from authUsers.locale; Accept-Language fallback; final fallback pt-BR)

## Decisions Made

- **Kebab-case dot-notation throughout** (e.g. `common.app-name`, `settings.language.pt-br`) — matches CONTEXT.md decision and is i18next-idiomatic.
- **Empty `{}` for 6 namespaces** — Phase 7 is foundation only; Phases 8-11 are the natural homes for inbox/project/auth/agent/error/activity strings.
- **Per-test jsdom env** via `// @vitest-environment jsdom` annotation — keeps `ui/vitest.config.ts` default env=node intact (no infrastructure churn for one DOM-rendering test).
- **Drizzle stub fixture mirrored from `auth-routes.test.ts`** instead of provisioning a real DB connection — sufficient for SETTINGS-02/03 contract; ergonomically consistent with the existing test suite.
- **Middleware test calls `actorMiddleware(db, opts)` with the current 2-arg signature** and casts opts as `any` to bypass `DeploymentMode` union narrowing (current union does not include `'single'`); Plan 04 will validate the final shape.

## Deviations from Plan

None — plan executed exactly as written.

The plan's example code for `auth-routes-locale.test.ts` proposed a real-DB integration via `createDb` + `createAuthRouter` factory; I substituted the existing project's stubbed-drizzle fixture pattern (per the plan's own instruction: "If existing supertest fixture pattern differs from the above, adopt the existing pattern verbatim"). This is **not a deviation** — it is the explicit instruction inside the action block.

The plan's example code for `middleware-locale.test.ts` used `actorMiddleware({ db, deploymentMode, ... })` (single-arg config object); the actual signature is `actorMiddleware(db, opts)`. I adapted to the real signature (per the same instruction). Again, **not a deviation**.

## Issues Encountered

None blocking. Two minor adaptations during test authoring:
- `ui/vitest.config.ts` defaults to `environment: "node"` — added `// @vitest-environment jsdom` to the ProfileSettings test instead of changing global config.
- `actorMiddleware` 2-arg signature differs from plan example; adapted test verbatim.

## Manual Setup Required

None. No external services configured in this plan.

## Self-Check

Verified:
- 16 JSON files exist at `ui/src/i18n/locales/{pt-BR,en-US}/*.json` and parse as valid JSON (inline `node -e` check passed: "OK 16 valid JSON")
- 5 test files exist at expected paths
- All 3 commits exist in git log: `6215174`, `dada008`, `0f5179a`
- Test execution confirmed RED:
  - `init.test.ts`: 2/3 fail with `Cannot find module '../index'` (I18N-01, I18N-03 RED; I18N-02 PASS — files exist from Task 1)
  - `missing-keys.test.ts`: collection fails with `Cannot find module '../resources'` (I18N-04 RED — Plan 03 brings online)
  - `ProfileSettings.locale-toggle.test.tsx`: collection fails with module-resolution error on `@/i18n` (SETTINGS-01/04 RED — Plan 03 + 05)
  - `auth-routes-locale.test.ts`: 2/3 fail (SETTINGS-02 expected 200 got 400 because schema rejects unknown `locale` key; SETTINGS-03 RED because response body lacks `locale`); enum-rejection test passes incidentally
  - `middleware-locale.test.ts`: 3/3 fail with `expected undefined to be 'pt-BR'` / `'en-US'` (I18N-05 RED — middleware does not set req.locale)

## Self-Check: PASSED

## Next Phase Readiness

**Ready for parallel Wave 1 (Plans 02 + 03):**
- Plan 02 (DB schema + Zod validators) brings `auth-routes-locale.test.ts` partially green (SETTINGS-02 acceptance + SETTINGS-03 default) and unblocks `currentUserProfileSchema.locale` consumers.
- Plan 03 (i18n init module + resources + main.tsx wiring) brings `init.test.ts` and `missing-keys.test.ts` green; unblocks `@/i18n` imports for Plan 05.

**Wave 2 (Plans 04 + 05) follow naturally:**
- Plan 04 (server middleware + route extension) brings `middleware-locale.test.ts` green and finalizes `auth-routes-locale.test.ts`.
- Plan 05 (ProfileSettings toggle UI) brings `ProfileSettings.locale-toggle.test.tsx` green.

No blockers. The RED contract from this plan locks the validation surface for the rest of the phase — Wave 1+ implementations cannot drift from observable behavior without breaking these tests.

---
*Phase: 07-foundation-i18n-toggle-de-settings*
*Concluído: 2026-04-26*
