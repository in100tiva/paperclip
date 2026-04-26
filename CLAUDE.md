<!-- framework:project-start source:PROJECT.md -->
## Project

**DDD — Paperclip da Equipe**
<!-- framework:project-end -->

<!-- framework:stack-start source:research/STACK.md -->
## Technology Stack

## Resumo Executivo
## Stack Recomendado
### Tecnologias Core (Herdadas do Paperclip — Manter)
| Tecnologia | Versão | Propósito | Por Que Manter |
|------------|--------|-----------|----------------|
| **Node.js** | `>=20` (LTS 22 recomendado) | Runtime do servidor | Paperclip declara `"engines": { "node": ">=20" }`. Node 22 é LTS atual em 2026 e oferece melhor performance de ESM. Não há razão para divergir do upstream nessa decisão. |
| **TypeScript** | `^5.7.3` | Linguagem | Paperclip é 97.8% TS. `5.7.3` é a versão fixada no monorepo. Manter para evitar drift de types entre packages. Latest npm é `5.9.3`; só atualize junto se uma feature específica for necessária. |
| **pnpm** | `9.15.4` (declarado em `packageManager`) | Gerenciador de workspace monorepo | Paperclip usa `pnpm-workspace.yaml` com filtros customizados (`!packages/plugins/sandbox-providers/**`). npm/yarn workspaces não suportam o mesmo padrão. **Não** trocar para npm/yarn — quebra `pnpm exec tsx` e `pnpm --filter @paperclipai/server`. |
| **Express** | `^5.1.0` | Servidor HTTP | API REST do paperclip. Express 5 (saiu da fase de RC em 2024) introduz async error handling nativo. Mantém compatibilidade com middlewares existentes. |
| **Drizzle ORM** | `^0.38.4` (paperclip) | ORM TypeScript-first sobre Postgres | **Decisão chave**: manter Drizzle e NÃO substituir por `supabase-js`. Drizzle é o que define todos os schemas, gera tipos, faz joins/transações. Continuar usando `drizzle-orm/postgres-js` apontando para o connection string do Supabase. |
| **drizzle-kit** | `^0.31.9` (paperclip) | CLI de geração e migrations | Usado em `pnpm db:generate` e `pnpm db:migrate`. Continua funcionando contra Supabase sem mudanças (Supabase é Postgres "vanilla" + extensões). |
| **postgres** (postgres-js) | `^3.4.5` | Driver Postgres nativo Node | Driver subjacente do Drizzle no paperclip (`drizzle-orm/postgres-js`). Aceita string de conexão Supabase normal. **Crítico**: precisa configurar `prepare: false` quando conectado via pooler do Supabase (pgBouncer em modo transaction). |
| **Better Auth** | `1.4.18` (paperclip) | Auth library (sessões cookie + bearer + plugins) | **Manter no v1.** Substituir por Supabase Auth é trabalho grande (schemas incompatíveis, fluxo CLI já wired em Better Auth, cookie prefix `paperclip-{instanceId}` derivado da config). Better Auth funciona contra Supabase Postgres via `drizzleAdapter` sem mudanças — basta apontar Drizzle para o Supabase. |
| **React** | `^19.0.0` | UI | Paperclip já está em React 19. Latest npm é `19.2.5`; manter na major do paperclip para evitar drift do `@types/react`. |
| **Vite** | `^6.1.0` | Build/dev server da UI | Padrão do `@paperclipai/ui`. Latest npm é `8.0.10`, mas Vite 6 é estável e o config do paperclip está casado com `@vitejs/plugin-react@^4.3.4`. Não atualizar sem necessidade. |
| **Tailwind CSS** | `^4.0.7` | Styling | Tailwind 4 (estável desde fim de 2024) com `@tailwindcss/vite` plugin. Manter — qualquer downgrade quebra o `components.json` do shadcn. |
| **Radix UI / radix-ui** | `^1.4.3` (meta) + `@radix-ui/react-slot@^1.2.4` | Primitivos acessíveis | Base do shadcn/ui usado no paperclip. Não trocar. |
| **TanStack Query** | `^5.90.21` | Data fetching/cache na UI | Estado de servidor da UI — já amplamente usado para sincronizar dados do backend Express. |
| **react-router-dom** | `^7.1.5` | Roteamento SPA | React Router v7 (mode framework opcional, paperclip usa em modo SPA). |
| **zod** | `^3.24.2` | Validação de schemas em runtime | Usado em rotas Express e adapters. Manter na v3 (v4 saiu mas Better Auth 1.4.18 ainda referencia v3 internamente em peers). |
| **pino + pino-http + pino-pretty** | `^9.6.0` / `^10.4.0` / `^13.1.3` | Logging estruturado | Padrão do paperclip. Manter. |
| **ws** | `^8.19.0` | WebSocket server (heartbeats/realtime do servidor) | Paperclip implementa SSE/WS próprios. **Não** substituir por Supabase Realtime no v1 — o protocolo de heartbeat é específico do paperclip. |
| **embedded-postgres** | `^18.1.0-beta.16` | Postgres embarcado para dev local | **Manter como dependência declarada mas inativa.** O `runtime-config.ts` continua suportando `mode: "embedded-postgres"` como fallback (útil para testes offline ou rodadas sem internet). Default da nossa equipe vira `mode: "supabase"`. |
### Tecnologias Core (Novas — Adicionar para Supabase)
| Tecnologia | Versão | Propósito | Por Que Adicionar |
|------------|--------|-----------|-------------------|
| **`@supabase/supabase-js`** | `^2.104.1` | Client oficial Supabase | Usado **somente na UI** (`ui/package.json`) e somente se houver feature que precise falar direto com Supabase do navegador (Storage, Realtime, RLS-baseado-em-JWT). Na v1 com Better Auth + API Express, é opcional. Recomendamos adicionar para preparar terreno para uploads de assets via Storage. |
| **Supabase CLI** | `2.95.3` (npm), ou install nativo | Migrations remotas, geração de types, link com projeto remoto | Útil mas **não obrigatório**. Drizzle já gerencia migrations. Use Supabase CLI para: (a) `supabase link --project-ref bxlczioxgizgvtznukwt` (b) `supabase db pull` se quiser snapshot do schema atual, (c) `supabase gen types typescript --linked` se eventualmente quisermos types do Supabase para uso direto na UI. **Não** usar `supabase migration new` — isso compete com drizzle-kit; escolha um. **Nossa escolha: drizzle-kit.** |
| **`@supabase/ssr`** | `^0.10.2` | Helpers SSR para cookies | **Não usar no v1.** Faz sentido só se a UI for migrada para Next.js/Remix, o que não é o caso (Vite SPA). |
### Tecnologias Core (Novas — Para Multi-Account Swap)
| Tecnologia | Versão | Propósito | Por Que Adicionar |
|------------|--------|-----------|-------------------|
| **node:crypto (`webcrypto`)** | builtin | Criptografia simétrica para credenciais Claude | Tokens de conta Claude precisam ser cifrados em repouso. Use `crypto.subtle` com chave AES-GCM derivada de `PAPERCLIP_CREDENTIAL_ENCRYPTION_KEY` (env var, 32 bytes base64). Já há precedente no paperclip: `packages/db/src/schema/company_secret_versions.ts` armazena segredos cifrados. Reuse o helper. |
| **`@paperclipai/db`** (extensão local) | workspace:* | Schema novo `agent_credentials` | Adicionar tabela `agent_credentials` (id, agent_id, company_id, label, kind="claude_oauth"\|"claude_api_key", credential_ciphertext, credential_iv, status, exhausted_at, last_used_at, priority). E `agent_credential_active` (1:1 com agent indicando qual credencial está ativa). Migration via drizzle-kit. |
### Bibliotecas de Suporte
| Biblioteca | Versão | Propósito | Quando Usar |
|------------|--------|-----------|-------------|
| `dotenv` | `^17.0.1` (paperclip) | Carregar `.env` no Node | Já presente. Continuar usando para `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BETTER_AUTH_SECRET`, `PAPERCLIP_CREDENTIAL_ENCRYPTION_KEY`. |
| `cross-env` | `^10.1.0` | Setar env vars cross-platform em scripts npm | Já presente. Necessário porque Windows shells (devs da equipe rodam local) e Unix tratam `FOO=bar cmd` diferente. |
| `tsx` | `^4.19.2` | Executar TS direto sem compilar (dev/scripts) | Já presente. Usado em `dev-runner.ts`, `migrate.ts`, `seed.ts`. |
| `vitest` | `^3.0.5` | Test runner | Padrão do paperclip. Manter. |
| `@playwright/test` | `^1.58.2` | E2E tests | Suite e2e existente do paperclip. Manter. |
| `chokidar` | `^4.0.3` | File watching no dev | Usado pelo `dev-watch.ts`. |
| `ajv` + `ajv-formats` | `^8.18.0` / `^3.0.1` | Validação JSON Schema (configs de plugins/skills) | Usado para validar schemas dos adapters. |
| `lucide-react` | `^0.574.0` | Ícones | UI. |
| `class-variance-authority` + `clsx` + `tailwind-merge` | `^0.7.1` / `^2.1.1` / `^3.4.1` | Helpers shadcn | UI. |
| `@assistant-ui/react` | `0.12.23` | Componentes de chat (mensagens de agentes) | UI. |
| `lexical` + `@lexical/link` + `@mdxeditor/editor` | `0.35.0` / `0.35.0` / `^3.52.4` | Editor rich-text para descrições de tasks/goals | UI. |
| `@dnd-kit/*` | `^6.3.1` / `^10.0.0` / `^3.2.2` | Drag-and-drop (kanban) | UI. |
| `mermaid` | `^11.12.0` | Renderização de diagramas em markdown | UI. |
| `@aws-sdk/client-s3` | `^3.888.0` | Cliente S3 (storage de assets atual) | Server. **Considerar substituir por Supabase Storage no v2** — Supabase oferece Storage S3-compatível na mesma infra; reduz uma dependência externa. Não tocar no v1. |
| `multer` | `^2.1.1` | Upload multipart no Express | Server. Aceita Buffer; pode plugar tanto em S3 quanto em Supabase Storage. |
| `sharp` | `^0.34.5` | Processamento de imagens (logos de companies) | Server. Manter. |
| `dompurify` + `jsdom` | `^3.3.2` / `^28.1.0` | Sanitização de HTML | Server (logs/markdown rendering server-side). |
| `open` | `^11.0.0` | Abrir browser do CLI | CLI tool. Manter. |
| `detect-port` | `^2.1.0` | Achar porta livre no dev | Server. |
| `picocolors` | `^1.1.1` | Cores de terminal | Adapters/CLI. |
### Ferramentas de Desenvolvimento
| Ferramenta | Propósito | Notas |
|------------|-----------|-------|
| **Supabase CLI** (binário nativo, não pacote npm) | `supabase link`, `supabase db pull`, `supabase gen types`, `supabase status` | Instalar via Scoop (Windows) ou Homebrew. **Não** invocar `supabase migration new` ou `supabase db reset` em ambiente compartilhado — isso reseta o banco da equipe. Use só para introspection e geração de types. |
| **`scripts/dev-runner.ts`** (interno paperclip) | Sobe servidor + UI + watch em paralelo via tsx | Já existe. Vai precisar de patch trivial: hoje sobe embedded-postgres se `mode: "embedded-postgres"`; com Supabase o passo de spin-up vira no-op (apenas valida conexão). |
| **`packages/db/src/migrate.ts`** (interno paperclip) | Aplica migrations Drizzle | Já existe. Roda `applyPendingMigrations(connectionString)` — funciona contra Supabase sem mudança porque é SQL Postgres puro. |
| **`scripts/backup-db.sh`** (interno paperclip) | Backup pg_dump | Útil para snapshot antes de migrations destrutivas. Vai precisar de wrapper que use `SUPABASE_DB_URL` e exporte para arquivo local datado. |
| **PostgreSQL client** (`psql`) | Queries ad-hoc, debugging RLS | Instalar localmente. Connection string do Supabase aceita `psql` direto. |
| **drizzle-kit studio** (`pnpm exec drizzle-kit studio`) | UI web para inspecionar schema/dados | Útil para debug local. Aponta para `DATABASE_URL`. |
| **TypeScript Language Server** | Type-check em tempo real | Padrão de qualquer setup TS, mas vale lembrar: o monorepo tem `tsconfig.base.json` na raiz com `references`. VSCode multi-root workspace é recomendado. |
## Variáveis de Ambiente Necessárias
# === Database (Supabase shared) ===
# Pooled connection (use this for the server in production-like flows; pgBouncer transaction mode)
# Direct connection (use ONLY for migrations — pooler doesn't support all DDL)
# === Supabase API (only needed if UI talks directly to Supabase) ===
# === Better Auth ===
# === Multi-account credential encryption ===
# === Paperclip runtime ===
# === Logs ===
- `.env.local` (gitignored, por dev) sobrescreve `.env` para credenciais reais.
- `.env.example` versionado mostra todas as keys com placeholders.
- `PAPERCLIP_INSTANCE_ID=team-shared` para todos: garante que o cookie prefix do Better Auth é o mesmo entre devs (`paperclip-team-shared`), evitando conflitos quando múltiplos devs apontam para o mesmo Postgres mas têm sessões diferentes.
## Schema Novo: `agent_credentials` e `agent_credential_active`
## Compatibilidade de Versões — Pontos de Atenção
| Pacote A | Compatível Com | Notas |
|----------|----------------|-------|
| `drizzle-orm@0.38.4` | `drizzle-kit@0.31.x` | Versões do paperclip. Latest é `drizzle-orm@0.45.2` + `drizzle-kit@0.31.10`, mas Better Auth 1.6.x peer-requer `drizzle-orm@^0.45.2`. Subir Drizzle obriga subir Better Auth também. **Decisão v1: não subir.** |
| `better-auth@1.4.18` | `drizzle-orm@^0.38.x` | Versão fixada do paperclip. Manter. |
| `postgres@3.4.5` (postgres-js) | Supabase pooler porta 6543 | **Crítico**: passar `prepare: false` ao construir o cliente quando usar pooler. Se usar porta 5432 (direct), pode deixar default. Hoje o paperclip faz `postgres(url)` em `client.ts:48` sem options — vai precisar de ramo: `if (url.includes(":6543/")) postgres(url, { prepare: false })`. |
| `embedded-postgres@18.1.0-beta.16` | patch local em `patches/` | Patch específico aplicado via pnpm `patchedDependencies`. Manter dependência mas inativa (mode `supabase`). |
| `@supabase/supabase-js@2.104.1` | React 18 ou 19 | Compatível com a UI React 19 do paperclip. |
| `react@^19.0.0` | `react-router-dom@^7.1.5`, `@tanstack/react-query@^5.90.21` | Combo já validado pelo paperclip. |
| `tailwindcss@^4.0.7` | `@tailwindcss/vite@^4.0.7`, `vite@^6.1.0` | Tailwind 4 requer Vite 5+; combo paperclip OK. |
| `node@>=20` | `pnpm@9.15.4` | Sem fricção. Recomendo Node 22 LTS para devs. |
## Alternativas Consideradas
| Recomendado | Alternativa | Quando Usar a Alternativa |
|-------------|-------------|---------------------------|
| **Drizzle ORM mantido** apontando para Supabase Postgres direto | Migrar tudo para `supabase-js` REST API | Nunca para este projeto. `supabase-js` REST é ótimo para apps frontend-first com schemas simples; paperclip tem dezenas de tabelas com FKs, transações multi-tabela, triggers (futuros). Reescrever apagaria meses de trabalho do upstream. |
| **Better Auth mantido** com `drizzleAdapter` em Supabase Postgres | Substituir por **Supabase Auth** (`auth.users`) | Usar Supabase Auth se: (a) precisarmos de magic links/OAuth gerenciado sem rolar nosso próprio, (b) quisermos RLS baseada em `auth.uid()` no Postgres direto do navegador. Custo: reescrever o schema `auth.ts` do paperclip, refazer fluxo de login, refazer o pacote `cli_auth_challenges`, e migrar usuários existentes. **Faça em milestone separado.** |
| **postgres-js (`postgres@3.x`)** como driver | `node-postgres` (`pg@8.x`) | Use `pg` se precisar de listen/notify para feature de realtime alternativa. Paperclip já está padronizado em `postgres-js` e Drizzle suporta os dois — não trocar sem motivo forte. |
| **Drizzle migrations** (drizzle-kit) | **Supabase migrations** (`supabase/migrations/*.sql` + `supabase db push`) | Use Supabase migrations se a equipe quiser GUI do Supabase Studio ditando o schema. Custo: drizzle-kit deixa de regenerar SQL e os types. **Não misturar os dois.** Stick com drizzle-kit; importe schema para Supabase com `pnpm db:migrate`. |
| **Storage S3 externo (atual)** | **Supabase Storage** | Migrar para Supabase Storage no v2 — reduz uma conta AWS, e Supabase Storage tem API S3-compatível (drop-in `@aws-sdk/client-s3` apontando para o endpoint do Supabase). v1 manter como está. |
| **Express 5** | Fastify, Hono | Trocar não traz benefício mensurável e quebra middleware customizado do paperclip. |
| **WebSocket próprio (`ws`)** | **Supabase Realtime** | Usar Supabase Realtime se quisermos broadcast leve de eventos do banco (mudança em `agents.status`) para múltiplos browsers de devs simultaneamente. Não substitui o WS de heartbeat (que é protocolo proprietário paperclip↔adapters). Adicionar como complemento, não substituto. |
## O Que NÃO Usar
| Evitar | Por Que | Usar Em Vez Disso |
|--------|---------|-------------------|
| **`@supabase/auth-helpers-*`** (qualquer pacote `auth-helpers`) | Deprecated pelo Supabase desde 2024 em favor de `@supabase/ssr`. Tutoriais antigos ainda referenciam. | `@supabase/ssr@^0.10.x` se precisar de SSR (não é nosso caso); senão, nada. |
| **Prisma** | Reescrever o schema do paperclip de Drizzle → Prisma é meses de trabalho com zero ganho. Better Auth tem adapter Prisma também, mas paperclip já está em Drizzle. | Continuar com Drizzle. |
| **TypeORM** | Mesmo motivo. E TypeORM tem problemas conhecidos de migrations e query builder em projetos grandes. | Drizzle. |
| **Supabase migrations CLI** simultaneamente com drizzle-kit | Os dois sistemas escrevem em locais diferentes (`supabase/migrations/` × `packages/db/src/migrations/`) e podem divergir. Fonte de bugs de produção quando um dev aplica via CLI Supabase e outro via drizzle-kit. | Padronizar em **drizzle-kit como única fonte de verdade**. Documentar isso explicitamente no README do fork. |
| **`pg` v8** (node-postgres) | Paperclip está em `postgres-js`. Misturar drivers no mesmo processo é fonte de bugs de pool exhaustion. | Continuar com `postgres@^3.4.x`. |
| **Supabase Auth no v1** | Schema incompatível com `auth.ts` atual; migrar usuários é work + risco; OAuth não está no escopo conforme `PROJECT.md` linha 35 ("OAuth fica para depois"). | Manter Better Auth + email/senha. Migrar para Supabase Auth em milestone próprio. |
| **RLS habilitada no v1 sem JWT do Supabase Auth** | Sem `auth.uid()` resolúvel (porque a auth é Better Auth), políticas RLS teriam que usar GUC custom (`current_setting('app.current_user_id')`), o que é frágil e exige `SET LOCAL` em cada conexão. Sem ganho real (server-only). | Aplicar autorização aplicacional via middlewares Express + checks por `companyId` (já existente). RLS habilitada no v2 quando/se sair Supabase Auth. |
| **`embedded-postgres` em produção compartilhada** | Era a justificativa do banco antigo; manter como dependência só para fallback dev offline. | Default `mode: "supabase"` no `runtime-config.ts` da equipe. |
| **Cookie session do Better Auth com `useSecureCookies: true` em local HTTP** | `paperclip:` em http://localhost vai falhar para setar cookie sem `disableSecureCookies: true`. | Ativar `disableSecureCookies` quando `PAPERCLIP_PUBLIC_URL` começa com `http://` (paperclip já faz isso em `better-auth.ts`). |
| **Push direto para `master` do upstream** | Fork hard escolhido em `PROJECT.md` decisão 1; não há merge upstream. | Criar fork no GitHub `org/ddd-paperclip` (ou similar) e remover remote `upstream`. |
## Variantes de Stack por Condição
- Setar `PAPERCLIP_DB_MODE=embedded-postgres` no `.env.local` daquele dev.
- Rodará banco local efêmero. **Aviso**: dados não sincronizam com a equipe; é só para smoke tests.
- Manter `embedded-postgres@18.1.0-beta.16` na dependency tree por isso.
- Adicionar `@supabase/supabase-js@^2.104.1` em `ui/package.json`.
- Criar `SUPABASE_URL` + `SUPABASE_ANON_KEY` no env público (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- **Necessário** habilitar RLS na tabela alvo (`agents`, por exemplo) com policy lendo `current_setting('request.jwt.claims', true)::json->>'sub'` — mas como nossa auth é Better Auth, precisaria emitir um JWT customizado e passar no header. **Trabalho não-trivial; tratar como milestone separado.**
- `supabase init` + `supabase start` localmente cria stack docker idêntica.
- Aponte `DATABASE_URL` para `postgres://postgres:postgres@localhost:54322/postgres`.
- Rode `pnpm db:migrate`. Esse é o fluxo recomendado para PRs que mexem em schema.
- Connection pooler do Supabase (porta 6543) é mandatório — porta 5432 direct esgota fácil.
- Considerar `pgbouncer` no servidor Express também (`postgres({ max: 5 })`) para limitar pool por dev.
## Instalação
# Pré-requisito: Node 20+ (recomendo 22 LTS), pnpm 9.15+
# Instalar dependências do monorepo
# Setup .env (copiar exemplo e preencher)
# Editar .env e preencher SUPABASE_DB_URL, BETTER_AUTH_SECRET, etc.
# Gerar tipos a partir dos schemas Drizzle (se houver mudanças)
# Aplicar migrations no Supabase remoto (cuidado: shared!)
# Rodar servidor + UI em watch mode
# (Opcional) Inspecionar dados
# UI: cliente Supabase opcional
# Server: nada novo obrigatório (tudo já presente no paperclip)
# Se for usar Supabase Storage no futuro:
# pnpm --filter @paperclipai/server add @supabase/supabase-js@^2.104.1
# Windows (Scoop):
# macOS:
# Verificar
# Linkar com projeto remoto (uma vez por dev)
# Gerar types do schema atual (útil pra debug):
## Padrões de Acesso ao Banco — Checklist
- [ ] **Server**: `createDb(SUPABASE_DB_URL)` em `packages/db/src/client.ts` continua sendo a função canonical. Estender para detectar `:6543/` e passar `{ prepare: false }`.
- [ ] **Server**: nunca expor `SUPABASE_SERVICE_ROLE_KEY` para o cliente. Validar em startup que o env é server-only.
- [ ] **UI**: chamadas de dados via `fetch('/api/...')` para a API Express. Manter padrão atual.
- [ ] **UI** (se adicionar `supabase-js`): instanciar em `ui/src/lib/supabase.ts` com `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`. **Nunca** usar service-role no browser.
- [ ] **Migrations**: SEMPRE via `pnpm db:migrate` (que chama `applyPendingMigrations`). Nunca `psql` direto para alterar schema em ambiente compartilhado.
- [ ] **Backups**: rodar `scripts/backup-db.sh` (precisa wrapper para `SUPABASE_DB_URL`) antes de qualquer migration que faça `DROP` ou `ALTER COLUMN`.
## Fontes
- **paperclipai/paperclip @ master** (lido em 2026-04-25):
- **npm registry** (consultado 2026-04-25):
- **Supabase docs / pgBouncer behavior**:
- **Better Auth docs**:
- **Drizzle docs**:
<!-- framework:stack-end -->

<!-- framework:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- framework:conventions-end -->

<!-- framework:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- framework:architecture-end -->

<!-- framework:workflow-start source:framework defaults -->
## framework Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a framework command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/quick` for small fixes, doc updates, and ad-hoc tasks
- `/debug` for investigation and bug fixing
- `/execute-phase` for planned phase work

Do not make direct repo edits outside a framework workflow unless the user explicitly asks to bypass it.
<!-- framework:workflow-end -->



<!-- framework:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- framework:profile-end -->
