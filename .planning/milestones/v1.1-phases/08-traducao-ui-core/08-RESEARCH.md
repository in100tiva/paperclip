# Phase 8: Tradução UI Core — Research

**Researched:** 2026-04-26
**Domain:** UI translation (mechanical extract → key → translate) sobre fundação i18n da Fase 7
**Confidence:** HIGH

## Summary

A Fase 7 deixou tudo pronto para tradução: i18next inicializado em `ui/src/main.tsx:45`, 8 namespaces em `ui/src/i18n/resources.ts`, 16 dicionários JSON (pt-BR + en-US), detector vitest em `ui/src/i18n/__tests__/missing-keys.test.ts` e `ProfileSettings.tsx` já consumindo `useTranslation(["settings", "common"])` (linhas 26, 307–329 — exemplo canônico).

Esta fase é puramente mecânica: localizar strings hardcoded em 5 superfícies, substituir por `t("ns:key")`, popular `pt-BR/<ns>.json` + `en-US/<ns>.json`. A única peça arquitetural nova é o **schema de activity log com `actionKey + paramsJson`** + `ActivityRow` que renderiza via `t()` com fallback para `formatActivityVerb()` legado em `ui/src/lib/activity-format.ts`.

**Distribuição de strings (estimada por grep heurístico — atributos `label=/placeholder=/aria-label=/>Capitalized`):**

| Superfície | Arquivo principal | LOC | Strings (est.) | Plano |
|------------|-------------------|-----|---------------|-------|
| Inbox | `Inbox.tsx` + `IssuesList.tsx` + `IssueRow.tsx` + `IssueFiltersPopover.tsx` + `IssueColumns.tsx` + `SwipeToArchive.tsx` + `IssueGroupHeader.tsx` | 4480+ | ~120 | 08-01 |
| Projects | `Projects.tsx` + `ProjectDetail.tsx` + `NewProjectDialog.tsx` + `ProjectProperties.tsx` + `ProjectWorkspacesContent.tsx` | 1500+ | ~50 | 08-02 |
| Settings | `InstanceSettings.tsx` + `InstanceGeneralSettings.tsx` + `InstanceExperimentalSettings.tsx` + `ProfileSettings.tsx` (parcial) + `ClaudeAccounts.tsx` | 1640 | ~85 | 08-03 |
| Nav | `Sidebar.tsx` + `InstanceSidebar.tsx` + `SidebarAccountMenu.tsx` + `SidebarCompanyMenu.tsx` + `SidebarAgents.tsx` + `SidebarProjects.tsx` + `BreadcrumbBar.tsx` + `MobileBottomNav.tsx` + `Layout.tsx` | 1565 | ~55 | 08-04 |
| Activity log | `ActivityRow.tsx` + `Activity.tsx` + `ui/src/lib/activity-format.ts` + DB migration + 30 server routes/services | ~800 (UI) + 169 actionKeys | 08-05 |

**Primary recommendation:** Executar planos 08-01..08-04 em paralelo (arquivos disjuntos exceto pelos JSON dicts — race aceitável já que cada plano edita keys distintas dentro do mesmo namespace). 08-05 (activity log) é **sequencial** com 08-04 porque a migration `0074` deve aplicar antes que a UI possa testar render via `actionKey`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Inbox traduzido (lista, filtros, ações em massa, estados vazios) | Inventário de arquivos (Plano 08-01) cobre `Inbox.tsx:1-2563` + 6 child components; namespace `inbox` (já existente, vazio) recebe ~120 keys |
| UI-02 | Projects traduzido (lista, criação, detalhes, edição) | Plano 08-02 cobre `Projects.tsx`, `ProjectDetail.tsx`, `NewProjectDialog.tsx`, `ProjectProperties.tsx`; namespace `projects` |
| UI-03 | Settings traduzido (incluindo idioma + Claude accounts) | Plano 08-03 estende namespace `settings` (já tem `language.*` da Fase 7); cobre `Instance{General,Experimental,Settings}.tsx`, `ProfileSettings.tsx` (campos não-locale), `ClaudeAccounts.tsx` |
| UI-05 | Nav/sidebar/header/menus/breadcrumbs | Plano 08-04 cobre 9 arquivos em `ui/src/components/`; namespace `common` (já tem stub) recebe sub-tree `nav.*` |
| UI-09 | Activity log templates renderizados via key+params | Plano 08-05: migration `0074_add_activity_action_key.sql` (colunas `action_key text NULL`, `params_json jsonb NULL`); estende `LogActivityInput` em `server/src/services/activity-log.ts:80-90`; reescreve `ActivityRow.tsx` para preferir `t(\`activity:${actionKey}\`, paramsJson)` com fallback para `formatActivityVerb()` |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Estratégia de extração:**
- Manual via grep + edição inline. Não usar i18next-parser (depreciado) ou ferramenta automatizada.
- Detector vitest custom (`ui/src/i18n/__tests__/missing-keys.test.ts`) protege contra regressões.
- Para cada superfície: `grep -rn "literal" caminho/` → identificar → substituir por `t("ns:key")` → adicionar key em ambos `pt-BR/<ns>.json` e `en-US/<ns>.json`.
- Strings com interpolação trivial: `t("inbox:greeting", { name })`.
- Strings dinâmicas complexas: TODO `// i18n: review — complex template`, cobrir caso simples; refator agressivo fica para v2 (L10N-03).

**Granularidade:**
- Um plano por superfície UI. 5 planos:
  - 08-01: Inbox (UI-01)
  - 08-02: Projects (UI-02)
  - 08-03: Settings (UI-03)
  - 08-04: Navegação (UI-05) — sidebar, header, menus, breadcrumbs
  - 08-05: Activity log (UI-09) — schema + ActivityEntry renderer + backwards-compat

**Activity log schema/render:**
- Server emite `actionKey + paramsJson` em activity_log entries (`action` mantém compat — vira fallback).
- Migração Drizzle adiciona `actionKey: text NULL` + `paramsJson: jsonb NULL` em `activity_log`.
- Migration ID: `0074_add_activity_action_key.sql` (sequencial após `0073_add_user_locale.sql`).
- Client renderiza via `t(actionKey, paramsJson)`; entries pré-Fase-8 (sem `actionKey`) renderizam `action` raw com label "(legado)" em itálico.
- Sem data migration.

**Cobertura per-surface:**
- INCLUIR: empty states, loading states, child components profundos (TaskItem, ProjectCard, FilterPanel, BulkActions), modais e dialogs das telas core.
- DEFER para Fase 9 (UI-08): tooltips inline em ações de tela core, tooltips/empty states sistêmicos, modais de confirmação, toasts.

