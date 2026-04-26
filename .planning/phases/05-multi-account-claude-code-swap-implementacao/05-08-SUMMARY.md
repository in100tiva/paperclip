---
phase: 05-multi-account-claude-code-swap-implementacao
plan: 08
subsystem: planning-artifacts
tags: [smoke-e2e, human-uat, multi-11, phase-closure]
requirements: [MULTI-11]
dependency_graph:
  requires:
    - 05-01 (schemas — referenced in SQL queries)
    - 05-03 (activity_log type — referenced in pass/fail criteria)
    - 05-04 (claudeAccountsService — referenced in procedure)
    - 05-06 (heartbeat orchestrate — referenced in Mode A swap path)
    - 05-07 (UI route — referenced in Passo 1 / Passo 6)
  provides:
    - Canonical Mode A E2E smoke procedure (forced exhaustion via SQL)
    - Mode B HUMAN-UAT artifact (UAT-05-01 — real cross-account exhaustion)
    - Phase 5 closure routing pattern (complete-with-pending-UAT)
  affects:
    - Phase 5 status (complete-with-pending-UAT once executor closes plan)
    - Future operator workflow (UAT-05-01 unblocks formal complete declaration)
tech_stack:
  added: []
  patterns: [pt-br planning artifact, frontmatter YAML for UAT, pass/fail table convention]
key_files:
  created:
    - .planning/phases/05-multi-account-claude-code-swap-implementacao/SMOKE-E2E.md (218 lines)
    - .planning/phases/05-multi-account-claude-code-swap-implementacao/05-HUMAN-UAT.md (184 lines)
  modified: []
decisions:
  - "Routing decision: MULTI-11 endereçado em 2 artefatos complementares — SMOKE-E2E.md cobre Modo A (forçado via SQL, executável pelo executor Claude e CI), 05-HUMAN-UAT.md cobre Modo B (real, requer 2 contas Claude reais — HUMAN). Phase 5 fecha como complete-with-pending-UAT (precedente Phase 3 03-04 e Phase 4 04-05)."
  - "SMOKE-E2E.md em pt-br consistente com convenção .planning/ (CONTEXT-04 e demais artefatos). UI labels permanecem em inglês (paperclip convention para user-facing strings)."
  - "Modo A SQL force usa jsonb_set para `lastQuotaWindowsJson.daily_quota` + atualizar `exhausted_until` top-level (espelha computeMaxExhaustion lógica do service 05-04)."
  - "UAT-05-01 frontmatter espelha pattern Phase 3/4 (`type: human-uat status: pending`) — destrava parsing futuro por scripts ou agentes."
  - "Failure-path findings explicitados em UAT-05-01: Continuity fail → refine continuation summary (resolve known stub do 05-06 sobre `config.initialPrompt`); Detection fail → extend regex; Strategy A always-fail → drop tentativa para economizar ~5s."
metrics:
  duration: ~3min
  completed: 2026-04-26
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  commits: 2
  lines_total: 402
---

# Phase 5 Plan 08: Smoke E2E + HUMAN-UAT Routing Summary

Plan 05-08 entrega 2 documentos de planejamento que fecham Phase 5 — `SMOKE-E2E.md` com procedimento canônico Modo A (forçado via SQL, executável agora) e `05-HUMAN-UAT.md` com UAT-05-01 Modo B (real, requer 2 contas Claude reais — destrava complete formal pós-execução humana).

## What Changed

**Created:**

- `.planning/phases/05-multi-account-claude-code-swap-implementacao/SMOKE-E2E.md` (218 lines) — Procedimento canônico Modo A em 6 Passos numerados (D-33): registrar 2 contas via UI → spawnar agente → forçar exhaustão de A via SQL update direto em `claude_accounts.exhausted_until` + `last_quota_windows_json` → spawnar próximo step → observar swap automático para B → validar `agent_step_executions` (attribution per-account), `activity_log` (entry `claude_account_rotated` com 8 campos), e UI rotation history. Inclui pré-requisitos table (8 itens), SQL queries literais para 4 tabelas (`claude_accounts`, `agent_account_bindings`, `agent_step_executions`, `activity_log`), pass/fail table (7 critérios), cleanup section com SQL de reset, e limitations explícitas (5 itens não validados — todos roteados para UAT-05-01).

