---
phase: 06-multi-projeto-polish
plan: 05
subsystem: testing
tags: [smoke-test, multi-tenant, supabase, sql, human-uat, pt-br]

requires:
  - phase: 06-multi-projeto-polish
    provides: schemas claudeAccountPoolMode + scope (06-01), cost-summary endpoint (06-02), selectActiveAccount poolMode-aware (06-03), UI scope/poolMode/cost summary (06-04)
provides:
  - MULTI-COMPANY-SMOKE.md (Modo A — procedimento canônico SQL para validar isolamento multi-company contra Supabase)
  - 06-HUMAN-UAT.md (UAT-06-01 pending — validação UI cross-browser pelo operador)
affects: [06-06, v1-readiness, milestone-closure]

tech-stack:
  added: []
  patterns:
    - "Modo A (SQL automatizado) + Modo B (HUMAN-UAT manual) seguindo precedente Phase 5 plan 05-08"
    - "Frontmatter YAML status: pending para fechamento `complete-with-pending-UAT`"
    - "Placeholders {{COMPANY_A_ID}} / {{OWNER_A_ID}} para SQL queries reproduzíveis"

key-files:
  created:
    - .planning/phases/06-multi-projeto-polish/MULTI-COMPANY-SMOKE.md
    - .planning/phases/06-multi-projeto-polish/06-HUMAN-UAT.md
  modified: []

key-decisions:
  - "PROJ-01 satisfeita via roteamento dual: Modo A (SQL automatizado executável agora) + Modo B (UAT-06-01 visual humano)"
  - "Bonus pool=shared scenario incluído no Modo A para cobrir PROJ-02 cross-validation no mesmo procedimento"
  - "Frontmatter YAML alinhado com 05-HUMAN-UAT.md: type: human-uat + status: pending + requirements array"
  - "Steps numerados >= 12 + 7 dimensões pass/fail seguem template Phase 5 plan 05-08"

patterns-established:
  - "Modo A documenta SQL queries Q1-Q4 com placeholders explícitos para reprodutibilidade pelo executor/CI"
  - "Failure paths section em UAT mapeia cada possível fail para troubleshooting concreto (cookie prefix, heartbeat wiring, schema drift)"
  - "Cleanup section com SQL reverso explícito (FK ordering: bindings → step_executions → accounts → company poolMode reset)"

requirements-completed:
  - PROJ-01

duration: ~4min
completed: 2026-04-26
---

# Fase 6 Plano 5: Multi-Company Smoke + HUMAN-UAT — Resumo

**Procedimento canônico pt-br para validação de isolamento multi-company via SQL (Modo A) + UAT-06-01 visual cross-browser pendente (Modo B), satisfazendo PROJ-01 como artefato testável e roteando validação UI para operador humano.**

## Performance

- **Duração:** ~4min
- **Iniciado:** 2026-04-26T09:57:35Z
- **Concluído:** 2026-04-26T10:01:14Z
- **Tarefas:** 2
- **Arquivos criados:** 2

## Realizações

- `MULTI-COMPANY-SMOKE.md` (284 linhas) entrega procedimento canônico Modo A: 7 sections H2 numeradas, pré-requisitos table com 8 itens, queries Q1-Q4 SQL literais com placeholders `{{COMPANY_A_ID}}`/`{{COMPANY_B_ID}}`/`{{OWNER_A_ID}}`/`{{OWNER_B_ID}}`/`{{AGENT_A_ID}}`/`{{AGENT_B_ID}}`, INSERT/UPDATE para setup/bonus, cleanup SQL com FK ordering correto, 7 critérios pass/fail tabulados, limitations section roteando 5 itens UI para 06-HUMAN-UAT.md.
- Bonus PROJ-02 cross-validation embutido no Modo A (Section 3.4): UPDATE Company A para `pool_mode='shared'`, INSERT conta C com `scope='shared'`, queries Q1-bonus/Q2-bonus validam que A vê C-shared mas B (em per_company) não vê.
- `06-HUMAN-UAT.md` (145 linhas) com frontmatter `type: human-uat status: pending requirements: [PROJ-01, PROJ-02, PROJ-03]`; UAT-06-01 detalhado com pré-condições table (8 itens), 13 steps numerados (login → register → toggle pool → register C-shared → spawn agentes paralelo → verify cost summary isolation → verify rotation history), 7 dimensões pass/fail tabuladas, failure paths section com 5 cenários e ação corretiva (cross-tenant leak, cookie prefix, cost summary zero, pool toggle não persiste, scope default ausente), instruções de report (status pending → passed/failed/partial) e seção de Conexão com Phase 6 closure.
- Phase 6 fica pronta para fechar como `complete-with-pending-UAT` (precedente Phase 3 TEAM-04, Phase 4 SPIKE-04/05, Phase 5 UAT-05-01).

