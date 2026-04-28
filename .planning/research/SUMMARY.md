# Resumo da Pesquisa do Projeto

**Projeto:** Paperclip in100tiva — Pipeline de Manutenção Paralela (v1.3)
**Domínio:** Orquestração de agentes de IA com paralelismo, Supabase MCP, Notion MCP e handoff de contexto estruturado sobre plataforma Paperclip existente
**Pesquisado:** 2026-04-28
**Confiança:** HIGH

---

## Resumo Executivo

O milestone v1.3 introduz um pipeline de manutenção paralela com 7 novos agentes especializados que coordenam pesquisa, execução, QA em loop, deploy Supabase e documentação de débito técnico no Notion. A abordagem recomendada é extensão conservadora: **zero dependências npm novas, zero migrations de schema, zero código novo de servidor.** Toda a infraestrutura necessária — paralelismo via `issues.parent_id` + `parallelismPolicy`, handoffs via `issue_documents`, waking events nativos, Supabase MCP e Notion MCP — já existe no codebase.

O esforço real são 7 arquivos `.md` de instrução para os novos agentes, 7 entradas em `scripts/sync-agents/mapping.ts` (invariantes 18→25 agentes), e a definição do protocolo de handoff estruturado **antes** de criar qualquer agente.

---

## Principais Descobertas

### Adições à Stack

**Zero dependências npm novas.** As únicas adições são de configuração:

- Variáveis de ambiente: `SUPABASE_ACCESS_TOKEN`, `NOTION_TOKEN`, `NOTION_DATABASE_ID`
- Declaração de MCP tools nos frontmatters YAML dos novos agentes: `mcp__supabase__*`, `mcp__claude_ai_Notion__*`
- `notion-config.json`: nova chave `"tech_debt": "<database-id>"`

**Primitivas Paperclip reaproveitadas (todas verificadas por leitura direta do código):**

| Primitiva | Localização | Uso no v1.3 |
|-----------|-------------|-------------|
| `issues.parent_id` + `parallelismPolicy` | `schema/issues.ts` | Pesquisa paralela via child issues |
| `issue_children_completed` | `heartbeat.ts` | Orquestrador acorda quando pesquisadores terminam |
| `issue_documents` / `documentService.upsertIssueDocument` | `services/documents.ts` | Handoffs estruturados por etapa |
| `refreshIssueContinuationSummary` | `services/issue-continuation-summary.ts` | Template base para handoff |
| `issueTreeControlService.createHold` | `services/issue-tree-control.ts` | Gates de QA e aprovação humana |
| `request_board_approval` | `skills/paperclip/SKILL.md` | Solicitar access token do Supabase |
| `scripts/sync-agents/mapping.ts` | `scripts/sync-agents/` | Registrar os 7 novos agentes |

### Funcionalidades Esperadas

**Deve ter — P1 (v1.3):**
- Orchestrator-Maintenance com child issues paralelas + checkpointing via `pipeline-status` document
- Research-Doc + Code-Analyzer rodando simultaneamente como child issues
- Handoff estruturado via document `pipeline-handoff` (campos: `pipeline_stage`, `upstream_findings`, `decisions_made`, `artifacts_produced`, `qa_gate_status`)
- QA-Loop com gate 80% computado via `pnpm test --coverage`, critério de parada por iterações (máx 3), escalada para Tech-Debt se não atingir
- Supabase-Executor com approval gate para access token (NUNCA via comentário de issue)
- Supabase-Diagnostician read-only pós-deploy (schema version, logs, conexões)
- Documentação before/after via `issue_documents` com keys `state-before-{stage}` / `state-after-{stage}`
- Página Notion de débito técnico com link no PR quando passRate < 80%

**Deveria ter — P2 (v1.3.x após validação):**
- Skill `supabase-mcp` reutilizável
- Loop QA com escalada automática por iterações
- Documento central `pipeline-status` para acompanhamento da equipe

**Anti-funcionalidades críticas a evitar:**
- Novos endpoints REST
- Polling ativo
- Novas migrations de schema
- Token Supabase hard-coded ou via comentário de issue
- Agentes "sempre ativos"

