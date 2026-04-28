# Requisitos: DDD — Paperclip da Equipe (Milestone v1.3)

**Definidos:** 2026-04-28
**Valor Central:** Equipe inteira opera sobre estado compartilhado (Supabase remoto) e agentes nunca param por exhaustão de token — basta trocar conta e continuar.
**Foco do Milestone:** Redesenhar a hierarquia da in100tiva para suportar um pipeline de manutenção paralela real — pesquisa simultânea (doc/repo + código) → orquestrador distribui execução → QA em loop com gate 80% → 2 agentes Supabase especializados (deploy + diagnóstico) → débitos técnicos documentados no Notion com link no PR — com handoff de contexto obrigatório entre todos os agentes.

## Requisitos v1.3

### Fundação dos Agentes (AGENT)

- [x] **AGENT-01**: Desenvolvedor pode registrar os 7 novos agentes em `mapping.ts` com `parallelismPolicy` e `department` corretos
- [x] **AGENT-02**: `validateMapping()` é atualizado de 18→25 agentes e 14→21 specialists (sem lançar erro de invariante)
- [x] **AGENT-03**: `pnpm sync-agents` idempotente registra os 7 novos agentes na in100tiva com hierarquia correta
- [x] **AGENT-04**: Cada novo agente tem `reports_to` apontando para o Head correto (executor / verifier / user-profiler)

### Protocolo de Handoff (HAND)

- [x] **HAND-01**: Schema canônico `pipeline-handoff` definido com campos: `pipeline_stage`, `upstream_findings`, `decisions_made`, `artifacts_produced`, `qa_gate_status`
- [x] **HAND-02**: Todo agente emite handoff estruturado ao terminar tarefa antes de passar para o próximo agente
- [x] **HAND-03**: Handoffs persistidos via `issue_documents` com key `pipeline-handoff` (não via comentários de thread)
- [x] **HAND-04**: Documento `pipeline-status` mantido pelo orquestrador com progresso corrente do pipeline

### Orquestrador (ORCH)

- [x] **ORCH-01**: Orchestrator-Maintenance cria child issues paralelas para Research-Doc e Code-Analyzer
- [x] **ORCH-02**: Orquestrador acorda automaticamente via evento `issue_children_completed` quando pesquisadores terminam
- [x] **ORCH-03**: Orquestrador distribui correções com escopos de arquivo disjuntos para agentes de execução (previne colisão)
- [x] **ORCH-04**: Orquestrador implementa TTL para child issues de pesquisa (previne travamento se pesquisador travar)
- [x] **ORCH-05**: Estado do pipeline checkpointado após cada etapa (recuperável após swap de conta Claude)

### Pipeline Paralelo e QA (PIPE)

- [x] **PIPE-01**: Research-Doc busca documentação oficial e repos GitHub em modo estritamente read-only
- [x] **PIPE-02**: Code-Analyzer analisa código para encontrar falhas em modo estritamente read-only
- [x] **PIPE-03**: Research-Doc e Code-Analyzer executam simultaneamente como child issues com `parallelismPolicy: parallel`
- [x] **PIPE-04**: QA-Loop executa `pnpm test --coverage` e mede `Lines ≥ 80%` como critério do gate
- [x] **PIPE-05**: QA-Loop tem critério de parada explícito (máx 3 iterações sem atingir gate)
- [x] **PIPE-06**: Após máx iterações sem gate, QA-Loop encerra com `PARTIAL_SUCCESS` e aciona Tech-Debt-Documenter
- [x] **PIPE-07**: Doc-Before-After documenta estado antes e depois de cada etapa via `issue_documents`

### Agentes Supabase (SUPA)

- [x] **SUPA-01**: Supabase-Executor realiza deploys via `mcp__supabase__apply_migration` e tools equivalentes
- [x] **SUPA-02**: Supabase-Executor usa CLI Supabase (`functions deploy`, etc.) quando MCP não cobre a operação
- [x] **SUPA-03**: Supabase-Executor solicita access token via `company_secrets` / env var — NUNCA via comentário de issue
- [x] **SUPA-04**: Supabase-Executor aguarda confirmação humana (`checkpoint:human-action`) antes de executar deploy
- [x] **SUPA-05**: Supabase-Diagnostician verifica schema version e logs pós-deploy em modo read-only
- [x] **SUPA-06**: Supabase-Diagnostician detecta versões erradas em produção e reporta ao orquestrador
- [x] **SUPA-07**: Skill `supabase-mcp` compartilhada e reutilizável entre Supabase-Executor e Supabase-Diagnostician

