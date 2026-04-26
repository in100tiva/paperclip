---
phase: 05-multi-account-claude-code-swap-implementacao
plan: 01
subsystem: database
tags: [drizzle, postgres, schema, multi-account, claude-code, append-only]

requires:
  - phase: 04-spike-multi-account-claude-code-detection
    provides: "Taxonomia 429 (6 sub-tipos), structure de lastQuotaWindowsJson (Finding 3), discriminator strategy (D-15)"
  - phase: 02-migra-o-de-storage-para-supabase
    provides: "Migration policy DB-03 (CI-only apply via GitHub Actions); convencao uuid PKs em packages/db/src/schema/"
provides:
  - "claudeAccounts table — pool de contas Claude Code per-company com status/exhaustion windows"
  - "agentAccountBindings table — agentId -> activeAccountId binding com cooldown gating"
  - "agentStepExecutions table — append-only attribution per-step (tokens, custo, conta, errorFamily)"
  - "Migration 0071_lively_azazel.sql gerada (NAO aplicada)"
  - "Drizzle barrel export atualizado em packages/db/src/schema/index.ts"
affects: [05-02, 05-03, 05-04, 05-05, 06-cost-attribution]

tech-stack:
  added: []
  patterns:
    - "Append-only attribution table sem campo de mutacao pos-INSERT (cost_events pattern)"
    - "FK heterogeneo: uuid para tabelas codebase (companies, agents, heartbeat_runs, claude_accounts), text para Better Auth user"
    - "lastQuotaWindowsJson como jsonb com TypeScript $type<Record<...>>() — schema-free, service-enforced"

key-files:
  created:
    - "packages/db/src/schema/claude_accounts.ts (74 linhas)"
    - "packages/db/src/schema/agent_account_bindings.ts (30 linhas)"
    - "packages/db/src/schema/agent_step_executions.ts (53 linhas)"
    - "packages/db/src/migrations/0071_lively_azazel.sql (62 linhas)"
    - "packages/db/src/migrations/meta/0071_snapshot.json (drizzle-kit snapshot)"
  modified:
    - "packages/db/src/schema/index.ts (3 novos exports apos costEvents)"
    - "packages/db/src/migrations/meta/_journal.json (entrada 0071)"

key-decisions:
  - "id=uuid (nao text como CONTEXT D-02 sugeria) — alinha com convencao real codebase (companies, agents, cost_events, heartbeat_runs todos uuid). Decisao registrada inline no header de claude_accounts.ts"
  - "ownerUserId=text (nao uuid) — Better Auth usa text PK em user; FK precisa casar tipo. Heterogeneidade aceita pelo padrao Better-Auth-as-Postgres da Phase 2"
  - "lastQuotaWindowsJson com $type<Record<string, {exhaustedUntil, lastTriggeredAt, count}>>() — schema livre para os 6 sub-tipos da taxonomia (rpm/tpm/daily/weekly/5h/org); enforcement via TypeScript do service, nao via JSONB constraint"
  - "exhaustedUntil top-level cached (= MAX dos windows) para query rapida em selectActiveAccount sem JSONB scan"
  - "Migration 0071 editada manualmente para remover DDL fantasma (drift drizzle-kit snapshots vs hand-written 0062-0070); rebaseline geral fora de escopo"

patterns-established:
  - "Append-only sem updatedAt: agent_step_executions segue cost_events. UPDATE rota nao existe no service."
  - "FK heterogeneo Better Auth: ownerUserId=text -> user.id (text); resto uuid. Documentado inline."
  - "Comments multilingue em schema files: header em pt-br (consistente com .planning/), nomes de tipo/funcao em ingles (consistente com codebase paperclip)."

requirements-completed: [MULTI-01, MULTI-02, MULTI-03]

duration: 4min
completed: 2026-04-26
---

# Phase 5 Plan 01: Multi-Account Schemas — Resumo

