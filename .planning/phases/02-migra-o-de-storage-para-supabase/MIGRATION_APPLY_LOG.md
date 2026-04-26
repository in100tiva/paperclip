# Migration Apply Log — Supabase bxlczioxgizgvtznukwt

**Phase:** 02 (Migração de Storage para Supabase)
**Requirement satisfied:** DB-01
**Applied at:** 2026-04-26T03:41:30Z
**Applied by:** Claude (executor de plano 02-04, Wave 3 paralelo)
**Status:** Complete (Option A — clean apply)

## Pre-conditions

- Initial public table count: **0** (Supabase project `bxlczioxgizgvtznukwt` was empty in `public.*`)
- Connection target: `aws-1-sa-east-1.pooler.supabase.com:5432` (Supavisor session mode, via `SUPABASE_DB_URL`)
- 71 migrations existentes em `packages/db/src/migrations/` (`0000_*.sql` … `0070_*.sql`)
- Strategy (per CONTEXT.md): try-apply-first, regenerate-baseline-only-if-needed
- Driver state: `createDb` Supavisor-aware (Plano 02-03 entregue), pool `max:5, idle_timeout:20`

## Approach

```bash
DATABASE_URL=$SUPABASE_DB_URL PAPERCLIP_MIGRATION_AUTO_APPLY=true pnpm db:migrate
```

Comando único, executado uma vez, sem necessidade de retentativas ou correções. Driver via `migrate.ts` → `applyPendingMigrations(connectionString)` (drizzle-kit migrator API).

## Result

### Option A — Clean apply (todas as 71)

- **Output final:** `Migrations complete`
- **Tabelas pós-apply:** **80** em `public.*` (paperclip schema completo, incluindo Better Auth tables `user`/`session`/`account`/`verification`)
- **drizzle_migrations row count:** **71** (todas as migrations registradas em `drizzle.__drizzle_migrations`)
- **Tempo total de aplicação:** ~6 segundos (fast, schema relativamente pequeno)
- **Extensions verificadas pós-apply:** `pg_trgm`, `pgcrypto`, `uuid-ossp` (todas presentes; `pgcrypto` e `uuid-ossp` já vinham habilitadas no Supabase free tier)

Sem nenhuma intervenção manual necessária. A previsão ex ante do MIGRATION_AUDIT.md (J.3, "Confiança ALTA") foi confirmada empiricamente.

## Discoveries

- **Apenas 1 `CREATE EXTENSION IF NOT EXISTS pg_trgm`** (em `0051_young_korg.sql`) e o role do connection string (`postgres.bxlczioxgizgvtznukwt`) tem permissão para criar extensions — não foi necessário pré-criar via Supabase SQL Editor.
- **Zero `CREATE SCHEMA`** customizado nas 71 migrations — sem conflito com schema interno `auth` do Supabase.
- **Better Auth schema (text-id)** convive com schema `auth` do Supabase Auth (não usado neste projeto) sem qualquer namespace clash, porque Better Auth usa `public.user`/`public.session`/etc. (não `auth.user`).
- **Supavisor session mode (porta 5432)** aceitou DDL completo sem erro — confirma que para migrations devemos usar `SUPABASE_DB_URL` (não `DATABASE_URL` 6543 transaction mode).
- **80 tabelas finais** vs estimativa de "~75+" do plano — match dentro da margem.

## Configuração Manual Pendente

⚠️  **GitHub Actions secret necessário antes do primeiro push para `main` que toque `packages/db/`:**

- Settings → Secrets and variables → Actions → New repository secret
- **Name:** `SUPABASE_DB_URL`
- **Value:** `postgresql://postgres.bxlczioxgizgvtznukwt:<password>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`

Sem esse secret, o workflow `.github/workflows/db-migrate.yml` (criado neste plano) falhará com `::error::SUPABASE_DB_URL secret is not configured`. **TODO para o owner do repo.** Esta configuração não pode ser feita via código — é manual via GitHub UI.

## Next steps

- **Plan 02-05 (Better Auth wiring):** desbloqueado — schema para `user`/`session`/`account`/`verification` está presente em Supabase
- **Plan 02-06 (Smoke test E2E):** desbloqueado — ambiente pronto para validar dev-A signup → dev-B vê mesma company

## References

- `.planning/phases/02-migra-o-de-storage-para-supabase/MIGRATION_AUDIT.md` (J.1-J.3 strategy decision: try-as-is com confiança alta)
- `.planning/phases/02-migra-o-de-storage-para-supabase/02-CONTEXT.md` (decisões travadas: 6543 vs 5432, drizzle-kit como única fonte)
- `.planning/research/PITFALLS.md` Armadilha 3 (auto-migrations gate, conflict prevention)
- `.planning/phases/02-migra-o-de-storage-para-supabase/02-03-SUMMARY.md` (driver Supavisor-aware, ensureMigrations gate ativo)

---
*Apply complete: 2026-04-26T03:41:30Z*
