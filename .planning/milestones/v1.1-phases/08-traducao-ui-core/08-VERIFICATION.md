---
phase: 08-traducao-ui-core
verified: 2026-04-26T21:15:00Z
status: human_needed
score: 5/5 must-haves verified (automated); 5 UATs pending browser confirmation
re_verification: null
human_verification:
  - test: "UAT-08-01 — toggle pt-BR/en-US em Inbox; verificar todos os labels visíveis trocam sem string em inglês residual"
    expected: "Inbox renderiza 100% em pt-BR (tabs Meus/Equipe/Tudo, filtros, ações em massa, search placeholder, empty state, linhas de issue, modal Mark all as read?); zero strings em inglês visíveis"
    why_human: "Cobertura visual completa só validável em browser — automated tests asseguram presença de chaves e binding de useTranslation, mas não capturam strings esquecidas em ramos condicionais raros do JSX"
  - test: "UAT-08-02 — toggle pt-BR/en-US em /projects e /projects/{id}; verificar lista, NewProjectDialog (form completo, status enum, tooltips), tabs e toasts archive/unarchive"
    expected: "Projects e ProjectDetail renderizam 100% em pt-BR; toasts interpolam nome do projeto corretamente (\"{{name}}\" foi arquivado); status enum dropdown lista 5 opções traduzidas (Backlog/Planejado/Em andamento/Concluído/Cancelado)"
    why_human: "Toast interpolation só visível em fluxos de mutação (archive/unarchive); status enum requer abrir popover; visual scan de tooltips"
  - test: "UAT-08-03 — toggle pt-BR/en-US em /instance/settings/{profile,general,heartbeats,experimental} e /instance/settings/claude-accounts; confirmar plurals + window.confirm traduzido"
    expected: "Todas as 5 sub-telas renderizam em pt-BR; backup-retention exibe \"7 dias\" / \"1 dia\" via plurals; heartbeats mostra \"3 empresas\" / \"1 empresa\"; ProfileSettings language section preservada da Phase 7 sem regressão; window.confirm de disable-all heartbeats em pt-BR"
    why_human: "Plural rendering só validável em runtime com count real; window.confirm requer interação; preservação Phase 7 só confirmada visualmente"
  - test: "UAT-08-04 — navegar pelo app com locale=pt-BR; verificar sidebar (11 nav items + Trabalho/Empresa), header, breadcrumbs, account menu, instance sidebar, mobile bottom nav todos em português; \"Paperclip\" preservado como brand"
    expected: "Sidebar mostra Dashboard/Inbox/Tarefas/Rotinas/Metas/Workspaces/Organização/Skills/Custos/Atividade/Configurações; account menu lista View profile/Edit profile/Instance settings/Documentation/Switch theme/Sign out + descriptions em pt-BR; version footer renderiza \"Paperclip v1.x.x\" literal; breadcrumb labels vindos das páginas (Inbox/Projetos/Configurações) traduzidos"
    why_human: "Cobertura framing-wide; brand preservation ('Paperclip' não traduzido) + version interpolation só auditáveis visualmente"
  - test: "UAT-08-05 — abrir /activity em pt-BR; confirmar entries antigos (sem actionKey) renderizam com label \"(legado)\" em itálico; entries novos (com actionKey emitido por callsites backfilled) renderizam traduzidos"
    expected: "Activity log mostra 2 categorias visíveis: linhas legadas com verbo formatActivityVerb() + sufixo \"(legado)\" em itálico cinza; linhas novas (issues criadas após deploy) renderizam verb traduzido (\"criou\", \"atualizou\", \"checou\") sem o sufixo legado; claude-account-rotated entries interpolam motivo via {{reason}}"
    why_human: "Backwards-compat path só validável com mistura real de DB rows pré/pós-Phase-8; visual distinction entre legacy/translated requer DOM inspection"
---

# Phase 8: Tradução UI Core Verification Report

