---
state_version: 1.0
milestone: v1.0
milestone_name: Fork + Multi-Account
status: in-progress
last_updated: "2026-04-26T05:17:27Z"
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 18
  completed_plans: 15
---

# Estado do Projeto

## Referência do Projeto

Ver: .planning/PROJECT.md (atualizado em 2026-04-25)

**Valor central:** Equipe inteira opera sobre estado compartilhado (Supabase remoto) e agentes nunca param por exhaustão de token — basta trocar conta e continuar.
**Foco atual:** Phase 4 (Spike Multi-Account Detection) em execução paralela — Wave 1 planos 04-01 (taxonomia 429) + 04-02 (decisão arquitetural) completos

## Posição Atual

Fase: 4 de 6 (Spike Multi-Account Claude Code Detection) — **EM EXECUÇÃO**
Plano: 04-01 + 04-02 concluídos (2/5 planos da Phase 4). Outros planos da Wave 1 (04-03, 04-04) podem estar em execução paralela.
Status: SPIKE-01 + SPIKE-03 satisfeitos. CLAUDE_429_TAXONOMY.md mapeia 6 tipos contra regex existente (4 yes, 2 partial — tpm_transient sem discriminator via mensagem, org_tier sem token canônico, ambos pendentes HUMAN-UAT-04-01). DECISION-DETECTION-STRATEGY.md registra decisão arquitetural (reativa primary, pré-emptiva opt, cooldown 30s, retry-after honrado). Spike permanece read-only sobre `packages/adapters/claude-local/src/server/`.
Última atividade: 2026-04-26 — Plano 04-01 concluído em 2min (commit `7554d10`): CLAUDE_429_TAXONOMY.md em pt-br (108 linhas) com tabela de 6 tipos (rpm_transient, tpm_transient, daily_quota, weekly_quota, org_tier, session_5h) auditada contra `CLAUDE_TRANSIENT_UPSTREAM_RE` (parse.ts:13) e `CLAUDE_EXTRA_USAGE_RESET_RE` (parse.ts:14); 7 headers Anthropic referenciados. Production code untouched.

