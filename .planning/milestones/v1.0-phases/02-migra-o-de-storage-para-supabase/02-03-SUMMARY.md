---
phase: 02-migra-o-de-storage-para-supabase
plan: 03
subsystem: database
tags: [supabase, supavisor, postgres, postgres-js, drizzle, drizzle-kit, prepared-statements, connection-pool, migrations, env]

requires:
  - phase: 02-migra-o-de-storage-para-supabase
    provides: "MIGRATION_AUDIT.md (02-01) — risk-classified findings A.1, F.1, G.1, I.2 consumed"
provides:
  - "Supavisor port-aware createDb (port 6543 → prepare:false, max:5, idle_timeout:20)"
  - "buildPostgresOptions exported helper"
  - "PAPERCLIP_DB_MODE=embedded-postgres opt-in gate for embedded fallback"
  - "Actionable error when neither DATABASE_URL nor PAPERCLIP_DB_MODE configured"
  - "drizzle.config.ts preferring SUPABASE_DB_URL over DATABASE_URL"
  - "ensureMigrations refuses non-TTY auto-apply (DB-02)"
  - "PAPERCLIP_MIGRATION_AUTO_APPLY=true preserved for CI opt-in"
  - "Team-shared .env.example template (9 critical env vars, TODO_FILL_ME markers)"
affects: ["02-04 apply-migrations", "02-05 auth-wiring", "02-06 e2e-validation", "github-actions-pipeline"]

tech-stack:
  added: []
  patterns:
    - "Port-detection-based driver options (postgres-js URL parse → conditional pool options)"
    - "Env-gated fallback (embedded mode opt-in via env var, fail-fast if neither path configured)"
    - "Explicit-only migration application (TTY interactive OR PAPERCLIP_MIGRATION_AUTO_APPLY=true; non-TTY refuses)"
    - "Two-URL convention: DATABASE_URL=runtime pooler 6543, SUPABASE_DB_URL=DDL session 5432"

key-files:
  created:
    - "packages/db/src/__tests__/client-pool-config.test.ts"
  modified:
    - "packages/db/src/client.ts"
    - "packages/db/src/runtime-config.ts"
    - "packages/db/src/runtime-config.test.ts"
    - "packages/db/drizzle.config.ts"
    - "server/src/index.ts"
    - ".env.example"

key-decisions:
  - "buildPostgresOptions retorna undefined (não objeto vazio) para portas != 6543/5432 — preserva default postgres-js do embedded sem fricção"
  - "Embedded fallback opt-in escolhido sobre default-with-warning — fail-fast detecta misconfig imediatamente"
  - "Teste runtime-config existente atualizado (não removido) — preserva cobertura do happy path embedded sob novo contrato"
  - "drizzle.config.ts faz throw em vez de fallback silencioso — drizzle-kit invocado sem env é misconfig grave"

patterns-established:
  - "URL-parse-then-config: createDb usa new URL(url).port para decidir options; teste mocka postgres-js para inspecionar args"
  - "Env opt-in com fail-fast: PAPERCLIP_DB_MODE=embedded-postgres como gate; sem flag E sem DATABASE_URL → throw com mensagem citando .env.example"
  - "Two-URL convention para Drizzle: SUPABASE_DB_URL preferred (session 5432) ?? DATABASE_URL fallback"

requirements-completed: [INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, DB-02]

duration: 40min
completed: 2026-04-26
---

# Fase 2 Plano 03: DB Connection + Env Scaffolding — Resumo

**Driver postgres-js port-aware (6543→prepare:false, 5432→pool only), embedded fallback agora opt-in via PAPERCLIP_DB_MODE, ensureMigrations refuses non-TTY, drizzle.config preferred SUPABASE_DB_URL, e .env.example team-shared com 9 env vars críticas.**

## Performance

- **Duração:** ~40 min
- **Iniciado:** 2026-04-26T02:56:34Z
- **Concluído:** 2026-04-26T03:36:37Z
- **Tarefas:** 5/5
- **Arquivos modificados:** 6 (1 criado, 5 modificados; +1 teste atualizado)

## Realizações