**Phase Goal:** Traduzir as telas e elementos de navegação que o usuário toca em todo uso típico do paperclip — inbox, projects, settings, sidebar/header/menus/breadcrumbs e templates do activity log. São as superfícies de maior tráfego.
**Verified:** 2026-04-26T21:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                              | Status     | Evidence                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Inbox surface (Inbox.tsx + IssuesList + 5 child components) traduzida pt-BR/en-US sem strings hardcoded                            | ✓ VERIFIED | inbox.json 149 keys mirrored; 7 TSX files com useTranslation; SUMMARY 08-01 self-check passed; 639/639 UI tests GREEN                                |
| 2   | Projects surface (Projects + ProjectDetail + NewProjectDialog + ProjectProperties + 2 workspace components) traduzida              | ✓ VERIFIED | projects.json 139 keys mirrored; 6 TSX files com useTranslation; toast interpolation `{{name}}` presente; PROJECT_STATUS_KEY pattern para typed-t() |
| 3   | Settings surface (5 arquivos) traduzida; ProfileSettings language section da Phase 7 preservada regression-free                    | ✓ VERIFIED | settings.json 193 keys (5 → 193, language.* preserved); ProfileSettings.locale-toggle.test.tsx 2/2 GREEN; plurals via _one/_other + bare key       |
| 4   | Navigation surface (11 arquivos: sidebars + breadcrumb + mobile + layout + company rail/switcher) traduzida; "Paperclip" preserved | ✓ VERIFIED | common.nav.* sub-tree ~80 keys mirrored; brand preservada em version interpolation `Paperclip v{{version}}`; BreadcrumbBar restrito a aria-label   |
| 5   | Activity log: schema migration 0074 + actionKey/paramsJson convention + ActivityRow t()-preferred com fallback "(legado)"          | ✓ VERIFIED | Migration 0074 com 2 ALTER ADD COLUMN (zero RENAME); 53 actionKey emissions em 12 server files; activity.json 42 keys mirrored kebab-case          |

**Score:** 5/5 truths verified (automated)

### Required Artifacts

| Artifact                                                                          | Expected                                  | Status     | Details                                                            |
| --------------------------------------------------------------------------------- | ----------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `ui/src/i18n/locales/pt-BR/inbox.json`                                            | 149 keys com `title`, `filters`, etc.     | ✓ VERIFIED | 149 leaves; mirror perfect com en-US                               |
| `ui/src/i18n/locales/en-US/inbox.json`                                            | espelhado pt-BR                           | ✓ VERIFIED | 149 leaves; identical key set                                      |
| `ui/src/i18n/locales/pt-BR/projects.json`                                         | 139 keys com `title`, `new-project`, etc. | ✓ VERIFIED | 139 leaves; contém `{{ name }}` interpolation                      |
| `ui/src/i18n/locales/en-US/projects.json`                                         | espelhado                                 | ✓ VERIFIED | 139 leaves                                                         |
| `ui/src/i18n/locales/pt-BR/settings.json`                                         | 193 keys; language.* preserved Phase 7    | ✓ VERIFIED | 193 leaves; language sub-tree intacto; plurals com _one/_other     |
| `ui/src/i18n/locales/en-US/settings.json`                                         | espelhado                                 | ✓ VERIFIED | 193 leaves                                                         |
| `ui/src/i18n/locales/pt-BR/common.json`                                           | extended com `nav.*`                      | ✓ VERIFIED | 82 leaves; Phase 7 keys + 08-01 actions.* + nav.* preserved        |
| `ui/src/i18n/locales/en-US/common.json`                                           | espelhado                                 | ✓ VERIFIED | 82 leaves                                                          |
| `ui/src/i18n/locales/pt-BR/activity.json`                                         | 36+ actions kebab-case; sem underscore    | ✓ VERIFIED | 42 leaves; zero underscore (grep `_` returned 0); claude-account-rotated com {{reason}} |
| `ui/src/i18n/locales/en-US/activity.json`                                         | espelhado                                 | ✓ VERIFIED | 42 leaves                                                          |
| `packages/db/src/migrations/0074_add_activity_action_key.sql`                     | 2 ALTER ADD COLUMN idempotente            | ✓ VERIFIED | 139 bytes; exatamente 2 ADD COLUMN (action_key text, params_json jsonb); zero RENAME |
| `ui/src/components/inbox/__tests__/InboxList.translation.test.tsx`                | RTL test pt-BR + en-US                    | ✓ VERIFIED | 4701 bytes; contém i18n.changeLanguage, pt-BR, en-US               |
| `ui/src/pages/__tests__/Projects.translation.test.tsx`                            | RTL test                                  | ✓ VERIFIED | 8748 bytes                                                         |
| `ui/src/pages/__tests__/Settings.translation.test.tsx`                            | RTL test                                  | ✓ VERIFIED | 8823 bytes                                                         |
| `ui/src/components/layout/__tests__/Sidebar.translation.test.tsx`                 | RTL test                                  | ✓ VERIFIED | 7302 bytes; brand interpolation round-trip                         |
| `ui/src/components/__tests__/ActivityRow.actionKey.test.tsx`                      | RTL test pt-BR + fallback "(legado)"      | ✓ VERIFIED | 3300 bytes; contém i18n.changeLanguage + legado                    |
| `server/src/__tests__/activity-log-action-key.test.ts`                            | server integration test                   | ✓ VERIFIED | 3099 bytes; cobre actionKey + paramsJson + retrocompat null path   |
| `ui/src/components/ActivityRow.tsx`                                               | t() preferred + formatActivityVerb fallback + (legado) | ✓ VERIFIED | useTranslation + actionKey + (legado) + formatActivityVerb retained |