**3 schemas Drizzle (claude_accounts, agent_account_bindings, agent_step_executions) com FKs uuid/text heterogeneos, indexes para selectActiveAccount/cooldown gating/append-only attribution, e migration 0071 gerada (NAO aplicada — DB-03 CI-only)**

## Performance

- **Duracao:** ~4min
- **Iniciado:** 2026-04-26T06:20:12Z
- **Concluido:** 2026-04-26T06:24:36Z
- **Tarefas:** 2
- **Arquivos criados:** 5 (3 schemas + 1 SQL migration + 1 meta snapshot)
- **Arquivos modificados:** 2 (index.ts barrel + meta/_journal.json)

## Realizacoes

- **claude_accounts schema** (74 linhas): pool per-company com `status`, `lastQuotaWindowsJson` (jsonb tipado para 6 sub-tipos da taxonomia 429), `exhaustedUntil` cached, FKs `companyId` -> uuid `companies.id` e `ownerUserId` -> text `user.id` (Better Auth). 3 indexes: `(company_id, status)`, `(company_id, exhausted_until)`, UNIQUE em `config_dir_slug`.
- **agent_account_bindings schema** (30 linhas): `agentId` PK -> `agents.id` (uuid), `activeAccountId` nullable -> `claude_accounts.id`, `rotationPolicy` ('auto' | 'sticky' | 'manual'), `lastRotatedAt` para gate de cooldown.
- **agent_step_executions schema** (53 linhas): append-only (sem campo de mutacao), `runId` -> `heartbeat_runs.id` (uuid), `accountId` -> `claude_accounts.id`, contadores de tokens, `costUsd` (real), `errorFamily` nullable. 2 indexes: `(run_id, step_id)` e `(account_id, started_at)`.
- **Migration 0071_lively_azazel.sql** gerada via `pnpm db:generate`, manualmente curada para conter apenas o diff legitimo deste plano (3 tabelas + FKs + indexes). NAO aplicada contra Supabase compartilhado (DB-03).
- **Barrel index.ts** exporta os 3 novos schemas apos `costEvents`.
- **TypeScript compila** com zero erros (`pnpm tsc --noEmit` exit 0).

## Commits das Tarefas

1. **Tarefa 1: 3 schemas Drizzle + atualizar barrel** - `ef3120c` (feat)
2. **Tarefa 2: gerar SQL migration via drizzle-kit** - `320d47b` (chore)

_Nota: Tarefa 1 executada como single commit (TDD-by-typecheck — Test 4 do `<behavior>` valida via `tsc --noEmit`; testes 1-3 sao type-level, satisfeitos pelo mesmo passo). Pacote @paperclipai/db nao tem fixture de schema-import test estabelecida para criar test:RED meaningful — typecheck e a verificacao real._

## Arquivos Criados/Modificados

- `packages/db/src/schema/claude_accounts.ts` (NOVO, 74 linhas) — pool de contas Claude Code per-company; status/exhaustion windows/owner; 3 indexes incluindo unique em `config_dir_slug`.
- `packages/db/src/schema/agent_account_bindings.ts` (NOVO, 30 linhas) — binding agent->conta com rotation policy e cooldown timestamp.
- `packages/db/src/schema/agent_step_executions.ts` (NOVO, 53 linhas) — append-only attribution per-step para tokens/custo/conta/erro.
- `packages/db/src/schema/index.ts` (MOD) — adiciona 3 exports apos `costEvents`.
- `packages/db/src/migrations/0071_lively_azazel.sql` (NOVO, 62 linhas) — SQL DDL com 3 CREATE TABLE + 6 FKs + 5 indexes.
- `packages/db/src/migrations/meta/0071_snapshot.json` (NOVO) — drizzle-kit snapshot do schema atual.
- `packages/db/src/migrations/meta/_journal.json` (MOD) — entrada `0071_lively_azazel`.

## Decisoes Tomadas