- **Supavisor compatibility:** `createDb(pooler-6543-url)` instancia postgres com `{ prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 }`. Mitiga PITFALLS Armadilha 2 (prepared-statement-does-not-exist intermitente).
- **Pool sizing:** Mesmo session 5432 ganha pool config (`max: 5, idle_timeout: 20, connect_timeout: 10`) — 5 devs × 5 = 25 conexões, dentro do limite free tier (~60).
- **Embedded fallback opt-in:** `PAPERCLIP_DB_MODE=embedded-postgres` é agora obrigatório para ativar embedded. Sem essa flag E sem DATABASE_URL, runtime-config lança erro acionável citando `.env.example`.
- **Auto-migrations gate (DB-02):** `promptApplyMigrations` em non-TTY agora retorna `false` (era `true`). Watchers, dev-runner, daemon — todos recusam aplicar migrations sem opt-in explícito (`PAPERCLIP_MIGRATION_AUTO_APPLY=true`) ou TTY interativo. Mensagem de erro do `ensureMigrations` cita `pnpm db:migrate` + `Phase 2 DB-02`.
- **drizzle-kit:** lê `SUPABASE_DB_URL ?? DATABASE_URL` (session preferido para DDL); throw com mensagem acionável quando nenhum env var presente.
- **`.env.example`:** Substituído integralmente. 80 linhas, lista DATABASE_URL (6543 pooler), SUPABASE_DB_URL (5432 session), SUPABASE_URL/ANON/SERVICE_ROLE_KEY, BETTER_AUTH_SECRET, PAPERCLIP_INSTANCE_ID=team-shared, e duas opt-ins comentadas (PAPERCLIP_DB_MODE, PAPERCLIP_MIGRATION_AUTO_APPLY). Cita `aws-1-sa-east-1` (achado empírico não-documentado em docs Supabase).

## Commits das Tarefas

Cada tarefa foi comitada atomicamente:

1. **Tarefa 1 RED (TDD):** `4e5f2ea` (test) — failing tests for buildPostgresOptions
2. **Tarefa 1 GREEN (TDD):** `5b21d38` (feat) — Supavisor-aware createDb implementation; 4/4 tests pass
3. **Tarefa 2:** `5559749` (feat) — runtime-config PAPERCLIP_DB_MODE gate + drizzle.config SUPABASE_DB_URL preferred
4. **Tarefa 3:** `376dca9` (feat) — server promptApplyMigrations non-TTY → false; ensureMigrations error messages updated
5. **Tarefa 4:** `b282857` (chore) — .env.example team-shared template
6. **Tarefa 5:** `f08f5ac` (test) — runtime-config.test.ts aligned with new opt-in contract; 5/5 pass

## Arquivos Criados/Modificados

- `packages/db/src/client.ts` — `createDb` agora chama `buildPostgresOptions(url)` antes; novo export helper detecta porta via `new URL(url).port`.
- `packages/db/src/runtime-config.ts` — Adiciona gate `PAPERCLIP_DB_MODE=embedded-postgres` no início de `resolveDatabaseTarget()`; embora bloco de retorno embedded agora dentro de `if (allowEmbeddedFallback)`; throw com mensagem acionável caso contrário.
- `packages/db/src/runtime-config.test.ts` — Atualiza teste de embedded-fallback existente para setar `PAPERCLIP_DB_MODE=embedded-postgres`; adiciona novo teste verificando o throw quando nem DATABASE_URL nem opt-in setados. 5/5 pass.
- `packages/db/drizzle.config.ts` — Reescrito wholesale: lê `SUPABASE_DB_URL ?? DATABASE_URL`; throw com mensagem acionável quando nenhum.
- `server/src/index.ts` — `promptApplyMigrations`: 1 linha alterada (`return true` → `return false` em non-TTY); comentário explicativo Phase 2 DB-02 adicionado. `ensureMigrations`: ambas as instâncias da string de erro de "stale schema" atualizadas para citar `pnpm db:migrate` e Phase 2 DB-02.
- `.env.example` — Reescrito (80 linhas). Template completo team-shared.
- `packages/db/src/__tests__/client-pool-config.test.ts` — **CRIADO** (TDD). 4 cenários: pooler 6543, session 5432, embedded 54329, sanity check de drizzle.

## Decisões Tomadas

