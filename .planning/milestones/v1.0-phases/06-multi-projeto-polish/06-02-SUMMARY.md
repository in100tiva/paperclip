---
phase: 06-multi-projeto-polish
plan: 02
subsystem: api
tags: [drizzle, postgres, sql-aggregation, cost-attribution, multi-tenant, express, zod, vitest]

requires:
  - phase: 05-multi-account-claude-code-swap-implementacao
    provides: agent_step_executions schema, claude_accounts schema, heartbeat_runs.companyId, claudeAccountsService factory pattern, claude-accounts route mount
provides:
  - claudeAccountCostsService factory with aggregateByCompany method
  - GET /api/companies/:companyId/claude-accounts/cost-summary REST endpoint
  - CostSummaryRow + CostSummaryRange typed contract for UI consumers
affects: [06-04, plan that wires UI cost section to this endpoint]

tech-stack:
  added: []
  patterns:
    - "SQL aggregation via Drizzle sql<number> + COALESCE(SUM(...), 0)::float8 for type-safe numeric coercion"
    - "Multi-tenant cost attribution via JOIN through heartbeat_runs.companyId (D-01 invariant — agent_step_executions itself has no companyId column; the JOIN is the isolation gate)"
    - "Route ordering: specific paths declared before generic /:param paths to avoid Express param matching"

key-files:
  created:
    - server/src/services/claude-account-costs.ts
    - server/src/services/__tests__/claude-account-costs.test.ts
    - server/src/__tests__/claude-account-costs-route.test.ts
  modified:
    - server/src/services/index.ts
    - server/src/routes/claude-accounts.ts

key-decisions:
  - "innerJoin (não leftJoin) com claude_accounts: rows com label NULL não devem aparecer no aggregate. Se uma conta foi deletada (FK cascade falha), o step é dropado da agregação — aceitável em v1; orphans devem ser raros porque claude_accounts não tem rota DELETE no v1."
  - "Coerção sql<number> via Number() no map final: postgres pode retornar numerics como string em certos drivers (ex.: float8); o service garante que o JSON de resposta tem números nativos, evitando bug silencioso na UI."
  - "ORDER BY total cost DESC: contas mais caras aparecem primeiro — surface mais útil para operador identificar onde o custo está concentrado."
  - "Permission read-only (assertCompanyAccess) sem assertCompanyOwnerOrAdmin: cost summary é informação operacional não-mutativa; restringir a owner/admin atrita visibilidade de team."
  - "Zod schema com z.string().datetime({ offset: true }): só aceita ISO 8601 com timezone offset explícito (ex: 2026-04-01T00:00:00Z). Evita ambiguidade de timezone server-vs-client."
  - "Terminologia: 06-CONTEXT D-09 menciona agent_runs.companyId; o schema real é heartbeat_runs.companyId (paperclip nomeia a tabela de runs como heartbeat_runs). Documentado no JSDoc do service para futuros leitores."

patterns-established:
  - "Cost aggregation per-company segue o padrão Drizzle: select com sql<number>+COALESCE casts, innerJoin para scoping multi-tenant, groupBy + orderBy desc(sql template); reusable para futuras agregações (token budgets, runs/hora etc.)"
  - "Route handler para query params com Zod safeParse → 400 com error.issues no body (vs throw) preserva resposta tipada para UI"

requirements-completed: [PROJ-03]

duration: ~12min
completed: 2026-04-26
---

# Phase 6 Plan 02: Cost Attribution Service + REST Endpoint Summary

**Aggregation service + REST endpoint que somam `agent_step_executions` por (companyId, accountId) via Drizzle SQL groupBy/innerJoin, com permissão read-only para qualquer membro da company e filtro opcional de date range ISO 8601.**

## Performance

- **Duração:** ~12 min
- **Iniciado:** 2026-04-26T05:48:00Z
- **Concluído:** 2026-04-26T05:55:00Z
- **Tarefas:** 2 (ambas TDD: RED → GREEN)
- **Arquivos criados:** 3
- **Arquivos modificados:** 2

## Realizações

