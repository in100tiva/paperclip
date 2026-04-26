# Fase 5: Multi-Account Claude Code Swap (Implementação) - Contexto

**Coletado:** 2026-04-26
**Status:** Pronto para planejamento
**Modo:** Auto-gerado (Auto mode ativo + estratégia "Plano B" confirmada pelo usuário) — decisões fundamentadas em PROJECT.md, REQUIREMENTS.md MULTI-01..11, FINDINGS-FOR-PHASE-5.md (Fase 4), e descoberta de código existente

<domain>
## Limite da Fase

Implementar o pool de contas Claude Code, rotação atômica em exhaustão e continuidade preservada via `issue_continuation_summary` (com fallback de re-prompt full-context), usando os achados validados no spike Phase 4. Esta é a feature genuinamente nova que justifica o fork existir vs paperclip vanilla.

**Cobre os requisitos:** MULTI-01 (schema `claude_accounts`), MULTI-02 (`agent_account_bindings`), MULTI-03 (`agent_step_executions`), MULTI-04 (`services/claude-accounts.ts`), MULTI-05 (`CLAUDE_CONFIG_DIR` wiring), MULTI-06 (classifier em `parse.ts`), MULTI-07 (heartbeat integration), MULTI-08 (swap automático com Plano B), MULTI-09 (UI `ClaudeAccounts.tsx`), MULTI-10 (activity log emit), MULTI-11 (smoke E2E).

**Estratégia confirmada pelo usuário:** Plano B do FINDINGS-FOR-PHASE-5.md — implementa MULTI-08 com fallback documentado de re-prompt full-context na conta nova quando cross-account session resume falha (esperado se UAT-04-02 confirmar session_id é per-account). Validador empírico real (UAT-04-03) fica pendente; produção converge via uso real.

**Fora do escopo desta fase:**
- Pool multi-projeto / cost attribution agregado (Fase 6 — PROJ-01..03)
- Pool multi-provider (Codex, Cursor) — v2
- Heartbeat-aware account selection avançado — v2 (POOL-01)
- Per-dev claim de conta — v2 (POOL-02)
- Reconciliação periódica vs Anthropic dashboard — v2 (OBS-02)
- Migração para Supabase Auth — v2

</domain>

<decisions>
## Decisões de Implementação

### Schema (MULTI-01, MULTI-02, MULTI-03)

- **D-01:** Três tabelas novas em `packages/db/src/schema/`:
  - `claude_accounts.ts` — pool de contas
  - `agent_account_bindings.ts` — qual agente está usando qual conta agora + rotation policy
  - `agent_step_executions.ts` — append-only attribution de cada step para conta+custo
- **D-02:** Schema `claude_accounts` (da MULTI-01 + Finding 3 do spike):
  ```typescript
  // claude_accounts
  id: text (PK, generated)
  companyId: text → companies.id (FK)
  ownerUserId: text → user.id (FK, Better Auth)
  label: text NOT NULL                          // "Account A", "Personal Pro"
  configDirSlug: text NOT NULL UNIQUE           // "a" → ~/.paperclip/claude-accounts/a/
  status: text NOT NULL                         // 'live' | 'exhausted' | 'cooldown' | 'disabled'
  lastQuotaWindowsJson: jsonb DEFAULT '{}'      // ver D-03
  exhaustedUntil: timestamp NULL                // MAX dos windows; cached p/ query rápida
  lastUsedAt: timestamp NULL
  createdAt, updatedAt: timestamps
  ```
- **D-03:** Estrutura de `lastQuotaWindowsJson` (Finding 3): mapa por tipo da taxonomia, cada um com `{ exhaustedUntil: ISO, lastTriggeredAt: ISO, count: integer }`. Tipos: `rpm_transient`, `tpm_transient`, `daily_quota`, `weekly_quota`, `session_5h`, `org_tier`. Default `{}`.
- **D-04:** Schema `agent_account_bindings` (MULTI-02):
  ```typescript
  agentId: text (PK) → agents.id
  activeAccountId: text → claude_accounts.id (FK)
  rotationPolicy: text NOT NULL                  // 'auto' | 'sticky' | 'manual'
  lastRotatedAt: timestamp NULL
  createdAt, updatedAt: timestamps
  ```
