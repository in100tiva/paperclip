# Milestones

## v1.1 Internacionalização pt-BR (Shipped: 2026-04-27)

**Phases completed:** 5 phases, 21 plans, 48 tasks

**Key accomplishments:**

- 16 bootstrap JSON dictionaries (8 namespaces × 2 locales) and 5 failing test files anchoring all 9 phase requirements (SETTINGS-01..04, I18N-01..05) before any production code lands.
- DB column + Drizzle migration + Better Auth additionalFields + Zod validators wire `locale` from Postgres → Better Auth session → shared types in a single coherent contract.
- i18next singleton with 8 namespaces wired in @paperclipai/ui, brings Wave 0 init.test.ts (I18N-01/02/03) and missing-keys.test.ts (I18N-04) GREEN.
- Server-side locale plumbing fully wired: DB → middleware → route → response. Authenticated requests carry `req.locale` from `authUsers.locale`; anonymous requests fall back through `parseAcceptLanguage` to default `pt-BR`. Two Wave 0 server tests transition RED → GREEN.
- I18nextProvider wired in main.tsx; ProfileSettings Language toggle with optimistic locale mutation, session-driven hydration, and Pitfall 3 ordering; UAT-07-01 / UAT-07-02 deferred as pending HUMAN-UAT per project precedent.
- Inbox surface (Inbox.tsx + IssuesList.tsx + 5 child components) fully translated to pt-BR / en-US via 149-key inbox.json dictionary; CI missing-keys detector GREEN; full UI suite 639/639 GREEN.
- Projects surface (Projects.tsx + ProjectDetail.tsx + NewProjectDialog.tsx + ProjectProperties.tsx + 2 workspace components) fully translated to pt-BR / en-US via 139-key projects.json dictionary; CI missing-keys detector GREEN; full UI suite 641/641 GREEN (+2 new tests vs Phase 8-01 baseline).
- Settings surface (InstanceSettings + InstanceGeneralSettings + InstanceExperimentalSettings + ProfileSettings extension + ClaudeAccounts) fully translated to pt-BR / en-US via 192-key settings.json dictionary; CI missing-keys detector GREEN; full UI suite 643/643 GREEN (+2 new probe tests vs Phase 8-02 baseline 641); Phase 7 ProfileSettings language section preserved regression-free.
- 1. [Rule 1 - Test fixture] Sidebar.test.tsx broken by t() migration
- Schema migration 0074 adicionando action_key/params_json + 49 server callsites emitindo kebab-case actionKey + ActivityRow refatorado com t() preferred path e fallback formatActivityVerb com label (legado) para retrocompat sem data migration
- 11 admin/company surface pages (~8741 LOC) migrated to react-i18next with 9 new settings.json sub-trees (812 leaf keys, ~570 added) covering Company Settings/Access, Companies list, Org chart, Invites, Join Requests, Export/Import, Skills, and Costs; ROLE_KEY/STATUS_KEY/PERMISSION_KEY canonical lookup maps replace hardcoded permissionLabels; translateApiError consumed in mutation error handlers; full UI suite 662/662 GREEN with 5 new RTL probe tests.
- Open Question #2 (Better Auth code audit):
- Plano 09-03b (cliente — i18n mapping de error codes) destravado.
- `ApiError` ganha campo `code?: string` parseado do response body; helper canônico `translateApiError(error, t)` mapeia `error.code → t("errors:${code}", params)` com fallback gracioso `{title: generic.unknown, body: rawMessage}` para erros legados/não-ApiError; `errors.json` (pt-BR + en-US) populado com 15 sub-trees / 79 leaf keys cobrindo os 32 códigos canônicos do Plan 09-03a + Better Auth legacy + auth.forbidden fallback. 9/9 unit tests GREEN; missing-keys CI=true GREEN; UI typecheck preserva apenas erro pre-existente em ActivityRow.tsx (out-of-scope).
- 1. [Rule 3 - Blocker] AgentDetail.RunDetail + ApprovalDetail raw window.confirm() blocked anti-regression lint test
- agents.json populated from {} to 147 leaf keys × 2 locales (100% parity); ui/src/lib/agent-keys.ts new module with AGENT_STATUS_KEY + AGENT_ROLE_KEY lookups (Pattern 1 + 2 from RESEARCH.md); StatusBadge refactored with optional `label` prop preserving legacy fallback; 9 TSX files + 7 adapter config-fields migrated to useTranslation (AgentDetail.tsx 4248 LOC ~280 strings cleared from header/tabs/breadcrumbs/actions/more menu surfaces; AgentConfigForm.tsx 1510 LOC with 41 strings translated; agent-config-primitives.tsx `help` const REMOVED 32 entries; NewAgentDialog/Agents/NewAgent/AgentProperties/AgentActionButtons/ActiveAgentsPanel migrated); 2 new RTL test files (StatusBadge.label 2 cases + AgentDetail.i18n 6 cases) GREEN; full UI suite 693/693 GREEN; CI=true missing-keys exit 0; AGENT-MSG-01 + AGENT-MSG-03 satisfied at code-level.
- agents.json EXTENDED from 147 to 197 leaf keys × 2 locales (100% parity); 3 new disjoint top-level sub-trees (transcript with 33 keys + 6 aria; run-ledger with 10 keys including plurals; live-runs with 7 keys); 4 TSX files migrated to useTranslation (RunTranscriptView 1526 LOC ~30 strings + 6 aria-labels with interpolation `{{code}}` for failed-with-exit; RunChatSurface emptyMessage default; LiveRunWidget 5 strings; IssueRunLedger run summary section lines 416-708 with `{{active}}/{{done}}/{{cancelled}}` interpolation + `more-children` plural _one/_other); 1 new RTL test file RunTranscriptView.i18n.test.tsx 8-case probe-component pt-BR ↔ en-US; existing IssueRunLedger.test.tsx selector switched to i18n-resilient raw keys (Rule 3 fix); IssueRunLedger line 391 watchdog toast PRESERVED as explicit handoff to plan 10-03; full UI suite 701/701 GREEN (was 693, +8 new probes); CI=true missing-keys exit 0; AGENT-MSG-02 satisfied at code-level.
- common.json EXTENDED from 144 to 164 leaf keys × 2 locales (100% parity); 4 new disjoint sub-trees toast.{agent,run,join-request,activity} (19 keys total) + 1 leaf toast.watchdog-decision-not-recorded preserving Phases 7-9 keys byte-for-byte; LiveUpdatesProvider.tsx refactored with tRef pattern (Pitfall 2 mitigation — useEffect socket-mounting deps unchanged) + 4 toast builders (buildActivityToast / buildJoinRequestToast / buildAgentStatusToast / buildRunStatusToast) accepting TFunction last param + handleLiveEvent forwarding t + socket.onmessage callback passing tRef.current at invocation time; __liveUpdatesTestUtils extended with all 4 builders + handleLiveEvent for direct unit-test invocation; existing LiveUpdatesProvider.test.ts (14 cases) preserved GREEN via tFake helper (English-equivalent fake TFunction — Rule 3 fix for 4 callsite signature mismatches); new LiveUpdatesProvider.toast.i18n.test.ts probe (5 cases: 4 builders pt-BR + 1 mocked-WebSocket no-reconnect across i18n.changeLanguage); 2 isolated toasts migrated (AgentDetail.tsx ConfigurationTab "Save failed" + IssueRunLedger.tsx watchdog "decision not recorded" — closes 10-02 handoff); 10-HUMAN-UAT.md artifact with 3 UATs covering all 4 AGENT-MSG-XX requirements; full UI suite
- resolveRunOwnerLocale helper resolves user.locale via agent_wakeup_requests → authUsers leftJoin and heartbeat.ts injects RuntimeLocale into context.runtimeLocale before adapter.execute, unblocking language directive composition (11-02) and skill variant materialization (11-03).
- buildLanguageDirectiveBlock emits the canonical pt-BR system-prompt block, agent-instructions.exportFiles appends it to the entry file, bundleKey now keys on locale (v2 hash), and execute.ts re-injects the directive into the prompt body on resume so AGENT-SKILL-01 ships at code level.
- 4 SKILL.pt-BR.md variants ship byte-identical YAML frontmatter + translated body markdown for the 4 paperclip skills, claude-local prompt-cache materializes the right variant per RuntimeLocale via materializeSkillForLocale (copy+rename for pt-BR + variant exists, symlink fallback otherwise), and 11-HUMAN-UAT.md persists 3 operator procedures covering AGENT-SKILL-04 empirical validation — last plan of milestone v1.1.

