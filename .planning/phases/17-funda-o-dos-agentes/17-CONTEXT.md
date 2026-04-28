# Fase 17: Fundação dos Agentes - Contexto

**Coletado:** 2026-04-28
**Status:** Pronto para planejamento
**Modo:** Auto-gerado (fase de infraestrutura — discuss pulado)

<domain>
## Limite da Fase

Os 7 novos agentes existem na in100tiva com hierarquia correta, políticas de paralelismo adequadas e invariantes do mapping atualizadas — base sobre a qual as fases seguintes definem comportamentos.

Esta fase APENAS registra os agentes (mapping.ts + arquivos `.md` mínimos + sync). Comportamentos detalhados (instruções de orquestração, handoff, QA, deploy Supabase, Notion) são definidos nas fases 18-21.

</domain>

<decisions>
## Decisões de Implementação

### Mapeamento canônico dos 7 novos agentes

Tabela canônica de arquitetura (de `.planning/research/SUMMARY.md`):

| Agente | Department | parallelismPolicy | reports_to |
|--------|-----------|-------------------|-----------|
| orchestrator-maintenance | Engineering | serial | executor (Head) |
| research-doc | Engineering | parallel | orchestrator-maintenance |
| code-analyzer | Engineering | parallel | orchestrator-maintenance |
| qa-loop | Quality | serial_gate | verifier (Head) |
| supabase-executor | Engineering | serial | orchestrator-maintenance |
| supabase-diagnostician | Quality | parallel | verifier (Head) |
| doc-before-after | Analytics | parallel | user-profiler (Head) |

### Invariantes do validateMapping()

- Total de agentes: 18 → 25
- Specialists: 14 → 21
- Heads: 4 (mantido)
- CEO: 1 (mantido)

### Discrição do Claude

- Conteúdo de cada `.md` em `.claude/agents/` para esta fase: mínimo viável (frontmatter + 1-2 linhas de descrição). Comportamento detalhado vem nas fases 18-21.
- Slug exato dos agentes: `orchestrator-maintenance`, `research-doc`, `code-analyzer`, `qa-loop`, `supabase-executor`, `supabase-diagnostician`, `doc-before-after`
- Frontmatter YAML segue o mesmo padrão dos 18 agentes existentes em `.claude/agents/*.md`

</decisions>

<code_context>
## Insights do Código Existente

### Ativos Reutilizáveis
- `scripts/sync-agents/mapping.ts` — mapping canônico TS-typed com `validateMapping()` (Phase 13 do v1.2)
- `scripts/sync-agents/sync.ts` — script idempotente que cria/atualiza agentes na in100tiva
- 18 agentes existentes em `.claude/agents/*.md` como referência de formato

### Padrões Estabelecidos
- Frontmatter YAML com campos: `name`, `description`, `tools`, `color` (e opcionalmente `model`)
- Hierarchy via `agents.reports_to` (UUID)
- `parallelism_policy` e `department` persistidos em `agents.metadata` JSON

### Pontos de Integração
- `pnpm sync-agents` é o único caminho legítimo para criar/atualizar agentes
- Script falha cedo se invariantes do `validateMapping()` quebrarem
- in100tiva é a empresa-alvo (companyId resolvido por env/flag)

</code_context>

<specifics>
## Ideias Específicas

- Os 4 Heads existentes (executor, verifier, user-profiler, planner) são intocáveis nesta fase — apenas adição
- Re-execução do `pnpm sync-agents` deve ser idempotente: 0 created em re-run, 7 unchanged

</specifics>

<deferred>
## Ideias Adiadas

- Conteúdo detalhado de cada agente (instruções operacionais, ferramentas MCP, skill attachments) → fases 18-21
- Skill `supabase-mcp` reutilizável → Fase 20
- Wiring do agent runtime para os novos agentes → emergente nas fases seguintes

</deferred>
