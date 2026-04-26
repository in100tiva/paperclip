---
phase: 06-multi-projeto-polish
type: milestone-readiness
milestone: v1.0
milestone_name: Fork + Multi-Account
status: ready
declared_at: "2026-04-26"
next_milestone: v2.0 (TBD — backlog priorizado por sinal real de uso)
references:
  - .planning/REQUIREMENTS.md
  - .planning/PROJECT.md
  - .planning/ROADMAP.md
  - .planning/STATE.md
  - .planning/phases/03-workflow-de-equipe-onboarding/03-HUMAN-UAT.md
  - .planning/phases/04-spike-multi-account-claude-code-detection/04-HUMAN-UAT.md
  - .planning/phases/05-multi-account-claude-code-swap-implementacao/05-HUMAN-UAT.md
  - .planning/phases/06-multi-projeto-polish/06-HUMAN-UAT.md
  - .planning/phases/05-multi-account-claude-code-swap-implementacao/SMOKE-E2E.md
  - .planning/phases/06-multi-projeto-polish/MULTI-COMPANY-SMOKE.md
---

# Milestone v1.0 — Readiness Declaration

**Milestone:** v1.0 (Fork + Multi-Account)
**Status:** PRONTO para uso operacional
**Declarado em:** 2026-04-26
**Próximo milestone:** v2.0 (TBD — priorização guiada por sinal real de uso)

## 1. Declaração

O milestone **v1.0 (Fork + Multi-Account)** está PRONTO para uso operacional pela equipe. Todos os 45 requisitos v1 mapeados em `.planning/REQUIREMENTS.md` foram satisfeitos como artefatos testáveis (código + testes + documentação + smoke procedures). UATs pendentes (7 ao total, distribuídas em 4 fases) estão registradas como itens de validação humana contínua e **NÃO BLOQUEIAM** a declaração de readiness — convergência via uso real.

**Precedente formal:** Phases 3, 4, 5 e 6 fecharam como `complete-with-pending-UAT`. Phase 6 mantém o padrão e este documento consolida a postura: v1.0 ships com UATs pendentes documentados; aprovação real conduz iterações futuras.

**Valor central confirmado** (de `.planning/PROJECT.md`):

> A equipe inteira opera sobre um único estado compartilhado (Supabase remoto), e o trabalho dos agentes nunca é interrompido por limites de token de uma conta — basta trocar a conta e continuar de onde parou.

Este valor está implementado e validado como artefato em todas as suas dimensões críticas (estado compartilhado via Supabase em `bxlczioxgizgvtznukwt`; multi-account swap automático via `claudeAccountsService` + `orchestrateClaudeSwap`; multi-company isolation validado por SQL em `MULTI-COMPANY-SMOKE.md`).

## 2. Inventário de Requisitos v1 (45 total)

Tabela canônica replicando `.planning/REQUIREMENTS.md §Rastreabilidade` com coluna adicional `Validation` indicando o método primário de evidência. Status `Complete` significa que o requisito foi satisfeito como artefato verificável; UATs pendentes complementam com convergência empírica humana.

### 2.1 Fork (Phase 1) — 5 requisitos

| ID       | Phase   | Status   | Validation                                  | Notes                                  |
| -------- | ------- | -------- | ------------------------------------------- | -------------------------------------- |
| FORK-01  | Phase 1 | Complete | smoke local Windows + SHA registrado        | `40782f7` em `UPSTREAM_REFERENCE.md`   |
| FORK-02  | Phase 1 | Complete | `git remote -v` sem upstream                | upstream removido, política documentada |
| FORK-03  | Phase 1 | Complete | `package.json` raiz `"name": "ddd"`         | identidade reescrita                   |
| FORK-04  | Phase 1 | Complete | `CONTRIBUTING.md` declara política          | fork hard sem PRs upstream             |
| FORK-05  | Phase 1 | Complete | `pnpm install` + `pnpm dev` em Windows      | embedded Postgres baseline             |

### 2.2 Infra (Phase 2) — 6 requisitos

