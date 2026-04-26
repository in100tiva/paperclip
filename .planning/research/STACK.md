# Pesquisa de Stack — DDD (Paperclip da Equipe)

**Domínio:** Plataforma de orquestração de agentes de IA (fork hard de paperclipai/paperclip), backend Postgres-via-Supabase compartilhado entre devs, cliente local-first.
**Pesquisado:** 2026-04-25
**Confiança:** HIGH (stack do paperclip lido diretamente do `master` em github.com/paperclipai/paperclip; versões dos pacotes verificadas no registro npm em 2026-04-25; padrões Supabase/Drizzle/Better Auth verificados em docs oficiais).

---

## Resumo Executivo

Paperclip é um **monorepo pnpm** (Node 20+, TypeScript 5.7, ESM puro, `"type": "module"`) com workspaces `server`, `ui`, `cli`, `packages/db`, `packages/shared`, `packages/adapters/*`. Persistência roda hoje em **Postgres embedded** (`embedded-postgres@18.1.0-beta.16`, com patch local) acessado via **postgres-js (`postgres@3.4.5`)** + **Drizzle ORM (`drizzle-orm@0.38.4`)**, com migrations geradas por **`drizzle-kit@0.31.9`** e um runner customizado em `packages/db/src/client.ts` que reconcilia o jornal de migrations do Drizzle.

Auth é **Better Auth `1.4.18`** (não Supabase Auth) com `drizzleAdapter` apontando para tabelas próprias `user`, `session`, `account`, `verification` em `packages/db/src/schema/auth.ts`. Estado de runtime de agente vive em `agent_runtime_state` (1:1 por agente, com `session_id` e `state_json`) e `agent_task_sessions` (1:N por task, com `session_params_json` e `last_run_id` apontando para `heartbeat_runs`). API HTTP é **Express 5.1**, logs **pino 9**, validação **zod 3.24**, websockets **ws 8.19**. UI é **React 19 + Vite 6 + Tailwind 4 + Radix/shadcn + TanStack Query 5 + react-router-dom 7**.

A migração para Supabase tem **três decisões arquitetônicas críticas** que o roadmap precisa absorver:

1. **Manter Drizzle, não migrar para `supabase-js`.** A camada de dados do paperclip é dezenas de schemas Drizzle interligados (companies, agents, goals, heartbeat_runs, agent_runtime_state, etc.) que dependem de transações, joins e tipos gerados. Trocar tudo isso por chamadas REST `supabase.from('agents').select(...)` seria reescrever metade do app. Em vez disso: o backend Node continua falando Postgres direto via `postgres-js` + Drizzle, agora apontando para o connection string do Supabase (porta `6543` pooler ou `5432` direto). `supabase-js` entra **só na UI** (e somente se quisermos Realtime/Storage/RLS-baseado-em-JWT diretamente do navegador) — caso contrário a UI mantém o fluxo atual de chamar a API Express.
2. **Substituir Better Auth por Supabase Auth, ou manter Better Auth e ignorar `auth.users` do Supabase.** Os schemas são incompatíveis (`user.id` text em Better Auth × `auth.users.id` uuid em Supabase Auth). A escolha pragmática para v1 é **manter Better Auth** (preserva todo o fluxo de login/sessão/cookie já implementado, fluxo CLI, e zero-mudança na UI), aceitando o custo de não usar RLS baseado em JWT. RLS pode ser implementada por outra rota (ver decisão 3). Trocar para Supabase Auth é um milestone próprio, não algo do v1.
3. **RLS é opcional no v1 e provavelmente desnecessária.** Como todos os 5+ devs são membros confiáveis da equipe e o app só fala com o Postgres do Supabase via service-role key no servidor (nunca direto do navegador), o modelo de ameaça não exige RLS. A defesa real é a **autorização aplicacional já existente no paperclip** (membership por `companies.id`, `company_memberships`, `instance_user_roles`). RLS volta à mesa quando/se quisermos cliente direto do navegador via `supabase-js` com chave anônima.

O fork hard significa que o roadmap precisa apenas: (a) criar fork no GitHub e clonar para `D:\projetos\ddd`, (b) estender `packages/db/src/runtime-config.ts` para aceitar `mode: "supabase"` e ler `SUPABASE_DB_URL` em vez do connection string embedded, (c) gerar e aplicar todas as migrations existentes do Drizzle no projeto Supabase `bxlczioxgizgvtznukwt`, (d) modelar `agent_credentials` como nova tabela para múltiplas contas Claude por agente com seleção/troca, (e) instrumentar o adapter `claude-local` para detectar exaustão de quota e disparar troca atômica.

---

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

---

## Variáveis de Ambiente Necessárias

Criar `.env.example` adaptado (sobrescreve o do paperclip):

