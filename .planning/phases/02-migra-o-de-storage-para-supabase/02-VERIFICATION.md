---
phase: 02-migra-o-de-storage-para-supabase
verified: 2026-04-25T00:00:00Z
status: human_needed
score: 5/5 must-haves auto-verified; 1/5 awaits cross-machine human test
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Two devs on different machines sign up with Better Auth and observe shared state"
    expected: "Dev A creates a company on machine A; dev B (different OS install, different network) logs in via the same Supabase backend and sees the same company without manual sync"
    why_human: "Cross-machine verification cannot be automated from one host. Single-machine smoke test (7/7 PASS) proves the infra (Supabase pooler 6543, Better Auth wiring, cookie prefix paperclip-team-shared, 80 tables in public.*); the remaining gap is exercising the team-shared flow with two distinct humans/machines. Phase 2 itself accepted this deferral (see 02-06-SUMMARY decision: multi-dev validation deferred to Phase 3 TEAM-04). Flagging here for transparency — the migration goal IS achieved, but Success Criterion #1 in its strict reading needs the human checkpoint."
---

# Phase 2: Migração de Storage para Supabase Verification Report

**Phase Goal:** Substituir Postgres embedded pelo Supabase remoto (`bxlczioxgizgvtznukwt`) como único backend de estado da equipe, mantendo Better Auth funcional contra o Postgres do Supabase. Auditoria de acoplamentos precede o swap real para evitar quebras silenciosas em Supavisor pooler.

**Verified:** 2026-04-25
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | Dois devs em máquinas diferentes fazem login Better Auth e veem mesma company no UI | ? UNCERTAIN — single-machine validated; cross-machine deferred | smoke-test-results.json overall=PASS (7/7) on single host; signup A + signup B both persist in Supabase `public.user`. Cross-machine flow not exercised this phase (02-06-SUMMARY explicitly defers to Phase 3 TEAM-04). Infra is provably ready; only the 2-human test remains. |
| 2   | MIGRATION_AUDIT.md mapeia LISTEN/NOTIFY, advisory locks, CREATE TEMP, prepared statements, long-lived tx com decisão de mitigação | ✓ VERIFIED | MIGRATION_AUDIT.md exists, 17 sections, 11 findings across 10 categories (A–J). LISTEN/NOTIFY zero hits documented; pg_advisory_xact_lock at server/src/services/plugin-database.ts:413 marked NONE risk; SET LOCAL in backup-lib documented LOW; 30+ db.transaction calls catalogued MEDIUM with pool config mitigation; A.1 prepared-statements HIGH risk → mitigated in 02-03; F.1 ensureMigrations HIGH → mitigated in 02-03. |
| 3   | Migrations Drizzle aplicadas em bxlczioxgizgvtznukwt; auto-migrations disabled in non-TTY; GitHub Actions é único caminho de pnpm db:migrate em merge para main | ✓ VERIFIED | MIGRATION_APPLY_LOG.md confirms 71 rows in `drizzle.__drizzle_migrations`, 80 tables in public.*, ~6s clean apply. server/src/index.ts:115-135 promptApplyMigrations refuses non-TTY (returns false) unless PAPERCLIP_MIGRATION_AUTO_APPLY=true. .github/workflows/db-migrate.yml exists with concurrency `db-migrate-supabase`, path filter on packages/db/src/{migrations,schema}/**, sets PAPERCLIP_MIGRATION_AUTO_APPLY=true only inside the workflow. CONTRIBUTING.md prohibits manual `pnpm db:migrate` against shared Supabase. |
| 4   | Cookie prefix `paperclip-team-shared` permite devs distintos compartilharem mesma sessão lógica | ✓ VERIFIED | server/src/auth/better-auth.ts:65-71 deriveAuthCookiePrefix; with PAPERCLIP_INSTANCE_ID=team-shared (.env.example:19) yields `paperclip-team-shared`. Smoke test captured literal `set-cookie: paperclip-team-shared.session_token=...` (HttpOnly, SameSite=Lax). 9 unit tests covering derivation, sanitization, fallback, env-driven default. |
| 5   | Service-role key nunca no bundle Vite (verificado por pre-commit hook detectando `eyJ...` em client-side) | ✓ VERIFIED | scripts/check-no-service-role-leak.mjs implements checkDiff() with JWT_REGEX `eyJ[A-Za-z0-9_-]{15,}\.[...]\.[...]` + VITE_FORBIDDEN_REGEX matching VITE_*SERVICE_ROLE*/SECRET*. .husky/pre-commit invokes the script. package.json devDependencies includes husky@^9.1.7 with prepare script. Husky 9 wires hooks via core.hooksPath=.husky/_ (verified — `.husky/_/` directory present, husky binary in node_modules). 7/7 vitest cases pass per 02-02-SUMMARY. |

