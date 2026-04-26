# SMOKE-E2E: Multi-Account Claude Code Swap

**Phase:** 5 (Multi-Account Implementação)
**Requirement:** MULTI-11
**Decisão fonte:** D-33 (`.planning/phases/05-multi-account-claude-code-swap-implementacao/05-CONTEXT.md`)
**Linguagem:** pt-br (artefato interno; convenção `.planning/`)
**Status:** Procedimento documentado; validação empírica em `05-HUMAN-UAT.md` (UAT-05-01)

## Objetivo

Validar de fim-a-fim que:

1. O pool de contas Claude é registrado e listado.
2. Quando uma conta atinge exhaustão, o sistema dispara swap automático para outra conta.
3. Cada step é registrado em `agent_step_executions` com o `accountId` correto (cost attribution funcional).
4. Cada swap emite `claude_account_rotated` no `activity_log` com payload completo.
5. UI `/company/settings/claude-accounts` reflete o estado atualizado em tempo real.

Este smoke tem **dois modos**:

- **Modo A (forçado, automatizável):** força `exhaustedUntil` via SQL para induzir swap sem usar quota Claude real. Útil para CI/regressão e para o executor Claude (sem 2 contas reais).
- **Modo B (real, HUMAN-UAT):** roda agente até atingir limite Claude real. Requer 2 contas Claude (Pro/Team/Max) com quota distinta. Coberto em `05-HUMAN-UAT.md` UAT-05-01.

Este documento cobre **Modo A**. Modo B fica para HUMAN-UAT.

## Pré-requisitos

| Item | Como obter/verificar |
|------|----------------------|
| Phase 5 plans 01-07 completos | `git log --oneline | head -30` deve mostrar commits dos plans 05-01 até 05-07 |
| Migration aplicada em Supabase | `psql $SUPABASE_DB_URL -c "\dt claude_accounts"` retorna a tabela |
| Server rodando em modo authenticated | `PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev` (porta 3100) |
| Login Better Auth válido | Cookie `paperclip-team-shared` presente na sessão do browser |
| 2 diretórios de credenciais Claude | `mkdir -p ~/.paperclip/claude-accounts/a ~/.paperclip/claude-accounts/b` (NÃO precisa rodar `claude login` para Modo A — apenas estrutura de diretório) |
| Acesso à UI | `http://localhost:3100/<companyPrefix>/company/settings/claude-accounts` carrega |
| Acesso ao Supabase Studio | https://supabase.com/dashboard/project/bxlczioxgizgvtznukwt/sql para queries de validação |
| `companyId` em mãos | `SELECT id, name FROM companies WHERE name = '<sua-company>';` |
| `agentId` de teste em mãos | `SELECT id, label FROM agents WHERE company_id = '<companyId>' LIMIT 1;` |

## Procedimento (Modo A — forçado)

### Passo 1: Registrar 2 contas via UI

1. Navegar para `http://localhost:3100/<companyPrefix>/company/settings/claude-accounts`.
2. No formulário "Register new account":
   - Label: `Account A`
   - Slug: `a`
   - Submit. Confirmar toast de sucesso.
3. Repetir:
   - Label: `Account B`
   - Slug: `b`
   - Submit.
4. Validar tabela mostra 2 rows com status `live` (badge verde).

**Validação SQL (Supabase Studio):**

```sql
SELECT id, label, config_dir_slug, status, last_used_at
FROM claude_accounts
WHERE company_id = '<seu-companyId>'
ORDER BY created_at;
```

Esperado: 2 rows, ambas `status = 'live'`. Capturar os UUIDs de A e B para passos seguintes (substituir `<account-a-uuid>` / `<account-b-uuid>`).

### Passo 2: Spawnar agente que ativa selectActiveAccount

Iniciar um agente qualquer da company (via UI `/agents` ou via heartbeat manual). Pode ser um agente trivial que apenas executa um ping curto. Importante: deve invocar pelo menos um step Claude Code para que `selectActiveAccount` seja chamado.

Conferir nos logs do server: linha indicando spawn com `CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/a` (assumindo Account A foi selecionada como round-robin primeira por `lastUsedAt ASC` — A foi criada antes de B).

**Validação SQL:**

```sql
SELECT agent_id, active_account_id, rotation_policy, last_rotated_at
FROM agent_account_bindings
WHERE agent_id = '<seu-agentId>';
```

Esperado: 1 row com `active_account_id` = `<account-a-uuid>`, `rotation_policy = 'auto'`, `last_rotated_at = NULL` (binding lazy criado por `selectActiveAccount`).

### Passo 3: Forçar exhaustão de Account A via SQL

Em vez de aguardar quota Claude real, força via update direto:

```sql
UPDATE claude_accounts
SET status = 'exhausted',
    exhausted_until = now() + interval '1 hour',
    last_quota_windows_json = jsonb_set(
      coalesce(last_quota_windows_json, '{}'::jsonb),
      '{daily_quota}',
      jsonb_build_object(
        'exhaustedUntil', (now() + interval '1 hour')::text,
        'lastTriggeredAt', now()::text,
        'count', 1
      )
    ),
    updated_at = now()
WHERE id = '<account-a-uuid>';
```

Validar via UI: refresh da página `/claude-accounts` mostra Account A com badge `exhausted` (vermelho) e indicação de `exhausted until`.

### Passo 4: Spawnar próximo step do agente — observar swap

Trigger uma nova ação no agente (ex: enviar issue, comentário, ou qualquer evento que cause heartbeat invocar `adapter.execute` com adapter `claude_local`).

No log do server, observar bloco MULTI-08 indicando rotação. Esperado: `CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/b` na nova invocação. Também esperado log de `orchestrateClaudeSwap` reportando `reason='swapped'` e `errorFamily` detectado.

