---
type: human-uat
phase: 06-multi-projeto-polish
status: pending
created: 2026-04-26
requirements:
  - PROJ-01
  - PROJ-02
  - PROJ-03
references:
  - .planning/phases/06-multi-projeto-polish/MULTI-COMPANY-SMOKE.md
  - .planning/phases/06-multi-projeto-polish/06-CONTEXT.md
  - .planning/phases/05-multi-account-claude-code-swap-implementacao/05-HUMAN-UAT.md
---

# Phase 6 — HUMAN-UAT (Multi-Projeto + Polish)

**Status:** pending — execução depende de operador humano com 2 browsers/profiles distintos e credenciais Better Auth de 2 companies
**Cobre requirements:** PROJ-01 (multi-company isolation), PROJ-02 UI (pool toggle + scope visual), PROJ-03 UI (cost summary visual)
**Modo:** validação visual cross-tab/cross-browser; complementa Modo A (`MULTI-COMPANY-SMOKE.md`)
**Decisão fonte:** D-15 (`.planning/phases/06-multi-projeto-polish/06-CONTEXT.md`)
**Precedente:** Phase 3 plan 03-04 (TEAM-04), Phase 4 plan 04-05 (SPIKE-04/05), Phase 5 plan 05-08 (UAT-05-01) — `complete-with-pending-UAT`

## Visão geral

Este arquivo registra UATs (User Acceptance Tests) que requerem operador humano. Modo A (validação SQL automatizada) está em `MULTI-COMPANY-SMOKE.md` e cobre invariantes cross-tenant em `agent_step_executions`, `activity_log` e `/cost-summary` endpoint. Aqui ficam validações UI cross-tab/cross-browser e percepção operacional que SQL não cobre.

Status `pending` significa que a Phase 6 fecha como `complete-with-pending-UAT` — artefatos entregues, validação humana pendente. Precedente: Phase 3 plan 03-04 (TEAM-04), Phase 4 plan 04-05 (SPIKE-04/05), Phase 5 plan 05-08 (UAT-05-01).

## Status

| UAT | Status | Última atualização |
|-----|--------|--------------------|
| UAT-06-01 | pending | 2026-04-26 |

---

## UAT-06-01 — Multi-company isolation cross-browser

