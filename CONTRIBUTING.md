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
