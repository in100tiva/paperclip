# Roadmap: DDD — Paperclip da Equipe

## Milestones

- 🚧 **v1.0 Fork + Multi-Account** — Fases 1-6 (em andamento)

## Visão Geral

Forkar hard o paperclip, trocar Postgres embedded por Supabase compartilhado mantendo Better Auth, estabelecer convenções de equipe para 5+ devs, validar empiricamente o comportamento de exhaustão do Claude Code via spike, implementar pool multi-conta com swap automático, e fechar com multi-projeto + polish guiado por sinal real. Seis fases, ordem ditada por governança antes de técnica e isolamento de pontos de falha.

## Fases

**Numeração de Fases:**
- Fases inteiras (1, 2, 3): Trabalho planejado do milestone
- Fases decimais (2.1, 2.2): Inserções urgentes (marcadas com INSERTED)

Fases decimais aparecem entre seus inteiros vizinhos em ordem numérica.

- [x] **Phase 1: Fork Hard + Cerimônia de Corte** — Clonar paperclip, cortar upstream, smoke test baseline em Windows
- [x] **Phase 2: Migração de Storage para Supabase** — Trocar Postgres embedded por Supabase remoto preservando Better Auth (completed 2026-04-26)
- [x] **Phase 3: Workflow de Equipe + Onboarding** — Convenções operacionais e onboarding sem fricção para 5+ devs (artefatos completos, complete-with-pending-UAT — TEAM-04 e TEAM-01 execução real em 03-HUMAN-UAT.md)
- [x] **Phase 4: Spike — Multi-Account Claude Code Detection** — Investigação empírica de exhaustão e mecânica de swap (sem código de produção) (completed 2026-04-26)
- [ ] **Phase 5: Multi-Account Claude Code Swap (Implementação)** — Pool de contas, rotação atômica e continuidade preservada em exhaustão
- [ ] **Phase 6: Multi-Projeto + Polish** — Múltiplas companies em paralelo, cost attribution por projeto e fechamento do v1

## Detalhes das Fases

### Phase 1: Fork Hard + Cerimônia de Corte

**Goal**: Repo do paperclip clonado para `d:\projetos\ddd`, identidade reescrita como `ddd`, upstream removido, política de fork hard documentada e smoke test baseline (`pnpm dev` com embedded Postgres) passando em Windows antes de qualquer mudança técnica.

**Depends on**: Nada (primeira fase)

**Requirements**: FORK-01, FORK-02, FORK-03, FORK-04, FORK-05

**Success Criteria** (o que deve ser VERDADEIRO):
1. Qualquer dev da equipe pode clonar o repo `ddd` e rodar `pnpm install && pnpm dev` em Windows com sucesso (embedded Postgres ativo, sem erros de boot).
2. `git remote -v` não lista `paperclipai/paperclip` como upstream — fork está cortado.
3. `UPSTREAM_REFERENCE.md` existe na raiz com o SHA do commit clonado e a política de port manual documentada.
4. `package.json` raiz tem `"name": "ddd"` (sem traços de identidade `paperclip`).
5. `CONTRIBUTING.md` declara explicitamente "fork hard, sem PRs upstream, port manual quando útil".

**Plans**: 2 plans

Planos:
- [x] 01-01-PLAN.md — Importar paperclip, reescrever identidade para ddd, cortar upstream, documentar cerimonia (FORK-01..04)
- [x] 01-02-PLAN.md — Smoke test baseline: pnpm install + pnpm dev com embedded Postgres em Windows (FORK-05)

### Phase 2: Migração de Storage para Supabase

**Goal**: Substituir Postgres embedded pelo Supabase remoto (`bxlczioxgizgvtznukwt`) como único backend de estado da equipe, mantendo Better Auth funcional contra o Postgres do Supabase. Auditoria de acoplamentos (LISTEN/NOTIFY, advisory locks, prepared statements) precede o swap real para evitar quebras silenciosas em Supavisor pooler.

