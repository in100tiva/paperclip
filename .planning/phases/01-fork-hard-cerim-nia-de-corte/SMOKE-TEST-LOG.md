# Phase 1 Smoke Test Log

**Date:** 2026-04-25
**Machine:** Windows 11 (working dir `d:\projetos\ddd`)
**Goal:** Confirm imported paperclip runs vanilla (`pnpm install && pnpm dev` with embedded Postgres) BEFORE Phase 2 swaps backend.

## Environment

- Node version: `v24.11.1`
- pnpm version: `9.15.4`
- OS: Windows 11
- Imported paperclip SHA: `40782f703d1f4a13f4ceadbe84c9b92be0bfacaf` (from `.planning/phases/01-fork-hard-cerim-nia-de-corte/01-01-SUMMARY.md`)

## Step 1: `pnpm install`

- **Exit code:** `0`
- **Duration:** `6m 7.4s` (first run — full download from registry, no cache)
- **Patches applied:** `embedded-postgres@18.1.0-beta.16` patch applied successfully (postinstall hook `@embedded-postgres/windows-x64 hydrate-symlinks.js` ran to completion → `Done`).
- **Peer warnings:** none material — no `WARN  peer` lines emitted.
- **Other warnings:** Repeated `WARN Failed to create bin at .../paperclip-plugin-dev-server. ENOENT: no such file or directory, stat '.../plugin-sdk/dist/dev-cli.js.EXE'` (×13). This is pre-existing paperclip behavior on Windows: pnpm tries to create `.EXE` shims for the plugin-dev-server bin from `@paperclipai/plugin-sdk`, but the package's `dist/` is only built on demand (not at install time). Non-blocking for `pnpm dev` — only affects standalone plugin authoring CLI which is out of scope for this smoke.
- **Patch verification:** `Patches: embedded-postgres@18.1.0-beta.16: patches/embedded-postgres@18.1.0-beta.16.patch` resolved cleanly; postinstall hooks completed in pnpm output.
- **Workspace dirs created:** `node_modules/`, `server/node_modules/`, `ui/node_modules/`, `packages/db/node_modules/` all present.
- **Result:** SUCCESS

<details>
<summary>Install log tail (last ~25 lines)</summary>

```
.../es5-ext@0.10.64/node_modules/es5-ext postinstall$  node -e "try{require('./_postinstall')}catch(e){}" || exit 0
.../es5-ext@0.10.64/node_modules/es5-ext postinstall: Done
 WARN  Failed to create bin at D:\projetos\ddd\packages\plugins\create-paperclip-plugin\node_modules\.bin\paperclip-plugin-dev-server. ENOENT: ... stat '...plugin-sdk\dist\dev-cli.js.EXE'
 WARN  Failed to create bin at D:\projetos\ddd\packages\plugins\examples\plugin-hello-world-example\node_modules\.bin\paperclip-plugin-dev-server. ENOENT: ...
 WARN  Failed to create bin at D:\projetos\ddd\packages\plugins\examples\plugin-authoring-smoke-example\node_modules\.bin\paperclip-plugin-dev-server. ENOENT: ...
 WARN  Failed to create bin at D:\projetos\ddd\packages\plugins\paperclip-plugin-fake-sandbox\node_modules\.bin\paperclip-plugin-dev-server. ENOENT: ...
 WARN  Failed to create bin at D:\projetos\ddd\packages\plugins\examples\plugin-file-browser-example\node_modules\.bin\paperclip-plugin-dev-server. ENOENT: ...
 WARN  Failed to create bin at D:\projetos\ddd\server\node_modules\.bin\paperclip-plugin-dev-server. ENOENT: ...
 WARN  Failed to create bin at D:\projetos\ddd\packages\plugins\examples\plugin-kitchen-sink-example\node_modules\.bin\paperclip-plugin-dev-server. ENOENT: ...

devDependencies:
+ @playwright/test 1.58.2
+ cross-env 10.1.0
+ esbuild 0.27.3
+ typescript 5.9.3
+ vitest 3.2.4

 WARN  Failed to create bin at .../plugin-sdk/dist/dev-cli.js.EXE (×7 — second pass after node_modules symlink resolution)
Done in 6m 7.4s
```
</details>

## Step 2: `pnpm dev` smoke

_Filled in by Task 2._

## Outcome

_Filled in by Task 3._
