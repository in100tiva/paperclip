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

- **Started PID:** `3437` (bash subshell wrapper); real Node listeners observed at PIDs `17768` (postgres) and `24440` (server tree). Children: `18528`, `18868`, `11888`.
- **Time to first ready signal:** ~80 seconds (iteration 16 × 5s in the readiness poll). Major boot phases:
  1. `db:migrate` — applied 71 pending migrations against `embedded-postgres@54329`.
  2. `plugin-sdk` build (TypeScript compile of `@paperclipai/shared` then plugin-sdk).
  3. `embedded-postgres` ready ("cluster already exists; skipping init", stale lock file removed).
  4. Banner printed — server listening on `127.0.0.1:3100`, mode=`embedded-postgres`, vite-dev-middleware mounted, auth=ready, bootstrap=ready.
- **Ports observed listening:** `127.0.0.1:3100` (Express + Vite middleware), `127.0.0.1:54329` (embedded Postgres), `127.0.0.1:13100` (paperclip IPC/admin), `[::1]:54329` (IPv6 pg). Confirmed via `netstat -an`.
- **Server health check:** `GET http://127.0.0.1:3100/api/health` → `HTTP 200` with body `{"status":"ok","version":"0.3.1","deploymentMode":"local_trusted","deploymentExposure":"private","authReady":true,"bootstrapStatus":"ready","bootstrapInviteActive":false,"features":{"companyDeletionEnabled":true}}`.
- **UI root check:** `GET http://127.0.0.1:3100/` → `HTTP 200`, `<!DOCTYPE html>` HTML body served (Vite middleware rendering React root with `class="dark"`).
- **Embedded Postgres confirmed:** YES — log line `Using embedded PostgreSQL because no DATABASE_URL set (dataDir=C:\Users\in100\.paperclip\instances\default\db, port=54329)` and `Embedded PostgreSQL ready`. Banner row: `Mode  embedded-postgres | vite-dev-middleware`.
- **Errors during boot:** NONE. One DEP0190 deprecation warning (Node `child_process` shell-true args) and one stale-lock warning (`Removing stale embedded PostgreSQL lock file`) — both non-blocking and pre-existing paperclip behavior.
- **Notable startup notes:**
  - Paperclip default `instanceId=default`, home dir `C:\Users\in100\.paperclip\instances\default\`.
  - `Agent JWT  missing (run pnpm paperclipai onboard)` — expected on a fresh install; not blocking baseline boot.
  - Plugin scaffolding ran clean: `plugin-job-coordinator`, `plugin-job-scheduler`, `plugin-tool-dispatcher` all initialized; `0 ready plugins` registered (expected — none configured yet).
  - DB Backup scheduler enabled with default 60min interval, 7d retention.
- **Dev process stopped:** `taskkill //F //T //PID 17768 24440` — child PIDs 18528, 18868, 11888 terminated. Final `netstat -an | grep LISTENING` on ports 3100/54329 returns empty (clean shutdown).
- **Result:** SUCCESS

<details>
<summary>Dev log first ~40 lines (boot sequence)</summary>

```
> ddd@ dev D:\projetos\ddd
> pnpm --filter @paperclipai/server exec tsx ../scripts/dev-runner.ts watch

[paperclip] dev mode: local_trusted (default)
(node:18440) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)

> ddd@ db:migrate D:\projetos\ddd
> pnpm --filter @paperclipai/db migrate

> @paperclipai/db@0.3.1 migrate D:\projetos\ddd\packages\db
> pnpm run check:migrations && tsx src/migrate.ts

> @paperclipai/db@0.3.1 check:migrations D:\projetos\ddd\packages\db
> tsx src/check-migration-numbering.ts

Migrating database via embedded-postgres@54329
Applying 71 pending migration(s)...
Migrations complete
[paperclip] building plugin sdk...

> @paperclipai/plugin-sdk@1.0.0 build D:\projetos\ddd\packages\plugins\sdk
> pnpm --filter @paperclipai/shared build && tsc

> @paperclipai/shared@0.3.1 build D:\projetos\ddd\packages\shared
> tsc

> @paperclipai/server@0.3.1 dev:watch D:\projetos\ddd\server
> cross-env PAPERCLIP_MIGRATION_PROMPT=never PAPERCLIP_MIGRATION_AUTO_APPLY=true tsx ./scripts/dev-watch.ts

[22:45:30] INFO: Using embedded PostgreSQL because no DATABASE_URL set (dataDir=C:\Users\in100\.paperclip\instances\default\db, port=54329)
[22:45:30] INFO: Embedded PostgreSQL cluster already exists (...PG_VERSION); skipping init
[22:45:30] WARN: Removing stale embedded PostgreSQL lock file
[22:45:31] INFO: Embedded PostgreSQL ready
```
</details>

<details>
<summary>Banner + last ready signals</summary>

```
██████╗  █████╗ ██████╗ ███████╗██████╗  ██████╗██╗     ██╗██████╗
██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔════╝██║     ██║██╔══██╗
██████╔╝███████║██████╔╝█████╗  ██████╔╝██║     ██║     ██║██████╔╝
██╔═══╝ ██╔══██║██╔═══╝ ██╔══╝  ██╔══██╗██║     ██║     ██║██╔═══╝
██║     ██║  ██║██║     ███████╗██║  ██║╚██████╗███████╗██║██║
╚═╝     ╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚═╝╚═╝
  ───────────────────────────────────────────────────────
Mode             embedded-postgres  |  vite-dev-middleware
Deploy           local_trusted (private)
Bind             loopback (127.0.0.1)
Auth             ready
Server           3100
API              http://127.0.0.1:3100/api  (health: http://127.0.0.1:3100/api/health)
UI               http://127.0.0.1:3100
Database         C:\Users\in100\.paperclip\instances\default\db  (pg:54329)
Migrations       already applied
Agent JWT        missing (run `pnpm paperclipai onboard`)
Heartbeat        enabled (30000ms)
DB Backup        enabled (every 60m, keep 7d)
Backup Dir       C:\Users\in100\.paperclip\instances\default\data\backups
Config           C:\Users\in100\.paperclip\instances\default\config.json
  ───────────────────────────────────────────────────────

[22:45:35] INFO: plugin job coordinator started — listening to lifecycle events
[22:45:35] INFO: plugin job scheduler started {"tickIntervalMs":30000,"maxConcurrentJobs":10}
[22:45:35] INFO: initializing plugin tool dispatcher
[22:45:35] INFO: plugin-loader: loading all ready plugins
[22:45:35] INFO: Automatic database backups enabled
[22:45:35] INFO: Server listening on 127.0.0.1:3100
[22:45:35] INFO: plugin-loader: no ready plugins to load
[22:45:35] INFO: loaded tools from ready plugins {"readyPlugins":0,"registeredTools":0}
[22:45:35] INFO: plugin tool dispatcher initialized {"totalTools":0}
```
</details>

## Outcome

_Filled in by Task 3._