**Branding e nav:**
- "Paperclip" como produto = hardcoded brand string, NÃO traduzir.
- User menu (Profile, Settings, Logout) → namespace `common`.
- Sidebar items com badges/counts numéricos: labels traduzidos; números preservados (Intl.NumberFormat → v2 L10N-02).
- Breadcrumbs dinâmicos com nomes de entidades: passthrough do nome literal; estrutura traduzida (`t("common:nav.crumbs.project")`).

### Claude's Discretion

- Granularidade de keys (sub-namespaces dentro de cada arquivo JSON).
- Ordem de tradução das strings dentro de cada superfície.
- Strings de domínio técnico (ex: "tsx", "json", "uuid") deixam intactas.
- Componentes de design system reusáveis (Button, Modal, Spinner) com props `label/title/aria-label`: traduções via consumidores, não via design system.

### Deferred Ideas (OUT OF SCOPE)

- Tooltips inline em ações de tela core → Fase 9 (UI-08).
- Refatoração de strings concatenadas complexas para ICU MessageFormat → v2 (L10N-03).
- Intl.NumberFormat / Intl.DateTimeFormat por locale → v2 (L10N-02).
- Tradução de admin/company UI (UI-04) → Fase 9.
- Tradução de auth forms (UI-06) → Fase 9.
- Mensagens de erro / validação / API responses → Fase 9 (UI-07).
- Mensagens dos agentes → Fase 10 (AGENT-MSG-*).
</user_constraints>

## Project Constraints (from CLAUDE.md)

(Não foi encontrado `./CLAUDE.md` no diretório de trabalho. Constraints aplicáveis derivam exclusivamente do CONTEXT.md acima e padrões já estabelecidos pelo repositório — TypeScript strict, vitest 3.x, Drizzle migrations sequenciais, DB-03 enforcement em `.github/workflows/db-migrate.yml`, sem `db:migrate` local.)

## Standard Stack

Sem novas dependências. Tudo herdado da Fase 7:

| Library | Version | Purpose |
|---------|---------|---------|
| `i18next` | 26.0.8 | Translation engine (já instalado) |
| `react-i18next` | 17.0.4 | React bindings (`useTranslation`, `Trans`) |
| `vitest` | 3.0.5 | Detector + RTL tests |
| `drizzle-kit` | 0.31.9 | Migration generate (apenas para 08-05) |

**Nenhuma instalação adicional.** Esta fase é mecânica de aplicação dos padrões existentes.

## Architecture Patterns

### Pattern 0: Cabeçalho canônico de componente traduzido

Padrão estabelecido por `ProfileSettings.tsx:3,26,307-329`:

```typescript
import { useTranslation } from "react-i18next";

export function MySurface() {
  const { t } = useTranslation(["inbox", "common"]);
  // ns padrão = primeiro do array; outros acessíveis com prefixo "ns:"
  return <h1>{t("inbox:title")}</h1>;
}
```

**Convenção de keys:** dot-notation kebab-case com prefixo namespace explícito (`inbox:empty-state.title`). O detector regex em `ui/src/i18n/__tests__/missing-keys.test.ts:6` aceita `[a-z0-9.\-]+(?::[a-z0-9.\-]+)?`. NÃO use camelCase (regex rejeita).

### Pattern 1: Inbox surface mapping (Plano 08-01)

**Arquivos in-scope** (string density confirmada via grep `label=/placeholder=/aria-label=/>Capitalized`):

| File | LOC | Notes |
|------|-----|-------|
| `ui/src/pages/Inbox.tsx` | 2563 | Página principal — categorias, filtros, modais ("Mark all as read?"), placeholders ("Search inbox…"), empty states, tabs (mine/team/everything) |
| `ui/src/components/IssuesList.tsx` | 1311 | Lista compartilhada — header de grupo, headers de coluna, "Search issues...", "Search assignees...", aria-labels |
| `ui/src/components/IssueRow.tsx` | 168 | Linha individual — "Mark as read", "Dismiss from inbox" |
| `ui/src/components/IssueFiltersPopover.tsx` | 372 | Popover de filtros — "Filters", "Quick filters", "Status", "Priority", "Assignee", "Creator", "Project", "Labels", "Workspace", "Visibility", "Live runs only", "Hide routine runs" |
| `ui/src/components/IssueColumns.tsx` | (não medido — alta densidade) | Column picker, headers de coluna |
| `ui/src/components/IssueGroupHeader.tsx` | (~50) | Headers de grupo |
| `ui/src/components/SwipeToArchive.tsx` | (~150) | aria-labels mobile |
| `ui/src/components/EmptyState.tsx` | 27 | Reusável — strings via prop `message/action` (consumidores traduzem; o componente é passthrough) |

**Estimated keys:** ~120 em `inbox.json` + ~10 em `common.json` (botões compartilhados).

**Key sample (proposed bootstrap, 5-10 entradas para o dictionary):**

```json
{
  "title": "Inbox",
  "tabs": {
    "mine": "Meus",
    "team": "Equipe",
    "everything": "Tudo"
  },
  "search": {
    "placeholder": "Buscar inbox…"
  },
  "categories": {
    "all": "Todas as categorias",
    "join-requests": "Pedidos de entrada",
    "approvals": "Aprovações",
    "failed-runs": "Execuções falhadas",
    "alerts": "Alertas"
  },
  "actions": {
    "mark-as-read": "Marcar como lido",
    "dismiss": "Dispensar",
    "dismiss-from-inbox": "Dispensar do inbox",
    "mark-all-as-read-confirm": "Marcar tudo como lido?"
  },
  "approval-status": {
    "all": "Todos os status",
    "actionable": "Requer ação",
    "resolved": "Resolvido"
  },
  "empty-state": {
    "title": "Nenhum item no inbox",
    "no-failed-runs": "Sem execuções falhadas"
  },
  "failed-run": {
    "label-with-agent": "Execução falhada — {{agentName}}",
    "label": "Execução falhada"
  }
}
```

### Pattern 2: Projects surface mapping (Plano 08-02)

