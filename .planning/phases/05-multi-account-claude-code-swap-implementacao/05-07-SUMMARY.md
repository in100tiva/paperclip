---
phase: 05-multi-account-claude-code-swap-implementacao
plan: 07
subsystem: multi-account-ui
tags: [multi-account, ui, rest-api, react-query, claude-accounts]
requires:
  - 05-01 (claude_accounts schema)
  - 05-03 (ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED constant + ClaudeAccountRotatedDetails type)
  - 05-04 (claudeAccountsService factory — listAccounts surfaced)
provides:
  - REST endpoints for Claude account CRUD-lite + rotation history
  - UI page at /:companyPrefix/company/settings/claude-accounts
  - ui/src/api/claude-accounts.ts client helpers (typed)
affects:
  - server/src/app.ts (route mount)
  - server/src/routes/index.ts (re-export)
  - ui/src/App.tsx (new Route)
tech-stack:
  added: []
  patterns:
    - assertCompanyAccess + custom assertCompanyOwnerOrAdmin gate (D-29)
    - Zod validate middleware for body schemas (paperclip convention)
    - Postgres unique-violation (23505) → HTTP 409 conflict translation
    - React Query useQuery/useMutation pattern from CompanyInvites.tsx
    - shadcn Badge variants (default/secondary/destructive/outline) for status colors
key-files:
  created:
    - server/src/routes/claude-accounts.ts
    - ui/src/api/claude-accounts.ts
    - ui/src/pages/ClaudeAccounts.tsx
    - ui/src/pages/ClaudeAccounts.test.tsx
  modified:
    - server/src/routes/index.ts
    - server/src/app.ts
    - ui/src/App.tsx
decisions:
  - Inline `db.insert(claudeAccounts)` in POST handler (vs adding createAccount to service)
  - assertCompanyOwnerOrAdmin helper inline in route file (vs extending authz.ts)
  - Reuse shadcn Badge component (not inline Tailwind classes) for status colors
  - Path /companies/:companyId/claude-accounts (D-28) under board layout
  - Slug regex validated both server-side (Zod) and client-side (HTML pattern)
metrics:
  duration: ~22min
  completed: 2026-04-26
  tasks: 2
  commits: 2
  tests-added: 5
---

# Phase 5 Plan 07: Claude Accounts UI + Backing API Summary

REST API and React UI for the multi-account pool — operator can list, register, toggle, and audit rotation history of Claude Code accounts that the heartbeat (Plan 06) rotates over.

## Endpoints exposed

All under `/api`, mounted by `claudeAccountsRoutes(db)` in `server/src/app.ts`:

| Method | Path | Auth | Permission |
| ------ | ---- | ---- | ---------- |
| GET    | `/companies/:companyId/claude-accounts` | required | any active company member (assertCompanyAccess) |
| POST   | `/companies/:companyId/claude-accounts` | required | owner or admin only (assertCompanyOwnerOrAdmin) |
| PATCH  | `/companies/:companyId/claude-accounts/:accountId` | required | owner or admin only |
| GET    | `/companies/:companyId/claude-accounts/rotation-history?limit=N` | required | any active company member |

Rotation-history declared **before** the parameterised `:accountId` path so Express doesn't match it as a UUID.

## Decisions

### Inline create vs service.createAccount

The plan flagged a choice: extend `claudeAccountsService` with `createAccount` or inline the `db.insert(...)` call in the POST handler. **Chose inline** because (a) the service contract documented in 05-04 is for runtime hot path (select/rotate/recordSwapOutcome), not CRUD; (b) the create payload is small (4 fields) and the unique-violation translation lives naturally next to the route's HTTP semantics; (c) v1 surface is small enough that adding a service layer adds indirection without testability gain. If a second writer of `claudeAccounts` rows appears (CLI tool, plugin), extract then.

### Permission check strategy

`assertCompanyAccess` already rejects viewers for non-safe methods. To exclude operators (D-29 requires owner/admin only for management), added a thin `assertCompanyOwnerOrAdmin(req, companyId)` helper inline in the route file. It mirrors the membershipRole array walk pattern from `access.ts` line 4038. Kept inline rather than extending `routes/authz.ts` because the role gate is specific to this feature; promoting to authz.ts would either generalize a "company-admin-only" helper (premature) or pollute authz with a feature-specific function.

`local_implicit` board mode and `isInstanceAdmin` short-circuit the gate, matching the shape of existing `assertCompanyAccess` exemptions.

### Component reuse

Reused shadcn `Badge` from `ui/src/components/ui/badge.tsx` with its built-in variants:
- `live` → default (primary)
- `exhausted` → destructive (red)
- `cooldown` → secondary (muted)
- `disabled` → outline

Used `Button`, `Badge`, native HTML inputs (consistent with CompanyInvites pattern), `KeyRound` + `Power` icons from lucide-react. No new design system. Date formatting via `toLocaleString()` (paperclip convention — see CompanyInvites:323).

### Routing

