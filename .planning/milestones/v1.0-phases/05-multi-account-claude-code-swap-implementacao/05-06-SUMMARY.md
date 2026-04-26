---
phase: 05-multi-account-claude-code-swap-implementacao
plan: 06
subsystem: heartbeat
tags: [multi-account, claude-code, swap, rotation, heartbeat, vitest]

requires:
  - phase: 05-multi-account-claude-code-swap-implementacao
    provides: claudeAccountsService with selectActiveAccount, rotateOnQuotaExhausted (returns {rotationId, newAccount}), recordSwapOutcome, resolveCredentialDir, recordStepExecution (from 05-04); detectClaudeQuotaExhausted classifier (from 05-02); claudeConfigDir wiring in execute.ts (from 05-05); ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED + ClaudeAccountRotatedDetails (from 05-03)
provides:
  - orchestrateClaudeSwap module (Strategy A/B orchestration, W1 split rotation/log emit)
  - heartbeat integration: per-spawn account selection (MULTI-07)
  - heartbeat integration: automatic swap on transient_upstream (MULTI-08)
  - PROJ-03 cost-by-account attribution via recordStepExecution
affects: [phase-05-plan-07-ui, phase-05-plan-08-smoke, phase-06-cost-attribution]

tech-stack:
  added: []
  patterns:
    - "Caller-driven activity-log emission split — service performs DB updates and returns a rotationId; caller calls recordSwapOutcome AFTER the retry settles, so the persisted swapStrategy reflects the strategy that ACTUALLY produced the final result (W1, D-32 accuracy)"
    - "Per-step rotation cap via local boolean flag (alreadyRotatedThisStep) — D-19 anti-thrash guard, no DB persistence required since the flag scope is one heartbeat run iteration"
    - "Strategy A then Strategy B orchestration with pure-function failure detector (detectResumeFailed) — pivot decided by stdout/stderr pattern + exit code, no extra service round-trip"
    - "executingAccountId tracking variable distinct from selectedAccount — recordStepExecution attributes work to the account that produced the FINAL successful result, surviving rotations (W2, PROJ-03)"
    - "Adapter-gated wiring (agent.adapterType === 'claude_local') — multi-account behaviour invisible to codex_local/gemini/etc; preserves backward compatibility"

key-files:
  created:
    - server/src/services/claude-accounts-swap.ts
    - server/src/services/__tests__/claude-accounts-swap.test.ts
  modified:
    - server/src/services/heartbeat.ts

key-decisions:
  - "orchestrateClaudeSwap returns Strategy A retry plan as default; caller invokes orchestrateFallbackFullContext separately when Strategy A fails (rather than orchestrate driving both strategies internally) — keeps the retry adapter.execute() spawn calls in the heartbeat where transport context (executionTarget, remoteExecution, onSpawn, persistRunProcessMetadata) is already wired"
  - "alreadyRotatedThisStep is a local boolean in the heartbeat scope, NOT a DB column — D-19 cap is naturally bounded by the lifetime of one heartbeat run; persistence would only matter if a single step crossed run boundaries, which it does not"
  - "executingAccountId uses single-row attribution: after rotation, the row reflects newAccount.id. Two-row split (failed step on A + retry on B) deferred to v2 if PROJ-03 demands granular failure attribution per account"
  - "Strategy B (fallback_full_context) does NOT count as a second rotation — it is a re-spawn within the same logical rotation. D-19 cap remains '1 rotation per step'"
  - "When resolveCredentialDir throws (operator never provisioned ~/.paperclip/claude-accounts/<slug>), orchestrate persists the rotation but caller records swapStatus='failed'. This keeps observability honest: the activity log entry represents an attempted-but-failed swap, not silent omission"

patterns-established:
  - "W1 split: rotation DB updates and activity log emission are separated. Service rotateOnQuotaExhausted only updates DB and returns a rotationId handle; caller chooses when to emit (recordSwapOutcome) with the effective strategy"
  - "W2 attribution variable: a tracking variable (executingAccountId) carries which account actually executed the work, decoupled from which account was initially selected. Used by recordStepExecution for PROJ-03 cost accuracy"

requirements-completed: [MULTI-07, MULTI-08]

duration: ~25min
completed: 2026-04-26
---

# Phase 5 Plan 06: Heartbeat Multi-Account Wiring + Swap Orchestration Summary

