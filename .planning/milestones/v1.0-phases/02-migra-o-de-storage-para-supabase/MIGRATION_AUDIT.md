# Migration Audit — Postgres Embedded → Supabase

**Phase:** 02 (Migração de Storage para Supabase)
**Requirement satisfied:** INFRA-01
**Audited:** 2026-04-25
**Auditor:** Claude (executor de planejamento)
**Status:** Complete

## Scope

Auditoria sistemática do código herdado do paperclip (importado na Fase 1 a partir do `paperclipai/paperclip@master`, SHA `40782f7`) procurando acoplamentos com o backend Postgres embedded que possam quebrar — silenciosamente ou ruidosamente — quando o connection string aponta para o Supavisor pooler do Supabase em transaction mode (porta 6543) ou session mode (porta 5432).

Projeto Supabase target: `bxlczioxgizgvtznukwt`. Pooler hostname empírico: `aws-1-sa-east-1.pooler.supabase.com` (não `aws-0-`).

**Categorias auditadas (10):**

- A — Prepared statements explícitos
- B — LISTEN/NOTIFY (incompatível com transaction mode)
- C — Advisory locks (session vs transactional)
- D — Tabelas temporárias / SET LOCAL
- E — Long-lived transactions
- F — Auto-migrations no startup
- G — Connection pool config
- H — Embedded postgres references
- I — DATABASE_URL / SUPABASE_DB_URL references
- J — Migrations existentes (extensions, schemas)

## Methodology

Grep sistemático com 10+ patterns por categoria contra `**/*.ts`, `**/*.sql`, `**/*.json`, `**/*.md`. Findings registrados em `MIGRATION_AUDIT_FINDINGS.json` (intermediário, descartável após este documento). Cada hit confirmado por leitura de contexto (3 linhas em volta) e classificado em risco LOW / MEDIUM / HIGH com base em:

- **HIGH** — quebra silenciosa em Supavisor; corrupção possível
- **MEDIUM** — degradação observável (latência, race) mas detectável
- **LOW** — aceitável; documentar e seguir
- **NONE** — falso positivo ou padrão já compatível

Reference: `.planning/research/PITFALLS.md` Armadilha 2 (acoplamentos escondidos), Armadilha 3 (auto-migrations).

## Findings

### A — Prepared Statements

#### A.1 — postgres-js sem `prepare: false`

- **Risk:** HIGH (porta 6543 / transaction mode) | NONE (porta 5432 / session mode)
- **File:** `packages/db/src/client.ts:48-51`
- **Code:**
  ```ts
  export function createDb(url: string) {
    const sql = postgres(url);  // sem opções; prepare default ON
    return drizzlePg(sql, { schema });
  }
  ```
- **Why it matters:** postgres-js cacheia prepared statements por default. Em Supavisor transaction mode, statements ganham conexões diferentes a cada query → "prepared statement does not exist" intermitente. Em session mode (5432) cada conexão é dedicada por toda a sessão → prepared statements OK.
- **Decision:** **Mitigate** — adicionar `prepare: false` quando connection string tem porta 6543 (detecção via parse de URL). Manter prepare ON em session mode para preservar performance. Implementação no Plano 02-03.
- **Source citation:** PITFALLS Armadilha 2; STACK linha 327 ("`createDb(SUPABASE_DB_URL)` continua canonical. Estender para detectar `:6543/` e passar `{ prepare: false }`").

#### A.2 — Outros call sites de `postgres()` (utility, backup, tests)

- **Risk:** LOW
- **Files:** `packages/db/src/client.ts:14` (createUtilitySql), `packages/db/src/backup-lib.ts:490,527,867,964`
- **Code:** `postgres(url, { max: 1, onnotice: () => {} })`
- **Why it matters:** Utility connections para inspeção/migration/backup já usam `max: 1`. Sem `prepare: false`, ainda quebrariam contra porta 6543. Mas estes call sites são para DDL/inspeção e devem usar `SUPABASE_DB_URL` (porta 5432 session mode), não pooler.
- **Decision:** **Mitigate** (defesa em profundidade) — passar `prepare: false` também em `createUtilitySql` para casos onde alguém erroneamente passa pooler URL. Implementação no Plano 02-03.
- **Source citation:** PITFALLS Armadilha 2; CONTEXT.md ("SUPABASE_DB_URL = pooler `:5432` (session mode) — para Drizzle migrations").

### B — LISTEN/NOTIFY

**Zero hits — sem ações necessárias.**