- **D-05:** Schema `agent_step_executions` (MULTI-03):
  ```typescript
  id: text (PK)
  runId: text NOT NULL                           // agent_run id (heartbeat)
  stepId: text NOT NULL                          // step within run
  accountId: text → claude_accounts.id
  inputTokens: integer NOT NULL DEFAULT 0
  cachedInputTokens: integer NOT NULL DEFAULT 0
  outputTokens: integer NOT NULL DEFAULT 0
  costUsd: real NOT NULL DEFAULT 0
  startedAt: timestamp NOT NULL
  completedAt: timestamp NULL
  errorFamily: text NULL                         // 'transient_upstream' | etc (de execute.ts)
  ```
  **Append-only** — sem UPDATE; cada step é uma linha imutável. Index em `(runId, stepId)` para query rápida.
- **D-06:** Migrations geradas via Drizzle: `pnpm db:generate` produz SQL em `packages/db/migrations/`. Aplicação via CI (DB-03 da Fase 2 — só GitHub Actions roda `db:migrate` em main).
- **D-07:** Sem RLS nas tabelas novas — autorização aplicacional via membership por `companyId` (consistente com PROJECT.md / Fase 2 D-31).

### Service `claude-accounts.ts` (MULTI-04)

- **D-08:** Localização: `server/src/services/claude-accounts.ts`. Export `claudeAccountsService(db: Db)` retornando objeto com métodos (consistente com `companyService`/`heartbeatService` patterns).
- **D-09:** API pública:
  - `listAccounts(companyId): Promise<Account[]>` — todas as contas da empresa
  - `selectActiveAccount(agentId): Promise<Account>` — escolhe a melhor conta live para o agente. Implementação:
    1. Lê `agent_account_bindings.activeAccountId` se sticky/manual
    2. Caso contrário, query: contas onde `status = 'live'` AND (`exhaustedUntil IS NULL` OR `exhaustedUntil < now`) AND (binding.lastRotatedAt IS NULL OR `lastRotatedAt < now - cooldownSeconds`)
    3. Ordem: `lastUsedAt ASC` (round-robin natural)
    4. Lock pessimista via `pg_advisory_xact_lock(hashtext(agentId))` para evitar race entre múltiplos heartbeats
    5. Atualiza `lastUsedAt` antes de retornar
    6. Se zero contas elegíveis → throw `NoAccountsAvailableError`
  - `rotateOnQuotaExhausted(agentId, fromAccountId, errorFamily, retryNotBefore): Promise<Account>` — chamado quando swap necessário. Implementação:
    1. Lock advisory
    2. Marca `claude_accounts[fromAccountId].status = 'exhausted'`, atualiza `lastQuotaWindowsJson[errorFamily]` com `retryNotBefore`, recalcula `exhaustedUntil = MAX(windows)`
    3. Chama `selectActiveAccount` para próxima
    4. Atualiza `agent_account_bindings.activeAccountId`, `lastRotatedAt = now`
    5. Emite activity log `claude_account_rotated` (MULTI-10)
    6. Retorna nova conta
  - `resolveCredentialDir(account): string` — retorna path absoluto para `CLAUDE_CONFIG_DIR`. Implementação: `path.join(os.homedir(), '.paperclip', 'claude-accounts', account.configDirSlug)`. Valida que diretório existe; throw `CredentialDirMissingError` se não.
  - `recordStepExecution(runId, stepId, accountId, usage): Promise<void>` — append em `agent_step_executions`.
  - `markCooldownPassed(accountId): Promise<void>` — quando `exhaustedUntil < now`, transição `status: 'cooldown' → 'live'`. Pode ser invocado por job periódico ou lazy em `selectActiveAccount`.
- **D-10:** Cooldown configurável via env var `CLAUDE_ACCOUNT_COOLDOWN_SECONDS` (default `30`, conforme DECISION-DETECTION-STRATEGY.md). Documentar em `.env.example`.
- **D-11:** Tests em `server/src/__tests__/claude-accounts-service.test.ts` — cobre: select básico, rotate em exhaustion, lock contention, cooldown filtering, no-accounts-available error.
- **D-12:** Errors customizados (`ClaudeAccountError extends Error` com subclasses) — consistentes com pattern do paperclip (`./errors.js` re-exporta `notFound`, `unprocessable`).

### Patches em `claude-local` adapter (MULTI-05, MULTI-06)

