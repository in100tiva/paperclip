# Findings for Phase 5

**Origem:** Spike Phase 4 (`04-spike-multi-account-claude-code-detection/`)
**Data:** 2026-04-26
**Cobre:** ROADMAP success criterion #5 ("Spike termina com lista explícita de achados que afetam o schema/UI da Phase 5")
**Audiência:** planejador da Phase 5 (`/planejar-fase 5`) e implementador downstream

## Resumo Executivo

Spike confirmou que a fundação técnica para multi-account Claude Code já existe substancialmente no paperclip. **Phase 5 é primariamente integração + schema + UI, não detection-from-scratch.** Achados abaixo redirecionam a Phase 5 de "construir classifier" para "reusar regex existente + adicionar discriminator + integrar swap mechanic".

## Achados que afetam Phase 5

### Finding 1: Classifier de Phase 5 (MULTI-06) DEVE reusar regex existente

**Evidência:**
- `packages/adapters/claude-local/src/server/parse.ts:13` já tem `CLAUDE_TRANSIENT_UPSTREAM_RE` cobrindo: `rate_limit_error`, `429`, `overloaded`, `503`, `529`, `5-hour limit reached`, `weekly limit reached`, `usage limit reached`, `out of extra usage`.
- `parse.ts:14` tem `CLAUDE_EXTRA_USAGE_RESET_RE` extraindo timestamp de "resets at X".
- Taxonomy (`CLAUDE_429_TAXONOMY.md`) confirma cobertura **yes** para 4/6 tipos.

**Implicação:**
- MULTI-06 ("patch parse.ts adiciona `detectClaudeQuotaExhausted`") torna-se **estender** as regex existentes com discriminator de sub-tipo, NÃO reescrever do zero.
- Protótipo (`prototype/detect-quota-exhausted.ts`) demonstra a arquitetura: regex top-level (cobertura ampla) + sub-tipo discriminators (rpm/tpm/daily/weekly/5h/org).

**Ação Phase 5:**
- Estender `parseClaudeStreamJson` ou criar função adjacente em `parse.ts` que retorna `{ type: QuotaType, retryAt: Date | null }` baseado em `CLAUDE_TRANSIENT_UPSTREAM_RE` + sub-discriminators.
- Reusar `extractClaudeRetryNotBefore` (já existe em `execute.ts`).

---

### Finding 2: `CLAUDE_CONFIG_DIR` passthrough JÁ EXISTE — MULTI-05 reduz a verificação

**Evidência:**
- `packages/adapters/claude-local/src/server/execute.ts:253`:
  ```typescript
  includeRuntimeKeys: ["HOME", "CLAUDE_CONFIG_DIR"],
  ```
- Variável é propagada para `runtimeEnv` antes do spawn do `claude` CLI.

**Implicação:**
- Multi-account via `CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/{slug}` é tecnicamente **trivial** — basta o caller passar `config.claudeConfigDir` e ele já chega no spawn.
- MULTI-05 ("patch claude-local/src/server/execute.ts aceita `config.claudeConfigDir`") torna-se **verificar se o config schema do adapter aceita esse campo** e rotear para a env var. Não é patch novo — é wiring do `selectActiveAccount` (MULTI-04) ao caller existente.

**Ação Phase 5:**
- Auditar shape de `config` consumido por `executeClaudeLocal` — se já aceita `claudeConfigDir`, MULTI-05 é confirmação. Se não, adicionar campo opcional e setar `env.CLAUDE_CONFIG_DIR = config.claudeConfigDir` antes do spawn.

---

### Finding 3: Schema `claude_accounts.lastQuotaWindowsJson` deve refletir taxonomy explicitamente

**Evidência:**
- Taxonomy define 6 tipos: `rpm_transient`, `tpm_transient`, `daily_quota`, `weekly_quota`, `session_5h`, `org_tier`.
- `DECISION-DETECTION-STRATEGY.md` define `exhaustedUntil` como `retryAt` extraído do reset regex.

**Implicação:**
- `lastQuotaWindowsJson` (MULTI-01) deve modelar **um campo por tipo** com `{ exhaustedUntil: ISO, lastTriggeredAt: ISO, count: number }`, em vez de blob opaco.
- Permite UI (MULTI-09) mostrar reset windows distintos por tipo (5h, daily, weekly) para o operador.