**Score:** 4/5 truths fully VERIFIED; 1/5 UNCERTAIN (cross-machine human test). Infra/tech truths all green; the open item is purely a 2-human acceptance test.

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `.planning/phases/02-.../MIGRATION_AUDIT.md` | 10 categories audited; A.1, F.1 mitigated | ✓ VERIFIED | 17 sections, all required content; 11 findings classified |
| `.planning/phases/02-.../MIGRATION_APPLY_LOG.md` | Outcome A clean apply, 71 migrations, 80 tables | ✓ VERIFIED | Pre-conditions, approach, result, discoveries all present |
| `.planning/phases/02-.../SMOKE-TEST-LOG.md` | 7/7 PASS + human-verify approved | ✓ VERIFIED | Server banner captured (Database = postgres.bxlczioxgizgvtznukwt:6543); user approved |
| `.planning/phases/02-.../smoke-test-results.json` | overall=PASS, 7 steps | ✓ VERIFIED | overall=PASS, both signups persisted, cookie_prefix_match=true |
| `packages/db/src/client.ts` | createDb port-aware; prepare:false on 6543; max:5; idle_timeout:20 | ✓ VERIFIED | Lines 48-94: buildPostgresOptions detects port via `new URL(url).port`; 6543 → {prepare:false, max:5, idle_timeout:20, connect_timeout:10}; 5432 → pool only; other → undefined |
| `packages/db/src/runtime-config.ts` | DATABASE_URL preferred; embedded gated by PAPERCLIP_DB_MODE | ✓ VERIFIED | Lines 215-284: allowEmbeddedFallback derived from PAPERCLIP_DB_MODE === "embedded-postgres"; throws actionable error if neither path set |
| `packages/db/drizzle.config.ts` | Prefers SUPABASE_DB_URL over DATABASE_URL; throws if neither | ✓ VERIFIED | Lines 13-23: `SUPABASE_DB_URL?.trim() \|\| DATABASE_URL?.trim()`; throws with .env.example pointer |
| `server/src/index.ts` (promptApplyMigrations + ensureMigrations) | Non-TTY returns false unless PAPERCLIP_MIGRATION_AUTO_APPLY=true | ✓ VERIFIED | Line 122-124: env opt-in honored; non-TTY returns false; ensureMigrations error message cites `pnpm db:migrate` and Phase 2 DB-02 (line 182-184) |
| `server/src/auth/better-auth.ts` | deriveAuthCookiePrefix; AUTH-01..04 inline mapping | ✓ VERIFIED | Lines 65-77 derivation; 33-line doc block at top mapping AUTH-01..04 to specific lines |
| `.env.example` | DATABASE_URL 6543, SUPABASE_DB_URL 5432, BETTER_AUTH_SECRET, PAPERCLIP_INSTANCE_ID=team-shared, PAPERCLIP_DB_MODE opt-in, PAPERCLIP_MIGRATION_AUTO_APPLY opt-in | ✓ VERIFIED | All 9 critical env vars present with TODO_FILL_ME markers; aws-1-sa-east-1 hostname documented inline |
| `.husky/pre-commit` | Single-line invocation of leak detector | ✓ VERIFIED | Content: `node scripts/check-no-service-role-leak.mjs` |
| `scripts/check-no-service-role-leak.mjs` | JWT regex + VITE_*SERVICE_ROLE* detection; checkDiff export | ✓ VERIFIED | Both regexes present; isClientSidePath classifier; CLI entrypoint via isMain detection |
| `.github/workflows/db-migrate.yml` | Path filter, concurrency group, secret guard, working-directory packages/db | ✓ VERIFIED | 97 lines; concurrency `db-migrate-supabase` cancel-in-progress:false; SUPABASE_DB_URL secret check at line 53; verify step asserts >=30 tables |
| `.github/PULL_REQUEST_TEMPLATE.md` | DB-04 schema-change gate section | ✓ VERIFIED | Lines 58-67: 4 checkboxes covering reviewer approval, drizzle-kit only, no destructive DDL, backwards-compat |
| `CONTRIBUTING.md` | Database Migration Policy section, drizzle-kit single source of truth, 4 prohibitions | ✓ VERIFIED | Section "Database Migration Policy (Phase 2 v1)"; positive flow + DO NOT list (no `supabase migration new`, no hand-write SQL, no hand-edit, no manual `pnpm db:migrate` against shared); embedded fallback note (PAPERCLIP_DB_MODE) |
| `package.json` | husky devDep, prepare script | ✓ VERIFIED | husky@^9.1.7 in devDependencies; `"prepare": "husky"` script |
| `packages/db/src/__tests__/client-pool-config.test.ts` | TDD coverage for port detection | ✓ VERIFIED | Created in commit 4e5f2ea (RED) → 5b21d38 (GREEN); 4/4 pass per 02-03-SUMMARY |
| `server/src/__tests__/better-auth-supabase-readiness.test.ts` | 7-test readiness suite | ✓ VERIFIED | 5 unit + 1 gated integration + 1 schema export; 7/7 with .env.local, 6/7+1 skipped without |
| `scripts/phase-02-supabase-smoke.mjs` | E2E smoke against running server + Supabase | ✓ VERIFIED | ~280 lines; 7 automated steps; createRequire workaround for `postgres` package; Origin header injected |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| createDb(url) | postgres-js options | buildPostgresOptions(url) | ✓ WIRED | client.ts:49-50 — options applied conditionally |
| .env.example PAPERCLIP_INSTANCE_ID | better-auth cookiePrefix | resolvePaperclipInstanceId() → deriveAuthCookiePrefix() | ✓ WIRED | better-auth.ts:65-77; smoke test confirmed literal `paperclip-team-shared.session_token` in Set-Cookie |
| Server startup | Migration gate (DB-02) | ensureMigrations + promptApplyMigrations | ✓ WIRED | index.ts:282 (postgres path) and :442 (embedded fallback) — both call ensureMigrations; non-TTY refusal at line 124 |
| GitHub Actions trigger | pnpm db:migrate | path filter on packages/db/src/{migrations,schema}/** + workflow_dispatch | ✓ WIRED | db-migrate.yml:7-13 triggers; line 72 runs migration step with PAPERCLIP_MIGRATION_AUTO_APPLY=true |
| Pre-commit hook | scripts/check-no-service-role-leak.mjs | husky core.hooksPath=.husky/_ → .husky/pre-commit | ✓ WIRED | husky binary present in node_modules; .husky/_/ directory installed; pre-commit single-line invocation |
| drizzle-kit migrate | SUPABASE_DB_URL session pooler | drizzle.config.ts URL resolution | ✓ WIRED | Throws if neither SUPABASE_DB_URL nor DATABASE_URL; CI workflow exports SUPABASE_DB_URL into both env names |
| Better Auth signup | Supabase public.user table | drizzleAdapter(db, {provider:"pg"}) → createDb pooler | ✓ WIRED | Smoke verified: SQL `SELECT email, name FROM "user"` returned exactly the signup rows; 2 distinct users persisted |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| Better Auth signup endpoint | session/user payload | Drizzle insert into public.user via Supabase pooler 6543 | Yes — smoke captured `id: Y3hPtBWNyAzL9j7tcfKa6DOtNUNeKwFc` round-trip and SQL verification of 2 rows | ✓ FLOWING |
| /api/auth/get-session | Set-Cookie roundtrip | Better Auth session lookup keyed by `paperclip-team-shared.session_token` cookie | Yes — smoke step 3 returned matching email + paperclip-prefixed session id | ✓ FLOWING |
| /api/companies (authenticated mode) | companies array | server route → DB query scoped to user | Empty array but semantically correct (no auto-default in authenticated mode); endpoint behaves correctly | ✓ FLOWING (empty-by-design, not stub) |
| .__drizzle_migrations table | 71 rows | Drizzle migrate apply | Yes — MIGRATION_APPLY_LOG and post-apply verify confirm 71 rows | ✓ FLOWING |

Note: empty companies array is documented and correct for `authenticated` mode (default-company creation gated to `local_trusted` flow). Not a hollow prop.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| 71 migration files exist on disk | `ls packages/db/src/migrations/*.sql \| wc -l` | 71 | ✓ PASS |
| Husky binary installed | `ls node_modules/husky` | LICENSE, README.md, bin.js present | ✓ PASS |
| Husky hooks dir provisioned | `ls .husky/` | `_/` and `pre-commit` present | ✓ PASS |
| Pre-commit script content | `cat .husky/pre-commit` | `node scripts/check-no-service-role-leak.mjs` | ✓ PASS |
| Smoke test JSON overall | `cat smoke-test-results.json` | `"overall": "PASS"`, 7 passes | ✓ PASS |
| Better Auth cookie literal | smoke step 2 set-cookie | `paperclip-team-shared.session_token=...` literal match | ✓ PASS |
| Supabase persistence | smoke SQL `SELECT * FROM "user" WHERE email=$1` | 1 row for user A; 2 rows for both users | ✓ PASS |
| Server actually targets Supabase | startup banner Database line | `postgres.bxlczioxgizgvtznukwt:***@aws-1-sa-east-1.pooler.supabase.com:6543/postgres` | ✓ PASS |
| Auto-migrations gate honored at runtime | startup banner Migrations line | `already applied` (no auto-apply attempted) | ✓ PASS |
| Recent commits match plan execution | `git log --oneline -30` | All 6 plans have plan-tagged commits (02-01 through 02-06) plus closing docs commits | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| INFRA-01 | 02-01 | MIGRATION_AUDIT.md mapeia couplings Postgres-embedded → Supavisor | ✓ SATISFIED | MIGRATION_AUDIT.md complete with 11 findings; LISTEN/NOTIFY zero-hits documented |
| INFRA-02 | 02-03 | client.ts uses prepare:false on port 6543 | ✓ SATISFIED | client.ts:83-86 buildPostgresOptions returns prepare:false for 6543 |
| INFRA-03 | 02-03 | runtime-config privilegia DATABASE_URL Supabase | ✓ SATISFIED | runtime-config.ts:227-235 returns Supabase URL first |
| INFRA-04 | 02-03 | .env.example lists DATABASE_URL, SUPABASE_DB_URL, BETTER_AUTH_SECRET, PAPERCLIP_INSTANCE_ID | ✓ SATISFIED | All 9 critical vars present with explanatory comments |
| INFRA-05 | 02-03 | pool max:5, idle_timeout:20 | ✓ SATISFIED | client.ts:85,90 both 6543 and 5432 branches |
| INFRA-06 | 02-03 | Embedded as opt-in fallback (off by default) | ✓ SATISFIED | runtime-config.ts:262 gated on PAPERCLIP_DB_MODE === "embedded-postgres"; throws otherwise |
| DB-01 | 02-04, 02-06 | Migrations applied to bxlczioxgizgvtznukwt | ✓ SATISFIED | MIGRATION_APPLY_LOG.md (71 rows in drizzle_migrations); smoke confirms 80 public.* tables |
| DB-02 | 02-03 | Auto-migrations on startup disabled | ✓ SATISFIED | server/src/index.ts:122-124 explicit gate; smoke banner showed `already applied` (no auto-attempt) |
| DB-03 | 02-04 | GitHub Actions único caminho de pnpm db:migrate em merge para main | ✓ SATISFIED | .github/workflows/db-migrate.yml exists with path-filtered push trigger; CONTRIBUTING.md prohibits manual local apply |
| DB-04 | 02-04 | PRs com mudança de schema requerem aprovação | ✓ SATISFIED | PULL_REQUEST_TEMPLATE.md §Schema/Migration Changes (DB-04) with reviewer-approval checkbox |
| DB-05 | 02-04 | Drizzle-kit é fonte única (sem `supabase migration new`) | ✓ SATISFIED | CONTRIBUTING.md Database Migration Policy explicit prohibitions |
| AUTH-01 | 02-05, 02-06 | Better Auth funciona contra Supabase Postgres | ✓ SATISFIED | better-auth-supabase-readiness.test.ts Test 6 + smoke step 5 (SQL verification of inserted user) |
| AUTH-02 | 02-05, 02-06 | Cookie prefix `paperclip-team-shared` from PAPERCLIP_INSTANCE_ID | ✓ SATISFIED | deriveAuthCookiePrefix unit + integration + literal Set-Cookie observation |
| AUTH-03 | 02-05 | Modo authenticated ativo | ✓ SATISFIED | Smoke startup banner: `deploymentMode: authenticated`; better-auth.ts inline mapping documents middleware/auth.ts as honoring this |
| AUTH-04 | 02-05, 02-06 | Signup com email/senha | ✓ SATISFIED | better-auth.ts default `emailAndPassword.enabled:true`; smoke confirmed both signups returned 200 + Set-Cookie |
| AUTH-05 | 02-02 | Pre-commit hook detecta `eyJ...` em client-side | ✓ SATISFIED | scripts/check-no-service-role-leak.mjs JWT_REGEX + VITE_FORBIDDEN_REGEX; husky-installed pre-commit; 7/7 vitest pass |

**Coverage:** 16/16 requirements SATISFIED. No ORPHANED requirements detected.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |

None. Stub-detection passes against the modified files (client.ts, runtime-config.ts, drizzle.config.ts, better-auth.ts, server/src/index.ts migration gate, .env.example, workflow YAML, hook script). Empty arrays / null returns observed are semantically intentional (e.g. `buildPostgresOptions` returning undefined for non-pooler ports preserves postgres-js defaults; empty companies array in authenticated mode is by design). Hard-coded `return false` in promptApplyMigrations is the gate itself, not a stub.

### Human Verification Required

#### 1. Cross-machine multi-dev sign-in test

**Test:** Two team members on physically distinct machines (different OS installs, different networks) clone the repo, populate `.env.local` from `.env.example`, fill the Supabase credentials, run `pnpm install` then `PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev`, sign up via the Better Auth UI on each machine, and then either user creates a company while the other refreshes.

**Expected:** Both devs see the company appear in the UI without any manual sync step. Both rows in `public.user` plus the company row visible in Supabase Studio for project `bxlczioxgizgvtznukwt`. Cookie domain/prefix `paperclip-team-shared.session_token` consistent across machines.

**Why human:** Cross-machine validation is by definition a 2-host human flow — single-host smoke (already PASS 7/7) cannot prove it. Phase 2 explicitly captured this deferral to Phase 3 TEAM-04 (see 02-06-SUMMARY decisions: "the team-shared infra is in place — only the human flow remains"). Reading Success Criterion #1 strictly, this is the only piece NOT exercised in Phase 2 itself; reading it as "is the infra capable of supporting this", everything is in place.

### Gaps Summary

No technical gaps. The implementation matches every must-have and every requirement is satisfied with concrete evidence:

- **Driver patches:** port-aware createDb installed; prepare:false on 6543 confirmed by tests + production-grade smoke run.
- **Runtime gating:** PAPERCLIP_DB_MODE properly gates embedded fallback; missing-config path throws actionable error.
- **Auto-migration safety:** non-TTY contexts refuse to apply migrations unless explicit env opt-in (CI-only); error messages cite `pnpm db:migrate` and Phase 2 DB-02.
- **Schema state:** 71 Drizzle migrations applied cleanly to Supabase, 80 tables in public.*, 71 rows in drizzle.__drizzle_migrations.
- **Schema governance:** GitHub Actions is the only automated path; PR template + CONTRIBUTING.md provide both human and automated gates.
- **Cookie/session sharing:** `paperclip-team-shared` literally observed in Set-Cookie during smoke test; derivation unit-tested across 5 scenarios + integration-tested against real Supabase.
- **Secret leak guard:** Husky 9 hook installed (`.husky/_/` plus `.husky/pre-commit`), JWT + VITE_*SERVICE_ROLE* detection both regex-tested; 7/7 vitest cases pass.

The single open item — Success Criterion #1 multi-dev cross-machine — is intentionally deferred to Phase 3 TEAM-04 (recorded in 02-06-SUMMARY decisions). All Phase 2 truths #2-5 are independently verified and unblock everything that depended on the infrastructure being real.

**Status: human_needed** — automated checks all green; awaiting the human 2-machine acceptance test before claiming Success Criterion #1 fully closed. (If treating Phase 2 as scoped to "infra ready for multi-dev", status would read **passed**.)

---

_Verified: 2026-04-25_
_Verifier: Claude (verifier)_