- **D-13:** **MULTI-05 wiring (Finding 2):** `CLAUDE_CONFIG_DIR` já está em `includeRuntimeKeys` em `execute.ts:253`. Trabalho: garantir que o caller (heartbeat / spawn) passa `claudeConfigDir` via config schema do adapter. Verificar shape de `ExecuteClaudeLocalConfig` (ou similar) — se já aceita, MULTI-05 é confirmação documentada. Se não, adicionar campo opcional `claudeConfigDir?: string` e setar `env.CLAUDE_CONFIG_DIR` antes do spawn.
- **D-14:** **MULTI-06 classifier (Finding 1):** Estender `parse.ts` com função adjacente:
  ```typescript
  export function detectClaudeQuotaExhausted(input: { stdout: string; stderr: string; now: Date }): {
    detected: boolean;
    type: QuotaType | null;       // 'rpm_transient' | 'tpm_transient' | 'daily_quota' | 'weekly_quota' | 'session_5h' | 'org_tier' | null
    retryAt: Date | null;
    confidence: 'high' | 'medium' | 'low';
    rawMatch: string | null;
  };
  ```
  Reusa `CLAUDE_TRANSIENT_UPSTREAM_RE` (linha 13) como gate; sub-discriminators determinam `type`. Reusa `CLAUDE_EXTRA_USAGE_RESET_RE` (linha 14) e `extractClaudeRetryNotBefore` para `retryAt`.
- **D-15:** Sub-discriminators (mantém ordem para evitar ambiguidade — bug do protótipo que foi corrigido):
  1. `weekly_quota`: regex contém "weekly limit reached" ou "weekly_quota" (ordem: antes de daily/5h)
  2. `daily_quota`: contém "daily quota" ou "daily limit"
  3. `session_5h`: contém "5-hour" ou "5 hour" ou "5h limit reached"
  4. `tpm_transient`: contém "tokens per minute" ou "tpm" 
  5. `rpm_transient`: contém "requests per minute" ou "rpm" ou genérico `429`/`rate_limit_error`
  6. `org_tier`: contém "organization" ou "tier" ou genérico `503`/`529`/`overloaded` — **fallback** mais ambíguo
  7. `null`: regex top-level matched mas nenhum sub-discriminator — caller decide (provavelmente classifica como `rpm_transient` best-effort + log)
- **D-16:** Tests do classifier em `server/src/__tests__/claude-local-adapter-quota-detection.test.ts` (Finding 8). Reusa fixtures do spike (`.planning/phases/04-spike-multi-account-claude-code-detection/prototype/fixtures/`) por **referência relativa de path** dos tests — não duplica conteúdo. Mínimo 1 teste por sub-tipo + 1 teste de gate (top-level regex não matched → `detected: false`).
- **D-17:** Modificações em `parse.ts` e `execute.ts` (mesmo arquivo da Fase 4 audit) — **agora é OK modificar** porque o spike acabou. Documentar diff cuidadosamente em SUMMARY (Fase 5 modifica produção; Fase 4 não modificava).

### Heartbeat integration (MULTI-07)

- **D-18:** `services/heartbeat.ts` (já existe) — chamar `claudeAccountsService.selectActiveAccount(agentId)` ANTES de cada spawn de agente Claude Code. Resultado vira `config.claudeConfigDir` passado ao adapter.
- **D-19:** Quando `executeClaudeLocal` retorna `errorFamily: 'transient_upstream'` com `retryNotBefore`, heartbeat chama `claudeAccountsService.rotateOnQuotaExhausted(agentId, fromAccountId, errorFamily, retryNotBefore)` e re-tenta o step com a nova conta. Limite: 1 rotação automática por step (evita thrash; mais rotações no mesmo step → step falha permanentemente, escalado p/ activity log).

### Swap automático (MULTI-08) — **Plano B confirmado**

- **D-20:** **Estratégia primária:** ao detectar exhaustão, drena step atual → captura summary via `issue_continuation_summary` (existente no paperclip) → tenta resume com `--resume <session_id>` na conta nova.
- **D-21:** **Estratégia fallback (Plano B do Finding 6 + 7):** se `--resume` falha (esperado: `session_id` é per-account), spawn nova sessão com `summary` embutido como prompt inicial. Custo: tokens duplicados (re-context). Ganho: continuidade preservada do ponto de exhaustão.
- **D-22:** Detecção de falha de resume: stderr contém "session not found" ou "invalid session id" ou exit code != 0 antes do primeiro `system:init` event. Captura via parse.ts existente.
- **D-23:** Documentar comportamento esperado em `server/src/services/claude-accounts-swap.md` (doc interna, não user-facing) — incluindo trade-off de custo e quando refinar quando UAT-04-03 retornar empiricamente.
- **D-24:** Activity log entry inclui `swapStrategy: 'resume' | 'fallback_full_context'` para observabilidade pós-fato.

