# Taxonomia 429 — Claude Code CLI

**Data de coleta:** 2026-04-26
**Status:** Spike Phase 4 — análise de cobertura contra `parse.ts` existente
**Plano:** 04-01 (SPIKE-01)
**Linguagem:** pt-br (artefato interno de pesquisa, conforme D-08)

> **Nota de escopo:** Audit target (`packages/adapters/claude-local/src/server/parse.ts`, `execute.ts`) é READ-ONLY durante esta fase. Qualquer mudança real cabe à Phase 5 (MULTI-06). Este documento mapeia gaps; não os corrige.

---

## Fontes consultadas

- `packages/adapters/claude-local/src/server/parse.ts:12-15` — regex literal de detecção atual (`CLAUDE_TRANSIENT_UPSTREAM_RE`, `CLAUDE_EXTRA_USAGE_RESET_RE`).
- `https://docs.anthropic.com/en/api/rate-limits` — limites oficiais Anthropic, headers `anthropic-ratelimit-*`, comportamento de 429 por tier.
- `https://docs.anthropic.com/en/api/errors` — taxonomia oficial de erros (`rate_limit_error`, `overloaded_error`).
- Mensagens canônicas observadas no regex existente do paperclip (fonte secundária — strings que paperclip já encontrou em campo).
- ROADMAP §"Phase 4" success criterion #1 (lista os 6 tipos exigidos).

**Pendente — substituirá observações de docs:** `04-HUMAN-UAT.md#uat-04-01` (captura de fixtures reais quando o usuário rodar agente até atingir cada limit em conta de teste).

---

## Regex existentes (citação literal de `parse.ts:12-15`)

```typescript
const CLAUDE_TRANSIENT_UPSTREAM_RE =
  /(?:rate[-\s]?limit(?:ed)?|rate_limit_error|too\s+many\s+requests|\b429\b|overloaded(?:_error)?|server\s+overloaded|service\s+unavailable|\b503\b|\b529\b|high\s+demand|try\s+again\s+later|temporarily\s+unavailable|throttl(?:ed|ing)|throttlingexception|servicequotaexceededexception|out\s+of\s+extra\s+usage|extra\s+usage\b|claude\s+usage\s+limit\s+reached|5[-\s]?hour\s+limit\s+reached|weekly\s+limit\s+reached|usage\s+limit\s+reached|usage\s+cap\s+reached)/i;
const CLAUDE_EXTRA_USAGE_RESET_RE =
  /(?:out\s+of\s+extra\s+usage|extra\s+usage|usage\s+limit\s+reached|usage\s+cap\s+reached|5[-\s]?hour\s+limit\s+reached|weekly\s+limit\s+reached|claude\s+usage\s+limit\s+reached)[\s\S]{0,80}?\bresets?\s+(?:at\s+)?([^\n()]+?)(?:\s*\(([^)]+)\))?(?:[.!]|\n|$)/i;
```

**Tokens chave para análise:**
- Rate-limit genérico: `rate[-\s]?limit(?:ed)?`, `rate_limit_error`, `too\s+many\s+requests`, `\b429\b`
- Overload upstream: `overloaded(?:_error)?`, `server\s+overloaded`, `service\s+unavailable`, `\b503\b`, `\b529\b`
- Throttling AWS-style: `throttl(?:ed|ing)`, `throttlingexception`, `servicequotaexceededexception`
- Quota Claude-specific: `out\s+of\s+extra\s+usage`, `extra\s+usage\b`, `claude\s+usage\s+limit\s+reached`, `5[-\s]?hour\s+limit\s+reached`, `weekly\s+limit\s+reached`, `usage\s+limit\s+reached`, `usage\s+cap\s+reached`
- Genérico transient: `high\s+demand`, `try\s+again\s+later`, `temporarily\s+unavailable`
- Reset extraction: `resets?\s+(?:at\s+)?([^\n()]+?)` + opcional grupo `([^)]+)` para timezone

`CLAUDE_EXTRA_USAGE_RESET_RE` é usado por `extractClaudeRetryNotBefore` (parse.ts:347) para popular `transientRetryNotBefore` em `execute.ts`, que então alimenta `retryAt` propagado ao orchestrator.

---

## Tabela de Tipos 429

