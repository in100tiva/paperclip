# Phase 10: Mensagens dos Agentes ao Usuário — Research

**Researched:** 2026-04-27
**Domain:** UI translation of code-emitted agent communication (panels, status, summaries, event toasts)
**Confidence:** HIGH

## Summary

Fase 10 cobre **texto que é código nosso** — labels, headers, status, toasts e summaries renderizados pelo paperclip — em telas de agente. NÃO cobre output do modelo (Fase 11).

Estado atual:
- `pt-BR/agents.json` e `en-US/agents.json` estão **vazios (`{}`)** — namespace já registrado em `ui/src/i18n/resources.ts:1-48`, pronto para popular.
- `pt-BR/activity.json` já cobre os 8 eventos canônicos de agente (Fase 8-05): `agent.created/updated/paused/resumed/terminated/key-created/budget-updated/runtime-session-reset`. Verificado via leitura direta. Eventos de heartbeat também presentes (`heartbeat.invoked/cancelled`). `claude-account-rotated` presente como key de top-level.
- `pt-BR/common.json` toast.* sub-tree (Fase 9-04) cobre genéricos (`saved`, `save-failed`, `member-*`, `environment-*`, `unknown-error`) — **não cobre eventos específicos de agente** (run started/failed/timed-out/cancelled, agent errored).
- `AgentDetail.tsx` (4248 LOC) tem `useTranslation(["common"])` em 2 callsites (linhas 622, 3037) — apenas para um confirm dialog de session reset. **Resto inteiramente em inglês.** Estimativa: ~280 strings hardcoded.
- Toast builders centralizados em `ui/src/context/LiveUpdatesProvider.tsx:430-607` (`buildActivityToast`, `buildJoinRequestToast`, `buildAgentStatusToast`, `buildRunStatusToast`) — todos com strings inline em inglês via template literals com interpolação `${actor}`/`${name}`.

**Distribuição estimada de strings (heurística regex `"[A-Z][a-z][a-zA-Z ]{3,30}"`):**

| Plano | Superfície | Arquivos primários | LOC | Strings est. |
|-------|------------|---------------------|-----|--------------|
| 10-01 | Painéis + status + prompts UI (AGENT-MSG-01 + AGENT-MSG-03) | `AgentDetail.tsx`, `Agents.tsx`, `NewAgent.tsx`, `AgentConfigForm.tsx`, `AgentProperties.tsx`, `AgentActionButtons.tsx`, `NewAgentDialog.tsx`, `agent-config-primitives.tsx`, `StatusBadge.tsx` (1-line surface), `ActiveAgentsPanel.tsx` | ~7900 | ~280 |
| 10-02 | Summaries / run reports (AGENT-MSG-02) | `transcript/RunTranscriptView.tsx`, `RunChatSurface.tsx`, `LiveRunWidget.tsx`, `IssueRunLedger.tsx` (run summary section linhas 416-708) | ~2500 | ~70 |
| 10-03 | Toasts/notificações + activity log gaps (AGENT-MSG-04) | `LiveUpdatesProvider.tsx` (toast builders 430-607), `AgentDetail.tsx` (1 toast linha 1606), `IssueRunLedger.tsx` (1 toast linha 391), `activity.json` extensions, `common.json` extensions | ~cross | ~50 |