| File | LOC | Notes |
|------|-----|-------|
| `ui/src/pages/Projects.tsx` | 87 | Lista — "Add Project", "Select a company to view projects.", "No projects yet." |
| `ui/src/pages/ProjectDetail.tsx` | 711 | Detalhe — tabs ("Issues", "Overview", "Workspaces", "Configuration", "Budget"), "Loading workspaces...", "Paused by budget hard stop", placeholders ("Add a description...", "Project"), labels ("Status", "Target Date") |
| `ui/src/components/NewProjectDialog.tsx` | 447 | Dialog completo — "New project", "Project name", "Add description...", "Repo URL", "Local folder", "optional", tooltips ("Link a GitHub repository...", "Set an absolute path..."), placeholder dates ("Target date"), "Goal", "+ Goal", "No goal", "All goals already selected.", "Failed to create project.", "Creating…", "Create project", project status options ("Backlog", "Planned", "In Progress", "Completed", "Cancelled") |
| `ui/src/components/ProjectProperties.tsx` | (não medido — config form) | Propriedades, archived banner |
| `ui/src/components/ProjectWorkspacesContent.tsx` | (não medido) | Lista de workspaces do projeto |
| `ui/src/components/ProjectWorkspaceSummaryCard.tsx` | (não medido) | Card de workspace |

**Toast strings em ProjectDetail.tsx:339-348:** `"\"${name}\" has been archived"`, `"\"${name}\" has been unarchived"`, `"Failed to archive project"`, `"Failed to unarchive project"` — interpolar com `{{ name }}`.

**Estimated keys:** ~50 em `projects.json`.

**Key sample (bootstrap):**

```json
{
  "title": "Projetos",
  "actions": {
    "add": "Adicionar projeto",
    "create": "Criar projeto",
    "creating": "Criando…",
    "create-failed": "Falha ao criar projeto."
  },
  "status": {
    "backlog": "Backlog",
    "planned": "Planejado",
    "in-progress": "Em andamento",
    "completed": "Concluído",
    "cancelled": "Cancelado"
  },
  "tabs": {
    "issues": "Tarefas",
    "overview": "Visão geral",
    "workspaces": "Workspaces",
    "configuration": "Configuração",
    "budget": "Orçamento"
  },
  "new-project": {
    "title": "Novo projeto",
    "name-placeholder": "Nome do projeto",
    "description-placeholder": "Adicionar descrição…",
    "repo-url-label": "URL do repositório",
    "repo-url-placeholder": "https://github.com/org/repo",
    "local-folder-label": "Pasta local",
    "local-folder-placeholder": "/caminho/absoluto/para/workspace",
    "optional": "opcional",
    "tooltip-repo": "Vincule um repositório GitHub para que agentes possam clonar, ler e fazer push de código deste projeto.",
    "tooltip-local-folder": "Defina um caminho absoluto nesta máquina onde agentes locais lerão e escreverão arquivos."
  },
  "empty-state": {
    "no-projects": "Nenhum projeto ainda.",
    "select-company": "Selecione uma empresa para ver projetos."
  },
  "toast": {
    "archived": "\"{{ name }}\" foi arquivado",
    "unarchived": "\"{{ name }}\" foi desarquivado",
    "archive-failed": "Falha ao arquivar projeto",
    "unarchive-failed": "Falha ao desarquivar projeto"
  },
  "paused-by-budget": "Pausado por limite de orçamento"
}
```

### Pattern 3: Settings surface mapping (Plano 08-03)

`settings.json` já tem `language.*` (Fase 7 — `pt-BR/settings.json:1-7`). Estender com:

| File | LOC | Notes |
|------|-----|-------|
| `ui/src/pages/InstanceSettings.tsx` | 283 | Heartbeats — "Instance Settings", "Heartbeats", "Scheduler Heartbeats", "Agents with a timer heartbeat enabled across all of your companies.", "active"/"disabled"/"company"/"companies" (counts), "Disable All", "Disabling...", "Enable Timer Heartbeat"/"Disable Timer Heartbeat", "On"/"Off", "never", "Loading scheduler heartbeats...", "No scheduler heartbeats match the current criteria.", confirmation `window.confirm("Disable timer heartbeats for all ${enabledCount} enabled ${noun}?")` |
| `ui/src/pages/InstanceGeneralSettings.tsx` | 382 | Maior superfície de Settings — "General", "Configure instance-wide preferences...", section headers ("Deployment and auth", "Censor username in logs", "Keyboard shortcuts", "Backup retention", "AI feedback sharing", "Sign out"), descriptions completas (linhas 92-95, 141-145, 159-163, 178-183, 280-283, 356-358), "Daily"/"Weekly"/"Monthly", "{N} days"/"{N} weeks"/"{N} months", "Always allow"/"Don't allow", "Read our terms of service", "Auth readiness", "Bootstrap status", "Bootstrap invite", "Ready"/"Not ready"/"Setup required"/"Active"/"None", deployment mode descriptions (linhas 113-119) |
| `ui/src/pages/InstanceExperimentalSettings.tsx` | 157 | Section headers + experimental flag descriptions |
| `ui/src/pages/ProfileSettings.tsx` | 336 | Já tem `useTranslation(["settings", "common"])` consumindo `settings:language.*` (linhas 26, 307-329). Faltam outros campos: nome, avatar, etc. — fora desta linha 307+ tudo precisa migrar |
| `ui/src/pages/ClaudeAccounts.tsx` | 480 | "Claude accounts" — listing, add/remove flows, status badges, helper text |

**Estimated keys:** ~85 em `settings.json` (extensão).

**Key sample (bootstrap, sub-tree extension):**

```json
{
  "language": { "...": "(já existe Fase 7)" },
  "general": {
    "title": "Geral",
    "description": "Configure preferências da instância: exibição de logs, atalhos de teclado, retenção de backup e compartilhamento de dados.",
    "deployment": {
      "title": "Implantação e autenticação",
      "auth-readiness": "Status de autenticação",
      "ready": "Pronto",
      "not-ready": "Não pronto"
    },
    "censor-username": {
      "title": "Censurar usuário em logs",
      "description": "Esconder o segmento de usuário em paths de home-directory..."
    },
    "backup-retention": {
      "title": "Retenção de backups",
      "daily": "Diário",
      "weekly": "Semanal",
      "monthly": "Mensal",
      "days": "{{count}} dia",
      "days_plural": "{{count}} dias"
    }
  },
  "heartbeats": {
    "title": "Heartbeats do agendador",
    "description": "Agentes com timer heartbeat habilitado em todas as suas empresas.",
    "loading": "Carregando heartbeats…",
    "empty": "Nenhum heartbeat corresponde aos critérios atuais.",
    "active": "ativo",
    "disabled": "desativado",
    "company": "empresa",
    "company_plural": "empresas",
    "actions": {
      "disable-all": "Desativar todos",
      "enable-timer": "Ativar timer heartbeat",
      "disable-timer": "Desativar timer heartbeat",
      "confirm-disable-all": "Desativar timer heartbeats para os {{count}} agentes habilitados?"
    }
  },
  "claude-accounts": {
    "title": "Contas Claude",
    "...": "(detalhes na execução)"
  }
}
```

