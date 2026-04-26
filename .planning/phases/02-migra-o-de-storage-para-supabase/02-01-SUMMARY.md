---
phase: 02-migra-o-de-storage-para-supabase
plan: 01
subsystem: infra
tags: [supabase, supavisor, postgres, drizzle, audit, migration, prepare-statements, advisory-locks, connection-pooling]

requires:
  - phase: 01-fork-hard-cerim-nia-de-corte
    provides: Codebase paperclip importado (71 migrations Drizzle, packages/db/src/client.ts, server/src/index.ts ensureMigrations)
provides:
  - MIGRATION_AUDIT.md com 11 findings classificados em 10 categorias (A-J)
  - Estratégia confirmada try-as-is para 71 migrations
  - Mapa de mitigações por plano consumidor (02-03, 02-04, 02-05)
  - Discoveries empíricas (aws-1-sa-east-1 hostname, zero LISTEN/NOTIFY, 1 CREATE EXTENSION)
affects: [02-02, 02-03, 02-04, 02-05, 02-06, plano-supabase, supavisor-config, drizzle-migrations]

tech-stack:
  added: []
  patterns:
    - "Audit-first methodology: greps sistemáticos por categoria de coupling antes de qualquer code change"
    - "Risk taxonomy NONE/LOW/MEDIUM/HIGH com Why-it-matters obrigatório"
    - "Findings rastreáveis a planos consumidores (mitigações nunca órfãs)"

key-files:
  created:
    - .planning/phases/02-migra-o-de-storage-para-supabase/MIGRATION_AUDIT.md
  modified: []

key-decisions:
  - "71 migrations aplicarão try-as-is contra Supabase (alta confiança: apenas 1 CREATE EXTENSION pg_trgm, zero CREATE SCHEMA)"
  - "C.1 pg_advisory_xact_lock confirmado compatível com Supavisor transaction mode (xact, não session)"
  - "F.1 ensureMigrations será desabilitado por default no plano 02-03 (HIGH risk em DB compartilhado)"
  - "G.1/G.2 pool config: max=5, idle_timeout=20 (5 devs × 5 = 25 < limite free ~60)"
  - "B (LISTEN/NOTIFY) zero hits — sem mitigação necessária"

patterns-established:
  - "Categorias de auditoria A-J reutilizáveis em outras migrações de DB-driver"
  - "Pré-identificação de findings no PLAN.md → confirmação via grep no executor"
  - "Discoveries empíricas (não-documentadas em docs públicas) ganham seção própria no audit"

requirements-completed: [INFRA-01]

duration: ~6min
completed: 2026-04-25
---

# Fase 2 Plano 1: Migration Audit — Resumo

**Audit-first methodology mapeando 11 findings em 10 categorias (A-J) entre Postgres-embedded paperclip e Supavisor pooler, classificados por risco com decisões rastreáveis aos planos 02-03/02-04/02-05.**

## Performance

- **Duração:** ~6 min
- **Iniciado:** 2026-04-25 (parallel Wave 1)
- **Concluído:** 2026-04-25
- **Tarefas:** 2 / 2
- **Arquivos modificados:** 1 criado

## Realizações

- **MIGRATION_AUDIT.md** completo (19.5 KB, 17 seções) cobrindo 10 categorias auditadas com 11 findings classificados
- **Estratégia confirmada para 71 migrations**: try-apply-as-is (alta confiança ex ante — apenas 1 CREATE EXTENSION `pg_trgm` disponível no Supabase, zero CREATE SCHEMA custom)
- **Auth gate identificado**: F.1 ensureMigrations no startup é HIGH risk em DB compartilhado — mitigação detalhada para o plano 02-03
- **Pool config decision**: max=5, idle_timeout=20 baseado em 5 devs × 5 = 25 conexões << limite free tier ~60

## Distribuição de Findings por Risco

| Risk | Count | Findings |
|------|-------|----------|
| HIGH | 2 | A.1 (postgres-js sem prepare:false), F.1 (ensureMigrations no startup) |
| MEDIUM | 3 | E.1 (30+ db.transaction()), F.2 (CLI applyPendingMigrations), G.1 (createDb sem max) |
| LOW | 4 | A.2 (utility postgres calls), D.1 (SET LOCAL backup-lib), G.2 (createUtilitySql), I.2 (SUPABASE_DB_URL não-referenciado) |
| NONE | 4 | C.1 (pg_advisory_xact_lock), H.1/H.2 (embedded-postgres), I.1 (DATABASE_URL resolution), B (zero hits LISTEN/NOTIFY) |

**Total findings:** 11 + 1 categoria zero-hit confirmada (B = LISTEN/NOTIFY).

## Commits das Tarefas

1. **Tarefa 1: Greps sistemáticos + findings JSON** — `b348c89` (chore — intermediate JSON)
2. **Tarefa 2: Redigir MIGRATION_AUDIT.md + deletar JSON** — `21a6b65` (docs)