| Tipo | Trigger Canônico | Mensagem Canônica (exemplo) | Headers HTTP relevantes | Comportamento esperado | Cobertura existente | Regex que cobre |
|------|------------------|------------------------------|-------------------------|------------------------|---------------------|-----------------|
| **rpm_transient** | Limite de requests/minuto excedido (token-bucket de RPM zerou) | `rate_limit_error` / "too many requests" / HTTP 429 com `retry-after` curto (segundos) | `anthropic-ratelimit-requests-remaining: 0`, `anthropic-ratelimit-requests-reset: <ISO>`, `retry-after: <seconds>` | **Transient** — reset em segundos a 1min; backoff curto resolve | **yes** | `CLAUDE_TRANSIENT_UPSTREAM_RE` casa `rate[-\s]?limit`, `rate_limit_error`, `too\s+many\s+requests`, `\b429\b` (parse.ts:13) |
| **tpm_transient** | Limite de tokens/minuto excedido (TPM bucket zerou) | `rate_limit_error` com message text indicando "tokens-per-minute" / "token rate" exceeded | `anthropic-ratelimit-tokens-remaining: 0`, `anthropic-ratelimit-tokens-reset: <ISO>`, `retry-after: <seconds>` | **Transient** — reset em segundos a 1min; mesma classe de RPM mas dimensão diferente | **partial** — regex casa `rate_limit_error` mas NÃO distingue RPM vs TPM (mesma string trigger). Gap se Phase 5 quiser políticas diferentes por dimensão (ex: warm-up backup somente em TPM) | `CLAUDE_TRANSIENT_UPSTREAM_RE` parcialmente (parse.ts:13); discriminator viria de header `tokens-reset` vs `requests-reset`, não da mensagem |
| **daily_quota** | Cota diária do plano (Pro/Max/Team) consumida | "usage limit reached" / "usage cap reached" / "out of extra usage" + "resets at \<timestamp\>" | `retry-after` apontando para próximo reset diário (várias horas em segundos); pode ou não vir | **Hard quota** — horas até reset diário; backoff curto NÃO resolve, swap de conta é o caminho | **yes** | `CLAUDE_TRANSIENT_UPSTREAM_RE` casa `usage\s+limit\s+reached\|usage\s+cap\s+reached\|out\s+of\s+extra\s+usage` (parse.ts:13); `CLAUDE_EXTRA_USAGE_RESET_RE` extrai timestamp de "resets at X" (parse.ts:14) |
| **weekly_quota** | Cota semanal do plano consumida | "weekly limit reached" + "resets at \<ISO ou clock time\>" | `retry-after` apontando para próxima janela semanal (dias em segundos); pode incluir timezone hint em parênteses | **Hard quota** — dias até reset; swap de conta é mandatório para continuidade | **yes** | `CLAUDE_TRANSIENT_UPSTREAM_RE` casa `weekly\s+limit\s+reached` (parse.ts:13); reset extraído por `CLAUDE_EXTRA_USAGE_RESET_RE` (parse.ts:14) |
| **org_tier** | Limite por organização (todos os usuários da org juntos atingiram cap organizacional) | Pode usar `overloaded_error`, `service_unavailable`, ou string explícita "organization usage limit" / "organization quota" — mensagem canônica não confirmada empiricamente | Tipicamente sem `retry-after` claro; pode incluir `anthropic-organization-id`; `anthropic-ratelimit-*` ausente ou inconsistente (limite é por-org, não por-conta) | **Hard quota organizacional** — potencialmente longa; swap entre contas da MESMA org não resolve (gap conhecido) | **partial** — regex casa `overloaded(?:_error)?`, `service\s+unavailable`, `\b503\b`, `\b529\b` mas NÃO tem token específico para "organization tier". Gap se Anthropic emitir mensagem distinta tipo "organization usage limit reached" — atualmente cairia em fallback genérico de transient | `CLAUDE_TRANSIENT_UPSTREAM_RE` parcialmente (parse.ts:13); detecção genérica como transient_upstream, sem discriminator de org-level. **HUMAN-UAT necessário para confirmar mensagem canônica.** |
| **session_5h** | Limite de 5h da sessão Claude Pro/Max (janela rolling) | "5-hour limit reached" / "5h limit reached" / "Claude usage limit reached" + "resets at \<timestamp\>" | Stream-JSON event ou stderr; **sem header HTTP padrão** (é estado de sessão derivado, não rate-limit HTTP). Reset vem na string da mensagem, não em header | **Hard quota por janela rolling de 5h** — não é cota diária, é janela móvel; swap de conta resolve imediatamente | **yes** | `CLAUDE_TRANSIENT_UPSTREAM_RE` casa `5[-\s]?hour\s+limit\s+reached\|claude\s+usage\s+limit\s+reached` (parse.ts:13); reset extraído por `CLAUDE_EXTRA_USAGE_RESET_RE` com suporte a timezone hint (parse.ts:14) |

---

## Resumo de Cobertura

- Tipos com cobertura **yes**: 4 (rpm_transient, daily_quota, weekly_quota, session_5h)
- Tipos com cobertura **partial**: 2 (tpm_transient — não distingue RPM/TPM; org_tier — sem token específico, cai em fallback genérico)
- Tipos com cobertura **no**: 0