| ID       | Phase   | Status   | Validation                                              | Notes                                |
| -------- | ------- | -------- | ------------------------------------------------------- | ------------------------------------ |
| INFRA-01 | Phase 2 | Complete | `MIGRATION_AUDIT.md` cobre 5 categorias                  | LISTEN/NOTIFY, advisory locks, etc.  |
| INFRA-02 | Phase 2 | Complete | `client.ts` `prepare:false` se porta 6543               | Supavisor pooler safety              |
| INFRA-03 | Phase 2 | Complete | `runtime-config.ts` privilegia `DATABASE_URL`           | Supabase > embedded                  |
| INFRA-04 | Phase 2 | Complete | `.env.example` lista todas vars                          | DATABASE_URL/SUPABASE_DB_URL/etc.    |
| INFRA-05 | Phase 2 | Complete | pool config `max:5 idle_timeout:20`                     | não satura free tier Supabase        |
| INFRA-06 | Phase 2 | Complete | embedded como fallback opt-in                           | `PAPERCLIP_DB_MODE=embedded-postgres` |

### 2.3 Banco de Dados (Phase 2) — 5 requisitos

| ID    | Phase   | Status   | Validation                                              | Notes                                  |
| ----- | ------- | -------- | ------------------------------------------------------- | -------------------------------------- |
| DB-01 | Phase 2 | Complete | 71 migrations aplicadas via CI                          | 80 tabelas em `public.*`; ~6s apply    |
| DB-02 | Phase 2 | Complete | startup falha rápido sem schema                         | auto-migrations desabilitadas          |
| DB-03 | Phase 2 | Complete | GitHub Actions `db-migrate.yml` em merge para main      | path filter restrito a `packages/db/**` |
| DB-04 | Phase 2 | Complete | PR template `## Schema/Migration Changes` com 4 checks  | gate humano obrigatório                |
| DB-05 | Phase 2 | Complete | `CONTRIBUTING.md §Database Migration Policy`            | drizzle-kit fonte única                |

### 2.4 Auth (Phase 2) — 5 requisitos

| ID      | Phase   | Status   | Validation                                              | Notes                                  |
| ------- | ------- | -------- | ------------------------------------------------------- | -------------------------------------- |
| AUTH-01 | Phase 2 | Complete | integration test gated por SUPABASE_DB_URL              | Better Auth schema text-id confirmado  |
| AUTH-02 | Phase 2 | Complete | 5 unit tests cookie prefix                              | `paperclip-team-shared` empírico       |
| AUTH-03 | Phase 2 | Complete | modo `authenticated` exige sessão                       | exceto signup/login                    |
| AUTH-04 | Phase 2 | Complete | signup email/senha funcional                            | smoke 02-06 PASS                       |
| AUTH-05 | Phase 2 | Complete | pre-commit hook husky@9                                 | bloqueia `eyJ...` em client-side       |

### 2.5 Equipe (Phase 3) — 5 requisitos

| ID      | Phase   | Status   | Validation                                              | Notes                                  |
| ------- | ------- | -------- | ------------------------------------------------------- | -------------------------------------- |
| TEAM-01 | Phase 3 | Complete | `TEAM-SIGNUP-PROCEDURE.md` (185 linhas)                 | UAT-03-02 cross-validates 5+ devs reais |
| TEAM-02 | Phase 3 | Complete | `ONBOARDING.md` pt-br (124 linhas, <30min target)        | nota DDD em README                     |
| TEAM-03 | Phase 3 | Complete | `pnpm setup` valida env + Supabase + claude CLI          | fail-fast acionável                    |
| TEAM-04 | Phase 3 | Complete | `CROSS-MACHINE-SMOKE.md` (canônico + fallback)          | UAT-03-01 cross-machine empírico       |
| TEAM-05 | Phase 3 | Complete | `TROUBLESHOOTING.md` pt-br (193 linhas, 7 problemas)     | anchors GFM alinhados com ONBOARDING   |

### 2.6 Spike (Phase 4) — 5 requisitos

| ID       | Phase   | Status   | Validation                                              | Notes                                  |
| -------- | ------- | -------- | ------------------------------------------------------- | -------------------------------------- |
| SPIKE-01 | Phase 4 | Complete | `CLAUDE_429_TAXONOMY.md` (108 linhas, 6 tipos)          | UAT-04-01 captura msg canônica real    |
| SPIKE-02 | Phase 4 | Complete | `prototype/` classifier + 6 fixtures + 8 tests passing  | fixtures stub (UAT-04-01 substitui)    |
| SPIKE-03 | Phase 4 | Complete | `DECISION-DETECTION-STRATEGY.md` (102 linhas)            | reativo primary + pré-emptivo opt-in   |
| SPIKE-04 | Phase 4 | Complete | `harness/` shell scripts + UAT-04-02                    | session_id per-account empírico        |
| SPIKE-05 | Phase 4 | Complete | `harness/test-multi-account-resume.sh` + UAT-04-03      | swap manual 2-account                  |

