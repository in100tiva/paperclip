# Pesquisa de Funcionalidades

**Domínio:** Pipeline de manutenção paralela com agentes de IA sobre plataforma Paperclip existente (v1.3 milestone)
**Pesquisado:** 2026-04-28
**Confiança:** HIGH (análise direta do codebase + padrões inferidos de orquestração multi-agente)

---

## Contexto: O Que Já Existe (Não Reconstruir)

Este milestone adiciona funcionalidades ao topo de uma plataforma completa. As seguintes capacidades já estão operacionais:

- **Heartbeat engine**: agentes fazem wakeup em issues, `checkout` via `/api/issues/:id/checkout`, skill injection via `desiredSkillKeys`
- **Paralelismo base**: `parallelismPolicy` (`serial` / `parallel` / `serial_gate`) em `agents.metadata`
- **Dependências de issues**: `blockedByIssueIds` com wake automático `issue_blockers_resolved` e `issue_children_completed`
- **Continuation summary**: `IssueContinuationSummary` (8 seções markdown, max 8.000 chars) — atualizado após cada run
- **Issue documents**: `PUT /api/issues/:id/documents/:key` — persistência de documentos nomeados por issue
- **Supabase MCP**: disponível para agentes via tool calls (mencionado em PROJECT.md)
- **Notion MCP**: disponível para agentes via tool calls (mencionado em PROJECT.md)
- **Hierarquia de agentes**: CEO → 4 Heads → 14 specialists, `reports_to`, `chainOfCommand` via API
- **Pool multi-account Claude Code**: rotação automática em quota exhaustion, attribution por `(companyId, accountId)`
- **Board approval gateway**: `POST /api/companies/:id/approvals` — `request_board_approval` para gates humanos
- **Routines + triggers**: `routines`, `routineTriggers` (cron/webhook/api) já no schema

---

## Panorama de Funcionalidades

### Requisitos Básicos (Usuários Esperam Estes)

Funcionalidades cuja ausência torna o pipeline de manutenção paralela incompleto ou inseguro.