Progresso: [████████░░] 83% (15/18 plans — atualizado por update-progress tool)

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
| 03-team-onboarding | 5 | ~50min | ~10min |
| 04-spike-detection | 2+ | ~3min+ | ~1.5min (artefatos documentais puros) |

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
- 03-05: TEAM-SIGNUP-PROCEDURE.md (185 linhas, pt-br) documenta bootstrap CEO via `tsx packages/db/scripts/create-auth-bootstrap-invite.ts --config <path> --base-url <url>` + cadastro coletivo de 4+ devs via fluxo `company_join` existente (D-09: zero código novo). 3 SQL queries de validação literal (pre-check bootstrap_ceo, count intermediário 1user/1company, count final 5+ users na shared company). Modo `authenticated` documentado como override obrigatório (finding 02-06). Fallback `pending-team-growth` aceito explicitamente — proibido falsificar users via SQL (viola D-09 e quebra cost attribution Fase 6). Forward link para 03-HUMAN-UAT.md#uat-03-02 (será resolvido pelo plano paralelo 03-04 da Wave 2). Satisfies TEAM-01 (no que é automatizável; execução real é HUMAN-UAT).
- 03-04: CROSS-MACHINE-SMOKE.md (142 linhas, pt-br) documenta procedimento canônico D-13 (Dev A em máquina X cria company → Dev B em máquina Y vê via Supabase remoto + cookie `paperclip-team-shared` interoperável) + fallback single-host D-14 (two-browser-profiles, com limitação explícita de não provar literalmente cross-machine) + bloco de log timestamped D-15. 03-HUMAN-UAT.md (82 linhas) com frontmatter YAML (`type: human-uat`, `status: pending`) lista 2 UATs: UAT-03-01 (TEAM-04 cross-machine smoke) e UAT-03-02 (TEAM-01 5+ devs com SQL inline pra Supabase Studio). Decisão de roteamento: TEAM-04 satisfeito como **artefato** (procedimento auto-suficiente existe), validação **empírica** explicitamente HUMAN-UAT — executor Claude não tem duas máquinas físicas distintas, fingir validação seria desonesto. Phase 3 fecha como complete-with-pending-UAT (artefatos entregues, UATs ficam como trabalho contínuo da equipe). Satisfies TEAM-04.
- 04-02: DECISION-DETECTION-STRATEGY.md (102 linhas, pt-br) registra decisão arquitetural sobre detecção 429 Claude Code: (1) **reativa como primary** (parse stream-JSON/stderr via `CLAUDE_TRANSIENT_UPSTREAM_RE` parse.ts:13 — battle-tested, transport-agnostic, não depende de headers HTTP); (2) **pré-emptiva como enhancement opt-in** (anthropic-ratelimit-tokens-remaining, condicional a investigação empírica confirmar que CLI propaga esses headers); (3) **cooldown 30s configurável** via `CLAUDE_ACCOUNT_COOLDOWN_SECONDS` aplicando-se APÓS swap real (não bloqueia primeira detecção; `agent_account_bindings.lastRotatedAt` é o gate); (4) **retry-after honrado** — `extractClaudeRetryNotBefore` (execute.ts:640) já produz ISO timestamp utilizável diretamente como `claude_accounts.exhaustedUntil`. Tabela de trade-offs cobre 5 cenários (token-bucket reset prematuro → threshold conservador; retry-after ausente em org_tier → fallback 5min; cooldown saturando pool em rajadas → só aplica após swap real; regex change entre versões CLI → logging para auditoria; headers não expostos → fallback transparente). Mapeamento explícito para Phase 5: MULTI-06 reusa regex existente em vez de duplicar; MULTI-04 filtra por `exhaustedUntil > now AND lastRotatedAt > now - cooldown`; MULTI-01 modela `lastQuotaWindowsJson` por tipos da taxonomia (rpm/tpm/daily/weekly/5h/org). Spike NÃO modifica produção (`git diff master~1..master -- packages/adapters/claude-local/src/server/` = 0 files). Satisfies SPIKE-03.
- 04-01: CLAUDE_429_TAXONOMY.md (108 linhas, pt-br) audita 6 tipos de 429 (rpm_transient, tpm_transient, daily_quota, weekly_quota, org_tier, session_5h) contra `CLAUDE_TRANSIENT_UPSTREAM_RE` (parse.ts:13) e `CLAUDE_EXTRA_USAGE_RESET_RE` (parse.ts:14). Cobertura: 4 yes (rpm/daily/weekly/5h cobertos diretamente pelo regex existente); 2 partial — **tpm_transient** sem discriminator de dimensão via mensagem (RPM e TPM textualmente indistinguíveis; discriminator natural vem de header `*-reset` zerado, não da string), **org_tier** sem token canônico empiricamente confirmado (cai em fallback transient_upstream genérico via `overloaded_error`/`service_unavailable`/`503`/`529`). Implicação para Phase 5 MULTI-06: classifier deve REUSAR regex existente, não duplicar; gaps `partial` são candidatos a extensão pontual quando HUMAN-UAT-04-01 capturar fixtures reais. Sub-tipo discriminator no output do classifier (`type: "rpm_transient" | "tpm_transient" | "daily_quota" | "weekly_quota" | "session_5h" | "org_tier" | "unknown"`) é design pattern recomendado mesmo quando regex de detecção compartilha match — UI/schema diferenciam políticas. Tabela de 7 headers Anthropic incluída como referência (`anthropic-ratelimit-{requests,tokens}-{limit,remaining,reset}` + `retry-after`); investigação empírica em UAT-04-01 confirma se Claude Code CLI propaga estes headers no stream-JSON (destrava decisão pré-emptiva do 04-02). Spike NÃO modifica produção. Satisfies SPIKE-01.

### Todos Pendentes

Nenhum ainda.

### Bloqueios/Preocupações

- **Wart conhecido (Windows, deferido para Phase 3):** stale `~/.paperclip/instances/default/runtime-services/` survives `taskkill //F //T //PID`. Recomendar `scripts/kill-dev.sh` para shutdown gracioso. Candidatos de fix: PowerShell wrapper, `SIGBREAK` handler em `dev-runner.ts`, ou defensive PID-alive check no startup. Documentado em `.planning/phases/01-fork-hard-cerim-nia-de-corte/SMOKE-TEST-LOG.md` Outcome.
- **Configuração manual pendente (02-04, owner do repo):** GitHub Actions secret `SUPABASE_DB_URL` precisa ser adicionado via Settings → Secrets and variables → Actions antes do primeiro merge para `main` que toque `packages/db/`. Sem o secret, workflow `.github/workflows/db-migrate.yml` falha cedo com erro claro. Documentado em `MIGRATION_APPLY_LOG.md` e `02-04-SUMMARY.md`.

## Continuidade de Sessão

Última sessão: 2026-04-26
Parou em: Phase 4 Wave 1 paralela em execução — 04-01 (CLAUDE_429_TAXONOMY.md, SPIKE-01) + 04-02 (DECISION-DETECTION-STRATEGY.md, SPIKE-03) concluídos. Outros planos da Wave (04-03, 04-04) podem ter sido fechados em paralelo por agentes separados — verificar arquivos `04-NN-SUMMARY.md` no diretório da fase para status atualizado.
Arquivo de retomada: Nenhum
