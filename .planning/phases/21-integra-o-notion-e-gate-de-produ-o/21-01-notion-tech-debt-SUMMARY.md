---
plan: 21-01-notion-tech-debt
phase: 21-integra-o-notion-e-gate-de-produ-o
status: complete
completed: 2026-04-28
---

# Plano 21-01 — Summary

## Built

- `.claude/notion-config.json`: created with `tech_debt` key (placeholder ID;
  user populates real database ID via `/setup-notion`)
- `orchestrator-maintenance.md`: new section "Notion Tech Debt Documentation"
  with Steps A-E:
  - A: read `tech_debt` ID, fail with `NOTION_TECH_DEBT_NOT_CONFIGURED` if placeholder
  - B: compose required-fields schema (date, pipeline, title, impact,
    resolution_criteria, estimate, affected_files, qa_evidence)
  - C: create page via `mcp__claude_ai_Notion__notion-create-pages`
  - D: append Notion URL to PR body via `gh pr edit`
  - E: record `tech_debt_recorded` in pipeline-status

## Commit

`49ef4f8` — feat(21): notion tech-debt integration + orchestrator procedure

## Requirements
- NOTI-01 (auto creation on passRate < 80%) ✓
- NOTI-02 (required fields schema) ✓
- NOTI-03 (URL in PR body) ✓
- NOTI-04 (tech_debt key in notion-config.json) ✓

## Self-Check: PASSED
