# Fase 8: Tradução UI Core - Contexto

**Coletado:** 2026-04-26
**Status:** Pronto para planejamento
**Modo:** Decisões tomadas em modo autônomo (auto mode); operador aceitou recomendações em uma rodada

<domain>
## Limite da Fase

Traduzir as superfícies UI de maior tráfego do paperclip para pt-BR e en-US, usando a fundação i18n entregue na Fase 7:

- **Inbox** — lista de items, filtros, ações em massa, estados vazios, contadores
- **Projects** — lista, criação, detalhes, edição, dialog de criação
- **Settings** — todas as seções (incluindo idioma já tocada na Fase 7), Profile, Claude accounts
- **Navegação** — sidebar, header, menus, breadcrumbs, user menu (logout/account)
- **Activity log** — templates de entrada renderizados por chave + params (nova convenção schema)

**Fora desta fase:**
- Telas admin/company (membros, roles, cost summary, rotation history) → Fase 9 (UI-04)
- Formulários auth (login/signup/reset/invite) → Fase 9 (UI-06)
- Mensagens de erro / validação / API responses → Fase 9 (UI-07)
- Tooltips / empty states sistêmicos / modais de confirmação / toasts → Fase 9 (UI-08)
- Mensagens dos agentes ao usuário (status, summaries) → Fase 10
- System prompts dos agentes → Fase 11

</domain>

<decisions>
## Decisões de Implementação

### Estratégia de Extração
- **Manual via grep + edição inline.** Não adotar i18next-parser (deprecated 2026-02 per RESEARCH Fase 7) ou ferramenta automatizada. O detector vitest custom (Fase 7 — `ui/src/i18n/__tests__/missing-keys.test.ts`) protege contra regressões.
- Para cada superfície, executor faz: `grep -rn "literal-string" caminho/da/superficie/` → identifica strings hardcoded → substitui por `t("ns.key")` → adiciona key ao dicionário pt-BR e en-US correspondente.
- Strings dinâmicas com interpolação trivial: `t("inbox.greeting", { name })`.
- Strings dinâmicas complexas (templates compostos, condicionais, pluralização): adicionar TODO `// i18n: review — complex template` e cobrir o caso simples; refatoração agressiva fica para v2 (L10N-03).

### Granularidade de Plano
- **Um plano por superfície UI.** Permite execução paralela onde os arquivos são disjuntos.
  - Plano 08-01: Inbox (UI-01)
  - Plano 08-02: Projects (UI-02)
  - Plano 08-03: Settings (UI-03)
  - Plano 08-04: Navegação (UI-05) — sidebar, header, menus, breadcrumbs
  - Plano 08-05: Activity log (UI-09) — schema `actionKey + paramsJson` + `ActivityEntry` renderer + backwards-compat

### Activity Log: Schema e Render
- **Server emite `actionKey + paramsJson`** em activity_log entries (campo `action` mantém compat — vira fallback).
  - Ex: novo entry `{ action: "agent.swap_account", actionKey: "activity.agent.swap-account", paramsJson: { fromAccount, toAccount } }`.
  - Migração Drizzle adiciona colunas `actionKey: text NULL` + `paramsJson: jsonb NULL` em `activity_log`.
  - Migration ID estimado: `0074_add_activity_action_key.sql` (continua sequência da `0073` da Fase 7).
- **Client renderiza via `t(actionKey, paramsJson)`.** Componente `ActivityEntry` (UI) busca `actionKey` primeiro; se ausente (entries pré-Fase-8), usa `action` raw + label "[unstranslated legacy]".
- **Backwards-compat:** Existing entries com `action` apenas (sem `actionKey`) renderizam o `action` raw com display "(legado)" em itálico. Sem necessidade de data migration.

