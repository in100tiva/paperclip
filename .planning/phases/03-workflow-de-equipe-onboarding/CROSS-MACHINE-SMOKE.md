# Smoke Test E2E Cross-Machine — Phase 3

**Phase:** 03 — Workflow de Equipe + Onboarding
**Requirement satisfied:** TEAM-04
**Padrão de execução:** manual (dois devs reais ou fallback single-host)
**Reference padrão:** `.planning/phases/02-migra-o-de-storage-para-supabase/SMOKE-TEST-LOG.md`

## Objetivo

Provar empiricamente que o critério de sucesso #4 do ROADMAP da Phase 3 está satisfeito:

> Smoke test E2E executado: dev A faz login + cria company; dev B em outra máquina vê a mesma company sem sincronização manual.

Cobertura: estado compartilhado via Supabase remoto + cookie prefix `paperclip-team-shared` interoperável entre máquinas.

## Pré-requisitos (ambos os devs)

Antes de começar, cada dev DEVE ter completado o [ONBOARDING.md](../../../ONBOARDING.md):

- [ ] `pnpm install` rodou sem erros
- [ ] `.env.local` preenchido com valores reais (não `TODO_FILL_ME`)
- [ ] `PAPERCLIP_INSTANCE_ID=team-shared` literal em ambos os `.env.local`
- [ ] `pnpm setup` saiu com `✅ Ambiente OK` em ambas as máquinas
- [ ] Mesma `DATABASE_URL` (mesmo project Supabase `bxlczioxgizgvtznukwt`)

Se `pnpm setup` reclamar em qualquer máquina, resolver via [TROUBLESHOOTING.md](../../../TROUBLESHOOTING.md) antes de prosseguir.

## Procedimento Cross-Machine (canônico — D-13)

### Setup inicial: Dev #1 (CEO bootstrap, one-time)

> **Pular esta seção se a equipe já tem company criada.** O bootstrap_ceo só roda uma vez no time inteiro (decisão D-10 da Fase 3).

1. Dev #1 sobe o servidor em modo authenticated:
   ```bash
   PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev
   ```
2. Dev #1 gera o bootstrap invite:
   ```bash
   tsx packages/db/scripts/create-auth-bootstrap-invite.ts \
     --config ~/.paperclip/instances/default/config.json \
     --base-url http://localhost:3100
   ```
   Output: URL `http://localhost:3100/invite/<token>`.
3. Dev #1 abre essa URL no browser, faz signup com email/senha, aceita o invite. A company padrão (`Test Co`, `Acme`, ou nome real escolhido) é criada.

### Smoke cross-machine

