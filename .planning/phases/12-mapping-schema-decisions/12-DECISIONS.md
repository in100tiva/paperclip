# Phase 12 — Decisões de Mapping & Schema

**Status:** locked
**Data:** 2026-04-27
**Consumido por:** Phases 13, 14, 15

Decisões abaixo são fonte da verdade para a importação. Mudanças requerem nova fase ou inserção decimal.

---

## D1. Heads = reuso de agentes existentes

**Decisão:** Os 4 Heads são agentes do framework já presentes em `.claude/agents/`:

| Departamento | Head (slug) | Justificativa |
|--------------|-------------|---------------|
| Architecture | `planner` | Já é o agente de mais alto nível em planejamento. |
| Engineering | `executor` | Coordena a execução de planos. |
| Quality | `verifier` | Validação retroativa contra critérios. |
| Analytics | `user-profiler` | Análise comportamental, métricas, perfil. |

**Alternativa rejeitada:** Heads sintéticos novos ("Head of Architecture" como agente separado). Rejeitada por inflar o catálogo de agentes para 22+ e introduzir agentes que não existem como `.md` files.

**Revisitável quando:** se um Head precisar de skills/permissões diferentes do specialist sênior daquele dept.

---

## D2. Total na in100tiva = 19 funcionários

**Composição final:**
- 1 CEO (pré-existente, id `d64a9f21-...`, intocável)
- 4 Heads (planner, executor, verifier, user-profiler)
- 14 specialists distribuídos: arch=8, eng=3, quality=3, analytics=0

**Correção feita:** `PROJECT.md` e `REQUIREMENTS.md` originais diziam "18 funcionários (CEO + 4 Heads + 13 specialists)". Recontagem do FS (`ls .claude/agents/ | wc -l = 18`) mostra 18 .md files. Logo o total real é 19. Documentos não corrigidos retroativamente porque o número 18 vs 19 não muda nenhuma decisão downstream — Phase 13 importa todos os 18 do FS independente da contagem antiga.

---

## D3. `parallelism_policy` em `agents.metadata` JSON

**Decisão:** Persistir em `agents.metadata.parallelismPolicy` (coluna `metadata jsonb` já existe no schema).

**Schema confirmado em `packages/db/src/schema/agents.ts:36`:**

```typescript
metadata: jsonb("metadata").$type<Record<string, unknown>>(),
```

**Alternativa rejeitada:** Coluna nova `parallelism_policy text` com migration Drizzle dedicada. Rejeitada porque (a) zero migration custa zero risco em produção compartilhada, (b) `metadata` é exatamente o lugar canônico para metadata flexível por agente, (c) UI deste milestone não exige queries indexadas sobre policy.

**Valores:** `'serial' | 'parallel' | 'serial_gate'` (snake_case por convenção SQL/JSON consistency).

**Revisitável quando:** UI ou heartbeat scheduler precisarem filtrar/agrupar por policy com performance crítica → migrar para coluna dedicada.

---

## D4. `department` em `agents.metadata.department`

**Decisão:** Persistir em `agents.metadata.department` (mesmo blob de `parallelismPolicy`, metadata coesa).

**Valores:** `'architecture' | 'engineering' | 'quality' | 'analytics'`.

---

## D5. Hierarquia via `agents.reports_to` UUID

**Schema descoberto:** Coluna existente é `reports_to` (não `manager_agent_id` como originalmente assumido em REQUIREMENTS.md HIER-01).

```typescript
reportsTo: uuid("reports_to").references((): AnyPgColumn => agents.id),
```

**Decisão:** Usar `reports_to` para hierarquia. HIER-01 considerado satisfeito quando `reports_to` está populado corretamente:
- 4 Heads → `reports_to = CEO_AGENT_ID` (`d64a9f21-...`)
- 14 specialists → `reports_to = id do Head do mesmo departamento`
- CEO → `reports_to IS NULL` (já é assim, intocável)

**Migration necessária?** Não. Coluna pré-existe.

