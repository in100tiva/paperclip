# Phase 12: Mapping & Schema Decisions - Contexto

**Coletado:** 2026-04-27
**Status:** Pronto para planejamento
**Modo:** Smart Discuss (autônomo) — 2 áreas cinzentas em batch tables, todas aceitas

<domain>
## Limite da Fase

Produzir os artefatos declarativos e decisões de schema necessários para o script de importação rodar — sem decisões pendentes ao iniciar Phase 13. Não escreve nem o script de importação (Phase 13) nem os componentes de UI (Phase 15) nem documentação operacional (Phase 16).

**Entregáveis concretos:**
- `scripts/sync-agents/mapping.ts` — fonte canônica typed de todos os mappings (cargo→dept, parallelism_policy, manager, skill attachments)
- `scripts/sync-agents/types.ts` — tipos compartilhados (`Department`, `ParallelismPolicy`, `AgentMapping`, `SkillMapping`)
- `.planning/phases/12-mapping-schema-decisions/12-DECISIONS.md` — registro humano-legível das decisões com justificativa

</domain>

<decisions>
## Decisões de Implementação

### Schema & Identidade dos Heads

- **Heads = reuso de existentes** — `planner` (Head of Architecture), `executor` (Head of Engineering), `verifier` (Head of Quality), `user-profiler` (Head of Analytics). Justificativa: semantica já alinhada, evita inflação de agentes, total enxuto.
- **Total final na in100tiva = 19 funcionários** — 1 CEO existente + 4 Heads + 14 specialists. Derivado de `ls .claude/agents/` que tem 18 .md files (não 17 como anotado originalmente em PROJECT.md/REQUIREMENTS.md).
- **`parallelism_policy` persistido em `runtime_config.parallelismPolicy`** (JSON metadata) — paperclip já trata `runtime_config` como blob flexível. Zero migration. Decisão revisitável se UI passar a precisar de filtros/queries indexados sobre policy (improvável neste milestone).
- **Valores aceitos:** `'serial' | 'parallel' | 'serial_gate'` (snake_case por convenção SQL/JSON consistency).

### Mapping Format & Skill Attachment

- **Formato canônico:** `scripts/sync-agents/mapping.ts` exportando `AGENT_MAPPING: AgentMapping[]` e `SKILL_MAPPING: SkillMapping[]` typed. TypeScript dá autocomplete + refactor + type-check antes do script rodar. Alternativas (YAML/JSON) descartadas — perdem tipagem.
- **Skill attachment:** `adapterConfig.desiredSkillKeys: string[]` no agente — pattern já consumido pelo runtime do paperclip para resolver skills no spawn.
- **Department persistido em `runtime_config.department`** — junto com `parallelismPolicy`, metadata coesa.
- **Specialists Architecture (Head: planner) = 8** — roadmapper, project-researcher, phase-researcher, advisor-researcher, assumptions-analyzer, codebase-mapper, plan-checker, research-synthesizer. ui-researcher fica em Engineering por planejar UI durante o desenvolvimento.

### Distribuição final por departamento

| Dept | Head | Specialists (count) |
|------|------|---------------------|
| Architecture | planner | roadmapper, project-researcher, phase-researcher, advisor-researcher, assumptions-analyzer, codebase-mapper, plan-checker, research-synthesizer **(8)** |
| Engineering | executor | debugger, integration-checker, ui-researcher **(3)** |
| Quality | verifier | nyquist-auditor, ui-auditor, ui-checker **(3)** |
| Analytics | user-profiler | (0 — Head trabalha solo neste milestone) |

Total não-CEO = 4 Heads + 8 + 3 + 3 + 0 = **18 .md files mapeados** ✓

### Parallelism policy por agente

- **Architecture (planner + 8 specialists):** `serial` — planejamento, pesquisa, decisões de arquitetura. Issue por vez.
- **Engineering (executor + 3 specialists):** `parallel` — código pode rodar em workspaces/abas separadas sem conflito.
- **Quality (verifier + 3 specialists):** `serial_gate` — gate sequencial pós-engineering, valida saída.
- **Analytics (user-profiler):** `parallel` — análise read-only, não bloqueia.
- **CEO existente:** `serial` (decisor único).

