# Troubleshooting — DDD

> **Idioma:** pt-br. Onboarding em [ONBOARDING.md](ONBOARDING.md). Este doc cobre falhas comuns que travam o setup local.
>
> **Formato de cada entrada:** Sintoma → Causa → Solução. Citações apontam para arquivos do repo quando aplicável.

## Windows NTFS

**Sintoma:** `pnpm install` falha com `EBUSY: resource busy or locked` ou paths cortados (`ENAMETOOLONG`). Linhas com `\r\n` no lugar de `\n` em scripts shell.

**Causa:**
- File locks em `node_modules` quando o servidor de dev ainda está rodando ou um editor segura arquivos.
- Limit de path do Windows (260 chars) com pastas profundas em `node_modules`.
- Git auto-converte LF→CRLF em arquivos de texto se `core.autocrlf=true`.

**Solução:**

1. Garanta que nenhum processo Node está rodando:
   ```powershell
   # Bash (Git Bash):
   ./scripts/kill-dev.sh
   # PowerShell:
   Get-Process node | Stop-Process -Force
   ```
2. Habilite long paths no Git e no Windows:
   ```powershell
   git config --global core.longpaths true
   # PowerShell admin:
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```
3. Force LF para shell scripts:
   ```bash
   git config --global core.autocrlf input
   git rm --cached -r .
   git reset --hard HEAD
   ```
4. Se o problema persistir em `node_modules`, delete e reinstale:
   ```powershell
   Remove-Item -Recurse -Force node_modules
   pnpm install
   ```

***

## Stale runtime-services registry

**Sintoma:** Após `taskkill /F /T /PID <pid>` (ou kill manual no Windows), arquivos em `~/.paperclip/instances/default/runtime-services/` permanecem. Próximo `pnpm dev` reclama que serviço já está rodando ou falha por conflito de porta 3100/54329.

**Causa:** `taskkill /F` no Windows não dispara cleanup hooks do Node (sem `SIGTERM` real), então PID files e symlinks ficam órfãos. Wart conhecido — documentado em `.planning/phases/01-fork-hard-cerim-nia-de-corte/SMOKE-TEST-LOG.md`.

**Solução:**

```bash
./scripts/kill-dev.sh
```

Esse script encontra processos do paperclip dev (worktrees inclusos), mata graceful, e limpa o registry stale. Ver `scripts/kill-dev.sh` para detalhes. Se mesmo após `kill-dev.sh` o diretório persistir:

```bash
# Last resort (Windows PowerShell ou Git Bash):
rm -rf ~/.paperclip/instances/default/runtime-services/
```

***

## Supabase no limite de conexões (`too many connections`)

**Sintoma:** Connection error `FATAL: too many connections for role "postgres"` durante `pnpm dev`, `pnpm setup` ou queries do app.

**Causa:** Free tier do Supabase compartilha ~60 conexões. Cada `pnpm dev` consome até 5 conexões (pool `max: 5` configurado em `packages/db/src/client.ts:85`). Com 5 devs × 5 = 25, está OK; mas se múltiplas instâncias do servidor rodam simultaneamente no mesmo dev (ex: dois `pnpm dev` em duas pastas), o limite estoura.

**Solução:**

1. Cheque quantos `pnpm dev` você tem rodando localmente:
   ```bash
   ./scripts/kill-dev.sh --dry
   ```
2. Pergunte no canal interno do time quem mais está rodando — provavelmente alguém esqueceu uma instância subida.
3. Mate instâncias órfãs com `./scripts/kill-dev.sh`.
4. Se precisar reduzir ainda mais o footprint local, edite `packages/db/src/client.ts` (linha 85) reduzindo `max: 5` para `max: 3` — mas isso afeta concorrência do app, prefira matar instâncias.

> Ver `MIGRATION_AUDIT.md §G.1` para a justificativa do `max: 5`.

***

## Cookie prefix divergente

**Sintoma:** Você fez signup com sucesso no servidor `authenticated` mode, mas o front mostra "não logado" / não vê a company que outro dev criou. Inspecionando cookies, vê algo como `paperclip-meunome.session_token` em vez de `paperclip-team-shared.session_token`.

**Causa:** `PAPERCLIP_INSTANCE_ID` no seu `.env.local` está diferente de `team-shared`. O cookie prefix é derivado dessa var em `server/src/auth/better-auth.ts:65-71` (`deriveAuthCookiePrefix`). Se cada dev tiver um valor diferente, sessões não interoperam — cada dev fica numa "ilha" lógica.

**Solução:**

1. Edite `.env.local`:
   ```bash
   PAPERCLIP_INSTANCE_ID=team-shared
   ```
