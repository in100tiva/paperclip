---
phase: 11-skills-system-prompts
plan: 01
subsystem: i18n
tags: [locale, drizzle, heartbeat, agent-skill, propagation, server-context]

requires:
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: "authUsers.locale column (default 'pt-BR') populated end-to-end + middleware/auth.ts pattern of resolving locale via authUsers JOIN"
  - phase: 05-multi-account
    provides: "agent_wakeup_requests.requestedByActorType + requestedByActorId already populated by wake codepaths; heartbeat reads run.wakeupRequestId throughout"

provides:
  - "RuntimeLocale type ('pt-BR' | 'en-US') exported from server/src/services/heartbeat-locale.ts"
  - "resolveRunOwnerLocale(db, wakeupRequestId): Promise<RuntimeLocale> — single-query leftJoin from agent_wakeup_requests to authUsers"
  - "context.runtimeLocale field on the AdapterExecutionContext consumed by adapter.execute (mutated server-side in heartbeat.ts before invocation)"

affects:
  - "11-02-PLAN — language directive composition reads context.runtimeLocale"
  - "11-03-PLAN — skill variant materialization + bundleKey extension keys on locale"

tech-stack:
  added: []
  patterns:
    - "Locale Resolution Chain (server-side): wakeupRequest → authUsers leftJoin in single query, narrowed to RuntimeLocale literal at the boundary"
    - "Context-channel propagation: runtime values (locale) flow through context: Record<string, unknown> rather than expanding ServerAdapterModule interface — backward-compatible for all 7 adapters"

key-files:
  created:
    - "server/src/services/heartbeat-locale.ts"
    - "server/src/services/__tests__/heartbeat-locale.test.ts"
  modified:
    - "server/src/services/heartbeat.ts"

key-decisions:
  - "Inject locale via context.runtimeLocale (not augmentedConfig.runtimeLocale) — context is already a flexible Record<string, unknown> consumed by all adapters; augmentedConfig is reserved for adapter-config (claude credential dir, etc.)"
  - "Field name 'runtimeLocale' (not 'paperclipRuntimeLocale' prefix convention) — locale is a first-class runtime input that downstream Plans 11-02/11-03 explicitly read; reserve paperclip* prefix for framework-internal scratch state (paperclipSessionHandoffMarkdown etc.)"
  - "narrowLocale collapses any non-'en-US' value to 'pt-BR' — defensive narrowing absorbs schema drift, legacy rows, JOIN-misses (race delete + wake) into the safe default"
  - "Single-query leftJoin (not 2-stage select like middleware/auth.ts pattern) — heartbeat hot path is latency-sensitive; one round-trip vs two; behavior identical because helper does not need actor row independent of user row"

patterns-established:
  - "RuntimeLocale literal type at the server boundary: any string-typed DB column that flows to runtime is narrowed via narrowLocale-style helper before crossing into typed code, eliminating string-literal drift"
  - "context.runtimeLocale propagation channel: Plans 11-02/11-03 read context.runtimeLocale instead of receiving locale as a separate param to every adapter helper — keeps the contract discoverable in one place"

requirements-completed: [AGENT-SKILL-03]

duration: ~12min
completed: 2026-04-26
---

# Phase 11 Plan 01: Server Locale Resolution + Propagation Foundation Summary

**resolveRunOwnerLocale helper resolves user.locale via agent_wakeup_requests → authUsers leftJoin and heartbeat.ts injects RuntimeLocale into context.runtimeLocale before adapter.execute, unblocking language directive composition (11-02) and skill variant materialization (11-03).**

## Performance

- **Duração:** ~12min
- **Iniciado:** 2026-04-26T23:13:30Z
- **Concluído:** 2026-04-26T23:39:00Z (wall-clock ~25min including pre-existing typecheck baseline confirmation + heartbeat regression sweep ~13min)
- **Tarefas:** 3
- **Arquivos modificados:** 3 (2 created + 1 modified)

## Realizações

- `RuntimeLocale` type ('pt-BR' | 'en-US') exported from `server/src/services/heartbeat-locale.ts` — Plans 11-02 and 11-03 import this directly without redeclaration.
- `resolveRunOwnerLocale(db, wakeupRequestId)` implements the full resolution chain: null wakeup → 'pt-BR'; non-user actor → 'pt-BR'; user actor → narrow `authUsers.locale` to RuntimeLocale; JOIN-miss/null → safe 'pt-BR'.
- `heartbeat.ts` calls the helper at line ~5354 (immediately before `adapter.execute`) and mutates `context.runtimeLocale` so every adapter receives the resolved locale through the existing `Record<string, unknown>` channel without changing the `ServerAdapterModule` interface in `@paperclipai/adapter-utils`.
- Wave 0 RED test (`heartbeat-locale.test.ts`, 5 cases) flipped to GREEN after Tarefa 2; sibling regression suite (claude-accounts-swap + claude-account-costs + heartbeat-locale) 22/22 GREEN; typecheck clean except pre-existing `services/recovery/service.ts:459` baseline.

## Commits das Tarefas

Cada tarefa foi comitada atomicamente:

1. **Tarefa 1: Wave 0 RED — Suite unit cobrindo 5 cenários de resolveRunOwnerLocale** — `4cae59e` (test)
2. **Tarefa 2: GREEN — Implementar resolveRunOwnerLocale** — `b0e78ad` (feat)
3. **Tarefa 3: Integração — heartbeat injeta context.runtimeLocale antes de adapter.execute** — `2fe6750` (feat)