- **`buildPostgresOptions` retorna `undefined` para portas não-6543/5432:** Permite preservar comportamento default postgres-js para embedded e outros targets, sem expandir options inutilmente.
- **Embedded fallback opt-in (não default-with-warning):** Fail-fast detecta misconfig imediatamente; usuário sabe exatamente o que fazer (ler `.env.example`). Opt-in fácil para quem genuinamente quer offline mode.
- **`drizzle.config.ts` lança erro em vez de cair em fallback silencioso:** Drizzle-kit ser invocado sem env apontando para Supabase é misconfig grave (pode aplicar DDL no lugar errado). Fail-fast.
- **Atualizar teste runtime-config existente em vez de remover:** Preserva cobertura do happy-path embedded; novo contrato (opt-in) testado explicitamente. Adicionei novo teste para o novo throw path.

## Desvios do Plano

### Problemas Corrigidos Automaticamente

**1. [Regra 1 - Bug] Teste pré-existente `runtime-config.test.ts` quebrou após mudança de contrato**
- **Encontrado durante:** Tarefa 5 (verificação integrada via `pnpm vitest run`)
- **Problema:** Teste `falls back to embedded postgres settings from config` foi escrito para o contrato antigo (embedded fallback default sem env var). Após Tarefa 2, `resolveDatabaseTarget()` agora exige `PAPERCLIP_DB_MODE=embedded-postgres` para retornar embedded — o teste batia no novo throw.
- **Correção:** Atualizei o teste para setar `process.env.PAPERCLIP_DB_MODE = "embedded-postgres"` (alinhar com novo contrato Phase 2). Adicionei novo teste validando o throw path quando nenhum dos dois env vars está presente.
- **Arquivos modificados:** `packages/db/src/runtime-config.test.ts`
- **Verificação:** `pnpm vitest run src/runtime-config.test.ts` → 5/5 pass
- **Comitado em:** `f08f5ac` (Tarefa 5)

---

**Total de desvios:** 1 corrigido automaticamente (Regra 1 - Bug em teste contra contrato novo)
**Impacto no plano:** Sem expansão de escopo — apenas alinhamento de teste pré-existente com a mudança intencional de contrato (INFRA-06). Plano original não previa o teste atualizado, mas é necessário para que a suíte de db package fique verde.

## Problemas Encontrados

- **Server vitest suíte completa apresenta 64 falhas pré-existentes** (taskkill ENOENT spawn errors em testes de `workspace-runtime.test.ts` e similares no Windows). Não relacionados a esta plan — são environment-issues do Windows test runner. O teste explicitamente citado pelo plan (`server-startup-feedback-export.test.ts`) **passa cleanly (3/3)** com nossas mudanças. Falhas pré-existentes documentadas como out-of-scope per `<deviation_rules>` boundary; deferred items não acionáveis aqui.

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária neste plano.

(O `.env.example` agora documenta os `TODO_FILL_ME` que cada dev precisa preencher em `.env.local`. Mas isso é onboarding individual, não setup deste plano.)

## Prontidão para Próxima Fase

**Wave 3 (paralelo):**
- **02-04 (apply-migrations + GitHub Actions pipeline):** Pronto. drizzle.config.ts agora lê SUPABASE_DB_URL; auto-migrations gate em DB-02 ativo; CI opt-in via PAPERCLIP_MIGRATION_AUTO_APPLY=true preservado.
- **02-05 (auth wiring):** Pronto. createDb agora suporta Supabase pooler com prepare:false; runtime-config privilegia DATABASE_URL Supabase corretamente; cookie prefix via PAPERCLIP_INSTANCE_ID já no .env.example.

Sem bloqueios.

## Self-Check: PASSED

Verificação executada após criação do SUMMARY.md:

**Arquivos:**
- FOUND: `packages/db/src/client.ts`
- FOUND: `packages/db/src/runtime-config.ts`
- FOUND: `packages/db/drizzle.config.ts`
- FOUND: `server/src/index.ts`
- FOUND: `.env.example`
- FOUND: `packages/db/src/__tests__/client-pool-config.test.ts`

**Commits:**
- FOUND: `4e5f2ea` (test RED)
- FOUND: `5b21d38` (feat GREEN)
- FOUND: `5559749` (feat — runtime-config + drizzle.config)
- FOUND: `376dca9` (feat — server migrations gate)
- FOUND: `b282857` (chore — .env.example)
- FOUND: `f08f5ac` (test — runtime-config alignment)

**Testes:**
- `client-pool-config.test.ts`: 4/4 pass
- `runtime-config.test.ts`: 5/5 pass

---
*Fase: 02-migra-o-de-storage-para-supabase*
*Concluída: 2026-04-26*
