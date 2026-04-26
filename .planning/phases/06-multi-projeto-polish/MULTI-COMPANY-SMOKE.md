---
phase: 06-multi-projeto-polish
type: smoke-procedure
requirement: PROJ-01
status: ready
linguagem: pt-br
---

# MULTI-COMPANY-SMOKE: Validação de Isolamento Multi-Company

**Phase:** 6 (Multi-Projeto + Polish)
**Requirement:** PROJ-01 (success criterion #1 do ROADMAP — duas companies rodam agentes em paralelo no mesmo Supabase sem cross-contamination)
**Decisão fonte:** D-14, D-15 (`.planning/phases/06-multi-projeto-polish/06-CONTEXT.md`)
**Linguagem:** pt-br (artefato interno; convenção `.planning/`)
**Status:** Procedimento documentado; validação UI cross-browser em `06-HUMAN-UAT.md` (UAT-06-01)

## 1. Objetivo

Validar empiricamente o success criterion #1 do ROADMAP Phase 6: Duas companies rodam agentes em paralelo no mesmo Supabase sem cross-contamination. D-01 (06-CONTEXT) reforça que isolamento por `companyId` já é core no paperclip — todas as queries de domínio (agentes, runs, costs, invites, activity log) já filtram por company desde a fundação. Este procedimento **VALIDA** o invariante após introdução do pool config (Phase 6) e do swap multi-account (Phase 5); **não implementa** isolamento novo.

Este smoke tem **dois modos**:

- **Modo A (automatizado, D-14):** SQL queries diretas contra Supabase exercitam o invariante (`agent_step_executions` + `activity_log` filtrados por `companyId` não vazam entre companies). Executável agora pelo executor Claude/CI; substitui rodada de UI.
- **Modo B (manual, D-15):** Operador humano abre 2 browsers/profiles em 2 companies distintas e valida visualmente que UI `ClaudeAccounts`, `CompanySettings` e `cost-summary` não vazam dados. Coberto em `06-HUMAN-UAT.md` UAT-06-01.

Este documento cobre **Modo A** + bonus PROJ-02 cross-validation (pool shared scenario). Modo B fica para HUMAN-UAT.

## 2. Pré-requisitos

| Item | Como obter/verificar |
|------|----------------------|
| Migration 0072 aplicada via CI em `main` | GitHub Actions workflow `db-migrate.yml` executou após merge dos plans 06-01..06-04; verificar última run em https://github.com/<owner>/<repo>/actions |
| `companies.claudeAccountPoolMode` column existe | `psql $SUPABASE_DB_URL -c "\d companies"` mostra coluna `claude_account_pool_mode text NOT NULL DEFAULT 'per_company'` |
| `claude_accounts.scope` column existe | `psql $SUPABASE_DB_URL -c "\d claude_accounts"` mostra coluna `scope text NOT NULL DEFAULT 'company'` |
| Pelo menos 2 companies em Supabase | `SELECT id, name FROM companies` retorna >= 2 rows; pode reusar dev signups Phase 3 ou seed via SQL |
| Pelo menos 1 agente por company | `SELECT id, label, company_id FROM agents WHERE company_id IN (...)` retorna >= 1 row por company |
| Acesso a Supabase Studio (SQL editor) ou psql | https://supabase.com/dashboard/project/bxlczioxgizgvtznukwt/sql ou `psql $SUPABASE_DB_URL` |
| Credenciais Better Auth para ambas companies | Via Phase 3 invite flow ou direct DB seed; necessário para Passo 3.2 (spawn de agentes via UI) |
| 2 contas Claude reais OU registradas via UI | `~/.paperclip/claude-accounts/<slug>` por conta; `claude login` feito (Modo A não exige exhaustão real, apenas estrutura de diretório) |

## 3. Modo A — Validação automatizada via SQL (D-14 / executável agora)

Substitua os placeholders abaixo antes de executar:

- `{{COMPANY_A_ID}}` — UUID da Company A
- `{{COMPANY_B_ID}}` — UUID da Company B
- `{{OWNER_A_ID}}` — UUID do owner user da Company A
- `{{OWNER_B_ID}}` — UUID do owner user da Company B
- `{{AGENT_A_ID}}` — UUID do agente de teste em Company A
- `{{AGENT_B_ID}}` — UUID do agente de teste em Company B

### 3.1 Setup via SQL

```sql
-- Confirmar 2 companies existem com poolMode default per_company
SELECT id, name, claude_account_pool_mode
FROM companies
WHERE id IN ('{{COMPANY_A_ID}}', '{{COMPANY_B_ID}}');
-- Esperado: 2 rows, ambas com claude_account_pool_mode = 'per_company'

-- Registrar 1 conta Claude para Company A (scope = 'company')
INSERT INTO claude_accounts (
  company_id, owner_user_id, label, config_dir_slug, status, scope
) VALUES (
  '{{COMPANY_A_ID}}', '{{OWNER_A_ID}}', 'A1', 'a1', 'live', 'company'
);

-- Registrar 1 conta Claude para Company B (scope = 'company')
INSERT INTO claude_accounts (
  company_id, owner_user_id, label, config_dir_slug, status, scope
) VALUES (
  '{{COMPANY_B_ID}}', '{{OWNER_B_ID}}', 'B1', 'b1', 'live', 'company'
);

-- Confirmar 2 contas registradas
SELECT id, company_id, label, scope, status
FROM claude_accounts
WHERE company_id IN ('{{COMPANY_A_ID}}', '{{COMPANY_B_ID}}')
ORDER BY company_id, label;
-- Esperado: 2 rows (A1 ligada a Company A, B1 ligada a Company B), ambas scope='company' status='live'
```

### 3.2 Spawn de agentes em paralelo

Para exercitar `selectActiveAccount` + `recordStepExecution` em ambas as companies, é necessário rodar agentes reais. Há 3 caminhos viáveis:

1. **Via UI manual:** Abrir 2 sessões Better Auth em browsers/profiles distintos (uma por company); navegar para `/:companyPrefix/agents` e disparar uma run trivial em cada agent. Caminho recomendado quando o operador já está validando UI (sobrepõe Modo B).
2. **Via heartbeat manual:** Invocar `pnpm --filter @paperclipai/server dev` em modo `authenticated` e usar payloads HTTP autenticados para criar runs. Útil para CI futura.
3. **Via seed direto (curto-circuito):** INSERT manual em `heartbeat_runs` + `agent_step_executions` linkando `account_id` da company correta. **NÃO recomendado para validação real** — pula `selectActiveAccount`, mas serve como sanity check de schema FK.

Registrar timestamp de início em log de execução; aguardar pelo menos 1 step concluído por agent (verificável via `SELECT count(*) FROM agent_step_executions WHERE run_id IN (SELECT id FROM heartbeat_runs WHERE agent_id IN ('{{AGENT_A_ID}}','{{AGENT_B_ID}}')) AND completed_at IS NOT NULL`).

### 3.3 Validações SQL (após run)

#### Q1 — agent_step_executions de Company A só usam contas de Company A

```sql
SELECT
  hr.company_id,
  ase.account_id,
  ca.company_id AS account_owner_company_id,
  ca.scope,
  ca.label
FROM agent_step_executions ase
  JOIN heartbeat_runs hr ON hr.id = ase.run_id
  JOIN claude_accounts ca ON ca.id = ase.account_id
WHERE hr.company_id = '{{COMPANY_A_ID}}';
-- Esperado: TODAS as rows com (account_owner_company_id = '{{COMPANY_A_ID}}' AND ca.scope = 'company')
-- FALHA: qualquer row com account_owner_company_id != '{{COMPANY_A_ID}}' indica vazamento (a menos que ca.scope = 'shared' E company A esteja em modo shared — ver bonus 3.4)
```

#### Q2 — Idem invertido para Company B (paranoia simétrica)

```sql
SELECT
  hr.company_id,
  ase.account_id,
  ca.company_id AS account_owner_company_id,
  ca.scope,
  ca.label
FROM agent_step_executions ase
  JOIN heartbeat_runs hr ON hr.id = ase.run_id
  JOIN claude_accounts ca ON ca.id = ase.account_id
WHERE hr.company_id = '{{COMPANY_B_ID}}';
-- Esperado: TODAS as rows com (account_owner_company_id = '{{COMPANY_B_ID}}' AND ca.scope = 'company')
-- FALHA: qualquer row com account_owner_company_id != '{{COMPANY_B_ID}}'
```

#### Q3 — activity_log de Company A não tem eventos com agentId pertencente a Company B

```sql
SELECT
  al.id,
  al.action,
  al.agent_id,
  a.company_id AS agent_company_id
FROM activity_log al
  LEFT JOIN agents a ON a.id = al.agent_id
WHERE al.company_id = '{{COMPANY_A_ID}}'
  AND a.company_id IS NOT NULL
  AND a.company_id != '{{COMPANY_A_ID}}';
-- Esperado: 0 rows
-- FALHA: qualquer row indica que activity_log de A capturou evento de agent pertencente a outra company
```

Idem invertido para Company B (substituir A↔B no WHERE).

#### Q4 — Cost summary endpoint validation (chamada autenticada)

```bash
# Substituir <COOKIE_VALUE_A> pelo cookie paperclip-team-shared.session_token da Company A
curl -sS \
  -H "Cookie: paperclip-team-shared.session_token=<COOKIE_VALUE_A>" \
  "http://localhost:3100/api/companies/{{COMPANY_A_ID}}/claude-accounts/cost-summary"
# Esperado: JSON array com rows todas referindo accountId pertencente a Company A (ou scope='shared' se A está em modo shared); nunca accountId exclusivo de B
```

Idem invertido para Company B (cookie e companyId trocados). FALHA: qualquer linha retornada cujo `accountId` pertença a `claude_accounts` da company oposta com `scope = 'company'`.

### 3.4 Bonus — Pool shared scenario (D-15 / PROJ-02 cross-validation)

Etapa adicional valida que `claudeAccountPoolMode` muda comportamento de seleção e que companies em modo `per_company` **não** veem contas `shared` de outra company.

```sql
-- Mudar Company A para modo 'shared'
UPDATE companies
SET claude_account_pool_mode = 'shared'
WHERE id = '{{COMPANY_A_ID}}';

-- Confirmar a troca persistiu
SELECT id, name, claude_account_pool_mode
FROM companies
WHERE id = '{{COMPANY_A_ID}}';
-- Esperado: claude_account_pool_mode = 'shared'

-- Criar conta C com scope='shared' (owner pode ser de A ou B; irrelevante para visibilidade)
INSERT INTO claude_accounts (
  company_id, owner_user_id, label, config_dir_slug, status, scope
) VALUES (
  '{{COMPANY_A_ID}}', '{{OWNER_A_ID}}', 'C-shared', 'c-shared', 'live', 'shared'
);
```

Spawnar novo agent run em Company A, depois em Company B (ver Passo 3.2). Validar:

```sql
-- Q1-bonus: Company A (modo shared) deve poder usar conta C-shared além de A1
SELECT DISTINCT ca.label, ca.scope
FROM agent_step_executions ase
  JOIN heartbeat_runs hr ON hr.id = ase.run_id
  JOIN claude_accounts ca ON ca.id = ase.account_id
WHERE hr.company_id = '{{COMPANY_A_ID}}'
  AND ase.started_at > now() - interval '15 minutes';
-- Esperado: account_label ∈ {'A1', 'C-shared'} (round-robin pode pegar qualquer um); ca.scope ∈ {'company','shared'}

-- Q2-bonus: Company B (ainda em per_company) NÃO deve usar C-shared
SELECT DISTINCT ca.label, ca.scope
FROM agent_step_executions ase
  JOIN heartbeat_runs hr ON hr.id = ase.run_id
  JOIN claude_accounts ca ON ca.id = ase.account_id
WHERE hr.company_id = '{{COMPANY_B_ID}}'
  AND ase.started_at > now() - interval '15 minutes';
-- Esperado: APENAS {'B1'} com scope='company'
-- FALHA: qualquer row com label='C-shared' indica que filtro scope/poolMode falhou em isolar
```

## 4. Pass/Fail Criteria

| # | Critério | Pass se | Fail se |
|---|----------|---------|---------|
| 1 | Q1/Q2 cross-tenant attribution | 0 rows com `account_owner_company_id != hr.company_id` (exceto scope='shared' bonus) | qualquer row com vazamento |
| 2 | Q3 activity_log isolation | 0 rows retornadas | >= 1 row indica eventos cross-company |
| 3 | Q4 cost-summary endpoint | endpoint só retorna accountIds da company autenticada | retorna accountIds de outra company |
| 4 | UI Company A não mostra contas de B | (delegado a UAT-06-01 / Modo B) | (delegado a UAT-06-01 / Modo B) |
| 5 | Bonus shared visibility | Company A em modo shared usa A1 e/ou C-shared; Company B em per_company usa apenas B1 | Company B mostra C-shared OU Company A nunca usa C-shared |
| 6 | agent_account_bindings.activeAccountId legítimo | binding aponta apenas para conta cuja `companyId = agent.companyId` (ou scope='shared' se poolMode='shared') | binding aponta para conta inválida |
| 7 | Logs server sem erros durante run | `pnpm --filter @paperclipai/server dev` stdout/stderr limpos durante 3.2 | erros `cross-tenant` / `unauthorized` / `null companyId` |

## 5. Cleanup

```sql
-- Reset Company A para per_company (default)
UPDATE companies
SET claude_account_pool_mode = 'per_company'
WHERE id = '{{COMPANY_A_ID}}';

-- Limpar contas de teste (ordem reversa por FK)
-- Bindings que referenciam contas a remover
DELETE FROM agent_account_bindings
WHERE active_account_id IN (
  SELECT id FROM claude_accounts WHERE config_dir_slug IN ('a1', 'b1', 'c-shared')
);

-- Step executions que referenciam contas a remover
DELETE FROM agent_step_executions
WHERE account_id IN (
  SELECT id FROM claude_accounts WHERE config_dir_slug IN ('a1', 'b1', 'c-shared')
);

-- Contas
DELETE FROM claude_accounts
WHERE config_dir_slug IN ('a1', 'b1', 'c-shared')
  AND company_id IN ('{{COMPANY_A_ID}}', '{{COMPANY_B_ID}}');

-- Activity log entries do smoke (opcional — preservar para auditoria pode ser preferido)
-- DELETE FROM activity_log
-- WHERE company_id IN ('{{COMPANY_A_ID}}', '{{COMPANY_B_ID}}')
--   AND action = 'claude_account_rotated'
--   AND created_at > now() - interval '1 hour';
```

Não rodar contra company de produção sem coordenação. Preferível executar em companies dedicadas de smoke (ex: `smoke-A`, `smoke-B`).

## 6. Limitações (roteadas para HUMAN-UAT)

Modo A (SQL) **não cobre**:

- **Validação UI cross-tab/cross-browser:** `CompanySettings` em A vs B simultâneo, listagem `ClaudeAccounts` exclusiva por company logada, badge `shared` aparecendo só onde apropriado (delegado a UAT-06-01 dimensões 1-4).
- **Cost summary visual rendering:** tabela de custos mostrando apenas linhas da company logada, formatação locale-agnostic, estados loading/empty/populated (delegado a UAT-06-01 dimensão 7).
- **Toggle pool mode persistence + immediate effect:** verificar que a mudança via `CompanySettings` persiste após refresh e tem efeito em próximo agent spawn (delegado a UAT-06-01 dimensão 3).
- **Cross-browser cookie isolation:** cookie `paperclip-team-shared.session_token` corretamente isolado entre profiles distintos do mesmo browser ou browsers diferentes (delegado a UAT-06-01 dimensão 1-2).
- **UX/percepção operacional em modo shared:** se pool maior introduz lentidão perceptível ou comportamento inesperado de round-robin (delegado a UAT-06-01 / observação durante execução).

Estas validações ficam em `06-HUMAN-UAT.md` (UAT-06-01).

## Referências

- `.planning/phases/06-multi-projeto-polish/06-CONTEXT.md` (D-01, D-04, D-05, D-06, D-14, D-15)
- `.planning/phases/06-multi-projeto-polish/06-HUMAN-UAT.md` (UAT-06-01)
- `.planning/phases/06-multi-projeto-polish/06-01-SUMMARY.md` (migration 0072 + schemas)
- `.planning/phases/06-multi-projeto-polish/06-02-SUMMARY.md` (cost-summary endpoint)
- `.planning/phases/06-multi-projeto-polish/06-03-SUMMARY.md` (selectActiveAccount poolMode-aware)
- `.planning/phases/06-multi-projeto-polish/06-04-SUMMARY.md` (UI scope/poolMode/cost summary)
- `.planning/phases/05-multi-account-claude-code-swap-implementacao/SMOKE-E2E.md` (template Modo A para Phase 5)
- `.planning/REQUIREMENTS.md` §"Multi-Projeto" (PROJ-01, PROJ-02, PROJ-03)
- `packages/db/src/schema/companies.ts` (`claudeAccountPoolMode` column)
- `packages/db/src/schema/claude_accounts.ts` (`scope` column)
- `packages/db/src/schema/agent_step_executions.ts` (cost attribution)
- `server/src/services/claude-accounts.ts` (`selectActiveAccount` poolMode-aware)
- `server/src/routes/claude-accounts.ts` (`/cost-summary` endpoint)

---

*Phase 6 fecha como `complete-with-pending-UAT` (precedente Phase 3/4/5): este smoke (Modo A) é o procedimento canônico para regressão automatizada; validação Modo B (UAT-06-01) é o portão visual final pelo operador humano.*