1. **`id` = `uuid`, nao `text`.** CONTEXT.md D-02 declarava "text PK" para `claude_accounts.id`, mas convencao real do codebase (companies, agents, cost_events, heartbeat_runs todos `uuid().defaultRandom()`) supersedeu. Documentado inline no header de `claude_accounts.ts`. PLAN.md tinha hint para esta correcao em `<interfaces>` — confirmado.
2. **`ownerUserId` = `text`.** Better Auth `user.id` e text (nao uuid); FK precisa casar tipo. Heterogeneidade aceita — Phase 2 ja estabeleceu que Better Auth opera over text-id em vez de migrar para `auth.users` uuid.
3. **`lastQuotaWindowsJson` schema-free + service-enforced.** TypeScript `.$type<Record<string, {exhaustedUntil, lastTriggeredAt, count}>>()` documenta forma esperada (6 chaves: rpm_transient/tpm_transient/daily_quota/weekly_quota/session_5h/org_tier) mas nao constrange a nivel de schema. Enforcement vem do `claudeAccountsService` em Phase 5 plan 02. Permite evolucao sem migration quando taxonomia ganhar sub-tipos.
4. **`exhaustedUntil` top-level cached.** = `MAX(values)` dos 6 windows; recalculado pelo `rotateOnQuotaExhausted`. Permite query rapida `WHERE exhausted_until < now` em `selectActiveAccount` sem JSONB scan/extract.
5. **Migration manualmente curada.** Drizzle-kit gerou 0071 com 242 linhas incluindo DDL fantasma para tabelas/colunas/indexes ja existentes (criados em 0062-0070 hand-authored). Edicao manual para 62 linhas com APENAS o diff legitimo deste plano.

## Desvios do Plano

### Problemas Corrigidos Automaticamente

**1. [Regra 3 - Bloqueador] Migration drizzle-kit incluiu DDL fantasma de tabelas pre-existentes**

- **Encontrado durante:** Tarefa 2 (gerar SQL migration via drizzle-kit)
- **Problema:** `pnpm db:generate` produziu `0071_lively_azazel.sql` (242 linhas) incluindo `CREATE TABLE environments`, `CREATE TABLE environment_leases`, `CREATE TABLE heartbeat_run_watchdog_decisions`, `CREATE TABLE issue_thread_interactions`, `CREATE TABLE issue_tree_holds`, `CREATE TABLE issue_tree_hold_members`, alteracoes em `agents`/`heartbeat_runs`/`issues`/`routine_runs` — tudo isso ja foi criado por migrations hand-written 0062-0070. Aplicar o arquivo como gerado falharia em CI com `relation already exists`. Causa raiz: drizzle-kit `meta/` snapshots tem gaps (0042/0043/0054/0059/0062-0070 ausentes), entao o diff foi calculado contra estado defasado (snapshot 0061 -> schema atual).
- **Correcao:** Editei `0071_lively_azazel.sql` manualmente para conter apenas o diff legitimo deste plano: 3 CREATE TABLE para multi-account + 6 FKs + 5 indexes (62 linhas). Header do SQL documenta o porque do trim e referencia o drift de snapshots como debt pre-existente. `meta/0071_snapshot.json` ficou intocado (reflete estado atual, drizzle usara como baseline em proximos generates).
- **Arquivos modificados:** `packages/db/src/migrations/0071_lively_azazel.sql`
- **Verificacao:** Confirmei que SQL contem `CREATE TABLE.*claude_accounts`, `CREATE TABLE.*agent_account_bindings`, `CREATE TABLE.*agent_step_executions`, `CREATE UNIQUE INDEX.*config_dir_slug` — todos os criterios de aceitacao da Tarefa 2.
- **Comitado em:** `320d47b` (parte do commit da tarefa)

**2. [Regra 1 - Bug] Comment textual `updatedAt` falsificou criterio de aceitacao append-only**