| Funcionalidade | Por Que É Esperada | Complexidade | Notas |
|----------------|--------------------|--------------|-------|
| **Orquestrador central com issues filho** | Todo pipeline de manutenção precisa de um ponto de coordenação que distribui trabalho, coleta resultados e avança o fluxo | MEDIUM | O mecanismo de wake `issue_children_completed` já dispara quando todos os filhos terminam. O novo é o _agente_ orquestrador com system prompt que sabe criar issues filho, aguardar o wake e ler os `pipeline-handoff` documents antes de avançar. Reutiliza `POST /api/companies/:id/issues` com `parentId` e `assigneeAgentId` |
| **2 agentes de pesquisa paralela (Research-Doc + Code-Analyzer)** | Manutenção eficaz exige dois inputs simultâneos: o que a documentação/repo oficial diz e o que o código atual faz. Corrigir sem ambos produz patches cegos | MEDIUM | Novos agentes `.claude/agents/` + entradas no `AGENT_MAPPING`. `parallelismPolicy: 'parallel'` já habilitado. Orquestrador cria 2 issues filho simultâneos e aguarda `issue_children_completed`. Complexidade real: system prompts com escopo limitado (doc vs código) e regras para emitir handoff estruturado |
| **Handoff de contexto estruturado entre agentes** | Sem handoff explícito, cada agente recomeça do zero ou lê a thread inteira desperdiçando budget. Em pipelines de 6+ agentes isso é inaceitável | MEDIUM | Novo `issue document` com key `pipeline-handoff` via `PUT /api/issues/:id/documents/pipeline-handoff`. Complementa o `IssueContinuationSummary` existente (que captura estado por-issue) com dados inter-agente: `pipeline_stage`, `upstream_findings`, `decisions_made`, `artifacts_produced`, `next_agent_expectations`, `qa_gate_status` |
| **Agentes de QA em loop (criar → executar → detectar falhas → devolver)** | QA manual é o gargalo em manutenção. Agentes de QA em loop automatizam o ciclo de validação | HIGH | A plataforma tem `serial_gate` que força aprovação antes de avançar. O loop usa: QA cria/executa testes; se falhar, reatribui o issue ao executor via comment-driven wake com lista de falhas; se passar no gate, move para `in_review`. Desafio: protocolo de "devolução" sem criar loop infinito — contador de iterações no `pipeline-handoff` document |
| **Gate de 80% de prontidão para produção** | Sem critério numérico, o pipeline nunca fecha ou fecha cedo demais. 80% é um contrato explícito entre QA e liberação | MEDIUM | Lógica no system prompt do agente QA: conta `passing_count / total_count` a partir do output do test runner (ex: `pnpm test --reporter=json`). Se ≥ 80% → `gate_status: PASSED`, move issue para `in_review`. Se < 80% → `gate_status: FAILED`, lista os testes que falharam, reassigna ao executor. O threshold 80% deve ser configurável via `agents.metadata` ou `routine.variables` |
| **Supabase-Executor: deploys via MCP + CLI + solicitação de access token** | Deploys no Supabase requerem autenticação de usuário humano (access token, não service role key). O agente precisa saber quando pedir e como executar após receber | HIGH | Novo agente com system prompt que conhece: (a) comandos Supabase CLI via Bash (migrations, functions, edge deployments), (b) Supabase MCP tools para operações de schema/dados com service role key, (c) `request_board_approval` para solicitar access token ao board antes de executar operações que precisam dele. Access token via approval gate — nunca hard-coded |
| **Supabase-Diagnostician: monitora logs e verifica versões via MCP** | Após deploy, alguém precisa confirmar que a versão correta foi aplicada e que não há erros nos logs. Sem diagnóstico pós-deploy, o pipeline termina sem evidência de sucesso | MEDIUM | Novo agente focado em _leitura_: usa Supabase MCP para inspecionar logs de Edge Functions, verificar schema version contra migration esperada (`SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`), consultar `pg_stat_activity`. Output é relatório estruturado no `pipeline-handoff` |
| **Documentação de estado antes/depois em cada etapa** | Rastreabilidade é obrigatória em manutenção. Sem estado before/after, não há como auditar o que mudou ou depurar regressões | MEDIUM | Padrão: cada agente cria `issue document` com key `state-before-{stage}` antes de executar e `state-after-{stage}` após. O orquestrador inclui links nos comentários. Complexidade está em definir o _formato_ do snapshot por etapa: schema, migrations, funções, configurações afetadas |
| **Integração Notion: débito técnico com link no PR** | Débitos tolerados pelo gate 80% ficam registrados em local que o time já usa para documentação. Link no PR cria rastreabilidade cruzada git ↔ Notion | MEDIUM | Agente de documentação usa Notion MCP para criar página na database de débito técnico. O link da página Notion é incluído na descrição do PR. Notion MCP deve ter access token configurado via `company_secrets` |

### Diferenciais (Vantagem Competitiva)

Funcionalidades que tornam o pipeline qualitativamente melhor, não apenas funcionalmente correto.

| Funcionalidade | Proposta de Valor | Complexidade | Notas |
|----------------|-------------------|--------------|-------|
| **Skill Supabase-MCP para agentes especializados** | Encapsula conhecimento de uso do Supabase MCP em skill reutilizável. Permite que outros agentes futuros executem operações Supabase sem replicar instruções no system prompt | MEDIUM | Nova entrada em `SKILL_MAPPING` com slug `supabase-mcp`. Arquivo `.claude/skills/supabase-mcp/SKILL.md` documenta: ferramentas MCP disponíveis, padrões de autenticação, casos de uso por operação (migrate vs deploy vs log-read). `desiredSkillKeys: ['supabase-mcp']` nos dois agentes Supabase. Análogo à skill `paperclip` existente |
| **Orquestrador com distribuição baseada em tipo de correção** | O orquestrador não distribui trabalho uniformemente — lê os findings de pesquisa e decide qual executor recebe qual correção (ex: correções de schema → Supabase-Executor; correções de lógica → executor genérico) | HIGH | Requer que o system prompt do orquestrador contenha lógica de roteamento explícita. Lê `pipeline-handoff` dos pesquisadores, categoriza findings por tipo, cria issues filho com `assigneeAgentId` correto por categoria. Diferencia o pipeline de uma simples distribuição round-robin |
| **Loop QA com limite de iterações e escalada automática** | Sem limite, o loop QA pode ser infinito se o executor nunca corrige suficientemente. Limite + escalada ao manager quebra o ciclo graciosamente | MEDIUM | Contador de iterações no documento `pipeline-handoff`. Agente QA incrementa a cada loop. Ao atingir limite configurável (ex: 3 iterações), escala via `chainOfCommand` — cria issue para Head of Quality ou CEO com relatório completo, suspende o pipeline principal via `blockedByIssueIds` até decisão humana |
| **Documento central `pipeline-status` com visibilidade de progresso** | Com 6+ agentes em cadeia, é difícil saber em qual etapa o pipeline está. Documento de status central dá visibilidade ao orquestrador e ao usuário | LOW | Documento `pipeline-status` no issue pai do orquestrador. Atualizado por cada agente ao iniciar e concluir sua etapa. Formato simples: tabela markdown com etapa, agente, status, timestamp. Reutiliza `PUT /api/issues/:id/documents/pipeline-status` |
| **Routine trigger para execução periódica do pipeline** | Permite que o pipeline de manutenção rode em horário agendado (ex: toda segunda-feira às 09:00) sem intervenção manual | LOW | Usa `routineTriggers` com `kind: 'schedule'` e `cronExpression` — já existente no schema. O orquestrador é atribuído como `assigneeAgentId` da rotina. Zero código novo; configuração de dados |