### Pattern 4: Nav surface mapping (Plano 08-04)

| File | LOC | Notes |
|------|-----|-------|
| `ui/src/components/Sidebar.tsx` | 131 | Linha 80 "New Issue", linhas 82-118 — labels via prop (`Dashboard`, `Inbox`, `Issues`, `Routines`, `Goals`, `Workspaces`, `Org`, `Skills`, `Costs`, `Activity`, `Settings`), section labels ("Work", "Company") |
| `ui/src/components/InstanceSidebar.tsx` | 58 | "Instance Settings" + nav labels (`Profile`, `General`, `Access`, `Heartbeats`, `Experimental`, `Plugins`, `Adapters`) |
| `ui/src/components/SidebarAccountMenu.tsx` | 256 | "Open account menu" (aria), "View profile"/"Edit profile"/"Instance settings"/"Documentation"/"Switch to light mode"/"Switch to dark mode"/"Sign out"/"Signing out..." + descriptions secundárias para cada (linhas 191-249), "Account"/"Local", "Board", "Signed in"/"Local workspace board", `Paperclip v{{version}}` |
| `ui/src/components/SidebarCompanyMenu.tsx` | 109 | Company switcher labels |
| `ui/src/components/SidebarAgents.tsx` | 147 | Section header "Agents" + actions |
| `ui/src/components/SidebarProjects.tsx` | 240 | Section header "Projects" + drag/drop hints |
| `ui/src/components/BreadcrumbBar.tsx` | 121 | "Open sidebar" (aria-label, linha 71). **Crumbs literais ("Projects", "Activity", "Inbox", "Project", "Instance Settings", "Heartbeats", "General") são passados pelas páginas via `setBreadcrumbs([{ label: "..." }])`** — tradução acontece nas páginas, não aqui. Esta confirmação é importante para o plano: `BreadcrumbBar.tsx` em si tem 1 string para traduzir (aria-label do menu mobile). |
| `ui/src/components/MobileBottomNav.tsx` | 125 | Labels mobile (Inbox, Issues, Activity, etc.) |
| `ui/src/components/Layout.tsx` | 423 | Possíveis aria-labels gerais, layout-level toasts |
| `ui/src/components/CompanyRail.tsx` | 260 | Lateral company rail |
| `ui/src/components/CompanySwitcher.tsx` | 90 | Company selector |

**Estimated keys:** ~55 distribuídas entre `common.json` (sub-tree `nav.*`) e re-uso de keys de outras páginas para breadcrumbs.

**Decisão importante:** Breadcrumbs labels (`{ label: "Projects" }` em `useEffect` de cada página) são traduzidos NA PÁGINA que registra o breadcrumb, não em `BreadcrumbBar.tsx`. Exemplo: `Projects.tsx:22` → `setBreadcrumbs([{ label: t("projects:title") }])`.

**Key sample (bootstrap, sub-tree em common):**

```json
{
  "app-name": "Paperclip da Equipe",
  "loading": "Carregando…",
  "save": "Salvar",
  "cancel": "Cancelar",
  "nav": {
    "new-issue": "Nova tarefa",
    "sections": {
      "work": "Trabalho",
      "company": "Empresa"
    },
    "items": {
      "dashboard": "Dashboard",
      "inbox": "Inbox",
      "issues": "Tarefas",
      "routines": "Rotinas",
      "goals": "Metas",
      "workspaces": "Workspaces",
      "org": "Organização",
      "skills": "Skills",
      "costs": "Custos",
      "activity": "Atividade",
      "settings": "Configurações"
    },
    "instance-settings": {
      "title": "Configurações da instância",
      "items": {
        "profile": "Perfil",
        "general": "Geral",
        "access": "Acesso",
        "heartbeats": "Heartbeats",
        "experimental": "Experimental",
        "plugins": "Plugins",
        "adapters": "Adaptadores"
      }
    },
    "account-menu": {
      "open": "Abrir menu da conta",
      "view-profile": "Ver perfil",
      "view-profile-description": "Abra seu ledger de atividade, tarefas e uso.",
      "edit-profile": "Editar perfil",
      "edit-profile-description": "Atualize seu nome de exibição e avatar.",
      "instance-settings": "Configurações da instância",
      "instance-settings-description": "Volte para a última página de configurações que abriu.",
      "documentation": "Documentação",
      "documentation-description": "Abra a documentação do Paperclip em uma nova aba.",
      "switch-to-light": "Trocar para modo claro",
      "switch-to-dark": "Trocar para modo escuro",
      "switch-theme-description": "Alterne a aparência do app.",
      "sign-out": "Sair",
      "signing-out": "Saindo…",
      "sign-out-description": "Encerre esta sessão do navegador.",
      "account-badge": "Conta",
      "local-badge": "Local",
      "signed-in": "Conectado",
      "local-board": "Board do workspace local",
      "version": "Paperclip v{{version}}"
    },
    "breadcrumb": {
      "open-sidebar": "Abrir barra lateral"
    }
  }
}
```

### Pattern 5: Activity log refactor (Plano 08-05) — A INTEGRAÇÃO COMPLEXA

#### 5a. Schema atual (`packages/db/src/schema/activity_log.ts:1-26`)