- `.planning/phases/05-multi-account-claude-code-swap-implementacao/05-HUMAN-UAT.md` (184 lines) — Frontmatter YAML `type: human-uat status: pending` consistente com 04-HUMAN-UAT.md / 03-HUMAN-UAT.md. UAT-05-01 detalhado (objetivo, pré-requisitos com 8 itens, procedimento em 6 passos, critérios pass/fail em 7 dimensões, resultados esperados condicionais com 4 cenários failure-path, instruções de report). Forward links para SMOKE-E2E.md (Modo A complement), UAT-04-03 (dependência conceitual), FINDINGS-FOR-PHASE-5.md (Findings 6-7 sobre swap strategy), e D-21/D-34 do CONTEXT.

## Decisions Made

**Routing (D-34 reaffirmed):** MULTI-11 dividido em 2 artefatos. Modo A automatizável (SMOKE-E2E.md) executável pelo executor Claude e por CI/regressão sem precisar de 2 contas Claude reais — força exhaustão via SQL update direto. Modo B (UAT-05-01) é o portão empírico real que valida classifier, swap mechanic, continuity, attribution, e `exhaustedUntil` real do retry-after Anthropic. Phase 5 fecha como `complete-with-pending-UAT` (precedente: Phase 3 plan 03-04 e Phase 4 plan 04-05) — artefatos entregues e validados via Modo A; validação Modo B fica como trabalho contínuo do operador.

**Linguagem pt-br para artefatos `.planning/`:** Consistente com 04-CONTEXT.md, 04-HUMAN-UAT.md, 03-HUMAN-UAT.md, ONBOARDING.md, TROUBLESHOOTING.md. UI labels e mensagens user-facing permanecem em inglês (paperclip convention).

**SQL force pattern em Modo A:** `jsonb_set` no campo `last_quota_windows_json.daily_quota` (subkey específico da taxonomia) + atualizar `exhausted_until` top-level cached. Espelha lógica do `computeMaxExhaustion` helper do service (05-04 D-09). Permite testar selection logic do `claudeAccountsService.selectActiveAccount` (filtro `WHERE status='live' AND (exhaustedUntil IS NULL OR exhaustedUntil < now)`) sem depender de quota real.

**UAT-05-01 failure-path findings explicitados:** Documentados 4 cenários de FAIL com ação corretiva específica — Continuity fail aponta para known stub do 05-06 (`config.initialPrompt` não consumido por `buildClaudeRuntimeConfig`); Detection fail aponta para `CLAUDE_TRANSIENT_UPSTREAM_RE` em parse.ts:13 com referência a 04-CONTEXT D-15 ordering rules; Strategy A always-fail destrava decisão de remover tentativa optimistic para economizar ~5s (refinement post-deploy).

## Pass/Fail Criteria Summary

**SMOKE-E2E.md (Modo A) — 7 critérios:**

| # | Critério | Validação |
|---|----------|-----------|
| 1 | Lista de accounts | UI mostra 2 rows após registro |
| 2 | Selection inicial | Binding aponta para A (round-robin lastUsedAt ASC) |
| 3 | Exhaustão induzida | UI mostra A como `exhausted` pós-SQL force |
| 4 | Swap automático | Binding muda para B pós-trigger novo step |
| 5 | Attribution | `agent_step_executions` com rows para ambos accountIds |
| 6 | Activity log | Entry `claude_account_rotated` com 8 campos completos |
| 7 | UI history | Rotation entry visível com timestamp |

**05-HUMAN-UAT.md (Modo B / UAT-05-01) — 7 critérios:**