- `claudeAccountCostsService(db)` factory expõe `aggregateByCompany(companyId, range?)` retornando `CostSummaryRow[]` ordenado por custo decrescente
- `GET /api/companies/:companyId/claude-accounts/cost-summary?from=ISO&to=ISO` ativo, montado via roteador existente
- Cross-company isolation invariante (D-01) testada explicitamente: query sempre faz `innerJoin(heartbeatRuns, eq(agentStepExecutions.runId, heartbeatRuns.id))` com `where eq(heartbeatRuns.companyId, ...)`; teste verifica que pelo menos 2 innerJoins são capturados
- 11 vitest cases novos passando (6 service + 5 route); 0 regressões nos 32 cases existentes de claude-accounts/swap
- TS clean (`pnpm tsc --noEmit` exit 0)
- Backend pronto para Plano 06-04 (UI) consumir via novo helper `claudeAccountsApi.costSummary(companyId, range)`

## Commits das Tarefas

Cada tarefa foi comitada atomicamente (TDD RED → GREEN, sem REFACTOR necessário):

1. **Tarefa 1 RED:** `827b733` test(06-02): RED claude account costs aggregation
2. **Tarefa 1 GREEN:** `2c32058` feat(06-02): claude account costs aggregation service
3. **Tarefa 2 RED:** `02dd0b1` test(06-02): RED claude account costs route
4. **Tarefa 2 GREEN:** `56c8765` feat(06-02): GET /companies/:companyId/claude-accounts/cost-summary endpoint

**Metadados do plano:** será comitado a seguir em `docs(06-02): complete claude account costs plan`

## Arquivos Criados/Modificados

- `server/src/services/claude-account-costs.ts` (created, 87 lines) — service factory com método `aggregateByCompany`. Drizzle query: select com 6 columns (accountId, accountLabel, 4 sql<number> aggregates), innerJoin × 2 (heartbeatRuns para companyId scope; claudeAccounts para label), where(and(...conditions)) com companyId obrigatório e from/to opcionais, groupBy(accountId, label), orderBy(desc(sql sum)), map final com `Number()` coerção.
- `server/src/services/__tests__/claude-account-costs.test.ts` (created, 199 lines) — 6 vitest cases com manual chainable Db mock que captura `from/innerJoin/where/groupBy/orderBy` para asserts.
- `server/src/services/index.ts` (modified, +6 lines) — barrel export `claudeAccountCostsService` + 3 type exports (CostSummaryRow, CostSummaryRange, ClaudeAccountCostsService).
- `server/src/routes/claude-accounts.ts` (modified, +38 lines) — import do service novo, schema zod `costSummaryQuerySchema`, instância `costsSvc` + handler GET `/companies/:companyId/claude-accounts/cost-summary` declarado entre rotation-history e PATCH /:accountId (path-specificity ordering preservada).
- `server/src/__tests__/claude-account-costs-route.test.ts` (created, 197 lines) — 5 supertest cases cobrindo 200 happy path, 403 cross-company, 200 com Date conversion, 400 invalid input, 200 single-bound range.

## Test Cases (enumerados)

**Service (`claude-account-costs.test.ts`):**

1. **Pool vazio** — Db retorna `[]` → service retorna `[]`
2. **Single account, 3 steps** — agregação numérica com totalCostUsd=0.03, stepCount=3
3. **Multi-account isolation** — 2 contas → 2 rows, ordering preservada (acc-A 0.05 antes de acc-B 0.01)
4. **Date range filter** — from/to fornecidos → `where()` é chamado com predicate combinado
5. **Cross-company isolation (D-01)** — assert que ≥2 innerJoins são capturados (heartbeatRuns + claudeAccounts) e where() é chamado; sem o JOIN, predicate de companyId não teria coluna onde aplicar
6. **Type coercion** — Db retorna numerics como strings → service coage para `number` via `Number()`

**Route (`claude-account-costs-route.test.ts`):**