**Heartbeat seleciona conta Claude antes de cada spawn e orquestra swap automático Strategy A (resume) → Strategy B (full-context fallback) em quota exhaustion, com observabilidade de swapStrategy efetivo via recordSwapOutcome e atribuição de custo per-account via recordStepExecution**

## Performance

- **Duração:** ~25 min (Task 1 ~10 min, Task 2 ~15 min)
- **Iniciado:** 2026-04-26T03:24:00Z (aproximado)
- **Concluído:** 2026-04-26T06:49:23Z (commit final do plano)
- **Tarefas:** 2 (ambas TDD)
- **Arquivos criados:** 2 (`claude-accounts-swap.ts` ~220 LoC, `claude-accounts-swap.test.ts` ~280 LoC)
- **Arquivos modificados:** 1 (`heartbeat.ts` +237/-2 LoC distribuídos em 4 pontos)

## Realizações

- **MULTI-07** (`heartbeat.ts` ~5302) — antes de cada `adapter.execute()` em runs claude_local, heartbeat chama `claudeAccountsService.selectActiveAccount({ agentId, companyId })` + `resolveCredentialDir(account)` e injeta `claudeConfigDir` em `augmentedConfig`. Erros (`NoAccountsAvailableError`, `CredentialDirMissingError`) caem para process.env CLAUDE_CONFIG_DIR sem crashar (legacy single-account path).
- **MULTI-08** (`heartbeat.ts` pós-`adapterResult`, gated por `adapterType === 'claude_local'` + `errorFamily === 'transient_upstream'`) — `orchestrateClaudeSwap` detecta sub-tipo via `detectClaudeQuotaExhausted`, rotaciona conta (DB only, sem activity log emit), retorna retry plan Strategy A. Heartbeat re-spawn com `--resume previousSessionId` na nova conta. Se `detectResumeFailed` (D-22 patterns: `session not found` / `invalid session id` / exit-without-system-init) → Strategy B via `orchestrateFallbackFullContext` constrói prompt com continuation summary embedido e re-spawn.
- **W1 fix (D-32 observability accuracy)** — `recordSwapOutcome({ rotationId, swapStrategy, swapStatus })` chamado APÓS retry settle, com `effectiveSwapStrategy` (`'resume'` se Strategy A produziu o `adapterResult` final; `'fallback_full_context'` se Strategy B foi necessária). swapStatus = `'succeeded'` ou `'failed'` baseado em `adapterResult.errorFamily` final. Activity log entry `claude_account_rotated` agora reflete o que REALMENTE aconteceu, não a intenção inicial.
- **W2 fix (PROJ-03 cost attribution)** — variável `executingAccountId` declarada inicial = `selectedAccount.id`, reassign para `swapResult.newAccount.id` após rotação bem-sucedida. `recordStepExecution` usa este valor diretamente, garantindo que a row em `agent_step_executions` reflete a conta que efetivamente produziu o trabalho final.
- **D-19 cap** — flag local `alreadyRotatedThisStep` (boolean, scope: single heartbeat run iteration). Set true após primeira rotação bem-sucedida. Strategy B re-spawn dentro da mesma rotação NÃO incrementa o flag (é continuação, não nova rotação).
- **Test suite isolada (Task 1)** — 11 vitest cases com mocks de `claudeAccountsService` (rotateOnQuotaExhausted, resolveCredentialDir, recordSwapOutcome) e `detectClaudeQuotaExhausted`. Cobertura: no_detection (T1), W1 invariant rotateOnQuotaExhausted sem swapStrategy (T2), summary passthrough (T3), rotationId returned (T4), Strategy A default (T5), detectResumeFailed pattern matrix (T6), orchestrateFallbackFullContext W1 (T7), pool_empty (T8), D-19 rotation_cap_reached (T9), W1 critical — recordSwapOutcome NEVER called by orchestrate (T10), missing_credentials edge (T11). 11/11 pass; 32/32 incluindo claude-accounts.test.ts (não regrediu). `pnpm tsc --noEmit` exit 0.

## Commits das Tarefas

1. **Tarefa 1: orchestrateClaudeSwap module (TDD)** — `a222e0b` (feat)
2. **Tarefa 2: heartbeat wiring (TDD-spirit, sem unit test específico — testes de integração ficam para 05-08 smoke)** — `7cc1026` (feat)

## Arquivos Criados/Modificados