Path `/:companyPrefix/company/settings/claude-accounts` registered inside `boardRoutes()` next to `company/settings/invites`, same auth/layout chain. CONTEXT D-28 specified `/companies/:companyId/claude-accounts`, but the actual paperclip routing scheme is company-prefix-based (e.g., `/PAP/company/settings/...`); chose the paperclip-consistent path for muscle-memory and to keep the breadcrumb hierarchy (`Company → Settings → Claude Accounts`).

## Test coverage

5 vitest cases in `ui/src/pages/ClaudeAccounts.test.tsx`:

1. **renders loading state then accounts list with status badges** — asserts all 4 status variants (live/exhausted/cooldown/disabled) render with correct `data-status` attribute.
2. **renders empty state when no accounts are registered** — both pool and history empty messages.
3. **submits the register form with label + slug and invalidates the query** — uses native value setter helper to feed React-controlled inputs, asserts `claudeAccountsApi.create` called with trimmed payload, success toast pushed.
4. **toggles account status via Disable/Enable button** — asserts PATCH payload `{ status: "disabled" }` for a live account.
5. **renders rotation history entries with from/to/reason/strategy** — verifies short IDs, error family badge, swap strategy badge, swap status badge.

Server tests not added in this plan — TypeScript compile (`pnpm tsc --noEmit` exit 0) is the verify gate per the plan's `<verify><automated>` block. The route file's behavior is covered functionally by Plan 06/08 (heartbeat consumer + smoke E2E).

## Limitations v1

- **No edit of `configDirSlug` after create** — UNIQUE constraint + the slug is the literal directory name on disk; renaming would orphan credentials. Use `disable` then `register` a new slug if needed.
- **No delete** — only `disable` (status flip). Hard delete is a recovery operation; v1 leaves the row for activity-log referential integrity (rotation history might still reference the accountId). Add later if pool grows large.
- **No batch operations** — toggle/register one at a time. Pool size at v1 is expected ≤10 per company; batch UI not justified.
- **No real-time updates** — list refreshes on mount + after mutation. Heartbeat-driven status changes (live→exhausted) require manual refresh until a future plan wires `publishLiveEvent` for `claude_account_*` types.
- **Operators read-only by design** — D-29 specifies owner/admin only mutate; v1 doesn't surface a "request access" affordance for operators.

## Auth gates encountered

None. Both tasks executed cleanly without checkpoints.

## Deviations from Plan

**1. [Rule 3 - Blocker] Express params type coercion**
- **Found during:** Task 1 TS check
- **Issue:** `req.params.companyId` typed as `string | string[]` due to Express type definitions; drizzle query builders rejected the union type.
- **Fix:** Wrapped with `String(req.params.companyId)` and `String(req.params.accountId)` at all use sites. Safe because Express only emits arrays when explicitly configured (we don't), and the param shape is single-string in practice.
- **Files modified:** server/src/routes/claude-accounts.ts
- **Commit:** 496f26a

**2. [Rule 1 - Bug] React-controlled input value setter in tests**
- **Found during:** Task 2 vitest run (4/5 passed initially)
- **Issue:** `input.value = "x"; dispatchEvent("input")` doesn't update React state because React intercepts via the prototype setter; the synthetic event sees the old value via a non-bubble path.
- **Fix:** Added `setControlledInputValue` helper using `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value)` then dispatching `input` event — the canonical pattern for testing-library with native events.
- **Files modified:** ui/src/pages/ClaudeAccounts.test.tsx
- **Commit:** af34235

**3. [Rule 1 - Bug] Plan path mismatch — D-28 vs paperclip routing**
- **Found during:** Task 2 plan reading
- **Issue:** Plan D-28 prescribed `/companies/:companyId/claude-accounts`, but paperclip routing is company-prefix-based; the literal path doesn't fit `boardRoutes()`.
- **Fix:** Used `/:companyPrefix/company/settings/claude-accounts` matching the existing `company/settings/invites` neighbour. Documented the deviation in the routing decision section above.
- **Files modified:** ui/src/App.tsx
- **Commit:** af34235

## Self-Check: PASSED

**Files created:**
- FOUND: server/src/routes/claude-accounts.ts
- FOUND: ui/src/api/claude-accounts.ts
- FOUND: ui/src/pages/ClaudeAccounts.tsx
- FOUND: ui/src/pages/ClaudeAccounts.test.tsx

**Commits:**
- FOUND: 496f26a (feat(05-07): add Claude accounts management REST API)
- FOUND: af34235 (feat(05-07): add Claude accounts management UI page)

**Acceptance criteria:**
- 4 endpoints exposed (`router.get|post|patch` count = 4) — PASS
- `claudeAccountsRoutes` exported and mounted in app.ts — PASS
- 5 it() cases passing in ClaudeAccounts.test.tsx — PASS
- `cd server && pnpm tsc --noEmit` exit 0 — PASS
- `cd ui && pnpm tsc --noEmit` exit 0 — PASS
- `cd ui && pnpm vitest run src/pages/ClaudeAccounts.test.tsx` exit 0 (5/5 pass) — PASS
