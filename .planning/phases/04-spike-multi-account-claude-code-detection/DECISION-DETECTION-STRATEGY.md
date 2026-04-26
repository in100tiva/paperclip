# Decisão: Estratégia de Detecção de Exhaustão Claude Code

**Data:** 2026-04-26
**Status:** Decisão registrada (Spike Phase 4 — SPIKE-03)
**Aplica a:** Phase 5 MULTI-04 (`rotateOnQuotaExhausted`), MULTI-06 (`detectClaudeQuotaExhausted`), MULTI-08 (swap automático com continuidade)

## Contexto

ROADMAP success criterion #3 exige decisão documentada e justificada sobre:
1. Detecção pré-emptiva (via header `anthropic-ratelimit-tokens-remaining`) vs reativa (parse de stream-JSON / stderr)
2. Cooldown entre swaps (evitar thrashing)
3. Política de honrar `retry-after`

O paperclip já implementa detecção reativa via `CLAUDE_TRANSIENT_UPSTREAM_RE` (parse.ts:13) e classificação `errorFamily: "transient_upstream"` (execute.ts:631-748). Esta decisão constrange como a Phase 5 estende esse comportamento sem duplicação.

## Decisão

### 1. Detecção Reativa como Primary

**Escolha:** Manter parse de stream-JSON / stderr via regex como caminho principal de detecção.

**Justificativa:**
- Bateria-testada no paperclip — `CLAUDE_TRANSIENT_UPSTREAM_RE` já cobre 4/6 tipos da taxonomia (yes) e 2/6 partial (ver `CLAUDE_429_TAXONOMY.md`).
- Funciona com qualquer transport (stream-JSON, stderr, exit code).
- Não depende de headers HTTP — Claude Code CLI não garante propagação de `anthropic-ratelimit-*` em todas as versões.
- `extractClaudeRetryNotBefore` (execute.ts:640) já produz `retryNotBefore` ISO timestamp utilizável diretamente como `claude_accounts.exhaustedUntil` (Phase 5 MULTI-01).

**Consequência para Phase 5:** classifier `detectClaudeQuotaExhausted` (MULTI-06) REUSA as regex existentes; estende apenas se taxonomia identificar gap empírico (ver fixtures HUMAN-UAT-04-01).

### 2. Detecção Pré-emptiva como Enhancement Opcional

**Escolha:** Pré-emptivo (`anthropic-ratelimit-tokens-remaining < threshold`) é incremento de Phase 5 condicional a:
1. Investigação empírica confirmar que Claude Code CLI propaga estes headers em algum lugar do stream-JSON ou stderr.
2. Throughput justificar o complexity cost (early-warning de ~30s antes do 429 real).

**Justificativa:**
- Vantagem: pode iniciar warm-up de conta backup antes do 429 real, reduzindo latência percebida no swap.
- Risco: token-bucket pode resetar no minuto seguinte (`anthropic-ratelimit-tokens-reset`), levando a swap desnecessário se threshold for muito alto.
- Risco: dependência de headers que podem não ser sempre expostos pelo CLI — degrada para reativo silenciosamente.

**Consequência para Phase 5:** se headers expostos, MULTI-06 adiciona path `source: "header"` retornando `{ type, confidence: 0.5, retryAt: <header-reset> }`; senão, deixar pré-emptivo para v2 (POOL-01 já está em v2).

### 3. Cooldown Entre Swaps

**Escolha:** Cooldown mínimo configurável de **30 segundos** entre rotações da mesma conta, com default em variável de ambiente `CLAUDE_ACCOUNT_COOLDOWN_SECONDS` (Phase 5).

**Justificativa:**
- 30s é tempo suficiente para a conta nova "respirar" e evitar thrashing entre 2 contas que estejam ambas próximas do limite.
- Configurável porque tiers Anthropic distintos podem requerer janelas distintas (RPM transient ~10s; org_tier pode requerer minutos).
- Cooldown se aplica APÓS swap detectado — não bloqueia primeira detecção, apenas evita ping-pong.