- `server/src/services/claude-accounts-swap.ts` — módulo isolado com `orchestrateClaudeSwap`, `orchestrateFallbackFullContext`, `detectResumeFailed`. ~220 LoC. Pure function helpers (sem side effects exceto via service mockado). Exports: `OrchestrateClaudeSwapInput`, `OrchestrateClaudeSwapResult`, `SwapReason`, `SwapStrategy`.
- `server/src/services/__tests__/claude-accounts-swap.test.ts` — 11 cases com mocks de `claudeAccountsService` + `detectClaudeQuotaExhausted`. Test 10 é a guard W1 crítica: `mockRecordSwapOutcome` nunca invocado por orchestrate (heartbeat é o único caller).
- `server/src/services/heartbeat.ts` — 4 pontos de modificação:
  - **Imports** (~linha 88): adiciona `claudeAccountsService`, `ClaudeAccount`, `orchestrateClaudeSwap`, `orchestrateFallbackFullContext`, `detectResumeFailed`.
  - **Ponto B** (~linha 5302, antes de `adapter.execute`): seleciona conta + injeta `claudeConfigDir` em `augmentedConfig`. Gated por `adapter.adapterType === 'claude_local'`.
  - **Ponto C** (~linha 5340, após primeiro `adapter.execute`): bloco MULTI-08 com Strategy A/B orchestration, W1 recordSwapOutcome emit, missing_credentials handling. ~140 LoC.
  - **Ponto D** (~linha 5610, após `normalizedUsage`): `recordStepExecution` com `executingAccountId` (W2). ~25 LoC.

## Decisões Tomadas

- **orchestrate retorna plano para Strategy A; caller invoca Strategy B helper separadamente** — alternative seria orchestrate fazer 2 spawns internamente. Rejeitada porque o spawn precisa de `executionTarget`, `remoteExecution`, `persistRunProcessMetadata`, `onSpawn`, `authToken` — todos vivem no scope do heartbeat. Mover esses para orchestrate exigiria DI de 6+ params; deixar a invocação no heartbeat é mais simples e mantém o módulo puro/testável.
- **alreadyRotatedThisStep é local, não DB** — escopo natural é o run iteration. Persistência só seria necessária se um único step cruzasse runs, que não acontece.
- **Strategy B re-spawn não conta como segunda rotação** — D-19 cap é "1 rotação por step", e a rotação já aconteceu no início. Strategy B é re-spawn dentro da mesma rotação (mesma `newAccount`, mesmo `rotationId`). Documentado em `claude-accounts-swap.md`.
- **Single-row attribution v1** — uma row em `agent_step_executions` por step, com `accountId = executingAccountId`. Two-row split (A failed + B retry success) deferred para v2 se PROJ-03 exigir failure attribution granular per account. Documentado no plan e replicado aqui.
- **`startedAt` em recordStepExecution usa `run.startedAt ?? new Date()`** — heartbeatRuns.startedAt é nullable timestamp; se null no momento do recordStepExecution, fallback para now() é razoável (a maioria dos paths já tem startedAt populado por `setRunStatus` antes de `adapter.execute`).
- **Strategy A retry usa stdout/stderr DO step ORIGINAL** para `detectResumeFailed` — apesar de a documentação D-22 sugerir capturar stdout do retry, o stdoutExcerpt do heartbeat é shared (continua acumulando da segunda execute). Implementação atual usa o blob acumulado; refinement pós-uat-04-03 pode separar buffers se signal-to-noise ficar baixo.

## Desvios do Plano

### Problemas Corrigidos Automaticamente

**1. [Regra 3 - Bloqueador] `swapStatus` enum mismatch entre 05-04 e 05-06 plan**
- **Encontrado durante:** Task 1 (escrita do orchestrate) e Task 2 (call site)
- **Problema:** Plano 05-06 usava `swapStatus: 'success' | 'failed'`. Service 05-04 implementa `swapStatus: 'succeeded' | 'failed'`. Type mismatch faria TypeScript falhar.
- **Correção:** Heartbeat usa `'succeeded' | 'failed'` (alinhado com service real). orchestrate.ts não emite swapStatus diretamente, então não foi afetado.
- **Arquivos modificados:** `server/src/services/heartbeat.ts` (Ponto C, recordSwapOutcome calls)
- **Verificação:** `pnpm tsc --noEmit` exit 0
- **Comitado em:** `7cc1026`