**Primary recommendation:**
- **Wave 1 paralelo:** 10-01 (painéis + status + prompts) + 10-02 (summaries) — file sets disjuntos exceto pelo namespace `agents`. Cada plano edita sub-trees distintos do mesmo JSON (`agents:detail.*` vs `agents:transcript.*`).
- **Wave 2 sequencial:** 10-03 (toasts/notifs) — depende de keys do namespace `agents` introduzidas em Wave 1; toca `LiveUpdatesProvider` cross-cutting + extensões de `activity.json` e `common.json` (sub-tree `toast.agent.*`/`toast.run.*`).
- **Sem migration de schema.** Esta fase é puramente client-side (i18n + edits de componente). Server activity log emit (Fase 8-05) já cobre todos os eventos de agente listados em `activity-format.ts:24-63`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGENT-MSG-01 | Status messages dos agentes ("em execução", "swap de conta", "aguardando aprovação", "step concluído") em pt-BR | Plano 10-01: `StatusBadge.tsx:12` renderiza `status.replace(/_/g, " ")` raw → criar `AGENT_STATUS_KEY: Record<AgentStatus, "agents:status.{kebab}">` lookup (pattern Fase 8-03 `STATUS_KEY` em ClaudeAccounts.tsx:42-47) cobrindo os 7 valores de `AGENT_STATUSES` em `packages/shared/src/constants.ts:16-25` (`active`, `paused`, `idle`, `running`, `error`, `pending_approval`, `terminated`). `AgentDetail.tsx:947-952` usa `<StatusBadge status={agent.status}>` — após refactor StatusBadge passa a aceitar `t` ou refatorar para aceitar prop `label` traduzida. Ações em painel (`AgentDetail.tsx:932-1003`): "Assign Task", "Run Heartbeat" (label override em RunButton:944), "Pause"/"Resume" (AgentActionButtons.tsx:40,48), "Live" badge (962), "Copy Agent ID", "Reset Sessions", "Delete agent" (982-1003). `AGENT_ROLE_LABELS` em `packages/shared/src/constants.ts:55-67` (CEO/CTO/CMO/CFO/Engineer/Designer/PM/QA/DevOps/Researcher/General) — hardcoded como abreviações já são internacionais (CEO/CTO ≡ pt-BR), mas "Engineer/Designer/PM/QA/DevOps/Researcher/General" precisam de `t("agents:role.{kebab}")` lookup paralelo. Decisão: manter constants inglês para server logs/exports + criar `ROLE_KEY` lookup cliente (mesmo pattern STATUS_KEY). |
| AGENT-MSG-02 | Summaries e relatórios apresentados em pt-BR | Plano 10-02: `RunTranscriptView.tsx:287,292,298,300,515,651,709-712,789,820-822,1033,1038,1045,1473,1487` — labels do transcript renderer: "Executing command"/"Executed command", "Tool failed"/"Waiting for result", "Completed"/"Failed"/"Run failed", "User", "Running"/"Errored"/"Completed", "Input"/"Result", `emptyMessage = "No transcript yet."`, aria-labels (`Collapse/Expand tool details`, `Collapse/Expand command details`, `Collapse/Expand stdout`). `IssueRunLedger.tsx:444,449-450,458,466-470,484-487` — "Run ledger", "Waiting for the first run record."/"No runs linked yet.", "Latest run", "Child work", "X active, Y done, Z cancelled"/"all N terminal", "+N more". `RunChatSurface.tsx:63` — "Waiting for run output..."/"No run output captured." (passados como `emptyMessage` para IssueChatThread). `LiveRunWidget.tsx:95-99,133,140` — "Live Runs", "Uses the shared chat-style run surface from issue activity.", "Stop"/"Stopping…", "Open run". |
| AGENT-MSG-03 | Prompts UI dos painéis de agente (botões, headers, labels, abas) | Plano 10-01 (consolidado com MSG-01): `AgentDetail.tsx` breadcrumbs (linhas 861-887): "Agents", "Runs", `Run ${urlRunId.slice(0,8)}`, "Instructions", "Configuration", "Runs", "Budget", "Dashboard". Tabs do `PageTabBar` em AgentDetail (procurar via grep do plano). Form labels em `AgentConfigForm.tsx` (1510 LOC, ~31 strings). `agent-config-primitives.tsx:22-60` — **`help` dictionary com 32 chaves de hint text para tooltips de form** (name/title/role/reportsTo/capabilities/adapterType/cwd/promptTemplate/...) — todas em inglês, todas precisam tradução. `NewAgentDialog.tsx:118,140-144,149-150,158,170,172-174,193` — "Add a new agent", "We recommend letting your CEO handle agent setup...", "Ask the CEO to create a new agent", "I want advanced configuration myself", "Back", "Choose your adapter type for advanced setup.", "Recommended". `AgentActionButtons.tsx:7,40,47` — `label = "Run now"` default, "Resume", "Pause". `Agents.tsx` (408 LOC): linha 112 `setBreadcrumbs([{ label: "Agents" }])`, linhas 133-135 filter options ("Active"/"Paused"/"Error"), linha 212 `action="New Agent"`. `NewAgent.tsx` (335 LOC, ~5 strings — pequeno, principalmente delega ao AgentConfigForm). `ActiveAgentsPanel.tsx:41,47` defaults `title = "Agents"`, `emptyMessage = "No recent agent runs."`, linha 158 "Live now"/"Finished {time}"/"Started {time}", linha 110 "X more active/recent run(s)". |
| AGENT-MSG-04 | Notificações e toasts de eventos de agente em pt-BR | Plano 10-03: **lista canônica de eventos** em `LiveUpdatesProvider.tsx:406-408`: `ISSUE_TOAST_ACTIONS = {issue.created, issue.updated, issue.comment_added}` + `AGENT_TOAST_STATUSES = {error}` + `RUN_TOAST_STATUSES = {failed, timed_out, cancelled}`. Builders: `buildActivityToast` (430-517) emite títulos "X created REF"/"X updated REF"/"X commented on REF" com fallback "reopened from {state}"; `buildJoinRequestToast` (519-540) emite "Agent wants to join"/"Someone wants to join" + body "A new join request is waiting for approval." + action "View inbox"; `buildAgentStatusToast` (542-570) emite `${name} started` ou `${name} errored`; `buildRunStatusToast` (572-607) emite `${name} run succeeded/failed/timed out/cancelled` + body "Trigger: {detail}". Action labels nos toasts: "View REF", "View agent", "View run", "View inbox" (inglês inline). Plano 10-03 reescreve cada builder para retornar `t("common:toast.agent.run-failed", { name, error })` etc. + adiciona `useTranslation` no `LiveUpdatesProvider` (handler é função pura — passar `t` via closure no `LiveUpdatesProvider` component). **Activity log gaps:** `pt-BR/activity.json` cobre todos os 8 eventos de agente via Fase 8-05 (`agent.{created,updated,paused,resumed,terminated,key-created,budget-updated,runtime-session-reset}` e `heartbeat.{invoked,cancelled}` e top-level `claude-account-rotated`). **Sem gaps detectados.** Verificado: server emite `actionKey: "claude-account-rotated"` em `claude-accounts.ts:422`. Outros toasts isolados a traduzir: `AgentDetail.tsx:1606` `pushToast({ title: "Save failed", body: message, tone: "error" })`, `IssueRunLedger.tsx:391` `pushToast({ title: "Watchdog decision not recorded", body: message, tone: "error" })`. |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Escopo das superfícies "agent messages":**
- **Painéis de agente:** procurar `ui/src/pages/AgentDetail.tsx` (já parcialmente tocado em 09-04 para confirms), painéis de step, AgentRun overview, status badges, action buttons.
- **Activity log de agente:** chaves específicas de eventos de agente (já parcialmente cobertas em Fase 8 activity.json — `agent.*`, `claude-account-rotated`, etc.). Estender se faltar cobertura.
- **Toasts/notificações de eventos:** já parcialmente em common.json (Fase 9-04); estender com `toast.agent.*` (success/failure/swap/approval-required).
- **Summaries:** procurar `ui/src/components/agents/` ou similar — componentes que renderizam summaries de step/run.

**Granularidade de plano:**
- **3 planos** (consolidação para reduzir overhead):
  - 10-01: Painéis de agente + status (AGENT-MSG-01 + AGENT-MSG-03)
  - 10-02: Summaries / relatórios (AGENT-MSG-02)
  - 10-03: Notificações e toasts de eventos (AGENT-MSG-04) + activity log gaps de eventos de agente
- **Wave 1:** 10-01 e 10-02 paralelos (file sets disjuntos esperados); **Wave 2:** 10-03 (depende de toasts/activity já estabelecidos).

**Namespaces afetados:**
- `agents.json` — populado totalmente (currently `{}` ou bootstrap apenas).
- `activity.json` — extensions para gaps de eventos de agente.
- `common.json` — extension `toast.agent.*` sub-tree (preservando Phases 7-9 keys).

**Padrões reusados:**
- Manual grep + edição inline (continua); detector missing-keys.test.ts em CI.
- `useTranslation(["agents", "common"])` em painéis.
- ROLE_KEY/STATUS_KEY style enum→key lookup quando aplicável (status badges de agente).
- `translateApiError` para erros vindos de operações de agente.

### Claude's Discretion

- Mapeamento de eventos de agente ↔ chaves
- Granularidade dos sub-namespaces dentro de `agents.json`
- Decisão de extrair sub-componentes vs traduzir inline

### Deferred Ideas (OUT OF SCOPE)

