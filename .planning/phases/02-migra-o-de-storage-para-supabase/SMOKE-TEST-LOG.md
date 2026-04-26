# Phase 2 Smoke Test Log — Supabase + Better Auth E2E

**Phase:** 02 (Migração de Storage para Supabase)
**Test type:** End-to-end automated smoke + manual user verification
**Run at:** 2026-04-26T03:56:36Z
**Run by:** Claude (executor de plano 02-06) + manual verification by user

## Pre-conditions verified

- Plano 02-01: MIGRATION_AUDIT.md exists; documented 71 migrations strategy
- Plano 02-02: Pre-commit hook installed and protects ui/src/** from JWT leaks
- Plano 02-03: createDb uses prepare:false on port 6543; auto-migrations disabled
- Plano 02-04: Schema applied to bxlczioxgizgvtznukwt; 80 tables in public; 71 rows in drizzle_migrations
- Plano 02-05: Better Auth wiring tests pass; cookie prefix derivation = `paperclip-team-shared`

## Server startup

Connection target observed in startup banner:

```
Mode            external-postgres  |  static-ui
Deploy          authenticated (private)
Bind            loopback (127.0.0.1)
Auth            ready
Server          3100
Database        postgresql://postgres.bxlczioxgizgvtznukwt:***@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
Migrations      already applied
```

Confirms:
- `external-postgres` mode (NOT `embedded-postgres`) — Plan 02-03 driver path active.
- Database URL is Supabase Supavisor pooler (`aws-1-sa-east-1`, port 6543, transaction mode).
- Migrations status `already applied` — schema state from Plan 02-04 persists; no auto-apply at startup (DB-02 honored).
- Deployment mode `authenticated` — Better Auth handler mounted; signup/get-session endpoints live.

Startup time to `/api/health` 200: ~12 seconds (build plugin SDK + shared package + boot Express).

### Server invocation

To make the Better Auth signup endpoint reachable, the server was launched bypassing `dev-runner.ts` (which forces `local_trusted` for `pnpm dev`/`pnpm dev:once` with default loopback bind). Command used:

```bash
set -a && source .env.local && set +a
PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev
```

The `--authenticated-private` flag on `dev-runner.ts` would normally toggle this, but it also forces LAN binding (`bind=lan`) which is undesirable for local smoke. Bypassing the runner keeps loopback-only binding while exercising the authenticated code path. This finding is captured here for Phase 3 onboarding docs (TEAM-02).

## Automated smoke results

Full JSON: `.planning/phases/02-migra-o-de-storage-para-supabase/smoke-test-results.json`

```json
{
  "total_steps": 7,
  "passes": 7,
  "fails": 0,
  "overall": "PASS",
  "user_a_email": "smoke-a-1777175793072@ddd.test",
  "user_b_email": "smoke-b-1777175793072@ddd.test",
  "timestamp": "2026-04-26T03:56:36.455Z"
}
```

### Step-by-step interpretation

1. **health:** pass — `/api/health` 200 with `deploymentMode: "authenticated"`.
2. **signup-a:** pass — `POST /api/auth/sign-up/email` 200; Set-Cookie present; `cookie_prefix_match: true` (literal `paperclip-team-shared.session_token=...`); response body returned the new Better Auth user with id `Y3hPtBWNyAzL9j7tcfKa6DOtNUNeKwFc`.
3. **get-session:** pass — `GET /api/auth/get-session` with cookie returns user A's session; email matches; session id `paperclip:session:Y3hPtBWNyAzL9j7tcfKa6DOtNUNeKwFc` (paperclip-prefixed namespace).
4. **get-companies:** pass — `GET /api/companies` 200 with empty array (`count: 0`).
5. **supabase-user-a:** pass — direct SQL `SELECT email, name FROM "user" WHERE email = $1` returned exactly 1 row matching user A.
6. **signup-b:** pass — second user signup 200; Set-Cookie present.
7. **supabase-both-users:** pass — direct SQL confirms 2 rows in `public.user` for both smoke emails.

Overall: **PASS** (7/7).

### Exact Set-Cookie header observed

```
set-cookie: paperclip-team-shared.session_token=YhOkTpvNlIfJkr06JQu9ZV6qNXD0jjWc.OEeuGeAvn38CT62vxfRLdkE%2BcjnbTJU3yW3ebuOTz7s%3D; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax
```

`HttpOnly`, `SameSite=Lax`, `Max-Age=604800` (7 days), Path=/. Prefix `paperclip-team-shared` confirms AUTH-02 derivation from `PAPERCLIP_INSTANCE_ID=team-shared`.

## Empirical findings

- **`get-companies` returns 0 in `authenticated` mode after fresh signup.** The plan's `must_haves.truths` predicted `≥1 company (paperclip auto-cria default)`. Empirical observation: paperclip does NOT auto-create a default company for newly signed-up users in `authenticated` mode. The endpoint returns 200 with a valid empty array — semantically correct (user has no companies yet). Default-company creation is gated to `local_trusted` board principal flow (`ensureLocalTrustedBoardPrincipal` at `server/src/index.ts:488`). For team-shared usage, company creation/invitation is the v2/Phase 3 onboarding flow (TEAM-01). Step still marked `pass` because endpoint behaves correctly; only the `must_have.truths` line is updated to reflect the empirical truth.
- **`MISSING_OR_NULL_ORIGIN` 403 on signup without Origin header.** Better Auth defaults reject cross-origin requests lacking an explicit Origin. Resolved in script by sending `origin: SERVER_URL`. Worth noting for client integrations (tests, mobile clients) — they must send Origin or be added to BETTER_AUTH_TRUSTED_ORIGINS.
- **`postgres` package not resolvable from project root.** Same lesson as Plan 02-04 (`working-directory: packages/db` workaround). Solved in script via `createRequire` rooted at `packages/db/package.json` so the script runs from any cwd. Captured as a reusable pattern.
- **No "Wart" stale runtime-services symptom observed during this run.** Server killed cleanly via `taskkill /F /T /PID` after smoke; subsequent restart did not collide. (Wart still tracked for Phase 3 TEAM-05 — single-run not a representative sample.)
- **Latency (rough):** Better Auth signup → Supabase commit measured at ~640ms (signup-a started 03:56:33.248Z, ended 03:56:33.884Z including network roundtrip). Acceptable for dev experience.

## User verification (Pending — see Tarefa 3)

To be completed at the human-verify checkpoint — see this plan's Tarefa 3.

## References

- `.planning/phases/02-migra-o-de-storage-para-supabase/MIGRATION_APPLY_LOG.md`
- `.planning/phases/02-migra-o-de-storage-para-supabase/02-05-SUMMARY.md`
- ROADMAP.md Phase 2 Success Criterion #1
- `bxlczioxgizgvtznukwt` (Supabase project ref)

___END_LOG___
*Smoke complete: 2026-04-26T03:56:36Z*
