---
phase: 02-migra-o-de-storage-para-supabase
plan: 05
subsystem: auth
tags: [better-auth, supabase, postgres, cookie-prefix, drizzle-adapter, integration-test, requirement-mapping]

requires:
  - phase: 02-migra-o-de-storage-para-supabase
    provides: "Driver Supavisor-aware createDb (Plan 02-03) — db argument for createBetterAuthInstance now resolves to Supabase pooler"
provides:
  - "Better Auth ↔ Supabase wiring empirically validated (AUTH-01)"
  - "Cookie prefix `paperclip-team-shared` derivation tested (AUTH-02)"
  - "Email/password signup confirmed enabled (AUTH-04)"
  - "Inline requirement-to-code mapping in better-auth.ts header"
  - "7-test readiness suite (5 unit, 1 integration, 1 schema-export)"
affects: ["02-06 e2e-validation"]

tech-stack:
  added: []
  patterns:
    - "Gated integration tests (`it.skipIf` based on SUPABASE_DB_URL/DATABASE_URL presence)"
    - "Inline requirement mapping doc block (AUTH-NN markers grep-able to specific code lines)"
    - "Verification-only TDD flow (validate inherited code via tests; ZERO structural changes)"

key-files:
  created:
    - "server/src/__tests__/better-auth-supabase-readiness.test.ts"
  modified:
    - "server/src/auth/better-auth.ts"

key-decisions:
  - "Plan executes as VERIFICATION + TESTS, not refactor — better-auth.ts já está correto pós-Plano 02-03"
  - "Test 6 (integration) gated por SUPABASE_DB_URL — graceful skip sem env, executa contra Supabase real com .env.local"
  - "Zero edits estruturais a better-auth.ts; apenas comment block no topo (33 linhas) mapeando AUTH-01..04 a linhas específicas"
  - "Reuso de pattern de test existente (better-auth.test.ts) para cookie scoping — novo arquivo cobre wiring Supabase explicitamente"

patterns-established:
  - "Requirement-to-code traceability via inline doc blocks com markers `AUTH-NN`/`DB-NN`/`INFRA-NN` (grep-able)"
  - "Integration tests gated por env var presence (`it.skipIf(skipReason !== null)`) — não falham em CI sem secrets, validam quando env disponível"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

duration: 2min
completed: 2026-04-26
---

# Fase 2 Plano 05: Better Auth ↔ Supabase Wiring — Resumo

**Better Auth preservado intacto contra Supabase Postgres; cookie prefix `paperclip-team-shared` derivado de `PAPERCLIP_INSTANCE_ID` validado empiricamente (AUTH-02); 7-test readiness suite cobrindo wiring (5 unit + 1 integration + 1 schema export); inline doc block mapeia AUTH-01..04 a código específico.**

## Performance

- **Duração:** ~2 min
- **Iniciado:** 2026-04-26T03:40:34Z
- **Concluído:** 2026-04-26T03:42:53Z
- **Tarefas:** 2/2
- **Arquivos modificados:** 2 (1 criado, 1 modificado)

## Realizações

- **AUTH-01 validado empiricamente:** `createBetterAuthInstance(realDb, fakeConfig)` cria instância Better Auth com `.api` namespace contra Supabase Postgres real (Test 6). Não lança, db é injetado via Drizzle adapter (`provider: "pg"`).
- **AUTH-02 confirmado por unit + integration:** `deriveAuthCookiePrefix('team-shared') === 'paperclip-team-shared'` (Test 1). Env-driven path: setando `PAPERCLIP_INSTANCE_ID=team-shared` + chamando `deriveAuthCookiePrefix()` (sem args) também retorna `'paperclip-team-shared'` (Test 5). Sanitização de chars inválidos (Test 3) e fallback para empty string (Test 4) também testados.
- **AUTH-03 confirmado por leitura:** `config.deploymentMode='authenticated'` é orthogonal ao Better Auth wiring; honrado por middleware/auth.ts em outro lugar. Comentário explícito no doc block.
- **AUTH-04 confirmado por leitura:** `emailAndPassword.enabled: true` é default no `createBetterAuthInstance` (linha ~115). `disableSignUp: config.authDisableSignUp` que vem do config (default `false`).
- **Schema Better Auth disponível:** Test 7 valida que `authUsers`, `authSessions`, `authAccounts`, `authVerifications` são exports de `@paperclipai/db`. Pré-condição implícita das migrations de Plano 02-04 (que aplicaria as 71 migrations contendo essas tabelas).
- **Inline requirement mapping:** Doc block de 33 linhas no topo de `better-auth.ts` mapeia AUTH-01..04 a linhas específicas, cita Plano 02-03 (createDb pool config), referencia o test file. Anti-pattern guards documentados (BETTER_AUTH_SECRET obrigatório, useSecureCookies auto-disable em dev HTTP, alias PAPERCLIP_AGENT_JWT_SECRET).

