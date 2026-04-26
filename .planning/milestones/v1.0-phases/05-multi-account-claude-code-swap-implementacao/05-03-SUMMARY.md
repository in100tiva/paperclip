---
phase: 05-multi-account-claude-code-swap-implementacao
plan: 03
subsystem: documentation+types
tags: [activity-log, env-config, design-doc, multi-account]
requires: []
provides:
  - "CLAUDE_ACCOUNT_COOLDOWN_SECONDS env var documented (.env.example) — consumido por 05-05 (cooldown lookup) e MULTI-04 selectActiveAccount filtering"
  - "ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED const + ClaudeAccountRotatedDetails type (activity-log.ts) — consumido por 05-04 (claudeAccountsService.rotateOnQuotaExhausted emite activity)"
  - "claude-accounts-swap.md design doc (server/src/services/) — consumido por 05-06 (swap orchestration)"
affects:
  - .env.example
  - server/src/services/activity-log.ts
  - server/src/services/claude-accounts-swap.md
tech_stack:
  added: []
  patterns:
    - "Action type pattern: const string + payload interface; logActivity() signature unchanged"
    - "Internal design docs in English collocated com TS code (vs pt-br em .planning/)"
key_files:
  created:
    - server/src/services/claude-accounts-swap.md
  modified:
    - .env.example
    - server/src/services/activity-log.ts
decisions:
  - "Doc claude-accounts-swap.md em inglês (não pt-br): convive com código TS em server/src/services/; segue convenção paperclip de docs internas adjacentes ao código. Artefatos em .planning/ permanecem pt-br."
  - "ACTIVITY_ACTION_TO_PLUGIN_EVENT map intencionalmente NÃO atualizado: claude_account_rotated é evento interno (operator audit via UI), não plugin-facing v1. Pode ser exposto via plugin event posteriormente sem breaking change."
  - "logActivity() signature mantida intacta (action: string aberto): consumidores importam constante + tipo, passam string. Pattern consistente com como outros services do paperclip lidam com seus próprios action types."
metrics:
  duration: "~3min 20s"
  completed: "2026-04-26"
  tasks_completed: 3
  files_created: 1
  files_modified: 2
  commits: 3
---

# Phase 5 Plan 03: Multi-Account Foundation (Env + Types + Design Doc) Summary

Three foundational artifacts ready for downstream plans 05-04 (service emit), 05-05 (cooldown consumed), 05-06 (swap orchestration): env var documented com default 30s, type registration completo do payload `claude_account_rotated` (D-30), e design doc detalhando Strategy A (resume) + Strategy B (Plan B fallback).

## Tasks Completed

| #   | Task                                              | Commit  | Files                                                |
| --- | ------------------------------------------------- | ------- | ---------------------------------------------------- |
| 1   | Add CLAUDE_ACCOUNT_COOLDOWN_SECONDS to .env.example | 273290d | `.env.example`                                       |
| 2   | Register claude_account_rotated event type        | 58a6178 | `server/src/services/activity-log.ts`                |
| 3   | Create claude-accounts-swap.md design doc         | 13cc9fb | `server/src/services/claude-accounts-swap.md`        |

## What Was Built

### Task 1: `.env.example` — Cooldown env var (D-10)

Appended new section "Multi-Account Claude Code Configuration (Phase 5 — MULTI-04)" antes da seção Logs:

```bash
# Cooldown em segundos entre rotações da mesma conta para evitar thrashing.
# Aplicado APÓS swap real — não bloqueia primeira detecção, apenas evita ping-pong
# entre 2 contas próximas do limite. Configurável por tier Anthropic distinto.
# Default: 30 (equilíbrio entre responsividade e estabilidade conforme
# DECISION-DETECTION-STRATEGY.md do spike Phase 4).
CLAUDE_ACCOUNT_COOLDOWN_SECONDS=30
```

Baseline preservado: `DATABASE_URL` (4 ocorrências), `PAPERCLIP_INSTANCE_ID` (1), `BETTER_AUTH_SECRET`, etc — todos intactos.

### Task 2: `activity-log.ts` — Type registration (D-30)

Adicionado bloco antes de `PLUGIN_EVENT_SET`:

- JSDoc completo com schema do payload e referência à origem (`claudeAccountsService.rotateOnQuotaExhausted`)
- `export const ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED = "claude_account_rotated" as const;`
- `export interface ClaudeAccountRotatedDetails` — 7 campos: agentId, fromAccountId, toAccountId, reason ('exhausted' | 'manual' | 'cooldown_expired'), errorFamily (string | null), retryNotBefore (string ISO | null), swapStrategy ('resume' | 'fallback_full_context' | null)

**Não modificado:**
- `logActivity()` function (linha 65+): assinatura mantém `action: string` aberto. Consumidores importarão a constante e passarão a string.
- `ACTIVITY_ACTION_TO_PLUGIN_EVENT` map: `claude_account_rotated` é evento interno (não plugin-facing v1). Decisão consciente para evitar leak prematuro de detalhes operacionais via plugin SDK.