- Tradução de output do modelo (text gerado pelo Claude/Codex) → Phase 11 system prompts.
- Tradução de mensagens internas server-side (logs operadores em inglês) → out of scope.
</user_constraints>

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` ausente no diretório de trabalho. Constraints aplicáveis derivam exclusivamente do CONTEXT.md acima e dos padrões consolidados no repositório (Fases 7-9):

- TypeScript strict; vitest 3.0.5
- Detector i18n `ui/src/i18n/__tests__/missing-keys.test.ts` é bloqueante em CI (`process.env.CI`)
- `commit_docs: true` em `.planning/config.json` — RESEARCH.md deve ter commit no git
- `nyquist_validation: true` — seção Validation Architecture obrigatória
- Sem `db:migrate` local; nesta fase **sem schema changes** mesmo
- Convenção de keys: kebab-case dot-notation com namespace explícito (`agents:detail.tabs.dashboard`); detector regex em `missing-keys.test.ts:6` rejeita camelCase
- "Paperclip" é brand string; permanece literal mesmo em pt-BR

## Standard Stack

Sem novas dependências. Tudo herdado da Fase 7-9:

| Library | Version | Purpose |
|---------|---------|---------|
| `i18next` | 26.0.8 | Translation engine |
| `react-i18next` | 17.0.4 | React bindings (`useTranslation`, `Trans`) |
| `vitest` | 3.0.5 | Detector + RTL tests |

**Versões verificadas:** os pacotes já estão instalados desde Fase 7 (não há mudança de dependência nesta fase).

**Nenhuma instalação adicional necessária.**

## Architecture Patterns

### Pattern 1: STATUS_KEY enum→key lookup para AgentStatus

Reusa pattern canônico estabelecido em `ClaudeAccounts.tsx:42-47` (Fase 8-03). Aplicação em `AgentDetail.tsx` / `Agents.tsx` / `StatusBadge.tsx`:

```typescript
import type { AgentStatus } from "@paperclipai/shared";

const AGENT_STATUS_KEY: Record<AgentStatus, `agents:status.${string}`> = {
  active: "agents:status.active",
  paused: "agents:status.paused",
  idle: "agents:status.idle",
  running: "agents:status.running",
  error: "agents:status.error",
  pending_approval: "agents:status.pending-approval",
  terminated: "agents:status.terminated",
};
```

E o `StatusBadge.tsx` (15 LOC) recebe um pequeno refactor — passar `label` prop traduzido pelo consumidor:

```typescript
// antes
<StatusBadge status={agent.status} />
// depois
<StatusBadge status={agent.status} label={t(AGENT_STATUS_KEY[agent.status])} />
```

Decisão de granularidade: `StatusBadge` usado em **6+ contextos** (agentes, issues, runs, workspaces). Para preservar reusabilidade, mantemos a prop `status` para escolher cor/estilo via `statusBadge[status]` (de `lib/status-colors.ts:42`) e adicionamos prop opcional `label`. Se ausente, fallback ao comportamento atual (`status.replace(/_/g, " ")`).

### Pattern 2: ROLE_KEY enum→key lookup para AgentRole

Mesmo pattern aplicado a `AGENT_ROLES` em `packages/shared/src/constants.ts:40-67`. Constants do shared mantêm strings inglês (CEO/CTO/Engineer/etc.) — usado em logs, exports, OrgChart node labels server-side. UI client cria lookup paralelo:

```typescript
const AGENT_ROLE_KEY: Record<AgentRole, `agents:role.${string}`> = {
  ceo: "agents:role.ceo",
  cto: "agents:role.cto",
  cmo: "agents:role.cmo",
  cfo: "agents:role.cfo",
  engineer: "agents:role.engineer",
  designer: "agents:role.designer",
  pm: "agents:role.pm",
  qa: "agents:role.qa",
  devops: "agents:role.devops",
  researcher: "agents:role.researcher",
  general: "agents:role.general",
};
```

Note: para CEO/CTO/CMO/CFO/PM/QA/DevOps as traduções pt-BR continuam idênticas ao inglês (siglas internacionais); apenas Engineer/Designer/Researcher/General mudam ("Engenheiro/Designer/Pesquisador/Geral"). O lookup completo padroniza a invocação.

### Pattern 3: Toast builders puros que recebem `t`

`LiveUpdatesProvider.tsx:430-607` define 4 builders puros (`buildActivityToast`, `buildJoinRequestToast`, `buildAgentStatusToast`, `buildRunStatusToast`) chamados de dentro de `handleLiveEvent` (linha 778). Refactor:

```typescript
import type { TFunction } from "i18next";

