# Fase 10: Mensagens dos Agentes ao Usuário - Contexto

**Coletado:** 2026-04-27
**Status:** Pronto para planejamento
**Modo:** Decisões autônomas; padrões Fases 7-9 reusados

<domain>
## Limite da Fase

Traduzir a camada de comunicação dos agentes para o usuário — texto que é CÓDIGO NOSSO (não output do modelo):

- **AGENT-MSG-01** Status messages dos agentes ("em execução", "swap de conta", "aguardando aprovação", "step concluído") em painéis de agente e logs
- **AGENT-MSG-02** Summaries e relatórios gerados pelo paperclip e apresentados em UI (sumários de step, relatório de execução)
- **AGENT-MSG-03** Prompts UI dos painéis de agente (botões, headers, labels, abas)
- **AGENT-MSG-04** Notificações e toasts de eventos de agente (sucesso, falha, swap, aprovação requerida)

**Fora desta fase:**
- System prompts dos agentes (texto enviado ao modelo) → Fase 11
- Output do modelo (resposta do Claude/Codex/etc.) → Fase 11 (system prompt instrui idioma de resposta)

</domain>

<decisions>
## Decisões de Implementação

### Escopo das superfícies "agent messages"
- **Painéis de agente:** procurar `ui/src/pages/AgentDetail.tsx` (já parcialmente tocado em 09-04 para confirms), painéis de step, AgentRun overview, status badges, action buttons
- **Activity log de agente:** chaves específicas de eventos de agente (já parcialmente cobertas em Fase 8 activity.json — `agent.*`, `claude-account-rotated`, etc.). Estender se faltar cobertura.
- **Toasts/notificações de eventos:** já parcialmente em common.json (Fase 9-04); estender com `toast.agent.*` (success/failure/swap/approval-required)
- **Summaries:** procurar `ui/src/components/agents/` ou similar — componentes que renderizam summaries de step/run

### Granularidade de plano
- **3 planos** (consolidação para reduzir overhead):
  - 10-01: Painéis de agente + status (AGENT-MSG-01 + AGENT-MSG-03)
  - 10-02: Summaries / relatórios (AGENT-MSG-02)
  - 10-03: Notificações e toasts de eventos (AGENT-MSG-04) + activity log gaps de eventos de agente
- **Wave 1:** 10-01 e 10-02 paralelos (file sets disjuntos esperados); **Wave 2:** 10-03 (depende de toasts/activity já estabelecidos)

### Namespaces afetados
- `agents.json` — populado totalmente (currently `{}` ou bootstrap apenas)
- `activity.json` — extensions para gaps de eventos de agente
- `common.json` — extension toast.agent.* sub-tree (preservando Phases 7-9 keys)

### Padrões reusados
- Manual grep + edição inline (continua); detector missing-keys.test.ts em CI
- useTranslation(["agents", "common"]) em painéis
- ROLE_KEY/STATUS_KEY style enum→key lookup quando aplicável (status badges de agente)
- translateApiError para erros vindos de operações de agente

### Discrição do Claude
- Mapeamento de eventos de agente ↔ chaves
- Granularidade dos sub-namespaces dentro de agents.json
- Decisão de extrair sub-componentes vs traduzir inline

</decisions>

<code_context>
## Insights do Código Existente

### Já tocado em fases anteriores
- `ui/src/pages/AgentDetail.tsx` — Fase 9-04 adicionou useTranslation para 6 confirms; trabalho complementar em 10-01
- `ui/src/lib/activity-format.ts` — Fase 8-05 estabeleceu actionKey + paramsJson contract; eventos de agente já cobertos parcialmente
- common.json toast.* sub-tree — Fase 9-04 adicionou genéricos; estender com agent-specific

### Pontos a investigar (research)
- Componentes em `ui/src/components/agents/` ou similar para painéis
- Componentes que renderizam step summaries / run reports
- Lista canônica de eventos de agente que disparam toast (procurar `pushToast` em código que orquestra agentes)

</code_context>

<specifics>
## Ideias Específicas

- **Mensagens são código nosso, não output do modelo.** Não confundir com Phase 11 (system prompts).
- AgentDetail.tsx já tem useTranslation parcialmente (Fase 9-04); evolução, não scaffold.

</specifics>

<deferred>
## Ideias Adiadas

- Tradução de output do modelo (text gerado pelo Claude/Codex) → Phase 11 system prompts.
- Tradução de mensagens internas server-side (logs operadores em inglês) → out of scope.

</deferred>