### UI `ClaudeAccounts.tsx` (MULTI-09)

- **D-25:** Localização: `ui/src/pages/ClaudeAccounts.tsx` (consistente com `CompanyInvites.tsx`, `Agents.tsx`).
- **D-26:** Funcionalidades v1:
  - Listar contas da empresa: label, status (badge colorido: live verde, exhausted vermelho, cooldown amarelo, disabled cinza), `lastUsedAt`, `exhaustedUntil` se aplicável
  - Registrar nova conta: form com label + configDirSlug (e instrução para criar `~/.paperclip/claude-accounts/<slug>/` e fazer `claude login` lá)
  - Toggle status disabled/live (operador desliga conta manualmente)
  - Histórico de rotações (lê `activity_log` filtrado por `claude_account_rotated`)
- **D-27:** Reusa componentes existentes do paperclip (verificar `ui/src/components/`): badges de status, tabelas, forms. NÃO criar novo design system.
- **D-28:** Routing: adicionar rota em `ui/src/App.tsx` ou roteador equivalente. Path: `/companies/:companyId/claude-accounts`.
- **D-29:** Permissões: apenas `company_owner` ou `company_admin` podem gerenciar contas (via membership existente). Read-only para outros membros.

### Activity log (MULTI-10)

- **D-30:** Em `services/activity-log.ts` (existente), adicionar tipo de evento `claude_account_rotated` com payload:
  ```typescript
  {
    type: 'claude_account_rotated',
    agentId: string,
    fromAccountId: string,
    toAccountId: string,
    reason: 'exhausted' | 'manual' | 'cooldown_expired',
    errorFamily: string | null,           // de execute.ts errorFamily
    retryNotBefore: ISO | null,
    swapStrategy: 'resume' | 'fallback_full_context' | null,
  }
  ```
- **D-31:** Emitido pelo `claudeAccountsService.rotateOnQuotaExhausted` (D-09).
- **D-32:** Visível na UI no histórico de rotações (D-26).

### Smoke E2E (MULTI-11)

- **D-33:** Smoke documentado em `.planning/phases/05-multi-account-claude-code-swap-implementacao/SMOKE-E2E.md`. Procedimento:
  1. Registrar 2 contas via UI (ou seed via SQL): `account-a` e `account-b`
  2. Configurar `~/.paperclip/claude-accounts/a/` e `b/` com `claude login` em cada
  3. Spawnar agente que itera (loop curto que produz tokens)
  4. **Forçar exhaustão** (manualmente alterar `claude_accounts[a].exhaustedUntil = now + 1h` via SQL, OU usar conta com quota baixa)
  5. Observar agente continuar via swap → conta B
  6. Validar:
     - `agent_step_executions` tem rows com `accountId = a` e depois `accountId = b`
     - `activity_log` tem entry `claude_account_rotated`
     - Cost atribuído corretamente
- **D-34:** Itens não-automatizáveis (validação real com 2 contas reais sem força artificial) → HUMAN-UAT no `05-HUMAN-UAT.md`. UAT-05-01: smoke real cross-account com exhaustão natural.

### Discrição do Claude

- Estrutura interna exata dos arquivos de schema (Drizzle convention)
- Nomenclatura de hooks de UI (manter consistência com paperclip — verificar)
- Se usa React Query / SWR / outra biblioteca para fetching (verificar codebase paperclip)
- Granularidade dos tests — mínimos especificados em D-11/D-16, mais coverage é bom
- Implementação exata do lock pessimista (advisory lock vs row lock) — D-09 sugere advisory por simplicidade
- Se `agent_step_executions` tem partições por mês ou single table — single OK para v1
- Estrutura exata do form de "Registrar conta" (modal vs página separada)
- Mensagens de erro exibidas ao usuário em UI — pt-br ou en consistente com paperclip (paperclip é en; manter en para UI)

</decisions>

<canonical_refs>
## Referências Canônicas

**Agentes downstream DEVEM ler estas antes de planejar ou implementar.**

