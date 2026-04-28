# Fase 18: Protocolo de Handoff e Orquestrador - Contexto

**Coletado:** 2026-04-28
**Status:** Pronto para planejamento
**Modo:** Auto-gerado (decisões pre-definidas em pesquisa milestone-level)

<domain>
## Limite da Fase

Definir o protocolo `pipeline-handoff` (schema canônico, persistência, regras de emissão) e instrumentar o agente `orchestrator-maintenance.md` com a lógica completa de coordenação: criação de child issues paralelas, espera via `issue_children_completed`, distribuição de escopos disjuntos, checkpointing via `pipeline-status` document, e TTL para child issues travadas.

ESTA fase NÃO toca código de servidor — apenas documentação de protocolo + system prompts dos agentes (markdown). Nenhuma migration, nenhum endpoint REST novo.

</domain>

<decisions>
## Decisões de Implementação

### Schema canônico `pipeline-handoff` (HAND-01)

Persistido via `issue_documents` com `key = "pipeline-handoff"`. Campos obrigatórios:

```yaml
pipeline_stage: string  # "research" | "execution" | "qa" | "deploy" | "diagnostic" | "documentation"
upstream_findings:      # Resumo do que o agente upstream descobriu/produziu
  research_doc: string?       # findings de docs externas (se aplicável)
  code_analyzer: string?      # localização da falha (se aplicável)
  prior_artifacts: string[]   # paths dos artefatos relevantes da etapa anterior
decisions_made:         # Decisões tomadas pelo agente atual durante esta etapa
  - decision: string
    rationale: string
artifacts_produced:     # O que este agente entrega
  - path: string
    type: string        # "code" | "doc" | "test" | "config" | "diagnostic"
    summary: string
qa_gate_status: string  # "n/a" | "PENDING" | "APPROVED" | "RETRY" | "PARTIAL_SUCCESS"
```

### Documento `pipeline-status` (HAND-04, ORCH-05)

Mantido pelo orquestrador via `issue_documents` com `key = "pipeline-status"`. Atualizado após cada etapa. Schema:

```yaml
issue_id: uuid
current_stage: string
iteration: integer       # incrementado pelo QA-Loop a cada retorno
max_iterations: 3        # gate de parada do QA-Loop
completed_stages:        # histórico para retomada após swap
  - stage: string
    agent: string
    completed_at: ISO8601
    handoff_ref: string  # caminho relativo do issue_document
pending_stages:          # próximos passos planejados
  - stage: string
    assigned_agent: string
    file_scope: string[] # arquivos atribuídos (escopo disjunto)
last_checkpoint: ISO8601
```

### Regras de criação de child issues paralelas (ORCH-01, ORCH-02)

Orchestrator-Maintenance cria EXATAMENTE 2 child issues simultâneas no início:
- Filho 1: `research-doc` (parallelismPolicy: parallel)
- Filho 2: `code-analyzer` (parallelismPolicy: parallel)

Acorda automaticamente via evento nativo `issue_children_completed` (sem polling). Sintetiza os 2 handoffs antes de distribuir execução.

### TTL para child issues (ORCH-04)

Decisão: **TTL = 30 minutos por padrão** (configurável via `issue.executionPolicy.childTTLMin`). Após TTL sem `pipeline-handoff` document do filho, orquestrador:
1. Marca o filho como `timeout`
2. Registra a tentativa no `pipeline-status`
3. Decide: prossegue com handoff parcial OU escala para humano (depende de qual filho travou)

### Distribuição de escopos disjuntos (ORCH-03)

Após receber findings paralelos, orquestrador agrupa correções por arquivo. Regras:
- Cada arquivo é atribuído a EXATAMENTE UM agente executor
- Arquivos centrais (heartbeat.ts, agents.ts, schema/) sempre em série (parallelismPolicy: serial)
- Demais arquivos paralelizam quando ≥ 2 executores disponíveis
- O escopo é registrado em `pipeline-status.pending_stages[].file_scope`

### Discrição do Claude

- Localização do schema (em arquivo dedicado vs inline na skill `paperclip`): a critério do executor — recomendado em `.claude/skills/paperclip/rules/handoff-protocol.md`
- Formato do document body: YAML ou JSON — YAML preferível para legibilidade humana
- Validação do handoff (runtime check): a critério — começar permissivo, formalizar após smoke

</decisions>

<code_context>
## Insights do Código Existente

### Ativos Reutilizáveis
- `issues.parent_id` + `issue_relations (blocks)` — primitivas de pipeline hierárquico (já usados pelo paperclip)
- `documentService.upsertIssueDocument` em `server/src/services/documents.ts` — persistência idempotente de documents por (issue_id, key)
- `issue_children_completed` event — wake automático ao terminarem child issues
- `IssueContinuationSummary` em `server/src/services/issue-continuation-summary.ts` — modelo de referência para handoff schema (8 seções)
- `.claude/skills/paperclip/SKILL.md` — skill central de governança onde regras inter-agente são versionadas

### Padrões Estabelecidos
- Document keys são convenção (não enum) — registrados nas instruções dos agentes
- `executionState` JSONB livre em `issues` para metadados de pipeline (sem migration)
- Skills com `rules/*.md` são consumidas por todos os agentes que declaram a skill no frontmatter

### Pontos de Integração
- `.claude/agents/orchestrator-maintenance.md` (criado na Fase 17, corpo mínimo) — substituir corpo por instruções operacionais completas
- `.claude/skills/paperclip/SKILL.md` ou `.claude/skills/paperclip/rules/handoff-protocol.md` — adicionar regras de handoff
- Demais agentes (research-doc, code-analyzer, qa-loop, etc.) recebem instrução curta de "emit pipeline-handoff antes de finalizar" — instruções detalhadas vêm nas Fases 19-20

</code_context>

<specifics>
## Ideias Específicas

- O orquestrador deve ter exemplos concretos no system prompt (sample handoff YAML)
- Pipeline-status JSON deve ter um exemplo completo no prompt do orquestrador
- TTL = 30 minutos é o ponto de partida; ajustar empíricamente após smoke

</specifics>

<deferred>
## Ideias Adiadas

- Validação runtime do handoff schema (zod ou similar) → futuro se for útil; v1.3 começa permissivo
- UI de visualização do pipeline-status (mostra o pipeline progredindo) → v1.3.x ou v2
- Rotina de re-trial automática quando TTL acionado → mantido manual no v1.3

</deferred>