**Depends on**: Phase 1

**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, DB-01, DB-02, DB-03, DB-04, DB-05, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05

**Success Criteria** (o que deve ser VERDADEIRO):
1. Dois devs em máquinas diferentes fazem login com Better Auth (email/senha) e veem a mesma company no UI após login — estado compartilhado funcional.
2. `MIGRATION_AUDIT.md` mapeia todos os usos de `LISTEN/NOTIFY`, `pg_advisory_lock`, `CREATE TEMP`, prepared statements e long-lived transactions no código herdado, com decisão de mitigação para cada um.
3. Migrations Drizzle estão aplicadas em `bxlczioxgizgvtznukwt`; auto-migrations no startup estão desabilitadas (startup falha rápido se schema desatualizado); GitHub Actions é o único caminho que roda `pnpm db:migrate` em merge para main.
4. Cookie prefix `paperclip-team-shared` permite que devs em máquinas distintas compartilhem mesma sessão lógica sem conflito.
5. Service-role key do Supabase nunca aparece no bundle Vite (verificado por pre-commit hook que detecta `eyJ...` em arquivos client-side).

**Plans**: 6 plans

Planos:
- [x] 02-01-PLAN.md — Migration audit: documentar acoplamentos Postgres-embedded → Supavisor (INFRA-01)
- [x] 02-02-PLAN.md — Pre-commit hook detectando JWT/service-role leaks em client-side (AUTH-05)
- [x] 02-03-PLAN.md — Driver patches (prepare:false, pool), runtime-config, .env.example, disable auto-migrations (INFRA-02..06, DB-02)
- [x] 02-04-PLAN.md — Aplicar 71 migrations Drizzle + GitHub Actions migration pipeline + PR template DB gate (DB-01, DB-03..05)
- [x] 02-05-PLAN.md — Validar Better Auth wiring contra Supabase + cookie prefix paperclip-team-shared (AUTH-01..04)
- [x] 02-06-PLAN.md — Smoke test E2E (signup, cookie, multi-dev verification) + checkpoint humano (autonomous: false)

### Phase 3: Workflow de Equipe + Onboarding

**Goal**: Garantir que 5+ devs consigam onboardar no fork sem fricção e que convenções operacionais (env vars, schema migrations via CI, troubleshooting Windows) estejam documentadas e validadas com setup script automatizado. Convenções vêm antes da feature diferenciadora (multi-account) porque devs já estarão usando o sistema.

**Depends on**: Phase 2

**Requirements**: TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05

**Success Criteria** (o que deve ser VERDADEIRO):
1. Um dev novo segue o README de setup local e tem o app rodando contra Supabase compartilhado em <30 minutos sem ajuda externa.
2. `pnpm setup` valida env vars críticas, conexão com Supabase, presença do `claude` CLI e login Better Auth — falhando com mensagem acionável quando algo está errado.
3. 5+ devs estão cadastrados via fluxo de invite/board-claim do paperclip apontando para Supabase compartilhado.
4. Smoke test E2E executado: dev A faz login + cria company; dev B em outra máquina vê a mesma company sem sincronização manual.
5. `TROUBLESHOOTING.md` cobre falhas comuns: Windows NTFS, Supabase no limite de conexões, Better Auth cookie prefix, schemas desatualizados.

**Plans**: 5 plans

Planos:
- [x] 03-01-PLAN.md — Setup script `pnpm setup` validando ambiente local (TEAM-03)
- [x] 03-02-PLAN.md — ONBOARDING.md pt-br + nota no README apontando para ele (TEAM-02)
- [x] 03-03-PLAN.md — TROUBLESHOOTING.md pt-br cobrindo 7 problemas conhecidos (TEAM-05)
- [x] 03-04-PLAN.md — Procedimento smoke E2E cross-machine + 03-HUMAN-UAT.md (TEAM-04)
- [x] 03-05-PLAN.md — Procedimento de cadastro coletivo de 5+ devs via fluxo existente (TEAM-01)

