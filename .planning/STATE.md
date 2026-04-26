---
state_version: 1.0
milestone: v1.0
milestone_name: Fork + Multi-Account
status: completed
last_updated: "2026-04-26T04:44:27.817Z"
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 13
  completed_plans: 11
---

# Estado do Projeto

## Referência do Projeto

Ver: .planning/PROJECT.md (atualizado em 2026-04-25)

**Valor central:** Equipe inteira opera sobre estado compartilhado (Supabase remoto) e agentes nunca param por exhaustão de token — basta trocar conta e continuar.
**Foco atual:** Fase 2 concluída — pronto para `/planejar-fase 3` (Workflow de Equipe + Onboarding)

## Posição Atual

Fase: 3 de 6 (Workflow de Equipe + Onboarding) — **NÃO INICIADA**
Plano: Phase 2 completa em 6/6 planos. Próximo: `/planejar-fase 3`.
Status: Phase 02 complete — Supabase remoto operacional, Better Auth signup + cookie prefix paperclip-team-shared validados E2E, 16/16 requirements satisfeitos
Última atividade: 2026-04-25 — Plano 02-06 concluído (Wave 4): smoke E2E automatizado 7/7 PASS contra server `authenticated` apontando para Supabase pooler 6543; cookie `paperclip-team-shared.session_token` confirmado literal; signup roundtrip + Supabase SQL verification para dois usuários; human-verify aprovado pelo owner. Phase 2 declared complete (16/16 requirements: INFRA-01..06, DB-01..05, AUTH-01..05). Findings forward capturados para Phase 3 TEAM-02/TEAM-05 em SMOKE-TEST-LOG.md.

Progresso: [██████████] 100% (atualizado por update-progress tool)

## Métricas de Performance

**Velocidade:**

- Total de planos concluídos: 8
- Duração média: ~13 min
- Tempo total de execução: ~1h 30min

**Por Fase:**

| Fase | Planos | Total | Média/Plano |
|------|--------|-------|-------------|
| 01-fork-hard | 2 | ~18min | ~9min |
| 02-supabase | 6 | ~71min+ | ~12min |

**Tendência Recente:**

- Últimos 6 planos (Phase 2): 02-01 (~6min), 02-02 (~5min), 02-03 (~40min), 02-04 (~4min), 02-05 (paralelo), 02-06 (~20min + checkpoint humano)
- Tendência: planos com checkpoints humanos (02-06) consomem wall-clock proporcional ao tempo de validação manual; planos auto-only fluem rápido (02-04 ~4min). Investimento alto em audit (02-01/02-03) destrava waves seguintes em minutos.

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
- 02-06: Smoke E2E não orquestra server — script roda contra server externo (humano/Claude inicia `pnpm --filter @paperclipai/server dev`). Child-process orchestration em Windows com Vite middleware é brittle; manter responsabilidades separadas mantém o smoke focado em validar wiring real, não startup.
- 02-06: `dev-runner.ts` em `pnpm dev`/`pnpm dev:once` arranca em `local_trusted` mode (Better Auth handler não montado). Para exercitar `authenticated` mode em local com loopback bind, invocar `PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev`. Captured como finding para TEAM-02 (onboarding doc Phase 3).
- 02-06: Better Auth rejeita signup sem header `Origin` com 403 `MISSING_OR_NULL_ORIGIN`. Clientes (testes, scripts) precisam enviar `Origin: <server-url>` ou hostname declarado em `BETTER_AUTH_TRUSTED_ORIGINS`. Captured para TEAM-05 (troubleshooting Phase 3).
- 02-06: Default-company auto-create é gated a `local_trusted` mode (`ensureLocalTrustedBoardPrincipal`); em `authenticated`, signups novos não recebem company default e `GET /api/companies` retorna `[]`. Comportamento correto — onboarding team-shared (invite/board-claim) é responsabilidade da Phase 3 TEAM-01.
- 02-06: Phase 2 declared complete via human-verify approval; 16/16 requirements satisfeitos (INFRA-01..06, DB-01..05, AUTH-01..05). Multi-dev cross-machine validation deferida para Phase 3 TEAM-04 — infra está pronta, falta só o human flow.
- 03-02: ONBOARDING.md pt-br criado na raiz (124 linhas, 7 seções H2 numeradas seguindo D-06) com tempo-alvo <30min declarado no topo (D-07). Vars críticas em tabela markdown; PAPERCLIP_INSTANCE_ID=team-shared destacado como literal obrigatório com aviso de divergência → cookie isolado. Modo `authenticated` documentado como override explícito para invite flow (finding 02-06: pnpm dev arranca em local_trusted, Better Auth handler não montado). Bootstrap CEO vs dev #2..N split na seção 6. README.md ganhou nota DDD curta no topo apontando para ONBOARDING.md (D-08); paperclip body intocado byte-por-byte (439 linhas remanescentes). Anchor convention estabelecida para TROUBLESHOOTING.md em snake-case (#windows-ntfs, #cookie-prefix-divergente). TEAM-02 satisfeito.
- 03-03: TROUBLESHOOTING.md pt-br criado (193 linhas, 7 seções) cobrindo Windows NTFS, stale registry, too-many-connections, cookie prefix, schema desatualizado, claude CLI, prepared statement 6543. Anchors GFM alinhados com links do ONBOARDING.md; cada causa em código cita path:linha (D-18). Satisfies TEAM-05.

### Todos Pendentes

Nenhum ainda.

### Bloqueios/Preocupações

- **Wart conhecido (Windows, deferido para Phase 3):** stale `~/.paperclip/instances/default/runtime-services/` survives `taskkill //F //T //PID`. Recomendar `scripts/kill-dev.sh` para shutdown gracioso. Candidatos de fix: PowerShell wrapper, `SIGBREAK` handler em `dev-runner.ts`, ou defensive PID-alive check no startup. Documentado em `.planning/phases/01-fork-hard-cerim-nia-de-corte/SMOKE-TEST-LOG.md` Outcome.
- **Configuração manual pendente (02-04, owner do repo):** GitHub Actions secret `SUPABASE_DB_URL` precisa ser adicionado via Settings → Secrets and variables → Actions antes do primeiro merge para `main` que toque `packages/db/`. Sem o secret, workflow `.github/workflows/db-migrate.yml` falha cedo com erro claro. Documentado em `MIGRATION_APPLY_LOG.md` e `02-04-SUMMARY.md`.

## Continuidade de Sessão

Última sessão: 2026-04-26
Parou em: Concluído 03-02-PLAN.md (ONBOARDING.md + nota README, TEAM-02). Plano paralelo 03-03 também concluído (TROUBLESHOOTING.md, TEAM-05). Aguardando demais waves da Fase 3.
Arquivo de retomada: Nenhum