```dotenv
# === Database (Supabase shared) ===
# Pooled connection (use this for the server in production-like flows; pgBouncer transaction mode)
DATABASE_URL=postgres://postgres.bxlczioxgizgvtznukwt:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
# Direct connection (use ONLY for migrations — pooler doesn't support all DDL)
SUPABASE_DB_URL=postgres://postgres.bxlczioxgizgvtznukwt:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# === Supabase API (only needed if UI talks directly to Supabase) ===
SUPABASE_URL=https://bxlczioxgizgvtznukwt.supabase.co
SUPABASE_ANON_KEY=<jwt-anon>
SUPABASE_SERVICE_ROLE_KEY=<jwt-service-role>   # NEVER expose to UI; server-only

# === Better Auth ===
BETTER_AUTH_SECRET=<generated 32+ char random>
PAPERCLIP_AGENT_JWT_SECRET=<same or different 32+ char random>

# === Multi-account credential encryption ===
PAPERCLIP_CREDENTIAL_ENCRYPTION_KEY=<base64 of 32 random bytes>

# === Paperclip runtime ===
PORT=3100
SERVE_UI=true
PAPERCLIP_INSTANCE_ID=team-shared
PAPERCLIP_HOME=~/.paperclip-team

# === Logs ===
LOG_LEVEL=info
```

**Convenção da equipe:**
- `.env.local` (gitignored, por dev) sobrescreve `.env` para credenciais reais.
- `.env.example` versionado mostra todas as keys com placeholders.
- `PAPERCLIP_INSTANCE_ID=team-shared` para todos: garante que o cookie prefix do Better Auth é o mesmo entre devs (`paperclip-team-shared`), evitando conflitos quando múltiplos devs apontam para o mesmo Postgres mas têm sessões diferentes.

---

## Schema Novo: `agent_credentials` e `agent_credential_active`

Migration nova a ser gerada via drizzle-kit. Esboço do schema (em `packages/db/src/schema/agent_credentials.ts`):

```ts
import { pgTable, uuid, text, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { companies } from "./companies.js";

export const agentCredentials = pgTable(
  "agent_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    label: text("label").notNull(),                          // "claude-personal", "claude-work"
    kind: text("kind").notNull(),                            // "claude_oauth" | "claude_api_key"
    credentialCiphertext: text("credential_ciphertext").notNull(),
    credentialIv: text("credential_iv").notNull(),
    status: text("status").notNull().default("active"),      // "active" | "exhausted" | "revoked"
    priority: integer("priority").notNull().default(0),      // higher = preferred
    exhaustedAt: timestamp("exhausted_at", { withTimezone: true }),
    exhaustedReason: text("exhausted_reason"),               // "quota_5h" | "quota_weekly" | ...
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentLabelUniq: uniqueIndex("agent_credentials_agent_label_uniq").on(table.agentId, table.label),
    agentStatusIdx: index("agent_credentials_agent_status_idx").on(table.agentId, table.status),
  }),
);

export const agentCredentialActive = pgTable("agent_credential_active", {
  agentId: uuid("agent_id").primaryKey().references(() => agents.id, { onDelete: "cascade" }),
  credentialId: uuid("credential_id").notNull().references(() => agentCredentials.id, { onDelete: "restrict" }),
  switchedAt: timestamp("switched_at", { withTimezone: true }).notNull().defaultNow(),
  switchedBy: text("switched_by"),                           // "auto:quota_exhausted" | "manual:user-uuid"
});
```

**Fluxo de troca:**
1. Adapter `claude-local` detecta exaustão (HTTP 429 com header `x-anthropic-quota-reset`, ou exit code específico do CLI).
2. Servidor marca `agent_credentials.status = 'exhausted'`, `exhausted_at = now()`, `exhausted_reason = '...'`.
3. Query `SELECT * FROM agent_credentials WHERE agent_id = ? AND status = 'active' ORDER BY priority DESC, last_used_at NULLS FIRST LIMIT 1` (excluindo a current).
4. Se encontrou: UPDATE `agent_credential_active` em transação. Decifra novo credential. Retoma o agente reusando `agent_runtime_state.session_id` (Claude Code preserva contexto via `--resume <session-id>`).
5. Se não encontrou: marca agente como `paused` com `pause_reason = 'all_credentials_exhausted'` e dispara wakeup quando a primeira credencial sair de "exhausted" (job que checa `exhausted_at + reset_window < now()`).

---

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

---

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

---

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

---

## Variantes de Stack por Condição

**Se algum dev precisar trabalhar offline (sem internet):**
- Setar `PAPERCLIP_DB_MODE=embedded-postgres` no `.env.local` daquele dev.
- Rodará banco local efêmero. **Aviso**: dados não sincronizam com a equipe; é só para smoke tests.
- Manter `embedded-postgres@18.1.0-beta.16` na dependency tree por isso.