_Nota: 3 commits atômicos. Tarefa 1 é o RED do TDD; Tarefas 2 e 3 são GREEN steps em arquivos disjuntos (helper isolado vs heartbeat integration)._

## Arquivos Criados/Modificados

- `server/src/services/heartbeat-locale.ts` (created, 56 lines) — exports `RuntimeLocale` literal type + `resolveRunOwnerLocale` helper. Single-query leftJoin (`agentWakeupRequests` ⟕ `authUsers` on `requestedByActorId = id`). `narrowLocale` defensive helper at the boundary.
- `server/src/services/__tests__/heartbeat-locale.test.ts` (created, 70 lines) — 5 cases: null short-circuit (asserts `db.select` is never called), system actor → 'pt-BR', user actor pt-BR/en-US, user actor with null locale (race delete + wake) → 'pt-BR'.
- `server/src/services/heartbeat.ts` (modified, +12 lines net) — added 1 import (`resolveRunOwnerLocale`, `RuntimeLocale`) + 1 resolution call at line ~5360 (just before `adapter.execute`) that mutates `context.runtimeLocale`.

## Decisões Tomadas

**1. Field channel: `context.runtimeLocale` (not `augmentedConfig.runtimeLocale`).**
Context is the flexible runtime metadata channel already used by `paperclipSessionHandoffMarkdown`, `paperclipPreviousSessionId`, `projectId`, etc. — all `Record<string, unknown>`-typed. `augmentedConfig` is reserved for adapter-config payload (claude credential dir, etc.) per the MULTI-07 pattern. Locale is per-run runtime metadata, not per-adapter config — context is the natural home.

**2. Field name: `runtimeLocale` (not `paperclipRuntimeLocale`).**
The `paperclip*` prefix convention exists in heartbeat.ts to mark **framework-internal scratch state** consumed only by paperclip-specific code (session rotation markers, handoff markdown). `runtimeLocale` is a **first-class runtime input** that Plans 11-02 and 11-03 read explicitly and that may eventually flow into adapter-utils contract documentation — keep the name discoverable.

**3. Single-query leftJoin (not 2-stage select like middleware/auth.ts).**
The middleware does 3 parallel selects via `Promise.all` because it needs role + memberships + locale independently. The heartbeat helper only needs locale conditional on actorType — single query with `leftJoin` is one round-trip vs two and the conditional `if (row?.actorType !== "user")` filter is free in JS.

**4. Defensive narrowing in `narrowLocale`.**
Any value other than the literal `"en-US"` collapses to `"pt-BR"`. This absorbs: legacy rows from before Phase 7 default, schema drift if a third locale ever lands without code update, race conditions where leftJoin returns null because the user row was deleted between wake enqueue and heartbeat dispatch. The helper never throws on locale resolution — locale is best-effort metadata, not a precondition.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. Todas as 3 tarefas seguiram o action block do PLAN sem ajustes; tipos confirmados (`Db` from `@paperclipai/db`, `agentWakeupRequests` and `authUsers` re-exported from the package barrel via `schema/index.ts`); pattern de mock chained-builder reaproveitado de `middleware-locale.test.ts` (Phase 7-04 precedent).

## Problemas Encontrados

**Pre-existing typecheck baseline:** `server/src/services/recovery/service.ts:459` reports `TS2339 Property 'title' does not exist` — confirmed in `master` baseline (STATE.md Phase 7-04 record + Phase 8-05 deferred-items reference). Out of scope per `<deviation_rules>` boundary; not introduced by this plan.

**Pre-existing test failures (Windows shebang):** During regression sweep (`vitest run -t heartbeat`), 5 test files / 2 tests failed with `Failed to start command "...gemini"` / etc. — these are the documented Windows shebang adapter spawn failures (06-03 deferred-items.md), reproducible in master, out of scope. The targeted heartbeat-area suite (heartbeat-locale + claude-accounts-swap + claude-account-costs) passed 22/22.

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária. Migration de banco não muda (helper só lê colunas existentes da Phase 7).

## Self-Check: PASSED

Files created exist:
- `server/src/services/heartbeat-locale.ts` — FOUND
- `server/src/services/__tests__/heartbeat-locale.test.ts` — FOUND
- `server/src/services/heartbeat.ts` — modified (verified diff in commit `2fe6750`)

Commits in log:
- `4cae59e` test(11-01) — FOUND
- `b0e78ad` feat(11-01) helper — FOUND
- `2fe6750` feat(11-01) heartbeat wiring — FOUND

## Prontidão para Próxima Fase

**Wave 2 destravada — Plans 11-02 e 11-03 podem rodar em paralelo:**

- **11-02 (language directive content)** importa `RuntimeLocale` de `../heartbeat-locale.js` e lê `context.runtimeLocale` no composer de instructions; sem coupling com heartbeat (composer já recebe `context` via `agentInstructionsService.exportFiles` callsite).
- **11-03 (skill variants + bundleKey)** importa `RuntimeLocale` mesmo módulo e lê `context.runtimeLocale` em `prepareClaudePromptBundle` (precisa estender assinatura `buildClaudePromptBundleKey({locale, ...})` per RESEARCH §"Pattern 3").

**File sets disjuntos confirmados:**
- 11-02 toca `agent-instructions.ts` + novo `agent-instructions-locale-directive.ts` + extends `agent-instructions-service.test.ts`.
- 11-03 toca `packages/adapters/claude-local/src/server/prompt-cache.ts` + novos `skills/*/SKILL.pt-BR.md` + novo `prompt-cache-locale.test.ts`.

Sem merge friction esperado.

---
*Fase: 11-skills-system-prompts*
*Concluída: 2026-04-26*