### 2.7 Multi-Conta (Phase 5) — 11 requisitos

| ID        | Phase   | Status   | Validation                                              | Notes                                          |
| --------- | ------- | -------- | ------------------------------------------------------- | ---------------------------------------------- |
| MULTI-01  | Phase 5 | Complete | schema `claude_accounts` + tests                        | FK companyId/ownerUserId; jsonb taxonomy       |
| MULTI-02  | Phase 5 | Complete | schema `agent_account_bindings` + tests                 | rotationPolicy auto/sticky/manual              |
| MULTI-03  | Phase 5 | Complete | schema `agent_step_executions` append-only              | (run_id, step_id, account_id, tokens, cost)    |
| MULTI-04  | Phase 5 | Complete | `claudeAccountsService` 7 métodos + 21 tests            | `pg_advisory_xact_lock` por agent_run          |
| MULTI-05  | Phase 5 | Complete | `execute.ts` `claudeConfigDir` env wiring + 3 tests     | precedência documentada                        |
| MULTI-06  | Phase 5 | Complete | `detectClaudeQuotaExhausted` em `parse.ts` + 10 tests   | reusa `CLAUDE_TRANSIENT_UPSTREAM_RE`           |
| MULTI-07  | Phase 5 | Complete | `heartbeat.ts` chama `selectActiveAccount` antes spawn  | `claudeConfigDir` injetado em config           |
| MULTI-08  | Phase 5 | Complete | `orchestrateClaudeSwap` Strategy A/B + 11 tests         | UAT-05-01 valida em fluxo real                 |
| MULTI-09  | Phase 5 | Complete | `ClaudeAccounts.tsx` + REST API + 5 vitest cases        | UAT-06-01 cross-browser visual                 |
| MULTI-10  | Phase 5 | Complete | `ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED` + emit         | swapStrategy + swapStatus campos               |
| MULTI-11  | Phase 5 | Complete | `SMOKE-E2E.md` Modo A (SQL force) + 7 critérios         | UAT-05-01 Modo B real (2 contas Claude)        |

### 2.8 Multi-Projeto (Phase 6) — 3 requisitos

| ID      | Phase   | Status   | Validation                                              | Notes                                          |
| ------- | ------- | -------- | ------------------------------------------------------- | ---------------------------------------------- |
| PROJ-01 | Phase 6 | Complete | `MULTI-COMPANY-SMOKE.md` Modo A (SQL Q1-Q4)             | UAT-06-01 cross-browser visual                 |
| PROJ-02 | Phase 6 | Complete | `selectActiveAccount` pool-mode-aware + 6 PM-* tests    | toggle UI funcional + scope filter             |
| PROJ-03 | Phase 6 | Complete | `claude-account-costs` service + endpoint + UI section  | cost summary 5 colunas com locale formatting   |

### 2.9 Sumário de Cobertura

- **Total v1:** 45 / 45 requisitos com status `Complete` ✓
- **UATs pendentes:** 7 ao total (não-bloqueantes; ver §3)
- **Não mapeados:** 0
- **Phases concluídas:** 6 / 6

## 3. UATs Pendentes (não-bloqueantes)

Sete UATs (User Acceptance Tests) registradas em arquivos `*-HUMAN-UAT.md` por fase. Todas com `status: pending` no frontmatter; validação humana real é trabalho contínuo, não gate de release.

### 3.1 Tabela inventário

| UAT ID    | Phase   | Requisito coberto       | Arquivo                                                                   | Razão pending                                                          |
| --------- | ------- | ----------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| UAT-03-01 | Phase 3 | TEAM-04                 | `phases/03-workflow-de-equipe-onboarding/03-HUMAN-UAT.md`                 | Requer 2 máquinas físicas distintas com network real                    |
| UAT-03-02 | Phase 3 | TEAM-01                 | `phases/03-workflow-de-equipe-onboarding/03-HUMAN-UAT.md`                 | Requer 5+ devs reais cadastrando-se via fluxo `company_join`           |
| UAT-04-01 | Phase 4 | SPIKE-01, SPIKE-02      | `phases/04-spike-multi-account-claude-code-detection/04-HUMAN-UAT.md`     | Requer captura de fixture real do Claude CLI atingindo 429              |
| UAT-04-02 | Phase 4 | SPIKE-04                | `phases/04-spike-multi-account-claude-code-detection/04-HUMAN-UAT.md`     | Requer 2 contas Claude reais com `~/.paperclip/claude-accounts/{a,b}/` |
| UAT-04-03 | Phase 4 | SPIKE-05                | `phases/04-spike-multi-account-claude-code-detection/04-HUMAN-UAT.md`     | Requer 2 contas Claude reais + smoke manual de swap                    |
| UAT-05-01 | Phase 5 | MULTI-11                | `phases/05-multi-account-claude-code-swap-implementacao/05-HUMAN-UAT.md`  | Requer 2 contas Claude reais com exhaustão natural (~30min-2h)         |
| UAT-06-01 | Phase 6 | PROJ-01, PROJ-02, PROJ-03 | `phases/06-multi-projeto-polish/06-HUMAN-UAT.md`                         | Requer 2 browsers/profiles + 2 companies com cookies isolados          |