Patterns rodados: `\bLISTEN\s+`, `\bNOTIFY\s+`, `pg_notify\s*\(`. Nenhum match em `**/*.ts` ou `**/*.sql`.

- **Why it matters:** LISTEN/NOTIFY exige conexão dedicada de longa duração (incompatível com transaction mode). Como o paperclip não usa este mecanismo, não há risco de regressão silenciosa.
- **Decision:** **N/A** — verificado ausente.
- **Source citation:** PITFALLS Armadilha 2 (Supavisor transaction mode rejeita session-scoped features).

### C — Advisory Locks

#### C.1 — `pg_advisory_xact_lock` em plugin-database.ts

- **Risk:** NONE
- **File:** `server/src/services/plugin-database.ts:413-414`
- **Code:**
  ```ts
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);
  });
  ```
- **Why it matters:** É a versão TRANSACTIONAL (`_xact_`), liberada automaticamente no commit/rollback. Supavisor mantém conexão dedicada por toda a duração da transação, então locks dentro de transação funcionam normalmente.
- **Decision:** **Accept as-is** — verified compatible com Supavisor transaction mode.
- **Source citation:** Supabase docs — Supavisor terminology; PITFALLS Armadilha 2 (distinção session-level `pg_advisory_lock` vs transactional `pg_advisory_xact_lock`).

Patterns adicionais rodados sem hits: `pg_advisory_lock\b`, `pg_advisory_unlock\b`, `pg_try_advisory_lock\b`. Não há advisory locks session-level no codebase — o código já usa exclusivamente a variante xact.

### D — Tabelas Temporárias e SET LOCAL

#### D.1 — `SET LOCAL` em backup-lib.ts

- **Risk:** LOW
- **File:** `packages/db/src/backup-lib.ts:547-548`
- **Code:**
  ```ts
  emitStatement("BEGIN;");
  emitStatement("SET LOCAL session_replication_role = replica;");
  emitStatement("SET LOCAL client_min_messages = warning;");
  ```
- **Why it matters:** `SET LOCAL` aplica apenas dentro da transação atual; uso correto. Aqui é emitido como string em script de backup/restore gerado, não executado contra DB no runtime do app principal — risco zero em pooler.
- **Decision:** **Accept as-is** — uso correto de SET LOCAL dentro de BEGIN/COMMIT.
- **Source citation:** Postgres docs — SET LOCAL semantics (transaction-scoped).

Patterns rodados sem hits: `CREATE\s+TEMP`, `CREATE\s+TEMPORARY`. Não há tabelas temporárias criadas no codebase.

### E — Long-Lived Transactions / idle_in_transaction

#### E.1 — 30+ chamadas a `db.transaction(async (tx) => ...)`

- **Risk:** MEDIUM
- **Files:** `server/src/services/access.ts` (6 ocorrências), `server/src/services/companies.ts` (3), `server/src/services/issues.ts` (4), `server/src/routes/access.ts` (4), `server/src/services/documents.ts` (3), `server/src/services/issue-thread-interactions.ts` (2), `server/src/services/plugin-database.ts:413`, `server/src/services/agents.ts:505`, `server/src/services/board-auth.ts:259`, `server/src/services/feedback.ts:1869`, `server/src/services/execution-workspaces.ts:748`, `cli/src/commands/worktree.ts` (2), entre outros
- **Why it matters:** Cada `db.transaction()` consome uma conexão dedicada do Supavisor pool durante toda a duração. Em transaction mode (6543), conexões são checked out from Supavisor pool — long transactions reduzem throughput global compartilhado. Não há transactions explicitamente "long-lived" (tipo job de processamento batch dentro de transação), mas há volume alto de transactions normais.
- **Decision:** **Mitigate (pool config, não code change)** — limitar pool max=5 e idle_timeout=20s por instância dev. 5 devs × 5 = 25 conexões ativas máx; bem dentro do limite shared do free tier (~60). Não modificar lógica de transactions.
- **Source citation:** PITFALLS Armadilha 5 (pool exhaustion); CONTEXT.md decisão "max: 5, idle_timeout: 20".

Pattern `idle_in_transaction` retornou 1 hit em `workspace-runtime.ts:2147` que se refere a `stopType === "idle_timeout"` (workspace runtime, não Postgres) — falso positivo, ignorado.

### F — Auto-Migrations no Startup

#### F.1 — `ensureMigrations` chamado em `startServer()`