**Implicação para Phase 5 (MULTI-06):**
- Classifier de produção deve **REUSAR** `CLAUDE_TRANSIENT_UPSTREAM_RE` e `CLAUDE_EXTRA_USAGE_RESET_RE` em vez de duplicar — base de detecção já é robusta para 4/6 tipos diretos.
- **Gap 1 (tpm_transient):** se Phase 5 quiser políticas diferentes para RPM vs TPM, o discriminator natural vem de **headers** (`anthropic-ratelimit-tokens-reset` vs `anthropic-ratelimit-requests-reset`), não da string da mensagem. Requer captura de headers no transport (HUMAN-UAT em 04-04 confirma se Claude Code CLI propaga estes headers no stream-JSON).
- **Gap 2 (org_tier):** caso Anthropic emita string canônica distinta ("organization usage limit reached" ou similar), estender regex com token específico. Atualmente cai em transient_upstream genérico — funcional mas perde a oportunidade de UI dizer "todas suas contas da mesma org estão impactadas". HUMAN-UAT empírico (UAT-04-01) é o caminho para confirmar a mensagem real.
- **Sub-tipo discriminator recomendado para Phase 5:** classifier de produção deve emitir `type: "rpm_transient" | "tpm_transient" | "daily_quota" | "weekly_quota" | "session_5h" | "org_tier" | "unknown"` mesmo que internamente várias categorias compartilhem o mesmo regex match — discriminator vem de combinação (mensagem + headers + presença de "resets at").

---

## Headers Anthropic (referência)

Headers oficiais documentados em `https://docs.anthropic.com/en/api/rate-limits`. Investigação empírica (HUMAN-UAT em 04-04) confirma se Claude Code CLI propaga estes headers em algum lugar do stream-JSON ou se ficam ocultos no transport interno.

| Header | Descrição |
|--------|-----------|
| `anthropic-ratelimit-requests-limit` | Limite total de requests permitidos na janela atual (RPM bucket size). |
| `anthropic-ratelimit-requests-remaining` | Quantos requests restam antes de atingir o limit; valor `0` indica RPM exhausted. |
| `anthropic-ratelimit-requests-reset` | Timestamp ISO 8601 quando o RPM bucket reseta (janela de 1 minuto). |
| `anthropic-ratelimit-tokens-limit` | Limite total de tokens permitidos na janela atual (TPM bucket size). |
| `anthropic-ratelimit-tokens-remaining` | Quantos tokens restam antes de atingir o limit; valor `0` indica TPM exhausted. |
| `anthropic-ratelimit-tokens-reset` | Timestamp ISO 8601 quando o TPM bucket reseta. |
| `retry-after` | Segundos até retry seguro; presente em respostas 429. Para hard quota (daily/weekly) pode conter valor grande (horas/dias em segundos). |

**Relevância para detecção pré-emptiva:** se `*-remaining` chega em 0 ANTES do request explodir com 429, classifier pode marcar conta como "near-exhaustion" e iniciar warm-up de backup (D-13 em `04-CONTEXT.md`). Atualmente paperclip não consume estes headers — Phase 5 decide se vale a pena (provavelmente sim, mas opt-in conforme `DECISION-DETECTION-STRATEGY.md` do plano 04-02).

---

## HUMAN-UAT pendente

Apontado por `04-HUMAN-UAT.md#uat-04-01` (será criado pelo plano 04-05): **captura de fixtures reais** substituirá as observações desta tabela vindas de docs por mensagens canônicas literais quando o usuário rodar agente até atingir cada limit em conta de teste.

Itens dependentes deste UAT:
- Confirmar mensagem canônica empírica de **org_tier** (atualmente especulativa).
- Confirmar se **tpm_transient** vem com mensagem textualmente distinta de **rpm_transient** ou apenas via headers.
- Capturar **headers reais** propagados pelo Claude Code CLI (vs apenas mensagens de erro) — destrava decisão pré-emptiva no `DECISION-DETECTION-STRATEGY.md`.
- Validar se `retry-after` vem em todos os 6 tipos ou apenas em alguns (afeta `transientRetryNotBefore` accuracy em `execute.ts`).

---

## Notas

- Conforme **D-01**: spike NÃO modifica `parse.ts` nem `execute.ts`; análise é apenas leitura.
- Conforme **D-19**: este documento é input direto para `FINDINGS-FOR-PHASE-5.md` (plano 04-05) — gaps "partial" listados acima são candidatos diretos a entries no findings doc.
- Conforme **D-08**: linguagem pt-br por ser artefato de pesquisa interno; produção em Phase 5 (UI, mensagens user-facing) seguirá convenção do paperclip.
- Coverage verdict é por **regex match**, não por qualidade de classificação. Um match `yes` significa que a string será detectada como `transient_upstream`; não significa que o sub-tipo (rpm/tpm/daily/weekly/5h) é correctly discriminado pelo classifier atual — discriminator é responsabilidade do prototype no plano 04-03.
- Linha 13/14 de `parse.ts` referenciada literalmente: `CLAUDE_TRANSIENT_UPSTREAM_RE` (declaração inicia em linha 12, regex literal em linha 13) e `CLAUDE_EXTRA_USAGE_RESET_RE` (declaração inicia em linha 14, regex literal em linha 15). Documentação refere-se aos pares declaração+literal como "parse.ts:13" e "parse.ts:14" para brevidade.
