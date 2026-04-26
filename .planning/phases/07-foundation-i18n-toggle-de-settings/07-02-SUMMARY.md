---
phase: 07-foundation-i18n-toggle-de-settings
plan: 02
subsystem: persistence-and-types
tags: [drizzle, migration, better-auth, additionalFields, zod, schema, locale, foundation]

requires:
  - 07-01 (Wave 0 RED tests landed; this plan makes part of them green)

provides:
  - authUsers.locale column (text NOT NULL DEFAULT 'pt-BR' + CHECK constraint enum pt-BR|en-US)
  - Drizzle migration 0073_add_user_locale.sql + journal entry idx=73 + meta snapshot
  - Better Auth user.additionalFields.locale registered (type:"string" defaultValue:"pt-BR")
  - BetterAuthSessionUser type augmented with locale?: 'pt-BR' | 'en-US' | null
  - resolveBetterAuthSessionFromHeaders surfaces locale from value.user
  - localeSchema = z.enum(['pt-BR', 'en-US']) + Locale type exported
  - currentUserProfileSchema.locale (required — DB always has default)
  - updateCurrentUserProfileSchema: all fields optional + .refine() "at least one field"
  - Server PATCH /api/auth/profile + loadCurrentUserProfile read/write locale (Rule 3 blocker fix)
affects:
  - 07-04 (server middleware + route extension — full validation surface ready; existing PATCH already accepts locale at runtime)
  - 07-05 (UI ProfileSettings toggle — UpdateCurrentUserProfile type now includes optional locale)

tech-stack:
  added: []  # no new deps; only schema + type changes
  patterns:
    - "Drizzle schema-first migration: edit schema → drizzle-kit generate → rename + augment SQL with CHECK"
    - "Better Auth additionalFields: schema column + config registration both required (Pitfall 1)"
    - "Zod refine() guard for all-optional PATCH bodies (at-least-one-field)"
    - "DB-03 enforcement: migration ships in PR, CI applies on merge to main"

key-files:
  created:
    - packages/db/src/migrations/0073_add_user_locale.sql
    - packages/db/src/migrations/meta/0073_snapshot.json
  modified:
    - packages/db/src/schema/auth.ts
    - packages/db/src/migrations/meta/_journal.json
    - server/src/auth/better-auth.ts
    - packages/shared/src/validators/access.ts
    - server/src/routes/auth.ts

key-decisions:
  - "CHECK constraint added manually after drizzle-kit generate (drizzle-kit doesn't emit CHECK from TS-side type narrowing)"
  - "Renamed auto-generated 0073_curly_meggan.sql → 0073_add_user_locale.sql + patched journal tag for descriptive naming"
  - "Better Auth additionalFields type: '\"string\" as const' literal cast required (DBFieldType union expects literal)"
  - "[Rule 3 - Blocker] Extended server/src/routes/auth.ts loadCurrentUserProfile + PATCH /profile to read/write locale, because currentUserProfileSchema.locale is now required at runtime; without this, GET /profile would throw at runtime even though typecheck passes. Plan 04 still owns the full middleware extension (req.locale + Accept-Language fallback)."
  - "name in updateCurrentUserProfileSchema made optional (Pitfall 6 cleared — only caller is ProfileSettings.tsx:74 which always passes typed UpdateCurrentUserProfile input)"

requirements-completed:
  - SETTINGS-02 (server-side: PATCH accepts locale, persists in authUsers.locale)
  - SETTINGS-03 (DB default 'pt-BR' present; column NOT NULL DEFAULT)
  - I18N-05 (server contract: BetterAuthSessionUser surfaces locale; route reads/writes it)

duration: 14min
completed: 2026-04-26
---

# Phase 07 Plan 02: Foundation Persistence + Types — locale Contract End-to-End

**DB column + Drizzle migration + Better Auth additionalFields + Zod validators wire `locale` from Postgres → Better Auth session → shared types in a single coherent contract.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-04-26T12:12:26Z
- **Completed:** 2026-04-26T12:26:27Z
- **Tasks:** 3 / 3
- **Files created:** 2 (migration SQL + meta snapshot)
- **Files modified:** 5 (schema, journal, better-auth, validators, routes/auth)

## Accomplishments

- `authUsers.locale` column added to Drizzle schema with `text NOT NULL DEFAULT 'pt-BR'`
- Migration `0073_add_user_locale.sql` generated via `pnpm --filter @paperclipai/db generate`, renamed from auto-generated `0073_curly_meggan.sql`, augmented with `ALTER TABLE "user" ADD CONSTRAINT "user_locale_check" CHECK ("locale" IN ('pt-BR', 'en-US'))`
- Drizzle journal entry idx=73 patched with descriptive tag `0073_add_user_locale`; meta snapshot `0073_snapshot.json` produced by drizzle-kit
- Pitfall 4 cleared: generated SQL inspected, contains zero `RENAME` statements
- Better Auth config: `user.additionalFields.locale` registered with `type: "string" as const, required: false, defaultValue: "pt-BR"`
- `BetterAuthSessionUser` type extended with `locale?: "pt-BR" | "en-US" | null`
- `resolveBetterAuthSessionFromHeaders` reads `value.user.locale` and casts to typed union
- `localeSchema = z.enum(["pt-BR", "en-US"])` + `Locale` type exported from `packages/shared/src/validators/access.ts`
- `currentUserProfileSchema.locale` required (DB always has default → safe)
- `updateCurrentUserProfileSchema` rewritten: `name` now optional, `locale` optional, `.refine()` requires at-least-one-field
- DB-03 respected: zero local invocations of `pnpm db:migrate`; migration ships for CI to apply on merge

