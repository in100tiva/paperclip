---
phase: 07-foundation-i18n-toggle-de-settings
plan: 04
subsystem: server-locale-wireup
tags: [express, middleware, locale, i18n, accept-language, type-augmentation, foundation]

requires:
  - 07-01 (Wave 0 RED: middleware-locale.test.ts + auth-routes-locale.test.ts in place)
  - 07-02 (authUsers.locale column; localeSchema; currentUserProfileSchema.locale; route locale read/write seeded as Rule 3 blocker fix)

provides:
  - server/src/lib/parse-accept-language.ts — minimal pt/en startsWith parser
  - Express.Request.locale: 'pt-BR' | 'en-US' (non-optional global type augmentation)
  - actorMiddleware populates req.locale on every code path (3-tier fallback)
  - Authenticated path: 3rd item in Promise.all reads authUsers.locale; resolution = userLocale ?? parseAcceptLanguage(req) ?? 'pt-BR'
  - Non-authenticated paths (no header, no token, board_key, agent_jwt, agent_key, terminated/pending agents): req.locale = parseAcceptLanguage(req) ?? 'pt-BR'

affects:
  - 07-05 (UI ProfileSettings toggle — server contract now fully testable end-to-end; PATCH /api/auth/profile round-trips locale; GET responses include it)

tech-stack:
  added: []  # zero new deps; pure server-internal wiring
  patterns:
    - "Helper as testable RequestLike interface (header(name): string | undefined) — keeps unit tests free of full Express harness"
    - "Non-optional global type augmentation — TS enforces coverage on every middleware code path"
    - "3rd parallel SELECT in existing Promise.all — zero added round trips on authenticated path"

key-files:
  created:
    - server/src/lib/parse-accept-language.ts
  modified:
    - server/src/types/express.d.ts
    - server/src/middleware/auth.ts
    - server/src/__tests__/auth-routes.test.ts (fixture: persisted profile shape now includes locale)
    - server/src/__tests__/auth-session-route.test.ts (mock: third selectChain for userLocaleRow)

key-decisions:
  - "RequestLike interface for parseAcceptLanguage instead of Express Request type import — keeps the helper portable, mockable in unit tests, and decouples it from express type evolution"
  - "Non-optional Request.locale: TS error if any branch in actorMiddleware forgets to set req.locale before next() — compile-time coverage > runtime guard"
  - "3rd parallel SELECT for userLocale in authenticated branch — fits existing Promise.all idiom; one network round trip total (Postgres pipelines them)"
  - "Task 3 (PATCH /api/auth/profile + loadCurrentUserProfile locale handling) was pre-completed by 07-02 as a Rule 3 blocker fix (commit 7706274) — no additional commit needed in this plan; verified intact and Wave 0 auth-routes-locale.test.ts is GREEN"

requirements-completed:
  - SETTINGS-02 (PATCH persists locale — confirmed GREEN via auth-routes-locale.test.ts)
  - SETTINGS-03 (default 'pt-BR' fallback chain — confirmed GREEN via auth-routes-locale.test.ts)
  - I18N-05 (req.locale on every middleware path — confirmed GREEN via middleware-locale.test.ts)

duration: ~36min
completed: 2026-04-26
---

# Phase 07 Plan 04: Server Locale Wire-Up — req.locale + Accept-Language Fallback

**Server-side locale plumbing fully wired: DB → middleware → route → response. Authenticated requests carry `req.locale` from `authUsers.locale`; anonymous requests fall back through `parseAcceptLanguage` to default `pt-BR`. Two Wave 0 server tests transition RED → GREEN.**

## Performance

- **Duration:** ~36 min (executor wall-clock; ~30 min spent waiting on full server vitest suite for regression check)
- **Started:** 2026-04-26T13:26:37Z
- **Completed:** 2026-04-26T14:02:21Z
- **Tasks:** 3 / 3
- **Files created:** 1 (`parse-accept-language.ts`)
- **Files modified:** 4 (express.d.ts, middleware/auth.ts, 2 test fixture files)

## Accomplishments