### Key Link Verification

| From                                  | To                                | Via                                              | Status   | Details                                                       |
| ------------------------------------- | --------------------------------- | ------------------------------------------------ | -------- | ------------------------------------------------------------- |
| `ui/src/pages/Inbox.tsx`              | `pt-BR/inbox.json`                | `useTranslation(["inbox","common"])`             | ✓ WIRED  | 5 useTranslation occurrences; t("inbox:...") em 50+ call sites |
| `ui/src/components/IssuesList.tsx`    | `pt-BR/inbox.json`                | shared component (Inbox+ProjectDetail+Issues)    | ✓ WIRED  | 3 useTranslation occurrences                                  |
| `ui/src/components/IssueFiltersPopover.tsx` | `pt-BR/inbox.json`         | `t("inbox:filters.*")`                           | ✓ WIRED  | 2 useTranslation; 13 filter labels translated                 |
| `ui/src/pages/Projects.tsx`           | `pt-BR/projects.json`             | `useTranslation(["projects","common"])` + setBreadcrumbs(t()) | ✓ WIRED | 2 useTranslation                                              |
| `ui/src/components/NewProjectDialog.tsx` | `pt-BR/projects.json`          | `t("projects:new-project.*")` + PROJECT_STATUS_KEY map | ✓ WIRED | 2 useTranslation; status enum via static lookup map         |
| `ui/src/pages/ProjectDetail.tsx`      | setBreadcrumbs com t()            | toast.archived/unarchived `{{name}}` interpolation | ✓ WIRED | 4 useTranslation occurrences                                  |
| `ui/src/pages/InstanceGeneralSettings.tsx` | `pt-BR/settings.json`        | `t("settings:general.*")` plurals via { count }  | ✓ WIRED  | 2 useTranslation; ~38 t() call sites                          |
| `ui/src/pages/InstanceSettings.tsx`   | `pt-BR/settings.json`             | `t("settings:heartbeats.*")` + `{ count }` plurals | ✓ WIRED | 2 useTranslation; window.confirm traduzido                    |
| `ui/src/pages/ProfileSettings.tsx`    | `pt-BR/settings.json`             | Phase 7 useTranslation extended (campos não-locale) | ✓ WIRED | 2 useTranslation; language section preserved verbatim          |
| `ui/src/components/Sidebar.tsx`       | `pt-BR/common.json`               | `useTranslation(["common"])` + `t("common:nav.items.*")` | ✓ WIRED | 2 useTranslation; 14 t() call sites                          |
| `ui/src/components/SidebarAccountMenu.tsx` | `pt-BR/common.json`          | `t("common:nav.account-menu.*")` + version `{{version}}` | ✓ WIRED | 2 useTranslation; 20 t() call sites; brand preserved        |
| `ui/src/components/InstanceSidebar.tsx` | `pt-BR/common.json`             | `t("common:nav.instance-settings.items.*")`      | ✓ WIRED  | 2 useTranslation; 8 t() call sites                            |
| `ui/src/components/ActivityRow.tsx`   | `pt-BR/activity.json`             | `t(\`activity:${event.actionKey}\`, paramsJson)` | ✓ WIRED  | 2 useTranslation; actionKey + (legado) + formatActivityVerb retained |
| `server/src/services/activity-log.ts` | `packages/db/src/schema/activity_log.ts` | `db.insert(activityLog).values({ actionKey, paramsJson, ... })` | ✓ WIRED | LogActivityInput estendido + 53 actionKey emissions across 12 server files |
| `ActivityEvent` type                  | `ActivityRow` consumer            | `@paperclipai/shared` barrel re-export           | ✓ WIRED  | actionKey?: + paramsJson?: optional fields exported           |

### Data-Flow Trace (Level 4)

