# Fase 2: Migração de Storage para Supabase - Contexto

**Coletado:** 2026-04-26
**Status:** Pronto para planejamento
**Modo:** Auto-gerado (decisões já travadas em PROJECT.md + research + .env.local — discuss não acrescentaria)

<domain>
## Limite da Fase

Substituir Postgres embedded pelo Supabase remoto (`bxlczioxgizgvtznukwt`) como único backend de estado da equipe, mantendo Better Auth funcional contra o Postgres do Supabase. Auditoria de acoplamentos (LISTEN/NOTIFY, advisory locks, prepared statements) precede o swap real para evitar quebras silenciosas em Supavisor pooler.

Cobre os requisitos: INFRA-01..06, DB-01..05, AUTH-01..05 (16 requisitos no total).

</domain>

<decisions>
## Decisões de Implementação

### Conexão Supabase (TRAVADAS — validadas empiricamente em 2026-04-26)

- **Hostname do pooler:** `aws-1-sa-east-1.pooler.supabase.com` (não `aws-0-` — projeto criado em 2026-04-26 usa infra Supavisor v2)
- **Username pooler:** `postgres.bxlczioxgizgvtznukwt` (project ref como sufixo obrigatório)
- **Direct connection NÃO funciona neste ambiente:** `db.{ref}.supabase.co:5432` requer IPv4 add-on (paid tier) ou IPv6. Free tier sem IPv6 nativo no Windows local → usar pooler para tudo, inclusive DDL.
- **DATABASE_URL** = pooler `:6543` (transaction mode) com `prepare: false` no postgres-js — para runtime do app
- **SUPABASE_DB_URL** = pooler `:5432` (session mode) — para Drizzle migrations (DDL precisa de session, não transaction)
- Pool: `max: 5`, `idle_timeout: 20` por instância dev (5+ devs × 5 = 25 conexões; bem dentro do limite free de ~60)

### Auth (TRAVADAS — em PROJECT.md)

- **Manter Better Auth** com schema próprio (`user`/`session`/`account`/`verification` text-id) rodando no Postgres do Supabase — NÃO migrar para Supabase Auth no v1
- **RLS minimal/opcional v1** — sem `auth.uid()` resolúvel; autorização aplicacional via membership por `companyId`
- Service-role key apenas no servidor (validar via pre-commit hook detectando `eyJ...` em arquivos client-side / sem prefixo `VITE_`)
- Cookie prefix via `PAPERCLIP_INSTANCE_ID=team-shared` (já no `.env.local`)

### Migrations (TRAVADAS — research)

- **Drizzle-kit é fonte única de verdade** — NUNCA usar `supabase migration new` em paralelo
- **Auto-migrations no startup desabilitadas** — startup falha rápido se schema desatualizado (preserva semântica fail-fast)
- **GitHub Actions é único caminho de `pnpm db:migrate`** em merge para main (PRs com schema requerem aprovação)
- **Estratégia de baseline:** Se as 71 migrations existentes do paperclip não rodarem cleanly contra Supabase (devido a conflitos com schema `auth` interno do Supabase, extensions diferentes, etc.), regenerar como single baseline migration. Se rodarem cleanly, manter como estão. **Decidir empiricamente durante execução** — começar tentando aplicar as 71 e ver o que quebra.
- Embedded Postgres permanece como fallback opt-in via env var (não default)

### Pre-commit Hook (TRAVADO)

- Detectar `eyJ` (JWT prefix) em arquivos cliente-side (`ui/src/**`, `*.tsx`, `*.jsx`)
- Detectar prefixo `VITE_` aplicado a vars que contenham `SERVICE_ROLE` ou `SECRET`
- Implementação: simple-git-hooks ou husky — escolha do planejador

### Discrição do Claude

- Estrutura exata de `MIGRATION_AUDIT.md` (template simples — uma linha por uso, com mitigação)
- Mecanismo exato de "auto-migrations desabilitadas" (env var? código removido? assert no startup?)
- Implementação do pre-commit hook (qual ferramenta, qual regex exata)
- Estrutura do GitHub Actions workflow (qual versão do Node, cache pnpm, etc.)

</decisions>

<code_context>
## Insights do Código Existente

### Ativos do paperclip (importados na Fase 1)

- `packages/db/src/client.ts` — factory drizzle+postgres-js. Ponto único de mudança para `prepare: false`.
- `packages/db/src/runtime-config.ts` — resolve `DATABASE_URL` ou cai para embedded. Privilegiar `DATABASE_URL` Supabase aqui.
- `packages/db/src/schema/` — 28+ tabelas, incluindo `auth.ts` (Better Auth) com text-IDs. NÃO mexer.
- `packages/db/migrations/` — 71 migrations Drizzle existentes. Tentar aplicar ao Supabase; se falhar, regenerar baseline.
- `server/src/auth/better-auth.ts` — Better Auth config. Garantir cookie prefix usa `PAPERCLIP_INSTANCE_ID`.
- `.env.example` — atualizar com novas vars.

### Já preparado

- `.env.local` populado e validado contra Supabase (DATABASE_URL + SUPABASE_DB_URL conectam OK)
- `.gitignore` cobre `.env.local`, `.env.*.local`, `.env.development`, `.env.production`
- `BETTER_AUTH_SECRET` gerado (32 bytes random base64) — não usar `paperclip-dev-secret`

### Padrões Estabelecidos (paperclip)

- Drizzle ORM: `drizzle/migrations` ou `packages/db/migrations` para migrations geradas
- Connection management: postgres-js com pool implícito; `prepare: false` adicionado quando porta = 6543
- Better Auth: `drizzleAdapter` provider `pg`, schema injetado via `packages/db`

### Pontos de Integração

- `server/src/app.ts` — provavelmente onde o startup do DB ocorre; auto-migrations devem ser reviewed aqui
- `pnpm db:migrate` script no `package.json` — driver para CI/CD pipeline

</code_context>

<specifics>
## Ideias Específicas

- **Wart documentado da Fase 1:** Stale service registry em `~/.paperclip/instances/default/runtime-services/` sobrevive a `taskkill /T /F`. Documentar uso de `scripts/kill-dev.sh` no TROUBLESHOOTING.md (Fase 3) — não é escopo da Fase 2.
- **Pooler hostname descoberto:** `aws-1-sa-east-1` (não documentado em Supabase docs públicas para sa-east-1 ainda — descoberto empiricamente). Anotar em MIGRATION_AUDIT.md como "achado da migração".
- **Free tier limit:** ~60 conexões compartilhadas. Com 5 devs × 5 conexões = 25, OK. Se time crescer, considerar Pro plan.
- **Smoke test E2E (criterion #1):** Dev A faz signup → cria company → dev B em outra máquina faz signup com email diferente → vê a mesma company que A criou. Requer ambos os devs estarem cadastrados na mesma `company` (nem sempre default — pode precisar de flow de invite).

</specifics>

<deferred>
## Ideias Adiadas

- Setup completo de TROUBLESHOOTING.md → Fase 3 (TEAM-05)
- Setup script `pnpm setup` → Fase 3 (TEAM-03)
- Onboarding/invite de 5+ devs → Fase 3 (TEAM-01)
- RLS defensivo opcional → v2 milestone (RLS-01)
- Migração para Supabase Auth → v2 milestone (AUTH2-*)

</deferred>