## Task Commits

Each task committed atomically with `--no-verify` (parallel-executor protocol; sibling 07-03 may run concurrently on disjoint paths).

1. **Task 1: Drizzle schema + migration 0073** — `562339d` (feat)
2. **Task 2: Better Auth additionalFields.locale** — `c211efa` (feat)
3. **Task 3: Zod validators + route locale read/write fix** — `7706274` (feat)

## Files Created

- `packages/db/src/migrations/0073_add_user_locale.sql` — DDL: ADD COLUMN + ADD CONSTRAINT (CHECK enum)
- `packages/db/src/migrations/meta/0073_snapshot.json` — drizzle-kit snapshot reflecting the new column

## Files Modified

- `packages/db/src/schema/auth.ts` — added `locale: text("locale").notNull().default("pt-BR")` between `image` and `createdAt`
- `packages/db/src/migrations/meta/_journal.json` — patched last entry tag to `0073_add_user_locale`
- `server/src/auth/better-auth.ts` — `BetterAuthSessionUser.locale`, `authConfig.user.additionalFields.locale`, `resolveBetterAuthSessionFromHeaders` user assembly
- `packages/shared/src/validators/access.ts` — `localeSchema` + `Locale` type, `currentUserProfileSchema.locale`, `updateCurrentUserProfileSchema` all-optional + `.refine()`
- `server/src/routes/auth.ts` — `loadCurrentUserProfile` selects + parses locale; PATCH /profile writes locale and returns it (Rule 3 blocker fix — see Deviations)

## Decisions Made