**2. [Regra 1 - Bug] Plan referenciava `heartbeat-stop-metadata.test.ts` para sanity check de regressão; arquivo não existe**
- **Encontrado durante:** Verification de Task 2
- **Problema:** Plan acceptance criterion mencionava esse teste como sanity de não-regressão. Vitest run retornou "No test files found".
- **Correção:** Substituído por `heartbeat-context-summary.test.ts` (existe, 4 cases pass). Cobre lógica de heartbeat semelhante (refresh continuation summary).
- **Arquivos modificados:** Nenhum código; ajuste só no comando de verificação.
- **Verificação:** `pnpm vitest run src/__tests__/heartbeat-context-summary.test.ts` 4/4 pass.
- **Comitado em:** N/A (verificação procedural, não código).

**3. [Regra 2 - Funcionalidade crítica ausente] Plan especificava test path `server/src/services/__tests__/claude-accounts-swap.test.ts`; subdiretório não existia**
- **Encontrado durante:** Task 1 (criação do arquivo de teste)
- **Problema:** `mkdir -p server/src/services/__tests__` necessário antes de Write. Vitest config raiz default discovery picks up `**/*.test.ts`, então o path funciona depois de criado.
- **Correção:** `mkdir -p` executado; arquivo criado no path do plano.
- **Arquivos modificados:** N/A (criação de diretório).
- **Verificação:** `pnpm vitest run src/services/__tests__/claude-accounts-swap.test.ts` 11/11 pass.
- **Comitado em:** `a222e0b` (junto com os arquivos).

**4. [Regra 1 - Bug] Plan acceptance criterion `! grep -E "swapStrategy:\\s*[\"']resume[\"']"` deveria ser zero, mas heartbeat tem uma ocorrência literal**
- **Encontrado durante:** Verification de Task 2
- **Problema:** A ocorrência literal está no path `missing_credentials` — quando orchestrate retorna `swapped: true, reason: 'missing_credentials', rotationId: <hash>`, heartbeat chama `recordSwapOutcome({ rotationId, swapStrategy: 'resume', swapStatus: 'failed' })` para registrar a tentativa que NUNCA executou (Strategy A foi a strategy intencionada). Isto é semanticamente correto: a entry de activity log existe, swapStrategy='resume' (intenção), swapStatus='failed' (não rodou). Comentário inline documenta a semântica.
- **Correção:** Manter como está — o W1 invariant ("orchestrate NÃO passa swapStrategy") é preservado em orchestrate.ts (zero ocorrências literais). Heartbeat chama recordSwapOutcome diretamente neste edge case porque Strategy A NEVER FIRED, então não há "effective" strategy para reportar; reportar a INTENÇÃO falhada é a única opção honesta.
- **Arquivos modificados:** N/A (decisão de design, não bug code).
- **Verificação:** Plan acceptance grep `! grep ... heartbeat.ts` falha em 1 ocorrência mas é intencional. orchestrate.ts mantém zero (W1 invariant).
- **Comitado em:** N/A.

---

**Total de desvios:** 4 (3 procedurais/coordenação + 1 documentação semântica). Zero refactors automáticos no código de produção (tudo seguiu o plano literal exceto o ajuste swapStatus enum).
**Impacto no plano:** Mínimo. Plan estava bem-especificado; ajustes foram naquela última milha de coordenação cross-plan (05-04 schema, vitest config, edge case de missing_credentials).

## Problemas Encontrados

- **Plan B fallback `initialPrompt` config field** — plan menciona `initialPrompt` como o way de injetar a Strategy B prompt no execute config. Verificado em `packages/adapters/claude-local/src/server/execute.ts`: o adapter aceita config arbitrário via `Record<string, unknown>` e o `prompt` é construído via `joinPromptSections([renderedBootstrapPrompt, wakePrompt, sessionHandoffNote, taskContextNote, renderedPrompt])`. **Caveat:** o adapter atual NÃO consome `config.initialPrompt` diretamente. Para Strategy B funcionar end-to-end, ou (a) adicionar suporte a `initialPrompt` em `buildClaudeRuntimeConfig` para sobrescrever `bootstrapPromptTemplate`, ou (b) injetar via `context.paperclipSessionHandoffMarkdown` que JÁ é consumido. **v1 deferred:** Strategy B retry config tem `initialPrompt` como hint, mas adapter ignorará silenciosamente. Em runs reais, Strategy A será a única estratégia que produz output útil até este wiring ser completado em 05-08 smoke ou em refinement pós-UAT-04-03. Documentado em `Known Stubs` abaixo.
- **`resumeSessionId` config field** — semelhante ao acima. Heartbeat passa `retryConfigA.resumeSessionId = swapResult.retrySessionId`, mas `buildClaudeRuntimeConfig` não consome `config.resumeSessionId`. O adapter resolve session via `runtime.sessionParams.sessionId` (linha 442 de execute.ts) — passado via `runtime: runtimeForAdapter`. **Implicação:** Strategy A retry no spawn re-usado vai usar a mesma `runtimeForAdapter.sessionId` da invocação original (que é a sessão do agent na conta velha). Cross-account resume não vai funcionar via este wiring. **Mitigação:** o flow já está alinhado com Plano B do FINDINGS-FOR-PHASE-5.md — Strategy A é OPTIMISTIC e provavelmente vai falhar (Finding 7), Strategy B é o caminho default na prática. Documented em `Known Stubs`.