### Phase 4: Spike — Multi-Account Claude Code Detection

**Goal**: Validar empiricamente o comportamento do Claude Code CLI em cenários de exhaustão e produzir os artefatos de decisão (taxonomia 429, classifier prototype, mecânica de retomada confirmada) que destravam a Phase 5. **Esta fase é puramente investigativa — não produz código de produção.** Entregáveis são documentação, fixtures e protótipo descartável.

**Depends on**: Phase 3

**Requirements**: SPIKE-01, SPIKE-02, SPIKE-03, SPIKE-04, SPIKE-05

**Success Criteria** (o que deve ser VERDADEIRO):
1. `CLAUDE_429_TAXONOMY.md` mapeia tipos distintos de 429 (RPM transient, TPM transient, daily quota, weekly quota, organization tier, "5h limit reached") com mensagem canônica, headers presentes e comportamento esperado para cada um.
2. Protótipo `detectClaudeQuotaExhausted` está testado contra fixtures reais capturadas (stream-JSON em condições distintas) e classifica corretamente os casos da taxonomia.
3. Decisão registrada (com justificativa) sobre detecção pré-emptiva (via `tokens-remaining` header) vs reativa (parse de stream) — incluindo cooldown entre swaps e política de honrar `retry-after`.
4. Validação empírica confirmada e documentada: `session_id` do Claude CLI é por-conta; mecânica de retomada via `issue_continuation_summary` funciona após swap em smoke test manual com 2 contas em filesystem (`~/.paperclip/claude-accounts/{a,b}/`).
5. Spike termina com lista explícita de "achados que afetam o schema/UI da Phase 5" — qualquer surpresa que mude design da implementação está documentada antes de Phase 5 começar.

**Plans**: 5 plans

Planos:
- [x] 04-01-PLAN.md — Auditoria taxonomy 429: CLAUDE_429_TAXONOMY.md mapeando 6 tipos contra regex existente em parse.ts (SPIKE-01)
- [x] 04-02-PLAN.md — Decisão arquitetural detecção: DECISION-DETECTION-STRATEGY.md (reativo primary, pré-emptivo opt, cooldown 30s, retry-after honrado) (SPIKE-03)
- [x] 04-03-PLAN.md — Protótipo classifier descartável + 6 fixtures stub + tests vitest standalone (SPIKE-02)
- [x] 04-04-PLAN.md — Harness shell scripts (capture-fixture.sh + test-multi-account-resume.sh) para HUMAN-UAT empírico (SPIKE-04 + SPIKE-05 enabling)
- [x] 04-05-PLAN.md — Consolidação: 04-HUMAN-UAT.md (UAT-04-01..03) + FINDINGS-FOR-PHASE-5.md (SPIKE-04 + SPIKE-05)

### Phase 5: Multi-Account Claude Code Swap (Implementação)

**Goal**: Implementar o pool de contas Claude Code, rotação atômica em exhaustão e continuidade preservada via `issue_continuation_summary` (com fallback Plano B confirmado pelo usuário), usando os achados validados no spike Phase 4. Esta é a feature genuinamente nova que justifica o fork existir vs paperclip vanilla.

**Depends on**: Phase 4

**Requirements**: MULTI-01, MULTI-02, MULTI-03, MULTI-04, MULTI-05, MULTI-06, MULTI-07, MULTI-08, MULTI-09, MULTI-10, MULTI-11

**Success Criteria** (o que deve ser VERDADEIRO):
1. Um agente roda contra a conta A, a conta atinge exhaustão, o sistema dispara swap automático para conta B, e o agente continua de onde parou — tudo sem intervenção manual.
2. `agent_step_executions` registra append-only cada chamada com `(run_id, step_id, account_id, input_tokens, output_tokens, cost_usd)` — cost attribution por conta auditável após cada run.
3. UI `ui/src/pages/ClaudeAccounts.tsx` permite registrar contas, ver status (live/exhausted/cooldown) e histórico de rotações em tempo real.
4. Activity log emite evento `claude_account_rotated` com `(from, to, reason, agentId)` a cada swap, observável no painel de atividade.
5. Swap mid-flight é race-free: `pg_advisory_xact_lock` por agent_run garante que duas requests simultâneas não escrevem com `account_id` diferente para o mesmo step.

