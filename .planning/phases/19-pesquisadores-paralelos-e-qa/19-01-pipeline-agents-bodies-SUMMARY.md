---
plan: 19-01-pipeline-agents-bodies
phase: 19-pesquisadores-paralelos-e-qa
status: complete
wave: 1
autonomous: true
completed: 2026-04-28
---

# Plano 19-01 — Summary

## O Que Foi Construído

Bodies operacionais completos para os 4 agentes do pipeline Research+QA:
- `research-doc.md` — pesquisa externa (WebSearch + WebFetch) com canonical pattern + versioning + sources
- `code-analyzer.md` — análise local read-only com blast-radius mapping (≤2 níveis) + suggested file_scope
- `qa-loop.md` — gate objetivo via `total.lines.pct ≥ 80` com critério de parada de 3 iterações (PARTIAL_SUCCESS)
- `doc-before-after.md` — captura state-before/after por etapa modificadora via `git show <commit>:<file>`

Seções `## Handoff at completion` (Fase 18) preservadas byte-by-byte.

## Commit

`762e6ba` — feat(19): full operational instructions for 4 pipeline agents

## Requisitos
- PIPE-01 (research-doc read-only) ✓
- PIPE-02 (code-analyzer read-only) ✓
- PIPE-03 (Research-Doc + Code-Analyzer parallel) ✓
- PIPE-04 (`pnpm test --coverage` + `Lines ≥ 80%`) ✓
- PIPE-05 (max 3 iterações) ✓
- PIPE-06 (PARTIAL_SUCCESS após max → Tech-Debt-Documenter) ✓
- PIPE-07 (state-before/after via issue_documents) ✓

## Self-Check: PASSED