---

## v1.0 Fork + Multi-Account (Shipped: 2026-04-26)

**Phases completed:** 6 phases, 32 plans, 13 tasks

**Key accomplishments:**

- Imported paperclip master at SHA `40782f703d1f4a13f4ceadbe84c9b92be0bfacaf` into d:\projetos\ddd; renamed root package to `ddd`; cut upstream remote; documented hard-fork policy in UPSTREAM_REFERENCE.md and CONTRIBUTING.md.
- `pnpm install` (6m7s, exit 0) + `pnpm dev` boot validated on Windows 11 with embedded Postgres on port 54329 and Express+Vite on port 3100; 71 migrations applied; `/api/health` returned 200; user confirmed UI loaded in browser.
- Audit-first methodology mapeando 11 findings em 10 categorias (A-J) entre Postgres-embedded paperclip e Supavisor pooler, classificados por risco com decisões rastreáveis aos planos 02-03/02-04/02-05.
- Husky-managed pre-commit hook that blocks JWT-shaped literals in `ui/src/
- Driver postgres-js port-aware (6543→prepare:false, 5432→pool only), embedded fallback agora opt-in via PAPERCLIP_DB_MODE, ensureMigrations refuses non-TTY, drizzle.config preferred SUPABASE_DB_URL, e .env.example team-shared com 9 env vars críticas.
- Schema paperclip aplicado cleanly em Supabase (80 tabelas, 71 migrations registradas), workflow db-migrate.yml criado como único caminho automatizado para schema changes, PR template + CONTRIBUTING.md governam o fluxo humano (DB-04) — DB-01/03/04/05 satisfeitos.
- Better Auth preservado intacto contra Supabase Postgres; cookie prefix `paperclip-team-shared` derivado de `PAPERCLIP_INSTANCE_ID` validado empiricamente (AUTH-02); 7-test readiness suite cobrindo wiring (5 unit + 1 integration + 1 schema export); inline doc block mapeia AUTH-01..04 a código específico.
- End-to-end empirical proof that Better Auth signup roundtrips against Supabase remoto with `paperclip-team-shared` cookie prefix, validated via 7/7 automated steps + human visual confirmation in browser; Phase 2 declared complete.
- TypeScript setup script (`pnpm run setup`) that runs 7 ordered checks (Node, pnpm, .env.local, critical env vars, claude CLI, Supabase ping via createDb, Better Auth `user` table) and exits non-zero with actionable messages on any required-check failure.
- Doc de onboarding em pt-br (124 linhas, 7 seções) cobrindo o caminho linear clone → setup → invite/login com tempo-alvo <30min, mais nota minimalista no topo do README.md preservando paperclip body byte-por-byte.
- Procedimento manual canônico de smoke cross-machine (Dev A em máquina X → Dev B em máquina Y vê company compartilhada via Supabase remoto + cookie `paperclip-team-shared`) com fallback single-host explicitamente limitado, e roteamento honesto de TEAM-04 + TEAM-01 para HUMAN-UAT em vez de fingir validação automatizada
- Procedimento manual documentando bootstrap CEO via script existente + cadastro coletivo de 4+ devs via fluxo company_join, reusando 100% do invite flow do paperclip (zero código novo) e roteando execução real para HUMAN-UAT.
- Taxonomia 429 com 6 tipos auditados contra `CLAUDE_TRANSIENT_UPSTREAM_RE` e `CLAUDE_EXTRA_USAGE_RESET_RE` existentes em `parse.ts:13-15`, identificando 4 cobertos diretamente, 2 parciais (tpm_transient sem discriminator de dimensão; org_tier sem token canônico) e 0 ausentes — destrava Phase 5 MULTI-06 com gaps explícitos.
- Decisão arquitetural registrada: detecção reativa via CLAUDE_TRANSIENT_UPSTREAM_RE como primary, pré-emptiva via headers como enhancement opcional, cooldown 30s configurável, e retry-after honrado como gate de exhaustedUntil — mapeamento direto para Phase 5 MULTI-04/06/08.
- Classifier protótipo TypeScript reusando regex de parse.ts:13-15, com 8 cases vitest validando 6 fixtures stub (1 por tipo da taxonomia 429), rodando standalone via vitest config próprio que bypassa o workspace principal do monorepo.
- Harness bash descartável para validação empírica de session_id per-account e cross-account resume usando CLAUDE_CONFIG_DIR isolado (capture-fixture.sh + test-multi-account-resume.sh + README pt-br)
- HUMAN-UAT artifact (3 UATs) + Findings forward (8 achados explícitos mapeados a MULTI-01/04/05/06/08) fecham Phase 4 com clareza arquitetural sobre o que Phase 5 reusa vs constrói novo.
- 3 schemas Drizzle (claude_accounts, agent_account_bindings, agent_step_executions) com FKs uuid/text heterogeneos, indexes para selectActiveAccount/cooldown gating/append-only attribution, e migration 0071 gerada (NAO aplicada — DB-03 CI-only)
- detectClaudeQuotaExhausted classifier com 6-way taxonomia (rpm/tpm/daily/weekly/5h/org), reusando CLAUDE_TRANSIENT_UPSTREAM_RE existente como gate, validado por 10 vitest cases passando.
- Inglês para `claude-accounts-swap.md`:
- Adapter claude-local agora aceita `config.claudeConfigDir` opcional e o roteia para `env.CLAUDE_CONFIG_DIR` antes do spawn, habilitando o caller (heartbeat 05-06) a injetar credencial dir per-account sem mutar process.env.
- Heartbeat seleciona conta Claude antes de cada spawn e orquestra swap automático Strategy A (resume) → Strategy B (full-context fallback) em quota exhaustion, com observabilidade de swapStrategy efetivo via recordSwapOutcome e atribuição de custo per-account via recordStepExecution
- 1. [Rule 3 - Blocker] Express params type coercion
- Created:
- 1. [Rule 3 — Blocker] Drizzle-kit invocation needed env injection
- Aggregation service + REST endpoint que somam `agent_step_executions` por (companyId, accountId) via Drizzle SQL groupBy/innerJoin, com permissão read-only para qualquer membro da company e filtro opcional de date range ISO 8601.
- Before (Phase 5):
- `packages/shared/src/validators/company.ts`
- Procedimento canônico pt-br para validação de isolamento multi-company via SQL (Modo A) + UAT-06-01 visual cross-browser pendente (Modo B), satisfazendo PROJ-01 como artefato testável e roteando validação UI para operador humano.
- 1. [Rule 1 - Bug] Recontagem do total de requisitos v1 (47 → 45)

---