### Anti-Funcionalidades (Comumente Pedidas, Frequentemente Problemáticas)

| Funcionalidade | Por Que É Pedida | Por Que É Problemática | Alternativa |
|----------------|------------------|------------------------|-------------|
| **Novos endpoints REST no servidor Paperclip para o pipeline** | Parece mais "oficial" criar uma API de pipeline dedicada | Adicionar endpoints ao servidor introduz risco de regressão em funcionalidades existentes, exige nova migration de schema, e o modelo de issues+documents já provê toda primitiva necessária. Cada novo endpoint é superfície de manutenção adicional | Usar `issue documents` com keys convencionados (`pipeline-handoff`, `pipeline-status`, `state-before-{stage}`, `state-after-{stage}`) — toda a persistência via API existente |
| **Polling ativo do orquestrador por status dos filhos** | Parece que o orquestrador precisa "checar" os filhos periodicamente | Polling consome budget de conta Claude, pode criar race conditions, e a plataforma já tem wake events nativos adequados | Usar `issue_children_completed` e `issue_blockers_resolved` — o orquestrador apenas aguarda ser acordado quando os filhos terminam |
| **Novas tabelas ou migrations de schema para estado do pipeline** | Estado de pipeline parece precisar de persistência especializada | Cria necessidade de nova migration (bloqueada por CI-gate existente), fragmenta estado entre sistemas, e duplica o que `issues` + `documents` já fazem. Schema atual é de 71 migrations; adicionar tabelas sem necessidade gera overhead de manutenção | Todo estado do pipeline vive em `issue documents` com keys estruturados. Zero migrations novas |
| **Agentes "sempre ativos" monitorando continuamente o Supabase** | Diagnóstico contínuo parece mais robusto | Agentes sempre ativos consomem budget constantemente, criam problemas de concorrência com outros pipelines, e o heartbeat model da plataforma foi projetado para execução discreta | Supabase-Diagnostician é invocado pontualmente pelo orquestrador após cada deploy, não roda continuamente |
| **Comunicação direta agente→agente fora do Paperclip** | Parece mais rápido agentes conversarem diretamente via sidecar API | Bypassar o Paperclip quebra rastreabilidade, audit trail e o controle de budget. A plataforma não tem suporte para comunicação peer-to-peer e o sistema de heartbeat seria contornado | Todo handoff via issue comments + documents. O Paperclip orquestra wakes via `blockedByIssueIds` e `issue_children_completed` |
| **Integração com GitHub Actions para triggering automático em merge** | Parece natural disparar o pipeline em cada merge para main | Adiciona complexidade de autenticação de webhook, HMAC signing, e introduz dependência externa. O escopo é o workflow interno da in100tiva com acionamento controlado | Usar `routineTriggers` com `kind: 'api'` para trigger manual ou `kind: 'schedule'` para periodicidade — ambos já existem no schema |
| **Access token Supabase hard-coded em env ou secrets** | É mais simples que pedir ao board toda vez | O access token de usuário tem escopo amplo e não deve estar persistido em secrets de longa duração. O modelo correto é solicitação just-in-time via board approval com auditoria de para que foi usado e quando | `request_board_approval` com payload descrevendo exatamente as operações que serão executadas. Token é injetado apenas no run que o solicitou |