**Validação SQL:**

```sql
-- Binding deve agora apontar para B
SELECT active_account_id, last_rotated_at
FROM agent_account_bindings
WHERE agent_id = '<seu-agentId>';
```

Esperado: `active_account_id = <account-b-uuid>`, `last_rotated_at` recente (~últimos segundos).

```sql
-- agent_step_executions deve ter rows para A E B
SELECT step_id, account_id, error_family, started_at
FROM agent_step_executions
WHERE run_id IN (
  SELECT id FROM heartbeat_runs WHERE agent_id = '<seu-agentId>'
  ORDER BY created_at DESC LIMIT 1
)
ORDER BY started_at;
```

Esperado: pelo menos 2 rows — uma com `account_id = <account-a-uuid>` (com `error_family` populado, provável `transient_upstream`), outra com `account_id = <account-b-uuid>` (continuação pós-swap).

### Passo 5: Validar activity_log entry

```sql
SELECT id, action, details, created_at
FROM activity_log
WHERE company_id = '<seu-companyId>'
  AND action = 'claude_account_rotated'
ORDER BY created_at DESC
LIMIT 1;
```

Esperado: 1 row com `details` JSON contendo:

- `agentId` = `<seu-agentId>`
- `fromAccountId` = `<account-a-uuid>`
- `toAccountId` = `<account-b-uuid>`
- `reason` = `"exhausted"`
- `errorFamily` populado (provável `"transient_upstream"`)
- `retryNotBefore` = ISO timestamp (extraído de mensagem ou fallback default)
- `swapStrategy` = `"resume"` ou `"fallback_full_context"` (depende de UAT-04-03 — Strategy A optimistic ou Strategy B fallback)
- `swapStatus` = `"succeeded"` (ou `"failed"` se ambas estratégias falharam)

### Passo 6: Validar UI rotation history

Refresh `/<companyPrefix>/company/settings/claude-accounts`. Seção "Rotation history" deve mostrar a entry recente: `Agent <id-curto> rotated <a-id-curto> → <b-id-curto> (exhausted, transient_upstream, resume/fallback_full_context)` com timestamp.

## Pass/Fail

| Critério | Pass se | Fail se |
|----------|---------|---------|
| Lista de accounts | UI mostra 2 rows após Passo 1 | UI vazia ou erro |
| Selection inicial | Agent binding aponta para A após Passo 2 | binding null ou aponta para B (round-robin quebrado) |
| Exhaustão induzida | UI mostra A como `exhausted` após Passo 3 | UI continua mostrando A como `live` (refresh cache?) |
| Swap automático | binding muda para B após Passo 4 | binding permanece em A (heartbeat não invocou orchestrate ou D-19 cap travou) |
| Attribution | `agent_step_executions` tem rows com ambos accountIds | Só tem rows com A ou só com B |
| Activity log | 1 entry `claude_account_rotated` com payload completo (8 campos) | Sem entry, ou payload incompleto |
| UI history | Entry visível em "Rotation history" | Vazio ou stale |

## Cleanup

Após smoke:

```sql
-- Reset Account A para live (se quiser repetir o smoke):
UPDATE claude_accounts
SET status = 'live',
    exhausted_until = NULL,
    last_quota_windows_json = '{}'::jsonb,
    updated_at = now()
WHERE id = '<account-a-uuid>';

-- Opcional: limpar accounts de teste:
DELETE FROM agent_account_bindings WHERE agent_id = '<seu-agentId>';
DELETE FROM claude_accounts WHERE config_dir_slug IN ('a', 'b') AND company_id = '<seu-companyId>';
```

Não rodar contra company de produção sem coordenação.

## Limitações

Este smoke (Modo A) **não valida**:

- Que o `claude` CLI realmente respeita `CLAUDE_CONFIG_DIR` em ambiente real (assumido por testes do adapter MULTI-05; coberto por UAT-05-01)
- Que `--resume` cross-account funciona ou falha com pattern previsto (Strategy A vs B — UAT-04-03 dependente)
- Que continuation summary preserva contexto suficiente (UAT-04-03 dependente)
- Que cost attribution em USD é exato (cost calc não conectado a Anthropic real billing — v1 limitação documentada em PROJ-03)
- Que `transient_upstream` classifier funciona em mensagens reais do Claude CLI (UAT-04-01 dependente)

Estas validações ficam em `05-HUMAN-UAT.md` (UAT-05-01).

## Referências

- `.planning/phases/05-multi-account-claude-code-swap-implementacao/05-CONTEXT.md` (D-33)
- `.planning/phases/05-multi-account-claude-code-swap-implementacao/05-HUMAN-UAT.md` (UAT-05-01)
- `.planning/phases/04-spike-multi-account-claude-code-detection/04-HUMAN-UAT.md` (UAT-04-01..03 dependentes)
- `.planning/phases/04-spike-multi-account-claude-code-detection/FINDINGS-FOR-PHASE-5.md` (Findings 6-7 destravam UAT-05-01)
- `server/src/services/claude-accounts-swap.md` (orquestração Strategy A/B)
- `server/src/services/claude-accounts.ts` (factory `claudeAccountsService`)
- `server/src/services/heartbeat.ts` (consumer MULTI-07/08)
- `packages/db/src/schema/{claude_accounts,agent_account_bindings,agent_step_executions}.ts` (schemas MULTI-01/02/03)

---

*Phase 5 fecha como `complete-with-pending-UAT`: este smoke (Modo A) é o procedimento canônico para regressão automatizada; validação Modo B (UAT-05-01) é o portão empírico final.*
