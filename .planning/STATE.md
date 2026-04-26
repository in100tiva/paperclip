---
state_version: 1.0
milestone: v1.0
milestone_name: Fork + Multi-Account
status: completed
last_updated: "2026-04-26T03:42:00.000Z"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 8
  completed_plans: 5
---

# Estado do Projeto

## Referência do Projeto

Ver: .planning/PROJECT.md (atualizado em 2026-04-25)

**Valor central:** Equipe inteira opera sobre estado compartilhado (Supabase remoto) e agentes nunca param por exhaustão de token — basta trocar conta e continuar.
**Foco atual:** Fase 1 concluída — pronto para `/planejar-fase 2` (Migração de Storage para Supabase)

## Posição Atual

Fase: 2 de 6 (Migração de Storage para Supabase) — **EM PROGRESSO**
Plano: Wave 2 (02-03) concluído. Próximo: iniciar Wave 3 (02-04 + 02-05 podem rodar em paralelo).
Status: Phase 02 Wave 2 done — driver Supavisor-aware online; embedded fallback opt-in; auto-migrations gate ativo; .env.example team-shared
Última atividade: 2026-04-26 — Plano 02-03 concluído: createDb port-aware (6543→prepare:false, max:5), runtime-config exige PAPERCLIP_DB_MODE para embedded fallback, server promptApplyMigrations recusa non-TTY, drizzle.config prefere SUPABASE_DB_URL, .env.example reescrito com 9 env vars críticas. INFRA-02..06 + DB-02 satisfeitos.

Progresso: [██████░░░░] 63% (5 / 8 plans complete)

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

- Últimos 5 planos: 01-02 (~15min), 02-01 (~6min), 02-02 (~5min), 02-03 (~40min)
- Tendência: 02-03 mais longo — TDD para client.ts + 6 arquivos tocados + alinhamento de teste runtime-config existente (Regra 1 deviation). Server vitest suite completa demorou ~28min (suite tem 1345 testes, 64 falhas pré-existentes em workspace-runtime no Windows; nada relacionado às mudanças deste plano).

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

### Todos Pendentes

Nenhum ainda.

### Bloqueios/Preocupações

- **Wart conhecido (Windows, deferido para Phase 3):** stale `~/.paperclip/instances/default/runtime-services/` survives `taskkill //F //T //PID`. Recomendar `scripts/kill-dev.sh` para shutdown gracioso. Candidatos de fix: PowerShell wrapper, `SIGBREAK` handler em `dev-runner.ts`, ou defensive PID-alive check no startup. Documentado em `.planning/phases/01-fork-hard-cerim-nia-de-corte/SMOKE-TEST-LOG.md` Outcome.

## Continuidade de Sessão

Última sessão: 2026-04-26
Parou em: Concluído 02-03-PLAN.md (DB connection patches + env scaffolding, INFRA-02..06 + DB-02). Wave 2 da Fase 02 completa. Pronto para Wave 3 (02-04 apply-migrations + 02-05 auth-wiring podem executar em paralelo).
Arquivo de retomada: Nenhum