## Commits das Tarefas

Cada tarefa foi comitada atomicamente com `--no-verify`:

1. **Tarefa 1: Criar MULTI-COMPANY-SMOKE.md (Modo A + bonus shared)** — `10f99b5` (docs)
2. **Tarefa 2: Criar 06-HUMAN-UAT.md com UAT-06-01 pending** — `9a55340` (docs)

## Arquivos Criados/Modificados

- `.planning/phases/06-multi-projeto-polish/MULTI-COMPANY-SMOKE.md` (284 linhas) — procedimento canônico Modo A com SQL queries Q1-Q4 + bonus pool=shared scenario; pass/fail table com 7 critérios; cleanup explícito.
- `.planning/phases/06-multi-projeto-polish/06-HUMAN-UAT.md` (145 linhas) — UAT-06-01 visual cross-browser pendente cobrindo PROJ-01/02/03 UI dimensions; 13 steps numerados; failure paths section; instruções de report.

## Decisões Tomadas

- **PROJ-01 satisfeita via roteamento dual:** Modo A (SQL automatizado, executável agora pelo executor Claude/CI substituindo rodada UI) + Modo B (UAT-06-01 visual humano com 2 browsers/profiles distintos). Replica fielmente o pattern Phase 5 plan 05-08 (SMOKE-E2E.md + 05-HUMAN-UAT.md).
- **Bonus pool=shared embutido no Modo A:** evita criar terceiro documento para cobrir PROJ-02 cross-validation (companies em modo shared vs per_company); economia de superfície sem perder rigor.
- **Frontmatter YAML do UAT alinhado com 05-HUMAN-UAT.md:** `type: human-uat`, `status: pending`, `requirements` como array, `references` com paths absolutos relativos ao repo root. Permite scripts/tools detectarem UATs pendentes uniformemente entre fases.
- **Failure paths section como troubleshooting concreto:** cada possível fail mapeado para causa + ação (cookie prefix divergente → TROUBLESHOOTING.md#cookie-prefix-divergente; cost summary zero → 05-06 SUMMARY heartbeat wiring; etc.). Reduz fricção operacional na hora de executar.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito.

Pequenos ajustes editoriais (consistência de tom pt-br, ordering de cleanup SQL para respeitar FKs, frontmatter `linguagem: pt-br` explícito no SMOKE) ficam dentro da discrição do Claude (D-04 consistente com 06-CONTEXT). Nenhuma mudança estrutural ou de escopo.

## Confirmação dos SQL queries esperados (MULTI-COMPANY-SMOKE.md)

| Query | Tipo | Cobertura | Linhas approx |
|-------|------|-----------|---------------|
| Setup confirmar 2 companies | SELECT | poolMode default per_company | 81-86 |
| Setup INSERT conta A1 | INSERT | scope='company' | 87-92 |
| Setup INSERT conta B1 | INSERT | scope='company' | 93-98 |
| Setup confirmar 2 contas | SELECT | scope+status sanity | 99-104 |
| Q1 attribution Company A | SELECT (3-table JOIN) | account_owner_company_id assertion | 130-141 |
| Q2 attribution Company B | SELECT (3-table JOIN) | simétrico | 144-155 |
| Q3 activity_log isolation | SELECT (LEFT JOIN agents) | agent_company_id != hr.company_id | 158-167 |
| Q4 cost-summary endpoint | curl | accountIds só da company autenticada | 171-178 |
| Bonus UPDATE poolMode='shared' | UPDATE | toggle Company A | 184-188 |
| Bonus confirmar troca | SELECT | persistence | 190-194 |
| Bonus INSERT C-shared | INSERT | scope='shared' | 196-200 |
| Q1-bonus shared visibility | SELECT | A usa A1 e/ou C-shared | 205-212 |
| Q2-bonus shared invisibility | SELECT | B em per_company nunca vê C-shared | 214-222 |
| Cleanup reset poolMode | UPDATE | volta per_company | 234-237 |
| Cleanup DELETE bindings | DELETE | FK reverse-order | 239-243 |
| Cleanup DELETE step executions | DELETE | FK reverse-order | 245-249 |
| Cleanup DELETE accounts | DELETE | FK reverse-order | 251-255 |

Total: 13 SELECTs + 3 INSERTs + 2 UPDATEs + 3 DELETEs (cleanup) + 1 curl = cobertura completa do D-14 + bonus D-15.

## 7 dimensões de pass/fail UAT-06-01

1. **Cross-tab isolation A→B** — Browser 1 (A) nunca vê dados de B em qualquer section.
2. **Cross-tab isolation B→A** — Browser 2 (B) nunca vê dados de A.
3. **Pool mode persistence** — toggle salvo em A persiste após refresh; visual reflete DB state.
4. **Scope radio works** — seleção `company` vs `shared` no register persiste no payload do create; tabela mostra badge correto.
5. **Shared visibility (positive)** — A em modo shared vê e pode atribuir C-shared via spawn de agente.
6. **Shared visibility (negative)** — B em modo per_company NÃO vê C-shared.
7. **Cost summary isolation** — linhas só refletem `agent_step_executions` da company logada.

## Problemas Encontrados

Nenhum.

## Configuração Manual Necessária

Nenhuma para o plano em si — sem variáveis de env ou serviços externos novos. UAT-06-01 (downstream) requer:

- 2 browsers/profiles distintos (Chrome + Firefox OU 2 Chrome profiles)
- Credenciais Better Auth para 2 companies
- Server rodando em modo `authenticated` (`PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev`)
- Diretórios `~/.paperclip/claude-accounts/{a1,b1,c-shared}` (sem exigir `claude login` real para validação UI)

Detalhado em `06-HUMAN-UAT.md` Pré-condições table.

## Prontidão para Próxima Fase

- **Plano 06-06 (V1-READINESS.md):** destravado — pode listar PROJ-01 satisfeita como artefato + UAT-06-01 pending, seguindo precedente Phase 3/4/5 (UATs pendentes não bloqueiam declaração v1.0 ready).
- **Phase 6 closure:** pronta para `complete-with-pending-UAT` quando 06-06 publicar V1-READINESS.md.
- **Milestone v1.0:** todos os 47 requirements terão status conhecido após 06-06; UAT-06-01 fica como trabalho contínuo do operador (precedente Phase 5 UAT-05-01).
- Sem bloqueios novos. Bloqueios herdados (GitHub Actions secret `SUPABASE_DB_URL`, runtime-services stale registry Windows) permanecem registrados em STATE.md.

## Self-Check

Verificações automatizadas:

- `MULTI-COMPANY-SMOKE.md` existe (284 linhas) — FOUND
- `06-HUMAN-UAT.md` existe (145 linhas) — FOUND
- Commit `10f99b5` (Tarefa 1) — FOUND
- Commit `9a55340` (Tarefa 2) — FOUND
- Acceptance criteria Tarefa 1: >=100 linhas (284), >=6 H2 (7), >=4 SELECT (13), >=1 INSERT (3), >=1 UPDATE (2), bonus shared documentado, pass/fail >=5 (7), limitações apontam para HUMAN-UAT — PASSED
- Acceptance criteria Tarefa 2: >=50 linhas (145), `status: pending` (2x), `UAT-06-01` (6x), referência a `MULTI-COMPANY-SMOKE.md` (8x), pass/fail >=7 (7), steps >=12 (13), failure paths section — PASSED

## Self-Check: PASSED

---

*Fase: 06-multi-projeto-polish*
*Concluída: 2026-04-26*