### Spike outputs (Fase 4) — leitura OBRIGATÓRIA
- `.planning/phases/04-spike-multi-account-claude-code-detection/FINDINGS-FOR-PHASE-5.md` — 8 findings que redirecionam o trabalho
- `.planning/phases/04-spike-multi-account-claude-code-detection/CLAUDE_429_TAXONOMY.md` — fonte da estrutura `lastQuotaWindowsJson` (D-03) e dos sub-discriminators (D-15)
- `.planning/phases/04-spike-multi-account-claude-code-detection/DECISION-DETECTION-STRATEGY.md` — cooldown 30s default, retry-after honrado, env var `CLAUDE_ACCOUNT_COOLDOWN_SECONDS`
- `.planning/phases/04-spike-multi-account-claude-code-detection/prototype/detect-quota-exhausted.ts` — referência de implementação para D-14 (estrutura de classifier)
- `.planning/phases/04-spike-multi-account-claude-code-detection/04-HUMAN-UAT.md` — UATs pendentes (UAT-04-03 informa fallback de D-21; convergência pós-deploy)

### Código existente (modificação direta nesta fase)
- `packages/adapters/claude-local/src/server/parse.ts` — adicionar `detectClaudeQuotaExhausted` (D-14, D-15)
- `packages/adapters/claude-local/src/server/execute.ts` — verificar/adicionar `claudeConfigDir` config field (D-13). `CLAUDE_CONFIG_DIR` já está em `includeRuntimeKeys` (linha 253).
- `server/src/services/heartbeat.ts` — chamada a `selectActiveAccount` antes de spawn (D-18)
- `server/src/services/activity-log.ts` — adicionar `claude_account_rotated` (D-30)
- `packages/db/src/schema/index.ts` — exportar 3 tabelas novas
- `ui/src/pages/` — nova `ClaudeAccounts.tsx` (D-25..29)
- `.env.example` — adicionar `CLAUDE_ACCOUNT_COOLDOWN_SECONDS`

### Patterns de referência (NÃO modificar; ler para consistência)
- `server/src/services/companies.ts` — pattern de service factory (`companyService(db)`)
- `server/src/services/heartbeat-stop-metadata.ts` — pattern de service com transações
- `server/src/services/agent-start-lock.ts` — pattern de lock (advisory)
- `server/src/__tests__/claude-local-adapter*.test.ts` — patterns de mock para tests do classifier
- `packages/db/src/schema/heartbeat_runs.ts` — pattern de schema com timestamps + indexes
- `packages/db/src/schema/cost_events.ts` — pattern de tabela append-only de attribution
- `ui/src/pages/CompanyInvites.tsx` — pattern de página de gerenciamento (provavelmente similar à `ClaudeAccounts.tsx`)
- `ui/src/pages/Agents.tsx` — pattern de listagem com status badges

### Fases anteriores (constrangem decisões)
- `.planning/phases/02-migra-o-de-storage-para-supabase/02-CONTEXT.md` — RLS opcional v1, service-role no servidor, `prepare:false` em pooler 6543, migrations só via CI
- `.planning/phases/03-workflow-de-equipe-onboarding/03-CONTEXT.md` — padrão pt-br para artefatos `.planning/`, `pnpm run setup` (não `pnpm setup`)

### Roadmap e requisitos
- `.planning/ROADMAP.md` §"Phase 5" — objetivo + success criteria
- `.planning/REQUIREMENTS.md` §"Multi-Conta" — MULTI-01..11 detalhes completos
- `.planning/PROJECT.md` — visão, restrições, decisões-chave

</canonical_refs>

<code_context>
## Insights do Código Existente

### Ativos Reutilizáveis
- **`CLAUDE_TRANSIENT_UPSTREAM_RE` + `CLAUDE_EXTRA_USAGE_RESET_RE`** em `parse.ts:13-14` — base do classifier (D-14)
- **`CLAUDE_CONFIG_DIR` passthrough** em `execute.ts:253` — multi-account técnicamente trivial (D-13)
- **`extractClaudeRetryNotBefore`** já calcula `retryAt` (D-14)
- **Service factory pattern** estabelecido (`companyService`, `heartbeatService`) — replicar (D-08)
- **Drizzle schema patterns** — ver `cost_events.ts` (append-only) e `heartbeat_runs.ts` (com timestamps) (D-05, D-06)
- **Activity log infra** existente em `services/activity-log.ts` — só adicionar tipo (D-30)
- **Better Auth + RLS opcional** — autorização via membership (consistente com Fase 2)
- **Vitest setup** — tests vão em `server/src/__tests__/` (D-11, D-16) (Finding 8)
- **Advisory lock pattern** — `agent-start-lock.ts` provavelmente tem precedente (D-09)