## Arquivos Criados/Modificados

- `.planning/phases/02-migra-o-de-storage-para-supabase/MIGRATION_AUDIT.md` — Audit completo com Scope/Methodology/Findings/Migration Strategy Decision/Mitigation Plan
- `.planning/phases/02-migra-o-de-storage-para-supabase/MIGRATION_AUDIT_FINDINGS.json` — INTERMEDIÁRIO, deletado após task 2 (rastreabilidade via commit `b348c89` → `21a6b65`)

## Decisões Tomadas

- **71 migrations strategy:** Try-apply-first confirmed (alta confiança). Contingency plan documentado se ≥3 falharem → regenerate baseline.
- **`pg_advisory_xact_lock` é compatible:** confirmado por análise de semântica xact (lock liberado no commit/rollback; conexão dedicada por toda transação em Supavisor).
- **Auto-migrations desabilitadas por default no plano 02-03:** opt-in via `PAPERCLIP_MIGRATION_AUTO_APPLY=true` apenas para CI; devs locais devem rodar `pnpm db:migrate` explicitamente.
- **Pool config travada:** `max=5, idle_timeout=20, prepare: porta!==6543`.
- **Zero CREATE SCHEMA detectado:** sem risco de colidir com schema `auth` interno do Supabase Auth (irrelevante porque mantemos Better Auth).

## Pointers para Planos Consumidores

- **Plano 02-02** (pre-commit hook) — independente; sem dependência de findings deste audit
- **Plano 02-03** (driver patches + env) — consome A.1, A.2, F.1, F.2, G.1, G.2, I.1, I.2 (8 findings → mitigações)
- **Plano 02-04** (apply 71 migrations + GitHub Actions) — consome J.1, J.2, J.3 (estratégia try-as-is + contingency)
- **Plano 02-05** (Better Auth wiring) — sem findings diretos; depende dos artifacts de 02-03
- **Plano 02-06** (E2E validation) — confirma que mitigações 02-03/02-04/02-05 funcionaram

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. Os 11 findings cobriram todas as 10 categorias requeridas pelo PLAN; B (LISTEN/NOTIFY) foi confirmado zero-hit conforme esperado.

## Problemas Encontrados

Nenhum. Greps rodaram em primeira tentativa; pré-identificações no `<interfaces>` do PLAN foram todas confirmadas empiricamente:

- A.1 prepare:false → confirmado em `client.ts:49`
- C.1 pg_advisory_xact_lock → confirmado em `plugin-database.ts:414`
- F.1 ensureMigrations → confirmado em `index.ts:135-183` (chamado via `index.ts:274` e `:434`)
- 71 migrations → contagem confirmada via `ls`

## Discoveries Empíricas

- **`aws-1-sa-east-1.pooler.supabase.com`** (não `aws-0-`) — não documentado em Supabase docs públicas. Será registrado no `.env.example` no plano 02-03.
- **Apenas 1 CREATE EXTENSION em 71 migrations** (`pg_trgm` em `0051_young_korg.sql`). Aumenta confiança ex ante na estratégia try-as-is.
- **Zero CREATE SCHEMA custom** em todas as migrations. Sem risco de colidir com schema interno do Supabase.

## Configuração Manual Necessária

Nenhuma — audit é puramente baseado em leitura de código. Configuração de Supabase secrets / GitHub Actions ficará nos planos 02-03 e 02-04.

## Prontidão para Próxima Fase

- ✅ INFRA-01 satisfeito (audit completo)
- ✅ Plano 02-02 (Wave 1, paralelo) pode prosseguir independentemente
- ✅ Plano 02-03 (Wave 2) tem todos os findings necessários para implementar driver patches
- ✅ Plano 02-04 (Wave 3) tem decisão estratégica empiricamente justificada para as 71 migrations

Sem bloqueios. Próximo plano: 02-03 quando Wave 2 começar.

---
*Fase: 02-migra-o-de-storage-para-supabase*
*Concluída: 2026-04-25*

## Self-Check: PASSED

- ✅ MIGRATION_AUDIT.md exists (19.5 KB, 17 sections, all 5 required sections present)
- ✅ Commit `b348c89` (intermediate findings JSON) verified in git log
- ✅ Commit `21a6b65` (audit MD + delete JSON) verified in git log
- ✅ MIGRATION_AUDIT_FINDINGS.json deleted (intermediate cleanup confirmed)
- ✅ INFRA-01 explicitly cited in audit frontmatter ("Requirement satisfied: INFRA-01")
- ✅ aws-1-sa-east-1 documented as discovery
- ✅ pg_advisory_xact_lock documented as compatible (NONE risk)
- ✅ 71 migrations strategy confirmed (try-as-is)
