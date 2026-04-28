# Roadmap: DDD — Paperclip da Equipe

## Milestones

- ✅ **v1.0 Fork + Multi-Account** — Fases 1-6 (entregue 2026-04-26, 45/45 requisitos, arquivado em `.planning/milestones/v1.0-*`)
- ✅ **v1.1 Internacionalização pt-BR** — Fases 7-11 (entregue 2026-04-27, 26/26 requisitos, arquivado em `.planning/milestones/v1.1-*`)
- ✅ **v1.2 in100tiva como Software House** — Fases 12-16 (entregue 2026-04-27, 17/17 requisitos, arquivado em `.planning/milestones/v1.2-*`)
- 🚧 **v1.3 Workflow de Manutenção Paralela** — Fases 17-22 (em andamento, 31 requisitos)

## Visão Geral

Redesenhar a hierarquia da in100tiva para suportar um pipeline de manutenção real com paralelismo — 7 novos agentes especializados (orchestrator-maintenance, research-doc, code-analyzer, qa-loop, supabase-executor, supabase-diagnostician, doc-before-after) coordenando pesquisa simultânea (doc/repo + análise de código), orquestrador distribuindo execução com escopos disjuntos, QA em loop até gate 80%, 2 agentes Supabase especializados para deploy e diagnóstico, e débitos técnicos documentados no Notion com link no PR — com handoff de contexto estruturado obrigatório entre todos os agentes.

## Fases

**Numeração de Fases:**
- Fases inteiras (17, 18, ...): Trabalho planejado do milestone v1.3 (continua de v1.2 que terminou em fase 16)
- Fases decimais (17.1, 17.2): Inserções urgentes (marcadas com INSERIDA)

- [ ] **Phase 17: Fundação dos Agentes** - Registra os 7 novos agentes em `mapping.ts` com `parallelismPolicy` e `department` corretos, atualiza invariantes 18→25 e sincroniza na in100tiva via `pnpm sync-agents`
- [ ] **Phase 18: Protocolo de Handoff e Orquestrador** - Define o schema canônico `pipeline-handoff`, implementa o Orchestrator-Maintenance com criação de child issues paralelas, checkpointing por etapa e TTL para pesquisadores travados
- [ ] **Phase 19: Pesquisadores Paralelos e QA** - Cria Research-Doc (read-only docs/repos), Code-Analyzer (read-only análise de falhas), QA-Loop (gate 80% via `pnpm test --coverage`, máx 3 iterações) e Doc-Before-After (estado antes/depois por etapa)
- [ ] **Phase 20: Agentes Supabase** - Cria Supabase-Executor (deploys via MCP + CLI, approval gate para access token) e Supabase-Diagnostician (diagnóstico read-only pós-deploy), com skill `supabase-mcp` compartilhada
- [ ] **Phase 21: Integração Notion e Gate de Produção** - Configura `notion-config.json` com database de débitos, cria página automática de débito técnico quando `passRate < 80%` com campos obrigatórios e link no PR
- [ ] **Phase 22: Smoke e Validação End-to-End** - Executa o pipeline completo com uma issue real, valida paralelismo Research-Doc/Code-Analyzer, loop QA, gate 80%, handoffs estruturados e rastreabilidade Notion

## Detalhes das Fases

### Phase 17: Fundação dos Agentes
**Goal**: Os 7 novos agentes existem na in100tiva com hierarquia correta, políticas de paralelismo adequadas e invariantes do mapping atualizadas — base sobre a qual as fases seguintes definem comportamentos.
**Depends on**: Nada (primeira fase do milestone v1.3; continua a numeração de v1.2)
**Requirements**: AGENT-01, AGENT-02, AGENT-03, AGENT-04
**Success Criteria** (o que deve ser VERDADEIRO):
  1. Desenvolvedor abre `scripts/sync-agents/mapping.ts` e encontra 7 novas entradas (orchestrator-maintenance, research-doc, code-analyzer, qa-loop, supabase-executor, supabase-diagnostician, doc-before-after) com `parallelismPolicy` e `department` corretos conforme tabela de arquitetura
  2. `validateMapping()` executa sem lançar erro de invariante com o novo total de 25 agentes e 21 specialists
  3. `pnpm sync-agents` termina exit 0 reportando 7 created (primeira execução) e 0 created / 7 unchanged (re-execução — idempotência)
  4. Query SQL confirma `reports_to` correto para cada novo agente: orchestrator-maintenance → executor Head; research-doc e code-analyzer → orchestrator-maintenance; qa-loop → verifier Head; supabase-executor → orchestrator-maintenance; supabase-diagnostician → verifier Head; doc-before-after → user-profiler Head
**Plans**: 3 plans
  - [x] 17-01-mapping-and-invariants-PLAN.md — Estende mapping.ts com 7 entradas v1.3 e atualiza validateMapping para invariantes 25/4/21
  - [x] 17-02-agent-md-files-PLAN.md — Cria 7 arquivos .md mínimos em .claude/agents/ (frontmatter + corpo curto)
  - [x] 17-03-sync-and-verify-PLAN.md — Executa pnpm sync-agents idempotente e verifica reports_to via SQL

