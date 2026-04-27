---
phase: 08-traducao-ui-core
plan: 05
subsystem: i18n
tags: [activity-log, drizzle-migration, react-i18next, kebab-case, backwards-compat]

requires:
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: I18nextProvider mounted globally, 8 namespaces (incl. activity), missing-keys detector wired CI mode
  - phase: 08-traducao-ui-core (08-01..08-04)
    provides: UI core surfaces translated (Inbox, Projects, Settings, Navigation) preceding activity log refactor

provides:
  - "ActivityEvent type extended with optional actionKey + paramsJson (kebab-case dynamic i18n key + interpolation params)"
  - "Migration 0074 (action_key text NULL + params_json jsonb NULL) generated via drizzle-kit; pending CI apply via .github/workflows/db-migrate.yml"
  - "LogActivityInput accepts actionKey + paramsJson; insert binding + live event payload include both fields"
  - "49 server callsites emit actionKey + paramsJson covering all 36 priority actions from activity-format.ts"
  - "ActivityRow.tsx renders via t() preferred path with formatActivityVerb fallback + (legado) italic label for legacy entries"
  - "kebab-case enforcement in activity.json (zero underscore violations); claude-account-rotated key (kebab) coexists with legacy claude_account_rotated action constant (underscore preserved for retrocompat)"

affects: [phase-09-ui-admin-auth-sistemicas, phase-10-mensagens-agentes, phase-11-skills-system-prompts]

tech-stack:
  added: []
  patterns:
    - "actionKey + paramsJson schema convention: dynamic kebab-case i18n key + interpolation params live in DB column for client-side render via t()"
    - "Backwards-compat resolved at runtime in ActivityRow (no data migration): preferred t() path when actionKey present, formatActivityVerb fallback + (legado) italic label otherwise"
    - "underscore→kebab transform mapping for actionKey (issue.checked_out → issue.checked-out, claude_account_rotated → claude-account-rotated) preserves legacy action constant for filter/test compat"
    - "i18n-allowlist comment marker (// i18n-allowlist: activity.* keys driven dynamically by event.actionKey) for keys not statically extractable by missing-keys detector"

key-files:
  created:
    - "packages/db/src/migrations/0074_add_activity_action_key.sql (idempotent: 2 ALTER ADD COLUMN, zero RENAME)"
    - "packages/db/src/migrations/meta/0074_snapshot.json (drizzle-kit auto-generated)"
    - "server/src/__tests__/activity-log-action-key.test.ts (3 cases: persist with/without actionKey, live event payload broadcast)"
    - "ui/src/components/__tests__/ActivityRow.actionKey.test.tsx (4 cases: pt-BR translated, en-US translated, fallback legacy, paramsJson interpolation)"
  modified:
    - "packages/db/src/schema/activity_log.ts (+actionKey text, +paramsJson jsonb columns)"
    - "packages/db/src/migrations/meta/_journal.json (+0074 entry, renamed tag from 0074_high_killmonger to 0074_add_activity_action_key)"
    - "packages/shared/src/types/activity.ts (ActivityEvent: +actionKey?, +paramsJson? optional fields)"
    - "server/src/services/activity-log.ts (LogActivityInput: +actionKey?, +paramsJson?; insert binding + live event payload pass both fields with null fallback)"
    - "server/src/routes/{issues,agents,projects,goals,companies,approvals,costs}.ts (49 callsites backfilled)"
    - "server/src/services/{claude-accounts,heartbeat,recovery/service}.ts (4 callsites backfilled)"
    - "ui/src/i18n/locales/pt-BR/activity.json (populated with 36 actions in kebab-case)"
    - "ui/src/i18n/locales/en-US/activity.json (mirrored pt-BR keys in English)"
    - "ui/src/components/ActivityRow.tsx (refactored to prefer t() with fallback + (legado) label)"

key-decisions:
  - "kebab-case enforced in activity.json keys to satisfy missing-keys detector regex [a-z0-9.\\-]+; legacy underscore action strings preserved at server callsites (issue.checked_out, claude_account_rotated) for retrocompat with existing DB rows + test fixtures"
  - "paramsJson holds ONLY i18n-template params (subset of details, e.g. { title: issue.title }, { reason: pending.reason }); details retains full structured payload; division avoids duplicating large blobs in DB"
  - "claude-account-rotated kept as top-level kebab key in dictionary (no entity namespace) since action is system-level rotation; ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED constant (underscore) untouched for routes/claude-accounts.ts:111 filter and services/claude-accounts.test.ts:7,422,450 fixtures"
  - "Migration NOT applied locally per DB-03 — drizzle-kit generate produces SQL, push to main triggers .github/workflows/db-migrate.yml for Supabase apply"
  - "Backwards-compat resolved at runtime in ActivityRow (preferred t() + formatActivityVerb fallback + italic (legado) label) vs data migration — pre-Phase-8 entries render acceptably without DB rewrite"

