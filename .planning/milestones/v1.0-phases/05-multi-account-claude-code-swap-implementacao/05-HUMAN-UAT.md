---
type: human-uat
phase: 05-multi-account-claude-code-swap-implementacao
status: pending
created: 2026-04-26
requirements: [MULTI-11]
references:
  - .planning/phases/05-multi-account-claude-code-swap-implementacao/SMOKE-E2E.md
  - .planning/phases/04-spike-multi-account-claude-code-detection/04-HUMAN-UAT.md
  - .planning/phases/05-multi-account-claude-code-swap-implementacao/05-CONTEXT.md
---

# Phase 5 — HUMAN-UAT (Multi-Account Implementação)

**Status:** pending — execução depende de operador humano com 2 contas Claude Code reais e quota distinta
**Cobre requirements:** MULTI-11 (smoke E2E success criterion #1 do ROADMAP)
**Modo:** validação empírica que requer 2 contas Claude reais; complementa Modo A (`SMOKE-E2E.md`)
**Decisão fonte:** D-34 (`.planning/phases/05-multi-account-claude-code-swap-implementacao/05-CONTEXT.md`)
**Precedente:** Phase 3 / Phase 4 (`complete-with-pending-UAT` — artefatos entregues, validação real pendente)

## Por que HUMAN-UAT?

Conforme D-34 (05-CONTEXT.md): validação real do swap multi-account com exhaustão natural exige 2 contas Claude (Pro/Team/Max) separadas com tempo de uso real até atingir limite. Executor Claude não pode rodar isto autonomamente — não tem credenciais, não pode atingir 429 real, não pode aguardar horas de uso pesado. SMOKE-E2E.md (Modo A) cobre regressão automatizada via força SQL; este UAT cobre o portão empírico que destrava `complete` formal.

Phase 5 (planos 05-01..05-08) entregou:

- Schemas Drizzle (claude_accounts, agent_account_bindings, agent_step_executions)
- `claudeAccountsService` factory com 7 métodos
- Heartbeat wiring + orchestrateClaudeSwap (Strategy A/B)
- UI ClaudeAccounts.tsx + REST API
- Activity log type `claude_account_rotated`
- SMOKE-E2E.md (Modo A — forçado)

UAT abaixo valida empiricamente que toda a stack funciona contra Claude CLI real.

## Status

| UAT | Status | Última atualização |
|-----|--------|--------------------|
| UAT-05-01 | pending | 2026-04-26 |

---

## UAT-05-01: Smoke real cross-account com exhaustão natural

**Cobre:** MULTI-11 (success criterion #1 do ROADMAP — agente roda → conta esgota → swap automático → continuidade preservada → cost atribuído por conta)
**Status:** pending
**Dependências:** UAT-04-03 (cross-account resume mechanic) — pode ser executado primeiro ou em paralelo

### Objetivo

Validar empiricamente, em condições reais, que:

1. Agente Claude roda contra Account A; Account A atinge limite real (5h, daily, weekly, ou tier).
2. Sistema detecta `transient_upstream` via classifier real (não regex stub) com sub-tipo correto.
3. Swap automático para Account B; agente continua de onde parou via Strategy A (resume) ou Strategy B (fallback full-context).
4. `agent_step_executions` registra cost attribution correto: tokens de A vs tokens de B distintos.
5. UI `/claude-accounts` mostra Account A em `exhausted` com `exhaustedUntil` real (não forçado por SQL).
6. Activity log entry tem `swapStrategy` reflectindo qual estratégia funcionou.

### Pré-requisitos

| Item | Como preparar |
|------|---------------|
| 2 contas Claude separadas | Conta A: plano com quota baixa (Free, ou Pro com já-consumido). Conta B: plano fresh com quota cheia. Pode ser 2 logins distintos do mesmo plano se for plano que distingue por user. |
| 2 diretórios isolados | `mkdir -p ~/.paperclip/claude-accounts/{a,b}` |
| Login em cada dir | `CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/a claude login` (e repetir para b com a outra conta) |
| Server rodando authenticated | `PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev` |
| Phase 5 implementação completa | git log mostra commits dos planos 05-01 até 05-07; migration aplicada em Supabase |
| Agente longo-running | Agente de teste configurado para rodar tarefa longa (ex: 50+ steps de geração) — necessário para esgotar quota A naturalmente |
| Tempo disponível | Estimar ~30min-2h dependendo do limite atingido (5h é mais rápido se já há contexto consumido; daily exige uso pesado) |
| `companyId` + `agentId` em mãos | via SQL ou UI |

### Procedimento

1. **Setup inicial:**
   - Registrar Account A e Account B via UI `/<companyPrefix>/company/settings/claude-accounts` (label + slug, sem digitar credenciais — credenciais já estão nos dirs).
   - Verificar UI mostra ambas como `live`.

2. **Spawnar agente:** rodar agente longo na company de teste. Configurar para usar quota agressivamente (várias chamadas Claude consecutivas com prompts longos, ou loop de geração).

3. **Aguardar exhaustão natural de Account A:**
   - Monitorar `claude_accounts.exhausted_until` via Supabase Studio ou refresh da UI.
   - Quando A atinge limite, sistema deve detectar via classifier e disparar swap.
   - **Sinal visível:** UI muda Account A de verde (`live`) para vermelho (`exhausted`); `agent_account_bindings.activeAccountId` muda para B.

4. **Observar continuidade:**
   - Agent não para — continua rodando contra Account B.
   - Verificar nos logs do server linhas com `MULTI-08` ou `orchestrateClaudeSwap`.
   - Server log deve indicar Strategy A (`--resume <session_id>`) tentada e (provável) failure detected via `detectResumeFailed` → Strategy B (fallback full-context com continuation summary).

5. **Validar attribution:**

   ```sql
   SELECT account_id, count(*) as steps, sum(input_tokens) as total_input, sum(output_tokens) as total_output
   FROM agent_step_executions
   WHERE run_id IN (SELECT id FROM heartbeat_runs WHERE agent_id = '<seu-agentId>')
   GROUP BY account_id;
   ```

   Esperado: 2 rows — uma para A com tokens "consumidos antes do esgotamento", outra para B com tokens "consumidos após swap".

6. **Validar activity log:**

   ```sql
   SELECT details FROM activity_log
   WHERE action = 'claude_account_rotated'
     AND company_id = '<seu-companyId>'
   ORDER BY created_at DESC LIMIT 1;
   ```

   Conferir `errorFamily` (esperado: `'transient_upstream'`), `retryNotBefore` (esperado: timestamp real do reset Anthropic, extraído de retry-after / "resets at" via `extractClaudeRetryNotBefore`), `swapStrategy` (esperado: `'resume'` se cross-account session funcionou, `'fallback_full_context'` se houve fallback Plano B), `swapStatus` (`'succeeded'` ou `'failed'`).

### Critérios Pass/Fail

| Critério | Pass | Fail |
|----------|------|------|
| Detection real | Classifier identifica sub-tipo de exhaustão (rpm/tpm/daily/weekly/5h/org) na mensagem real do Claude CLI | Classifier classifica como `unknown` ou não detecta |
| Swap automático | Agent continua sem intervenção; binding muda para B | Agent para com erro persistente |
| Continuity | Output de B faz sentido em relação ao último output de A (não recomeça do zero) | Output de B começa "do zero", ignorando contexto |
| Attribution | `agent_step_executions` tem ambos accountIds com tokens diferentes | Apenas A ou apenas B |
| `exhaustedUntil` | Reflete timestamp real do reset Anthropic (extraído de retry-after / "resets at") | NULL ou data muito longe (fallback default `defaultExhaustionFallback`) |
| `swapStrategy` | Reflete a estratégia que funcionou (`resume` OU `fallback_full_context`) | NULL |
| D-19 cap | Apenas 1 rotação por step (anti-thrash) | Múltiplas rotações em loop |

### Resultados Esperados (Findings dependentes)

Se UAT-05-01 PASS:

- Phase 5 satisfaz todos os success criteria do ROADMAP.
- Strategy A pode ser refinada baseado em qual % das vezes funciona vs precisa de Strategy B.
- Cost attribution V1 validado para Phase 6 PROJ-03.
- Phase 5 promovida de `complete-with-pending-UAT` para `complete`.

Se UAT-05-01 FAIL em "Continuity":

- Strategy B tem gap — `continuation_summary` insuficiente para recriar contexto.
- Refinement: incluir mais do estado interno do agente no prompt (issue body completo, last messages do thread, etc.).
- Ticket criado em phase 6 ou v2 (referência: known stub do 05-06 — `config.initialPrompt` não consumido pelo adapter `buildClaudeRuntimeConfig`).

Se UAT-05-01 FAIL em "Detection":

- Mensagem real do Claude CLI tem token novo não coberto pelo regex.
- Atualizar `CLAUDE_TRANSIENT_UPSTREAM_RE` em `parse.ts` e taxonomy.
- Possível extensão de discriminator em classifier (referência: 04-CONTEXT.md D-15 ordering rules).

Se UAT-05-01 FAIL em "Strategy A sempre falha":

- Cross-account `--resume <session_id>` não funciona (Finding 7 confirmado empiricamente).
- Refinement: remover tentativa Strategy A para economizar ~5s; ir direto para Strategy B (Plano B do D-21).
- Documentar em `claude-accounts-swap.md`.

### Como reportar resultados

Após executar UAT-05-01, atualizar este arquivo:

- Mudar `status: pending` → `status: passed | failed | partial`
- Adicionar seção `## Resultado UAT-05-01 (executado em <data>)` com:
  - Operador (nome/email)
  - Conta A label + plano
  - Conta B label + plano
  - Tempo decorrido até exhaustão
  - Output do classifier (sub-tipo detectado)
  - Strategy que funcionou (`resume` vs `fallback_full_context`)
  - Tokens de A vs Tokens de B
  - Surprises / findings
- Commitar atualização em branch separada para review.

Se PASS: Phase 5 declared `complete`.
Se FAIL: criar plan 05-09 ou abrir issue para fix targeted.

### Referências

- `.planning/phases/05-multi-account-claude-code-swap-implementacao/SMOKE-E2E.md` (Modo A — forçado; este UAT é Modo B real)
- `.planning/phases/04-spike-multi-account-claude-code-detection/04-HUMAN-UAT.md` (UAT-04-03 — dependência conceitual; pode ser executado primeiro ou em paralelo)
- `.planning/phases/04-spike-multi-account-claude-code-detection/FINDINGS-FOR-PHASE-5.md` (Findings 6-7 sobre swap strategy)
- `server/src/services/claude-accounts-swap.md` (Strategy A/B docs)
- `server/src/services/claude-accounts-swap.ts` (orchestrateClaudeSwap + orchestrateFallbackFullContext)
- `server/src/services/heartbeat.ts` (consumer MULTI-07/08 — bloco ~linha 5340)
- `.planning/phases/05-multi-account-claude-code-swap-implementacao/05-CONTEXT.md` (D-21, D-34)

---

*Phase 5 fecha como `complete-with-pending-UAT`: artefatos entregues e validados via Modo A (`SMOKE-E2E.md`); validação Modo B (UAT-05-01) fica como trabalho contínuo do operador. Convergência empírica destrava `complete` formal.*