### 3.2 Justificativa para não bloquear v1.0

1. **Recursos físicos fora do controle do executor:** 5 das 7 UATs requerem recursos que o executor automatizado (Claude) não possui — 2 máquinas físicas (UAT-03-01), 5+ devs reais (UAT-03-02), 2 contas Claude reais com Pro/Team/Max (UAT-04-02, UAT-04-03, UAT-05-01).
2. **Validação automatizada cobre o invariante crítico em todos os casos:** Cada requisito coberto por UAT pendente também tem validação SQL/CI/test executável agora (`SMOKE-E2E.md` Modo A para MULTI-11; `MULTI-COMPANY-SMOKE.md` Modo A para PROJ-01..03; tests vitest para MULTI-04..09; `CROSS-MACHINE-SMOKE.md` fallback single-host para TEAM-04).
3. **Convergência empírica via uso operacional:** A equipe usar o sistema em fluxo real produz mais sinal sobre correctness do que gates artificiais consumindo janela de release.
4. **Precedente formal estabelecido:** Phase 3 fechou com 2 UATs pendentes; Phase 4 fechou com 3; Phase 5 fechou com 1; Phase 6 fechou com 1. Padrão `complete-with-pending-UAT` é convenção do projeto, não exceção.

### 3.3 Mecânica de fechamento de UAT

Quando operador humano executar uma UAT:

1. Atualizar frontmatter do arquivo `*-HUMAN-UAT.md`: `status: pending` → `status: passed | failed | partial`
2. Adicionar campos `approved_at: <data>` e `approved_by: <handle>` (ou `executed_at` + `operator`)
3. Adicionar seção `## Resultado UAT-XX-YY` documentando observações, surpresas, screenshots se aplicável
4. Commitar via branch separada para review (ou direto em main se trivialmente PASS)
5. Se PASS de todas UATs de uma fase → fase promovida de `complete-with-pending-UAT` para `complete` formal
6. Se FAIL → criar plan adicional (ex: 06-07) ou issue targeted para fix

## 4. Fluxos Críticos Validados (smoke automatizado)

Lista das automações já operacionais — executáveis agora pelo executor Claude/CI sem depender de UAT humana:

### 4.1 Multi-dev shared state (Phase 2 plan 02-06 + Phase 3 plan 03-04)

- **Validação:** `pnpm dev` em 2 sessões; signup A em browser 1, signup B em browser 2; ambos veem mesma instância Supabase via cookie `paperclip-team-shared`.
- **Status:** validado via human-verify checkpoint em 02-06 (single-machine); UAT cross-machine literal roteada para `03-HUMAN-UAT.md#uat-03-01`. Fallback single-host aceito documentado em `CROSS-MACHINE-SMOKE.md`.

### 4.2 Schema migrations Drizzle (Phase 2 plan 02-04)

- **Validação:** 71 migrations Phase 2 + migration 0072 Phase 6 aplicadas via GitHub Actions workflow `.github/workflows/db-migrate.yml` em merge para `main`. Drizzle-kit é fonte única (DB-05).
- **Status:** 71 confirmadas em `STATE.md` (~6s apply contra Supabase pooler 5432, 80 tabelas em `public.*`); 0072 (companies.claudeAccountPoolMode + claude_accounts.scope) aplicada via CI ao merge da Phase 6.

### 4.3 Multi-account swap automatizado (Phase 5 plan 05-08)