function buildAgentStatusToast(
  payload: Record<string, unknown>,
  nameOf: (id: string) => string | null,
  queryClient: QueryClient,
  companyId: string,
  t: TFunction,                      // NEW
): ToastInput | null {
  // ...
  const title = status === "running"
    ? t("common:toast.agent.started", { name })
    : t("common:toast.agent.errored", { name });
  return {
    title,
    body: agent?.title ?? undefined,
    tone,
    action: { label: t("common:toast.agent.view"), href: `/agents/${agentId}` },
    dedupeKey: `agent-status:${agentId}:${status}`,
  };
}
```

E em `LiveUpdatesProvider` (component, linha 902): obter `t` via `useTranslation(["common", "activity"])` no escopo do component, passar como dependência do `useEffect` que monta o socket (linha 934-1018) e via closure ao `handleLiveEvent`. Cuidado: `handleLiveEvent` está sendo chamado pelo `socket.onmessage` callback — `t` deve ser capturado em `tRef = useRef(t); useEffect(() => { tRef.current = t; }, [t])` para evitar reabrir o socket a cada re-render.

### Pattern 4: agents.json sub-tree (proposed bootstrap)

Sub-namespaces sugeridos:

```json
{
  "title": "Agentes",
  "actions": {
    "new-agent": "Novo agente",
    "assign-task": "Atribuir tarefa",
    "run-heartbeat": "Executar heartbeat",
    "run-now": "Executar agora",
    "pause": "Pausar",
    "resume": "Retomar",
    "copy-agent-id": "Copiar ID do agente",
    "reset-sessions": "Reiniciar sessões",
    "delete-agent": "Excluir agente"
  },
  "status": {
    "active": "ativo",
    "paused": "pausado",
    "idle": "ocioso",
    "running": "em execução",
    "error": "erro",
    "pending-approval": "aguardando aprovação",
    "terminated": "terminado"
  },
  "role": {
    "ceo": "CEO",
    "cto": "CTO",
    "cmo": "CMO",
    "cfo": "CFO",
    "engineer": "Engenheiro",
    "designer": "Designer",
    "pm": "PM",
    "qa": "QA",
    "devops": "DevOps",
    "researcher": "Pesquisador",
    "general": "Geral"
  },
  "detail": {
    "tabs": {
      "dashboard": "Painel",
      "instructions": "Instruções",
      "configuration": "Configuração",
      "runs": "Execuções",
      "budget": "Orçamento"
    },
    "header": {
      "live-badge": "ao vivo",
      "fallback-name": "Agente"
    },
    "properties": {
      "status": "Status",
      "role": "Função",
      "title": "Cargo",
      "adapter": "Adaptador",
      "session": "Sessão",
      "last-error": "Último erro",
      "last-heartbeat": "Último heartbeat",
      "reports-to": "Reporta a",
      "created": "Criado em"
    },
    "empty": {
      "no-recent-issues": "Nenhuma tarefa recente.",
      "no-config-revisions": "Ainda não há revisões de configuração.",
      "no-runs": "Ainda não há execuções."
    }
  },
  "panel": {
    "active-agents": "Agentes",
    "no-recent-runs": "Nenhuma execução recente de agente.",
    "more-runs_one": "{{count}} execução ativa/recente a mais",
    "more-runs_other": "{{count}} execuções ativas/recentes a mais",
    "live-now": "Ao vivo agora",
    "finished-relative": "Finalizado {{time}}",
    "started-relative": "Iniciado {{time}}"
  },
  "transcript": {
    "user": "Usuário",
    "executing-command": "Executando comando",
    "executed-command": "Comando executado",
    "tool-failed": "Ferramenta falhou",
    "waiting-result": "Aguardando resultado",
    "waiting-result-ellipsis": "Aguardando resultado…",
    "completed": "Concluído",
    "running": "Em execução",
    "errored": "Com erro",
    "run-failed": "Execução falhou",
    "failed-with-exit": "Falhou com código de saída {{code}}",
    "failed": "Falhou",
    "input-label": "Entrada",
    "result-label": "Resultado",
    "empty": "Ainda sem transcrição.",
    "aria": {
      "collapse-tool": "Recolher detalhes da ferramenta",
      "expand-tool": "Expandir detalhes da ferramenta",
      "collapse-command": "Recolher detalhes do comando",
      "expand-command": "Expandir detalhes do comando",
      "collapse-stdout": "Recolher saída padrão",
      "expand-stdout": "Expandir saída padrão"
    }
  },
  "run-ledger": {
    "title": "Registro de execuções",
    "waiting-first-run": "Aguardando o primeiro registro de execução.",
    "no-runs-linked": "Ainda não há execuções vinculadas.",
    "latest-run": "Execução mais recente",
    "child-work": "Trabalho derivado",
    "child-summary-active": "{{active}} ativos, {{done}} concluídos, {{cancelled}} cancelados",
    "child-summary-terminal": "todos {{total}} terminais ({{done}} concluídos, {{cancelled}} cancelados)",
    "more-children_one": "+{{count}} a mais",
    "more-children_other": "+{{count}} a mais"
  },
  "live-runs": {
    "title": "Execuções ao vivo",
    "subtitle": "Usa a superfície de chat compartilhada da atividade da tarefa.",
    "stop": "Parar",
    "stopping": "Parando…",
    "open-run": "Abrir execução",
    "waiting-output": "Aguardando saída da execução…",
    "no-output": "Nenhuma saída de execução capturada."
  },
  "new-agent-dialog": {
    "header": "Adicionar novo agente",
    "ceo-recommendation": "Recomendamos deixar seu CEO cuidar da configuração de agentes — ele conhece a estrutura organizacional e pode configurar reportes, permissões e adaptadores.",
    "ask-ceo-cta": "Pedir ao CEO para criar um novo agente",
    "advanced-link": "Quero configuração avançada manualmente",
    "back": "Voltar",
    "advanced-prompt": "Escolha o tipo de adaptador para configuração avançada.",
    "recommended-tag": "Recomendado",
    "ceo-issue-title": "Criar um novo agente",
    "ceo-issue-description": "(digite que tipo de agente você quer aqui)"
  },
  "config": {
    "save": "Salvar alterações",
    "saving": "Salvando…",
    "saved": "Salvo",
    "save-failed": "Falha ao salvar",
    "help": {
      "name": "Nome de exibição deste agente.",
      "title": "Cargo mostrado no organograma.",
      "role": "Função organizacional. Determina posição e capacidades.",
      "reports-to": "O agente ao qual este se reporta na hierarquia organizacional.",
      "capabilities": "Descreve o que este agente pode fazer. Mostrado no organograma e usado para roteamento de tarefas.",
      "adapter-type": "Como este agente roda: CLI local (Claude/Codex/OpenCode), OpenClaw Gateway, processo spawn ou webhook HTTP genérico.",
      "prompt-template": "Enviado em todo heartbeat. Mantenha pequeno e dinâmico. Use para enquadramento da tarefa atual, não para instruções estáticas grandes. Suporta {{ '{{ agent.id }}' }}, {{ '{{ agent.name }}' }}, {{ '{{ agent.role }}' }} e outras variáveis de template.",
      "model": "Sobrescreve o modelo padrão usado pelo adaptador.",
      "thinking-effort": "Controla a profundidade de raciocínio do modelo. Valores suportados variam por adaptador/modelo.",
      "max-turns-per-run": "Máximo de turnos agênticos (chamadas de ferramenta) por execução de heartbeat.",
      "interval-sec": "Segundos entre invocações automáticas de heartbeat.",
      "timeout-sec": "Segundos máximos que uma execução pode levar antes de ser terminada. 0 significa sem timeout.",
      "grace-sec": "Segundos para esperar após enviar interrupt antes de matar o processo à força.",
      "wake-on-demand": "Permite que este agente seja acordado por atribuições, chamadas de API, ações de UI ou sistemas automatizados.",
      "cooldown-sec": "Segundos mínimos entre execuções consecutivas de heartbeat.",
      "max-concurrent-runs": "Número máximo de execuções de heartbeat simultâneas para este agente.",
      "budget-monthly-cents": "Limite mensal de gasto em centavos. 0 significa sem limite.",
      "...": "(restante das 32 chaves do `help` dictionary populadas no plano)"
    }
  }
}
```

### Pattern 5: common.json toast.agent.* / toast.run.* sub-tree (10-03)

Extensão a `common.json` (preserva keys 7-9):

```json
{
  "toast": {
    "saved": "Salvo",
    "save-failed": "Falha ao salvar",
    "...": "(keys existentes Fase 9-04)",
    "agent": {
      "started": "{{name}} iniciado",
      "errored": "{{name}} com erro",
      "view": "Ver agente"
    },
    "run": {
      "succeeded": "Execução de {{name}} concluída",
      "failed": "Execução de {{name}} falhou",
      "timed-out": "Execução de {{name}} expirou",
      "cancelled": "Execução de {{name}} cancelada",
      "trigger-prefix": "Gatilho: {{detail}}",
      "view": "Ver execução"
    },
    "join-request": {
      "agent-wants": "Um agente quer entrar",
      "someone-wants": "Alguém quer entrar",
      "body": "Uma nova solicitação de entrada aguarda aprovação.",
      "view-inbox": "Ver inbox"
    },
    "activity": {
      "issue-created": "{{actor}} criou {{ref}}",
      "issue-updated": "{{actor}} atualizou {{ref}}",
      "issue-commented": "{{actor}} comentou em {{ref}}",
      "issue-reopened-commented": "{{actor}} reabriu e comentou em {{ref}}",
      "issue-commented-updated": "{{actor}} comentou e atualizou {{ref}}",
      "view-ref": "Ver {{ref}}"
    }
  }
}
```

### Anti-Patterns to Avoid

- **NÃO traduzir output do modelo.** Apenas texto que é código nosso. Se uma string vem de `payload.message` ou `transcript.text`, é output do agente — não tocar (Fase 11 cobre via system prompt).
- **NÃO traduzir labels da constants.ts em `packages/shared/`.** `AGENT_ROLE_LABELS` continua inglês para uso server-side (logs, exports). Tradução acontece via lookup paralelo no UI client.
- **NÃO refatorar `StatusBadge` para receber `t` diretamente.** Ele permanece reusável com prop opcional `label`. O cálculo de cor depende do `status` enum, não da label.
- **NÃO recriar lookup `actionKey` no client para activity log.** Fase 8-05 já estabeleceu que server emite `actionKey` + `paramsJson`. Esta fase apenas estende `activity.json` se houver gaps — verificado: nenhum gap detectado.
- **NÃO inicializar `useTranslation` dentro do `handleLiveEvent`.** É uma função pura; obter `t` no `LiveUpdatesProvider` component e passar via closure/ref para evitar re-renders cascateando reconexões de socket.
- **NÃO traduzir adapter type strings** (`claude_local`, `codex_local`, `process`, `http`, etc.) — são identificadores de protocolo, técnicos. Apenas a `adapterLabels` display label (e.g. "Claude Local", "Codex Local") é UI-facing — providers já registram label. Inspecionar `getAdapterDisplay` no plano antes de mexer.
- **NÃO traduzir IDs encurtados** (`run.id.slice(0,8)`) — são valores técnicos.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Plurais de "X more active runs" | Função `count === 1 ? "run" : "runs"` no JSX | i18next `_one`/`_other` (`agents:panel.more-runs`) com `t(key, { count })` |
| Interpolação de nome de agente em toast | Template `\`${name} run failed\`` | `t("common:toast.run.failed", { name })` |
| Mapeamento status enum → label | switch/if-chain | STATUS_KEY lookup record (Pattern 1) |
| Mapeamento role enum → label | Reuso de `AGENT_ROLE_LABELS` server-side | ROLE_KEY lookup record paralelo (Pattern 2) |
| Detector keys ausentes | Walker AST custom | `ui/src/i18n/__tests__/missing-keys.test.ts` (Fase 7) |
| Tradução de activity entries | Reescrever `formatActivityVerb` | Server emite `actionKey + paramsJson` (Fase 8-05); UI usa `t(\`activity:${actionKey}\`, paramsJson)` |