Pré-condição: company existe na Supabase (criada pelo Dev #1 acima OU já existente do time).

**Dev A — máquina X**

1. Subir servidor authenticated (comando da seção anterior).
2. Login com sua conta Better Auth (email/senha do time).
3. Confirmar que vê a company compartilhada no dashboard.
4. Criar uma nova task com título reconhecível: `cross-machine-smoke-<YYYYMMDD-HHMM>`.
5. Anotar:
   - Hora exata da criação (`HH:MM`)
   - URL da task (ex: `http://localhost:3100/tasks/<id>`)
   - Cookie de sessão presente: DevTools → Application → Cookies → procurar `paperclip-team-shared.session_token` (deve existir).

**Dev B — máquina Y (diferente da X)**

1. Subir servidor authenticated.
2. Login com sua conta Better Auth (DIFERENTE da do Dev A).
3. **Sem refresh manual da página**, navegar para o dashboard:
   - Esperado: ver a mesma company que Dev A está vendo.
   - Esperado: ver a task `cross-machine-smoke-<YYYYMMDD-HHMM>` recém-criada.
4. Criar uma segunda task: `cross-machine-smoke-reply-<YYYYMMDD-HHMM>`.
5. Anotar hora.

**Dev A — verificação reversa**

1. Refresh do browser (F5).
2. Esperado: ver `cross-machine-smoke-reply-<YYYYMMDD-HHMM>` criada pelo Dev B.

**Critério PASS:**
- Dev B vê a company de Dev A sem ter feito setup adicional.
- Dev A vê a task criada por Dev B após refresh simples (sem `pnpm db:migrate`, sem coordenação fora-de-banda).
- Cookies de ambos têm prefix `paperclip-team-shared.`.

**Critério FAIL:**
- Dev B vê dashboard vazio ou company diferente.
- Cookie prefix divergente (significa `PAPERCLIP_INSTANCE_ID` diferente em algum lado).
- Erro `relation "user" does not exist` (schema desatualizado em uma das máquinas).

## Fallback: Single-Host (D-14)

**Quando usar:** Se a equipe não conseguir coordenar dois devs em máquinas físicas distintas para a janela do smoke (ex: time pequeno, time-zones, indisponibilidade momentânea).

**Limitação:** Single-host **não prova** que o cookie prefix funciona literalmente entre máquinas distintas — apenas prova interoperabilidade entre sessions diferentes na mesma máquina. É uma aproximação aceitável para fechar TEAM-04 com sinal "infra OK", mas a prova final cross-machine deve ser feita assim que possível e logada como amendment.

### Procedimento single-host (two-browser-profiles)

1. Subir servidor authenticated (uma vez, na máquina única):
   ```bash
   PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev
   ```
2. Abrir **dois browsers DIFERENTES** ou **dois perfis isolados do mesmo browser** (ex: Chrome perfil "Dev A" + Firefox, ou Chrome perfil padrão + perfil "Convidado"). **NÃO** usar duas abas do mesmo perfil — elas compartilham cookies.
3. Em "Dev A" (browser 1): login com conta A → criar task `single-host-smoke-A-<HHMM>`.
4. Em "Dev B" (browser 2): login com conta B → confirmar que vê a task de A.
5. Em "Dev B": criar task `single-host-smoke-B-<HHMM>`.
6. Em "Dev A": refresh → confirmar que vê a task de B.

**Critério PASS (single-host):** Mesmo comportamento do cross-machine, com limitação documentada de que cookies vivem na mesma máquina.

## Registro de Resultado (D-15)

Cada execução do smoke (cross-machine ou fallback) é logada num bloco abaixo. Padrão segue `02-SMOKE-TEST-LOG.md`.

### Execução 1

- **Data/hora:** `<YYYY-MM-DD HH:MM>` (timezone)
- **Modo:** `cross-machine` ou `single-host-fallback`
- **Dev A:** `<email ou handle>` na máquina `<descrição>`
- **Dev B:** `<email ou handle>` na máquina `<descrição>`
- **Resultado:** `PASS` / `FAIL`
- **Observações:**
  - Cookie prefix observado: `paperclip-team-shared.session_token` ✓ / ✗
  - Tasks visíveis cross-account: ✓ / ✗
  - Erros encontrados: `<nenhum>` ou `<descrição>`
- **Screenshots opcionais:** anexar paths se houver.

(Adicionar blocos `### Execução 2`, etc., conforme novas execuções.)

## Rollback / Recovery

Se o smoke FAIL:

1. Confirmar `PAPERCLIP_INSTANCE_ID=team-shared` em **ambos** os `.env.local`.
2. Confirmar que ambos apontam pro mesmo Supabase: `node -e "console.log(new URL(process.env.DATABASE_URL).hostname, new URL(process.env.DATABASE_URL).username)"` deve dar mesma saída em ambas as máquinas.
3. Limpar cookies do browser (`paperclip-*`) e re-login.
4. Verificar [TROUBLESHOOTING.md](../../../TROUBLESHOOTING.md):
   - [Cookie prefix divergente](../../../TROUBLESHOOTING.md#cookie-prefix-divergente)
   - [Schema desatualizado](../../../TROUBLESHOOTING.md#schema-desatualizado)
5. Se ainda falhar, abrir issue interna no canal do time.

## Status

- [ ] Procedimento cross-machine documentado (este arquivo)
- [ ] Fallback single-host documentado (este arquivo)
- [ ] Pelo menos uma execução registrada (será preenchida ao executar; ver `03-HUMAN-UAT.md` para tracking)