---

## Dependências de Funcionalidades

```
[Orquestrador Central]
    ├──cria──> [Issue filho: Research-Doc]   ─┐ parallelismPolicy: parallel
    ├──cria──> [Issue filho: Code-Analyzer]  ─┘
    │              └──ambos concluem──> wake: issue_children_completed
    │                                       │
    │              ┌────────────────────────┘
    ├──lê──> [pipeline-handoff dos 2 pesquisadores]
    ├──cria──> [Issues de Execução com assigneeAgentId por tipo]
    │              └──concluem──> wake: issue_children_completed
    │                                       │
    ├──cria──> [Issue QA em Loop]  ←─────────┘
    │              ├──≥80%──> gate_status: PASSED ──> move para in_review
    │              └──<80%──> reassigna executor ──> loop (contador iterações)
    │                  └──iterações esgotadas──> escala via chainOfCommand
    │
    ├──gate PASSED──> [Supabase-Executor]
    │                    ├──sem access token──> request_board_approval
    │                    └──com access token──> supabase CLI + MCP
    │                           └──concluído──> wake
    ├──cria──> [Supabase-Diagnostician]
    │              └──relatório──> pipeline-handoff
    └──cria──> [Tech-Debt-Documenter]
                   └──débitos (gate <100%)──> Notion MCP ──> página + link no PR

[pipeline-handoff document]
    └──requer──> [API: PUT /api/issues/:id/documents/pipeline-handoff]  ← já existe
    └──depende de──> [IssueContinuationSummary existente] para contexto base

[Skill Supabase-MCP]
    └──melhora──> [Supabase-Executor]
    └──melhora──> [Supabase-Diagnostician]
    └──análogo a──> [Skill paperclip existente]

[Gate 80%]
    └──requer──> [Agentes QA em Loop] para computar a taxa
    └──alimenta──> [Tech-Debt-Documenter] (o que ficou abaixo do threshold)
    └──conflita com──> [Deploy imediato sem QA] (anti-feature)

[Approval Gate para Access Token Supabase]
    └──requer──> [request_board_approval] ← já existe na plataforma
    └──requer──> [Supabase-Executor] para receber o token e executar
```

### Notas de Dependência

- **Orquestrador requer pesquisadores completos**: não pode distribuir execução sem ler os `pipeline-handoff` dos dois pesquisadores. Research-Doc e Code-Analyzer devem ser implementados e registrados antes do orquestrador ser testado end-to-end.
- **Gate 80% requer agentes QA funcionais**: o número sozinho é inútil sem os agentes que executam testes e computam a taxa via test runner. QA agents vêm antes do gate na ordem de implementação.
- **Supabase-Diagnostician complementa Supabase-Executor**: os dois são independentes mas o diagnóstico pós-deploy fecha o loop de evidência. Podem ser implementados em paralelo mas o Diagnostician dá sentido ao Executor.
- **Notion requer gate 80% definido**: o agente de documentação só sabe o que registrar como débito depois que o gate classificou o que ficou abaixo do threshold.
- **Skill Supabase-MCP conflita com system prompts duplicados**: se os dois agentes Supabase embarcarem o conhecimento de MCP nos system prompts sem extrair para skill, haverá dois lugares para atualizar quando o Supabase MCP API mudar.
- **`AGENT_MAPPING` tem invariante estrita de 18 agentes**: o `validateMapping()` verifica `AGENT_MAPPING.length !== 18` e lança erro. Adicionar 7 novos agentes requer atualizar a invariante para o novo total.

---

## Definição de MVP

### Lançar Com (v1.3 — Milestone atual)

O produto mínimo para que o pipeline de manutenção paralela seja real e não simulado.

- [ ] **Orquestrador central** — sem ele não há pipeline, apenas agentes isolados. Base de tudo.
- [ ] **Research-Doc + Code-Analyzer em paralelo** — a pesquisa paralela é o diferencial arquitetural central do milestone. Os dois devem ser implementados juntos para validar o padrão de `issue_children_completed`.
- [ ] **Handoff estruturado via `pipeline-handoff` document** — sem handoff explícito, cada agente recomeça do zero ou lê a thread inteira. Define o protocolo de comunicação entre todos os agentes.
- [ ] **Agentes QA em loop com gate 80%** — QA em loop é o mecanismo de qualidade. Sem ele o pipeline termina sem garantia de prontidão.
- [ ] **Supabase-Executor com approval gate para access token** — deploys sem autenticação controlada são inseguros; marcado como CRÍTICO no PROJECT.md.
- [ ] **Supabase-Diagnostician** — evidência pós-deploy fecha o ciclo. Sem diagnóstico, o pipeline termina cego sobre o que foi efetivamente aplicado.
- [ ] **Notion: registro de débito técnico** — gate 80% implica que até 20% vai para débito; sem documentação Notion o gate perde significado prático.
- [ ] **Documentação before/after por etapa** — rastreabilidade mínima para auditar o que o pipeline fez.