- `server/src/lib/parse-accept-language.ts` exports `parseAcceptLanguage(req: RequestLike): "pt-BR" | "en-US" | null` — RFC-light startsWith heuristic, sufficient for v1.1's 2-locale set
- `server/src/types/express.d.ts` augments `Express.Request` with `locale: "pt-BR" | "en-US"` (non-optional → TS enforces middleware coverage)
- `actorMiddleware` extended on all 8 code paths:
  - **Authenticated session branch**: `Promise.all` adds 3rd query reading `authUsers.locale`; resolution `userLocaleRow ?? parseAcceptLanguage(req) ?? "pt-BR"` (3-tier fallback)
  - **No-auth-header (anonymous) path**: `req.locale = parseAcceptLanguage(req) ?? "pt-BR"`
  - **Empty bearer token path**: same fallback
  - **board_key path** (board API key match): same fallback (non-user actor → no DB read)
  - **agent_jwt path** (verified JWT): same fallback
  - **agent_jwt with mismatched company_id**: same fallback
  - **agent_jwt with terminated/pending agent**: same fallback
  - **agent_key path** (database-bound API key): same fallback
  - **agent_key with terminated/pending agent**: same fallback
- Test fixtures updated to match new Promise.all arity:
  - `auth-routes.test.ts`: persisted profile mock shape includes `locale: "pt-BR"` (parses cleanly via `currentUserProfileSchema`)
  - `auth-session-route.test.ts`: db mock chains `.mockImplementationOnce` 3 times (roleRow → memberships → userLocaleRow returning `[{ locale: "pt-BR" }]`)
- Both Wave 0 server tests **GREEN**:
  - `middleware-locale.test.ts`: 3/3 (I18N-05)
  - `auth-routes-locale.test.ts`: 3/3 (SETTINGS-02 + SETTINGS-03)
- Adjacent regression check: `auth-routes.test.ts` (5 tests), `auth-session-route.test.ts` (1 test), `authz-company-access.test.ts` (9 tests) all pass — focused suite 21/21 GREEN
- Server typecheck (`pnpm --filter @paperclipai/server typecheck`) exit 0

## Task Commits

1. **Task 1: parseAcceptLanguage helper + Express.Request.locale augmentation** — `0ae90f8` (feat)
2. **Task 2: actorMiddleware populates req.locale (3-tier fallback)** — `fdf6324` (feat)
3. **Task 3: PATCH /api/auth/profile + loadCurrentUserProfile locale handling** — pre-completed by 07-02 as Rule 3 blocker fix (commit `7706274`); verified intact in this plan, no new commit (see Decisions)

## Files Created

- `server/src/lib/parse-accept-language.ts` — 21 lines; exports `RequestLike` interface + `parseAcceptLanguage` function. Strict 2-locale enum return type. JSDoc explains why full RFC 7231 q-value parsing is deferred to v2 (L10N-01).

## Files Modified

- `server/src/types/express.d.ts` — added `locale: "pt-BR" | "en-US"` line inside the existing `Express.Request` interface (alongside `actor`); kept `export {}` at top to maintain module status for `declare global` to work
- `server/src/middleware/auth.ts` — added imports (`authUsers`, `parseAcceptLanguage`); extended Promise.all in authenticated branch with `db.select({ locale: authUsers.locale }).from(authUsers).where(eq(authUsers.id, userId)).then((rows) => (rows[0]?.locale ?? null) as "pt-BR" | "en-US" | null)`; added `req.locale = ...` line to all 8 code paths that call `next()`
- `server/src/__tests__/auth-routes.test.ts` — single fixture line: persistedProfileFixture now includes `locale: "pt-BR"` so `currentUserProfileSchema.parse()` succeeds (07-02 made `locale` required in the response schema)
- `server/src/__tests__/auth-session-route.test.ts` — db mock now chains 3 `.mockImplementationOnce` calls instead of 2; comment annotates each (roleRow / memberships / userLocaleRow)

## Decisions Made

