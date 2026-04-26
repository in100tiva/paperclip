# Contributing to DDD

## Hard Fork Policy

This project is a **hard fork** of `paperclipai/paperclip`. The fork-cut ceremony was completed in Phase 1 (see `UPSTREAM_REFERENCE.md` for the imported SHA).

**Rules:**

1. **No PRs to upstream.** We do not contribute back to `paperclipai/paperclip`. Anything we build here belongs to DDD.
2. **No merges from upstream.** Do not run `git fetch paperclipai`, `git pull paperclipai`, or any equivalent. There is intentionally no `paperclipai/paperclip` remote configured.
3. **Manual port when useful.** If `paperclipai/paperclip` ships a fix or feature we want, port it manually as a new commit in this repo. Cite the upstream SHA in the commit message footer:
   ```
   Ported from paperclipai/paperclip@<upstream-sha>
   ```
4. **Identity is `ddd`.** The root `package.json` says `"name": "ddd"`. Do not revert this. Workspace packages may retain their `@paperclipai/*` scope where they already do (no churn benefit in renaming them in v1).
5. **Drift is expected and intentional.** As the codebase diverges (Supabase migration, multi-account swap, team workflow), upstream paperclip becomes less and less relevant. This is by design — see `.planning/research/PITFALLS.md` (Pitfall 1) and `.planning/PROJECT.md`.

## Day-to-Day Contribution

This is a small-team internal fork (5+ devs). The development workflow lives in `.planning/` and is enforced via the framework command flow (`/quick`, `/debug`, `/execute-phase`). Direct edits outside the framework workflow require explicit user approval — see `CLAUDE.md` for the framework enforcement rules.

## Database Migration Policy (Phase 2 v1)

**Single source of truth: drizzle-kit is the single source of truth.** All schema changes flow through:

1. Edit `packages/db/src/schema/*.ts`
2. Run `pnpm db:generate` (drizzle-kit emits a new migration file in `packages/db/src/migrations/0XXX_*.sql`)
3. Open a PR — schema changes require reviewer approval (see `.github/PULL_REQUEST_TEMPLATE.md` §Schema/Migration Changes)
4. After merge to `main`, `.github/workflows/db-migrate.yml` applies the migration to the shared Supabase project

**DO NOT:**

- Run `pnpm db:migrate` from a developer machine targeting the shared Supabase. The workflow is the only authorized path.
- Use `supabase migration new` or the Supabase Studio SQL editor to alter schema. drizzle-kit's journal becomes inconsistent (DB-05).
- Hand-write migration SQL files in `packages/db/src/migrations/`. drizzle-kit owns naming + checksums.
- Hand-edit existing migration files (they're hashed; drizzle-kit will refuse to apply if checksums diverge).

**Local development against the shared DB:**

- Auto-migrations on app startup are disabled (DB-02). If `pnpm dev` complains about pending migrations, that means `main` has migrations that have not yet been auto-applied by CI — wait for the workflow to finish, OR pull the latest commit (your local lockfile may include schema files that the team hasn't merged yet).

**Offline development (embedded fallback):**

- Set `PAPERCLIP_DB_MODE=embedded-postgres` in your `.env.local` to spin up a local Postgres. State does not sync with the team. Useful for smoke tests before opening a PR. (INFRA-06.)

**Emergency override:**

- The workflow has `workflow_dispatch` enabled, so a maintainer can trigger it manually from the Actions tab if a push didn't include schema changes but the DB is desynced. This is rare; document any manual run in `.planning/phases/.../MIGRATION_APPLY_LOG.md` for the affected phase.

References: `.planning/REQUIREMENTS.md` DB-01..05; `.planning/research/PITFALLS.md` Armadilha 3.