- **Risk:** HIGH (multi-dev shared DB)
- **File:** `server/src/index.ts:135-183` (função local `ensureMigrations`), invocada em `index.ts:274` (Postgres) e `index.ts:434` (Embedded fallback)
- **Code:**
  ```ts
  async function ensureMigrations(connectionString: string, label: string, opts?: EnsureMigrationsOptions): Promise<MigrationSummary> {
    // ...
    logger.info({ pendingMigrations: state.pendingMigrations }, `Applying ${state.pendingMigrations.length} pending migrations for ${label}`);
    await applyPendingMigrations(connectionString);
    return "applied (pending migrations)";
  }
  ```
- **Why it matters:** Durante a Fase 1, isso era inofensivo (cada dev tinha seu embedded local). Agora 5 devs apontam para o mesmo Supabase: dois startups concorrentes podem disputar o lock de migration; pior, uma migration de feature branch pode ser aplicada sem review. O TTY prompt `(y/N)` em `promptApplyMigrations` é uma proteção fraca contra erro humano.
- **Decision:** **Mitigate** — desabilitar auto-apply por default. Startup deve falhar fast com mensagem acionável quando `inspectMigrations` retorna `pendingMigrations`. Honra ao opt-in `PAPERCLIP_MIGRATION_AUTO_APPLY=true` permanece para CI; mas não para devs locais. Implementação no Plano 02-03 (DB-02).
- **Source citation:** PITFALLS Armadilha 3; CONTEXT.md decisão "Auto-migrations no startup desabilitadas".

#### F.2 — `applyPendingMigrations` referenciado em CLI commands

- **Risk:** MEDIUM
- **Files:** `cli/src/commands/worktree.ts:1332`, `cli/src/commands/routines.ts:199,217,262,269`
- **Why it matters:** CLI commands podem invocar `applyPendingMigrations` em fluxos de worktree/routines. Se um dev rodar `paperclip worktree create` apontando para Supabase compartilhado, aplicaria migrations sem aprovação.
- **Decision:** **Mitigate** — mesmo gate (`PAPERCLIP_MIGRATION_AUTO_APPLY=true` ou flag CLI explícita). Documentar no Plano 02-03; CLI fica fora de escopo direto desta fase mas a função `applyPendingMigrations` em si será endurecida em `packages/db/src/client.ts` (não-breaking — só altera quem chama de forma "automática").
- **Source citation:** PITFALLS Armadilha 3; ARCHITECTURE.md (CLI compartilha db client com server).

### G — Connection Pool Config

#### G.1 — `createDb` sem `max` / `idle_timeout`

- **Risk:** MEDIUM
- **File:** `packages/db/src/client.ts:48-51`
- **Code:** `const sql = postgres(url);` (default max=10, sem idle_timeout)
- **Why it matters:** postgres-js default max=10. Com 5 devs × 10 = 50 conexões simultâneas → próximo do limite shared do free tier (~60). Conexões idle não fecham → pool exhaustion possível.
- **Decision:** **Mitigate** — `postgres(url, { max: 5, idle_timeout: 20, prepare: porta!==6543 })`. Implementação no Plano 02-03.
- **Source citation:** STACK.md ("max=5, idle_timeout=20"); CONTEXT.md decisão pool.

#### G.2 — `createUtilitySql` já com `max: 1`

- **Risk:** LOW (apenas falta prepare flag)
- **File:** `packages/db/src/client.ts:14`
- **Code:** `return postgres(url, { max: 1, onnotice: () => {} });`
- **Decision:** **Accept (max OK) + Mitigate (prepare flag)** — adicionar `prepare: !isPoolerUrl(url)` para defesa em profundidade. Plano 02-03.
- **Source citation:** Direct read do código.

### H — Embedded Postgres References

#### H.1 — `embedded-postgres@18.1.0-beta.16` patched dependency

- **Risk:** NONE para Supabase
- **File:** `package.json:58-60`
- **Code:**
  ```json
  "patchedDependencies": {
    "embedded-postgres@18.1.0-beta.16": "patches/embedded-postgres@18.1.0-beta.16.patch"
  }
  ```
- **Why it matters:** embedded-postgres permanece como dependency; é fallback opt-in (INFRA-06) via `PAPERCLIP_DB_MODE=embedded-postgres`. Caminho isolado em `runtime-config.ts` — só ativa quando explicitamente habilitado. Não conflita com Supabase.
- **Decision:** **Accept as-is** — coexistência documentada. O Plano 02-03 endurece o gate (embedded só ativa com `PAPERCLIP_DB_MODE=embedded-postgres` explícito; default vira `postgres`).
- **Source citation:** CONTEXT.md ("Embedded Postgres permanece como fallback opt-in via env var (não default)").