### Notion e Gate de Produção (NOTI)

- [x] **NOTI-01**: Página Notion de débito técnico criada automaticamente quando `passRate < 80%`
- [x] **NOTI-02**: Página contém campos obrigatórios: data, pipeline, impacto atual, critério de resolução, estimativa, arquivos afetados
- [x] **NOTI-03**: URL da página Notion incluída no corpo do PR correspondente
- [x] **NOTI-04**: `notion-config.json` atualizado com chave `tech_debt` apontando para o database de débitos

## Requisitos v2 (Diferidos)

### Pipeline Aprimorado

- **PIPE-08**: Escalada automática para humano após N iterações sem atingir gate 80% (gatilho: primeiro loop infinito observado)
- **PIPE-09**: Documento central `pipeline-status` com UI de acompanhamento (gatilho: equipe reportar dificuldade)
- **PIPE-10**: Distribuição dinâmica por tipo de correção no orquestrador (gatilho: após 5+ execuções acumuladas)

### Automação

- **AUTO-01**: Trigger do pipeline via GitHub Actions (webhook em PR)
- **AUTO-02**: Roteamento dinâmico baseado em histórico de sucesso por tipo de issue

## Fora do Escopo

| Funcionalidade | Motivo |
|----------------|--------|
| Novos endpoints REST no servidor | Todo pipeline usa primitivas existentes (issue_documents, parent_id, events) — sem código de servidor novo |
| Novas migrations de schema | executionState/executionPolicy JSONB livres já existem; campos novos são chaves JSON por convenção |
| Polling ativo entre agentes | Mecanismo `issue_children_completed` já implementado; polling desnecessário e caro |
| Token Supabase hard-coded em qualquer artefato | Risco de segurança máximo; token de Management API tem escopo destrutivo total |
| Agentes "sempre ativos" ou com intervalSec curto | Supabase-Diagnostician on-demand apenas; rate limit ~600 req/min pela Management API |
| Wiring de infra para MCP Supabase/Notion | MCPs já operacionais na sessão Claude Code; apenas declaração no frontmatter dos agentes |

## Rastreabilidade

| Requisito | Fase | Status |
|-----------|------|--------|
| AGENT-01 | Phase 17 | Complete |
| AGENT-02 | Phase 17 | Complete |
| AGENT-03 | Phase 17 | Complete |
| AGENT-04 | Phase 17 | Complete |
| HAND-01 | Phase 18 | Complete |
| HAND-02 | Phase 18 | Complete |
| HAND-03 | Phase 18 | Complete |
| HAND-04 | Phase 18 | Complete |
| ORCH-01 | Phase 18 | Complete |
| ORCH-02 | Phase 18 | Complete |
| ORCH-03 | Phase 18 | Complete |
| ORCH-04 | Phase 18 | Complete |
| ORCH-05 | Phase 18 | Complete |
| PIPE-01 | Phase 19 | Complete |
| PIPE-02 | Phase 19 | Complete |
| PIPE-03 | Phase 19 | Complete |
| PIPE-04 | Phase 19 | Complete |
| PIPE-05 | Phase 19 | Complete |
| PIPE-06 | Phase 19 | Complete |
| PIPE-07 | Phase 19 | Complete |
| SUPA-01 | Phase 20 | Complete |
| SUPA-02 | Phase 20 | Complete |
| SUPA-03 | Phase 20 | Complete |
| SUPA-04 | Phase 20 | Complete |
| SUPA-05 | Phase 20 | Complete |
| SUPA-06 | Phase 20 | Complete |
| SUPA-07 | Phase 20 | Complete |
| NOTI-01 | Phase 21 | Complete |
| NOTI-02 | Phase 21 | Complete |
| NOTI-03 | Phase 21 | Complete |
| NOTI-04 | Phase 21 | Complete |

**Cobertura:**
- Requisitos v1.3: 31 total
- Mapeados para fases: 31 ✓
- Implementados: 31 ✓ (Fases 17-22 concluídas)
- Validação E2E: pendente HUMAN-UAT-22-01..05 (smoke do pipeline com paperclip + Supabase + Notion)

---
*Requisitos definidos: 2026-04-28*
*Última atualização: 2026-04-28 — Fases 17-22 concluídas; smoke E2E aguardando execução humana via 22-HUMAN-UAT.md*