```typescript
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  actorType: text("actor_type").notNull().default("system"),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),                       // KEEP (legado)
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  agentId: uuid("agent_id").references(() => agents.id),
  runId: uuid("run_id").references(() => heartbeatRuns.id),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

#### 5b. Schema mudança (Plano 08-05)

Adicionar duas colunas nullable. **NÃO mexer em `details`** — fica para payload completo legacy; `paramsJson` armazena apenas params de interpolação i18n.

```typescript
export const activityLog = pgTable("activity_log", {
  // ... existing columns
  actionKey: text("action_key"),         // NEW — nullable; e.g. "activity:issue.created"
  paramsJson: jsonb("params_json").$type<Record<string, unknown>>(),  // NEW — interpolation params
  // ...
});
```

Migration `0074_add_activity_action_key.sql` (gerar via `pnpm --filter @paperclipai/db generate`):

```sql
ALTER TABLE "activity_log" ADD COLUMN "action_key" text;
ALTER TABLE "activity_log" ADD COLUMN "params_json" jsonb;
```

Confirmação de sequência: última migration é `0073_add_user_locale.sql` (Fase 7). `0074` é o próximo número livre.

#### 5c. Server emit changes (`server/src/services/activity-log.ts`)

Mudar `LogActivityInput` (linhas 80-90):

```typescript
export interface LogActivityInput {
  companyId: string;
  actorType: "agent" | "user" | "system" | "plugin";
  actorId: string;
  action: string;                                    // mantém — fallback
  actionKey?: string | null;                         // NEW — "issue.created" (sem prefixo namespace; UI prepende "activity:")
  paramsJson?: Record<string, unknown> | null;       // NEW — params de interpolação
  entityType: string;
  entityId: string;
  agentId?: string | null;
  runId?: string | null;
  details?: Record<string, unknown> | null;          // mantém — payload completo
}
```

E em `db.insert(activityLog).values({...})` (linhas 100-110), incluir os novos campos.

**Live event payload** (linhas 112-125): incluir `actionKey` e `paramsJson` para que o cliente receba via WebSocket.

#### 5d. Server callsites — strategy

169 distinct action strings em uso (verified via grep). Estratégia para Fase 8:
1. **Não migrar todos os callsites na Fase 8.** Foco em: callsites cuja UI activity é renderizada (ver `formatActivityVerb` em `ui/src/lib/activity-format.ts:24-63` → 36 actions explicitamente mapeadas).
2. **Para esses 36+ actions**, atualizar callsite para emitir `actionKey: action, paramsJson: { ... }` (mesmo string que `action`, mas explicitamente declarando intenção de tradução).
3. **Para os outros 130+ actions** (não renderizados na UI core), deixar `actionKey: null`. UI usa fallback legacy.

Callsites prioritários (production logActivity, **31 arquivos**):

```
server/src/routes/access.ts        agents.ts        approvals.ts        assets.ts
server/src/routes/companies.ts     company-skills.ts costs.ts           environments.ts
server/src/routes/execution-workspaces.ts            goals.ts           inbox-dismissals.ts
server/src/routes/instance-settings.ts               issue-tree-control.ts                issues.ts
server/src/routes/plugins.ts       projects.ts       routines.ts         secrets.ts
server/src/routes/sidebar-preferences.ts
server/src/services/activity-log.ts (helper, não callsite)
server/src/services/budgets.ts     claude-accounts.ts                   environment-run-orchestrator.ts
server/src/services/heartbeat.ts   hire-hook.ts      plugin-host-services.ts
server/src/services/recovery/service.ts              routines.ts
```

**36 actions com formatter UI legado** (de `activity-format.ts:24-63`) = mínimo absoluto que precisa de `actionKey` para Plano 08-05:

```
issue.created, issue.updated, issue.checked_out, issue.released,
issue.comment_added, issue.comment_cancelled, issue.attachment_added,
issue.attachment_removed, issue.document_created, issue.document_updated,
issue.document_deleted, issue.commented, issue.deleted,
agent.created, agent.updated, agent.paused, agent.resumed,
agent.terminated, agent.key_created, agent.budget_updated,
agent.runtime_session_reset,
heartbeat.invoked, heartbeat.cancelled,
approval.created, approval.approved, approval.rejected,
project.created, project.updated, project.deleted,
goal.created, goal.updated, goal.deleted,
cost.reported, cost.recorded,
company.created, company.updated, company.archived, company.budget_updated,
issue.blockers_updated, issue.reviewers_updated, issue.approvers_updated
```

#### 5e. Client render — `ActivityRow.tsx` rewrite

Atual (`ui/src/components/ActivityRow.tsx:31`): `formatActivityVerb(event.action, event.details, { agentMap, userProfileMap })` retorna string em inglês.

Novo:

```typescript
const { t } = useTranslation(["activity"]);

function renderVerb(event: ActivityEvent): string {
  // Preferred path: server emitted actionKey
  if (event.actionKey) {
    const params = (event.paramsJson ?? {}) as Record<string, unknown>;
    return t(`activity:${event.actionKey}`, { ...params, defaultValue: null });
  }
  // Fallback path: legacy entries (sem actionKey) ou keys ainda não mapeadas
  return formatActivityVerb(event.action, event.details, { agentMap, userProfileMap });
}
```

E adicionar etiqueta "(legado)" para entries pré-Fase-8 quando `actionKey` ausente:

```tsx
{!event.actionKey && (
  <span className="ml-1 text-xs italic text-muted-foreground">(legado)</span>
)}
```

`@paperclipai/shared.ActivityEvent` (definição em `packages/shared/src/`) precisa adicionar `actionKey?: string | null; paramsJson?: Record<string, unknown> | null`. Verificar pattern (descoberta deferred — campo opcional, retrocompatível).

#### 5f. Activity dictionary `activity.json` bootstrap

```json
{
  "issue": {
    "created": "criou",
    "updated": "atualizou",
    "checked_out": "checou",
    "released": "liberou",
    "comment_added": "comentou em",
    "comment_cancelled": "cancelou comentário em fila em",
    "attachment_added": "anexou arquivo em",
    "attachment_removed": "removeu anexo de",
    "document_created": "criou documento em",
    "document_updated": "atualizou documento em",
    "document_deleted": "deletou documento de",
    "commented": "comentou em",
    "deleted": "deletou"
  },
  "agent": {
    "created": "criou",
    "updated": "atualizou",
    "paused": "pausou",
    "resumed": "retomou",
    "terminated": "terminou",
    "key_created": "criou chave de API para",
    "budget_updated": "atualizou orçamento de",
    "runtime_session_reset": "reiniciou sessão de"
  },
  "heartbeat": {
    "invoked": "invocou heartbeat para",
    "cancelled": "cancelou heartbeat para"
  },
  "approval": {
    "created": "solicitou aprovação",
    "approved": "aprovou",
    "rejected": "rejeitou"
  },
  "project": {
    "created": "criou",
    "updated": "atualizou",
    "deleted": "deletou"
  },
  "goal": {
    "created": "criou",
    "updated": "atualizou",
    "deleted": "deletou"
  },
  "cost": {
    "reported": "reportou custo para",
    "recorded": "registrou custo para"
  },
  "company": {
    "created": "criou empresa",
    "updated": "atualizou empresa",
    "archived": "arquivou",
    "budget_updated": "atualizou orçamento de"
  },
  "claude_account_rotated": "trocou conta Claude (de {{fromAccountName}} para {{toAccountName}}, motivo: {{reason}})"
}
```

### Anti-Patterns to Avoid

- **NÃO traduza "Paperclip"** — é o nome do produto. Brand string permanece literal mesmo em pt-BR.
- **NÃO mude o esquema de chaves para camelCase.** O detector regex em `missing-keys.test.ts:6` rejeita. Use kebab-case dot-notation.
- **NÃO traduza string templates literais em domínio técnico** (`tsx`, `json`, `https://...`, `uuid`).
- **NÃO mexa em `BreadcrumbBar.tsx` para traduzir labels de breadcrumb.** As labels vêm de `setBreadcrumbs([{ label: "..." }])` chamado pelas páginas — traduza na página.
- **NÃO faça data migration em activity_log.** Backwards-compat é resolvida em runtime no `ActivityRow.tsx` (entries sem `actionKey` usam fallback).
- **NÃO consolide tudo em `common.json`.** Respeite os 8 namespaces: keys de inbox em `inbox.json`, etc.
- **NÃO traduza tooltips inline em ações de tela core.** Adiado para Fase 9.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Pluralização | Funções `count === 1 ? "agent" : "agents"` no JSX | i18next built-in plurals (`heartbeats:company` + `heartbeats:company_plural`, com `t(key, { count })`) |
| Interpolação | Template literals `\`${name} criou\`` | `t("activity:issue.created", { name })` |
| Detector de keys ausentes | Walker AST custom | Já pronto em `ui/src/i18n/__tests__/missing-keys.test.ts` |
| Activity verb formatting | Manter string maps grandes em código | Mover para JSON dictionary; `formatActivityVerb` continua como FALLBACK |

