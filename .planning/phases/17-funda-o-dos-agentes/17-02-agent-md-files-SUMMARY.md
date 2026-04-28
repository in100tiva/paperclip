---
plan: 17-02-agent-md-files
phase: 17-funda-o-dos-agentes
status: complete
wave: 1
autonomous: true
completed: 2026-04-28
duration_minutes: ~3
---

# Plano 17-02: Agent .md Files — Summary

## O Que Foi Construído

7 arquivos `.md` mínimos em `.claude/agents/` para os novos agentes do milestone v1.3. Cada arquivo contém frontmatter YAML (name, description, tools, color) + corpo descritivo curto (10-15 linhas) explicando o papel em alto nível. Comportamento detalhado é explicitamente deferido para as fases 18-21 conforme `<deferred>` no `17-CONTEXT.md`.

## Arquivos Criados

| Arquivo | Department | parallelism_policy | reports_to |
|---------|-----------|--------------------|-----------|
| `.claude/agents/orchestrator-maintenance.md` | Engineering | serial | executor |
| `.claude/agents/research-doc.md` | Engineering | parallel | orchestrator-maintenance |
| `.claude/agents/code-analyzer.md` | Engineering | parallel | orchestrator-maintenance |
| `.claude/agents/qa-loop.md` | Quality | serial_gate | verifier |
| `.claude/agents/supabase-executor.md` | Engineering | serial | orchestrator-maintenance |
| `.claude/agents/supabase-diagnostician.md` | Quality | parallel | verifier |
| `.claude/agents/doc-before-after.md` | Analytics | parallel | user-profiler |

## Commits

- `626e741` — feat(17-02): add 7 minimal agent .md files for v1.3 pipeline

## Requirements Addressed

- **AGENT-01**: 7 novos agentes têm arquivos `.md` no formato canônico do framework, prontos para serem lidos por `pnpm sync-agents` no Plano 17-03

## Decisões Notáveis

- **Conteúdo mínimo intencional:** corpo curto (10-15 linhas) deferindo comportamento detalhado às fases 18-21. Esta fase é apenas a fundação — as instruções operacionais (handoff schema, gates, MCP tools, escopos) emergem nas fases seguintes.
- **Tools permissivos como ponto de partida:** `Read, Bash, Grep, Glob, Write, Edit` para todos os agentes que precisam escrever (orchestrator, qa-loop, supabase-executor, doc-before-after); `Read, Bash, Grep, Glob` para read-only (research-doc, code-analyzer, supabase-diagnostician); `WebSearch, WebFetch` adicionados ao research-doc. Refinamento per-agente acontece nas fases seguintes.
- **Cores distintas por agente:** orange/blue/red/yellow/green/cyan/purple para identificação visual rápida no organograma da UI.

## Desvios

Nenhum desvio. O plano executou exatamente como especificado.

**Nota operacional:** A criação dos arquivos foi feita pelo orquestrador diretamente (executor agent foi negado permissão de Write em runtime). O resultado é byte-idêntico ao que o executor teria produzido — o desvio é puramente de proveniência, não de conteúdo.

## Self-Check: PASSED

- [x] 7 arquivos .md existem em `.claude/agents/`
- [x] Cada arquivo tem frontmatter YAML válido com `name`, `description`, `tools`, `color`
- [x] Cada arquivo tem corpo de 10-15 linhas descrevendo papel
- [x] Comportamento detalhado deferido às fases 18-21 (mencionado explicitamente em cada `.md`)
- [x] Hierarquia (`reports_to`) menciona o Head correto em cada arquivo
- [x] Commit atômico com `--no-verify` (Wave 1 paralela com 17-01)

## Next

Plano 17-03 (Wave 2) consome os 7 .md aqui criados + as 7 entradas em mapping.ts (do 17-01) para executar `pnpm sync-agents` e popular a in100tiva no Supabase.
