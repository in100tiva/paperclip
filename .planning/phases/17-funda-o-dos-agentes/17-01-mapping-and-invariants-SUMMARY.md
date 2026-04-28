---
phase: 17-funda-o-dos-agentes
plan: "01"
subsystem: sync-agents
tags: [agent-mapping, invariants, tdd, v1.3]
dependency_graph:
  requires: []
  provides: [AGENT_MAPPING-25, validateMapping-v1.3]
  affects: [scripts/sync-agents/sync.ts, pnpm-sync-agents]
tech_stack:
  added: []
  patterns: [TDD-red-green, standalone-vitest-config, specialist-manager-hierarchy]
key_files:
  created:
    - scripts/sync-agents/mapping.test.ts
    - scripts/sync-agents/mapping.vitest.config.ts
    - scripts/sync-agents/tsconfig.json
  modified:
    - scripts/sync-agents/mapping.ts
decisions:
  - "Local tsconfig.json in scripts/sync-agents/ to isolate vitest from broken root tsconfig reference (packages/adapters/droid-local)"
  - "ALLOWED_SPECIALIST_MANAGER constant pattern for extensible specialist-reports-to-specialist rule"
  - "SKILL_MAPPING unchanged — 7 new agents receive desiredSkillKeys: [] per deferred plan (supabase-mcp is Phase 20)"
metrics:
  duration: "~3 minutes"
  completed: "2026-04-28"
  tasks_completed: 2
  files_modified: 4
---

# Phase 17 Plan 01: Mapping and Invariants Summary

## One-liner

Extended AGENT_MAPPING from 18 to 25 entries with v1.3 maintenance pipeline agents and updated validateMapping() to accept 2-level engineering hierarchy (orchestrator-maintenance as specialist-manager).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED — failing tests for v1.3 mapping (25 agents) | b896961 | mapping.test.ts, mapping.vitest.config.ts, tsconfig.json |
| 2 | GREEN — add 7 entries + update validateMapping() | eac6000 | mapping.ts |

## What Was Built

**AGENT_MAPPING (25 entries):**
- 18 v1.2 entries preserved byte-for-byte
- 7 new v1.3 entries added per canonical table in 17-CONTEXT.md:
  - Engineering: orchestrator-maintenance (serial/executor), research-doc (parallel/orchestrator-maintenance), code-analyzer (parallel/orchestrator-maintenance), supabase-executor (serial/orchestrator-maintenance)
  - Quality: qa-loop (serial_gate/verifier), supabase-diagnostician (parallel/verifier)
  - Analytics: doc-before-after (parallel/user-profiler)

**validateMapping() updates:**
- Count invariants: 18→25 entries, 14→21 specialists, heads=4 unchanged
- Specialist-manager rule relaxed: specialists may now report to a Head OR to `orchestrator-maintenance` (single allowed specialist-manager in v1.3)
- Department cross-check preserved: manager and specialist must share department

**Test suite (16 cases, all GREEN):**
- Total count, head count, specialist count assertions
- `it.each` over 7 new agents verifying department/parallelismPolicy/managerSlug/role/isHead
- validateMapping() smoke (no throw)
- orchestrator-maintenance direct reports (exactly 3: research-doc, code-analyzer, supabase-executor)
- v1.2 spot-check slugs regression
- SKILL_MAPPING size preservation (paperclip=13, design-guide=3, company-creator=ceo)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Root tsconfig.json references missing packages/adapters/droid-local**
- **Found during:** Task 1 — vitest run failed with `TSConfckParseError` on droid-local tsconfig
- **Issue:** Root tsconfig.json references `packages/adapters/droid-local` which doesn't exist; vite/esbuild picks this up when resolving TypeScript for `.ts` test files
- **Fix:** Created `scripts/sync-agents/tsconfig.json` (standalone, no project references) and pointed `mapping.vitest.config.ts` to use `scripts/sync-agents/` scope, bypassing the broken workspace reference
- **Files modified:** scripts/sync-agents/tsconfig.json (created), scripts/sync-agents/mapping.vitest.config.ts
- **Commit:** b896961 (bundled with Task 1)

## Known Stubs

None — all 25 entries have complete, non-stub values. SKILL_MAPPING unchanged. The 7 new agents have `desiredSkillKeys: []` intentionally (supabase-mcp skill deferred to Phase 20 per 17-CONTEXT.md `<deferred>`).

## Verification

```
validateMapping() via tsx: OK: 25 agents
vitest run: 16/16 passed
```

## Self-Check: PASSED

- `scripts/sync-agents/mapping.ts` exists: FOUND
- `scripts/sync-agents/mapping.test.ts` exists: FOUND
- `scripts/sync-agents/mapping.vitest.config.ts` exists: FOUND
- `scripts/sync-agents/tsconfig.json` exists: FOUND
- Commit b896961 exists: FOUND
- Commit eac6000 exists: FOUND
- 16/16 tests GREEN: CONFIRMED
- validateMapping() returns "OK: 25 agents": CONFIRMED
