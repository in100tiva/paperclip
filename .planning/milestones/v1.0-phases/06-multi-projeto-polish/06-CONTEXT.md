# Fase 6: Multi-Projeto + Polish - Contexto

**Coletado:** 2026-04-26
**Status:** Pronto para planejamento
**Modo:** Auto-gerado (Auto mode ativo + última fase do milestone v1.0)

<domain>
## Limite da Fase

Habilitar múltiplas companies/projects rodando agentes em paralelo no mesmo Supabase sem cross-contamination, com cost attribution agregado por projeto e pool de contas configurável (per-company ou shared). Fecha o v1 com fundação sólida para crescimento orgânico guiado por sinal real.

**Cobre os requisitos:** PROJ-01 (multi-company isolation validado), PROJ-02 (pool per-company OU shared configurável), PROJ-03 (cost attribution agregado).

**Esta é a fase FINAL do milestone v1.0** — output inclui declaração formal de "v1 pronto".

**Fora do escopo desta fase / v2:**
- Heartbeat-aware account selection avançado (POOL-01)
- Per-dev claim de conta (POOL-02)
- Pool multi-provider Codex/Cursor (POOL-03)
- Reconciliação periódica vs Anthropic dashboard (OBS-02)
- Painel observability tempo-real (OBS-01)
- Migração para Supabase Auth (AUTH2-*)
- RLS completa (RLS-01, RLS-02)
- Migração de uploads para Supabase Storage (STOR-*)

</domain>

<decisions>
## Decisões de Implementação

### Descoberta crítica: isolamento por `companyId` JÁ É CORE no paperclip

- **D-01:** Paperclip foi construído como multi-tenant desde a fundação. Todas as queries de domínio (agentes, runs, costs, invites, activity log) já filtram por `companyId`. Multi-company isolation não é trabalho NOVO — é VALIDAÇÃO de que continua funcionando após introduzir o pool de contas (Fase 5).
- **D-02:** PROJ-01 redirige de "implementar isolamento" para "validar isolamento" via smoke test E2E + audit dos call sites do `claudeAccountsService` para garantir que `companyId` é sempre passado/respeitado.
- **D-03:** Tabela `claude_accounts.companyId` (criada em Fase 5 D-02) já existe — só falta o pool config em `companies` para diferenciar per-company vs shared.

### PROJ-02: Pool config per-company OU shared

- **D-04:** Adicionar coluna a `companies` (via migration nova): `claudeAccountPoolMode: text NOT NULL DEFAULT 'per_company'`. Valores: `'per_company'` (default) | `'shared'`. Sem enum constraint hard — validação aplicacional.
- **D-05:** Quando `shared`, a empresa pode usar contas de uma "shared pool" — model: contas com `companyId NULL` OU campo separado `claude_accounts.scope: text DEFAULT 'company'` ('company' | 'shared'). **Decisão:** usar `scope` em `claude_accounts` (mais explícito, evita NULL semântico):
  - `claude_accounts.scope = 'company'` → conta exclusiva da `companyId` declarada
  - `claude_accounts.scope = 'shared'` → conta no pool global; `companyId` indica owner mas qualquer company com `claudeAccountPoolMode = 'shared'` pode usá-la
- **D-06:** `selectActiveAccount(agentId)` (Fase 5 D-09) atualizado:
  1. Resolver `agent.companyId` via FK
  2. Ler `companies[companyId].claudeAccountPoolMode`
  3. Query base sempre filtra por scope:
     - `'per_company'`: `WHERE claude_accounts.companyId = ? AND scope = 'company'`
     - `'shared'`: `WHERE (claude_accounts.companyId = ? AND scope = 'company') OR scope = 'shared'`
  4. Resto da lógica (status='live', exhaustedUntil, cooldown) inalterado
- **D-07:** UI `ClaudeAccounts.tsx` (Fase 5 D-25) atualizada:
  - Toggle de pool mode no formulário de Company Settings (não em ClaudeAccounts.tsx — settings é o lugar canônico)
  - No registro de conta: campo `scope` (radio button: "This company only" / "Shared with all companies")
  - Indicador na listagem: badge "shared" para contas com `scope = 'shared'`
- **D-08:** Migração de dados: contas existentes (criadas em Fase 5) vêm com `scope = 'company'` por padrão (consistente com semântica antiga).

### PROJ-03: Cost attribution agregado

