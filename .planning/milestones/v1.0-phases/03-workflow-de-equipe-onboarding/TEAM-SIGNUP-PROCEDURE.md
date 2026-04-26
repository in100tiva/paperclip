# Cadastro Coletivo da Equipe — Phase 3 / TEAM-01

**Phase:** 03 — Workflow de Equipe + Onboarding
**Requirement satisfied:** TEAM-01
**Padrão de execução:** manual (CEO executa script + 4+ devs aceitam invites via UI)
**Reusa:** Fluxo `bootstrap_ceo` + `company_join` existente do paperclip (decisão D-09 — sem código novo)

## Objetivo

Cumprir o critério de sucesso #3 do ROADMAP da Phase 3:

> 5+ devs estão cadastrados via fluxo de invite/board-claim do paperclip apontando para Supabase compartilhado.

Validação final é SQL contando users em company shared (D-12).

## Visão Geral do Fluxo

```
Dev #1 (CEO bootstrap)
  ↓ executa create-auth-bootstrap-invite.ts
  ↓ recebe URL /invite/<token>
  ↓ abre URL → signup → aceita → company criada
  ↓
  ↓ vai pra Company Settings → Invites → cria invite human
  ↓ recebe URL /invite/<novo-token>  (tipo: company_join)
  ↓ posta URL no canal interno do time
  ↓
Devs #2..N (cadastro normal)
  ↓ leem ONBOARDING.md, fazem pnpm setup
  ↓ pegam URL no canal interno
  ↓ abrem URL → signup → aceita → join_request pending_approval
  ↓
Dev #1 (admin)
  ↓ Company Settings → Access → aprova join_requests
  ↓
Devs #2..N
  ↓ refresh → redirecionados pra dashboard da company shared
```

Ver mapa completo dos states + transitions: [doc/spec/invite-flow.md](../../../doc/spec/invite-flow.md).

## Pré-requisitos

- [ ] Phase 2 fechada (Supabase remoto operacional, Better Auth funcional, schema aplicado via CI)
- [ ] Dev #1 (CEO bootstrap) tem `.env.local` preenchido e `pnpm setup` saiu OK
- [ ] Servidor authenticated subido **uma vez** pra rodar o bootstrap:
  ```bash
  PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev
  ```

## Passo 1: Bootstrap CEO (one-time, dev #1)

> ⚠️ **Esse passo só roda UMA VEZ na vida do time.** Se a company shared já existe, pular para o Passo 2.

Para checar se já existe bootstrap_ceo válido:

```sql
-- Supabase Studio → SQL Editor
SELECT id, "inviteType", "expiresAt", "acceptedAt", "revokedAt"
FROM invites
WHERE "inviteType" = 'bootstrap_ceo'
ORDER BY "createdAt" DESC
LIMIT 5;
```

Se retornar linha com `acceptedAt IS NOT NULL`: bootstrap já feito → pular para Passo 2.

Caso contrário, dev #1 executa:

```bash
tsx packages/db/scripts/create-auth-bootstrap-invite.ts \
  --config ~/.paperclip/instances/default/config.json \
  --base-url http://localhost:3100
```

Output esperado (stdout):

```
http://localhost:3100/invite/pcp_bootstrap_<64hex>
```

Dev #1:
1. Copia a URL.
2. Abre no browser **com servidor em authenticated mode** (ver pré-requisitos).
3. Faz signup com email + senha do time. **Anote o BETTER_AUTH_SECRET** — todos os devs precisam usar o mesmo secret no `.env.local` (ver ONBOARDING.md §3).
4. Aceita o invite — bootstrap_ceo cria company padrão automaticamente, sem aprovação.
5. Confirma que está no dashboard da company.

Validação intermediária:

```sql
SELECT count(*)::int AS user_count FROM "user";
SELECT count(*)::int AS company_count FROM company;
```

Esperado: `user_count = 1`, `company_count = 1`.

## Passo 2: Gerar invites company_join (dev #1, repetido N vezes)

Para cada dev novo a cadastrar, dev #1 (logado como admin):