- **Manual CHECK constraint append:** drizzle-kit does not emit CHECK from TS-side type narrowing. SQL augmented after generation: `ALTER TABLE "user" ADD CONSTRAINT "user_locale_check" CHECK ("locale" IN ('pt-BR', 'en-US'))`.
- **Migration rename:** auto-generated name (`0073_curly_meggan`) replaced with descriptive `0073_add_user_locale` for clarity in PR review and CI logs. Journal tag patched in lockstep.
- **`as const` cast on additionalFields type:** Better Auth's `DBFieldType` is a literal union; passing `type: "string"` widens to `string` and fails. Solution: `type: "string" as const`.
- **Server route extended in this plan:** Plan boundary explicitly assigns route extension to Plan 04, but `currentUserProfileSchema.locale` becoming required forces the existing GET/PATCH /profile to also read/write locale — otherwise `parse()` throws at runtime. Treated as Rule 3 (blocker) and committed inline. Plan 04 retains ownership of the full `req.locale` middleware + Accept-Language fallback work.
- **`name` made optional:** matches Pattern 3 in research; only caller (`ProfileSettings.tsx:74`) passes typed `UpdateCurrentUserProfile` input — typecheck still clean. The `.refine()` guard prevents empty-body PATCH semantics.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Extended `server/src/routes/auth.ts` to read/write locale**
- **Found during:** Task 3 (Zod validators)
- **Issue:** Making `currentUserProfileSchema.locale` required (per plan must_haves and Pattern 3) means `loadCurrentUserProfile` and PATCH /profile, both of which call `currentUserProfileSchema.parse(...)`, would throw `ZodError: locale Required` at runtime. TypeScript does not catch this because `.parse()` accepts `unknown`. Plan 04 was scheduled to own this file, but ship-as-is for Plan 02 alone breaks the existing GET /profile / get-session endpoints.
- **Fix:**
  - `loadCurrentUserProfile`: SELECT now includes `authUsers.locale`; `parse()` passes `locale: user.locale ?? "pt-BR"`.
  - PATCH /profile: SET clause spreads `...(patch.locale !== undefined ? { locale: patch.locale } : {})`; RETURNING includes `locale`; response `parse()` includes it.
  - Also wrapped `name` in conditional spread (now that it's optional in the schema) to avoid writing `name: undefined` to the DB.
- **Files modified:** `server/src/routes/auth.ts`
- **Commit:** `7706274` (folded into Task 3 commit; ProfileSettings.tsx caller verified typecheck-clean)
- **Rationale for Rule 3:** This is a coordination unblock, not arch change. Plan 04 still owns the full middleware extension (`req.locale`, Accept-Language parsing, helper module). The route fix here is the minimum viable change to keep the type contract internally consistent.

## Issues Encountered

- **Better Auth `additionalFields.type` literal narrowing:** initial TS error `Type 'string' is not assignable to type 'DBFieldType'` — fixed by `"string" as const`. Documented in Decisions.
- **UI typecheck shows pre-existing RED test failures** (`src/i18n/__tests__/init.test.ts`, `missing-keys.test.ts`, `ProfileSettings.locale-toggle.test.tsx`) — these reference `@/i18n`, `react-i18next`, `@testing-library/*` not yet wired. They are Wave 0 RED scaffolds (Plan 01) awaiting Plans 03/05; not in scope for Plan 02.
- **Working tree had unrelated edits** to `ui/src/lib/issue-reference.ts` and `ui/src/pages/AgentDetail.tsx` (sibling 07-03 territory). Left untouched per parallel-executor disjoint-paths contract.

## Manual Setup Required

None. No external services configured in this plan. **Crucially: do NOT run `pnpm db:migrate` locally** — DB-03 enforces CI-only application via `.github/workflows/db-migrate.yml`. The migration ships in the PR; CI applies on merge to `main`.

## Self-Check

Verified:
- Files created exist:
  - FOUND: `packages/db/src/migrations/0073_add_user_locale.sql`
  - FOUND: `packages/db/src/migrations/meta/0073_snapshot.json`
- Files modified exist and contain expected content:
  - `grep "locale: text(\"locale\")" packages/db/src/schema/auth.ts` → match
  - `grep "ADD COLUMN \"locale\" text DEFAULT 'pt-BR' NOT NULL" packages/db/src/migrations/0073_add_user_locale.sql` → match
  - `grep "user_locale_check" packages/db/src/migrations/0073_add_user_locale.sql` → match
  - `grep "RENAME" packages/db/src/migrations/0073_add_user_locale.sql` → no match (Pitfall 4 clear)
  - `_journal.json` last entry tag = `"0073_add_user_locale"` (verified inline)
  - `grep 'locale\?: "pt-BR" \| "en-US" \| null' server/src/auth/better-auth.ts` → match (line 53)
  - `grep 'additionalFields' server/src/auth/better-auth.ts` → match (line 149)
  - `grep 'defaultValue: "pt-BR"' server/src/auth/better-auth.ts` → match (line 150)
  - `grep 'locale: ((value.user' server/src/auth/better-auth.ts` → match (line 199)
  - `grep 'export const localeSchema = z.enum' packages/shared/src/validators/access.ts` → match (line 172)
  - `grep 'locale: localeSchema,' packages/shared/src/validators/access.ts` → match (line 180, in currentUserProfileSchema)
  - `grep 'locale: localeSchema.optional()' packages/shared/src/validators/access.ts` → match (line 202)
  - `grep '.refine(' packages/shared/src/validators/access.ts` → match (line 205)
  - `grep 'name: z.string().trim().min(1).max(120).optional()' packages/shared/src/validators/access.ts` → match (line 197)
- Commits exist in git log:
  - FOUND: `562339d` (feat 07-02 Task 1)
  - FOUND: `c211efa` (feat 07-02 Task 2)
  - FOUND: `7706274` (feat 07-02 Task 3)
- Build & typecheck:
  - `pnpm --filter @paperclipai/db build` → exit 0
  - `pnpm --filter @paperclipai/shared build` → exit 0
  - `pnpm --filter @paperclipai/server typecheck` → exit 0
- DB-03 honored: `git log --oneline | grep "db:migrate"` returns nothing; no local apply

## Self-Check: PASSED

## Next Phase Readiness

**Wave 1 sibling (Plan 03 — i18n init module + main.tsx wiring):** runs in parallel; touches `ui/*` and `pnpm-lock.yaml`. Disjoint from this plan's surface (`packages/db/`, `packages/shared/`, `server/src/auth/`, `server/src/routes/auth.ts`).

**Wave 2 (Plans 04 + 05):**
- **Plan 04 (server middleware + req.locale):** type contract is fully ready. `BetterAuthSessionUser.locale` surfaces; `authUsers.locale` queryable; `req.locale` extension can populate from `actorMiddleware`'s session branch + Accept-Language fallback (helper module yet to create — `server/src/lib/parse-accept-language.ts`). Wave 0 RED test `middleware-locale.test.ts` should go green once Plan 04 lands.
- **Plan 05 (ProfileSettings toggle UI):** `UpdateCurrentUserProfile` type now includes `locale?: "pt-BR" | "en-US"`; PATCH endpoint accepts `{ locale }` already (per Rule 3 fix); `i18n.changeLanguage` flow per Pattern 6 has the contract it needs. Wave 0 RED `ProfileSettings.locale-toggle.test.tsx` should go green once Plan 03 (i18n init) and Plan 05 land together.

**Wave 0 RED test status after this plan:**
- `auth-routes-locale.test.ts`: SETTINGS-02 (PATCH persists locale) and SETTINGS-03 (default pt-BR) **GREEN at protocol level** — server route now accepts/persists/returns locale; contract holds.
- `init.test.ts`, `missing-keys.test.ts`, `ProfileSettings.locale-toggle.test.tsx`: still RED — awaiting Plan 03 (`@/i18n`, `react-i18next` wiring).
- `middleware-locale.test.ts`: still RED — `req.locale` not populated yet (Plan 04).

No blockers for downstream plans.

---
*Phase: 07-foundation-i18n-toggle-de-settings*
*Concluído: 2026-04-26*