- **D-09:** Schema base já existe — `agent_step_executions` (Fase 5 D-05) tem `(runId, stepId, accountId, costUsd, ...)`. Para agregação por `(companyId, accountId)`, fazer JOIN via `agent_runs.companyId` (heartbeat já mantém isso).
- **D-10:** Service novo: `server/src/services/claude-account-costs.ts` com método `aggregateByCompany(companyId, dateRange?): { accountId, accountLabel, totalCostUsd, totalInputTokens, totalOutputTokens, stepCount }[]`. Implementação: query SQL com JOIN entre `agent_step_executions`, `claude_accounts` (label) e `agent_runs` (companyId).
- **D-11:** REST endpoint: `GET /api/companies/:companyId/claude-accounts/cost-summary?from=ISO&to=ISO` — paginação não necessária (poucas contas). Permissão: company member (read-only para todos).
- **D-12:** UI: nova seção em `ClaudeAccounts.tsx` (ou nova page `ClaudeAccountCosts.tsx` per planejador) — tabela com colunas: Conta | Total Custo | Input Tokens | Output Tokens | Steps. Filtro por date range (default: último mês).
- **D-13:** Considerar `monthlyResetAt` na agregação — paperclip tem `companies.spentMonthlyCents` que reseta mensalmente. Para `cost-summary`, agregação default é "since-last-month-reset" (aligned com semântica existente). Custom date range é opcional.

### Multi-company smoke E2E (PROJ-01)

- **D-14:** Procedimento documentado em `.planning/phases/06-multi-projeto-polish/MULTI-COMPANY-SMOKE.md`:
  1. Criar 2 companies (Company A, Company B) — pode reusar dev signups da Fase 3 ou seed via SQL
  2. Cada company tem 1 agente rodando
  3. Cada company registra 1 conta Claude (scope = 'company')
  4. Spawn agentes em paralelo
  5. Validar via SQL:
     - `agent_step_executions` linhas para A só têm `account_id` ∈ contas de A; idem B
     - `activity_log` filtrado por companyId mostra apenas eventos da company correta
     - UI ClaudeAccounts logada em A NÃO mostra contas de B
  6. Bonus: configurar Company A como `pool_mode = 'shared'`, criar conta C com `scope = 'shared'`, e validar que A pode usar C mas B (em modo `per_company`) não vê C
- **D-15:** Itens não-automatizáveis (validação UI manual cross-company) → HUMAN-UAT no `06-HUMAN-UAT.md` UAT-06-01.

### Polish + v1 readiness

- **D-16:** Documento `V1-READINESS.md` no diretório da fase declarando v1 pronto. Inclui:
  - Tabela de TODOS os 47 requisitos v1 com status (44 já marcados Complete em REQUIREMENTS.md + 3 PROJ-* desta fase)
  - Lista de UATs pendentes que NÃO são bloqueantes para declarar v1 (Fase 3, 4, 5, 6 UATs) — registradas mas v1 ships com elas pendentes; convergência via uso real
  - Lista de fluxos críticos validados via smoke (multi-dev Fase 3, multi-account Fase 5, multi-company Fase 6)
  - Apontamento para v2 backlog (AUTH2, RLS, OBS, POOL, STOR — já em REQUIREMENTS.md §"Requisitos v2")
- **D-17:** Atualizar README.md / ONBOARDING.md / TROUBLESHOOTING.md com referências às novas funcionalidades multi-company se necessário (verificar se já estão suficientes — Fase 3 já documentou setup; Fase 6 só adiciona "como configurar pool mode").
- **D-18:** Limpeza opcional: remover `prototype/` da Fase 4 (era descartável). Decidir no planejador — pode ser deferred para `/limpeza` no ciclo de vida do milestone.

### Discrição do Claude

- Estrutura interna do `V1-READINESS.md` (markdown puro, pt-br consistente com `.planning/`)
- Se cost-summary endpoint usa Drizzle query builder ou SQL raw (preferência Drizzle por consistência)
- Se UI cost-summary é nova page ou seção em ClaudeAccounts.tsx (planejador escolhe)
- Granularidade de date range no cost-summary (mensal vs custom range — pode ser feature flag / phase 7 v2)
- Se incluir `agent_runs` count na cost summary (útil mas opcional)
- Estrutura exata do form de pool mode toggle em CompanySettings.tsx (verificar pattern existente)

</decisions>

<canonical_refs>
## Referências Canônicas

**Agentes downstream DEVEM ler estas antes de planejar ou implementar.**

### Fase 5 outputs (dependências diretas)
- `packages/db/src/schema/claude_accounts.ts` — adicionar coluna `scope` via migration nova
- `packages/db/src/schema/agent_account_bindings.ts` — sem mudança nesta fase
- `packages/db/src/schema/agent_step_executions.ts` — fonte de cost attribution
- `server/src/services/claude-accounts.ts` — `selectActiveAccount` precisa atualização (D-06)
- `server/src/services/claude-accounts-swap.ts` — sem mudança
- `server/src/routes/claude-accounts.ts` — adicionar `/cost-summary` endpoint (D-11)
- `ui/src/pages/ClaudeAccounts.tsx` — atualizar UI (D-07)

### Schema existente (modificação)
- `packages/db/src/schema/companies.ts` — adicionar `claudeAccountPoolMode` column (D-04)

### Pattern references (NÃO modificar; ler para consistência)
- `server/src/services/companies.ts` — service com agregação SQL existente (companies.spentMonthlyCents pattern)
- `server/src/services/budgets.ts` — pode ter aggregation pattern reusável
- `ui/src/pages/CompanySettings.tsx` — pattern de toggle de configuração da empresa
- `packages/db/src/schema/cost_events.ts` — append-only cost pattern