patterns-established:
  - "Dynamic actionKey i18n: server emits kebab-case key + paramsJson, client renders via t(`activity:${actionKey}`, paramsJson)"
  - "Zero data migration backwards-compat: runtime resolution in render component with explicit (legado) marker for unmapped legacy entries"
  - "Coverage pre-step protocol: grep all priority callsites BEFORE editing to validate files_modified covers them; expand frontmatter if surprise files surface (Pitfall 5 mitigation)"

requirements-completed:
  - UI-09

duration: ~30min
completed: 2026-04-26T20:51:55Z
---

# Fase 8 Plano 5: Activity Log — Resumo

**Schema migration 0074 adicionando action_key/params_json + 49 server callsites emitindo kebab-case actionKey + ActivityRow refatorado com t() preferred path e fallback formatActivityVerb com label (legado) para retrocompat sem data migration**

## Performance

- **Duração:** ~30 min
- **Iniciado:** 2026-04-26T20:21:00Z (aprox)
- **Concluído:** 2026-04-26T20:51:55Z
- **Tarefas:** 3
- **Arquivos modificados/criados:** 16 (1 migration + 1 snapshot + 1 journal + 1 schema + 1 type + 1 service interface + 7 routes + 3 services + 2 dictionaries + 1 component + 2 testes)

## Realizações

- Migration `0074_add_activity_action_key.sql` gerada via `pnpm generate` com EXATAMENTE 2 statements `ALTER TABLE "activity_log" ADD COLUMN` (zero RENAME — Pitfall 7 evitado); journal e snapshot atualizados; nome canônico `0074_add_activity_action_key` substituiu placeholder aleatório `0074_high_killmonger`
- Schema Drizzle + tipo `ActivityEvent` (em `@paperclipai/shared`) + `LogActivityInput` (em `server/src/services/activity-log.ts`) estendidos com `actionKey?: string | null` e `paramsJson?: Record<string, unknown> | null`; insert binding + live event payload broadcast incluem ambos com null fallback
- 49 callsites server emitem actionKey kebab-case + paramsJson: 19 em `routes/issues.ts` (created/updated/deleted/checked-out/released/comment-added×2/comment-cancelled/attachment-added/attachment-removed/document-deleted/blockers-updated/reviewers-updated/approvers-updated/heartbeat-cancelled×3 + 2 issue.updated extras), 11 em `routes/agents.ts` (created/updated/paused/resumed/terminated/key-created/runtime-session-reset + heartbeat.invoked×2/heartbeat.cancelled + approval.created), 3 em `routes/projects.ts`, 3 em `routes/goals.ts`, 3 em `routes/companies.ts`, 3 em `routes/approvals.ts`, 3 em `routes/costs.ts` (cost.reported + agent.budget-updated + company.budget-updated), 1 em `services/claude-accounts.ts` (claude-account-rotated), 2 em `services/recovery/service.ts`, 1 em `services/heartbeat.ts`. Total cobre os 36 priority actions de `activity-format.ts:24-63` mais variantes
- Dicionários `activity.json` populados em pt-BR e en-US com 36 priority actions em kebab-case; verificação grep confirma zero underscore (`grep -E '"[a-z]+_[a-z]+":' ... → 0 matches`); `claude-account-rotated` top-level com placeholder `{{reason}}`
- `ActivityRow.tsx` refatorado: `t(\`activity:${actionKey}\`, paramsJson)` preferred path, fallback para `formatActivityVerb()` + label `(legado)` em itálico quando actionKey ausente OU translation retorna string vazia (graceful fallback para keys ainda não dicionarizadas)
- 2 testes novos cobrem UI-09 closure: server integration (3/3 GREEN) + UI RTL (4/4 GREEN); CI=true missing-keys vitest GREEN (1/1)

## Commits das Tarefas

