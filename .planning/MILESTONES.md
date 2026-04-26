# Milestones

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