### Adicionar Após Validação (v1.3.x)

- [ ] **Skill Supabase-MCP** — quando segundo agente precisar de Supabase; gatilho: terceiro agente candidato.
- [ ] **Distribuição por tipo de correção pelo orquestrador** — quando o pipeline tiver acumulado dados de 5+ execuções para informar as regras de roteamento.
- [ ] **Documento central `pipeline-status`** — quando equipe reportar dificuldade em acompanhar pipelines em andamento.
- [ ] **Loop QA com escalada automática por iterações** — quando primeiro loop infinito for observado; gatilho: incidente real.

### Consideração Futura (v2+)

- [ ] **Trigger automático via GitHub Actions webhook** — após 10+ execuções manuais do pipeline sem incidentes; requer webhook signing e validação de estabilidade.
- [ ] **Roteamento dinâmico baseado em histórico de execuções** — após acumulação de dados suficientes para treinar regras; não é antecipação, é observação.

---

## Matriz de Priorização de Funcionalidades

| Funcionalidade | Valor para o Usuário | Custo de Implementação | Prioridade |
|----------------|----------------------|------------------------|------------|
| Orquestrador central | HIGH | MEDIUM | P1 |
| Research-Doc agente | HIGH | LOW | P1 |
| Code-Analyzer agente | HIGH | LOW | P1 |
| `pipeline-handoff` document (handoff estruturado) | HIGH | LOW | P1 |
| Agentes QA em loop | HIGH | HIGH | P1 |
| Gate 80% de prontidão | HIGH | MEDIUM | P1 |
| Supabase-Executor (MCP + CLI + approval gate) | HIGH | HIGH | P1 |
| Supabase-Diagnostician (MCP read-only) | HIGH | MEDIUM | P1 |
| Notion: débito técnico com link no PR | MEDIUM | MEDIUM | P1 |
| Documentação before/after por etapa | MEDIUM | LOW | P1 |
| Skill Supabase-MCP reutilizável | MEDIUM | LOW | P2 |
| Distribuição por tipo de correção | MEDIUM | HIGH | P2 |
| Documento `pipeline-status` central | LOW | LOW | P2 |
| Loop QA com escalada automática | MEDIUM | MEDIUM | P2 |
| Routine trigger agendado | LOW | LOW | P2 |
| Trigger via GitHub Actions | LOW | HIGH | P3 |

**Chave de prioridade:**
- P1: Obrigatório para o milestone v1.3 ser declarado completo
- P2: Deve ter, adicionar em v1.3.x após validação do pipeline base
- P3: Consideração futura v2+

---

## Análise Competitiva de Abordagens de Pipeline

| Aspecto | Abordagem Sequential (um agente faz tudo) | Abordagem Paralela (este milestone) |
|---------|-------------------------------------------|--------------------------------------|
| Velocidade de pesquisa | Lenta: doc research + code analysis em sequência | Rápida: Research-Doc e Code-Analyzer simultâneos |
| Continuidade de contexto | Alta: um agente mantém tudo na janela | Média: requer handoff explícito, mas escalável |
| Uso de pool multi-account | Subutilizado: uma conta por vez | Maximizado: dois agentes simultâneos usam contas diferentes |
| Especialização | Baixa: um agente genérico | Alta: cada agente focado em seu domínio |
| Budget Claude Code | Menor: um agente, mas mais lento | Maior: paralelismo custa mais, mas entrega mais rápido |
| Rastreabilidade | Implícita: tudo num transcript | Explícita: `pipeline-handoff` por etapa |

A abordagem paralela é escolhida porque maximiza o pool multi-account já construído no v1.0 e separa responsabilidades em agentes especializados — o que é coerente com a arquitetura de org-chart do Paperclip.