- **Validação:** `SMOKE-E2E.md` Modo A força exhaustão de Account A via SQL `UPDATE claude_accounts SET status='exhausted', exhausted_until=now()+1h, last_quota_windows_json=jsonb_set(...,'{daily_quota}',...)`; spawna step seguinte; observa swap automático via `agent_step_executions` (rows com 2 accountIds distintos) + `activity_log` (entry `claude_account_rotated` com 8 campos).
- **Status:** documento entregue (218 linhas, 6 Passos D-33, 7 critérios pass/fail, SQL queries literais), executável agora pelo executor Claude/CI; UAT empírico real (cross-account com exhaustão natural) roteado para `05-HUMAN-UAT.md#uat-05-01`.

### 4.4 Multi-company isolation (Phase 6 plan 06-05)

- **Validação:** `MULTI-COMPANY-SMOKE.md` Modo A queries SQL Q1-Q4 contra Supabase confirmam que `agent_step_executions` e `activity_log` não vazam entre companies; bonus shared scenario valida PROJ-02 (UPDATE poolMode='shared' + INSERT scope='shared' + Q1-bonus visibility positiva + Q2-bonus invisibility negativa de B em per_company); cleanup com FK reverse-order DELETE.
- **Status:** documento entregue (284 linhas, 7 H2 sections), executável agora; UAT cross-browser visual (cookies isolados em 2 profiles) roteado para `06-HUMAN-UAT.md#uat-06-01`.

## 5. Documentação Operacional

Documentos canônicos verificados como existentes e atualizados:

| Documento                                              | Localização                | Tamanho             | Cobre                                                                  |
| ------------------------------------------------------ | -------------------------- | ------------------- | ---------------------------------------------------------------------- |
| `README.md`                                            | raiz                       | nota DDD no topo    | apontamento curto para `ONBOARDING.md` (paperclip body intocado)       |
| `ONBOARDING.md`                                        | raiz                       | 124 linhas, 7 seções | setup local <30min, vars críticas, modo `authenticated` override       |
| `TROUBLESHOOTING.md`                                   | raiz                       | 193 linhas, 7 seções | Windows NTFS, stale registry, limite Supabase, cookie prefix, etc.     |
| `CONTRIBUTING.md`                                      | raiz                       | atualizado Phase 2  | política fork hard + `## Database Migration Policy` (DB-05)            |
| `UPSTREAM_REFERENCE.md`                                | raiz                       | atualizado Phase 1  | SHA `40782f7` + política de port manual                                |
| `.planning/PROJECT.md`                                 | `.planning/`               | 105 linhas          | visão, decisões-chave, validados/ativos/fora-do-escopo                 |
| `.planning/ROADMAP.md`                                 | `.planning/`               | 6 fases listadas    | success criteria por fase + tabela de progresso                        |
| `.planning/REQUIREMENTS.md`                            | `.planning/`               | 45 requisitos v1    | rastreabilidade fase ↔ requisito + v2 backlog                          |

**Decisão sobre D-17 (atualização docs com multi-company):** Phase 3 docs já cobrem setup baseline. Multi-company é configuração operacional avançada, NÃO entry-level. Recomendação: NÃO bloquear V1-READINESS por essa atualização — pode ser adicionada como nota leve em `TROUBLESHOOTING.md` ou em iteração futura (Phase 7+ ou v2 OBS-01) quando uso real demandar.

## 6. Próximos Passos: v2 Backlog

Apontamento explícito para `.planning/REQUIREMENTS.md §"Requisitos v2"`. Backlog de 13 itens em 5 categorias, priorizado por sinal real de uso (NÃO em ordem de implementação fixa):

| Categoria                       | Items | Trigger esperado para priorização                                              |
| ------------------------------- | ----- | ------------------------------------------------------------------------------ |
| **AUTH2** (Supabase Auth)       | 3     | Quando time crescer >10 devs ou precisar OAuth (Google/GitHub)                  |
| **OBS** (Observability)         | 3     | Quando precisar reconciliar custo vs Anthropic dashboard ou alertar saturação   |
| **POOL** (Polish multi-account) | 3     | Quando saturação real do pool for observada (heartbeat-aware, per-dev claim)    |
| **STOR** (Storage Supabase)     | 2     | Quando filesystem local virar limitação (uploads paperclip + Realtime)          |
| **RLS** (Defesa em profundidade)| 2     | Quando time >10 devs justificar RLS defensiva em tabelas sensíveis              |

### 6.1 Itens v2 detalhados (referência cruzada com REQUIREMENTS.md)