**Ação Phase 5:**
- Schema sugerido:
  ```sql
  lastQuotaWindowsJson jsonb default '{}'::jsonb
  -- Estrutura:
  -- {
  --   "rpm_transient": { "exhaustedUntil": "...", "lastTriggeredAt": "...", "count": 0 },
  --   "tpm_transient": { ... },
  --   "daily_quota": { ... },
  --   "weekly_quota": { ... },
  --   "session_5h": { ... },
  --   "org_tier": { ... }
  -- }
  ```
- `claude_accounts.exhaustedUntil` (top-level) é o MAX dos 6 windows — campo derivado/cached para query rápida em `selectActiveAccount`.

---

### Finding 4: Partial coverage gaps em `org_tier` e `tpm_transient`

**Evidência:**
- Taxonomy classifica como `partial`: `org_tier` (regex casa `overloaded_error`/`503`/`529` mas sem token específico de "organization tier") e `tpm_transient` (não distingue tokens-vs-requests).

**Implicação:**
- Classifier de Phase 5 pode classificar `tpm_transient` como `rpm_transient` (e vice-versa). Para política de cooldown isso é OK (ambos transientes); para attribuir uso é menos preciso.
- Para `org_tier`, sem mensagem específica, pode-se confundir com `rpm_transient` em casos de overload genérico.

**Ação Phase 5:**
- Aceitar partial coverage no v1: classifier retorna sub-tipo "best effort" + `confidence` < 1.
- Logar todos os matches `errorFamily: "transient_upstream"` com payload original (já implícito em `resultJson` de execute.ts:662) para refinamento empírico ao longo do tempo.
- HUMAN-UAT-04-01 pode capturar mensagem real de `org_tier` se acontecer — atualizar regex e taxonomy.

---

### Finding 5: Cooldown e retry-after já têm primitiva no código existente

**Evidência:**
- `execute.ts:640` chama `extractClaudeRetryNotBefore` produzindo ISO timestamp.
- `execute.ts:660` retorna `retryNotBefore` no result.
- `errorFamily: "transient_upstream"` (linha 659) é propagado.

**Implicação:**
- MULTI-04 (`selectActiveAccount`) consume `retryNotBefore` diretamente — sem trabalho adicional para extração.
- Cooldown 30s entre swaps (decisão DECISION-DETECTION-STRATEGY) é responsabilidade de **Phase 5 service** (não do adapter); `agent_account_bindings.lastRotatedAt` (MULTI-02) é onde fica.

**Ação Phase 5:**
- `selectActiveAccount` filtra por `claude_accounts.exhaustedUntil > now` AND `agent_account_bindings.lastRotatedAt > now - cooldownSeconds`.
- `cooldownSeconds` configurável via env var `CLAUDE_ACCOUNT_COOLDOWN_SECONDS` (default 30).

---

### Finding 6: Mecânica de retomada via `issue_continuation_summary` é HUMAN-UAT — não validada autonomamente

**Evidência:**
- D-15: SPIKE-04/05 exigem 2 contas reais; executor Claude não tem credenciais.
- UAT-04-03 documenta passos exatos com harness.

**Implicação:**
- Phase 5 MULTI-08 (swap automático com `issue_continuation_summary`) **não pode iniciar implementação até UAT-04-03 retornar**.
- Se UAT-04-03 falhar (conta B não continua coerente), MULTI-08 precisa estratégia alternativa (ex: re-iniciar prompt completo na conta nova com summary; aceitar perda de session_id).

**Ação Phase 5:**
- **Bloqueio:** `/planejar-fase 5` deve verificar status de `04-HUMAN-UAT.md#uat-04-03` antes de planejar MULTI-08.
- Se ainda pending, MULTI-08 entra como tarefa com `type: checkpoint:human-action` aguardando UAT.
- Estratégia plan B documentada: se `--resume <id>` cross-account falha (esperado de Finding 7) e summary-prompt falha, fallback é re-iniciar agente com prompt full-context na conta nova (custo: tokens duplicados; ganho: continuidade preservada).

---

### Finding 7: session_id é per-account (assumido true; UAT-04-02 confirma)