---

## Detalhamento: Handoff Estruturado de Contexto

O `IssueContinuationSummary` existente captura estado por-issue após cada run. Para o pipeline, precisamos de handoff _inter-agente_ — o que um agente descobriu que o próximo precisa saber.

### Formato Proposto para `pipeline-handoff` document

```markdown
# Pipeline Handoff

## Pipeline Stage
- **Current stage:** research-parallel | execution | qa-loop | deploy | diagnostics | documentation
- **Emitted by:** {agent_name} ({agent_id})
- **Emitted at:** {ISO timestamp}
- **Target stage:** {next stage name}
- **Target agent:** {agent_name} ({agent_id}) | broadcast

## Upstream Findings
{Resumo estruturado do que foi descoberto na etapa atual.
Para research: lista de findings com fonte (URL ou arquivo).
Para QA: lista de testes passando/falhando com nomes.
Para deploy: resultado exato do comando executado, versão aplicada.}

## Decisions Made
{Decisões tomadas nesta etapa que afetam etapas seguintes.
Ex: "Migração 0075 aplicada; versão atual no Supabase confirmada como 0075".
Ex: "3/5 testes passando; gate 80% NÃO ATINGIDO; itens abaixo do gate listados abaixo."}

## Artifacts Produced
{Lista de artefatos: arquivos modificados, documents criados, issues criados, páginas Notion.
Com links internos Paperclip quando disponíveis.}

## Blockers for Next Stage
{O que pode impedir o próximo agente de começar.
Ex: "Access token Supabase pendente de aprovação board (#approval-id)".
Ex: "Nenhum bloqueador identificado."}

## Next Stage Expectations
{Instruções explícitas para o próximo agente, não sugestões.
Ex: "Aplicar os findings de Code-Analyzer juntamente com os de Research-Doc antes de executar correções."}

## QA Gate Status
- **Tests passing:** {N}/{total}
- **Passing rate:** {%}
- **Gate threshold:** 80%
- **Gate status:** PASSED | FAILED | N/A (etapas pré-QA)
- **Loop iteration:** {N} of {max_iterations}
- **Items below threshold:** {lista de testes/critérios que falharam, se gate FAILED}
```

### Por Que Document e Não Comment

Os comentários acumulam no thread e consomem contexto de heartbeat ao ler a thread completa. Documentos são consultados incrementalmente via `GET /api/issues/:id/documents/pipeline-handoff`. A plataforma já tem `heartbeat-context` que retorna `ancestor summaries` — o handoff document integra nesse fluxo. Documentos têm revisão versionada (`baseRevisionId`) — cada agente faz `PUT` com o `baseRevisionId` atual, criando histórico de mutações ao longo do pipeline sem apagar informação anterior.

---

## Detalhamento: Gate de Produção 80%

O gate não é um número arbitrário — é um contrato explícito que define o que é "suficientemente bom para produção" versus o que vai para débito documentado.

### O Que o Gate 80% Exige

1. **Definição de "total"**: a coleção de testes/critérios que o agente QA executa. Deve ser determinística (os mesmos testes a cada iteração do loop). Definida no início do pipeline pelo orquestrador no documento `pipeline-status`.

2. **Computação objetiva da taxa**: `passing_count / total_count`. O agente QA executa o test runner, lê o output estruturado (ex: `pnpm test --reporter=json`), extrai os números. Não é subjetivo — é baseado em output de ferramenta.

3. **Decisão de bifurcação**:
   - Taxa ≥ 80% → atualiza `pipeline-handoff` com `gate_status: PASSED`, move issue para `in_review`, acorda o orquestrador
   - Taxa < 80% → atualiza `pipeline-handoff` com `gate_status: FAILED` + lista dos testes que falharam, reatribui issue ao executor via comment com instrução explícita

4. **Débito técnico tolerado**: items que passam no gate mas não estão 100% corretos (ex: TODOs não resolvidos identificados pelo Code-Analyzer mas sem testes cobrindo-os). Esses são documentados no Notion — não são falhas do gate, são observações de qualidade.

5. **O que o gate 80% não é**: não é avaliação subjetiva do LLM ("parece bom o suficiente"), não é passagem automática se o executor rodou sem erros (o executor pode ter rodado sem erros mas introduzido regressões), não é heurística baseada em confiança do agente sobre a qualidade do código.

---