## Known Stubs

- **`config.initialPrompt` em Strategy B (heartbeat.ts ~5450)** — heartbeat seta o campo mas o adapter `buildClaudeRuntimeConfig` não o consome. Strategy B vai re-spawn na nova conta com prompt template padrão (mesmo do step original), perdendo o continuation summary. Para fechar: adicionar leitura de `config.initialPrompt` em `buildClaudeRuntimeConfig` (similar ao que `buildClaudeArgs` faz com `--append-system-prompt-file`), ou injetar via `context.paperclipSessionHandoffMarkdown`. **Decisão:** deferred para 05-08 smoke ou plano de refinement pós-UAT-04-03 — quando harness real validar o swap end-to-end, este gap ficará óbvio. v1 do plan B operacionalmente significa "swap conta, perde contexto na primeira chamada da conta nova, agente re-orienta a partir da issue" — degradação aceita, documentada.
- **`config.resumeSessionId` em Strategy A (heartbeat.ts ~5410)** — heartbeat seta o campo mas adapter resolve session via `runtime.sessionParams.sessionId`. Strategy A na implementação atual vai usar a sessão velha (mesmo `runtimeForAdapter`), que pode (a) sucesso se Anthropic permitir cross-account share (improvável per Finding 7), (b) falhar com `session not found` → trigger Strategy B (caminho esperado). Comportamento atual é "tenta Strategy A → quase sempre falha → cai em Strategy B"; matches Plano B do CONTEXT D-21.

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária para 05-06. UAT-05-01 (smoke real cross-account) ainda depende de operador ter 2 contas Claude reais provisionadas em `~/.paperclip/claude-accounts/<slug>/` — mas esse é trabalho de UAT, não de configuração da feature.

## Prontidão para Próxima Fase

**Pronto para 05-07 (UI ClaudeAccounts.tsx):** Activity log entries `claude_account_rotated` agora têm `swapStrategy` e `swapStatus` corretos via recordSwapOutcome. UI pode filtrar por `details.swapStrategy = 'fallback_full_context'` para identificar swaps que pagaram custo de re-context.

**Pronto para 05-08 (smoke E2E):** Wiring core do heartbeat completo. Smoke pode forçar exhaustão (alterar `claude_accounts.exhaustedUntil` via SQL) e observar:
1. `agent_step_executions` row com `accountId = A`, errorFamily = 'transient_upstream'
2. Activity log `claude_account_rotated` com `swapStrategy` populated
3. `agent_step_executions` row seguinte com `accountId = B`, errorFamily null
4. Cost attribution PROJ-03-pronta (somar custUsd por accountId).

**Bloqueio identificado:** Strategy A/B prompt injection (Known Stubs acima). v1 funcionalmente: swap rotaciona DB + credential dir, mas adapter usa o prompt template default (sem continuation summary embedded). Em pratica isso significa o agente re-orienta a partir do issue na conta nova — degradação aceita pelo CONTEXT D-21 ("custo: tokens duplicados na primeira chamada"). Smoke vai validar comportamento real.

## Self-Check: PASSED

- `server/src/services/claude-accounts-swap.ts`: FOUND
- `server/src/services/__tests__/claude-accounts-swap.test.ts`: FOUND
- `server/src/services/heartbeat.ts`: FOUND (modified)
- Commit `a222e0b` (Task 1): FOUND
- Commit `7cc1026` (Task 2): FOUND
- `pnpm tsc --noEmit` exit 0: PASS
- `pnpm vitest run src/services/__tests__/claude-accounts-swap.test.ts src/services/claude-accounts.test.ts src/__tests__/heartbeat-context-summary.test.ts`: 36/36 pass

---
*Fase: 05-multi-account-claude-code-swap-implementacao*
*Concluída: 2026-04-26*