### Padrões Estabelecidos
- Schemas em `packages/db/src/schema/` (snake_case file, camelCase exports)
- Services em `server/src/services/` (factory pattern, retornam objeto com métodos)
- Tests adjacentes em `server/src/__tests__/` (extensão `.test.ts`)
- UI pages em `ui/src/pages/` (PascalCase, com `.test.tsx` adjacente)
- Migrations geradas (`pnpm db:generate`) e aplicadas só em CI (DB-03)
- Drizzle ORM com `postgres-js` (postgres-js + `prepare:false` em pooler 6543)

### Pontos de Integração
- `server/src/services/heartbeat.ts` é o ponto principal de injeção (chama adapter Claude antes de cada step) — D-18
- `packages/db/src/schema/index.ts` exporta todas as tabelas — adicionar 3 novas
- `ui/src/App.tsx` (ou roteador) — adicionar rota nova
- `.env.example` — adicionar `CLAUDE_ACCOUNT_COOLDOWN_SECONDS`
- `services/activity-log.ts` — adicionar tipo de evento

</code_context>

<specifics>
## Ideias Específicas

- **Plano B explicado:** se `--resume <session_id>` cross-account falha, spawn nova sessão com prompt = "Continuação do trabalho anterior. Resumo do progresso até agora: [continuation_summary]. Próxima ação: [última instrução]." Custo: tokens duplicados na primeira chamada da conta nova; ganho: continuidade. Esta é a estratégia padrão até UAT-04-03 confirmar empiricamente que cross-account resume funciona.
- **`configDirSlug` UNIQUE no schema** — evitar colisões; sluggify lowercase + dash apenas (validação aplicacional).
- **`exhaustedUntil` cached top-level** — recalculado a cada update de `lastQuotaWindowsJson`. Permite query rápida `WHERE exhaustedUntil < now` sem JSONB scan.
- **Lock advisory por `hashtext(agentId)`** — Postgres `pg_advisory_xact_lock(BIGINT)`. `hashtext` produz int4; usar `hashtextextended` ou `'x' || md5(agentId)::bit(64)::bigint` para int8. Validar com `agent-start-lock.ts` se já tem helper.
- **Limite 1 rotação por step** (D-19) — evita thrash em caso de múltiplas contas exhausted simultâneas. Decisão conservadora; refinável post-deploy.
- **`CLAUDE_ACCOUNT_COOLDOWN_SECONDS`** — env var configurável; documentar default 30s em `.env.example` e `TROUBLESHOOTING.md` (Fase 3) na seção "Multi-account thrashing".
- **UI label PT vs EN:** paperclip UI é em inglês — manter inglês para `ClaudeAccounts.tsx` (consistência). Mensagens de erro de servidor em inglês também.
- **Test fixtures referenciadas:** tests do classifier (D-16) referenciam `prototype/fixtures/*.txt` por path relativo. Se fixtures forem promovidas para `__tests__/__fixtures__/` em algum momento, atualizar refs — por agora, manter onde estão (spike output preservado).

</specifics>

<deferred>
## Ideias Adiadas

- **Multi-projeto / pool per-company vs shared** → Fase 6 (PROJ-01..03)
- **Heartbeat-aware account selection avançado** (não picar conta que acabou de retornar 429) — v2 (POOL-01)
- **Per-dev claim de conta** — v2 (POOL-02)
- **Pool multi-provider (Codex, Cursor)** — v2 (POOL-03)
- **Reconciliação periódica vs Anthropic dashboard** — v2 (OBS-02)
- **Alertas quando pool perto de saturar** — v2 (OBS-03)
- **Migração para Supabase Auth + RLS completa** — v2 (AUTH2-*)
- **UAT-04-03 empírico de cross-account resume** — Plano B opera enquanto UAT pendente; refinamento pós-deploy
- **Quota dashboard observability avançado** — v2 (OBS-01)

</deferred>

---

*Fase: 05-multi-account-claude-code-swap-implementacao*
*Contexto coletado: 2026-04-26*
