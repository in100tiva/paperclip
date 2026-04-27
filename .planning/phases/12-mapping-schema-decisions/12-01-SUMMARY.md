# Phase 12 — Plan 12-01 SUMMARY

**Status:** complete
**Commit:** `46ba932`
**Duration:** ~25min (no subagents — inline execution)

## Files created

| File | LOC | Purpose |
|------|-----|---------|
| `scripts/sync-agents/types.ts` | 47 | Tipos compartilhados (AgentMapping, SkillMapping, Department, ParallelismPolicy) + constantes (TARGET_COMPANY_ID, CEO_AGENT_ID) |
| `scripts/sync-agents/mapping.ts` | 282 | AGENT_MAPPING (18 entries) + SKILL_MAPPING (3 entries) + helpers + validateMapping() |
| `scripts/sync-agents/validate-mapping.ts` | 28 | Runtime validator script (CLI execution) |
| `.planning/phases/12-mapping-schema-decisions/12-01-PLAN.md` | 152 | Plano executável (este arquivo é o SUMMARY do plano) |
| `.planning/phases/12-mapping-schema-decisions/12-DECISIONS.md` | 264 | 9 decisões locked com justificativa, rejeições, e revisitabilidade |

## Decisões finalizadas (consumidas por Phases 13-15)

D1. Heads = reuso (planner/executor/verifier/user-profiler)
D2. Total = 19 funcionários (1 CEO + 4 + 14)
D3. `parallelism_policy` em `agents.metadata.parallelismPolicy`
D4. `department` em `agents.metadata.department`
D5. Hierarquia via `agents.reports_to` (coluna existente — não `manager_agent_id` como REQUIREMENTS.md sugeria)
D6. Mapping canônico em TS file
D7. Skill attachment via `adapter_config.desiredSkillKeys`
D8. Distribuição: arch=8, eng=3, qual=3, analytics=0
D9. Skill mapping: paperclip→13, company-creator→1, design-guide→3

## Findings

- **Schema column `manager_agent_id` NÃO existe** — paperclip usa `reports_to`. REQUIREMENTS.md HIER-01 atualizado conceitualmente em 12-DECISIONS.md (D5). Sem migration necessária.
- **`agents.metadata jsonb`** existe como blob flexível separado de `runtime_config` e `adapter_config`. Decidido como home canônico para metadata operacional (parallelismPolicy + department).
- **18 .md files** em `.claude/agents/` (não 17 como original em REQUIREMENTS.md). Total final = 19 funcionários, não 18. Documentos não retroativados — número não muda decisões downstream.
- **Skills `paperclip` e `company-creator` são diretórios vazios** em `.claude/skills/` (sem `SKILL.md`). Apenas `design-guide` tem conteúdo. Tratamento delegado para Phase 14.

## Validação executada

```
$ node node_modules/.pnpm/tsx@4.21.0/.../cli.mjs scripts/sync-agents/validate-mapping.ts
✓ AGENT_MAPPING entries: 18
✓ SKILL_MAPPING entries: 3
✓ Heads: planner, executor, verifier, user-profiler
  architecture: 9 agents (1 head + 8 specialists)
  engineering: 4 agents (1 head + 3 specialists)
  quality: 4 agents (1 head + 3 specialists)
  analytics: 1 agents (1 head + 0 specialists)
✓ Skill attachments: paperclip=13, company-creator=1, design-guide=3
✓ All invariants OK
```

## Self-check (criterios de Plan 12-01)

| # | Critério | Status |
|---|----------|--------|
| 1 | `types.ts` exports tipos canônicos | ✓ |
| 2 | `mapping.ts` exports `AGENT_MAPPING.length === 18` | ✓ |
| 3 | Cada slug tem `.claude/agents/{slug}.md` correspondente | ✓ (verificado por filename match) |
| 4 | 4 isHead com depts distintos | ✓ |
| 5 | Distribuição: arch=8, eng=3, qual=3, analytics=0 | ✓ |
| 6 | `12-DECISIONS.md` cobre todas 4 áreas | ✓ (9 seções D1-D9) |
| 7 | `manager_agent_id` verificado | ✓ (não existe; uso `reports_to`) |

## Sem desvios

Plano executou conforme escrito. Único ajuste: descoberta da coluna `reports_to` (vs `manager_agent_id` assumido) — tratada na decisão D5 sem impacto downstream porque o objetivo (hierarquia persistida) é satisfeito pela coluna existente.