- **`RequestLike` interface for the helper:** the parser only needs `header(name): string | undefined`. Importing the full `Request` type from `express` would tie unit tests to a heavyweight type; the structural interface keeps tests trivial and makes the helper portable to non-Express contexts (Workers, edge functions) without breaking changes if v2 ever moves off Express.
- **Non-optional `Request.locale`:** declared as `"pt-BR" | "en-US"` (no `undefined`). Effect: `tsc` flags any code path through `actorMiddleware` that calls `next()` without setting `req.locale` first. This forced explicit coverage of all 8 branches in step 2 (8 separate `req.locale = ...` lines) — runtime invariant becomes a compile-time invariant.
- **3rd parallel SELECT in existing Promise.all:** rather than serializing a new `await db.select(...)` after the existing one, the locale read piggybacks into the same Promise.all that loads role + memberships. Postgres pipelines all three on a single connection round trip.
- **Task 3 pre-completed by 07-02:** Plan 02 documented in its SUMMARY (commit `7706274`) that `currentUserProfileSchema.locale` becoming required forced an inline Rule 3 blocker fix in `server/src/routes/auth.ts` — `loadCurrentUserProfile` SELECT includes locale, PATCH /profile spreads `...(patch.locale !== undefined ? { locale: patch.locale } : {})` and returns `locale` in the payload. Plan 04 verified this work is intact (file matches plan spec) and `auth-routes-locale.test.ts` is GREEN. No additional commit issued for Task 3 — would be a no-op against the existing route code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `auth-routes.test.ts` persisted profile fixture missing locale**
- **Found during:** Task 2 (regression check after middleware change)
- **Issue:** When Promise.all in middleware grew to 3 elements, `auth-routes.test.ts`'s db mock was still wired for 2 selects, but the test does authenticated calls that go through PATCH /profile. The persisted profile object passed to `currentUserProfileSchema.parse()` lacked `locale` (07-02 made it required) — would throw `ZodError: locale Required` at runtime, breaking 5 unrelated auth-routes tests.
- **Fix:** Added `locale: "pt-BR"` to `persistedProfileFixture` in the test setup.
- **Files modified:** `server/src/__tests__/auth-routes.test.ts`
- **Commit:** `fdf6324` (folded into Task 2 commit since the fixture change was needed to keep auth-routes.test.ts passing alongside the middleware change)

**2. [Rule 1 - Bug] `auth-session-route.test.ts` db mock missing 3rd selectChain**
- **Found during:** Task 2
- **Issue:** Mock only chained 2 `mockImplementationOnce` (roleRow, memberships). After middleware added userLocaleRow, the 3rd select returned `undefined`, blowing up `.then((rows) => rows[0]?.locale ?? null)`.
- **Fix:** Added `.mockImplementationOnce(() => createSelectChain([{ locale: "pt-BR" }]))` and inline comments labeling each chain.
- **Files modified:** `server/src/__tests__/auth-session-route.test.ts`
- **Commit:** `fdf6324` (folded into Task 2 — both fixture fixes are coupling-side-effects of the middleware change, atomically committed together)

### Out-of-Scope Findings (NOT fixed)

- **Pre-existing 70 server test failures** across 18 files (full `npx vitest run` reports `18 failed | 202 passed | 1418 tests`). Confirmed pre-existing per `.planning/STATE.md` notes from Phase 6 (`adapter *-execute.test.ts` shebang spawn issues on Windows + `workspace-runtime.test.ts` taskkill ENOENT). Reproducible against master prior to my changes. Not caused by this plan; documented in `.planning/phases/06-multi-projeto-polish/deferred-items.md` per 06-03 SUMMARY.
- **Working tree had unrelated edits** to `ui/src/lib/issue-reference.ts` and `ui/src/pages/AgentDetail.tsx` — sibling territory (likely 07-03 or earlier). Left untouched per disjoint-paths contract.

## Issues Encountered

- **Initial state surprise:** Task 1 was already committed before this executor session started (`0ae90f8` from earlier in the day). Working tree had Task 2's edits uncommitted plus 2 test fixture fixes. Verified by stashing the changes and confirming `middleware-locale.test.ts` reverts to RED 3/3 — proving the uncommitted middleware/auth.ts diff is what flips it to GREEN. Pop'd the stash and committed cleanly as `fdf6324`.
- **`pnpm --filter @paperclipai/server test:run`** doesn't exist — `test:run` script is at the workspace root (uses `scripts/run-vitest-stable.mjs`); from the server dir, `npx vitest run` is the equivalent.
- **`pnpm test:run` from root fails on Windows with `spawn pnpm ENOENT`** — the wrapper script uses `spawnSync` without `.cmd` extension. Workaround: `cd server && npx vitest run [pattern]`. Pre-existing infra issue, not caused by this plan; not in scope.
- **Full-suite vitest run takes ~22 min on Windows** (1352s wall-clock) — slow but expected; the focused 21-test focused run is 10s and was used for fast iteration.

