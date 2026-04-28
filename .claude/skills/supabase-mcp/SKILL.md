---
name: supabase-mcp
description: Reusable conventions for agents that interact with Supabase via the mcp__supabase__* MCP tools. Used by supabase-executor (writes) and supabase-diagnostician (read-only). Codifies the access-token policy, tool preference order, and post-deploy verification procedure.
---

# Supabase MCP — Shared Skill

This skill is consumed by `supabase-executor` (deploys) and
`supabase-diagnostician` (verification). It documents the canonical access
patterns and the security policy around `SUPABASE_ACCESS_TOKEN`.

## Tools You May Use

| Tool | Purpose | Used by |
|------|---------|---------|
| `mcp__supabase__list_projects` | Enumerate projects in the org | both |
| `mcp__supabase__get_project` | Inspect a specific project | both |
| `mcp__supabase__list_tables` | List tables in `public.*` | both |
| `mcp__supabase__list_migrations` | Read migration history | both |
| `mcp__supabase__execute_sql` | Run arbitrary SQL (read or write) | executor (writes), diagnostician (SELECT only) |
| `mcp__supabase__apply_migration` | Apply a Drizzle migration | executor only |
| `mcp__supabase__deploy_edge_function` | Deploy an edge function | executor only |
| `mcp__supabase__get_logs` | Read recent logs | diagnostician only |
| `mcp__supabase__get_advisors` | Query Supabase advisor warnings | diagnostician only |
| `mcp__supabase__list_extensions` | List installed extensions | both |
| `mcp__supabase__search_docs` | Search Supabase docs | both |

## Access Token Policy — CRITICAL

`SUPABASE_ACCESS_TOKEN` (Personal Access Token from supabase.com/dashboard/account/tokens)
has **destructive scope at the organization level**: it can drop databases,
delete projects, rotate keys, etc. Therefore:

- **Source of truth**: `company_secrets` table or the `.env` injected into the
  paperclip heartbeat. The token is delivered to the agent via process env,
  never via the issue body or comments.
- **Forbidden**: requesting the token via an issue comment ("please paste the
  Supabase token here"). Issue comments persist in the LLM context indefinitely
  and propagate to future agents. This is a security violation.
- **Rotation**: if a deploy fails with auth error, comment on the issue
  indicating "ACCESS_TOKEN_INVALID — please rotate at supabase.com and update
  company_secrets" and PATCH issue to `blocked`. Do NOT retry.

## Tool Preference Order

Agents MUST follow this order when an action can be performed multiple ways:

1. **MCP tool** when one fits exactly (e.g., `apply_migration` for a Drizzle migration)
2. **CLI** (`supabase ...`) when MCP doesn't cover the operation (e.g., `supabase functions deploy --no-verify-jwt`)
3. **Direct SQL via `execute_sql`** as last resort, with comment in handoff explaining why MCP / CLI was insufficient

## Post-Deploy Verification (Diagnostician)

After every deploy, supabase-diagnostician must verify in this order:

1. `mcp__supabase__list_migrations` — confirm the applied migration ID matches
   the executor's reported version
2. `mcp__supabase__get_logs` — read last ~5 minutes of logs; flag any entries
   with `level=error`
3. `mcp__supabase__get_advisors` — check for new advisor warnings (lint,
   security, performance) introduced by the deploy
4. `mcp__supabase__list_tables` — sanity check that expected tables / columns
   exist post-migration

If any check returns divergence (e.g., schema version != expected), report it
in the handoff `artifacts_produced[].type=diagnostic` with concrete data
(expected vs actual) for the orchestrator to act on.

## Anti-Patterns (REJECTED)

- Hardcoding `SUPABASE_ACCESS_TOKEN` in any committed file
- Using `mcp__supabase__execute_sql` with `DROP TABLE` outside an explicit
  migration approved by `checkpoint:human-action`
- Polling `get_logs` in a tight loop (rate limit ~600 req/min)
- Skipping `checkpoint:human-action` for deploys "because it's fast" — every
  deploy gates on human approval, no exceptions
- Falsely claiming success when one of the verification steps failed (the
  handoff's `qa_gate_status` is computed mechanically, not opinion)