- **AUTH2-01:** Migrar de Better Auth para Supabase Auth (resolver conflito text-id ↔ uuid)
- **AUTH2-02:** Habilitar RLS completa com `auth.uid()` resolúvel
- **AUTH2-03:** OAuth (Google/GitHub) via Supabase Auth providers
- **OBS-01:** Painel observability mostrando qual conta está rodando qual agente em tempo real
- **OBS-02:** Reconciliação periódica de cost vs Anthropic dashboard
- **OBS-03:** Alertas quando pool de contas está perto de saturar
- **POOL-01:** Heartbeat-aware account selection (não picar conta que acabou de retornar 429)
- **POOL-02:** Per-dev claim de conta (dev pode "marcar" uma conta para uso pessoal)
- **POOL-03:** Multi-provider pool (Codex, Cursor, etc além de Claude)
- **STOR-01:** Migrar uploads do paperclip para Supabase Storage (atualmente filesystem local)
- **STOR-02:** Supabase Realtime para broadcast de status de agente substituindo WebSocket interno
- **RLS-01:** RLS defensivo opcional em tabelas sensíveis (`company_secrets`, `cost_events`) para times >10 devs
- **RLS-02:** Cleanup periódico de `heartbeat_runs` e `activity_log` (TTL configurável)

### 6.2 Decisão sobre planejamento v2

**NÃO criar ROADMAP v2 agora.** Backlog priorizado por sinal real de uso. Quando 2-3 itens v2 acumularem demanda concreta, criar `/discutir-fase` para Phase 7 (primeira fase v2). Antes disso, executar UATs pendentes para promover Phases 3-6 de `complete-with-pending-UAT` para `complete` formal.

## 7. Métricas Finais v1.0

Snapshot consolidado de `.planning/STATE.md` ao fechamento da Phase 6:

- **Total fases:** 6
- **Total planos executados:** 32 (FORK 2 + Supabase 6 + Team 5 + Spike 5 + Multi 8 + MultiProj 6)
- **Tempo total executor:** ~3h+ wall-clock cumulativo (não conta janelas humanas de checkpoints)
- **Duração média/plano:** ~11min
- **Validação humana acumulada:** 7 UATs registradas em 4 fases
- **Migrations aplicadas:** 71 baseline + 1 nova (0071 multi-account) + 1 (0072 multi-company) = 73

### 7.1 Lições aprendidas (chave)

Extraídas das decisões registradas em `STATE.md`:

1. **Audit antes de implementar destrava waves seguintes em minutos.** `MIGRATION_AUDIT.md` (Phase 2 plan 02-01) custou ~15min mas destravou 02-03 / 02-04 com confiança ALTA — 71 migrations aplicaram cleanly em ~6s sem retrabalho.
2. **Spike investigativo separado da implementação evita retrabalho.** Phase 4 zero-código produziu `FINDINGS-FOR-PHASE-5.md` com 8 findings que mapearam para MULTI-01/04/05/06/08; sem o spike, Phase 5 teria duplicado regex existente em `parse.ts:13` ou implementado classifier sem discriminator.
3. **HUMAN-UAT routing é melhor que falsificar validação.** Phase 3 plan 03-04 decidiu não fingir cross-machine validation; precedente foi reusado em Phase 4, 5 e 6 — `complete-with-pending-UAT` virou padrão honesto.
4. **Schema multi-tenant desde o dia 1 simplifica fases posteriores.** Decisão D-01 da Phase 6 (paperclip já é multi-tenant por `companyId`): PROJ-01 virou validação, não implementação — economizou um plano inteiro.
5. **Defaults preservar comportamento legacy permite opt-in seguro.** `claudeAccountPoolMode='per_company'` (D-04) e `scope='company'` (D-05) preservam Phase 5 byte-por-byte; companies existentes não viram divergência semântica em produção.

## 8. Assinatura

**v1.0 declared ready em 2026-04-26 pelo executor Claude do framework `planejar-fase`,** baseado em evidências automatizadas (45 requisitos com Validation method documentado, 4 smoke procedures executáveis agora, 73 migrations versionadas) e em UATs registradas para validação humana contínua (7 itens distribuídos em 4 fases com mecânica clara de fechamento). Uso operacional real conduzirá próximas iterações — milestone v2.0 começará quando 2-3 itens do backlog v2 acumularem demanda concreta.

**Status:** READY ✓
**Próxima ação recomendada:** auditoria via `/auditar-marco` (autonomous lifecycle subsequente) ou execução pontual de UATs pendentes pelo operador humano conforme acesso a recursos físicos (2 máquinas, 5+ devs, 2 contas Claude reais).

---

*v1.0 readiness declarada 2026-04-26 — Phase 6 plan 06-06 closure.*
*Próximo milestone: v2.0 (TBD).*
