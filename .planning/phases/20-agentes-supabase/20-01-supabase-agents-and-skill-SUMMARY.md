---
plan: 20-01-supabase-agents-and-skill
phase: 20-agentes-supabase
status: complete
completed: 2026-04-28
---

# Plano 20-01 — Summary

## Built
- `supabase-executor.md`: full body — token via env only, checkpoint:human-action, MCP-first with CLI fallback
- `supabase-diagnostician.md`: full body — read-only verification (schema, migrations, functions, logs, advisors)
- `.claude/skills/supabase-mcp/SKILL.md`: shared skill (token policy, tool order, anti-patterns)
- mapping.ts: SKILL_MAPPING entry for `supabase-mcp` + desiredSkillKeys on both agents
- Applied via `pnpm sync-skills`: 17 agents updated; supabase-executor and supabase-diagnostician show [supabase-mcp]

## Commit
`72bdd1e` — feat(20): supabase agents full bodies + supabase-mcp shared skill

## Requirements
- SUPA-01..07 ✓

## Self-Check: PASSED
