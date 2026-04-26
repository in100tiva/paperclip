---
phase: 04-spike-multi-account-claude-code-detection
plan: 02
subsystem: spike-multi-account
tags: [claude-code, rate-limit, 429, detection-strategy, cooldown, retry-after, architectural-decision]

requires:
  - phase: 02-supabase
    provides: claude-local adapter inalterado (parse.ts/execute.ts já implementam classifier reativo)
provides:
  - Decisão arquitetural registrada e justificada sobre estratégia de detecção 429 Claude Code
  - Política explícita de cooldown entre swaps (30s, configurável)
  - Política explícita de honra a retry-after (define exhaustedUntil)
  - Mapeamento direto para Phase 5 (MULTI-04, MULTI-06, MULTI-08)
affects: [05-multi-account-claude-code, MULTI-04, MULTI-06, MULTI-08, MULTI-01]

tech-stack:
  added: []
  patterns:
    - "Detecção reativa primary, pré-emptiva como enhancement opcional condicional a headers expostos pelo CLI"
    - "Cooldown de 30s configurável via CLAUDE_ACCOUNT_COOLDOWN_SECONDS — gate em agent_account_bindings.lastRotatedAt"
    - "retry-after extraído via extractClaudeRetryNotBefore → claude_accounts.exhaustedUntil"

key-files:
  created:
    - .planning/phases/04-spike-multi-account-claude-code-detection/DECISION-DETECTION-STRATEGY.md
  modified: []

key-decisions:
  - "Detecção reativa (parse stream-JSON/stderr via CLAUDE_TRANSIENT_UPSTREAM_RE) é o caminho primário — battle-tested no paperclip, funciona com qualquer transport, não depende de headers HTTP"
  - "Detecção pré-emptiva (anthropic-ratelimit-tokens-remaining) fica como enhancement opcional Phase 5, condicional a investigação empírica confirmar que Claude Code CLI propaga esses headers"
  - "Cooldown default 30s entre rotações da mesma conta, configurável via CLAUDE_ACCOUNT_COOLDOWN_SECONDS — evita thrashing sem bloquear primeira detecção"
  - "retry-after é honrado: timestamp extraído por CLAUDE_EXTRA_USAGE_RESET_RE define claude_accounts.exhaustedUntil; ignorar é decisão ativa contra evidência da Anthropic"
  - "Spike NÃO modifica produção (claude-local adapter intocado); decisão é input para Phase 5"

patterns-established:
  - "Reuso máximo de classifier reativo existente: MULTI-06 (detectClaudeQuotaExhausted) reusa CLAUDE_TRANSIENT_UPSTREAM_RE / CLAUDE_EXTRA_USAGE_RESET_RE / extractClaudeRetryNotBefore em vez de duplicar"
  - "Schema claude_accounts.lastQuotaWindowsJson modela tipos da taxonomia (rpm/tpm/daily/weekly/5h/org) explicitamente em vez de campo opaco"
  - "selectActiveAccount filtra por exhaustedUntil > now AND lastRotatedAt > now - cooldown"

requirements-completed: [SPIKE-03]

duration: 1min
completed: 2026-04-26
---

# Phase 4 Plan 02: Estratégia de Detecção Claude Code — Summary

**Decisão arquitetural registrada: detecção reativa via CLAUDE_TRANSIENT_UPSTREAM_RE como primary, pré-emptiva via headers como enhancement opcional, cooldown 30s configurável, e retry-after honrado como gate de exhaustedUntil — mapeamento direto para Phase 5 MULTI-04/06/08.**

## Performance

- **Duração:** 1 min
- **Iniciado:** 2026-04-26T05:15:39Z
- **Concluído:** 2026-04-26T05:16:54Z
- **Tarefas:** 1/1
- **Arquivos modificados:** 1 (criado)

## Realizações