**Cobre:** PROJ-01 (success criterion #1 do ROADMAP), PROJ-02 UI (toggle pool mode + scope visual), PROJ-03 UI (cost summary visual)
**Status:** pending
**Dependências:** Phase 6 plans 01-04 deployed; migration 0072 aplicada via CI; Modo A do `MULTI-COMPANY-SMOKE.md` pode ser executado antes para sanity check de schema/wiring

### Objetivo

Validar empiricamente, em condições reais com 2 browsers/profiles distintos, que:

1. UI `ClaudeAccounts` logada em Company A nunca mostra contas de Company B (e vice-versa).
2. UI `CompanySettings` Pool Mode toggle persiste após save+refresh e tem efeito imediato em próximo registro/seleção de conta.
3. Campo `scope` no register account form (radio `company` vs `shared`) funciona e o resultado aparece com badge correto na listagem.
4. Companies em modo `shared` veem contas com `scope='shared'` de outras companies em modo shared; companies em modo `per_company` **não** veem contas `scope='shared'` de outras.
5. Cost summary section (UI) mostra apenas linhas atribuíveis à company logada; cookies cross-browser mantêm sessões isoladas.
6. Rotation history (UI) só mostra eventos de agentes pertencentes à company logada.

### Pré-condições

| Item | Como preparar |
|------|---------------|
| Phase 6 plans 01-04 deployed | `git log --oneline | head -10` mostra commits dos planos 06-01..06-04 mergeados em `main` |
| Migration 0072 aplicada via CI | GitHub Actions workflow `db-migrate.yml` rodou após merge; verificar última run verde |
| 2 companies existem em Supabase | `SELECT id, name FROM companies` retorna >= 2; Company A e Company B identificadas |
| 2 browsers/profiles distintos | Chrome + Firefox OU 2 Chrome profiles separados (cookies isolados) OU Edge + Chrome |
| Credenciais Better Auth para ambas companies | Operador tem login válido para Company A em Browser 1 e Company B em Browser 2 |
| Server rodando em modo `authenticated` | `PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev` (porta 3100) |
| Diretórios Claude prontos | `mkdir -p ~/.paperclip/claude-accounts/{a1,b1,c-shared}` (não exige `claude login` real para validação UI) |
| `companyPrefix` de cada company em mãos | Via UI sidebar ou SQL `SELECT slug FROM companies WHERE id IN (...)` |

### Steps

1. **Browser 1 — Company A:** login via Better Auth; navegar para `/<companyPrefixA>/company/settings/claude-accounts`. Registrar 1 conta usando o form: `label=A1`, `slug=a1`, scope radio = `This company only` (`scope=company`). Submit; confirmar toast de sucesso.
2. **Browser 2 — Company B:** login via Better Auth; navegar para `/<companyPrefixB>/company/settings/claude-accounts`. Registrar 1 conta: `label=B1`, `slug=b1`, scope radio = `This company only`. Submit.
3. **Browser 1 (A):** confirmar que listagem de Accounts mostra **APENAS A1**; nenhuma conta `B1` aparece. Capturar screenshot se útil.
4. **Browser 2 (B):** confirmar que listagem mostra **APENAS B1**; nenhuma conta `A1` aparece.
5. **Browser 1 (A):** navegar para `/<companyPrefixA>/company/settings` (CompanySettings); localizar section `Claude Account Pool`; trocar radio Pool Mode de `per_company` para `shared`; clicar Save; confirmar toast; refresh da página; confirmar que radio `shared` continua selecionado (persistência DB).
6. **Browser 1 (A):** voltar para `/<companyPrefixA>/company/settings/claude-accounts`; registrar nova conta: `label=C-shared`, `slug=c-shared`, scope radio = `Shared with all companies` (`scope=shared`). Submit; confirmar que aparece na tabela com badge `shared` (data-scope="shared") visível.
7. **Browser 2 (B):** refresh da página `/<companyPrefixB>/company/settings/claude-accounts`; confirmar que conta `C-shared` **NÃO** aparece (Company B continua em `per_company`, então `scope='shared'` de outra company é invisível).
8. **Browser 1 (A):** spawnar 1 agente em Company A com prompt simples (qualquer task curta — pode ser um echo ou placeholder). Aguardar pelo menos 1 step concluído (verificável via UI agent run page ou SQL `SELECT count(*) FROM agent_step_executions WHERE run_id IN (SELECT id FROM heartbeat_runs WHERE agent_id = '<agentA>')`).
9. **Browser 2 (B):** em paralelo, spawnar 1 agente em Company B com prompt simples. Aguardar pelo menos 1 step concluído.
10. **Browser 1 (A):** refresh `/claude-accounts`; localizar section `Cost summary`. Confirmar que mostra linhas para `A1` e/ou `C-shared`, **NUNCA** `B1`. Cada coluna populada (Account label, Cost USD com 4 decimais, Input/Output tokens com locale formatting, Steps).
11. **Browser 2 (B):** refresh `/claude-accounts`; section Cost summary. Confirmar que mostra apenas `B1`; **NUNCA** `A1` ou `C-shared`.
12. **Browser 1 (A):** scroll para section `Rotation history` (se houver rotações registradas); confirmar que entries só referenciam `agentId` pertencente a Company A (sem mistura cross-company). Se nenhuma rotação aconteceu (esperado em smoke curto sem exhaustão), section pode mostrar empty state — aceitável.
13. **(Opcional) Browser 1 (A):** voltar a `CompanySettings`; trocar Pool Mode de volta para `per_company`; save+refresh; voltar a `/claude-accounts`. Conferir comportamento da listagem em relação à conta `C-shared` (decisão de implementação: pode continuar visível como owned, ou deixar de aparecer pois company não está mais em modo shared — registrar observação operacional na seção de Resultado).

### Pass/Fail dimensions

| # | Dimensão | Pass | Fail |
|---|----------|------|------|
| 1 | Cross-tab isolation A→B | Browser 1 (A) nunca vê dados de B em qualquer section (Accounts, Cost summary, Rotation history) | qualquer item de B aparece em UI de A |
| 2 | Cross-tab isolation B→A | Browser 2 (B) nunca vê dados de A | qualquer item de A aparece em UI de B |
| 3 | Pool mode persistence | toggle salvo em A persiste após refresh; visual reflete DB state | toggle reverte ou state desincroniza |
| 4 | Scope radio works | seleção `company` vs `shared` no register persiste no payload do create; tabela mostra badge correto | scope ignorado ou badge incorreto |
| 5 | Shared visibility (positive) | A em modo shared vê e pode atribuir C-shared via spawn de agente | A não vê C-shared mesmo em modo shared |
| 6 | Shared visibility (negative) | B em modo per_company NÃO vê C-shared | B vê C-shared (vazamento cross-tenant) |
| 7 | Cost summary isolation | linhas só refletem `agent_step_executions` da company logada | linhas com `account_id` de outra company aparecem |

### Failure paths (cenários conhecidos)

- **Algum item da tabela acima falha:** capturar screenshot do estado UI + executar queries Q1-Q4 do `MULTI-COMPANY-SMOKE.md` para snapshot SQL do DB no momento; criar issue no repo com label `multi-tenant-leak` (BLOQUEANTE para v1.0); Phase 6 reabre para fechamento da lacuna antes de declarar v1 pronto.
- **Cookie cross-browser não funciona (login em A vaza para tab de B no mesmo profile):** verificar `PAPERCLIP_INSTANCE_ID=team-shared` no env do server e cookie prefix `paperclip-team-shared.session_token`; consultar `TROUBLESHOOTING.md#cookie-prefix-divergente`. Se prefix divergente, server está em instance-id errado.
- **Cost summary mostra 0 rows mesmo após agent spawn:** verificar que heartbeat está populando `agent_step_executions` (Phase 5 wiring 05-06); SQL diagnostico `SELECT count(*) FROM agent_step_executions WHERE created_at > now() - interval '1 hour'`; se zero, heartbeat não está invocando `recordStepExecution` corretamente — voltar para 05-06 SUMMARY.
- **Pool mode toggle não persiste após refresh:** verificar que PATCH `/api/companies/:companyId` aceita `claudeAccountPoolMode` (06-04 SUMMARY confirma) e que `companies` service select retorna o campo no GET (06-04 D-04). Se PATCH OK mas GET não devolve, falha de mapping no serializer.
- **Scope radio default não vira `company`:** validar que `createAccountSchema.scope` em shared validator tem `.default("company")` (06-04 D-05); inspeção do payload via DevTools Network tab confirma valor enviado.

### Como reportar resultados

Após executar UAT-06-01, atualizar este arquivo:

- Mudar `status: pending` → `status: passed | failed | partial` no frontmatter
- Adicionar seção `## Resultado UAT-06-01 (executado em <data>)` com:
  - Operador (nome/email)
  - Browsers/profiles usados (ex: Chrome profile X + Firefox)
  - Companies de teste (slugs)
  - Resultado por dimensão (1-7) com observações
  - Surprises / findings inesperados
  - Screenshots ou SQL snapshots se aplicável
- Commitar atualização (branch separada para review se quiser, ou direto em main).

Se PASS: Phase 6 promovida de `complete-with-pending-UAT` para `complete` formal (em conjunto com closure dos UATs Phase 4/5 que ainda estão pendentes).
Se FAIL: criar plan 06-07 ou abrir issue para fix targeted antes de declarar v1.0 ready.

## Conexão com Phase 6 closure e milestone v1.0

Phase 6 fecha como `complete-with-pending-UAT` quando:

- 06-01..06-04 implementados, tests passando, migration 0072 aplicada via CI
- 06-05 documentos entregues (`MULTI-COMPANY-SMOKE.md` Modo A + este `06-HUMAN-UAT.md` Modo B)
- 06-06 `V1-READINESS.md` publicado declarando milestone v1.0

UAT-06-01 **NÃO bloqueia** closure do milestone v1.0 — registrada como item operacional contínuo. v1.0 declared ready com este UAT pendente; convergência via uso real (precedente Phase 3 TEAM-04, Phase 4 SPIKE-04/05, Phase 5 UAT-05-01). v1.0 ships com UATs pendentes documentados em `V1-READINESS.md`.

## Referências

- `.planning/phases/06-multi-projeto-polish/MULTI-COMPANY-SMOKE.md` (Modo A — automatizado SQL; este UAT é Modo B real)
- `.planning/phases/06-multi-projeto-polish/06-CONTEXT.md` (D-04, D-05, D-06, D-15)
- `.planning/phases/06-multi-projeto-polish/06-04-SUMMARY.md` (UI scope/poolMode/cost summary changes)
- `.planning/phases/05-multi-account-claude-code-swap-implementacao/05-HUMAN-UAT.md` (precedente formato + status pending)
- `.planning/phases/04-spike-multi-account-claude-code-detection/04-HUMAN-UAT.md` (precedente phase-level HUMAN-UAT)
- `.planning/REQUIREMENTS.md` §"Multi-Projeto" (PROJ-01..03)
- `TROUBLESHOOTING.md` (#cookie-prefix-divergente, #windows-ntfs)
- `ui/src/pages/CompanySettings.tsx` (Pool Mode toggle)
- `ui/src/pages/ClaudeAccounts.tsx` (scope radio, badge, Cost summary section)

---

*Phase 6 fecha como `complete-with-pending-UAT`: artefatos entregues e validados via Modo A (`MULTI-COMPANY-SMOKE.md`); validação Modo B (UAT-06-01) fica como trabalho contínuo do operador. Convergência empírica destrava `complete` formal — milestone v1.0 ships independente.*
