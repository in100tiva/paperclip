---
state_version: 1.0
milestone: v1.0
milestone_name: Fork + Multi-Account
status: Phase 02 Wave 3 complete — schema applied to Supabase (80 tables, 71 migrations) + auth wiring validated (AUTH-01..04) + CI pipeline + governance
last_updated: "2026-04-26T03:46:00.000Z"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 8
  completed_plans: 7
---

# Estado do Projeto

## Referência do Projeto

Ver: .planning/PROJECT.md (atualizado em 2026-04-25)

**Valor central:** Equipe inteira opera sobre estado compartilhado (Supabase remoto) e agentes nunca param por exhaustão de token — basta trocar conta e continuar.
**Foco atual:** Fase 1 concluída — pronto para `/planejar-fase 2` (Migração de Storage para Supabase)

## Posição Atual

Fase: 2 de 6 (Migração de Storage para Supabase) — **EM PROGRESSO**
Plano: Wave 3 completa (02-04 + 02-05 concluídos em paralelo). Próximo: iniciar Wave 4 (02-06 E2E smoke test).
Status: Phase 02 Wave 3 complete — schema applied to Supabase (80 tables, 71 migrations) + auth wiring validated (AUTH-01..04) + CI pipeline + governance
Última atividade: 2026-04-26 — Plano 02-04 concluído (paralelo com 02-05): 71 migrations aplicaram cleanly contra Supabase pooler 5432 (Outcome A — sem regenerate-baseline necessário); 80 tabelas em public.* incluindo Better Auth; .github/workflows/db-migrate.yml criado como único caminho automatizado (concurrency group, path filter, workflow_dispatch); PR template DB-04 + CONTRIBUTING.md Database Migration Policy estabelecem governança humana. DB-01/03/04/05 satisfeitos. TODO manual: owner do repo adicionar secret SUPABASE_DB_URL no GitHub.

Progresso: [█████████░] ~88% (atualizado por update-progress tool)

## Métricas de Performance

**Velocidade:**

- Total de planos concluídos: 5
- Duração média: ~13 min
- Tempo total de execução: 1h 09min (3min + ~15min + ~6min + ~5min + ~40min)

**Por Fase:**

| Fase | Planos | Total | Média/Plano |
|------|--------|-------|-------------|
| 01-fork-hard | 2 | ~18min | ~9min |
| 02-supabase | 3+ | ~51min+ | ~17min |

**Tendência Recente:**

- Últimos 5 planos: 02-01 (~6min), 02-02 (~5min), 02-03 (~40min), 02-04 (~4min), 02-05 (paralelo)
- Tendência: 02-04 muito rápido — Outcome A (clean apply) confirmado de primeira; sem retentativas, sem regenerate-baseline. Maior tempo gasto foi em escrita de YAML/Markdown e self-check, não no apply em si (~6s). Confirma a hipótese ALTA do MIGRATION_AUDIT (J.3).

*Atualizado após cada conclusão de plano*

## Contexto Acumulado

### Decisões

Decisões estão registradas na tabela de Decisões Chave do PROJECT.md.
Decisões recentes que afetam o trabalho atual:

- Inicial: Fork hard sem upstream — liberdade para customizar sem custo de merge contínuo.
- Inicial: Supabase remoto compartilhado (`bxlczioxgizgvtznukwt`) — estado único da equipe.
- Inicial: Manter Better Auth, usar Supabase só como Postgres — schemas text-id incompatíveis com `auth.users` uuid; migração HIGH effort sem ganho v1.
- Inicial: RLS opcional no v1 — sem `auth.uid()` resolúvel; autorização aplicacional via membership.
- Roadmap: Fase 4 é spike investigativo puro — sem código de produção; entregáveis são taxonomia 429, classifier prototype e validação de mecânica de retomada.
- 01-01: Import strategy = `git read-tree -u --reset` from temporary remote (não clone-to-temp). Mantém SHA traceable em git history.
- 01-01: Substituir paperclip's CONTRIBUTING.md inteiramente (hard-fork policy supersede upstream contribution guide).
- 01-01: Renomear paperclip's root ROADMAP.md → paperclip-ROADMAP.md (preservar como referência; nosso roadmap em .planning/).
- 01-02: Default `mode: embedded-postgres` validado — paperclip's runtime-config faz fallback para embedded sem precisar de env override.
- 01-02: Server + Vite compartilham porta 3100 via Vite dev middleware mounted in-process (paperclip pattern; não portas separadas).
- 01-02: Stale runtime-services registry on Windows é wart conhecido — taskkill não dispara cleanup hooks. Diferido para Phase 3 (workflow + onboarding).
- 01-02: Captured concrete baseline values (ports 3100/54329, 71 migrations, /api/health 200, UI dark-theme) — Phase 2 deve preservar fallback path contra essa referência literal.
- 02-01: 71 migrations apply try-as-is contra Supabase (apenas 1 CREATE EXTENSION pg_trgm, zero CREATE SCHEMA custom — alta confiança ex ante).
- 02-01: pg_advisory_xact_lock confirmado compatível com Supavisor transaction mode (xact, lock liberado no commit/rollback).
- 02-01: auto-migrations no startup serão desabilitadas no plano 02-03 (HIGH risk em DB compartilhado por 5 devs).
- 02-01: pool config travada — max=5, idle_timeout=20, prepare:false condicional para porta 6543.
- 02-01: `aws-1-sa-east-1.pooler.supabase.com` confirmado como hostname Supavisor empírico (não documentado em Supabase docs públicas).
- 02-02: Pre-commit guard escolheu husky@9 (idiomatic single-line hook) em vez de simple-git-hooks ou lint-staged-only. Husky se auto-instala via `prepare` script — zero fricção para devs novos.
- 02-02: Path classification rule: `ui/src/**` + `*.tsx`/`*.jsx` são client-side (forbidden for JWTs); `server/**`, `packages/**`, `scripts/**` são livres. VITE_*SERVICE_ROLE/SECRET* names são bloqueados em qualquer arquivo (env files inclusive).
- 02-02: Standalone vitest config (`scripts/check-no-service-role-leak.vitest.config.mjs`) necessária — root vitest.config.ts declara 12 workspace projects, nenhum inclui `scripts/`. Adicionado como artefato versionado para verifiability.
- 02-03: `buildPostgresOptions` retorna `undefined` para portas ≠ 6543/5432 — preserva default postgres-js do embedded sem fricção em vez de expor options vazio.
- 02-03: Embedded fallback agora opt-in via `PAPERCLIP_DB_MODE=embedded-postgres`; sem flag E sem DATABASE_URL → throw acionável (fail-fast detecta misconfig imediatamente, em vez de cair silenciosamente em embedded).
- 02-03: `drizzle.config.ts` lança erro quando nenhum env var presente (drizzle-kit ser invocado sem env apontando para Supabase é misconfig grave que pode aplicar DDL no lugar errado).
- 02-03: Two-URL convention estabelecido: `DATABASE_URL` = pooler 6543 (transaction, app runtime), `SUPABASE_DB_URL` = pooler 5432 (session, DDL/migrations). Ambos no `.env.example` com TODO_FILL_ME.
- 02-03: `promptApplyMigrations` em non-TTY retorna `false` (era `true`) — fechamento de Audit F.1 HIGH risk. Watchers/dev-runner/daemon não aplicam migrations sem opt-in (`PAPERCLIP_MIGRATION_AUTO_APPLY=true`) ou TTY interativo.
- 02-05: Verification-only execution — better-auth.ts módulo preservado intacto (zero edits estruturais), apenas comment block (33 linhas) mapeando AUTH-01..04 a linhas específicas. Readiness suite (7 tests) valida AUTH-01 (integration contra Supabase real, gated por SUPABASE_DB_URL) + AUTH-02 (5 unit tests, cookie prefix paperclip-team-shared empiricamente confirmado).
- 02-05: Integration test gated por `it.skipIf(skipReason !== null)` baseado em SUPABASE_DB_URL/DATABASE_URL presence — graceful skip sem env, valida wiring real com .env.local. Padrão reusable para futuras fases de testes que requerem secrets.
- 02-04: 71 migrations aplicaram cleanly contra Supabase pooler 5432 (Outcome A) — 80 tabelas em `public.*`, 71 rows em `drizzle.__drizzle_migrations`; sem necessidade de regenerate-baseline. Confiança ex ante do MIGRATION_AUDIT.md (J.3 ALTA) confirmada empiricamente em ~6s de apply.
- 02-04: GitHub Actions workflow `db-migrate.yml` é único caminho automatizado de `pnpm db:migrate` em merge para `main` (DB-03). Concurrency group `db-migrate-supabase` impede runs paralelas; `workflow_dispatch` habilitado para emergências manuais. Path filter restrito a `packages/db/src/{migrations,schema}/**` + `drizzle.config.ts`.
- 02-04: Schema governance dual gate — humano (PR template `## Schema/Migration Changes (DB-04)` com 4 checkboxes) + automatizado (workflow path filter). CONTRIBUTING.md `## Database Migration Policy` declara drizzle-kit como única fonte (DB-05), proíbe explicitamente `supabase migration new` e `pnpm db:migrate` local contra Supabase compartilhado.
- 02-04: Workflow YAML usa `working-directory: packages/db` nos steps node de verification — postgres package resolve via `packages/db/node_modules` (workspace install pattern). Lição aprendida durante pré-flight local: `node -e "require('postgres')"` rodando do root falha com MODULE_NOT_FOUND.

### Todos Pendentes

Nenhum ainda.

### Bloqueios/Preocupações

- **Wart conhecido (Windows, deferido para Phase 3):** stale `~/.paperclip/instances/default/runtime-services/` survives `taskkill //F //T //PID`. Recomendar `scripts/kill-dev.sh` para shutdown gracioso. Candidatos de fix: PowerShell wrapper, `SIGBREAK` handler em `dev-runner.ts`, ou defensive PID-alive check no startup. Documentado em `.planning/phases/01-fork-hard-cerim-nia-de-corte/SMOKE-TEST-LOG.md` Outcome.
- **Configuração manual pendente (02-04, owner do repo):** GitHub Actions secret `SUPABASE_DB_URL` precisa ser adicionado via Settings → Secrets and variables → Actions antes do primeiro merge para `main` que toque `packages/db/`. Sem o secret, workflow `.github/workflows/db-migrate.yml` falha cedo com erro claro. Documentado em `MIGRATION_APPLY_LOG.md` e `02-04-SUMMARY.md`.

## Continuidade de Sessão

Última sessão: 2026-04-26
Parou em: Concluído 02-04-PLAN.md (apply migrations + GitHub Actions pipeline + governance, DB-01/03/04/05) e 02-05-PLAN.md (auth wiring validation, AUTH-01..04) em paralelo. Wave 3 completa. Pronto para Wave 4 (02-06 E2E smoke test).
Arquivo de retomada: Nenhum
