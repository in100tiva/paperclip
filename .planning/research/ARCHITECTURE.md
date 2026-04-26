# Pesquisa de Arquitetura

**Domínio:** Fork de plataforma de orquestração de agentes IA (paperclip) com backend compartilhado em Supabase + troca multi-conta Claude Code
**Pesquisado:** 2026-04-25
**Confiança:** HIGH para a estrutura do paperclip (lido diretamente do repo `paperclipai/paperclip@master`); MEDIUM-HIGH para o desenho de fork (apoiado em padrões oficiais Supabase/Drizzle e na superfície real do código).

## Sumário Executivo

Paperclip já possui uma arquitetura **monorepo pnpm** clara, com Postgres como única fonte de verdade, Drizzle como camada de acesso, **better-auth** para autenticação e um sistema de adaptadores plugáveis por provedor (`claude_local`, `codex_local`, `cursor_local`, etc.). O **estado de execução de cada agente já é checkpointed em tabelas dedicadas** (`agent_runtime_state`, `agent_task_sessions`, `heartbeat_runs`) — o paperclip foi explicitamente desenhado para rodar de forma resumível.

O fork muda **três peças** da arquitetura, todas localizadas:

1. **Camada de banco** (`packages/db`): trocar embedded Postgres por Supabase (alterar `runtime-config.ts` + `client.ts` para apontar para `DATABASE_URL` da Supavisor pooler com `prepare:false`).
2. **Camada de auth** (`server/src/auth/better-auth.ts` + tabelas `auth.ts`): substituir better-auth por **Supabase Auth** (validar JWT do Supabase em middleware de actor; remover better-auth handler).
3. **Adapter Claude Code** (`packages/adapters/claude-local/src/server/execute.ts`): introduzir conceito de "Claude Account" — um diretório `~/.claude` swappable por conta. Persistir mapping account→credentials via `company_secrets` ou nova tabela `claude_accounts`, e injetar `CLAUDE_CONFIG_DIR` por execução.

O resto do paperclip (UI, services, schemas de domínio) **permanece intacto** — o trabalho é cirúrgico, não reescrita.

---

## Arquitetura Padrão (Paperclip Atual — Linha de Base)

### Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ui/  (React + Vite)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  pages/  │  │components│  │   api/   │  │ context/ │             │
│  └────┬─────┘  └─────┬────┘  └────┬─────┘  └────┬─────┘             │
│       │              │            │              │                   │
│       └──────────────┴────────────┴──────────────┘                   │
│                            │  (REST `/api/*` + WebSocket live-events)│
├────────────────────────────┼─────────────────────────────────────────┤
│                          server/  (Express + tsx)                    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ middleware/  (httpLogger, actorMiddleware, boardMutationGuard)│    │
│  └──────────────────────────────────────────────────────────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ routes/  │  │services/ │  │adapters/ │  │  auth/   │             │
│  │ (REST    │←→│ (domain  │←→│(provider │  │(better-  │             │
│  │  HTTP)   │  │  logic)  │  │  shims)  │  │  auth)   │             │
│  └──────────┘  └─────┬────┘  └────┬─────┘  └────┬─────┘             │
│                      │             │             │                   │
│                      ↓             ↓             ↓                   │
├──────────────────────┴─────────────┴─────────────┴───────────────────┤
│                    packages/db  (Drizzle + postgres-js)              │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ schema/*.ts  (75+ tabelas)   client.ts   migrate.ts          │    │
│  │                              runtime-config.ts (resolve URL) │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ↓                                       │
├──────────────────────────────┴───────────────────────────────────────┤
│   Embedded Postgres (default) OR external `DATABASE_URL`             │
│   (data dir: ~/.paperclip/instances/<id>/db)                         │
└──────────────────────────────────────────────────────────────────────┘

                       External agent CLIs (out-of-band)
                  ┌──────────────────────────────────────┐
                  │  ~/.claude  ~/.codex  ~/.cursor  ... │
                  │  (creds, sessions, models per host)  │
                  └──────────────────────────────────────┘
```

### Responsabilidades dos Componentes

| Componente | Responsabilidade | Implementação Real |
|------------|------------------|--------------------|
| `ui/` | Board UI React. Não fala com Postgres direto — chama `/api/*`. | Vite + React Router; `ui/src/api/` clientes HTTP; `ui/src/context/` providers de seleção de empresa/usuário. |
| `server/src/routes/` | Camada HTTP. Validação de payload, mapeamento erro→status, autorização company-scoped. | Express Routers por agregado: `companies.ts`, `agents.ts`, `issues.ts`, `projects.ts`, `auth.ts`, `adapters.ts`, etc. |
| `server/src/services/` | Lógica de domínio. Agrega Drizzle, aplica invariantes (single-assignee, atomic checkout, budget hard-stop). | ~100 arquivos `.ts`. `heartbeat.ts` orquestra runs de agente; `agents.ts` CRUD + revisões; `secrets.ts` cifragem; `budgets.ts` hard-stop. |
| `server/src/middleware/auth.ts` (`actorMiddleware`) | Resolve "actor" da request: usuário humano (sessão better-auth) OU agente (bearer `agent_api_keys`) OU board api key. | Anexa `req.actor` para downstream. Fan-out: board → full-control; agent → restrito ao próprio company. |
| `server/src/auth/better-auth.ts` | Login email/senha, sessão por cookie, JWT para agentes locais. | `betterAuth({ database: drizzleAdapter(db, …) })`. Tabelas `user`, `session`, `account`, `verification`. |
| `server/src/adapters/registry.ts` | Registro estático de provedores. Cada adapter expõe contrato `ServerAdapterModule` (`execute`, `testEnvironment`, `sessionCodec`, `listSkills`, `getQuotaWindows`, …). | Importa `@paperclipai/adapter-claude-local/server`, `…codex-local…`, etc. + plugin loader externo (`buildExternalAdapters`) para Hermes-style. |
| `packages/adapters/<name>/src/server/execute.ts` | Spawna o CLI do provedor (process adapter) ou faz HTTP (gateway adapter). Captura stdout/stderr stream-JSON, extrai `usage`, `session_id`, custo, falhas (login required, retry-after, max-turns). | Per-adapter. Para `claude_local`: lê `CLAUDE_CONFIG_DIR` ou `~/.claude` para credenciais OAuth. |
| `packages/db/src/client.ts` | Cria `db = drizzle(postgres(url), { schema })`. | Driver: `postgres` (postgres-js). Sem `prepare:false` na config padrão (assumido embedded). |
| `packages/db/src/runtime-config.ts` | Resolve **onde** o Postgres está: env `DATABASE_URL`, `~/.paperclip/instances/<id>/.env`, `~/.paperclip/instances/<id>/config.json`, ou modo `embedded-postgres`. | Sem `DATABASE_URL` → embedded. Com → external. Hoje cobre o caminho que precisamos. |
| `packages/db/src/schema/` | 75+ tabelas Drizzle. Tudo company-scoped (FK `company_id`). Tabelas-chave para o fork: `agent_runtime_state`, `agent_task_sessions`, `heartbeat_runs`, `company_secrets`, `agent_api_keys`. | Migrations versionadas em `packages/db/src/migrations/` + journal `meta/_journal.json`. |
| `packages/shared/` | Tipos, constantes, validators (zod), API path constants — **única fonte de verdade compartilhada** entre `ui` e `server`. | Regra dura do AGENTS.md §5: alterar schema → atualizar `db` + `shared` + `server` + `ui`. |
| `packages/adapter-utils/` | Tipos/utilidades compartilhadas entre adaptadores: `ServerAdapterModule`, `AdapterExecutionContext`, `parseObject`, `runAdapterExecutionTargetProcess`. | Inclui `getAdapterSessionManagement` para política de compactação de sessão por adapter. |

### Onde o Acesso ao Banco Vive

**Centralizado, com camada de service.** Padrão real observado:

- `routes/*.ts` chama `services/*.ts` — nunca Drizzle direto.
- `services/*.ts` importa `import type { Db } from "@paperclipai/db"` e tabelas (`agents`, `heartbeatRuns`, …) e executa Drizzle queries.
- `Db` é injetado nos serviços (factory pattern em `services/index.ts`).
- Toda mutação cruza `logActivity()` (audit trail em `activity_log`).
- Adapters **não** tocam DB — eles recebem `AdapterExecutionContext` já hidratado e retornam `AdapterExecutionResult` que `heartbeatService` persiste.

Implicação para fork: o ponto de troca para Supabase é **somente** `packages/db` (`client.ts` + `runtime-config.ts` + drizzle config). Nada de service quebra.

### Como os Provedores de Agente São Integrados

**Híbrido: built-in + plugin externo.**

- Cada adaptador é um pacote npm separado (`@paperclipai/adapter-claude-local`, etc.) com subpath exports `/server`, `/cli`, `/ui`.
- `server/src/adapters/registry.ts` importa estaticamente os built-ins e os registra com `type` string (`"claude_local"`, `"codex_local"`, …).
- Plugins externos (ex: `hermes-paperclip-adapter`) são registrados via `~/.paperclip/adapter-plugins.json` e carregados em runtime por `buildExternalAdapters()`.
- O contrato `ServerAdapterModule` é estável: `execute`, `testEnvironment`, `sessionCodec`, `listSkills`, `syncSkills`, `models`, `listModels`, `getQuotaWindows`, `agentConfigurationDoc`, `supportsLocalAgentJwt`, `instructionsPathKey`.
- O serviço **`heartbeatService`** (`server/src/services/heartbeat.ts`) é o **único caller de `getServerAdapter(adapterType).execute(ctx)`**. É lá que o agente é executado, métricas são lidas, custo é registrado, e `agent_runtime_state` é atualizado.

### Como Sessões/Estado de Agente Já São Rastreados

**Já existe estrutura de checkpointing pronta — não precisamos inventar.**

Tabela `agent_runtime_state` (PK = `agent_id`):
- `session_id` (text) — id de sessão do provedor (ex: claude session_id) para retomada.
- `state_json` (jsonb) — estado opaco persistido por adapter.
- `last_run_id` (uuid) — referência ao último heartbeat run.
- `total_input_tokens` / `total_output_tokens` / `total_cached_input_tokens` / `total_cost_cents` — telemetria acumulada.
- `last_error` (text) — último erro observado.

Tabela `agent_task_sessions` (UNIQUE: company_id + agent_id + adapter_type + task_key):
- Mantém **uma sessão por (agente, tarefa)**. Quando o agente trabalha em múltiplas tarefas, cada uma tem sua sessão Claude paralela.
- `session_params_json`, `session_display_id`, `last_run_id`.

Tabela `heartbeat_runs` (event log de execuções):
- `session_id_before` / `session_id_after` — captura mudança de sessão dentro do run.
- `usage_json`, `result_json`, `context_snapshot`.
- `liveness_state`, `next_action`, `continuation_attempt` — para reanimar agentes parados.
- `process_pid`, `process_group_id` — para matar processos órfãos.

**O caminho de retomada já existe**: `heartbeatService.execute()` lê `agent_runtime_state.session_id` antes do run, passa para o adapter via `AdapterExecutionContext`, e grava o `session_id_after` retornado. Para troca de conta, o que precisamos é **manter a session_id consistente entre contas** (ou aceitar perda de sessão e começar nova) e injetar credenciais diferentes.

---

## Arquitetura do Fork (Deltas Cirúrgicos)

### Visão Geral do Sistema (Pós-Fork)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ui/  (React + Vite) — DEV LOCAL POR USUÁRIO                         │
│  + @supabase/supabase-js client (login + sessão)                     │
│  + JWT do Supabase enviado em Authorization: Bearer no /api/*        │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │  (mesma URL: localhost:3100/api)
┌──────────────────────────────────┴──────────────────────────────────┐
│  server/  (Express)  — DEV LOCAL POR USUÁRIO                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ middleware/auth.ts: ALTERADO                                  │    │
│  │   - Remover resolveBetterAuthSession                          │    │
│  │   - Adicionar resolveSupabaseSession (verify JWT via JWKS)    │    │
│  │   - actor.userId ← supabase user.id (UUID)                    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                            │
│  │ routes/  │  │services/ │  │adapters/ │  (inalterados em ~95%)    │
│  └──────────┘  └─────┬────┘  └────┬─────┘                            │
│                      │             │                                  │
│                      ↓             ↓                                  │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ services/claude-accounts.ts  (NOVO)                          │    │
│  │   - listAccounts(companyId, userId)                          │    │
│  │   - selectActiveAccount(agentId)                             │    │
│  │   - rotateOnQuotaExhausted(agentId, runId)                   │    │
│  │   - resolveCredentialDir(accountId) → path para CLAUDE_CONFIG_DIR │
│  └──────────────────────────────────────────────────────────────┘    │
│                      │                                                │
│                      ↓ injeta CLAUDE_CONFIG_DIR no adapter ctx        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ adapters/claude-local/server/execute.ts: PATCH               │    │
│  │   - aceita ctx.config.claudeConfigDir (override por run)     │    │
│  │   - propaga para spawn env                                   │    │
│  │   - na detecção de quota exhausted, marca o run com          │    │
│  │     errorCode='quota_exhausted' → heartbeat reagenda c/ next │    │
│  │     account (ver run-continuations + scheduledRetryAt)       │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │  postgres://supavisor pooler
                                   │  (prepare:false em transaction mode)
┌──────────────────────────────────┴──────────────────────────────────┐
│  packages/db/  — ALTERADO (cliente + config)                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ client.ts: createDb(url) com { prepare: false }              │    │
│  │ runtime-config.ts: privilegiar DATABASE_URL Supabase         │    │
│  │ schema/auth.ts: REMOVER tabelas better-auth (substituídas    │    │
│  │   por auth.users do Supabase, mas via FK lógica — não        │    │
│  │   modelada em Drizzle)                                       │    │
│  │ schema/claude_accounts.ts: NOVO                              │    │
│  │ schema/agent_account_bindings.ts: NOVO                       │    │
│  │ migrations/: gerar nova baseline (não compatível com         │    │
│  │   migrations existentes do paperclip)                        │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────┴──────────────────────────────────┐
│  Supabase Project bxlczioxgizgvtznukwt (REMOTO COMPARTILHADO)        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  auth.users  │  │   public.*   │  │  Row Level Security      │   │
│  │  (Supabase)  │  │ (drizzle-    │  │  (per company_membership)│   │
│  └──────────────┘  │  managed)    │  └──────────────────────────┘   │
│                    └──────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘

         Cada dev na sua máquina:                  Equipe inteira:
         ~/.paperclip/instances/default/           1 Supabase
         + N diretórios CLAUDE_CONFIG_DIR          1 banco compartilhado
         (1 por conta Claude do dev)               5+ devs simultâneos
```

### Mudanças Por Camada

#### 1. `packages/db/` — Trocar Backend de Postgres

**Onde a mudança aterrissa:**

- **`packages/db/src/runtime-config.ts`**: simplificar — eliminar caminho `embedded-postgres`. Resolver apenas `DATABASE_URL` (Supabase Supavisor URL) com fallback para `.paperclip/.env`. Aceitar `SUPABASE_URL` e `SUPABASE_ANON_KEY` para futura inicialização do cliente Supabase JS no servidor (caso queiramos usar Supabase Storage/Realtime).
- **`packages/db/src/client.ts`**: alterar `createDb(url)` para passar `{ prepare: false }` ao `postgres()`. Isso é **obrigatório** quando se usa Supavisor em modo transaction; sem isso, queries com prepared statements falham aleatoriamente. Também adicionar `max` baixo (5–10) por instância dev para não estourar pool da Supabase.
- **`packages/db/drizzle.config.ts`**: trocar para usar `DATABASE_URL` direto da Supabase. Continuar emitindo migrations Drizzle SQL.
- **`packages/db/src/schema/auth.ts`**: **deletar**. As tabelas `user`/`session`/`account`/`verification` do better-auth saem — Supabase Auth gerencia `auth.users` no schema `auth` (privado, não Drizzle).
- **`packages/db/src/schema/index.ts`**: remover exports `authUsers`, `authSessions`, `authAccounts`, `authVerifications`.
- **`packages/db/src/migrations/`**: gerar **nova baseline** (drizzle-kit generate). As migrations originais do paperclip não rodam diretamente no Supabase porque (a) referenciam `extension`s que precisam ser pré-criadas, (b) `auth` schema do Supabase já existe, (c) RLS precisa ser aplicado pós-criação.
- **`packages/db/src/schema/companies.ts`**: substituir o tipo de `created_by_user_id` (text livre) por `uuid` referenciando `auth.users(id)` via `references` "external" (Drizzle suporta cross-schema FK manual com `sql`raw).

**Configuração de conexão recomendada:**

```typescript
// packages/db/src/client.ts (depois)
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index.js";

export function createDb(url: string) {
  const sql = postgres(url, {
    prepare: false,           // OBRIGATÓRIO para Supavisor transaction pooler
    max: 10,                  // pool por instância local de dev
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzlePg(sql, { schema });
}
```

**Por quê duas URLs de Supabase importam:**
- **Session pooler** (porta 5432): suporta prepared statements, conexões long-lived. Ideal para o servidor paperclip que é stateful.
- **Transaction pooler** (porta 6543): para serverless. Cada dev rodando local **deve usar session mode** (mais simples, menos surpresas com `prepare`).

Recomendação: usar a Connection String **direta** (não pooler) ou **session pooler**. Documentar isso no README.

#### 2. Auth — Substituir better-auth por Supabase Auth

**Onde a mudança aterrissa:**

- **`server/src/auth/better-auth.ts`**: deletar. Substituir por **`server/src/auth/supabase.ts`** novo que:
  1. Lê `SUPABASE_URL` e `SUPABASE_JWT_SECRET` (legacy HS256) ou JWKS (`SUPABASE_URL/auth/v1/.well-known/jwks.json` para RS256/ES256 — o padrão atual da Supabase).
  2. Expõe `resolveSupabaseSession(req): Promise<{ userId, email } | null>` que verifica JWT do header `Authorization: Bearer <jwt>` ou cookie `sb-<project-ref>-auth-token`.
  3. Usa `jose` (já dependência transitiva) ou `@supabase/supabase-js` server-side.
- **`server/src/middleware/auth.ts`** (`actorMiddleware`): trocar a chamada `resolveBetterAuthSession` pela nova `resolveSupabaseSession`. O resto (resolução de actor → board/agent/user, populando `req.actor`) **permanece**.
- **`server/src/routes/auth.ts`**: simplificar. Better-auth montava `/api/auth/*` handlers (signup, signin, signout, session). Com Supabase, **o frontend** fala direto com `https://bxlczioxgizgvtznukwt.supabase.co/auth/v1/*`. O backend não precisa expor essas rotas. Manter apenas `/api/auth/me` (retorna user atual + memberships) por conveniência.
- **`ui/src/api/`**: instalar `@supabase/supabase-js`. Criar `ui/src/lib/supabase.ts` exportando o client. Criar `ui/src/context/SupabaseAuthProvider.tsx` que wrappea `supabase.auth.onAuthStateChange` e injeta o `access_token` via header em todos os fetches do `ui/src/api/`.
- **`ui/src/pages/Login.tsx`**: novo. Email + senha → `supabase.auth.signInWithPassword`.

**Modelagem de identidade:**
- Antes: `authUsers.id` (text — better-auth gera `uuid` em string).
- Depois: `auth.users.id` (uuid, schema `auth` privado da Supabase).
- Tabelas de domínio (`company_memberships`, `company_secrets`, `instance_user_roles`, `feedback_data_sharing_consent_by_user_id`, `principal_permission_grants`, `invites`) que armazenam `text("user_id")` precisam migrar para `uuid("user_id")` referenciando `auth.users(id)` (FK cross-schema). **Total de tabelas afetadas:** ~10–12 (varredura linear na schema/).

**Por que NÃO modelar `auth.users` em Drizzle:**
- Supabase gerencia esse schema via triggers, hooks, GoTrue. Modelar via Drizzle quebra ao primeiro upgrade da Supabase.
- Em vez disso: schema Drizzle só toca `public.*`. FKs para `auth.users` declaradas em SQL raw na migration (`REFERENCES auth.users(id) ON DELETE CASCADE`) e tipadas como `uuid` do lado Drizzle.

#### 3. Multi-Account Claude Code Swap

**Modelo conceitual:**

Uma "Claude Account" = um `~/.claude` directory (ou pasta arbitrária pelo `CLAUDE_CONFIG_DIR`) contendo `.credentials.json` (OAuth token), config e cache de sessões. **Cada conta tem seu próprio quota window** (5h/diário/semanal Claude Pro/Max).

A rotação funciona assim:
1. Agente está rodando com `account_id=A`. Adapter detecta quota exhausted (sinal: stream-JSON com `result.subtype="error_quota"` ou stderr matching, ou `quota.ts` retornando `windows[*].remaining===0`).
2. `heartbeatService` marca o run com `errorCode="quota_exhausted"` e popula `scheduledRetryAt = quotaResetTime`.
3. Antes do retry, `claudeAccountsService.rotateOnQuotaExhausted(agentId)` escolhe próxima conta com quota disponível.
4. Próximo run lança o adapter com `CLAUDE_CONFIG_DIR=/path/to/account_B/.claude`.
5. Como `agent_runtime_state.session_id` é uma string opaca do CLI, **a sessão NÃO é portável entre contas** (sessões Claude são por-token). O comportamento correto: limpar `session_id` ao trocar conta → Claude inicia nova sessão, mas o paperclip já tem `issue_continuation_summary` (documento persistente) que serve de "memória" entre sessões. Esse mecanismo já existe.

**Onde o credencial vive:**

Três opções discutidas, escolha apoiada por análise:

| Opção | Onde | Prós | Contras |
|-------|------|------|---------|
| **A: Filesystem do dev (referência)** | `~/.paperclip/claude-accounts/<account_id>/` (pasta usada como `CLAUDE_CONFIG_DIR`). Tabela `claude_accounts` no Supabase só guarda metadata (label, ownerUserId, lastUsedAt). | Credencial nunca sai da máquina do dev (zero risco de vazar). Compatível com `claude login` do CLI nativo. | Cada dev precisa fazer `claude login` 1x por conta na sua máquina. Não é "verdadeiramente compartilhado". |
| **B: Supabase com cifragem** | Tabela `claude_accounts.encrypted_credentials` (bytea), cifrada com chave por-empresa em `company_secrets`. Servidor decifra na hora e escreve em `/tmp/.claude-XXXX/` antes de spawnar. | Conta cadastrada 1x, todos os devs usam. | Tokens OAuth Claude expiram e fazem refresh. Refresh-token escrito de volta no FS local não sincroniza para Supabase. **Quebra rapidamente.** |
| **C: Híbrido — secrets do paperclip** | Reusar `company_secrets` existente para guardar paths/labels. Credencial real continua local. | Sem novas tabelas. | Confunde semântica de `company_secrets` (que é genérico). |

**Recomendado: Opção A.** Justificativa: tokens OAuth Claude têm refresh dinâmico (CLI escreve `.credentials.json` com novo `access_token` a cada renovação). Manter sincronização com Supabase é frágil. Localmente, cada dev faz `claude login` por conta; o registro no Supabase serve apenas para **descobrir quais contas existem** e **qual está ativa por agente**. A "compartilhamento" da conta é informacional, não credencial-level.

**Schema novo:**

```typescript
// packages/db/src/schema/claude_accounts.ts
export const claudeAccounts = pgTable("claude_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  ownerUserId: uuid("owner_user_id").notNull(),  // FK auth.users em SQL raw
  label: text("label").notNull(),                // "claude-pro-pessoal", "claude-max-time"
  // path relativo dentro de ~/.paperclip/claude-accounts/. Cada dev usa sua máquina:
  configDirSlug: text("config_dir_slug").notNull(),
  status: text("status").notNull().default("active"),  // active | exhausted | disabled
  // janela de quota mais recentemente vista (snapshot, atualizado pelo adapter):
  lastQuotaWindowsJson: jsonb("last_quota_windows_json").$type<QuotaWindow[]>(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  exhaustedUntil: timestamp("exhausted_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  companyOwnerIdx: index("claude_accounts_company_owner_idx").on(t.companyId, t.ownerUserId),
  companyStatusIdx: index("claude_accounts_company_status_idx").on(t.companyId, t.status),
}));

// Binding agente → conta atualmente ativa
export const agentAccountBindings = pgTable("agent_account_bindings", {
  agentId: uuid("agent_id").primaryKey().references(() => agents.id),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  activeAccountId: uuid("active_account_id").references(() => claudeAccounts.id),
  rotationPolicy: text("rotation_policy").notNull().default("auto"),  // auto | manual
  lastRotatedAt: timestamp("last_rotated_at", { withTimezone: true }),
}, (t) => ({
  companyAgentIdx: index("agent_account_bindings_company_agent_idx").on(t.companyId, t.agentId),
}));
```

**Onde o swap dispara (gatilho):**

- **Detecção em-banda**: `packages/adapters/claude-local/src/server/parse.ts` já tem `detectClaudeLoginRequired`, `extractClaudeRetryNotBefore`. Adicionar `detectClaudeQuotaExhausted` que olha por padrões "5-hour limit reached", "weekly limit reached" no stream-JSON / stderr.
- **Detecção fora-de-banda**: `claude-local/src/server/quota.ts` (função `getQuotaWindows`) é chamado periodicamente. Quando `windows[*].remaining===0`, marcar `claudeAccounts.status='exhausted'` + `exhaustedUntil`.
- **Trigger de swap**: novo método `claudeAccountService.selectActiveAccount(agentId)` chamado por `heartbeatService.execute()` **antes** de cada run:
  ```
  account = bindings[agentId].activeAccountId
  if account.status === 'exhausted' && now < account.exhaustedUntil:
      candidates = claudeAccounts.where(companyId=X, status='active', remaining>0)
      pick by lastUsedAt asc (round-robin)
      bindings[agentId].activeAccountId = picked.id
      activityLog.write({ type: 'claude_account_rotated', from, to, reason })
  ```
- **Injeção no adapter ctx**: `heartbeatService` resolve `configDirSlug → /home/user/.paperclip/claude-accounts/<slug>` e passa via `ctx.config.claudeConfigDir`. `execute.ts` propaga para `env.CLAUDE_CONFIG_DIR`.

**Onde estado de execução in-flight persiste durante swap:**
- O run **atual** (em `heartbeat_runs`) é encerrado (status `failed`, errorCode `quota_exhausted`).
- `agent_runtime_state.session_id` é **limpo** na rotação (sessão Claude da conta antiga é inacessível pela conta nova).
- `issue_continuation_summary` (documento persistente) é o que carrega contexto entre sessões. Já existe no paperclip e é regenerado a cada continuation.
- Próximo run pega `agent_runtime_state` zerado de session, lê `issue_continuation_summary`, e instrui o agente novo: "você é o assistente continuando o trabalho. Aqui está o resumo: …".

---

## Estrutura de Projeto Recomendada (Pós-Fork)

Mantemos a estrutura monorepo do paperclip. Os deltas estão marcados.

```
ddd/                            # diretório do fork (clone de paperclip)
├── server/
│   └── src/
│       ├── auth/
│       │   └── supabase.ts            # NOVO (substitui better-auth.ts)
│       ├── middleware/
│       │   └── auth.ts                # PATCH: actorMiddleware usa supabase
│       ├── services/
│       │   ├── heartbeat.ts           # PATCH: resolve account, injeta CLAUDE_CONFIG_DIR
│       │   ├── claude-accounts.ts     # NOVO: rotação, quota tracking
│       │   └── ... (todos os outros inalterados)
│       ├── routes/
│       │   ├── auth.ts                # SIMPLIFICAR: só /me
│       │   ├── claude-accounts.ts     # NOVO: CRUD de contas
│       │   └── ... (todos os outros inalterados)
│       └── adapters/
│           └── ... (registry inalterado)
├── ui/
│   └── src/
│       ├── lib/
│       │   └── supabase.ts            # NOVO: client Supabase JS
│       ├── context/
│       │   └── SupabaseAuthProvider.tsx  # NOVO
│       ├── pages/
│       │   ├── Login.tsx              # NOVO
│       │   ├── ClaudeAccounts.tsx     # NOVO
│       │   └── ... (existentes inalterados em majority)
│       └── api/
│           └── client.ts              # PATCH: injeta Bearer JWT
├── packages/
│   ├── db/
│   │   └── src/
│   │       ├── client.ts              # PATCH: prepare:false
│   │       ├── runtime-config.ts      # PATCH: só DATABASE_URL Supabase
│   │       ├── migrate.ts             # PATCH: aplicar RLS pós-migration
│   │       ├── schema/
│   │       │   ├── auth.ts            # DELETAR
│   │       │   ├── claude_accounts.ts        # NOVO
│   │       │   ├── agent_account_bindings.ts # NOVO
│   │       │   └── index.ts           # PATCH: exports
│   │       └── migrations/
│   │           ├── 0000_baseline.sql  # NOVO: regen baseline + RLS policies
│   │           └── meta/
│   ├── shared/                        # mostly inalterado; types das novas tabelas
│   ├── adapters/
│   │   └── claude-local/
│   │       └── src/
│   │           └── server/
│   │               ├── execute.ts     # PATCH: aceita claudeConfigDir override
│   │               └── parse.ts       # PATCH: detectClaudeQuotaExhausted
│   ├── adapter-utils/                 # inalterado
│   ├── plugins/                       # inalterado
│   └── mcp-server/                    # inalterado
├── supabase/                          # NOVO: dir de meta-config
│   ├── migrations/                    # opcional: SQL puro p/ Supabase CLI
│   ├── seed.sql                       # opcional: dados iniciais
│   └── config.toml                    # opcional: declaração local supabase
├── doc/                               # docs do paperclip (ler, não substituir)
├── .planning/                         # NOSSO planning
├── .claude/                           # NOSSO framework
├── .env.example                       # PATCH: variáveis Supabase
├── package.json                       # PATCH: add @supabase/supabase-js, jose
└── pnpm-workspace.yaml                # inalterado
```

### Justificativa da Estrutura

- **Mantemos `server/`, `ui/`, `packages/` separados:** AGENTS.md §3 descreve o monorepo; alterá-lo quebraria contracts entre `db`/`shared`/`server`/`ui` que o §5 exige sincronizados. O fork é cirúrgico.
- **Tudo de Supabase no `packages/db`:** o ponto único de troca de backend. Services e UI ficam agnósticas (continuam falando Drizzle).
- **`server/src/auth/supabase.ts` paralelo a `better-auth.ts`:** facilita git diff e rollback se descobrirmos bloqueador. Após estabilizar, deletar `better-auth.ts`.
- **`services/claude-accounts.ts` e não distribuído:** rotação é uma operação atômica (read-modify-write em `agent_account_bindings` + audit log + leitura de `claude_accounts`). Centralizar reduz risco de race.
- **`supabase/` no root:** convenção da Supabase CLI (`supabase init`). Permite usar `supabase db push` / `supabase migration new` para gerenciar RLS e funções de trigger separadamente das migrations Drizzle. Drizzle gera CREATE TABLE; Supabase CLI aplica RLS via SQL puro.

---

## Padrões Arquiteturais

### Padrão 1: Drizzle Schema-Driven com Supabase RLS Sobreposto

**O que é:** Drizzle define tabelas em TypeScript, gera migrations SQL. Após as migrations rodarem, **um segundo passo aplica políticas RLS** via SQL puro (idealmente via Supabase CLI ou um arquivo `migrations/post/0000_rls.sql`).

**Quando usar:** Sempre. RLS é a única coisa que torna seguro compartilhar 1 DB entre 5+ devs com clientes que poderiam, em tese, falar com Supabase direto.

**Trade-offs:**
- ✅ Tipos Drizzle continuam acurados.
- ✅ RLS policies vivem em SQL versionado.
- ❌ Drizzle não conhece RLS — bugs de policy não aparecem em typecheck.
- ❌ Precisa lembrar de re-aplicar policies quando criar tabela nova.

**Exemplo:**

```sql
-- packages/db/src/migrations/post/0001_rls.sql
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_select_member ON companies FOR SELECT
  USING (id IN (
    SELECT company_id FROM company_memberships
    WHERE principal_type = 'user' AND principal_id::uuid = auth.uid()
      AND status = 'active'
  ));

CREATE POLICY companies_modify_admin ON companies FOR UPDATE
  USING (id IN (
    SELECT company_id FROM company_memberships
    WHERE principal_type = 'user' AND principal_id::uuid = auth.uid()
      AND status = 'active' AND membership_role IN ('owner', 'admin')
  ));

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- ... mesmo padrão para todas as 75+ tabelas
```

**Decisão importante:** o **server paperclip continua usando service_role key** (bypass RLS) e aplica autorização company-scoped no código (como já faz). RLS protege apenas se o frontend falar Supabase **direto** — útil para Realtime subscriptions, mas o caminho principal é via servidor.

### Padrão 2: Server Como Único Caller de service_role

**O que é:** O backend Node usa `DATABASE_URL` direto (com role `postgres` ou role customizado equivalente a service_role — bypass RLS). Toda autorização vem de `actorMiddleware` + checks em services.

O frontend usa `@supabase/supabase-js` apenas para auth (login, refresh, logout) e — opcionalmente — para Realtime subscriptions em tabelas onde RLS está bem testada.

**Quando usar:** Sempre que o backend é stateful e tem identidade própria. É o caso aqui.

**Trade-offs:**
- ✅ Uma única camada de autorização para auditar (services).
- ✅ Toda mutação passa por `logActivity()` (já existe).
- ❌ RLS torna-se "defense in depth" e não primary control.

### Padrão 3: Adapter Como Black Box, Estado Como Diff Persistido

**O que é:** Adapters não conhecem a DB. Recebem `AdapterExecutionContext` (input) e retornam `AdapterExecutionResult` (output). `heartbeatService` traduz output em diffs de tabelas.

**Quando usar:** É o padrão **já estabelecido** do paperclip. Mantemos.

**Trade-offs:**
- ✅ Adapters podem ser pacotes externos (plugin model).
- ✅ Testáveis sem DB.
- ❌ Adapters não podem reagir a estado histórico (precisam recebê-lo via `context`).

**Exemplo (existente, mantido):**

```typescript
// heartbeatService chama:
const adapter = getServerAdapter(agent.adapterType);  // claude_local | codex_local | …
const result: AdapterExecutionResult = await adapter.execute({
  runId,
  agent,
  config: {
    ...agent.adapterConfig,
    claudeConfigDir: resolvedAccountDir,   // NOSSO PATCH
  },
  context: {
    sessionId: runtimeState.sessionId,
    issueContinuationSummary: continuationDoc,
  },
});
// heartbeat persiste:
await db.update(agentRuntimeState).set({
  sessionId: result.meta?.sessionIdAfter,
  totalInputTokens: sql`total_input_tokens + ${result.usage?.inputTokens ?? 0}`,
  // ...
}).where(eq(agentRuntimeState.agentId, agent.id));
```

### Padrão 4: Quota-Aware Round Robin para Multi-Account

**O que é:** Conta com `status='active'` E `(exhaustedUntil IS NULL OR exhaustedUntil < now())` E `lastUsedAt` mais antiga é selecionada. Após uso, `lastUsedAt = now()`.

**Quando usar:** Quando há mais de 1 conta para um agente. Caso 1 conta: bypass.

**Trade-offs:**
- ✅ Distribui load entre contas, evita exaustão prematura de uma só.
- ✅ Determinístico, fácil de auditar.
- ❌ Não considera tipo de tarefa (poderia ir para conta com modelo cached relevante).

---

## Fluxo de Dados

### Fluxo: Login do Usuário

```
[Dev abre http://localhost:3100]
    ↓
[ui/Login.tsx] → supabase.auth.signInWithPassword({email, password})
    ↓
[Supabase Auth API] → retorna { access_token, refresh_token, user }
    ↓
[ui localStorage] persiste tokens (gerenciado por @supabase/supabase-js)
    ↓
[ui faz GET /api/companies] com Authorization: Bearer <access_token>
    ↓
[server/middleware/auth.ts] resolveSupabaseSession(req)
    → verifica JWT (jose verify com JWKS do Supabase)
    → req.actor = { type: 'user', userId: jwt.sub, email }
    ↓
[server/routes/companies.ts] handler
    → consulta companies WHERE id IN (
        SELECT company_id FROM company_memberships
        WHERE principal_id = req.actor.userId AND status='active'
      )
    ↓
[ui renderiza lista]
```

### Fluxo: Agente Roda Com Swap de Conta

```
[Heartbeat tick / wakeup request]
    ↓
[heartbeatService.execute(agentId)]
    ↓
[claudeAccountService.selectActiveAccount(agentId)]
    → bindings = SELECT * FROM agent_account_bindings WHERE agent_id=…
    → if bindings.activeAccount.status='exhausted' AND exhaustedUntil>now():
         pick next active account (round-robin by lastUsedAt)
         UPDATE bindings SET activeAccountId=picked.id, lastRotatedAt=now()
         INSERT activity_log (type='claude_account_rotated', …)
         IF rotated: UPDATE agent_runtime_state SET session_id=NULL  -- nova conta = nova sessão
    ↓
[heartbeat busca runtimeState, continuationSummary, executionWorkspace]
    ↓
[heartbeat resolve configDir]
    accountDir = ~/.paperclip/claude-accounts/<account.configDirSlug>
    ctx.config.claudeConfigDir = accountDir
    ↓
[claude-local/server/execute.ts]
    spawn `claude-cli` com env.CLAUDE_CONFIG_DIR=accountDir
    stream stdout (JSON) → parse usage, session_id, errors
    ↓
[stream-JSON detecta "5-hour limit reached"]
    parse.ts → detectClaudeQuotaExhausted(line) === true
    execute.ts retorna { error: 'quota_exhausted', resetAt: detected_time }
    ↓
[heartbeatService recebe resultado]
    → UPDATE heartbeat_runs SET status='failed', errorCode='quota_exhausted',
       scheduledRetryAt=detected_time
    → UPDATE claude_accounts SET status='exhausted', exhaustedUntil=detected_time
       WHERE id=<account_used>
    → próximo tick do heartbeat: rotaciona (loop volta ao topo)
    ↓
[próxima execução: nova conta selecionada]
    → session_id limpo → Claude inicia nova sessão
    → continuation summary injetado no prompt → agente "lembra" do trabalho
    → run prossegue
```

### Fluxo: Time Inteiro Vê Mesmo Estado

```
[Dev A em sua máquina]                  [Dev B em outra máquina]
    ↓                                       ↓
[localhost:3100/api/issues GET]        [localhost:3100/api/issues GET]
    ↓                                       ↓
[server local A]                       [server local B]
    ↓                                       ↓
[postgres-js → Supavisor pooler]       [postgres-js → Supavisor pooler]
    ↓                                       ↓
    └───────────┬───────────────────────────┘
                ↓
        [Supabase Postgres único]
        public.issues, public.companies, …
                ↓
        [retorna rows]
    ┌───────────┴───────────────────────────┐
    ↓                                       ↓
[ui A renderiza]                       [ui B renderiza]
    
[A cria issue → INSERT public.issues]
    ↓ (B atualiza ao próximo poll/realtime)
[Supabase Realtime broadcast (opcional)]
    → ui B recebe via supabase.channel('issues').on('postgres_changes', …)
    → invalida cache local
```

### Gerenciamento de Estado (UI)

```
[SupabaseAuthProvider]      → user, accessToken
    ↓ (subscribe)
[CompanyContext]            → companyId selecionado
    ↓
[React Query / SWR]         → cache de /api/* responses
    ↓
[Componentes de página]     → renderiza
    ↑
[Mutations] → POST /api/* → invalidate query cache
```

---

## Considerações de Escala

| Escala | Ajustes |
|--------|---------|
| 1–10 devs (atual) | Connection direta ou session pooler Supabase. `max:10` por instância dev. Sem cuidados especiais. |
| 10–50 devs | Migrar conexão server para **transaction pooler** (Supavisor port 6543) e garantir `prepare:false` em todas as queries. Habilitar PGbouncer-aware fallback no postgres-js (`fetch_types: false`). |
| 50+ devs / multi-tenant | Considerar splittear em projetos Supabase por team OU manter compartilhado mas adicionar rate-limit por user no servidor. RLS torna-se obrigatório (não defense-in-depth). |

### Prioridades de Escala

1. **Primeiro gargalo: pool de conexões Supabase.** Plano free tem ~60 conexões compartilhadas. 5 devs × `max:10` = 50, já no limite. **Mitigação:** começar com `max:5`, monitorar via Supabase dashboard. Subir para Pro plan se necessário.
2. **Segundo gargalo: write contention em `agent_runtime_state`.** Múltiplos agentes do mesmo company atualizando `total_*_tokens` concorrentemente. Drizzle update já usa `sql\`total + ${n}\`` (atomic). Sem ação imediata necessária.
3. **Terceiro gargalo: storage de `heartbeat_runs` e `activity_log`.** Crescem rápido. Mitigação tardia: TTL/archive job mensal.

---

## Anti-Padrões

### Anti-Padrão 1: Modelar `auth.users` no Drizzle

**O que as pessoas fazem:** Criar `pgTable("users", { ... })` no schema Drizzle apontando para `auth.users` da Supabase, ou pior, duplicar dados.
**Por que está errado:** Supabase aplica triggers e altera esse schema entre releases. Você quebra ao primeiro upgrade. Drizzle não tem como expressar "esta tabela existe em outro schema gerenciado externamente".
**Faça isto em vez disso:** Mantenha schema Drizzle só em `public`. Para FKs, declare em SQL raw na migration: `REFERENCES auth.users(id) ON DELETE CASCADE`. No TypeScript, tipo é só `uuid`.

### Anti-Padrão 2: Confiar Apenas em RLS Para Autorização do Servidor

**O que as pessoas fazem:** Usar `anon` key no servidor, deixar RLS ser a única defesa, assumir que cada query "passa pelo Supabase Auth".
**Por que está errado:** Servidor é stateful, tem identidade de actor agregada (user OU agent OU board). RLS confia em `auth.uid()`, mas o servidor está executando trabalho em nome de agentes/board sem JWT. Não funciona.
**Faça isto em vez disso:** Servidor usa **service_role** key (ou role postgres direto). Autorização vem de `actorMiddleware` + service-level company-scoping (já existe no paperclip). RLS é defense-in-depth para o caso "frontend ataca Supabase direto".

### Anti-Padrão 3: Sincronizar Credenciais Claude OAuth no Banco

**O que as pessoas fazem:** Tentar guardar `.credentials.json` cifrado no Postgres para "compartilhar conta".
**Por que está errado:** O CLI Claude faz token refresh dinâmico e sobrescreve o arquivo local. Você precisaria interceptar todo write nesse arquivo, cifrar, persistir no Supabase, sincronizar nas outras máquinas. Frágil. Vaza tokens.
**Faça isto em vez disso:** Cada dev faz `claude login` na sua máquina por conta. O Supabase guarda só metadata (label, slug, status, exhaustedUntil). Compartilhamento é informacional.

### Anti-Padrão 4: Esquecer `prepare: false` no postgres-js

**O que as pessoas fazem:** Configuração default (prepared statements ligados) com Supabase Supavisor em transaction mode.
**Por que está errado:** Falhas silenciosas, errors aleatórios "prepared statement does not exist" depois de algum tempo.
**Faça isto em vez disso:** Sempre `postgres(url, { prepare: false })` quando o pooler é Supavisor transaction. Documentar isso prominentemente no `.env.example`.

### Anti-Padrão 5: Migrations Embedadas Que Não Conhecem RLS

**O que as pessoas fazem:** Drizzle gera `CREATE TABLE foo`, esquece de habilitar RLS. Tabela fica acessível via `anon` key no Supabase REST API.
**Por que está errado:** Buraco de segurança silencioso. Supabase exibe warning, mas Drizzle não.
**Faça isto em vez disso:** **Pós-migration hook** que aplica `ALTER TABLE … ENABLE ROW LEVEL SECURITY` para toda tabela no schema `public`. Manter checklist em `doc/DATABASE-RLS.md` com policy por tabela.

---

## Pontos de Integração

### Serviços Externos

| Serviço | Padrão de Integração | Notas |
|---------|----------------------|-------|
| Supabase Postgres | postgres-js direto via DATABASE_URL (session pooler ou direct). `prepare: false`. | Drizzle ORM como camada lógica. Não usar PostgREST do Supabase para o servidor. |
| Supabase Auth (GoTrue) | Frontend: `@supabase/supabase-js`. Backend: verifica JWT via JWKS endpoint da Supabase (`<url>/auth/v1/.well-known/jwks.json`). | Custos zero — JWT verify offline. |
| Supabase Realtime (opcional) | Frontend: `supabase.channel(name).on('postgres_changes', filter, callback)`. RLS aplica filtro. | Adicionar só após v1 estável. Não confiar para fluxos críticos. |
| Supabase Storage (opcional) | Para `assets`/`document_revisions` se quisermos sair do FS local. | Adiar — paperclip já tem `storage/` service abstrato. |
| Claude Code CLI | Process spawn com `CLAUDE_CONFIG_DIR=<path>` env. CLI lê credentials do dir, escreve refresh tokens lá. | Cada conta = 1 dir. Já é o padrão suportado pelo CLI. |
| Outros agentes (Codex, Cursor, Gemini, OpenCode) | Mesmo padrão — process spawn. Cada um tem seu próprio dir de config. | Multi-account swap fica fora de escopo para esses no v1. |

### Limites Internos

| Limite | Comunicação | Notas |
|--------|-------------|-------|
| ui ↔ server | REST `/api/*` JSON + WebSocket `live-events` | Bearer JWT do Supabase no header. |
| server.routes ↔ server.services | Chamada de função direta (in-process) | Services são singletons em `services/index.ts`. |
| server.services ↔ server.adapters | `getServerAdapter(type).execute(ctx)` interface estável | Adapters são packages npm. |
| server.services ↔ packages.db | Drizzle queries direto. `Db` injetado. | Single source of truth. |
| server ↔ Supabase Postgres | postgres-js connection (long-lived) | Pool gerenciado pelo postgres-js. |
| ui ↔ Supabase Auth | `@supabase/supabase-js` (HTTPS) | Não passa pelo server local. |

---

## Build Order Suggestion (Implicações Para Roadmap)

Esta ordem minimiza retrabalho e estabelece "seams" antes que decisões fiquem caras.

### Fase 1 — Fork Hard + Smoke Test (Sem Alterações)

1. Clonar `paperclipai/paperclip` para `D:\projetos\ddd`, remover `.git`, `git init`, primeiro commit "fork base".
2. `pnpm install`, `pnpm dev` com embedded Postgres default. Confirmar que UI sobe em `localhost:3100`.
3. **Critério de saída:** screenshot do dashboard rodando localmente.

**Por quê primeiro:** se o paperclip não buildar limpo na máquina de cada dev (Windows + NTFS tem gotchas conhecidos do AGENTS.md §11), descobrimos antes de mexer em qualquer coisa.

### Fase 2 — Trocar Backend de Banco (sem mudar auth ainda)

1. Em `packages/db/src/client.ts`: adicionar `prepare:false`, `max:5`.
2. Em `packages/db/src/runtime-config.ts`: simplificar para só DATABASE_URL.
3. Criar Supabase project se ainda não criado (já está: `bxlczioxgizgvtznukwt`).
4. Deletar tabelas auth do Drizzle schema (`schema/auth.ts`, exports em `schema/index.ts`). **Cuidado:** quebrará `server/src/auth/better-auth.ts` em compile. Resolver na Fase 3.
5. **Stub temporário** em `server/src/auth/better-auth.ts` que aceita qualquer request como `actor=admin` (apenas para Fase 2 buildar). Marcar com TODO.
6. `pnpm db:generate` → nova baseline migration.
7. Aplicar migration via `psql` ou `supabase db push` no projeto remoto.
8. `DATABASE_URL=<supabase-direct-url> pnpm dev`. Smoke test: criar company via UI, ver row no Supabase dashboard.

**Por quê antes de auth:** o stub de auth permite isolar problemas de DB de problemas de auth. Se algo quebrar, sabemos exatamente onde.

### Fase 3 — Supabase Auth

1. `pnpm add @supabase/supabase-js jose` no root (workspace deps).
2. Criar `server/src/auth/supabase.ts` com `resolveSupabaseSession`.
3. Patch `server/src/middleware/auth.ts`.
4. Substituir stub de Fase 2 por handler real.
5. Frontend: criar `ui/src/lib/supabase.ts`, `SupabaseAuthProvider`, `Login.tsx`.
6. Convidar 1 dev real → criar usuário no Supabase Auth → testar login → testar criação de company.

**Por quê depois de DB:** auth depende do DB estar funcionando. Inverter ordem cria deadlock de debug.

### Fase 4 — RLS Policies (Defense-in-Depth)

1. Criar `packages/db/src/migrations/post/0001_rls.sql`.
2. Aplicar `ENABLE RLS` + policies para tabelas críticas (`companies`, `agents`, `issues`, `projects`, `claude_accounts` etc.).
3. Manter `service_role` no servidor (não muda comportamento). RLS só protege se alguém tentar acessar Supabase REST direto.
4. Documentar policies em `doc/DATABASE-RLS.md` da equipe.

**Por quê separado:** RLS pode ser adiado sem bloquear v1. Mas fazer cedo evita retrabalho de re-aplicar policies após cada nova tabela.

### Fase 5 — Multi-Conta Claude

1. Criar `packages/db/src/schema/claude_accounts.ts` + `agent_account_bindings.ts`. Migration.
2. Criar `server/src/services/claude-accounts.ts` com `selectActiveAccount`, `rotateOnQuotaExhausted`, `registerAccount(label, slug)`.
3. Criar `server/src/routes/claude-accounts.ts` (CRUD).
4. Criar `ui/src/pages/ClaudeAccounts.tsx` (lista, registro, status).
5. Patch `server/src/services/heartbeat.ts`: chamar `selectActiveAccount` antes de spawn, injetar `ctx.config.claudeConfigDir`.
6. Patch `packages/adapters/claude-local/src/server/parse.ts`: adicionar `detectClaudeQuotaExhausted`.
7. Patch `packages/adapters/claude-local/src/server/execute.ts`: aceitar `config.claudeConfigDir`, propagar para env.
8. Smoke test: configurar 2 contas (1 já exhausted simulado), rodar agente, ver swap nos logs e activity_log.

**Por quê por último:** depende de tudo anterior. Também é o feature mais arriscado — bom isolá-lo para iterar sem afetar fundações.

### Fase 6 — Documentação de Setup + Onboarding

1. README com fluxo "qualquer dev clona repo + .env + claude login + pnpm dev".
2. Doc de troubleshooting (Windows NTFS, conexões Supabase no limite, refresh tokens).

### Onde Colocar os Seams (Para Não Pintar Em Canto)

- **`runtime-config.ts`**: deixá-lo extensível para reintroduzir múltiplos backends (e.g., Postgres self-hosted) sem trocar service.
- **`auth/supabase.ts`** com interface mínima `{ resolveSession(req): Promise<Session|null> }`: futura troca para Auth0/Clerk não obriga reescrever middleware.
- **`claude-accounts.ts`** com método `selectActiveAccount(agentId, taskHint?)`: o `taskHint` é opcional; futura política "preferir conta com modelo cached para esta task" cabe sem mudar API.
- **Não modelar `auth.users` no Drizzle**: protege contra mudança de provider de auth.
- **Manter migrations Drizzle e RLS SQL em diretórios separados** (`migrations/` vs `migrations/post/`): permite re-rodar RLS sem re-rodar DDL.
- **`adapter-utils` permanece intocado**: o contrato `ServerAdapterModule` é estável. Nossa rotação de conta é puro dado de `config`, não muda interface.

---

## Fontes

- **Repo paperclip (master, lido diretamente):**
  - [AGENTS.md](https://github.com/paperclipai/paperclip/blob/master/AGENTS.md) — Repo Map (§3), Engineering Rules (§5), DB Workflow (§6), Auth (§8).
  - [server/src/index.ts](https://github.com/paperclipai/paperclip/blob/master/server/src/index.ts) — bootstrap, embedded postgres handling.
  - [server/src/app.ts](https://github.com/paperclipai/paperclip/blob/master/server/src/app.ts) — router wiring.
  - [server/src/auth/better-auth.ts](https://github.com/paperclipai/paperclip/blob/master/server/src/auth/better-auth.ts) — sistema de auth atual.
  - [server/src/services/heartbeat.ts](https://github.com/paperclipai/paperclip/blob/master/server/src/services/heartbeat.ts) — orquestração de runs de agente.
  - [server/src/services/agents.ts](https://github.com/paperclipai/paperclip/blob/master/server/src/services/agents.ts) — CRUD de agentes, revisões, api keys.
  - [server/src/adapters/registry.ts](https://github.com/paperclipai/paperclip/blob/master/server/src/adapters/registry.ts) — registro estático + plugin loader.
  - [packages/db/src/client.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/client.ts) — drizzle factory.
  - [packages/db/src/runtime-config.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/runtime-config.ts) — resolução de DATABASE_URL e modos.
  - [packages/db/src/schema/agent_runtime_state.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/schema/agent_runtime_state.ts) — checkpoint de agente.
  - [packages/db/src/schema/agent_task_sessions.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/schema/agent_task_sessions.ts) — sessões por tarefa.
  - [packages/db/src/schema/heartbeat_runs.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/schema/heartbeat_runs.ts) — log de execuções.
  - [packages/db/src/schema/auth.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/schema/auth.ts) — tabelas better-auth.
  - [packages/db/src/schema/companies.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/schema/companies.ts), [agents.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/schema/agents.ts), [projects.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/schema/projects.ts), [company_memberships.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/schema/company_memberships.ts), [agent_api_keys.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/schema/agent_api_keys.ts), [company_secrets.ts](https://github.com/paperclipai/paperclip/blob/master/packages/db/src/schema/company_secrets.ts) — schema de domínio.
  - [packages/adapters/claude-local/src/server/quota.ts](https://github.com/paperclipai/paperclip/blob/master/packages/adapters/claude-local/src/server/quota.ts) — leitura de quota windows do Claude CLI.
  - [packages/adapters/claude-local/src/server/execute.ts](https://github.com/paperclipai/paperclip/blob/master/packages/adapters/claude-local/src/server/execute.ts) — spawn do CLI Claude com `CLAUDE_CONFIG_DIR`.

- **Drizzle + Supabase (oficial):**
  - [Drizzle ORM — Connect to Supabase](https://orm.drizzle.team/docs/connect-supabase)
  - [Drizzle ORM — Get Started with Supabase (existing project)](https://orm.drizzle.team/docs/get-started/supabase-existing)
  - [Supabase Docs — Drizzle integration](https://supabase.com/docs/guides/database/drizzle)
  - [Supabase Docs — Connecting to Postgres (pooler modes)](https://supabase.com/docs/guides/database/connecting-to-postgres)
  - [makerkit — Drizzle as client for Supabase](https://makerkit.dev/docs/next-supabase-turbo/recipes/drizzle-supabase)

---
*Pesquisa de arquitetura para: fork paperclip + Supabase + multi-account Claude swap*
*Pesquisado: 2026-04-25*