**Key insight:** Toda a infraestrutura está pronta. Esta fase é grep + replace + JSON edit. A única peça nova-arquitetural é o schema de activity log.

## Runtime State Inventory

Esta é uma fase **principalmente aditiva** mas com **migration de schema**. Inventário:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | activity_log existente: ~? records (não auditado, banco prod). Coluna `action_key` será NULL para todos eles → fallback path no `ActivityRow.tsx` cobre. **Sem data migration.** | Nenhuma — coluna nullable, fallback em runtime |
| Live service config | None — i18next não tem config externa; activity log emit é puramente código | None |
| OS-registered state | None | None |
| Secrets / env vars | None | None |
| Build artifacts | `packages/db/dist/schema/activity_log.js` regenerado em `pnpm --filter @paperclipai/db build` (parte do workflow `db:generate`) | None — incidental |

**Verified:** Nenhum nome de coluna `action_key` ou `params_json` colide com schema existente (verificado por inspeção do diretório `packages/db/src/schema/`).

## Common Pitfalls

### Pitfall 1: Detector falha silenciosamente em strings dentro de objetos JS
**What goes wrong:** Strings extraídas para arrays/objetos JS literal (ex: `const projectStatuses = [{ value: "backlog", label: "Backlog" }, ...]` em `NewProjectDialog.tsx:42-48`) não são detectadas pelo regex `\bt\(` se não envolvidas em `t()`.
**How to avoid:** Mover labels para dentro de `t()` no JSX render, manter array só com values estáticos. Pattern recomendado:
```typescript
const projectStatusValues = ["backlog", "planned", "in_progress", "completed", "cancelled"] as const;
// na render:
{projectStatusValues.map((v) => (
  <Item key={v}>{t(`projects:status.${v.replace("_", "-")}`)}</Item>
))}
```

### Pitfall 2: Strings em `setBreadcrumbs` não traduzidas
**What goes wrong:** `Projects.tsx:22` faz `setBreadcrumbs([{ label: "Projects" }])` em `useEffect`. Se você apenas traduzir a tela de Projects mas esquecer o breadcrumb, o header mostra "Projects" (inglês) mesmo em pt-BR.
**How to avoid:** Inclua `setBreadcrumbs` no escopo de cada plano de superfície. Ex: Plano 08-02 (Projects) traduz tanto o conteúdo da página quanto o `setBreadcrumbs([{ label: t("projects:title") }])`. A dependência reactiva precisa de `[setBreadcrumbs, t]`.

### Pitfall 3: Toast strings com interpolação manual
**What goes wrong:** `ProjectDetail.tsx:339` faz `pushToast({ title: \`"${name}" has been archived\` })`. Tradução naive coloca a string em `t()` mas perde a interpolação:
```typescript
// ERRADO
pushToast({ title: t("projects:toast.archived") + ` "${name}"` });
// CERTO
pushToast({ title: t("projects:toast.archived", { name }) });
// JSON: "archived": "\"{{ name }}\" foi arquivado"
```

### Pitfall 4: Activity log fallback string idêntica em pt-BR e en-US (parece bug)
**What goes wrong:** Entries pré-Fase-8 (sem `actionKey`) caem em `formatActivityVerb()` que retorna string hardcoded em inglês. Em pt-BR o usuário vê "created the issue" + label "(legado)".
**How to avoid:** Documente claramente em UI: "(legado)" em itálico sinaliza que tradução não está disponível para entries antigos. Não tente traduzir o fallback (seria reescrever `activity-format.ts` completo, fora de escopo).

### Pitfall 5: Server callsites omitidos
**What goes wrong:** Plano 08-05 muda 36 callsites mas esquece um (ex: `services/recovery/service.ts`). Esse callsite continua emitindo só `action`, sem `actionKey` — UI cai em fallback "(legado)".
**How to avoid:** Plano 08-05 deve listar EXATAMENTE quais 36 callsites são prioritários e validar via grep `grep -rn "actionKey:" server/src/` que cada um foi tocado. Os 130+ não prioritários ficam para iteração futura (documentar em deferred).

### Pitfall 6: Vitest detector explode com 200+ keys faltando antes de qualquer tradução
**What goes wrong:** Você adiciona `t("inbox:title")` em Inbox.tsx; CI roda `pnpm test:run`; detector reporta 200+ keys faltando porque pt-BR/inbox.json e en-US/inbox.json estão `{}`.
**How to avoid:** Plano de cada superfície DEVE adicionar a key no JSON **no mesmo commit** em que adiciona o `t()` no código. Detector é não-bloqueante em dev mas bloqueante em CI (`process.env.CI`).

### Pitfall 7: Drizzle generate detecta rename ao invés de add column
**What goes wrong:** `pnpm --filter @paperclipai/db generate` ocasionalmente infere rename ambíguo se diff toca múltiplas colunas.
**How to avoid:** Inspecionar `0074_*.sql` antes do commit. Deve conter exatamente dois `ALTER TABLE "activity_log" ADD COLUMN`. Se aparecer `RENAME`, abortar.

## Code Examples

Padrões já demonstrados nas seções Pattern 0-5 acima (cabeçalho de componente, sub-tree namespace, render activity row, etc.).

Reuso canônico verificado: `ProfileSettings.tsx:26,307-329` — único exemplo "real" de `useTranslation` em produção atualmente.

## Open Questions