### Phase 18: Protocolo de Handoff e Orquestrador
**Goal**: Todo agente do pipeline emite handoff estruturado ao terminar uma etapa, e o Orchestrator-Maintenance coordena pesquisa paralela com checkpointing e proteção contra travamento — pipeline recuperável após swap de conta Claude.
**Depends on**: Phase 17
**Requirements**: HAND-01, HAND-02, HAND-03, HAND-04, ORCH-01, ORCH-02, ORCH-03, ORCH-04, ORCH-05
**Success Criteria** (o que deve ser VERDADEIRO):
  1. Desenvolvedor consulta `issue_documents` de qualquer issue processada pelo pipeline e encontra documento com key `pipeline-handoff` contendo os campos canônicos: `pipeline_stage`, `upstream_findings`, `decisions_made`, `artifacts_produced`, `qa_gate_status`
  2. Orchestrator-Maintenance cria exatamente 2 child issues com `parallelismPolicy: parallel` (Research-Doc e Code-Analyzer) ao iniciar uma tarefa de manutenção
  3. Após Research-Doc e Code-Analyzer completarem, orquestrador acorda automaticamente via evento `issue_children_completed` sem polling manual
  4. Orquestrador distribui correções com escopos de arquivo disjuntos para agentes de execução, prevenindo colisão de edição simultânea
  5. Documento `pipeline-status` em `issue_documents` é atualizado após cada etapa do pipeline e persiste o estado mesmo após interrupção e swap de conta Claude
**Plans**: TBD

### Phase 19: Pesquisadores Paralelos e QA
**Goal**: Research-Doc e Code-Analyzer executam simultaneamente como child issues read-only, QA-Loop mede cobertura com critério de parada explícito e aciona documentação de débito quando o gate não é atingido — sem loops infinitos, sem subjetividade no gate.
**Depends on**: Phase 18
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, PIPE-07
**Success Criteria** (o que deve ser VERDADEIRO):
  1. Research-Doc e Code-Analyzer aparecem como child issues ativas simultaneamente (parallelismPolicy: parallel) e nenhum dos dois faz escrita em arquivos do repositório
  2. QA-Loop executa `pnpm test --coverage` e extrai o campo `Lines: X%` do relatório como único critério objetivo do gate — nenhuma avaliação subjetiva
  3. Se cobertura ≥ 80%, QA-Loop encerra com `APPROVED` no campo `qa_gate_status` do handoff; se < 80%, retorna tarefa para correção
  4. Após 3 iterações sem atingir 80%, QA-Loop encerra com `PARTIAL_SUCCESS` e passa execução para Doc-Before-After (não entra em loop infinito)
  5. Doc-Before-After persiste documentos `state-before-{stage}` e `state-after-{stage}` em `issue_documents` para cada etapa do pipeline onde houve modificação
**Plans**: TBD

### Phase 20: Agentes Supabase
**Goal**: Supabase-Executor realiza deploys de forma auditável com aprovação humana obrigatória antes de qualquer operação destrutiva, e Supabase-Diagnostician verifica o estado pós-deploy em modo estritamente read-only — access token nunca exposto via comentário de issue.
**Depends on**: Phase 18
**Requirements**: SUPA-01, SUPA-02, SUPA-03, SUPA-04, SUPA-05, SUPA-06, SUPA-07
**Success Criteria** (o que deve ser VERDADEIRO):
  1. Supabase-Executor usa `mcp__supabase__apply_migration` (e ferramentas equivalentes) para deploys, caindo para CLI Supabase (`functions deploy`, etc.) apenas quando MCP não cobre a operação
  2. Access token é obtido via `company_secrets` ou variável de ambiente `SUPABASE_ACCESS_TOKEN` — as instruções do agente proíbem explicitamente solicitar token via comentário de issue
  3. Desenvolvedor observa checkpoint `checkpoint:human-action` antes de qualquer deploy: orquestrador para e aguarda confirmação humana explícita antes de continuar
  4. Supabase-Diagnostician, após deploy, verifica schema version atual e lê logs pós-deploy sem escrever nada no banco
  5. Quando Supabase-Diagnostician detecta versão errada em produção, reporta ao orquestrador com dados concretos (versão esperada vs encontrada)
  6. Skill `supabase-mcp` está declarada no frontmatter YAML de ambos Supabase-Executor e Supabase-Diagnostician (reutilização via adapter_config.desiredSkillKeys)
**Plans**: TBD