**Key insight:** Toda a infra está pronta — esta fase é grep + replace + JSON edit. A maior peça nova é o refactor do `LiveUpdatesProvider` toast builders para receber `t` (Pattern 3); resto é mecânico.

## Common Pitfalls

### Pitfall 1: `StatusBadge` shared entre agentes/issues/runs/workspaces

**What goes wrong:** Refactor de `StatusBadge` para receber `label` prop pode quebrar consumidores em `IssueRunLedger.tsx` (linha 120 indiretamente via mergeRuns), `IssueWorkspaceCard.tsx:380`, etc., que passam `status` mas esperam render automático da label.

**How to avoid:** Manter o comportamento atual quando `label` ausente (`status.replace(/_/g, " ")`) — este é fallback. Apenas consumidores nos arquivos do plano 10-01 (`AgentDetail.tsx:952`, `Agents.tsx`) passam `label` traduzido. Outros consumidores ficam para fases futuras se precisarem (i18n issues/workspaces ficou em fases anteriores; pode já ter sido tocado).

### Pitfall 2: `LiveUpdatesProvider` reconexão de socket por re-render

**What goes wrong:** Adicionar `useTranslation` no `LiveUpdatesProvider` faz `t` mudar de identidade a cada language change → `useEffect` que monta o socket re-monta → reconexão. Pior caso: usuário troca de idioma e perde eventos live durante reconexão.

**How to avoid:** Usar `tRef = useRef(t)` + `useEffect(() => { tRef.current = t }, [t])`. O `handleLiveEvent` lê `tRef.current` no momento da invocação. `useEffect` do socket NÃO depende de `t`. Validar via teste: language change não dispara `closeSocketQuietly`.

### Pitfall 3: `help` dictionary em agent-config-primitives.tsx é exportado e referenciado por `AgentConfigForm`

**What goes wrong:** `help` é um const exportado de `agent-config-primitives.tsx:22-60` e importado em `AgentConfigForm.tsx` via `import { ..., help } from "../components/agent-config-primitives"`. Se substituirmos `help.name` por `t("agents:config.help.name")` no callsite (`AgentConfigForm`), a fonte (primitives) ainda exporta strings inglês — mas como ninguém mais consome, ok.

**How to avoid:** Plano 10-01 deve decidir: (a) apagar `help` const e mover para `t()` direto nos callsites, ou (b) reescrever `help` const como `Record<string, string>` populado dinamicamente via `t()` chamado dentro de uma factory `createHelpMap(t)`. Recomendação: (a) é mais limpo — apagar `help`, usar `t("agents:config.help.{key}")` em cada `<HintIcon text={t(...)} />`.

### Pitfall 4: Activity log keys que parecem agentes mas vivem em namespace diferente

**What goes wrong:** Activity events de agente vivem em `activity.json` (verificado: `agent.created/updated/...` já presentes via Fase 8-05). Plano 10-03 pode querer "padronizar" movendo para `agents:activity.*` — isso quebra a migration 0074 do server e o handler de `actionKey` em `ActivityRow.tsx`.

**How to avoid:** **Não tocar em `activity.json` para keys de evento de agente.** Server emite `actionKey: "agent.created"`; `ActivityRow.tsx` chama `t(\`activity:${actionKey}\`)`. Manter como está. Se houver verb-faltando (verificar via Read direto do `activity.json`), apenas ADICIONAR ao mesmo sub-tree `agent.*`.

### Pitfall 5: Toast builders recebem `nameOf` resolver (reusa queryClient cache)

**What goes wrong:** `buildAgentStatusToast` recebe `nameOf: (id: string) => string | null` como callback fechado sobre `queryClient.getQueryData(...)`. Se `t` for adicionado como param, atenção a ordem dos params em ALL callers (linha 820 no `handleLiveEvent`).

**How to avoid:** Atualizar assinaturas com `t` SEMPRE como último param (convenção). Atualizar callsites em `__liveUpdatesTestUtils` (linha 887) e testes que invocam diretamente `__liveUpdatesTestUtils.buildAgentStatusToast(...)` — verificar grep antes do plano executar.

### Pitfall 6: Pluralização de "X more runs" (Plano 10-01) e "X more children" (Plano 10-02)

