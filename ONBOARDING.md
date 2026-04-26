# Onboarding — DDD (fork da equipe)

> **Idioma:** pt-br. Tempo-alvo: <30 minutos do clone à primeira sessão logada.
>
> Este doc é específico do fork DDD (hard fork de `paperclipai/paperclip` — ver [UPSTREAM_REFERENCE.md](UPSTREAM_REFERENCE.md)). O `README.md` da raiz continua sendo o README público do paperclip; este arquivo é a entrada operacional para a equipe interna.
>
> **Travou em algum passo?** Pule direto para [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## 1. Pré-requisitos

- **Node.js 20+** ([nodejs.org](https://nodejs.org))
- **pnpm 9.15.4+** — recomendado via corepack:
  ```bash
  corepack enable
  corepack prepare pnpm@9.15.4 --activate
  ```
- **Git** ([git-scm.com](https://git-scm.com))
- **Sistema operacional:** Windows / macOS / Linux (todos suportados; Windows tem warts conhecidos — ver TROUBLESHOOTING).
- **Opcional, recomendado para a Fase 4+:** [Claude Code CLI](https://docs.claude.com/en/docs/claude-code/setup). Sem ele, `pnpm setup` emite warning mas continua.

## 2. Clonar o repositório e instalar dependências

```bash
git clone <url-do-repo-ddd>
cd ddd
pnpm install
```

> Se `pnpm install` reclamar de file locks no Windows ou paths longos, ver [TROUBLESHOOTING.md § Windows NTFS](TROUBLESHOOTING.md#windows-ntfs).

## 3. Configurar `.env.local`

```bash
cp .env.example .env.local
```

Abra `.env.local` e preencha cada `TODO_FILL_ME`. **Os valores reais não vão neste doc nem no `.env.example`** — eles ficam no Vault/1Password compartilhado da equipe. Peça acesso no canal interno (Discord/Slack do time) se ainda não tiver.

Variáveis críticas que **DEVEM** estar preenchidas para o servidor subir:

| Variável | Valor | Origem |
|----------|-------|--------|
| `DATABASE_URL` | pooler 6543 da Supabase (transaction mode) | Vault da equipe |
| `SUPABASE_DB_URL` | pooler 5432 da Supabase (session mode, DDL) | Vault da equipe |
| `BETTER_AUTH_SECRET` | 32 bytes random base64 | Gere localmente (ver abaixo) |
| `PAPERCLIP_INSTANCE_ID` | **exatamente** `team-shared` | Literal — não invente |

Para gerar `BETTER_AUTH_SECRET` próprio (recomendado):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> ⚠️ `PAPERCLIP_INSTANCE_ID` precisa ser literal `team-shared` — qualquer outro valor faz seu cookie de sessão divergir do resto do time e você não verá a mesma company. Ver [TROUBLESHOOTING.md § Cookie prefix divergente](TROUBLESHOOTING.md#cookie-prefix-divergente).

> 🔒 `.env.local` está no `.gitignore`. **Nunca** commit valores reais. O pre-commit hook bloqueia JWTs vazados em arquivos client-side, mas não te salva de commitar `.env.local` por engano.

## 4. Validar o ambiente com `pnpm setup`

```bash
pnpm setup
```

Esse script roda em segundos e checa:

1. Versão do Node (>=20)
2. Versão do pnpm (>=9.15.4)
3. Existência do `.env.local`
4. Vars críticas preenchidas e `PAPERCLIP_INSTANCE_ID=team-shared`
5. CLI `claude` no PATH (warning se ausente)
6. Conexão Supabase (`SELECT 1` no pooler 6543)
7. Schema Better Auth aplicado (tabela `user` existe)

Se algo falhar, `pnpm setup` imprime exatamente o que corrigir e sai com código não-zero. Para falhas comuns, ver [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## 5. Subir o servidor: `pnpm dev`

```bash
pnpm dev
```

Isso sobe o servidor Express + UI (Vite middleware mounted in-process) na porta `3100`. Acesse [http://localhost:3100](http://localhost:3100).

> ⚠️ `pnpm dev` arranca em modo `local_trusted` por padrão — o handler do Better Auth não é montado nesse modo, então o invite flow não funciona com `pnpm dev` puro. Para exercitar o fluxo completo de equipe (signup, invite, login compartilhado), use:
>
> ```bash
> PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev
> ```
>
> (Decisão registrada na Fase 2 — ver `.planning/STATE.md` 02-06.)

## 6. Aceitar invite e fazer primeiro login

A equipe inteira compartilha **uma única company** no Supabase remoto.

**Se você é o dev #1 (CEO bootstrap):** rode o script de bootstrap para criar o invite inicial. Ver `packages/db/scripts/create-auth-bootstrap-invite.ts` para argumentos exatos. **Esse passo só acontece uma vez no time inteiro.**

**Se você é o dev #2..N (caso comum):**

1. Peça um invite no canal interno do time. Você vai receber uma URL `/invite/<token>`.
2. Suba o servidor em modo `authenticated` (comando da seção 5).
3. Abra a URL do invite no browser, faça signup com email/senha (Better Auth — sem OAuth no v1).
4. Aceite o invite. Aguarde aprovação se for `pending_approval` (admin do time aprova no Company Settings).
5. Após aprovação, você é redirecionado pra company compartilhada e vê o dashboard.

> Detalhes do fluxo de invite: [doc/spec/invite-flow.md](doc/spec/invite-flow.md). Não precisa entender tudo para onboardar — basta seguir o link.

## 7. Travou em algo?

Veja **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — cobre falhas comuns:

- Windows NTFS (file locks, paths longos, CRLF)
- Stale registry em `~/.paperclip/instances/default/runtime-services/`
- Supabase no limite de conexões (`too many connections`)
- Cookie prefix divergente
- Schema desatualizado (`pnpm db:migrate` vs CI)
- `claude` CLI ausente
- `prepared statement does not exist` em pooler 6543

Se nada do troubleshooting resolver, peça ajuda no canal interno do time.

---

**Política de fork:** Esse repositório é hard fork de `paperclipai/paperclip`. Ver [CONTRIBUTING.md](CONTRIBUTING.md) e [UPSTREAM_REFERENCE.md](UPSTREAM_REFERENCE.md) — sem PRs upstream, sem merges automáticos, drift é intencional.