### Phase 21: Integração Notion e Gate de Produção
**Goal**: Quando o pipeline encerra com passRate < 80%, uma página Notion de débito técnico é criada automaticamente com campos padronizados e o URL da página aparece no corpo do PR correspondente — nenhum débito tolerado sem documentação rastreável.
**Depends on**: Phases 19, 20
**Requirements**: NOTI-01, NOTI-02, NOTI-03, NOTI-04
**Success Criteria** (o que deve ser VERDADEIRO):
  1. `notion-config.json` contém a chave `tech_debt` apontando para o database ID correto de débitos técnicos no Notion
  2. Quando o pipeline encerra com `PARTIAL_SUCCESS` (passRate < 80%), uma página Notion é criada automaticamente no database configurado — sem intervenção manual
  3. A página Notion criada contém os campos obrigatórios: data, nome do pipeline, impacto atual, critério de resolução, estimativa de esforço e lista de arquivos afetados
  4. O corpo do PR gerado ao final do pipeline inclui o URL da página Notion correspondente quando há débito técnico documentado
**Plans**: TBD

### Phase 22: Smoke e Validação End-to-End
**Goal**: O pipeline completo executa de ponta a ponta com uma issue real — paralelismo funcionando, handoffs estruturados em cada etapa, QA-Loop operacional, agentes Supabase com gate de aprovação, e rastreabilidade Notion — validando que todos os componentes das fases 17-21 se integram corretamente.
**Depends on**: Phases 19, 20, 21
**Requirements**: (cobertura integrada — todos os 31 requisitos v1.3 já mapeados nas fases 17-21; esta fase é de validação end-to-end)
**Success Criteria** (o que deve ser VERDADEIRO):
  1. Desenvolvedor dispara o pipeline via Orchestrator-Maintenance com uma issue real e observa Research-Doc + Code-Analyzer executando simultaneamente como child issues
  2. Orquestrador acorda após `issue_children_completed`, distribui correções com escopos de arquivo disjuntos e o pipeline progride sem intervenção manual
  3. QA-Loop executa `pnpm test --coverage` ao final das correções, exibe passRate objetivo e encerra dentro de ≤ 3 iterações (gate atingido ou `PARTIAL_SUCCESS`)
  4. Cada transição entre agentes gera documento `pipeline-handoff` em `issue_documents` com os 5 campos canônicos preenchidos
  5. Se passRate < 80%, página Notion de débito técnico está criada e o URL aparece no PR; se ≥ 80%, PR é criado sem link Notion
**Plans**: TBD

## Progresso

**Ordem de Execução:**
Fases 17 e 18 executam em sequência. Fases 19 e 20 são paralelizáveis (ambas dependem de 18, não uma da outra). Fase 21 aguarda 19 e 20. Fase 22 aguarda 19, 20 e 21.

| Fase | Milestone | Planos Completos | Status | Concluída |
|------|-----------|------------------|--------|-----------|
| 17. Fundação dos Agentes | v1.3 | 3/3 | Complete   | 2026-04-28 |
| 18. Protocolo de Handoff e Orquestrador | v1.3 | 0/? | Not started | - |
| 19. Pesquisadores Paralelos e QA | v1.3 | 0/? | Not started | - |
| 20. Agentes Supabase | v1.3 | 0/? | Not started | - |
| 21. Integração Notion e Gate de Produção | v1.3 | 0/? | Not started | - |
| 22. Smoke e Validação End-to-End | v1.3 | 0/? | Not started | - |

## Histórico

<details>
<summary>✅ v1.2 in100tiva como Software House (Fases 12-16) — ENTREGUE 2026-04-27</summary>

18 agentes do framework `.claude/agents/*.md` + 3 skills importados para a in100tiva como software house real — 4 Heads (planner/executor/verifier/user-profiler) + 14 specialists em 4 departamentos. Mapping canônico TS-typed em `scripts/sync-agents/mapping.ts` com `validateMapping()` runtime-checked. `ParallelismBadge` componente novo wired no AgentDetail header. `AGENTS-IMPORT.md` operacional. 5 fases, 17 requisitos, DB live verificado: 18 agentes criados com hierarquia correta. Detalhes em `.planning/milestones/v1.2-*`.

</details>

<details>
<summary>✅ v1.1 Internacionalização pt-BR (Fases 7-11) — ENTREGUE 2026-04-27</summary>

Tradução completa do paperclip para pt-BR — toggle de idioma persistido por usuário, UI inteira (~1700 chaves), mensagens de agentes (tRef pattern para evitar reconexão WS) e system prompts dos modelos LLM (directive injection + 4 SKILL.pt-BR.md variants). 5 fases, 19 planos. 16 UATs empíricos rastreados em `*-HUMAN-UAT.md`. Detalhes em `.planning/milestones/v1.1-ROADMAP.md`.

</details>

<details>
<summary>✅ v1.0 Fork + Multi-Account (Fases 1-6) — ENTREGUE 2026-04-26</summary>

Fork hard do paperclip + Supabase compartilhado + multi-account Claude Code com swap automático em exhaustão de tokens. 6 fases, 32 planos. Detalhes em `.planning/milestones/v1.0-ROADMAP.md`.

</details>