**What goes wrong:** Strings dinâmicas com plural — `\`${count} more active/recent run${count === 1 ? "" : "s"}\`` em `ActiveAgentsPanel.tsx:110` e `\`+${count} more\`` em `IssueRunLedger.tsx:486` — tradução naive perde a regra de plural pt-BR.

**How to avoid:** Usar `_one`/`_other` (i18next 26 default `compatibilityJSON: "v4"` — verificado em Fase 7). Padrão:

```json
"more-runs_one": "{{count}} execução ativa/recente a mais",
"more-runs_other": "{{count}} execuções ativas/recentes a mais"
```

```typescript
t("agents:panel.more-runs", { count: hiddenRunCount })
```

### Pitfall 7: Detector vitest explode com 200+ keys faltando antes de qualquer tradução

**What goes wrong:** Adiciona `t("agents:detail.tabs.dashboard")` em AgentDetail.tsx; CI roda `pnpm test:run`; detector reporta 200+ keys faltando porque pt-BR/agents.json e en-US/agents.json estão `{}`.

**How to avoid:** Plano deve adicionar a key no JSON **no mesmo commit** em que adiciona o `t()` no código. Detector é não-bloqueante em dev mas bloqueante em CI (`process.env.CI`).

## Code Examples

### Example: StatusBadge refactor (Pattern 1)

```typescript
// ui/src/components/StatusBadge.tsx (após refactor)
import { cn } from "../lib/utils";
import { statusBadge, statusBadgeDefault } from "../lib/status-colors";

interface StatusBadgeProps {
  status: string;
  label?: string;  // NEW — opcional; se ausente, fallback ao comportamento atual
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shrink-0",
        statusBadge[status] ?? statusBadgeDefault
      )}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
```

```typescript
// ui/src/pages/AgentDetail.tsx (callsite, após edit)
import { useTranslation } from "react-i18next";
import { AGENT_STATUS_KEY } from "../lib/agent-keys"; // novo módulo do plano

export function AgentDetail() {
  const { t } = useTranslation(["agents", "common"]);
  // ...
  return (
    // linha 952:
    <span className="hidden sm:inline">
      <StatusBadge
        status={agent.status}
        label={t(AGENT_STATUS_KEY[agent.status as AgentStatus])}
      />
    </span>
  );
}
```

### Example: LiveUpdatesProvider toast builder com `t`

```typescript
// ui/src/context/LiveUpdatesProvider.tsx (após refactor — Pattern 3)
import type { TFunction } from "i18next";

function buildRunStatusToast(
  payload: Record<string, unknown>,
  nameOf: (id: string) => string | null,
  t: TFunction,
): ToastInput | null {
  const runId = readString(payload.runId);
  const agentId = readString(payload.agentId);
  const status = readString(payload.status);
  if (!runId || !agentId || !status || !RUN_TOAST_STATUSES.has(status)) return null;

  const error = readString(payload.error);
  const triggerDetail = readString(payload.triggerDetail);
  const name = nameOf(agentId) ?? `Agent ${shortId(agentId)}`;
  const tone = status === "succeeded" ? "success" : status === "cancelled" ? "warn" : "error";
  const titleKey = `common:toast.run.${status === "timed_out" ? "timed-out" : status}`;
  const title = t(titleKey, { name });

  let body: string | undefined;
  if (error) {
    body = truncate(error, 100);
  } else if (triggerDetail) {
    body = t("common:toast.run.trigger-prefix", { detail: triggerDetail });
  }

  return {
    title,
    body,
    tone,
    ttlMs: status === "succeeded" ? 5000 : 7000,
    action: { label: t("common:toast.run.view"), href: `/agents/${agentId}/runs/${runId}` },
    dedupeKey: `run-status:${runId}:${status}`,
  };
}

// LiveUpdatesProvider component (linha 902):
export function LiveUpdatesProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation(["common", "activity"]);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  // ...
  // dentro do socket.onmessage (linha 983):
  handleLiveEvent(queryClient, liveCompanyId, pathnameRef.current, parsed, pushToast, gateRef.current, currentActorRef.current, tRef.current);
}
```

### Example: STATUS_KEY central module

```typescript
// ui/src/lib/agent-keys.ts (novo)
import type { AgentStatus, AgentRole } from "@paperclipai/shared";

export const AGENT_STATUS_KEY: Record<AgentStatus, `agents:status.${string}`> = {
  active: "agents:status.active",
  paused: "agents:status.paused",
  idle: "agents:status.idle",
  running: "agents:status.running",
  error: "agents:status.error",
  pending_approval: "agents:status.pending-approval",
  terminated: "agents:status.terminated",
};

export const AGENT_ROLE_KEY: Record<AgentRole, `agents:role.${string}`> = {
  ceo: "agents:role.ceo",
  cto: "agents:role.cto",
  cmo: "agents:role.cmo",
  cfo: "agents:role.cfo",
  engineer: "agents:role.engineer",
  designer: "agents:role.designer",
  pm: "agents:role.pm",
  qa: "agents:role.qa",
  devops: "agents:role.devops",
  researcher: "agents:role.researcher",
  general: "agents:role.general",
};
```

## Runtime State Inventory

Esta fase é **principalmente aditiva**, sem migration de schema, sem mudança em runtime state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — sem schema change. Activity log entries usam `actionKey` introduzido em Fase 8-05; `agent.*` keys já cobertas em `activity.json`. | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets / env vars | None | None |
| Build artifacts | `ui/dist/*` regenerado em `pnpm build` (incidental) | None |

**Verified:** `pt-BR/agents.json` e `en-US/agents.json` estão vazios (`{}`) — confirmado via `cat`. Namespace `agents` já registrado em `ui/src/i18n/resources.ts:1-48` e tipado em `ui/src/i18n/i18next.d.ts`.

## Environment Availability