#### H.2 — `EmbeddedPostgres` import e uso no startup

- **Risk:** NONE
- **Files:** `server/src/index.ts:65-78` (type), `cli/src/__tests__/worktree.test.ts:574` (test only), test helpers
- **Decision:** **Accept as-is** — código de fallback / testes; não executa quando `DATABASE_URL` está setado.
- **Source citation:** Read direto.

### I — DATABASE_URL / SUPABASE_DB_URL References

#### I.1 — `DATABASE_URL` resolvido em `runtime-config.ts`

- **Risk:** NONE
- **File:** `packages/db/src/runtime-config.ts:215-240`
- **Code:**
  ```ts
  const envUrl = process.env.DATABASE_URL?.trim();
  if (envUrl) {
    return { mode: "postgres", connectionString: envUrl, source: "DATABASE_URL", ... };
  }
  ```
- **Why it matters:** Estrutura de resolução já privilegia `DATABASE_URL` acima de embedded fallback. Esta é a porta de entrada para o Supabase pooler URL.
- **Decision:** **Mitigate (endurecimento)** — Plano 02-03 vai exigir `PAPERCLIP_DB_MODE=embedded-postgres` para ativar embedded. Sem esse flag, ausência de `DATABASE_URL` deve falhar com mensagem clara em vez de cair silenciosamente para embedded.
- **Source citation:** CONTEXT.md (DATABASE_URL = pooler 6543).

#### I.2 — `SUPABASE_DB_URL` ainda não referenciado em código de produção

- **Risk:** LOW (gap a fechar)
- **Files:** `.planning/research/STACK.md:113`, `.planning/phases/02-*/02-03-PLAN.md`, `02-04-PLAN.md` (apenas em docs)
- **Why it matters:** `SUPABASE_DB_URL` é usado apenas em planos/docs ainda. O código produtivo (drizzle.config.ts, migrate.ts) ainda não lê essa variável. Plano 02-03 introduz `process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL` em `drizzle.config.ts`.
- **Decision:** **Mitigate (introduzir variável)** — Plano 02-03 adiciona `SUPABASE_DB_URL` à `.env.example` e ao `drizzle.config.ts`.
- **Source citation:** CONTEXT.md (SUPABASE_DB_URL = porta 5432 para DDL).

### J — Migrations Existentes (71 arquivos)

#### J.1 — Inventário

- **Total:** 71 arquivos `.sql` em `packages/db/src/migrations/0000_*.sql` … `0070_*.sql`
- **Journal:** `packages/db/src/migrations/meta/_journal.json`
- **Risk a investigar:** Cada migration pode referenciar (a) extensions que Supabase não tem por default; (b) tipos / funções que conflitam com schema `auth` interno do Supabase; (c) sintaxe não-suportada em pgBouncer.

#### J.2 — Pré-requisitos detectados via grep

Patterns rodados contra `packages/db/src/migrations/*.sql`:

- `CREATE\s+EXTENSION` — **1 hit:**
  - `0051_young_korg.sql:1`: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
  - **Mitigation:** Supabase fornece `pg_trgm` como extensão padrão (apenas precisa estar habilitada). `CREATE EXTENSION IF NOT EXISTS` é idempotente e seguro. Risco residual: se a role do connection string não tiver permissão para `CREATE EXTENSION`, falha. Plano 02-04 testa empiricamente; se falhar, executar manualmente como superuser via Supabase SQL Editor.
- `CREATE\s+SCHEMA` — **zero hits.** Nenhuma migration cria schemas custom. Sem risco de conflito com schema `auth` interno do Supabase.
- `pg_trgm|uuid-ossp|pgcrypto|vector` — **1 hit** (mesmo `pg_trgm` acima).

**Discovery:** As migrations usam apenas a extension `pg_trgm`, que é nativa do Supabase. Risco de incompatibilidade BAIXO.

#### J.3 — Decisão estratégica

- **Decision:** **Try-apply-first, regenerate-baseline-if-fails** (decisão travada em CONTEXT.md)
- **Rationale:** Regenerar baseline é caminho HIGH-effort que rompe o histórico de migrations. Se as 71 aplicarem cleanly, mantemos o histórico (auditável; permite rollback fino). Decisão final é EMPÍRICA, no Plano 02-04.
- **Confiança ex ante:** ALTA. Apenas uma extensão (`pg_trgm`, disponível) e zero CREATE SCHEMA. Probabilidade alta de aplicar cleanly.
- **Contingency plan (se a aplicação falhar):**
  1. Capturar a primeira migration que falha + erro completo do Postgres
  2. Investigar: (a) é missing extension? `CREATE EXTENSION` manual via Supabase SQL Editor; (b) é DDL não-suportado em pooler? Mover execução para session mode (porta 5432); (c) é permissão de role? Tentar via Supabase service_role
  3. Se ≥3 migrations falham, regenerar baseline única via `pnpm db:generate` partindo do schema atual (custo: perde histórico de migrations)