**Evidência:**
- Estrutura de `~/.paperclip/claude-accounts/<slug>/` isola storage por conta — sessions referenciadas por id em conta B não existem em A.
- UAT-04-02 valida empiricamente.

**Implicação:**
- `--resume <session_id>` cross-account **não funciona**. Phase 5 MULTI-08 não pode "continuar mesma sessão" — precisa **nova sessão na conta nova com summary embutido**.
- Schema `agent_step_executions.account_id` (MULTI-03) confirma decisão arquitetural: cada step append-only com `account_id` do momento — natural para attribution mas confirma que sessions são quebradas em swap.

**Ação Phase 5:**
- MULTI-08 nunca tenta `--resume <id>` cross-account. Strategy: drena step -> captura summary -> spawn new session em conta B com summary como prompt.
- UI (MULTI-09) mostra "session swapped at <timestamp>; continuation summary: <preview>" no histórico de rotações.

---

### Finding 8: Vitest standalone funciona para protótipo

**Evidência:**
- Protótipo (`prototype/detect-quota-exhausted.test.ts`) roda via `npx vitest run <path>`.
- Não exige integração ao test runner principal (paperclip tem 12 workspace projects no root vitest.config.ts).

**Implicação:**
- Phase 5 pode adicionar tests do classifier de produção em `server/src/__tests__/` (mesmo diretório dos tests do adapter existente — ver `server/src/__tests__/claude-local-adapter*.test.ts`).
- Nenhum trabalho de tooling necessário.

**Ação Phase 5:**
- Tests do classifier MULTI-06 ficam em `server/src/__tests__/claude-local-adapter-quota-detection.test.ts` (ou similar), reusando padrões de mock dos tests existentes.

---

## Riscos / Itens em aberto (dependem de HUMAN-UAT)

| Risco | UAT bloqueante | Plano B se UAT falha |
|-------|----------------|----------------------|
| `session_id` é compartilhado entre contas (improvável) | UAT-04-02 | Schema `claude_accounts` ganha `globalSessionPolicy`; MULTI-08 simplifica |
| `--resume <id>` cross-account funciona (improvável) | UAT-04-02 | MULTI-08 pode usar resume direto; menos overhead |
| Continuation summary não preserva contexto suficiente | UAT-04-03 | MULTI-08 fallback: re-prompt full context na conta nova (custo: tokens; ganho: correção) |
| Anthropic emite mensagem `org_tier` distinta não coberta | UAT-04-01 | Atualizar regex em parse.ts e taxonomy; classifier ganha sub-token específico |

## Mapeamento Findings -> MULTI-* requirements

| Finding | Afeta | Como |
|---------|-------|------|
| 1 (regex reuse) | MULTI-06 | Estender, não reescrever |
| 2 (CLAUDE_CONFIG_DIR existe) | MULTI-05 | Verificar wiring, não patchar do zero |
| 3 (lastQuotaWindowsJson schema) | MULTI-01 | Schema explícito por tipo |
| 4 (partial coverage) | MULTI-06 | Aceitar best-effort + log |
| 5 (cooldown/retry-after primitives) | MULTI-04 | Reusar `retryNotBefore` |
| 6 (swap requires UAT) | MULTI-08 | Bloqueio até UAT-04-03 |
| 7 (session per-account) | MULTI-08 | Strategy: new session + summary |
| 8 (vitest standalone) | MULTI-06 tests | Sem trabalho de tooling |

## Referências

- `CLAUDE_429_TAXONOMY.md` (este diretório) — fonte de Findings 1, 3, 4
- `DECISION-DETECTION-STRATEGY.md` (este diretório) — fonte de Finding 5
- `prototype/README.md` (este diretório) — implementação de Finding 1
- `harness/README.md` (este diretório) — entrada para Findings 6, 7
- `04-HUMAN-UAT.md` (este diretório) — UATs que destravam Findings 6, 7
- `packages/adapters/claude-local/src/server/parse.ts` — Findings 1, 4
- `packages/adapters/claude-local/src/server/execute.ts` — Findings 2, 5
- `.planning/REQUIREMENTS.md` MULTI-01..11
- `.planning/ROADMAP.md` Phase 5