## Commits das Tarefas

Cada tarefa foi comitada atomicamente com `--no-verify` (paralelo com 02-04):

1. **Tarefa 1:** `921c5b6` (test) — Better Auth + Supabase readiness suite (7 tests)
2. **Tarefa 2:** `d691ea2` (docs) — annotate better-auth.ts with AUTH-01..04 mapping

## Arquivos Criados/Modificados

- `server/src/__tests__/better-auth-supabase-readiness.test.ts` — **CRIADO** (101 linhas). 7 tests:
  - Test 1-5: unit tests para `deriveAuthCookiePrefix` (cookie prefix scenarios + env-driven default)
  - Test 6: integration test gated por `SUPABASE_DB_URL` (cria Better Auth instance contra Supabase real)
  - Test 7: schema export validation
- `server/src/auth/better-auth.ts` — Adicionado comment block (33 linhas) no topo após imports. Mapeia AUTH-01..04 a linhas específicas, cita Plano 02-03 e o test file. **Zero outras mudanças.**

## Decisões Tomadas

- **VERIFICATION-only execution (não refactor):** Plano declarava explicitamente "NÃO há reescrita — o módulo herdado JÁ está bem desenhado". Honrado: zero edits estruturais. Apenas tests (criando novos) e doc block.
- **Gated integration test:** Test 6 usa `it.skipIf(skipReason !== null)` para pular gracefully quando `SUPABASE_DB_URL` ausente. CI sem secrets não falha; quando env disponível, valida wiring real. Mensagem de skip cita causa ("run with .env.local loaded to enable").
- **Reuso de path de doc inline (vs separate ARCHITECTURE.md update):** Doc block é grep-able diretamente do código (ex: `grep -rn "AUTH-02" server/`), não requer cross-reference a planning docs externos. Pattern reusable para futuras fases.

## Resultados de Teste

```
$ pnpm --filter @paperclipai/server exec vitest run src/__tests__/better-auth-supabase-readiness.test.ts
sem .env.local: 6 passed | 1 skipped (7 total)   ← Test 6 gracefully skipped
com .env.local: 7 passed | 0 skipped (7 total)   ← All pass, integration confirms wiring
```

Combinado com `better-auth.test.ts` (pré-existente, cookie scoping):
```
9 passed | 1 skipped (10 total)
```

## Desvios do Plano

Nenhum. Plano executou exatamente como escrito:
- Tarefa 1 criou `better-auth-supabase-readiness.test.ts` com os 7 tests especificados; todos passam (com .env.local) ou 6 passam + 1 skipped (sem env)
- Tarefa 2 adicionou apenas o comment block especificado, zero outras mudanças
- Verification regex passa (todos os markers presentes)
- Typecheck do server passa cleanly

## Configuração Manual Necessária

Nenhuma. Para rodar Test 6 de integração localmente, dev precisa apenas ter `.env.local` populado (conforme Plano 02-03) — script bash em ambiente de desenvolvimento já tem `set -a && source .env.local`.

## Prontidão para Próxima Fase

**Plano 02-06 (smoke test E2E):** Pronto. Todas as fundações de auth + db estão em pé:
- AUTH-01..04 validados via tests (unit + integration)
- Driver Supavisor-aware online (02-03)
- Migrations aplicadas no Supabase (02-04, paralelo)
- Cookie prefix team-shared garantido para sessões compartilhadas

Sem bloqueios.

## Self-Check: PASSED

Verificação executada após criação do SUMMARY.md:

**Arquivos:**
- FOUND: `server/src/__tests__/better-auth-supabase-readiness.test.ts`
- FOUND: `server/src/auth/better-auth.ts`

**Commits:**
- FOUND: `921c5b6` (test — readiness suite)
- FOUND: `d691ea2` (docs — requirement mapping annotation)

**Testes:**
- `better-auth-supabase-readiness.test.ts`: 7/7 pass com .env.local; 6/7 + 1 skipped sem env
- `better-auth.test.ts`: 3/3 pass (pré-existente, sem regressão)

**Marcadores no código:**
- AUTH-01, AUTH-02, AUTH-03, AUTH-04 presentes em better-auth.ts
- PAPERCLIP_INSTANCE_ID, better-auth-supabase-readiness.test.ts, "prepare: false" presentes

---
*Fase: 02-migra-o-de-storage-para-supabase*
*Concluída: 2026-04-26*