### Cobertura Per-Surface
- **Empty states / loading states** das telas core (inbox empty, projects empty, settings loading) — INCLUIR.
- **Componentes filhos profundos** das telas core (TaskItem, ProjectCard, FilterPanel, BulkActions) — INCLUIR (são parte da superfície "core").
- **Modais e dialogs** das telas core (CreateProjectDialog, RenameTaskDialog) — INCLUIR.
- **Tooltips inline em ações** das telas core (hover em ícones de ação) — DEFER para Fase 9 (UI-08); são parte do conjunto "tooltips" ortogonal.

### Navegação e Branding
- **"Paperclip" como produto** = hardcoded brand string, não traduzível. Documentado em CONTEXT.
- **User menu** (Profile, Settings, Logout) — traduzido via namespace `common`.
- **Sidebar items com badges/counts numéricos** — labels traduzidos; números preservados (`Intl.NumberFormat` virá em v2 L10N-02).
- **Breadcrumbs dinâmicos** com nomes de entidades (project name, task title) — passthrough do nome literal; estrutura traduzida (`t("nav.crumbs.project")` para o segmento "Projeto").

### Discrição do Claude
- Granularidade de keys (sub-namespaces dentro de cada arquivo JSON) a critério.
- Ordem de tradução das strings dentro de cada superfície a critério.
- Strings que aparentemente são copy mas pertencem a domínio técnico (ex: "tsx", "json", "uuid") deixam intactas.
- Componentes de design system reusáveis (Button, Modal, Spinner) com props `label/title/aria-label` recebem traduções via consumidores.

</decisions>

<code_context>
## Insights do Código Existente

### Fundação i18n (Fase 7)
- `ui/src/i18n/index.ts` — singleton i18next com 8 namespaces, fallback en-US, default pt-BR
- `ui/src/i18n/resources.ts` — static imports de 16 dicionários
- `ui/src/i18n/i18next.d.ts` — type augmentation: chaves auto-completam via `t("ns.path")`
- `ui/src/i18n/__tests__/missing-keys.test.ts` — detector que falha CI se chave usada em código não existir no dicionário
- `ui/src/main.tsx` — I18nextProvider entre QueryClient e Theme; session-driven hydration

### Padrões para Tradução
- `useTranslation(["inbox", "common"])` em componentes; default ns inferido por contexto (página) ou explícito.
- Chaves novas: adicionar em ambos `pt-BR/<ns>.json` e `en-US/<ns>.json` no mesmo commit; missing-keys.test garante.
- Activity log existente: `server/src/services/activity-log.ts` — função `logActivity` aceita `action: string` + `details: object`. Estender para opcionalmente aceitar `{ action, actionKey, params }`.

### Pontos de integração
- Inbox: `ui/src/pages/Inbox.tsx` (procurar) + componentes em `ui/src/components/inbox/`
- Projects: `ui/src/pages/Projects.tsx` ou `ui/src/pages/ProjectList.tsx` + `ui/src/components/projects/`
- Settings: `ui/src/pages/Settings.tsx`, `ProfileSettings.tsx` (já tem Language section), `CompanySettings.tsx`
- Nav: `ui/src/components/layout/Sidebar.tsx`, `Header.tsx`, `Breadcrumbs.tsx` (procurar)
- Activity: `ui/src/components/activity/ActivityEntry.tsx` ou similar (procurar via grep `activity_log`)

</code_context>

<specifics>
## Ideias Específicas

- **A maioria das strings já existe em inglês** no paperclip vanilla. Tradução é "extract → key → translate", não "redesign".
- **Termo "Paperclip"** é o nome do produto; não traduzir.
- **Activity log é a integração mais complexa** desta fase porque envolve schema DB (migration) + server emit + client render + backwards-compat.

</specifics>

<deferred>
## Ideias Adiadas

- Tooltips inline em ações de tela core → Fase 9 (UI-08, junto com tooltips/empty states sistêmicos/modais/toasts gerais).
- Refatoração de strings concatenadas complexas para ICU MessageFormat → v2 (L10N-03).
- `Intl.NumberFormat` / `Intl.DateTimeFormat` por locale → v2 (L10N-02).
- Tradução de admin/company UI (UI-04) → Fase 9.
- Tradução de auth forms (UI-06) → Fase 9.

</deferred>
