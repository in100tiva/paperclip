---
state_version: 1.0
milestone: v1.0
milestone_name: Fork + Multi-Account
status: completed
last_updated: "2026-04-26T02:54:51.073Z"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 8
  completed_plans: 4
---

# Estado do Projeto

## Referência do Projeto

Ver: .planning/PROJECT.md (atualizado em 2026-04-25)

**Valor central:** Equipe inteira opera sobre estado compartilhado (Supabase remoto) e agentes nunca param por exhaustão de token — basta trocar conta e continuar.
**Foco atual:** Fase 1 concluída — pronto para `/planejar-fase 2` (Migração de Storage para Supabase)

## Posição Atual

Fase: 2 de 6 (Migração de Storage para Supabase) — **EM PROGRESSO**
Plano: Wave 1 completa (02-01 + 02-02 ambos concluídos em paralelo). Próximo: iniciar Wave 2 (02-03).
Status: Phase 02 Wave 1 done — pre-commit guard online + migration audit publicado
Última atividade: 2026-04-26 — Plano 02-02 concluído: husky 9.1.7 + scripts/check-no-service-role-leak.mjs (7/7 vitest cases pass). Pre-commit hook bloqueia JWT em ui/src/** + VITE_*SERVICE_ROLE/SECRET* em qualquer arquivo. AUTH-05 satisfeito.

Progresso: [█████░░░░░] 50% (4 / 8 plans complete)

## Métricas de Performance

**Velocidade:**

- Total de planos concluídos: 4
- Duração média: ~7 min
- Tempo total de execução: 0h 29min (3min + ~15min + ~6min + ~5min)

**Por Fase:**

| Fase | Planos | Total | Média/Plano |
|------|--------|-------|-------------|
| 01-fork-hard | 2 | ~18min | ~9min |
| 02-supabase | 2+ | ~11min+ | ~5.5min |

**Tendência Recente:**

- Últimos 5 planos: 01-01 (3min), 01-02 (~15min), 02-01 (~6min), 02-02 (~5min)
- Tendência: 02-02 TDD execution rapid — checker tests + impl + husky wiring fluiram sem bloqueios; pnpm install (2m11s) foi a maior parte do wall-clock.

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

### Todos Pendentes

Nenhum ainda.

### Bloqueios/Preocupações

- **Wart conhecido (Windows, deferido para Phase 3):** stale `~/.paperclip/instances/default/runtime-services/` survives `taskkill //F //T //PID`. Recomendar `scripts/kill-dev.sh` para shutdown gracioso. Candidatos de fix: PowerShell wrapper, `SIGBREAK` handler em `dev-runner.ts`, ou defensive PID-alive check no startup. Documentado em `.planning/phases/01-fork-hard-cerim-nia-de-corte/SMOKE-TEST-LOG.md` Outcome.

## Continuidade de Sessão

Última sessão: 2026-04-26
Parou em: Concluído 02-02-PLAN.md (pre-commit leak guard, AUTH-05). Wave 1 da Fase 02 completa (02-01 + 02-02 paralelos). Pronto para Wave 2 (02-03 schema/migrations).
Arquivo de retomada: Nenhum