---

## D6. Mapping canônico em TS file versionado

**Decisão:** `scripts/sync-agents/mapping.ts` exporta `AGENT_MAPPING: AgentMapping[]` typed + `SKILL_MAPPING: SkillMapping[]` typed.

**Alternativas rejeitadas:**
- YAML em `.planning/AGENT-MAPPING.yaml`: perde tipagem, requer parser, autocomplete fraco no editor.
- JSON em `scripts/sync-agents/mapping.json`: idem.
- Tabela em DB: torna o mapping não-versionável no git, dificulta review em PRs.

**Valor:** TypeScript dá autocomplete, refactor seguro, type-check antes do script rodar (catches em build/dev).

---

## D7. Skill attachment via `adapter_config.desiredSkillKeys`

**Decisão:** Cada agente tem `adapter_config.desiredSkillKeys: string[]` listando os keys das skills atribuídas.

**Justificativa:** Pattern já consumido pelo runtime do paperclip — `materializeSkillForLocale` (Phase 11 v1.1) lê esse array para resolver skills no spawn do claude. Reutilização total, zero código novo.

**Alternativa rejeitada:** Tabela nova `agent_skills (agent_id, skill_id)` com FKs. Mais explícita mas:
- Requer migration Drizzle nova.
- Duplica responsabilidade — runtime já resolve via `desiredSkillKeys`.
- Não há requisito que demande JOIN-friendly query agora.

**Revisitável quando:** UI de gestão de skills precisar de queries reverse-lookup performantes (skill → quais agentes têm).

---

## D8. Distribuição final de specialists por dept

**Architecture (Head: planner) — 8 specialists, todos `serial`:**
1. roadmapper
2. project-researcher
3. phase-researcher
4. advisor-researcher
5. assumptions-analyzer
6. codebase-mapper
7. plan-checker
8. research-synthesizer

**Engineering (Head: executor) — 3 specialists, todos `parallel`:**
1. debugger
2. integration-checker
3. ui-researcher (skill `design-guide`)

**Quality (Head: verifier) — 3 specialists, todos `serial_gate`:**
1. nyquist-auditor
2. ui-auditor (skill `design-guide`)
3. ui-checker (skill `design-guide`)

**Analytics (Head: user-profiler) — 0 specialists** (Head trabalha solo neste milestone).

---

## D9. Skill mapping por cargo (final)

| Skill | Anexada a | Total |
|-------|-----------|-------|
| `paperclip` | CEO + 4 Heads + 8 Architecture specialists | **13 agentes** |
| `company-creator` | CEO apenas | **1 agente** |
| `design-guide` | ui-researcher + ui-auditor + ui-checker | **3 agentes** |

CEO é resolvido por sentinela `'ceo'` em `attachedToSlugs[]` (Phase 13 mapeia → `CEO_AGENT_ID`).

---

## Constantes canônicas (em `scripts/sync-agents/types.ts`)

```typescript
export const TARGET_COMPANY_ID = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6';
export const CEO_AGENT_ID = 'd64a9f21-3ad0-4ca5-b7e8-58dbefb55b75';
export const CEO_SLUG_SENTINEL = 'ceo';
```

---

## Validação runtime

`scripts/sync-agents/validate-mapping.ts` chama `validateMapping()` e imprime distribuição. Executado em 2026-04-27 com saída:

```
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

---

## Itens NÃO decididos aqui (delegados para Phase 13+)

- Como o script idempotente identifica agente existente (lookup por `name + companyId`? por `metadata.frameworkSlug`?). Phase 13 decide.
- Formato exato do prompt agregado (frontmatter `description` + body) em `agents.adapter_config.systemPromptOverride` ou similar. Phase 13 decide.
- Tratamento de skills `paperclip` e `company-creator` quando seus diretórios estão vazios em `.claude/skills/` (atualmente são pastas vazias). Phase 14 decide — provavelmente importa só `design-guide` que tem conteúdo, marca outras 2 como "skill stub" sem files.