- DECISION-DETECTION-STRATEGY.md (102 linhas, pt-br) registra 4 sub-decisões com justificativa: (1) reativa primary, (2) pré-emptiva opt, (3) cooldown 30s, (4) retry-after honrado
- Tabela de trade-offs cobre 5 cenários de risco com mitigações (token-bucket reset prematuro, retry-after ausente em org_tier, saturação de pool por cooldown alto, mudança de regex entre versões CLI, headers não expostos)
- Mapeamento explícito para Phase 5: cada sub-decisão tem "Consequência para Phase 5" identificando qual requirement consome (MULTI-04, MULTI-06, MULTI-08, MULTI-01)
- Reuso de código documentado: `CLAUDE_TRANSIENT_UPSTREAM_RE`, `CLAUDE_EXTRA_USAGE_RESET_RE`, `extractClaudeRetryNotBefore` (parse.ts:12-15, execute.ts:631-748)
- ROADMAP success criterion #3 ("decisão registrada com justificativa") satisfeito via SPIKE-03

## Commits das Tarefas

1. **Tarefa 1: Criar DECISION-DETECTION-STRATEGY.md** — `e80ade7` (docs)

_Nota: Plan-level metadata commit ocorre via tooling do orquestrador._

## Arquivos Criados/Modificados

- `.planning/phases/04-spike-multi-account-claude-code-detection/DECISION-DETECTION-STRATEGY.md` — Decisão arquitetural sobre detecção 429 Claude Code, cooldown e retry-after; input direto para Phase 5

## Decisões Tomadas

Cinco decisões registradas no frontmatter (resumo aqui):

1. **Reativa como primary** — battle-tested no paperclip (`CLAUDE_TRANSIENT_UPSTREAM_RE` cobre 4/6 tipos da taxonomia), funciona com qualquer transport, não depende de headers que o CLI pode não propagar.
2. **Pré-emptiva como opt-in** — vantagem de early-warning ~30s só vale se headers `anthropic-ratelimit-*` forem investigados empiricamente; sem confirmação, fica para v2 (POOL-01).
3. **Cooldown 30s configurável** — janela suficiente para "respiro" entre 2 contas próximas do limite; configurável via env porque tiers Anthropic distintos requerem janelas distintas; cooldown só aplica APÓS swap real, primeira detecção sempre passa.
4. **retry-after honrado** — Anthropic já fornece o timestamp; reativar antes do reset desperdiça swap; `extractClaudeRetryNotBefore` (execute.ts:640) já produz ISO timestamp utilizável.
5. **Spike não toca produção** — esta decisão é artefato puro de planejamento; modificações vão para Phase 5.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. Conteúdo do artefato veio integralmente do bloco `<action>` da Tarefa 1; verificação automatizada (6 padrões grep) passou no primeiro try.

## Problemas Encontrados

Nenhum.

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária (artefato documental puro).

## Prontidão para Próxima Fase

- **Phase 4 outras waves:** Plano 04-01 (CLAUDE_429_TAXONOMY.md) executando em paralelo; planos 04-03/04/05 dependem do contexto desta decisão.
- **Phase 5:** quando for planejada, MULTI-04, MULTI-06, MULTI-08 e MULTI-01 podem consumir esta decisão como input direto. Schemas e código de production reusam `CLAUDE_TRANSIENT_UPSTREAM_RE`, `CLAUDE_EXTRA_USAGE_RESET_RE`, `extractClaudeRetryNotBefore` em vez de duplicar.
- **Sem bloqueios.** Spike permanece read-only sobre `packages/adapters/claude-local/src/server/`.

## Self-Check: PASSED

- [x] DECISION-DETECTION-STRATEGY.md existe em `.planning/phases/04-spike-multi-account-claude-code-detection/` (FILE: OK)
- [x] Commit `e80ade7` presente em `git log`
- [x] Documento marca reativo como primary (5 ocorrências)
- [x] Documento cita pré-emptivo como enhancement opcional (7 ocorrências)
- [x] Cooldown 30s mencionado (6 ocorrências)
- [x] retry-after política documentada (5 ocorrências)
- [x] Cita CLAUDE_TRANSIENT_UPSTREAM_RE (4 ocorrências)
- [x] Tabela de trade-offs presente (5 cenários)
- [x] Documento em pt-br
- [x] Production code (claude-local/src/server) intocado — verificável via `git diff master~1..master -- packages/adapters/claude-local/src/server/`

---
*Fase: 04-spike-multi-account-claude-code-detection*
*Concluída: 2026-04-26*