### Skill mapping por cargo (final)

| Skill | Anexada a |
|-------|-----------|
| `paperclip` | CEO + 4 Heads + 8 Architecture specialists = 13 agentes |
| `company-creator` | CEO apenas (1 agente) |
| `design-guide` | ui-researcher + ui-auditor + ui-checker = 3 agentes |

### Decisão sobre `manager_agent_id` schema

- **Verificação obrigatória na execução:** confirmar que coluna `manager_agent_id` já existe na tabela `agents` antes de Phase 13 começar a escrever script. Se ausente, planejar migration Drizzle como fase decimal 12.1 INSERIDA.

### Discrição do Claude

- Slugs/keys exatos dos agentes na in100tiva: derivar de `frontmatter.name` (ex: `planner`, `executor`) sem prefixo de departamento — paperclip já dá contexto via `runtime_config.department`.
- Display name: usar `frontmatter.name` capitalizado + label de role inferida (ex: "Planner — Head of Architecture").
- `description` completa do agente: copiar `frontmatter.description` + body principal do .md (truncado se >2000 chars).
- `adapterType`: `claude_local` para todos (consistente com CEO existente).

</decisions>

<code_context>
## Insights do Código Existente

### Ativos Reutilizáveis
- **`server/src/services/agents.ts`** — `agentService(db)` com métodos `create`, `list`, `getById`, `update` que aceitam `adapterConfig` e `runtimeConfig` blobs.
- **`packages/shared/src/agent.ts`** — tipos `AdapterConfig`, `RuntimeConfig`. `desiredSkillKeys` provável já tipado como `string[]`.
- **`packages/db/src/schema/agents.ts`** — schema Drizzle. Verificar coluna `managerAgentId` (camelCase TS → `manager_agent_id` SQL).
- **`server/src/services/company-skills.ts`** — `companySkillService(db)` com método `createLocalSkill(companyId, payload)` para CompanySkill com `sourceType: local_path`.
- **CEO existente:** `id: d64a9f21-3ad0-4ca5-b7e8-58dbefb55b75`, company `4b0a1c03-b502-4f28-acfd-dfd646cd5cf6`. Não tocar.

### Padrões Estabelecidos
- **`runtime_config` como JSON blob:** paperclip já guarda configs flexíveis ali (vide multi-account `claudeConfigDir`, locale resolution).
- **`adapterConfig.desiredSkillKeys`:** consumido por `materializeSkillForLocale` durante spawn (Phase 11 v1.1).
- **Convenção snake_case em colunas SQL, camelCase em TS** — Drizzle faz a conversão.
- **Frontmatter parsing:** `gray-matter` ou similar já usado em company-skills (ver `parseFrontmatterMarkdown` em `server/src/services/company-skills.ts`).

### Pontos de Integração
- **Phase 13 consome `mapping.ts`** importando `AGENT_MAPPING` direto.
- **Phase 14 consome `SKILL_MAPPING`** para attachment.
- **Phase 15 (UI)** lê `runtime_config.parallelismPolicy` no perfil do agente para renderizar badge.

</code_context>

<specifics>
## Ideias Específicas

- Companhia alvo é **`4b0a1c03-b502-4f28-acfd-dfd646cd5cf6`** (in100tiva) — pode ficar hardcoded no mapping.ts como `TARGET_COMPANY_ID` ou via env `PAPERCLIP_SYNC_COMPANY_ID` (Phase 13 decide).
- CEO existente (`d64a9f21-...`) **não pode ser tocado** — sua adapterConfig + issue INTA-1 atribuída precisam permanecer byte-for-byte.
- Mapping deve ser **versionável no git** — TS file no repo, não em DB.

</specifics>

<deferred>
## Ideias Adiadas

- **UI para editar parallelism_policy / department** — fora do escopo (out-of-scope explícito em REQUIREMENTS.md).
- **Hooks de sincronização automática quando .claude/ muda** — v2 backlog (SYNC-01).
- **Migration para coluna `parallelism_policy` dedicada** — só se UI/queries provarem necessidade.
- **Bidirectional sync (paperclip→arquivos)** — v2 backlog (SYNC-02).

</deferred>