### Abordagem de Arquitetura

7 novos agentes adicionados ao org-chart existente sem tocar nos 18 agentes da v1.2:

| Agente | Dept | parallelismPolicy | reports_to |
|--------|------|-------------------|-----------|
| orchestrator-maintenance | Engineering | serial | executor (Head) |
| research-doc | Engineering | parallel | orchestrator-maintenance |
| code-analyzer | Engineering | parallel | orchestrator-maintenance |
| qa-loop | Quality | serial_gate | verifier (Head) |
| supabase-executor | Engineering | serial | orchestrator-maintenance |
| supabase-diagnostician | Quality | parallel | verifier (Head) |
| doc-before-after | Analytics | parallel | user-profiler (Head) |

**Estado persistido (JSONB, sem migration):**

- `issues.executionState.handoff` — handoff estruturado entre agentes
- `issues.executionState.researchFindings` — findings agregados pelo orquestrador
- `issues.executionPolicy.qaResult` — resultado do QA com `passRate`, `approved`, `notionDebtUrl`
- `issue_documents` — documentos por etapa do pipeline

### Fique Atento a (Top 5 Pitfalls)

1. **QA loop infinito sem critério de parada** — sem contador de iterações, consome budget indefinidamente. Prevenção: contador no `pipeline-handoff`; após N=3 sem atingir 80%, registrar débito Notion e encerrar com `PARTIAL_SUCCESS`.

2. **Supabase access token via comentário de issue** — token de Management API persiste no histórico para sempre, exposto a futuros agentes. Prevenção: entregar via `company_secrets` ou `SUPABASE_ACCESS_TOKEN` env var; proibir solicitação via issue explicitamente nas instruções.

3. **Orquestrador SPOF sem checkpointing** — quota mid-pipeline deixa estado irrecuperável. Prevenção: state document via `issue_documents` atualizado após cada etapa; retomada lendo o documento após swap de conta.

4. **Executores paralelos sobrescrevendo mudanças** — sem distributed lock de arquivo. Prevenção: orquestrador distribui escopos de arquivo disjuntos; arquivos centrais sempre em série com `blocks` relation.

5. **Gate 80% subjetivo** — sem mapeamento a comando concreto, agente avalia subjetivamente. Prevenção: instrução referencia `pnpm test --coverage`, campo `Lines: ≥ 80%`, output do coverage report como artefato obrigatório.

---

## Implicações para o Roadmap

**6 fases sugeridas** (Fases 3 e 4 paralelizáveis):

| Fase | Nome | Dependência | Risco |
|------|------|-------------|-------|
| 17 | Fundação dos Agentes | nenhuma | LOW |
| 18 | Protocolo de Handoff e Orquestrador | Fase 17 | MEDIUM |
| 19 | Pesquisadores Paralelos e QA | Fase 18 | HIGH |
| 20 | Agentes Supabase | Fase 18 | HIGH |
| 21 | Integração Notion e Gate | Fases 19-20 | MEDIUM |
| 22 | Smoke e Validação End-to-End | Fases 19-21 | MEDIUM |

**Flags de pesquisa adicional:**
- Fase 20: mecânica exata de `company_secrets` para injeção de `SUPABASE_ACCESS_TOKEN`
- Fase 21: namespace correto do MCP Notion (`mcp__claude_ai_Notion__*` vs `mcp__notion__*`)

---

## Lacunas de Confiança

| Área | Confiança | Nota |
|------|-----------|------|
| Primitivas Paperclip (issue tree, documents, continuation) | HIGH | Código lido diretamente |
| 7 novos agentes via mapping.ts | HIGH | Mecanismo v1.2 lido diretamente |
| Handoff via executionState JSONB | HIGH | Schema verificado em issues.ts |
| Supabase MCP tools disponíveis | MEDIUM | Disponibilidade confirmada; comportamento exato não testado |
| Notion MCP para débitos | HIGH | Padrão lido de publicar.md + setup-notion.md |
| company_secrets para access token | MEDIUM | Mencionado mas secrets.ts não lido em detalhe |

---

*Pesquisa concluída: 2026-04-28*
*Pronto para roadmap: sim*