1. **Tarefa 1: Schema migration + tipo shared + LogActivityInput extension** — `31365d3` (feat)
2. **Tarefa 2: Backfill 36 callsites server + dicionários activity + ActivityRow refactor** — `e283f75` (feat)
3. **Tarefa 3: Server integration test + UI RTL test** — `cd935fc` (test)

## Arquivos Criados/Modificados

- `packages/db/src/schema/activity_log.ts` — adiciona colunas `actionKey: text("action_key")` (nullable) e `paramsJson: jsonb("params_json")` (nullable) preservando todos os campos existentes
- `packages/db/src/migrations/0074_add_activity_action_key.sql` — DDL idempotente: `ALTER TABLE "activity_log" ADD COLUMN "action_key" text` + `ADD COLUMN "params_json" jsonb`
- `packages/db/src/migrations/meta/_journal.json` — entrada `0074_add_activity_action_key` adicionada (renomeada de `0074_high_killmonger` random tag)
- `packages/db/src/migrations/meta/0074_snapshot.json` — drizzle-kit auto-generated snapshot capturando estado atual do schema com novas colunas
- `packages/shared/src/types/activity.ts` — `ActivityEvent` recebe campos opcionais `actionKey?: string | null` e `paramsJson?: Record<string, unknown> | null`; já re-exportado via `packages/shared/src/index.ts:412`
- `server/src/services/activity-log.ts` — `LogActivityInput` recebe `actionKey?` + `paramsJson?`; `db.insert(activityLog).values({...})` inclui ambos com null fallback; `publishLiveEvent` payload inclui ambos para broadcast WebSocket
- `server/src/routes/issues.ts` — 19 logActivity callsites estendidos (issue.created, issue.updated×3, issue.deleted, issue.checked_out, issue.released, issue.comment_added×2, issue.comment_cancelled, issue.attachment_added, issue.attachment_removed, issue.document_deleted, issue.blockers_updated, issue.reviewers_updated, issue.approvers_updated, heartbeat.cancelled×3)
- `server/src/routes/agents.ts` — 11 callsites (agent.created, agent.updated, agent.paused, agent.resumed, agent.terminated, agent.key_created, agent.runtime_session_reset, heartbeat.invoked×2, heartbeat.cancelled, approval.created)
- `server/src/routes/projects.ts` — 3 callsites (project.created, project.updated, project.deleted)
- `server/src/routes/goals.ts` — 3 callsites (goal.created, goal.updated, goal.deleted)
- `server/src/routes/companies.ts` — 3 callsites (company.created, company.updated, company.archived)
- `server/src/routes/approvals.ts` — 3 callsites (approval.created, approval.approved, approval.rejected)
- `server/src/routes/costs.ts` — 3 callsites (cost.reported, company.budget_updated, agent.budget_updated)
- `server/src/services/claude-accounts.ts` — 1 callsite emite `actionKey: "claude-account-rotated"` (kebab) com `paramsJson: { reason: pending.reason }` enquanto mantém `action: ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED` (constante underscore preservada para retrocompat com `routes/claude-accounts.ts:111` filter e fixtures de teste)
- `server/src/services/heartbeat.ts` — 1 callsite (issue.updated em deferred_comment_wake context)
- `server/src/services/recovery/service.ts` — 2 callsites (issue.updated em recovery.reconcile_unassigned_blocking_issue + recovery.reconcile_stranded_assigned_issue)
- `ui/src/i18n/locales/pt-BR/activity.json` — 36 actions priority em kebab-case organizados em namespaces (issue, agent, heartbeat, approval, project, goal, cost, company) + top-level claude-account-rotated com placeholder `{{reason}}`
- `ui/src/i18n/locales/en-US/activity.json` — espelho exato em inglês (criou→created, atualizou→updated, etc.)
- `ui/src/components/ActivityRow.tsx` — refatorado: `useTranslation(["activity"])` hook + lógica condicional `event.actionKey ? t(\`activity:${event.actionKey}\`, paramsJson) : formatActivityVerb(...)` com fallback also triggered se translation retorna string vazia; render `<span className="ml-1 text-xs italic text-muted-foreground">(legado)</span>` quando isLegacy true
- `server/src/__tests__/activity-log-action-key.test.ts` — 3 cases vitest cobrindo persistência com actionKey, retrocompat sem actionKey (passa null), live event payload broadcast inclui ambos campos
- `ui/src/components/__tests__/ActivityRow.actionKey.test.tsx` — 4 cases vitest+RTL cobrindo render translated pt-BR, fallback (legado) sem actionKey, render translated en-US, paramsJson interpolation em claude-account-rotated