- **Encontrado durante:** Tarefa 1 (verificacao acceptance_criteria)
- **Problema:** Criterio `! grep -q "updatedAt" agent_step_executions.ts` falhou porque o JSDoc comment dizia "sem `updatedAt`" — texto literal `updatedAt` aparecia mesmo sem o campo existir.
- **Correcao:** Reescrevi o comentario para "sem campo de mutacao pos-INSERT" — mantem semantica, evita falso positivo.
- **Arquivos modificados:** `packages/db/src/schema/agent_step_executions.ts` (linhas 9-11 do JSDoc)
- **Verificacao:** `grep -q "updatedAt"` retorna PASS apos edicao.
- **Comitado em:** `ef3120c` (parte do commit da tarefa)

---

**Total de desvios:** 2 corrigidos automaticamente (1x Regra 3 bloqueador, 1x Regra 1 bug)
**Impacto no plano:** Ambos sao questoes de mecanica de geracao/verificacao, nao de design schema. Sem expansao de escopo. Drift de drizzle snapshots e debt pre-existente registrado para repo hygiene futura — nao tratado aqui.

## Problemas Encontrados

- **Drizzle-kit `meta/` snapshots desincronizados:** 9+ migrations hand-written entre 0062-0070 (e algumas anteriores) sem snapshot correspondente. Sintoma: `pnpm db:generate` produz diff que tenta recriar tabelas existentes. Mitigacao desta fase: edicao manual do SQL gerado. Resolucao definitiva (rebaseline contra estado real do DB) e tarefa de repo hygiene fora do escopo deste plano. **Recomendacao para fase futura:** roteiro `pnpm --filter @paperclipai/db db:introspect` contra Supabase para gerar snapshot baseline, ou substituir drizzle-kit generate por escrita manual SQL ate snapshots reconvergirem.

## Configuracao Manual Necessaria

Nenhuma — sem configuracao de servico externo necessaria.

**Constraint operacional importante:** Migration 0071 NAO foi aplicada contra Supabase compartilhado. Aplicacao acontece via GitHub Actions (`db-migrate.yml`) no merge para `main`, conforme DB-03 (Phase 2). Tentar aplicar localmente viola convencao e arrisca DDL inconsistente entre devs.

## Prontidao para Proxima Fase

**Pronto:**
- Schemas exportados de `@paperclipai/db` — disponivel via `import { claudeAccounts, agentAccountBindings, agentStepExecutions } from "@paperclipai/db/schema"` para o service em 05-02 (claudeAccountsService).
- Tipos TypeScript inferidos via `$inferSelect`/`$inferInsert` para uso em service/API.
- Migration ficheirizada e committada — ao merge para main, CI aplica automaticamente.

**Bloqueios para tarefas dependentes (planos paralelos da Wave 1):**
- 05-02 (claudeAccountsService): pode importar schemas e implementar API; tabelas reais existem em Supabase apenas pos-merge para main + CI run.
- 05-03 (CLAUDE_CONFIG_DIR wiring): independente do schema — pode prosseguir.
- 05-05 (UI ClaudeAccounts.tsx): pode importar tipos; dados reais via API que depende de 05-02.

**Recomendacao para integrar:** rodar 05-02 contra schema local (embedded postgres) ate CI aplicar 0071 no Supabase compartilhado.

## Self-Check: PASSED

- `packages/db/src/schema/claude_accounts.ts` exists: FOUND
- `packages/db/src/schema/agent_account_bindings.ts` exists: FOUND
- `packages/db/src/schema/agent_step_executions.ts` exists: FOUND
- `packages/db/src/migrations/0071_lively_azazel.sql` exists: FOUND
- Commit `ef3120c` exists: FOUND
- Commit `320d47b` exists: FOUND
- TypeScript `pnpm tsc --noEmit` in packages/db: exit 0 (PASS)

---
*Fase: 05-multi-account-claude-code-swap-implementacao*
*Concluida: 2026-04-26*