**Consequência para Phase 5:** `selectActiveAccount` (MULTI-04) deve filtrar contas com `lastRotatedAt > now - cooldown`. `agent_account_bindings.lastRotatedAt` (MULTI-02) é o campo de cooldown gating.

### 4. Honrar `retry-after`

**Escolha:** **Sim**. `retryAt` extraído por `CLAUDE_EXTRA_USAGE_RESET_RE` (parse.ts:14) ou pelo header `retry-after` (quando presente) define `claude_accounts.exhaustedUntil`.

**Justificativa:**
- Reativar conta antes do reset real causa imediato 429 de novo — desperdiça swap.
- Anthropic já fornece o timestamp; ignorar é decisão ativa contra evidência.
- `extractClaudeRetryNotBefore` (execute.ts:640) já produz ISO timestamp utilizável.

**Consequência para Phase 5:**
- `selectActiveAccount` (MULTI-04) DEVE filtrar contas com `exhaustedUntil > now`.
- `claude_accounts.exhaustedUntil` (MULTI-01) é o campo de gating temporal.
- Schema do `lastQuotaWindowsJson` (MULTI-01) deve refletir tipos da taxonomia (rpm/tpm/daily/weekly/5h/org) em vez de campo opaco.

## Trade-offs e Armadilhas

| Cenário | Risco | Mitigação |
|---------|-------|-----------|
| Pré-emptivo dispara swap, token-bucket reseta segundos depois | Swap desnecessário; conta original ficaria utilizável | Threshold conservador (>=10% restante) e/ou só ativar pré-emptivo se latência do agente justifica |
| `retry-after` ausente em alguns tipos (org_tier) | `exhaustedUntil` nulo, conta volta ao pool prematuramente | Default fallback de 5min para `org_tier` quando `retryAt` é null |
| Cooldown muito alto saturação do pool em rajadas | Sem contas elegíveis | Cooldown só aplica após swap real; primeira detecção sempre passa |
| Regex muda entre versões do CLI | Falsa-negativa silenciosa | Phase 5 captura `errorCode === "claude_transient_upstream"` (já existe) E adiciona logging de stderr/stream para auditoria |
| Headers `anthropic-ratelimit-*` não expostos pelo CLI | Pré-emptivo não funciona | Fallback transparente para reativo; documentado como expected |

## Resumo Executivo

| Aspecto | Decisão |
|---------|---------|
| Primary detection | Reativo (parse stream/stderr via `CLAUDE_TRANSIENT_UPSTREAM_RE`) |
| Pré-emptivo | Opcional, condicional a headers expostos pelo CLI |
| Cooldown default | 30s (configurável via `CLAUDE_ACCOUNT_COOLDOWN_SECONDS`) |
| `retry-after` | Honrado — define `exhaustedUntil` na tabela `claude_accounts` |
| Reuso de código | `CLAUDE_TRANSIENT_UPSTREAM_RE`, `CLAUDE_EXTRA_USAGE_RESET_RE`, `extractClaudeRetryNotBefore` (parse.ts/execute.ts) |
| Spike modifica produção? | **Não** — esta decisão é input para Phase 5 |

## Próximos Passos (Phase 5)

1. MULTI-06: `detectClaudeQuotaExhausted` reusa regex existente; estende apenas com sub-tipo discriminator se gap identificado.
2. MULTI-04: `selectActiveAccount` filtra por `exhaustedUntil > now` E `lastRotatedAt > now - cooldown`.
3. MULTI-01: schema `claude_accounts.lastQuotaWindowsJson` modela tipos da taxonomia explicitamente.
4. MULTI-08: swap drena → checkpoint → swap → resume usa `retryAt` como timestamp de re-elegibilidade.

## Referências

- `CLAUDE_429_TAXONOMY.md` (este diretório) — taxonomia 6-tipos com cobertura por regex
- `packages/adapters/claude-local/src/server/parse.ts:12-15` — regex existente
- `packages/adapters/claude-local/src/server/execute.ts:631-748` — classificação atual
- `.planning/REQUIREMENTS.md` MULTI-01, MULTI-04, MULTI-06, MULTI-08
- `.planning/ROADMAP.md` §"Phase 4" success criterion #3