## Migration Strategy Decision

Resumo executivo das decisões consolidadas (entrada para Plano 02-03 e 02-04):

| Aspect | Decision | Plan |
|--------|----------|------|
| Driver config | `prepare: false` quando porta=6543, pool max=5, idle_timeout=20 | 02-03 |
| Auto-migrations | Desabilitadas por default; falha fast em pending; opt-in `PAPERCLIP_MIGRATION_AUTO_APPLY=true` apenas para CI | 02-03 |
| Embedded postgres | Permanece como fallback opt-in via `PAPERCLIP_DB_MODE=embedded-postgres` | 02-03 |
| 71 migrations | Try-apply-first contra Supabase via `pnpm db:migrate`; regenerate-baseline only if blocking failures | 02-04 |
| GitHub Actions migration pipeline | Único caminho legítimo de `pnpm db:migrate` em merge para main | 02-04 |
| Better Auth | Preservado; cookie prefix derivado de PAPERCLIP_INSTANCE_ID | 02-05 |
| Pre-commit hook for service-role detection | Detecta `eyJ...` JWT + `VITE_*SERVICE_ROLE*` em arquivos cliente | 02-02 |

## Mitigation Plan

Mitigações organizadas por plano consumidor:

- **Plano 02-02** consome: nenhum achado direto (pre-commit hook é orthogonal — roda em paralelo na Wave 1; sem dependência de findings)
- **Plano 02-03** consome: A.1, A.2 (`prepare: false`); F.1, F.2 (auto-migrations desabilitadas); G.1, G.2 (pool config); I.1, I.2 (env vars + endurecimento de runtime-config)
- **Plano 02-04** consome: J.1-J.3 (estratégia de migrations + GitHub Actions pipeline)
- **Plano 02-05** consome: nenhum achado direto (auth wiring é independente da auditoria; depende apenas dos artifacts de 02-03)
- **Plano 02-06** consome: validação E2E confirma que mitigações dos planos anteriores funcionaram

Findings que NÃO requerem mitigação (Accept as-is):

- C.1 — `pg_advisory_xact_lock`: transactional, compatível com Supavisor
- D.1 — `SET LOCAL` em backup-lib: dentro de BEGIN/COMMIT, uso correto
- H.1, H.2 — embedded-postgres: fallback opt-in isolado
- B (zero hits) — sem LISTEN/NOTIFY no codebase

## Discoveries (Empirical Findings to Surface in Planning Notes)

Achados que merecem destaque por divergir de docs públicas:

- **Pooler hostname `aws-1-sa-east-1`** (não `aws-0-`) — não documentado em Supabase docs públicas para sa-east-1. Descoberto empiricamente em 2026-04-26 ao validar conexão com `bxlczioxgizgvtznukwt`. Registrar em `.env.example` Plano 02-03 com comentário inline.
- **Apenas 1 CREATE EXTENSION em 71 migrations** (`pg_trgm` em `0051_young_korg.sql`). Confiança alta de que migrations aplicam cleanly contra Supabase free tier.
- **Zero CREATE SCHEMA custom** — sem risco de colidir com schema `auth` interno do Supabase (que é o schema do Supabase Auth, não Better Auth).
- **30+ call sites de `db.transaction()`** mas todos curtos (não há job batch ou import bulk dentro de transação). Pool config `max=5` é suficiente.

## References

- `.planning/research/PITFALLS.md` — Armadilhas 2, 3, 5
- `.planning/research/STACK.md` — `prepare: false`, pool config, linha 327
- `.planning/research/ARCHITECTURE.md` — pontos de mudança em packages/db
- `.planning/phases/02-migra-o-de-storage-para-supabase/02-CONTEXT.md` — decisões travadas
- Supabase docs — [Supavisor terminology](https://supabase.com/docs/guides/troubleshooting/supavisor-and-connection-terminology-explained-9pr_ZO)

---
*Audit complete: 2026-04-25*
*Next plan to consume: 02-03 (DB connection patches + env scaffolding)*