**Se quisermos UI direto-no-browser ↔ Supabase para uma feature específica (ex.: realtime de status de agente):**
- Adicionar `@supabase/supabase-js@^2.104.1` em `ui/package.json`.
- Criar `SUPABASE_URL` + `SUPABASE_ANON_KEY` no env público (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- **Necessário** habilitar RLS na tabela alvo (`agents`, por exemplo) com policy lendo `current_setting('request.jwt.claims', true)::json->>'sub'` — mas como nossa auth é Better Auth, precisaria emitir um JWT customizado e passar no header. **Trabalho não-trivial; tratar como milestone separado.**

**Se a equipe quiser reproduzir o Postgres do Supabase localmente (para testes de migration sem afetar o compartilhado):**
- `supabase init` + `supabase start` localmente cria stack docker idêntica.
- Aponte `DATABASE_URL` para `postgres://postgres:postgres@localhost:54322/postgres`.
- Rode `pnpm db:migrate`. Esse é o fluxo recomendado para PRs que mexem em schema.

**Se mais de 5 devs (escalar para 20+):**
- Connection pooler do Supabase (porta 6543) é mandatório — porta 5432 direct esgota fácil.
- Considerar `pgbouncer` no servidor Express também (`postgres({ max: 5 })`) para limitar pool por dev.

---

## Instalação

Após clonar fork:

```bash
# Pré-requisito: Node 20+ (recomendo 22 LTS), pnpm 9.15+
node --version    # >= 20
pnpm --version    # >= 9.15

# Instalar dependências do monorepo
pnpm install

# Setup .env (copiar exemplo e preencher)
cp .env.example .env
# Editar .env e preencher SUPABASE_DB_URL, BETTER_AUTH_SECRET, etc.

# Gerar tipos a partir dos schemas Drizzle (se houver mudanças)
pnpm db:generate

# Aplicar migrations no Supabase remoto (cuidado: shared!)
pnpm db:migrate

# Rodar servidor + UI em watch mode
pnpm dev:watch

# (Opcional) Inspecionar dados
pnpm exec drizzle-kit studio
```

**Pacotes novos a serem adicionados (na branch de migração):**

```bash
# UI: cliente Supabase opcional
pnpm --filter @paperclipai/ui add @supabase/supabase-js@^2.104.1

# Server: nada novo obrigatório (tudo já presente no paperclip)
# Se for usar Supabase Storage no futuro:
# pnpm --filter @paperclipai/server add @supabase/supabase-js@^2.104.1
```

**Supabase CLI (opcional, instalação fora de npm):**

```bash
# Windows (Scoop):
scoop install supabase

# macOS:
brew install supabase/tap/supabase

# Verificar
supabase --version

# Linkar com projeto remoto (uma vez por dev)
supabase login
supabase link --project-ref bxlczioxgizgvtznukwt

# Gerar types do schema atual (útil pra debug):
supabase gen types typescript --linked > packages/db/src/supabase-types.generated.ts
```

---

## Padrões de Acesso ao Banco — Checklist

- [ ] **Server**: `createDb(SUPABASE_DB_URL)` em `packages/db/src/client.ts` continua sendo a função canonical. Estender para detectar `:6543/` e passar `{ prepare: false }`.
- [ ] **Server**: nunca expor `SUPABASE_SERVICE_ROLE_KEY` para o cliente. Validar em startup que o env é server-only.
- [ ] **UI**: chamadas de dados via `fetch('/api/...')` para a API Express. Manter padrão atual.
- [ ] **UI** (se adicionar `supabase-js`): instanciar em `ui/src/lib/supabase.ts` com `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`. **Nunca** usar service-role no browser.
- [ ] **Migrations**: SEMPRE via `pnpm db:migrate` (que chama `applyPendingMigrations`). Nunca `psql` direto para alterar schema em ambiente compartilhado.
- [ ] **Backups**: rodar `scripts/backup-db.sh` (precisa wrapper para `SUPABASE_DB_URL`) antes de qualquer migration que faça `DROP` ou `ALTER COLUMN`.

---

## Fontes

- **paperclipai/paperclip @ master** (lido em 2026-04-25):
  - `package.json` — `"engines": { "node": ">=20" }`, `pnpm@9.15.4`, devDeps: typescript 5.7.3, vitest 3.0.5, playwright 1.58.2, esbuild 0.27.3.
  - `pnpm-workspace.yaml` — workspaces e exclusões.
  - `.env.example` — DATABASE_URL, PORT=3100, SERVE_UI=false, BETTER_AUTH_SECRET.
  - `packages/db/package.json` — drizzle-orm 0.38.4, drizzle-kit 0.31.9, postgres 3.4.5, embedded-postgres 18.1.0-beta.16.
  - `packages/db/src/client.ts` — driver postgres-js + drizzle/postgres-js, sem `prepare: false` (precisará patch para pooler Supabase).
  - `packages/db/src/runtime-config.ts` — modes "embedded-postgres" | "postgres", lê `PAPERCLIP_HOME`, `PAPERCLIP_INSTANCE_ID`, `.paperclip/config.json`, `.paperclip/.env`.
  - `packages/db/src/schema/auth.ts` — tabelas `user`, `session`, `account`, `verification` (Better Auth schema, **incompatível** com `auth.users` do Supabase).
  - `packages/db/src/schema/agent_runtime_state.ts` — chave estado por agente: `sessionId`, `stateJson`, `lastRunId`, contadores de tokens/custo.
  - `packages/db/src/schema/agent_task_sessions.ts` — sessões por (agent, adapter, taskKey) com `sessionParamsJson` e `sessionDisplayId` (compatível com `claude --resume`).
  - `packages/db/src/schema/agent_api_keys.ts` — armazena hash de keys por agente, mas NÃO é por-conta-de-provedor (é a key emitida pelo paperclip para clients chamarem o agente).
  - `packages/db/src/schema/agents.ts` — tem `adapterConfig: jsonb` que poderia carregar credenciais inline mas paperclip não estrutura múltiplas. Por isso a nova tabela `agent_credentials`.
  - `server/package.json` — express 5.1.0, better-auth 1.4.18, drizzle-orm 0.38.4, ws 8.19.0, zod 3.24.2, pino 9.6.0, multer 2.1.1, `@aws-sdk/client-s3` 3.888.0.
  - `server/src/auth/better-auth.ts` — `betterAuth({ adapter: drizzleAdapter(db, { provider: "pg", schema: { user: authUsers, session: authSessions, account: authAccounts, verification: authVerifications } }) })`, cookie prefix derivado de instance ID.
  - `ui/package.json` — react 19, vite 6.1, tailwindcss 4.0.7, @tanstack/react-query 5.90.21, react-router-dom 7.1.5, lexical 0.35.0, @assistant-ui/react 0.12.23.
  - `packages/adapters/claude-local/package.json` — adapter slim, sem credenciais; carrega apenas `picocolors`. Lógica de exec do CLI vive em `src/server/`. Por isso a adição precisa ser no servidor + adapter coordenados.
  - Confiança: HIGH (código canônico, último push em `master` em 2026-04-25T21:00:12Z).

- **npm registry** (consultado 2026-04-25):
  - `drizzle-orm@0.45.2` (latest), peer-required por `better-auth@1.6.9`. Paperclip usa `0.38.4`.
  - `drizzle-kit@0.31.10` (latest). Paperclip usa `0.31.9`.
  - `postgres@3.4.9` (latest). Paperclip usa `3.4.5`.
  - `@supabase/supabase-js@2.104.1` (latest 2026-04). Engine `node >= 20`.
  - `@supabase/ssr@0.10.2` (latest 2026-04). Peer `@supabase/supabase-js@^2.102.1`.
  - `better-auth@1.6.9` (latest 2026-04). Peer `drizzle-orm@^0.45.2`. Paperclip está em `1.4.18` — não atualize sem subir Drizzle junto.
  - `supabase@2.95.3` (latest CLI npm wrapper). Versão binária pode ser diferente.
  - `react@19.2.5`, `vite@8.0.10`, `typescript@5.9.3`, `tailwindcss@4.2.4`, `pino@10.3.1`, `zod@4.3.6`, `@tanstack/react-query@5.100.5`, `express@5.2.1` — todos latest. Paperclip está em majors compatíveis; subir minor é OK conforme cada caso.
  - Confiança: HIGH (registry é fonte autoritativa).

- **Supabase docs / pgBouncer behavior**:
  - Pooler porta `6543` é pgBouncer em modo `transaction`; prepared statements caem fora da transação e são incompatíveis. `postgres-js` precisa `{ prepare: false }`. Verificado em troubleshooting comum 2024–2025; comportamento estável em 2026.
  - Confiança: HIGH (comportamento documentado e replicado em milhares de projetos Supabase + postgres-js).

- **Better Auth docs**:
  - Usa `drizzleAdapter` para Postgres; provider deve ser `"pg"`. Tabelas custom mapeáveis por `schema: {...}`. Confirmado pelo código `server/src/auth/better-auth.ts:6-15`.
  - Confiança: HIGH.

- **Drizzle docs**:
  - `drizzle-orm/postgres-js` é o entrypoint para driver postgres-js; aceita instância `postgres()` direta. Migrations via `drizzle-orm/postgres-js/migrator`.
  - Confiança: HIGH.

---

*Pesquisa de stack para: fork hard de paperclipai/paperclip com Supabase remoto compartilhado e troca de contas Claude Code para a equipe.*
*Pesquisado: 2026-04-25*