### Fases anteriores (constrangem)
- `.planning/phases/05-multi-account-claude-code-swap-implementacao/05-CONTEXT.md` — toda a fundação multi-account; D-09 (selectActiveAccount), D-25 (UI)
- `.planning/phases/04-spike-multi-account-claude-code-detection/FINDINGS-FOR-PHASE-5.md` — Finding 3 (taxonomy schema)
- `.planning/phases/03-workflow-de-equipe-onboarding/03-CONTEXT.md` — padrão pt-br para .planning/, UI em inglês

### Roadmap e requisitos
- `.planning/ROADMAP.md` §"Phase 6" — objetivo + success criteria
- `.planning/REQUIREMENTS.md` §"Multi-Projeto" — PROJ-01, PROJ-02, PROJ-03
- `.planning/REQUIREMENTS.md` §"Requisitos v2" — explicitamente fora desta fase (POOL-*, OBS-*, AUTH2-*, RLS-*, STOR-*)
- `.planning/PROJECT.md` — visão, decisões-chave

</canonical_refs>

<code_context>
## Insights do Código Existente

### Ativos Reutilizáveis
- **Multi-tenant isolation** já em todos os queries (`companyId` é first-class) — paperclip foi construído assim
- **`claude_accounts.companyId`** já existe (Fase 5 D-02) — só falta `scope`
- **`agent_step_executions`** com `accountId` (Fase 5 D-05) — pronto para agregação
- **`agent_runs.companyId`** (heartbeat) — JOIN para attribution por company
- **CompanySettings.tsx** existe — adicionar toggle de pool mode lá
- **Drizzle SQL aggregation pattern** (ver `companies.ts` service para `count`/`sum`) — replicar
- **`logActivity` filtrado por companyId** — já garantido pelo paperclip core; smoke valida

### Padrões Estabelecidos
- Migrações geradas via `pnpm db:generate` (Fase 2 DB-03 — apply só em CI)
- Schemas em `packages/db/src/schema/` com Drizzle
- Services factory pattern (companyService, claudeAccountsService) — replicar
- REST routes em `server/src/routes/` com permissões via membership
- UI pages em `ui/src/pages/`, inglês, reusa componentes paperclip
- Tests em `server/src/__tests__/` ou `server/src/services/__tests__/`

### Pontos de Integração
- `selectActiveAccount` (Fase 5) — atualizar query para honrar pool mode
- `companies` schema — nova coluna
- `claude_accounts` schema — nova coluna `scope`
- REST: novo endpoint `/cost-summary`; modificação no register account para aceitar `scope`
- UI: CompanySettings.tsx (pool mode toggle) + ClaudeAccounts.tsx (scope field + costs section)
- Activity log: nenhuma mudança (eventos existentes já filtram por companyId)

</code_context>

<specifics>
## Ideias Específicas

- **Default `pool_mode = 'per_company'`** — comportamento padrão = isolamento; opt-in para shared. Evita surpresas em deployments existentes.
- **Default `claude_accounts.scope = 'company'`** — contas existentes (Fase 5) preservam semântica.
- **Smoke E2E pode ser parcialmente automatizado:** SQL queries para validar isolamento são scriptáveis (`scripts/spike/` precedent não — Fase 6 prefere harness em `.planning/phases/06-multi-projeto-polish/scripts/`). Validação UI cross-tab é HUMAN-UAT.
- **V1-READINESS.md no diretório da fase** — descobrível via `/auditar-marco` que vem depois (no autonomous lifecycle).
- **monthlyResetAt já é convenção paperclip** — usar mesmo timestamp para `cost-summary` default range (consistência operacional).
- **Bonus PROJ-02 smoke:** validar que conta `scope = 'shared'` aparece em SELECT de Company A com `pool_mode = 'shared'` mas NÃO aparece em Company B com `pool_mode = 'per_company'`.

</specifics>

<deferred>
## Ideias Adiadas

- **Heartbeat-aware account selection avançado** (não picar conta que acabou de retornar 429) — v2 (POOL-01)
- **Per-dev claim de conta** (dev "marca" conta para uso pessoal) — v2 (POOL-02)
- **Pool multi-provider** (Codex, Cursor além de Claude) — v2 (POOL-03)
- **Painel observability multi-account em tempo-real** — v2 (OBS-01)
- **Reconciliação periódica vs Anthropic dashboard** — v2 (OBS-02)
- **Alertas de pool saturando** — v2 (OBS-03)
- **Migração para Supabase Auth** — v2 (AUTH2-*)
- **RLS completa** — v2 (RLS-*)
- **Storage migration para Supabase** — v2 (STOR-*)
- **Date range customizado avançado em cost-summary** (filtros multi-dimensão) — pode entrar em v2 OBS-01
- **Limpeza de prototype/ da Fase 4** — pode ficar para `/limpeza` do ciclo de vida do milestone (autonomous lifecycle 5c)

</deferred>

---

*Fase: 06-multi-projeto-polish*
*Contexto coletado: 2026-04-26*