## Detalhamento: Supabase-Executor e Supabase-Diagnostician

### O Que o Supabase-Executor Precisa Fazer

1. **Receber handoff do orquestrador** com: lista de migrations para aplicar, funções Edge para deploy, configurações a atualizar

2. **Verificar autenticação disponível**:
   - Service role key (em `company_secrets`): suficiente para operações de schema via Supabase MCP e queries SQL diretas
   - Access token de usuário: necessário para `supabase functions deploy` via CLI. Verificar se env var está disponível no run. Se não → criar `request_board_approval` com payload explicando operações que precisam do token

3. **Executar operações em sequência segura**:
   - Migrations: via Supabase MCP `apply_migration` ou `supabase db push` via Bash
   - Edge Functions: via `supabase functions deploy {nome}` via Bash (requer access token)
   - Configurações: via Supabase MCP ou SQL direto com service role

4. **Protocolo de rollback**: se deploy falhar parcialmente, registrar no `pipeline-handoff` o estado atual (o que foi aplicado, o que não foi) e marcar issue como `blocked` com bloqueador explícito e ação necessária

### O Que o Supabase-Diagnostician Precisa Fazer

1. **Verificar versão de schema**: comparar a migration mais recente no Supabase com a migration esperada do `pipeline-handoff` via `SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`

2. **Inspecionar logs de Edge Functions** (se aplicável): via Supabase MCP ler logs recentes para as funções deployadas. Sinalizar errors/warnings.

3. **Checar conexões ativas**: via SQL `SELECT count(*) FROM pg_stat_activity WHERE state = 'active'`. Alertar se acima de threshold para workload de dev (threshold configurável, ex: > 10).

4. **Gerar relatório estruturado**: documento no issue com versão confirmada, status de cada Edge Function inspecionada, contagem de conexões, erros encontrados, conclusão explícita (HEALTHY / DEGRADED / FAILED)

5. **Emitir no `pipeline-handoff`**: seu relatório vai no campo `upstream_findings` para o agente de documentação e para o orquestrador

---

## Detalhamento: Registro de Agentes no `AGENT_MAPPING`

| Agente | Departamento sugerido | `parallelismPolicy` | Skills |
|--------|----------------------|---------------------|--------|
| **Maintenance-Orchestrator** | engineering (sob executor) | `serial` | `paperclip` |
| **Research-Doc** | architecture (sob planner ou orchestrator) | `parallel` | `paperclip` |
| **Code-Analyzer** | architecture (sob planner ou orchestrator) | `parallel` | `paperclip` |
| **Supabase-Executor** | engineering (sob executor) | `serial` | `paperclip`, `supabase-mcp` |
| **Supabase-Diagnostician** | engineering (sob executor) | `parallel` | `paperclip`, `supabase-mcp` |
| **QA-Maintenance** | quality (sob verifier) | `serial_gate` | `paperclip` |
| **Tech-Debt-Documenter** | analytics (sob user-profiler) | `parallel` | `paperclip` |

**Nota crítica sobre `validateMapping()`**: o `AGENT_MAPPING` atual tem invariante `length === 18` verificada em runtime. Adicionar 7 agentes novos requer atualizar o assertion para o novo total (25) e garantir que cada novo agente tem `managerSlug` resolvível dentro do mapping expandido.

---

## Fontes

- Análise direta: `scripts/sync-agents/mapping.ts`, `scripts/sync-agents/types.ts`, `scripts/sync-agents/sync.ts`
- Análise direta: `server/src/services/issue-continuation-summary.ts` — estrutura atual de handoff por issue (8 seções, 8.000 chars)
- Análise direta: `packages/db/src/schema/routines.ts` — schema de rotinas e triggers existentes
- Análise direta: `.claude/skills/paperclip/SKILL.md` — protocolo de heartbeat completo, API endpoints, mecanismos de wake
- Análise direta: `.claude/agents/executor.md` e `.claude/agents/verifier.md` — padrões de execução e verificação já implantados
- `.planning/PROJECT.md` — escopo do milestone v1.3, funcionalidades alvo confirmadas
- `.planning/MILESTONES.md` — histórico de capacidades entregues v1.0, v1.1, v1.2

---
*Pesquisa de funcionalidades para: Pipeline de Manutenção Paralela (v1.3 Paperclip in100tiva)*
*Pesquisado: 2026-04-28*