2. Rode `pnpm setup` — o check `env var` vai validar isso explicitamente.
3. Limpe os cookies antigos no browser (DevTools → Application → Cookies → delete tudo de `localhost:3100`).
4. Reinicie o servidor e faça login de novo.

> O literal `team-shared` foi validado empiricamente na Fase 2 (cookie `paperclip-team-shared.session_token`). Não invente outros valores.

***

## Schema desatualizado

**Sintoma:** Erro Drizzle ao logar ou subir o servidor: `relation "user" does not exist`, `column "X" does not exist`, ou `pnpm setup` falha em "Better Auth schema".

**Causa:** Migrations no `packages/db/src/migrations/` foram adicionadas em PRs recentes, mas ainda não foram aplicadas ao Supabase compartilhado pelo workflow `.github/workflows/db-migrate.yml`. Auto-migrations no startup estão desabilitadas (DB-02 — fail-fast com 5+ devs).

**Solução:**

1. Atualize seu repo:
   ```bash
   git pull origin main
   pnpm install
   ```
2. Verifique se o workflow já rodou:
   - GitHub → Actions → "DB Migrate (Supabase)"
   - Se ainda está running, espere terminar.
   - Se não rodou ainda (último merge sem schema change), confirme com quem fez a alteração.
3. Se o workflow falhou (improvável, mas possível): peça pra um maintainer rodar manualmente via `workflow_dispatch` (Actions → workflow → "Run workflow").
4. **NÃO** rode `pnpm db:migrate` localmente apontando pro Supabase compartilhado — viola DB-03 (apenas CI aplica). Ver `CONTRIBUTING.md §"Database Migration Policy"`.

> Para desenvolvimento offline (sem Supabase), use embedded postgres:
> ```bash
> # .env.local
> PAPERCLIP_DB_MODE=embedded-postgres
> ```

***

## `claude` CLI ausente

**Sintoma:** `pnpm setup` imprime `⚠ claude CLI não encontrado no PATH`. Ou comandos da Fase 4+ (multi-account) falham com `command not found: claude`.

**Causa:** O CLI oficial do Claude Code não está instalado, ou está em um diretório fora do PATH.

**Solução:**

Siga a instalação oficial: [https://docs.claude.com/en/docs/claude-code/setup](https://docs.claude.com/en/docs/claude-code/setup).

Após instalar, valide:

```bash
which claude     # macOS/Linux
where claude     # Windows
claude --version
```

Se o `which`/`where` retornar caminho mas `pnpm setup` ainda reclamar, o terminal pode não estar enxergando o PATH atualizado — feche e reabra o terminal.

> Aviso, não fatal: você pode operar nas Fases 1-3 sem o CLI. Ele só vira obrigatório a partir da Fase 4 (spike multi-account).

***

## `prepared statement does not exist` (pooler 6543)

**Sintoma:** Queries normalmente OK, mas intermitentemente falham com `prepared statement "sN" does not exist`. Ocorre principalmente sob concorrência ou em ambientes recém-deployados.

**Causa:** Supavisor transaction pooler (porta 6543) reusa conexões físicas entre transactions de clientes diferentes. postgres-js cacheia prepared statements por conexão lógica — quando a conexão física é trocada, o statement não existe mais. Ver `MIGRATION_AUDIT.md §A.1` (HIGH risk documentado).

**Solução já aplicada no codebase:**

`packages/db/src/client.ts` (função `buildPostgresOptions`, linhas 74-94) detecta automaticamente porta 6543 e aplica `prepare: false`:

```ts
if (port === "6543") {
  return { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 };
}
```

**Se você está vendo esse erro mesmo assim, possíveis causas:**

1. **Você criou um novo arquivo que faz `postgres(url, ...)` direto sem usar `createDb` / `createUtilitySql`.** Solução: importe a factory de `@paperclipai/db` em vez de instanciar `postgres-js` manualmente.
2. **Você passou `SUPABASE_DB_URL` (porta 5432) onde o código espera `DATABASE_URL` (porta 6543), ou vice-versa.** Cheque `.env.local` — porta 6543 é runtime, 5432 é DDL/migrations.
3. **Você adicionou `prepare: true` explicitamente em algum lugar.** Remova.

Para validar quais ports você está usando agora:

```bash
node -e "console.log(new URL(process.env.DATABASE_URL).port, new URL(process.env.SUPABASE_DB_URL).port)"
```

Esperado: `6543 5432`.

***

## Não achou seu problema?

Pergunte no canal interno do time. Se descobrir um novo problema comum, abra um PR adicionando uma nova seção aqui — todo mundo agradece.