**Plans**: 8 plans

Planos:
- [x] 05-01-PLAN.md — DB schemas: claude_accounts, agent_account_bindings, agent_step_executions + drizzle migration (MULTI-01..03) [Wave 1]
- [x] 05-02-PLAN.md — Classifier detectClaudeQuotaExhausted em parse.ts + tests (MULTI-06) [Wave 1]
- [x] 05-03-PLAN.md — .env.example cooldown var + activity-log event type + claude-accounts-swap.md (MULTI-10 type registration) [Wave 1]
- [ ] 05-05-PLAN.md — Wire config.claudeConfigDir → env.CLAUDE_CONFIG_DIR em execute.ts + tests (MULTI-05) [Wave 1]
- [ ] 05-04-PLAN.md — claudeAccountsService factory + 6 métodos D-09 + lock advisory + tests (MULTI-04) [Wave 2; depende de 05-01, 05-03]
- [ ] 05-06-PLAN.md — Heartbeat integration + orchestrateClaudeSwap module com Plano B (MULTI-07, MULTI-08) [Wave 3; depende de 05-04, 05-05]
- [ ] 05-07-PLAN.md — Backing API + UI ClaudeAccounts.tsx + route + tests (MULTI-09, MULTI-10 emit via service) [Wave 3; depende de 05-04]
- [ ] 05-08-PLAN.md — SMOKE-E2E.md + 05-HUMAN-UAT.md UAT-05-01 (MULTI-11) [Wave 4; depende de 05-06, 05-07]

**UI hint**: yes

### Phase 6: Multi-Projeto + Polish

**Goal**: Habilitar múltiplas companies/projects rodando agentes em paralelo no mesmo Supabase sem cross-contamination, com cost attribution agregado por projeto e pool de contas configurável (per-company ou shared). Fecha o v1 com fundação sólida para crescimento orgânico guiado por sinal real.

**Depends on**: Phase 5

**Requirements**: PROJ-01, PROJ-02, PROJ-03

**Success Criteria** (o que deve ser VERDADEIRO):
1. Duas companies rodam agentes em paralelo simultaneamente no mesmo Supabase e nenhum agente vê dados/contas/runs da outra company (isolamento por `companyId` validado em smoke test E2E).
2. Pool de contas Claude pode ser configurado per-company (cada empresa registra suas próprias contas) OU shared (configuração explícita por company), e a configuração é respeitada no `selectActiveAccount`.
3. Dashboard de cost attribution mostra gasto agregado por `(companyId, accountId)` permitindo visibilidade de quanto cada projeto consumiu por conta.
4. v1 é declarado pronto: todos os requisitos v1 estão satisfeitos, smoke tests E2E críticos passam (multi-dev, multi-account, multi-project), e documentação de operação está completa.

**Plans**: A definir

Planos:
- [ ] 06-01: A definir durante `/planejar-fase 6`

**UI hint**: yes

## Progresso

**Ordem de Execução:**
As fases executam em ordem numérica: 1 → 2 → 3 → 4 → 5 → 6

| Fase | Planos Completos | Status | Concluída |
|------|------------------|--------|-----------|
| 1. Fork Hard + Cerimônia de Corte | 2/2 | Complete | 2026-04-25 |
| 2. Migração de Storage para Supabase | 6/6 | Complete   | 2026-04-26 |
| 3. Workflow de Equipe + Onboarding | 0/5 | Planned | - |
| 4. Spike — Multi-Account Detection | 5/5 | Complete   | 2026-04-26 |
| 5. Multi-Account Swap (Implementação) | 3/8 | In Progress|  |
| 6. Multi-Projeto + Polish | 0/? | Not started | - |