## Manual Setup Required

None. Pure code change. No env vars, no migrations (Plan 02 already shipped 0073), no external services.

## Self-Check

Verified:
- Files created exist:
  - FOUND: `server/src/lib/parse-accept-language.ts`
- Files modified contain expected content:
  - `grep "export function parseAcceptLanguage" server/src/lib/parse-accept-language.ts` → match
  - `grep 'lower.startsWith("pt")' server/src/lib/parse-accept-language.ts` → match
  - `grep 'lower.startsWith("en")' server/src/lib/parse-accept-language.ts` → match
  - `grep 'locale: "pt-BR" | "en-US"' server/src/types/express.d.ts` → match (line 24)
  - `grep "req.locale = userLocaleRow ?? parseAcceptLanguage" server/src/middleware/auth.ts` → match (authenticated branch)
  - `grep -c 'req.locale = parseAcceptLanguage(req) ?? "pt-BR"' server/src/middleware/auth.ts` → 8 matches (covers every non-authenticated next() path)
  - `grep 'authUsers.locale' server/src/middleware/auth.ts` → match (DB read in Promise.all)
  - `grep 'from "../lib/parse-accept-language.js"' server/src/middleware/auth.ts` → match (helper imported)
  - `grep 'patch.locale !== undefined' server/src/routes/auth.ts` → match (07-02 Rule 3 fix intact)
  - `grep 'locale: authUsers.locale' server/src/routes/auth.ts` → 2 matches (loadCurrentUserProfile SELECT + PATCH RETURNING)
- Commits exist in git log:
  - FOUND: `0ae90f8` (feat 07-04 Task 1)
  - FOUND: `fdf6324` (feat 07-04 Task 2)
  - FOUND: `7706274` (feat 07-02 Task 3 — supplies Plan 04 Task 3 deliverable)
- Build & typecheck:
  - `pnpm --filter @paperclipai/server typecheck` → exit 0
- Wave 0 server tests:
  - `npx vitest run src/__tests__/middleware-locale.test.ts` → 3/3 GREEN (was 3/3 RED at baseline; verified by stash + re-run)
  - `npx vitest run src/__tests__/auth-routes-locale.test.ts` → 3/3 GREEN
- Adjacent regression-prone tests:
  - `auth-routes.test.ts` → 5/5 GREEN
  - `auth-session-route.test.ts` → 1/1 GREEN
  - `authz-company-access.test.ts` → 9/9 GREEN

## Self-Check: PASSED

## Next Phase Readiness

**Wave 0 RED status after this plan:**
- ✅ `auth-routes-locale.test.ts` — GREEN (SETTINGS-02 + SETTINGS-03 closed at server-protocol level)
- ✅ `middleware-locale.test.ts` — GREEN (I18N-05 closed)
- ❌ `init.test.ts` — still RED (awaits Plan 03 — actually Plan 03 is COMPLETE per git log `bffaeb2`/`0eb3d9f`; should re-check; out of scope for 07-04)
- ❌ `missing-keys.test.ts` — still RED (awaits Plan 03 detector wiring)
- ❌ `ProfileSettings.locale-toggle.test.tsx` — still RED (awaits **Plan 05**: ProfileSettings UI radio + i18n.changeLanguage flow)

**Plan 05 (UI ProfileSettings toggle) preconditions all met:**
- `UpdateCurrentUserProfile` type includes `locale?: "pt-BR" | "en-US"` (07-02)
- PATCH `/api/auth/profile` accepts `{ locale }`, persists, returns it (07-02 + verified by 07-04)
- `currentUserProfileSchema.locale` required → GET `/profile` and `/get-session` return locale unconditionally (07-02 + verified)
- `req.locale` available server-side for any future SSR/template/log resolution needs (07-04)
- i18next singleton (Plan 03) ready to receive `i18n.changeLanguage(newLocale)` from Plan 05's optimistic mutation

**Phase 07 progress: 4/5 plans complete.** Only 07-05 (UI toggle) remains to close the milestone v1.1 Phase 07 fully.

No blockers for downstream plans.

---
*Phase: 07-foundation-i18n-toggle-de-settings*
*Concluído: 2026-04-26*
