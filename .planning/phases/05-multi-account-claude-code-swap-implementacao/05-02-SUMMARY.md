---
phase: 05-multi-account-claude-code-swap-implementacao
plan: 02
subsystem: api
tags: [claude-code, classifier, regex, vitest, parse, quota-detection, MULTI-06]

requires:
  - phase: 04-spike-multi-account-claude-code-detection
    provides: "CLAUDE_429_TAXONOMY (6-tipos), prototype/detect-quota-exhausted.ts (architecture reference), prototype/fixtures/*.txt (test inputs)"
provides:
  - "detectClaudeQuotaExhausted (parse.ts) — classifier público, MULTI-06"
  - "ClaudeQuotaType union type (rpm_transient | tpm_transient | daily_quota | weekly_quota | session_5h | org_tier)"
  - "ClaudeQuotaDetection interface ({ detected, type, retryAt, confidence, rawMatch })"
  - "10 vitest cases cobrindo 6 sub-tipos + 2 gates negativos + 1 ambiguidade + 1 stderr concat"
affects: [MULTI-04 claude-accounts-service, MULTI-08 swap-on-exhaustion, heartbeat integration]

tech-stack:
  added: []  # zero novas deps; regex stdlib + vitest já presente
  patterns:
    - "Sub-discriminator chain pattern: top-level gate (CLAUDE_TRANSIENT_UPSTREAM_RE) + most-specific-first ordering para resolver ambiguidades de tokens compartilhados"
    - "Fixture reuse via path relativo (D-16): tests referenciam .planning/phases/04-*/prototype/fixtures sem duplicar conteúdo — UAT-04-01 substitui in-place"

key-files:
  created:
    - "server/src/__tests__/claude-local-adapter-quota-detection.test.ts (104 linhas, 10 cases)"
  modified:
    - "packages/adapters/claude-local/src/server/parse.ts (383 → 466 linhas; +83 linhas appended; existing exports intactos)"
    - "packages/adapters/claude-local/src/server/index.ts (+2 linhas: barrel export do classifier + types)"

key-decisions:
  - "Reuse CLAUDE_TRANSIENT_UPSTREAM_RE existente (parse.ts:13) como gate top-level — sem duplicação de regex (Finding 1, F4 do FINDINGS-FOR-PHASE-5.md)"
  - "Ordem most-specific-first: session_5h → weekly → daily → tpm → rpm → org_tier — D-15 invariante; comentário inline marca-a como 'NÃO ALTERAR sem atualizar tests'"
  - "Ambiguidade 'claude usage limit reached' resolve para daily_quota quando '5-hour' literal ausente — bug fix do protótipo Phase 4 (CLAUDE_429_TAXONOMY.md), confidence high requer retryAt parseado"
  - "Confidence levels: high (session_5h, weekly, daily-with-reset), medium (rpm/tpm — sub-tipo claro mas sem reset garantido), low (org_tier fallback + best-effort rpm sem sub-match)"
  - "Tests reusam fixtures spike por path relativo (D-16) — UAT-04-01 promoverá stubs para fixtures reais sem alterar tests"

patterns-established:
  - "Classifier append pattern: extend produção de Phase 4 audit-only spike, preservando regex existentes byte-for-byte"
  - "TDD-light: Task 1 (impl) + Task 2 (tests) commits separados, cada um auto-contido — RED não literal mas verify passou em ambos os pontos"

requirements-completed: [MULTI-06]

duration: 4min
completed: 2026-04-26
---

# Phase 5 Plan 02: Quota Classifier Summary

**detectClaudeQuotaExhausted classifier com 6-way taxonomia (rpm/tpm/daily/weekly/5h/org), reusando CLAUDE_TRANSIENT_UPSTREAM_RE existente como gate, validado por 10 vitest cases passando.**

## Performance

- **Duração:** ~4 min
- **Iniciado:** 2026-04-26T06:20:07Z
- **Concluído:** 2026-04-26T06:24:10Z
- **Tarefas:** 2 (impl + tests)
- **Arquivos modificados:** 3 (1 criado, 2 modificados)

## Realizações

- `detectClaudeQuotaExhausted` exportado de `packages/adapters/claude-local/src/server/parse.ts` e via barrel `@paperclipai/adapter-claude-local/server`
- 6-way taxonomia operacional: cada sub-tipo do CLAUDE_429_TAXONOMY.md é classificado distintamente
- Bug fix do protótipo carregado: ambiguidade "claude usage limit reached" agora rotea para daily_quota quando "5-hour" literal ausente (D-15)
- 10 vitest cases (8 mínimos + 2 extras) cobrem: 2 gates negativos, 6 sub-tipos via fixtures Phase 4, 1 disambiguation inline literal, 1 stderr concat
- Existing exports preservados intactos — sem regressão em `claude-local-adapter.test.ts` (5/5) ou `claude-local-adapter-environment.test.ts` (6/6)

## Commits das Tarefas

1. **Tarefa 1: Implementar detectClaudeQuotaExhausted em parse.ts** — `78f8371` (feat)
2. **Tarefa 2: Test suite vitest cobrindo 6 sub-tipos + gate** — `65ab864` (test)

