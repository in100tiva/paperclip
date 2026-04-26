# Upstream Reference

This repository is a **hard fork** of [paperclipai/paperclip](https://github.com/paperclipai/paperclip).

## Imported Commit

- **Upstream:** `https://github.com/paperclipai/paperclip`
- **Branch:** `master`
- **SHA:** `40782f703d1f4a13f4ceadbe84c9b92be0bfacaf`
- **Imported on:** 2026-04-25

## Policy

- We do **NOT** fetch, merge, rebase, or pull from upstream paperclip.
- There is **NO** `paperclipai/paperclip` remote in this repository's `.git/config`.
- If a specific upstream fix or feature becomes desirable, it is **manually ported** as a new patch in this repo, with the upstream SHA cited in the commit message footer:
  ```
  Ported from paperclipai/paperclip@<upstream-sha>
  ```
- See `CONTRIBUTING.md` for the broader hard-fork policy.

## Why a Hard Fork

- Paperclip is the foundation; DDD diverges aggressively (Supabase backend, multi-account Claude Code swap, team workflow conventions).
- Continuous merge from upstream would impose merge cost without proportional gain — see `.planning/PROJECT.md` and `.planning/research/PITFALLS.md` (Pitfall 1).
- This file is the single source of truth for "what version of paperclip did we start from?".