1. **`@paperclipai/shared.ActivityEvent` shape para `actionKey`/`paramsJson`?**
   - What we know: `ActivityEvent` é importado de `@paperclipai/shared` em `ActivityRow.tsx:7` e `Activity.tsx:3`. O tipo está em `packages/shared/src/`.
   - What's unclear: Se o tipo já é exportado com campos opcionais ou se precisa ser estendido.
   - Recommendation: Plano 08-05 inclui edição em `packages/shared/src/` para adicionar `actionKey?: string | null; paramsJson?: Record<string, unknown> | null`. Compatível retroativo.

2. **Quão profundo ir nos componentes de Inbox children?**
   - What we know: `Inbox.tsx` (2563 LOC) importa 14+ componentes auxiliares — alguns são profundamente compartilhados (ex: `IssuesList.tsx` é usado por Inbox AND ProjectDetail AND Issues page).
   - What's unclear: Se ao traduzir `IssuesList.tsx` no plano 08-01 (Inbox) já cobre o uso em ProjectDetail (08-02) e Issues page (Fase 9 ou Fase 8?).
   - Recommendation: `IssuesList.tsx` é shared component → plano 08-01 traduz **todo** o componente (não só o que Inbox usa). Custo marginal baixo, evita re-edição em 08-02. Documentar no plano 08-01 que a tradução cobre 3 superfícies (Inbox, ProjectDetail, Issues page).

3. **Plurals via i18next built-in: feature flag necessário?**
   - What we know: i18next 26.x suporta `_one`/`_other` (em pt-BR, regra Intl.PluralRules é `one` / `other` — singular vs. plural).
   - What's unclear: Se o init em `ui/src/i18n/index.ts` já expõe a feature ou precisa de config explícita.
   - Recommendation: i18next 26 default config tem plurals habilitados (`compatibilityJSON: "v4"` é o default). Sem mudança de init; usar diretamente. Validar empíricamente no primeiro plano que precisar (Settings tem `{count} agents`/`company`/`companies`).

## Environment Availability

Sem novas dependências externas. Tudo herdado da Fase 7.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22+ | Build, dev | ✓ | 22+ | — |
| pnpm | Workspace | ✓ | 9.15.4 | — |
| Vitest | Detector + RTL tests | ✓ | 3.0.5 | — |
| i18next | Translation runtime | ✓ | 26.0.8 (instalado Fase 7) | — |
| react-i18next | React bindings | ✓ | 17.0.4 (instalado Fase 7) | — |
| Drizzle Kit | Migration generate (08-05) | ✓ | 0.31.9 | — |
| GitHub Actions db-migrate.yml | Apply migration `0074` | ✓ | Operacional | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.0.5 (UI workspace) + Vitest 3.0.5 (server workspace) |
| Config files | `ui/vitest.config.ts`, `server/vitest.config.ts` (existing) |
| Quick run command (UI) | `pnpm --filter @paperclipai/ui test:run` |
| Quick run command (server) | `pnpm --filter @paperclipai/server test:run` |
| Full suite | `pnpm test:run && pnpm -r typecheck` |
| Detector vitest custom | `ui/src/i18n/__tests__/missing-keys.test.ts` (Fase 7) — bloqueante em CI; warn em dev |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Toda string visível em Inbox passa por `t()` | unit (detector) | `pnpm --filter @paperclipai/ui test:run -- missing-keys` (existente) | ✅ Fase 7 — apenas validar passing após edits |
| UI-01 | Inbox renderiza pt-BR completo após `i18n.changeLanguage("pt-BR")` | HUMAN-UAT | UAT-08-01: trocar para pt-BR, abrir `/inbox`, scan visual por strings em inglês | ❌ N/A (manual) |
| UI-02 | Toda string visível em Projects passa por `t()` | unit (detector) | mesma command | ✅ Fase 7 |
| UI-02 | Projects renderiza pt-BR completo | HUMAN-UAT | UAT-08-02: pt-BR ativo, abrir `/projects`, criar projeto, abrir detalhe | ❌ N/A (manual) |
| UI-03 | Toda string visível em Settings passa por `t()` | unit (detector) | mesma command | ✅ Fase 7 |
| UI-03 | Settings renderiza pt-BR completo | HUMAN-UAT | UAT-08-03: pt-BR ativo, abrir `/instance/settings/{profile,general,heartbeats,experimental}` | ❌ N/A (manual) |
| UI-05 | Toda string visível em nav passa por `t()` | unit (detector) | mesma command | ✅ Fase 7 |
| UI-05 | Nav (sidebar/breadcrumbs/header/menu) renderiza pt-BR | HUMAN-UAT | UAT-08-04: pt-BR ativo, observar sidebar, abrir user menu, ver breadcrumbs em todas as pages | ❌ N/A (manual) |
| UI-09 | Server emite `actionKey + paramsJson` em activity_log | integration (supertest) | criar issue → buscar activity_log row → assert `action_key === "issue.created"`, `params_json !== null` | ❌ Wave 0 — `server/src/__tests__/activity-log-emit-with-key.test.ts` |
| UI-09 | UI ActivityRow renderiza via t() quando actionKey presente | unit (RTL) | render `<ActivityRow event={mockEvent({ actionKey: "issue.created", paramsJson: {} })}>` → assert verb traduzido em pt-BR | ❌ Wave 0 — `ui/src/components/__tests__/ActivityRow.actionKey.test.tsx` |
| UI-09 | UI ActivityRow renderiza fallback (com "(legado)") quando actionKey ausente | unit (RTL) | render com `actionKey: null` → assert `"(legado)"` aparece + verb fallback string | ❌ Wave 0 — incluído no test acima |
| UI-09 | Migration `0074` aplica idempotente | integration (db) | rodar migration em DB de teste, verificar colunas existem; rodar 2x e não falhar | ❌ Wave 0 (já pattern existente em `db-migrate.yml`) |

### HUMAN-UAT (não-automatizável — visual UI verification)

| UAT ID | Behavior | Steps |
|--------|----------|-------|
| UAT-08-01 | Inbox 100% pt-BR | (1) login → settings → trocar para pt-BR; (2) navegar para `/inbox`; (3) varrer visualmente: tabs, filtros, categories dropdown, search placeholder, items, empty state, "Mark all as read?" modal; (4) sem nenhuma string em inglês visível |
| UAT-08-02 | Projects 100% pt-BR | (1) pt-BR ativo; (2) abrir `/projects`; (3) abrir "Adicionar projeto" dialog → preencher → criar; (4) abrir detalhe do projeto criado → tabs, configuration, budget; (5) sem string em inglês |
| UAT-08-03 | Settings 100% pt-BR | (1) pt-BR ativo; (2) abrir `/instance/settings/profile` (já parcialmente em pt-BR da Fase 7); (3) `/instance/settings/general` — todas seções (deployment, censor, shortcuts, backup, feedback, sign out); (4) `/instance/settings/heartbeats`; (5) `/instance/settings/experimental`; (6) sem string em inglês |
| UAT-08-04 | Nav 100% pt-BR | (1) pt-BR ativo; (2) sidebar — todos itens, sections "Trabalho"/"Empresa", "Nova tarefa" botão, badges; (3) abrir user menu — todos items + descriptions; (4) breadcrumbs em todas as páginas visitadas (Inbox, Projects, Settings, etc.); (5) mobile bottom nav (em viewport mobile); (6) sem string em inglês |
| UAT-08-05 | Activity log renderiza traduzido para entries novas e mostra "(legado)" para antigas | (1) pt-BR ativo; (2) abrir `/activity`; (3) ver mistura: entries antes da migration `0074` mostram "(legado)" em itálico ao lado do verb em inglês; entries novas (criar uma issue durante o teste) mostram verb em pt-BR sem "(legado)"; (4) confirmar via DevTools que entries novas têm `action_key !== null` e antigas têm `action_key === null` |