1. Navega para **Company Settings → Invites** na UI.
2. Clica **Create invite** (role: padrão `member` ou `admin` conforme a política do time).
3. Copia URL gerada (formato `http://localhost:3100/invite/<token>`).
4. Posta no **canal interno do time** (Discord/Slack) — **NÃO** no `.env.example` ou em qualquer arquivo do repo (decisão D-11).

Repetir até ter pelo menos 4 invites ativos para os devs #2..#5+.

> Os invites têm expiração default. Se um dev demorar a aceitar, gerar invite novo (revogar o velho via mesma UI se ele ainda não aceitou).

## Passo 3: Devs #2..N aceitam invites (cada dev em sua máquina)

Cada dev novo:

1. Lê [ONBOARDING.md](../../../ONBOARDING.md) e completa setup local até `pnpm setup` sair OK.
2. Sobe servidor authenticated:
   ```bash
   PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev
   ```
3. Pega URL no canal interno.
4. Abre URL no browser — vê tela "Inline Auth" (porque está em authenticated mode + sem session).
5. Faz **signup** (toggle "create account") com email/senha.
6. Aceita o invite — sistema cria `join_request` com status `pending_approval`.
7. Vê tela "Aguardando aprovação".

Dev #1 (admin):

1. Volta na UI → **Company Settings → Access**.
2. Vê lista de join_requests pending.
3. Aprova cada um.

Devs #2..N:

1. Refresh da página de invite.
2. Redirecionados pra dashboard da company shared.

## Passo 4: Validação Final (TEAM-01 critério de sucesso)

Quando atingir 5+ devs cadastrados, executar via Supabase Studio SQL Editor:

```sql
-- Total de users
SELECT count(*)::int AS total_users FROM "user";

-- Distribuição por company (esperado: TODOS na company shared)
SELECT
  c.id AS company_id,
  c.name AS company_name,
  count(cm."userId")::int AS members
FROM company c
LEFT JOIN company_membership cm ON cm."companyId" = c.id
GROUP BY c.id, c.name
ORDER BY members DESC;
```

**Critério PASS (D-12):**
- `total_users >= 5`
- A company principal (shared) tem `members >= 5`
- Não existem outras companies com membros — todos os devs estão na mesma company.

> **Nota sobre nomes de colunas:** Drizzle pode gerar tabelas com `camelCase` ou `snake_case` dependendo da versão. Se a query falhar com `column "userId" does not exist`, tentar `user_id` / `company_id`. O schema vivo está em `packages/db/src/schema/`.

## Notas Operacionais

- **NÃO criar users via SQL direto.** O fluxo Better Auth gera password hashes e timestamps que não devem ser falsificados — viola D-09 (reusar fluxo existente, sem código novo).
- **NÃO compartilhar invite tokens em arquivos versionados.** Tokens viram parte do `tokenHash` no schema; expor em git compromete o fluxo. Use sempre canal interno efêmero.
- **Revogar invites não usados** após N dias (UI tem botão Revoke). Tokens vivem no DB indefinidamente até serem revogados ou expirarem.
- **Cookie prefix**: validar que cada dev tem `paperclip-team-shared.session_token` no DevTools após login. Se cookie tem outro prefix, esse dev configurou `PAPERCLIP_INSTANCE_ID` errado — corrigir antes de prosseguir (ver [TROUBLESHOOTING.md § Cookie prefix divergente](../../../TROUBLESHOOTING.md#cookie-prefix-divergente)).

## Status de Execução

Esta validação é HUMAN-UAT (ver [03-HUMAN-UAT.md § UAT-03-02](03-HUMAN-UAT.md#uat-03-02--cadastro-de-5-devs-reais-team-01)).

- [ ] Bootstrap CEO completado por dev #1
- [ ] Invites company_join gerados (4+)
- [ ] Devs #2..#5+ aceitaram e foram aprovados
- [ ] SQL de validação executada com `total_users >= 5` e todos na company shared
- [ ] Resultado registrado em `03-HUMAN-UAT.md` UAT-03-02

Quando todas as caixas marcadas, atualizar status do UAT-03-02 para `approved`.

## Fallback Aceito

Se < 5 devs reais disponíveis na janela atual: marcar status do UAT-03-02 como `pending-team-growth` e re-checar quando atingir 5. **NÃO** criar users falsos — eles poluem a base e quebram cost attribution na Fase 6.