TypeScript compila clean (`pnpm tsc --noEmit` exit 0).

### Task 3: `claude-accounts-swap.md` — Design doc (D-23)

87 linhas em inglês cobrindo:

- **Problem** — quota exhaustion mid-step e por que rotação é necessária
- **Strategy Overview** — 5-step pipeline (detect → drain → capture summary → rotate binding → resume)
- **Strategy A: Cross-Account Resume** (primary, optimistic) — `--resume <session_id>` com critérios de detecção de falha (session not found, exit antes de system:init, ~5s timeout)
- **Strategy B: Full-Context Re-Prompt** (fallback, Plan B) — embed `issue_continuation_summary` no prompt inicial; trade-off de tokens duplicados vs continuidade preservada
- **Activity Log Entry** — mapping de `swapStrategy` field para auditoria operator (resume vs fallback_full_context vs null)
- **Guard: One Rotation Per Step** (D-19) — anti-thrash: máximo 1 swap automático por step; cascading failure escalada para activity log
- **Refinement Path** — condicional a UAT-04-03; se Strategy A funcionar consistentemente, document; se falhar sempre, considerar remover a tentativa para economizar ~5s

## Deviations from Plan

None — plan executed exactly as written. 3 tarefas, 3 commits, todos critérios de aceitação verificados.

## Decision Notes

**Inglês para `claude-accounts-swap.md`:** convenção do paperclip é inglês para código + docs adjacentes. Apenas artefatos `.planning/` (planning humano + Claude conversando em pt-br) usam pt-br. Doc convive em `server/src/services/` ao lado de outros TS docs/comentários — manter inglês evita context-switching para devs lendo o código fonte.

**Reference linking strategy:** todos os paths em links são relativos ao repo root (`.planning/...`, `server/src/services/...`, `packages/adapters/claude-local/...`) para grep-ability. Padrão consistente com FINDINGS-FOR-PHASE-5.md e outros docs de planning.

**`logActivity()` signature intacta:** confirmado durante o trabalho. Função aceita `action: string` (linha 57), sem enum/literal type constraint. Consumers do paperclip já passam strings literais inline ou de constantes locais. Nosso pattern segue: exportar `ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED` const + `ClaudeAccountRotatedDetails` type, e o caller (futuro `claudeAccountsService.rotateOnQuotaExhausted` em 05-04) faz `logActivity(db, { action: ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED, ... details: details satisfies ClaudeAccountRotatedDetails })`.

## Verification

| Critério | Status |
| -------- | ------ |
| `.env.example` tem `CLAUDE_ACCOUNT_COOLDOWN_SECONDS=30` | ✅ 1 ocorrência |
| Comentário documenta uso da var | ✅ 5 linhas de comentário acima |
| Vars existentes preservadas | ✅ DATABASE_URL=4, PAPERCLIP_INSTANCE_ID=1 baseline mantido |
| `activity-log.ts` exporta `ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED` | ✅ |
| `activity-log.ts` exporta `ClaudeAccountRotatedDetails` | ✅ |
| Payload schema casa swapStrategy/reason completo | ✅ |
| TypeScript compila (`pnpm tsc --noEmit`) | ✅ exit 0 |
| `claude-accounts-swap.md` existe | ✅ |
| Strategy A documentada | ✅ 10 referências |
| Strategy B / Plan B documentadas | ✅ 6 referências |
| swapStrategy mencionado | ✅ 4 referências |
| Decisão refs (MULTI-08/D-19/D-21/D-22) | ✅ 6 referências |
| ≥60 linhas | ✅ 87 linhas |

## Self-Check: PASSED

Todos os 3 arquivos verificados existentes em disco:

- `D:\projetos\ddd\.env.example` — modified ✅
- `D:\projetos\ddd\server\src\services\activity-log.ts` — modified ✅
- `D:\projetos\ddd\server\src\services\claude-accounts-swap.md` — created ✅

Todos os 3 commits verificados em git history:
- `273290d` ✅ feat(05-03): document CLAUDE_ACCOUNT_COOLDOWN_SECONDS env var
- `58a6178` ✅ feat(05-03): register claude_account_rotated event type (MULTI-10)
- `13cc9fb` ✅ docs(05-03): add claude-accounts-swap design doc (D-23)

## Downstream Consumers

| Plan  | Consumes                                            | Via                                                    |
| ----- | --------------------------------------------------- | ------------------------------------------------------ |
| 05-04 | `ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED` + `ClaudeAccountRotatedDetails` | Import em `claudeAccountsService.rotateOnQuotaExhausted` |
| 05-05 | `CLAUDE_ACCOUNT_COOLDOWN_SECONDS`                   | `process.env.CLAUDE_ACCOUNT_COOLDOWN_SECONDS` em `selectActiveAccount` |
| 05-06 | `claude-accounts-swap.md` Strategy A/B docs         | Lido pelo planejador/executor de orquestração de swap  |

## Requirements Satisfied

- ✅ **MULTI-10** (parcial): tipo de evento + payload schema registrado. Emissão real (chamada a `logActivity`) virá em 05-04 quando o serviço for implementado.