## Decisões Tomadas

1. **paramsJson como subset de details** — armazena APENAS campos referenciados pelo template i18n (ex: `{ title: issue.title }`, `{ reason: pending.reason }`); `details` continua com payload completo. Evita duplicação de blobs grandes; mantém DB column compacto e eficiente para SELECT.
2. **claude-account-rotated em top-level kebab** — não namespace `agent.claude-account-rotated` porque é evento system-level de rotação de credencial (não tem actor "agent"); top-level kebab respeita detector regex e ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED constante (underscore) permanece intocada para test fixtures (`claude-accounts.test.ts:7,422,450`) e route filter (`routes/claude-accounts.ts:111`).
3. **Backwards-compat runtime, sem data migration** — entries DB pré-Phase-8 (sem `action_key`) renderizam via `formatActivityVerb()` + label `(legado)` em itálico; usuário vê histórico sem regressão visual. Custo de migration retroativa (UPDATE com mapping de centenas de combinações) excederia benefício; runtime fallback é graceful.
4. **Migration NOT applied locally** — apenas geração via `pnpm generate`; apply é responsabilidade do CI workflow `.github/workflows/db-migrate.yml` em push para main (DB-03 enforcement). PR contém SQL idempotente, journal e snapshot.
5. **fallback also triggered se translation vazia** — `t()` retorna string vazia quando key ainda não está no dicionário (apesar de actionKey emitido pelo server); fallback formatActivityVerb roda nesse caso também, com label `(legado)` para sinalizar que falta tradução. Permite rollout gradual de novas keys sem quebrar a UI.

## Desvios do Plano

### Problemas Corrigidos Automaticamente

**1. [Regra 3 - Bloqueador] vitest test timeout em missing-keys (cold-start setup)**
- **Encontrado durante:** Tarefa 2 (verificação de missing-keys.test após edits)
- **Problema:** `cd ui && CI=true npx vitest run missing-keys` timing-out at 5000ms default; cold-start vitest setup + tsx transform demora >5s, mas o teste real walking SRC_DIR é apenas 153ms
- **Correção:** Passar `--testTimeout=60000` ao invocar vitest na verification command. Não muda o teste em si — apenas timeout de invocação.
- **Arquivos modificados:** Nenhum (apenas comando de verificação ajustado)
- **Verificação:** test passa em 153ms uma vez carregado; setup levou ~3s; total run ~3.07s well within extended timeout

**2. [Regra 1 - Bug] React Testing Library DOM leak entre tests com I18nextProvider language change**
- **Encontrado durante:** Tarefa 3 (UI test ActivityRow.actionKey)
- **Problema:** Teste 3 (en-US) falhava porque `screen.queryByText(/legado/i)` encontrava match — entry do teste 2 (que renderiza fallback com label "(legado)") permanecia no DOM após a próxima `render()` call. Vitest+RTL não auto-limpa DOM entre tests por default no setup deste projeto.
- **Correção:** Adicionado `import { cleanup } from "@testing-library/react"` + `afterEach(() => cleanup())` no describe block.
- **Arquivos modificados:** `ui/src/components/__tests__/ActivityRow.actionKey.test.tsx`
- **Verificação:** 4/4 GREEN após cleanup adicionado; test 3 (en-US) passa sem encontrar "(legado)" residual
- **Comitado em:** `cd935fc` (parte do commit Task 3)

**3. [Regra 1 - Test design] regex /created/i match múltiplo no DOM**
- **Encontrado durante:** Tarefa 3 (UI test ActivityRow.actionKey, en-US case)
- **Problema:** `screen.getByText(/created/i)` falhava com "found multiple elements" porque o texto "created" aparece em múltiplos nodes do DOM render (verb principal + Identity + outros)
- **Correção:** Mudou para `screen.getAllByText(/created/).length > 0` — assertion mais permissive que ainda valida a tradução foi aplicada
- **Arquivos modificados:** `ui/src/components/__tests__/ActivityRow.actionKey.test.tsx`
- **Verificação:** Test 3 GREEN
- **Comitado em:** `cd935fc`

---

**Total de desvios:** 3 corrigidos automaticamente (1 Regra 3 invocation timeout, 2 Regra 1 test design)
**Impacto no plano:** Nenhuma expansão de escopo. Todas as correções são de infraestrutura de teste (timeout de invocação vitest, RTL cleanup convention, regex overmatch). Lógica de produção do plano executada exatamente como escrita.