### Sampling Rate
- **Per task commit:** `pnpm --filter @paperclipai/ui test:run -- missing-keys` (rápido, < 5s)
- **Per wave merge:** `pnpm test:run && pnpm -r typecheck`
- **Phase gate:** Full suite green + UAT-08-01..05 manualmente verificados pelo operador

### Wave 0 Gaps

- [ ] `packages/db/src/migrations/0074_add_activity_action_key.sql` — gerada via Drizzle
- [ ] `packages/db/src/schema/activity_log.ts` — adicionar `actionKey` + `paramsJson` columns
- [ ] `packages/shared/src/` — estender `ActivityEvent` type com campos opcionais
- [ ] `server/src/services/activity-log.ts` — estender `LogActivityInput`, insert, live event payload
- [ ] `server/src/__tests__/activity-log-emit-with-key.test.ts` — covers UI-09 (server emit)
- [ ] `ui/src/components/__tests__/ActivityRow.actionKey.test.tsx` — covers UI-09 (client render + fallback)
- [ ] Bootstrap initial keys nos JSON dicts: cada plano de superfície adiciona suas keys (08-01..08-04)
- [ ] Activity dictionary `pt-BR/activity.json` + `en-US/activity.json` — popular com 36 actions prioritários

## Sources

### Primary (HIGH confidence)
- `.planning/phases/08-traducao-ui-core/08-CONTEXT.md` — todas as decisões locked
- `.planning/REQUIREMENTS.md:28-36` — UI-01..UI-09 spec
- `.planning/phases/07-foundation-i18n-toggle-de-settings/07-RESEARCH.md` — patterns 1-7
- `ui/src/i18n/index.ts:1-37` — i18next init, fallback `en-US`, `lng: "pt-BR"`, non-Suspense
- `ui/src/i18n/resources.ts:1-48` — 8 namespaces × 2 locales = 16 dicts
- `ui/src/i18n/i18next.d.ts:1-9` — TypeScript module augmentation
- `ui/src/i18n/__tests__/missing-keys.test.ts:6` — regex `\bt\(\s*["'\`]([a-z0-9.\-]+(?::[a-z0-9.\-]+)?)["'\`]/g`
- `ui/src/main.tsx:45` — Provider order (I18nextProvider dentro de QueryClient, fora de Theme)
- `ui/src/pages/ProfileSettings.tsx:26,307-329` — único callsite real `useTranslation` em produção
- `ui/src/i18n/locales/pt-BR/common.json` — bootstrap stub (Paperclip da Equipe, Carregando…, Salvar, Cancelar)
- `ui/src/i18n/locales/pt-BR/settings.json` — language.* sub-tree existente
- `ui/src/lib/activity-format.ts:24-63` — 36 actions com formatter UI legado (lista canônica para 08-05 priorização)
- `ui/src/components/ActivityRow.tsx:31` — render path atual via `formatActivityVerb`
- `ui/src/pages/Activity.tsx:46-160` — render de lista
- `packages/db/src/schema/activity_log.ts:1-26` — schema atual
- `packages/db/src/migrations/0073_add_user_locale.sql` — última migration (referência de sequência)
- `server/src/services/activity-log.ts:80-146` — `LogActivityInput` shape + `logActivity` impl
- `ui/src/pages/Inbox.tsx:1-2563` — superfície maior; samples grep:278,292,1881,2034,2067-2090
- `ui/src/pages/Projects.tsx:1-87` — Projects list (87 LOC, simples)
- `ui/src/pages/ProjectDetail.tsx:1-712` — Projects detail
- `ui/src/components/NewProjectDialog.tsx:42-48,153,157,219-444` — strings em arrays JS + literais JSX
- `ui/src/pages/InstanceGeneralSettings.tsx:34,67,75,86-368` — superfície de Settings maior
- `ui/src/pages/InstanceSettings.tsx:36-280` — Heartbeats settings
- `ui/src/components/Sidebar.tsx:80-118` — labels nav passados via prop
- `ui/src/components/InstanceSidebar.tsx:20,26-32` — instance settings nav
- `ui/src/components/SidebarAccountMenu.tsx:131-249` — user menu strings
- `ui/src/components/BreadcrumbBar.tsx:71` — único string aria-label; labels vêm das páginas
- grep `logActivity` em `server/src/` — 31 production callsites (lista completa em 5d)
- grep `action: "..."` em `server/src/` — 169 distinct action strings

### Secondary (MEDIUM confidence)
- Estimativas de string density por arquivo derivadas de heurística regex `'"[A-Z][^"]{2,}"|>[A-Z][a-z]+ [a-z]+'` — captura JSX texto e props string mas pode subcontagem em strings com lowercase initial ou false-positives em CSS classes. Use como ordem de magnitude, não como contagem exata.

### Tertiary (LOW confidence)
- Nenhum.

## Metadata

**Confidence breakdown:**
- File paths and line numbers: HIGH — todos verificados via Read direto.
- String density estimates: MEDIUM — heurística regex, ordem de magnitude correta mas margem ±20%.
- Activity log refactor strategy: HIGH — schema diff trivial, render path mapeado em 2 funções (`formatActivityVerb`, `ActivityRow`), backwards-compat resolvida em runtime sem data migration.
- Plan granularity (5 planos): HIGH — confirmada por CONTEXT.md, arquivos disjuntos exceto pelos JSON dicts.
- 36-action priorização (subset de 169): HIGH — lista canônica vem de `activity-format.ts:24-63` que é o ÚNICO formatter atual.

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 dias; padrões i18next/Drizzle estáveis; UI surfaces podem ganhar novas strings antes do plano executar — re-grep necessário no momento da execução de cada plano)