Sem dependências externas novas.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22+ | Build, dev | ✓ | 22+ | — |
| pnpm | Workspace | ✓ | 9.15.4 | — |
| Vitest | Detector + RTL tests | ✓ | 3.0.5 | — |
| i18next | Translation runtime | ✓ | 26.0.8 | — |
| react-i18next | React bindings | ✓ | 17.0.4 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.0.5 (UI workspace) |
| Config files | `ui/vitest.config.ts` |
| Quick run command | `pnpm --filter @paperclipai/ui test:run` |
| Full suite | `pnpm test:run && pnpm -r typecheck` |
| Detector vitest custom | `ui/src/i18n/__tests__/missing-keys.test.ts` (Fase 7) — bloqueante em CI |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGENT-MSG-01 | Toda string visível em painéis de agente passa por `t()` | unit (detector) | `pnpm --filter @paperclipai/ui test:run -- missing-keys` | ✅ Fase 7 |
| AGENT-MSG-01 | `StatusBadge` aceita `label` prop opcional sem quebrar consumidores legacy | unit (RTL) | `pnpm --filter @paperclipai/ui test:run -- StatusBadge` | ❌ Wave 0 — `ui/src/components/__tests__/StatusBadge.label.test.tsx` |
| AGENT-MSG-01 | AgentDetail renderiza pt-BR completo (status, ações, breadcrumbs) | unit (RTL) | render `<AgentDetail>` com locale pt-BR; assert "Painel"/"Configuração"/"Em execução"/"Pausar"/etc. presentes | ❌ Wave 0 — `ui/src/pages/__tests__/AgentDetail.i18n.test.tsx` |
| AGENT-MSG-01 | AgentDetail render pt-BR (visual scan) | HUMAN-UAT | UAT-10-01 | ❌ N/A (manual) |
| AGENT-MSG-02 | RunTranscriptView renderiza labels traduzidas (Running/Completed/Errored/Input/Result) | unit (RTL) | render com `entries=[mockToolBlock]`; assert "Em execução"/"Concluído"/"Com erro" | ❌ Wave 0 — `ui/src/components/transcript/__tests__/RunTranscriptView.i18n.test.tsx` |
| AGENT-MSG-02 | IssueRunLedger renderiza "Registro de execuções"/"Trabalho derivado"/etc. em pt-BR | unit (RTL) | render existente em `IssueRunLedger.test.tsx` (já tem) — adicionar assert pt-BR locale | parcial — estender |
| AGENT-MSG-02 | Run summaries pt-BR (visual scan) | HUMAN-UAT | UAT-10-02 | ❌ N/A (manual) |
| AGENT-MSG-03 | NewAgentDialog, AgentConfigForm, breadcrumbs traduzidos | unit (detector) | `missing-keys.test.ts` cobre via grep | ✅ Fase 7 |
| AGENT-MSG-03 | help dictionary tooltips traduzidos | unit (RTL) | render `<HintIcon text={t("agents:config.help.name")} />` em locale pt-BR; assert texto presente após hover | ❌ Wave 0 — covered pelo agentes detail i18n test |
| AGENT-MSG-04 | `buildRunStatusToast` retorna title traduzido em pt-BR | unit (Vitest) | invocar `__liveUpdatesTestUtils.buildRunStatusToast(payload, nameOf, t)` com `t` mocado; assert `title === "Execução de X falhou"` | ❌ Wave 0 — `ui/src/context/__tests__/LiveUpdatesProvider.toast.i18n.test.ts` |
| AGENT-MSG-04 | `buildAgentStatusToast` retorna title traduzido | unit (Vitest) | mesma command | ❌ Wave 0 (mesmo arquivo) |
| AGENT-MSG-04 | Activity log entries de agente renderizam pt-BR | unit (RTL) | render `<ActivityRow event={mockEvent({ actionKey: "agent.created", paramsJson: { name: "Bot" } })}>` em pt-BR; assert "criou" presente | ❌ Wave 0 — pode reusar `ActivityRow.actionKey.test.tsx` da Fase 8-05 estendendo |
| AGENT-MSG-04 | LiveUpdatesProvider language change não reabre socket | unit (Vitest, mocked WebSocket) | `i18n.changeLanguage("en-US")`; assert `closeSocketQuietly` NOT called | ❌ Wave 0 — mesma suíte |

### HUMAN-UAT (não-automatizável — visual UI verification)

| UAT ID | Behavior | Steps |
|--------|----------|-------|
| UAT-10-01 | Painéis de agente 100% pt-BR | (1) login → settings → trocar para pt-BR; (2) abrir `/agents`; (3) abrir um agente em `/agents/{ref}/dashboard`; (4) varrer visualmente: header (nome, role, status, action buttons), tabs (Painel/Instruções/Configuração/Execuções/Orçamento), properties panel, mais menu (Copiar ID, Reiniciar Sessões); (5) abrir `Novo agente` dialog — recomendação CEO + advanced; (6) sem string em inglês visível |
| UAT-10-02 | Run summaries 100% pt-BR | (1) pt-BR ativo; (2) abrir agente com runs; (3) abrir um run específico — verificar transcript labels (Em execução/Concluído/Com erro/Entrada/Resultado/Aguardando resultado/Recolher detalhes); (4) abrir uma issue com `IssueRunLedger` ativo — verificar "Registro de execuções", "Trabalho derivado", "X ativos, Y concluídos", "Execução mais recente"; (5) abrir issue com live run — `LiveRunWidget` mostra "Execuções ao vivo", "Parar", "Abrir execução" |
| UAT-10-03 | Toasts de eventos de agente em pt-BR | (1) pt-BR ativo, board com agentes ativos; (2) provocar run failure (terminar agente durante run, ou esperar timeout); (3) toast aparece com "Execução de {nome} falhou" + body; (4) provocar agent.error — toast "X com erro"; (5) abrir activity log de agente — entries de agente renderizam verbo traduzido ("criou"/"pausou"/"trocou conta Claude…"); (6) sem string em inglês |

### Sampling Rate
- **Per task commit:** `pnpm --filter @paperclipai/ui test:run -- missing-keys` (rápido, < 5s)
- **Per wave merge:** `pnpm test:run && pnpm -r typecheck`
- **Phase gate:** Full suite green + UAT-10-01..03 manualmente verificados

### Wave 0 Gaps

- [ ] `ui/src/components/__tests__/StatusBadge.label.test.tsx` — covers AGENT-MSG-01 (StatusBadge prop)
- [ ] `ui/src/pages/__tests__/AgentDetail.i18n.test.tsx` — covers AGENT-MSG-01 (panel render pt-BR)
- [ ] `ui/src/components/transcript/__tests__/RunTranscriptView.i18n.test.tsx` — covers AGENT-MSG-02
- [ ] `ui/src/context/__tests__/LiveUpdatesProvider.toast.i18n.test.ts` — covers AGENT-MSG-04 (toast builders + socket-no-reconnect)
- [ ] `ui/src/lib/agent-keys.ts` — novo módulo com STATUS_KEY/ROLE_KEY lookups (compartilhado entre AgentDetail/Agents/StatusBadge consumers)
- [ ] Bootstrap inicial das keys nos JSON dicts: cada plano adiciona suas sub-trees (10-01: actions/status/role/detail/panel/new-agent-dialog/config; 10-02: transcript/run-ledger/live-runs; 10-03: toast.* extension em common.json)

## Open Questions

1. **`AgentConfigForm.tsx` (1510 LOC) tem ~31 strings — quão profundo ir?**
   - What we know: form gigante, mistura field labels (~31 detected) + `Field` primitive consumido várias vezes + `help` tooltips de `agent-config-primitives.tsx:22-60` (32 entradas).
   - What's unclear: Se `AgentConfigForm` aparece em mais de uma rota (provavelmente sim — é usado por `NewAgent.tsx:19` e `AgentDetail.tsx` view "configuration").
   - Recommendation: Plano 10-01 traduz `AgentConfigForm` inteiro num passe (cobre ambas rotas). Documentar.