- **Test A:** 200 + body `{ rows: [...] }` para member autenticado; service chamado com `('company-1', { from: undefined, to: undefined })`
- **Test B:** 403 quando user não tem company-1 em `companyIds` — `assertCompanyAccess` rejeita; service NÃO é chamado
- **Test C:** ISO from/to → Date instances passadas ao service (assertions via `toBeInstanceOf(Date)` + `toISOString()` round-trip)
- **Test D:** 400 + `{ error, issues }` quando `from` não é ISO datetime válido; service NÃO é chamado
- **Test E:** Single bound (só `from`) → service recebe `{ from: Date, to: undefined }`

## Confirmação D-01 Cross-Company Isolation

Test 5 do service suite valida explicitamente que a query SQL inclui `innerJoin(heartbeatRuns, ...)` — o predicate `eq(heartbeatRuns.companyId, companyId)` no where só funciona porque essa tabela está no JOIN. Sem o JOIN, agregação vazaria `agent_step_executions` de outras companies (a tabela em si não tem coluna `companyId`). Adicional: o JSDoc do service documenta D-01 como invariante arquitetural; comment block na linha 16-18 marca isto como "cross-company isolation invariant".

Test B do route suite valida o gate aplicacional: usuário sem `company-1` em `companyIds` recebe 403 antes do service ser chamado.

## Decisões Tomadas

Listadas em frontmatter (`key-decisions`). Resumo: innerJoin sobre claude_accounts (não leftJoin); coerção numérica explícita via `Number()`; ORDER BY cost DESC; permissão read-only para qualquer member; zod com offset obrigatório; documentação inline da divergência terminológica `agent_runs` (CONTEXT) vs `heartbeat_runs` (schema real).

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. Specs SQL do plan (innerJoin × 2, COALESCE+casts, ORDER BY sum DESC, schema zod com `datetime({ offset: true })`, route ordering antes de PATCH /:accountId, return shape) foram seguidos literalmente.

## Problemas Encontrados

Nenhum durante a execução planejada. Captura de output do shell (Bash tool) ocasionalmente retornou vazio para `pnpm test` em redirecionamento; workaround: invocar `pnpm exec vitest run` diretamente que streamava output normal. Sem impacto no resultado.

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária.

## Prontidão para Próxima Fase

- **Plano 06-04 (UI):** desbloqueado. Pode adicionar `claudeAccountsApi.costSummary(companyId, range)` em `ui/src/api/claude-accounts.ts` chamando GET para o novo endpoint, e renderizar uma tabela em `ui/src/pages/ClaudeAccounts.tsx` (ou nova page `ClaudeAccountCosts.tsx`) com colunas Conta | Total Custo | Input Tokens | Output Tokens | Steps + filtro de date range default último mês (D-13 semantics: usar `companies.spentMonthlyCents` reset window como bound default).
- **Plano 06-03 (selectActiveAccount upgrade pool_mode):** independente; pode rodar em paralelo. Wave 1 (this) entregou só schema + cost backend; Wave 2 (06-03) modifica `selectActiveAccount` para honrar o `claudeAccountPoolMode` adicionado em 06-01.
- **PROJ-03 backend:** entregue. UI consumer fica para 06-04. Após 06-04, success criterion #3 do ROADMAP ("Dashboard de cost attribution mostra gasto agregado por (companyId, accountId)") fica end-to-end completo.

## Self-Check

- `server/src/services/claude-account-costs.ts` — FOUND
- `server/src/services/__tests__/claude-account-costs.test.ts` — FOUND
- `server/src/__tests__/claude-account-costs-route.test.ts` — FOUND
- Commit `827b733` (Task 1 RED) — FOUND
- Commit `2c32058` (Task 1 GREEN) — FOUND
- Commit `02dd0b1` (Task 2 RED) — FOUND
- Commit `56c8765` (Task 2 GREEN) — FOUND
- 6/6 service tests pass
- 5/5 route tests pass
- 32/32 existing claude-accounts/swap tests still pass (regression check)
- `pnpm tsc --noEmit` exit 0
- All acceptance criteria met (grep counts verified)

## Self-Check: PASSED

---
*Fase: 06-multi-projeto-polish*
*Concluída: 2026-04-26*