| Artifact                            | Data Variable      | Source                                                    | Produces Real Data | Status      |
| ----------------------------------- | ------------------ | --------------------------------------------------------- | ------------------ | ----------- |
| Inbox/Projects/Settings/Nav surfaces | `t("...")` calls   | i18next singleton hidratado por session locale (Phase 7) | Yes — JSON dictionaries com 149+139+193+82 keys mirrored | ✓ FLOWING   |
| `ActivityRow.tsx` translated render | `event.actionKey + event.paramsJson` | server emit via 53 callsites backfilled       | Yes — actionKey kebab-case persistido em DB column action_key + paramsJson em jsonb column | ✓ FLOWING |
| `ActivityRow.tsx` legacy fallback   | `event.action + event.details` | DB rows pré-Phase-8 com action_key NULL          | Yes — formatActivityVerb() roda + label "(legado)" injetado | ✓ FLOWING (graceful fallback path) |

### Behavioral Spot-Checks

| Behavior                                                          | Command                                                                                                       | Result        | Status |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| Migration 0074 contém exatamente 2 ALTER ADD COLUMN, zero RENAME | `cat 0074_add_activity_action_key.sql`                                                                        | 2 ADD COLUMN (action_key text, params_json jsonb); zero RENAME | ✓ PASS |
| pt-BR/en-US dictionary parity em todos os namespaces             | node script comparing leaf keys between pt-BR e en-US                                                         | inbox 149↔149 mirror_OK; projects 139↔139 mirror_OK; settings 193↔193 mirror_OK; common 82↔82 mirror_OK; activity 42↔42 mirror_OK | ✓ PASS |
| activity.json zero underscore violations (kebab-case enforced)   | `grep -E '"[a-z]+_[a-z]+":' ui/src/i18n/locales/pt-BR/activity.json`                                          | 0 matches     | ✓ PASS |
| claude-account-rotated key kebab-case + {{reason}} placeholder    | `grep "claude-account-rotated" ui/src/i18n/locales/pt-BR/activity.json`                                       | "claude-account-rotated": "trocou conta Claude (motivo: {{reason}})" | ✓ PASS |
| ≥36 actionKey emissions across server                             | grep `actionKey:` server/src/                                                                                  | 53 occurrences across 12 files (≥36 baseline) | ✓ PASS |
| All 25 expected TSX surfaces have useTranslation                 | grep `useTranslation` em todos os arquivos declarados em files_modified                                       | 62 occurrences across 25 files (1+ per surface) | ✓ PASS |
| Phase 8 commits gravados                                          | git log para hashes 4fb6d5e/5f5abd4/555ede0/b99735a/4d34be5/2b5d279/6bb9b52/3eb597c/b16e5bc/36c8062/a2b7033/c4cf623/31365d3/e283f75/cd935fc | All 15 task commits + 5 docs commits present in branch | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                                          | Status      | Evidence                                                                            |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| UI-01       | 08-01       | Tela inbox traduzida (lista de items, filtros, ações em massa, estados vazios)                                       | ✓ SATISFIED | inbox.json 149 keys; 7 TSX migrated; InboxList.translation.test.tsx GREEN; SUMMARY requirements-completed: [UI-01] |
| UI-02       | 08-02       | Tela projects traduzida (lista, criação, detalhes, edição)                                                           | ✓ SATISFIED | projects.json 139 keys; 6 TSX migrated; Projects.translation.test.tsx GREEN; toast {{name}} interpolation verified |
| UI-03       | 08-03       | Tela settings traduzida — incluindo a própria seção de idioma e settings de Claude accounts                          | ✓ SATISFIED | settings.json 193 keys (language.* preserved); 5 TSX migrated; Settings.translation.test.tsx GREEN; plurals working |
| UI-05       | 08-04       | Navegação, sidebar, header, menus e breadcrumbs traduzidos                                                            | ✓ SATISFIED | common.nav.* ~80 keys; 11 TSX migrated; Sidebar.translation.test.tsx GREEN; brand preserved (Paperclip v{{version}}) |
| UI-09       | 08-05       | Templates de entrada do activity log renderizados em pt-BR (incluindo eventos `claude_account_rotated` etc.)         | ✓ SATISFIED | Migration 0074; 53 actionKey emissions; activity.json 42 keys kebab-case; ActivityRow t() preferred + (legado) fallback; ActivityRow.actionKey.test.tsx + activity-log-action-key.test.ts GREEN |

**No orphaned requirements:** REQUIREMENTS.md mapeia exatamente 5 IDs para Fase 8 (UI-01, UI-02, UI-03, UI-05, UI-09); todos cobertos pelos 5 plans.

### Anti-Patterns Found

Nenhum anti-padrão bloqueador encontrado em arquivos modificados. Self-checks dos 5 SUMMARYs reportaram suite UI 645/645 GREEN (Phase 8-04 baseline) e CI=true missing-keys detector GREEN end-to-end. Patterns observados durante migração foram intencionais e documentados:

- **PROJECT_STATUS_KEY / STATUS_KEY static lookup maps:** decisão arquitetural para bridge typed-t() ↔ kebab-case enums (RESEARCH Pitfall 1 mitigation com TS strict).
- **Bare-key + _one/_other plural duplication:** mitigação documentada do detector regex que rejeita underscore (RESEARCH §Pattern 3 + Phase 8-03 deviation log).
- **`(legado)` italic label em ActivityRow:** intencional UX marker para entries pré-Phase-8 sem actionKey; fallback path graceful sem data migration.
- **`// i18n: review — complex template` comments:** marcadores deferindo refator agressivo de templates dinâmicos para v2 L10N-03 (CONTEXT D-01).

### Human Verification Required

Phase 8 segue precedente do projeto `complete-with-pending-UAT` (Fases 3-7): critérios automatizados aprovados; UATs visuais browser-bound documentados em 08-VALIDATION.md aguardam confirmação humana.

#### 1. UAT-08-01 — Inbox Visual Scan

**Test:** Toggle pt-BR ↔ en-US em /inbox; auditar visualmente todas as tabs, filtros, search, empty states, modais
**Expected:** 100% das strings visíveis em pt-BR; modal "Mark all as read?" em pt-BR; zero strings residuais em inglês
**Why human:** Cobertura visual completa só validável em browser — automated tests asseguram presença de chaves e binding de useTranslation, mas não capturam strings esquecidas em ramos condicionais raros do JSX

#### 2. UAT-08-02 — Projects Visual Scan + Toast Interpolation

**Test:** Toggle pt-BR ↔ en-US em /projects e /projects/{id}; abrir NewProjectDialog (form + status enum + tooltips); arquivar um projeto e ler toast
**Expected:** Projects e ProjectDetail 100% pt-BR; toast `"<nome>" foi arquivado` interpola corretamente; status dropdown lista 5 opções traduzidas
**Why human:** Toast interpolation só visível em mutações (archive/unarchive); status enum requer abrir popover; tooltips requerem hover

#### 3. UAT-08-03 — Settings Visual Scan + Plurals + window.confirm

**Test:** Toggle pt-BR ↔ en-US em /instance/settings/{profile,general,heartbeats,experimental,claude-accounts}; clicar disable-all em heartbeats; verificar plurals em backup-retention
**Expected:** 5 sub-telas em pt-BR; "7 dias"/"1 dia" via plurals; "3 empresas"/"1 empresa"; ProfileSettings language section da Phase 7 inalterada (regression-free); window.confirm em pt-BR
**Why human:** Plural rendering só validável com count real; window.confirm requer interação; preservação Phase 7 só confirmada visualmente

#### 4. UAT-08-04 — Navegação Global + Brand Preservation

**Test:** Navegar pelo app com locale=pt-BR; auditar sidebar, header, breadcrumbs, account menu, instance sidebar, mobile bottom nav; verificar que "Paperclip" permanece literal
**Expected:** Sidebar 11 nav items + sections em pt-BR; account menu com 7 actions + descriptions em pt-BR; version footer "Paperclip v1.x.x" literal; breadcrumbs vindos das páginas (Inbox/Projetos/Configurações) traduzidos
**Why human:** Cobertura framing-wide; brand preservation ('Paperclip' não traduzido) + version interpolation só auditáveis visualmente

#### 5. UAT-08-05 — Activity Log Mixed Legacy + Translated

**Test:** Abrir /activity com locale=pt-BR; identificar entries antigos (sem actionKey) vs novos (com actionKey emitido pós-deploy); confirmar visual distinction
**Expected:** Entries legacy renderizam com verbo formatActivityVerb() + sufixo "(legado)" em itálico cinza; entries novos renderizam verb traduzido sem sufixo legado; claude-account-rotated entries interpolam {{reason}}
**Why human:** Backwards-compat path só validável com mistura real de DB rows pré/pós-Phase-8; visual distinction entre legacy/translated requer DOM inspection no contexto de produção/staging

### Gaps Summary

Sem lacunas automatizadas — todas as 5 truths do objetivo verificadas com evidência concreta em commits, dicionários, types, schema, server callsites e testes RTL/integration. As 5 UATs documentadas em 08-VALIDATION.md são exigências browser-bound conforme Validation Architecture do projeto (precedente Fases 3-7); fase fechada no eixo automatizado, aguardando confirmação visual humana antes de marcar `nyquist_compliant: true`.

---

_Verified: 2026-04-26T21:15:00Z_
_Verifier: Claude (verifier)_