_Nota: TDD aplicado em sequência impl→test (não strict RED-first); ambos commits passaram verify automatizado independentemente._

## Arquivos Criados/Modificados

- **`packages/adapters/claude-local/src/server/parse.ts`** — APPEND de classifier no fim (linhas 385-466). Existing regex (CLAUDE_TRANSIENT_UPSTREAM_RE linha 13, CLAUDE_EXTRA_USAGE_RESET_RE linha 14) intactos byte-for-byte; reusados internamente pela função.
- **`packages/adapters/claude-local/src/server/index.ts`** — Adiciona `detectClaudeQuotaExhausted` ao bloco de exports de `./parse.js` + `export type { ClaudeQuotaType, ClaudeQuotaDetection }`.
- **`server/src/__tests__/claude-local-adapter-quota-detection.test.ts`** — Suite vitest 10 cases. Importa do package barrel para confirmar export público. Lê fixtures Phase 4 via `path.resolve(__dirname, "../../../.planning/phases/04-*/prototype/fixtures")`.

## Decisões Tomadas

- **Reuse vs duplicate regex:** Reuse — Finding 1 manda; CLAUDE_TRANSIENT_UPSTREAM_RE é battle-tested e mudá-lo arrisca regressão em `executeClaudeLocal` que já o consulta (parse.ts:382).
- **Ordem dos discriminators:** most-specific-first (session_5h antes de weekly antes de daily) — porque "claude usage limit reached" é token compartilhado entre daily e session_5h; sem ordem strict, daily ganharia incorretamente para inputs 5h. Plano explicita ordem como invariante D-15.
- **Daily exige retryAt:** sem reset timestamp, daily cai para tpm/rpm/org no chain — evita falso-positivo de daily quando string genérica de "usage limit" aparece sem contexto temporal.
- **Confidence semantics:** high para identificação inequívoca (token + reset), medium para token claro sem reset, low para fallbacks ambíguos (org_tier por overload genérico, best-effort rpm sem sub-match) — alimenta UI/log priorities posteriormente.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito.

Tasks 1 e 2 seguiram literalmente os blocos `<action>` do PLAN.md. Acceptance criteria todos atendidos:

- ✅ `export function detectClaudeQuotaExhausted` (1×)
- ✅ `export type ClaudeQuotaType` (1×)
- ✅ `export interface ClaudeQuotaDetection` (1×)
- ✅ `const CLAUDE_TRANSIENT_UPSTREAM_RE` declarado UMA vez (sem duplicata)
- ✅ `pnpm tsc --noEmit` exit 0 no package claude-local
- ✅ 10 it() cases (≥8 exigidos), todos passando
- ✅ Fixtures referenciadas por path relativo (D-16) — não duplicadas

## Problemas Encontrados

- **Tooling:** `pnpm vitest run "src/__tests__/claude-local-adapter*.test.ts"` glob não expandiu no shell Windows — runner reportou "No test files found". Workaround: enumerar arquivos explicitamente. Não afeta o produto.
- **Ruído de árvore de trabalho compartilhada:** Detectado durante verificação `claude-local-execute.test.ts` com 196 linhas uncommitted (presumivelmente plano paralelo 05-05 in-flight) e 11 tests falhando. Diagnosticado e descartado como out-of-scope; documentado em `deferred-items.md` para autor de 05-05 resolver. Confirmado via diff que NÃO foi introduzido por 05-02.

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária.

## Self-Check

**Arquivos criados/modificados:**
- `packages/adapters/claude-local/src/server/parse.ts` — FOUND (466 linhas; classifier nas 385-466)
- `packages/adapters/claude-local/src/server/index.ts` — FOUND (export adicionado linha 10)
- `server/src/__tests__/claude-local-adapter-quota-detection.test.ts` — FOUND (104 linhas)

**Commits:**
- `78f8371` — FOUND em git log (feat 05-02 classifier)
- `65ab864` — FOUND em git log (test 05-02 suite)

**Tests:**
- `pnpm vitest run src/__tests__/claude-local-adapter-quota-detection.test.ts` → 10 passed
- Suítes parse-related (`claude-local-adapter.test.ts`, `claude-local-adapter-environment.test.ts`, quota-detection) → 21/21 passed

## Self-Check: PASSED

## Prontidão para Próxima Fase

- **MULTI-04 (claude-accounts-service `rotateOnQuotaExhausted`)** pode consumir `detectClaudeQuotaExhausted({ stdout, stderr })` para popular `lastQuotaWindowsJson[type]` per-tipo (D-09).
- **MULTI-08 (swap automático)** tem agora discriminator confiável para decidir cooldown distinto (5h vs daily vs weekly).
- **Heartbeat integration (MULTI-07/D-19)** pode chamar classifier após `executeClaudeLocal` errorFamily='transient_upstream' para enriquecer telemetry.
- Sem bloqueios. UAT-04-01 (capturar fixtures reais 429) é paralelo — quando concluído, substitui stubs in-place sem afetar tests.

---
*Fase: 05-multi-account-claude-code-swap-implementacao*
*Concluída: 2026-04-26*