2. **`adapterLabels` (em `agent-config-primitives.tsx:64`) — traduzir display labels dos adapters?**
   - What we know: `getAdapterLabels()` retorna `Record<string, string>` populado pelos adapters registrados via `getAdapterDisplay`. Labels são "Claude Local"/"Codex Local"/"Process"/"HTTP Webhook"/etc.
   - What's unclear: Se algumas dessas labels deveriam ser traduzidas ou se são identidade de produto/protocolo.
   - Recommendation: **Não traduzir.** Adapter labels são display strings de protocolo (igual a "MCP"/"OpenAI"). Ficam intactos em pt-BR. Documentar como anti-pattern.

3. **`StatusBadge` consumido em quantos lugares fora de agentes?**
   - What we know: 6+ contextos (agentes, issues, runs, workspaces, plus DesignGuide).
   - What's unclear: Se a refactor (adicionar `label` opcional) requer atualização de todos esses callers ou se o fallback (`status.replace(/_/g, " ")`) é suficiente para esta fase.
   - Recommendation: Fallback é suficiente — apenas callers em arquivos do plano 10-01 passam `label`. Outros mantêm status enum raw com replace. Issues/Workspaces ficam para fase futura se houver demanda.

4. **`PageTabBar` em `AgentDetail.tsx` — tabs traduzidas via prop ou hardcoded em PageTabBar?**
   - What we know: `import { PageTabBar } from "../components/PageTabBar"` (linha 27). Não inspecionado nesta pesquisa.
   - What's unclear: Se PageTabBar aceita labels via prop (esperado — é componente reusável) ou se hardcoded.
   - Recommendation: Plano 10-01 inspeciona `PageTabBar.tsx` antes de traduzir. Pattern esperado: `<PageTabBar tabs={[{ id, label: t("agents:detail.tabs.dashboard") }, ...]} />`.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/10-mensagens-dos-agentes/10-CONTEXT.md` — todas as decisões locked
- `.planning/REQUIREMENTS.md:38-43` — AGENT-MSG-01..04 spec
- `.planning/phases/08-traducao-ui-core/08-RESEARCH.md` — patterns 1-7, schema activity_log
- `.planning/phases/09-traducao-ui-admin-auth-sistemicas/09-RESEARCH.md` — translateApiError pattern, STATUS_KEY pattern
- `ui/src/i18n/resources.ts:1-48` — namespace `agents` registrado, JSON imports
- `ui/src/i18n/locales/pt-BR/agents.json` — vazio `{}` (verified via `cat`)
- `ui/src/i18n/locales/en-US/agents.json` — vazio `{}` (verified via `cat`)
- `ui/src/i18n/locales/pt-BR/activity.json:1-79` — todos eventos `agent.*` cobertos (8 keys), `heartbeat.*` (2), `claude-account-rotated` top-level
- `ui/src/i18n/locales/pt-BR/common.json:114-175` — toast.* sub-tree existente (Fase 9-04)
- `ui/src/pages/AgentDetail.tsx:1-4248` — superfície maior (4248 LOC); 2 callsites `useTranslation` existentes (linhas 622, 3037); ~280 strings
- `ui/src/pages/Agents.tsx:112,133-135,212` — listing de agentes
- `ui/src/pages/NewAgent.tsx` — wrapper para AgentConfigForm (335 LOC)
- `ui/src/components/AgentConfigForm.tsx` — 1510 LOC, ~31 strings
- `ui/src/components/AgentProperties.tsx:43-92` — properties panel (96 LOC)
- `ui/src/components/AgentActionButtons.tsx:7,40,47` — RunButton/PauseResumeButton (51 LOC)
- `ui/src/components/NewAgentDialog.tsx:118,140-150,158,170-174,193` — dialog de criação (210 LOC)
- `ui/src/components/agent-config-primitives.tsx:22-60` — `help` dictionary (32 chaves)
- `ui/src/components/StatusBadge.tsx:1-15` — current implementation (15 LOC)
- `ui/src/components/ActiveAgentsPanel.tsx:41,47,110,158` — dashboard panel (197 LOC)
- `ui/src/components/transcript/RunTranscriptView.tsx:287,292,298,300,515,651,709-712,789,820-822,1033,1038,1045,1473,1487` — labels do transcript (1526 LOC)
- `ui/src/components/RunChatSurface.tsx:63` — emptyMessage (70 LOC)
- `ui/src/components/LiveRunWidget.tsx:95-99,133,140` — live runs widget (160 LOC)
- `ui/src/components/IssueRunLedger.tsx:391,444-487` — run ledger + watchdog toast (708 LOC)
- `ui/src/context/LiveUpdatesProvider.tsx:406-408,430-607,778-846,902-1018` — toast builders + handler + provider component
- `packages/shared/src/constants.ts:16-67` — `AGENT_STATUSES`, `AGENT_ROLES`, `AGENT_ROLE_LABELS`
- `server/src/services/claude-accounts.ts:422` — server emite `actionKey: "claude-account-rotated"` (Fase 8-05 já cobre)
- `server/src/services/activity-log.ts:18` — emit shape com `actionKey`
- `.planning/config.json` — `nyquist_validation: true`, `commit_docs: true`

### Secondary (MEDIUM confidence)
- Estimativa de string density (~280 / ~70 / ~50) via heurística regex `"[A-Z][a-z][a-zA-Z ]{3,30}"` — captura literais JSX texto + props string mas pode subcontar strings em templates literals com lowercase initial. Margem ±20%.

### Tertiary (LOW confidence)
- Nenhum.

## Metadata

**Confidence breakdown:**
- File paths and line numbers: HIGH — todos verificados via Read direto.
- agents.json estado vazio: HIGH — verificado via `cat`.
- activity.json cobertura completa para agentes: HIGH — verificado linha-a-linha.
- Toast builder list (4 builders, 3 enum sets): HIGH — código fonte direto.
- String density estimates: MEDIUM — heurística regex, ordem de magnitude correta.
- Refactor `LiveUpdatesProvider` para receber `t`: HIGH — 4 builders são funções puras; injection trivial via tRef pattern.
- 3 planos paralelizáveis em 2 waves: HIGH — file sets disjuntos confirmados (Wave 1 = pages/agents/* + components/transcript/*; Wave 2 = context/LiveUpdatesProvider.tsx + cross-cutting JSON).

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (30 dias; UI surfaces de agente podem ganhar novas strings antes do plano executar — re-grep necessário no momento da execução de cada plano)