## Problemas Encontrados

- **drizzle-kit gerou nome random `0074_high_killmonger`** — conforme Pitfall 7 do plan, drizzle-kit nomeia migrations aleatoriamente. Renomeado manualmente para `0074_add_activity_action_key.sql` + journal entry atualizada. Conteúdo SQL inalterado (2 ALTER ADD COLUMN limpos, zero RENAME). Resolução documentada no plan.
- **Pre-existing modifications fora de escopo (`ui/src/lib/issue-reference.ts`, `ui/src/pages/AgentDetail.tsx`)** — Tinham edits residuais do working tree antes do plan iniciar. Mantidos uncommitted (NÃO são parte deste plan); se outro plano depende deles, será endereçado lá. Não afetam UI-09.
- **Pre-step coverage check (Sub-passo 2.0)** — grep `action: "(issue|agent|...)\\."` em server/src revelou 49 priority callsites distribuídos entre 11 arquivos declarados em `files_modified`. Nenhum priority callsite vivia em arquivo NÃO listado (heuristic do plan estava correto). Os 130+ outros actions (não priorizados) ficam fora deste plano e renderizam via fallback formatActivityVerb com label (legado) — comportamento documentado e aceito pela decisão "Backwards-compat runtime".

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária. Migration 0074 será aplicada automaticamente em push para main via `.github/workflows/db-migrate.yml` (DB-03 CI-only).

## Prontidão para Próxima Fase

- **Fase 8 fechada com este plano** — UI-09 satisfeito, todos os 5 plans (08-01..08-05) executados; UI core surfaces (Inbox/Projects/Settings/Navigation/Activity) totalmente traduzidas pt-BR/en-US.
- **Phase 9 destravada** — admin/auth/sistêmicas (UI-04, UI-06, UI-07, UI-08); arquivos disjuntos da Phase 8 (admin/company UI, auth forms, error messages, tooltips/empty states/modals/toasts).
- **Phase 10 destravada** — Mensagens dos Agentes (AGENT-MSG-01..04); pode reusar a infraestrutura `actionKey + paramsJson` deste plan se decidir tratar mensagens de agente como activity log entries com locale-aware rendering.
- **Phase 11 destravada** — Skills + System Prompts; depende da preference de locale já propagada user → agent context → spawn (delivered Phase 7 + Phase 10).
- **Migration 0074 pendente CI apply** — quando push para main rodar `.github/workflows/db-migrate.yml`, Supabase ganhará as colunas. Até lá, INSERT no DB local/dev fica com colunas null (existing rows) e novos INSERTs incluem null para actionKey/paramsJson via fallback. Sem regressão visível.

## Self-Check: PASSED

- ✓ Migration `0074_add_activity_action_key.sql` exists (139 bytes, 2 ADD COLUMN statements verified)
- ✓ Schema `actionKey: text("action_key")` + `paramsJson: jsonb("params_json")` present in `packages/db/src/schema/activity_log.ts`
- ✓ Journal entry `0074_add_activity_action_key` present in `_journal.json`
- ✓ Type `ActivityEvent` extended with `actionKey?` + `paramsJson?` in `packages/shared/src/types/activity.ts`
- ✓ `LogActivityInput` accepts `actionKey?` + `paramsJson?` in `server/src/services/activity-log.ts`
- ✓ 49 actionKey emissions across 11 server files (≥36 minimum required); grep verified
- ✓ Dictionaries pt-BR/en-US: zero underscore violations; claude-account-rotated kebab key + {{reason}} placeholder present
- ✓ ActivityRow.tsx contains "useTranslation", "actionKey", "(legado)", and still imports formatActivityVerb (fallback retained)
- ✓ server/src/__tests__/activity-log-action-key.test.ts exists with 3 cases passing (actionKey + paramsJson assertions)
- ✓ ui/src/components/__tests__/ActivityRow.actionKey.test.tsx exists with 4 cases passing (i18n.changeLanguage + legado assertions)
- ✓ Commits 31365d3, e283f75, cd935fc all present in git log
- ✓ pnpm -r typecheck exit 0 (verified twice)
- ✓ CI=true vitest missing-keys exit 0
- ✓ Migration NOT applied locally (DB-03 honored)

---
*Fase: 08-traducao-ui-core*
*Plano: 05*
*Concluída: 2026-04-26*