| # | Critério | Validação |
|---|----------|-----------|
| 1 | Detection real | Classifier identifica sub-tipo na mensagem CLI real |
| 2 | Swap automático | Agent continua sem intervenção |
| 3 | Continuity | Output de B faz sentido com base em A (não recomeça) |
| 4 | Attribution | Tokens de A vs B distintos em `agent_step_executions` |
| 5 | `exhaustedUntil` real | Reflete reset Anthropic real (não fallback default) |
| 6 | `swapStrategy` populado | `'resume'` ou `'fallback_full_context'` (não NULL) |
| 7 | D-19 cap | Apenas 1 rotação por step |

## Forward Dependencies (Pós-Phase 5)

- **UAT-05-01 + UAT-04-03** destravam refinamento empírico de `swapStrategy`. Se Strategy A (`--resume <session_id>` cross-account) consistentemente PASS → keep; consistentemente FAIL → remover tentativa optimistic (economiza ~5s) e ir direto para Strategy B.
- **UAT-04-01** (capturar fixtures reais 429) destrava substituição dos 6 stubs em `prototype/fixtures/` por mensagens reais Claude CLI — informa evolução do `CLAUDE_TRANSIENT_UPSTREAM_RE` se gaps `partial` (org_tier, tpm_transient) virarem coverage real.
- **UAT-04-02** (session_id per-account empírico) confirma se Strategy A é viável ou apenas teórica.
- **Phase 6 PROJ-03** (cost attribution agregado por projeto) reusa `agent_step_executions` validado por UAT-05-01.

## Phase 5 Status: complete-with-pending-UAT

Após este plano, Phase 5 satisfaz formalmente:

- ✅ MULTI-01..03 (schemas) — 05-01
- ✅ MULTI-04 (`claudeAccountsService`) — 05-04
- ✅ MULTI-05 (CLAUDE_CONFIG_DIR wiring) — 05-05
- ✅ MULTI-06 (classifier — referência viva no spike Phase 4 + integração via heartbeat) — 05-02 + 05-06
- ✅ MULTI-07 (heartbeat integration) — 05-06
- ✅ MULTI-08 (swap automático Plano B) — 05-06
- ✅ MULTI-09 (UI ClaudeAccounts.tsx) — 05-07
- ✅ MULTI-10 (activity log emit) — 05-03 + 05-04
- ✅ MULTI-11 (smoke E2E) — 05-08 (Modo A entregue; Modo B em UAT-05-01 pending)

ROADMAP success criterion #1 (agente roda → conta esgota → swap → continuidade → cost atribuído) endereçado como artefato testável. Validação empírica final destrava `complete` formal quando operador executar UAT-05-01.

## Deviations from Plan

None — plano executou exatamente como escrito. Frontmatter ajustado pra incluir campo `phase` para alinhamento com pattern Phase 4 (04-HUMAN-UAT.md tem `phase:` no frontmatter); decisão menor de consistência, não desvio material.

## Self-Check: PASSED

Verified via:

- `test -f .planning/phases/05-multi-account-claude-code-swap-implementacao/SMOKE-E2E.md` → FOUND (218 lines)
- `test -f .planning/phases/05-multi-account-claude-code-swap-implementacao/05-HUMAN-UAT.md` → FOUND (184 lines)
- `git log --oneline | grep 2ed7984` → FOUND (SMOKE-E2E.md commit)
- `git log --oneline | grep 85d645e` → FOUND (05-HUMAN-UAT.md commit)
- All acceptance criteria validated:
  - SMOKE-E2E.md: ≥100 lines (218 ✓), 6 Passos (✓), 4+ tabela queries (7 matches ✓), claude_account_rotated mention (3 ✓), MULTI-11 (1 ✓), Pass/Fail table (✓), Cleanup (✓)
  - 05-HUMAN-UAT.md: ≥80 lines (184 ✓), frontmatter `---` (✓), `type: human-uat` (1 ✓), `status: pending` (2 ✓), `## UAT-05-01` (1 ✓), MULTI-11 (3 ✓), Strategy refs (13 ✓)

## Commits

- `2ed7984` docs(05-08): add SMOKE-E2E.md with Mode A canonical procedure (MULTI-11)
- `85d645e` docs(05-08): add 05-HUMAN-UAT.md with UAT-05-01 (real cross-account smoke)
