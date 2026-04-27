# DDD — Paperclip da Equipe

## Estado Atual

**Versão entregue:** v1.1 — Internacionalização pt-BR (2026-04-27)
**Milestone ativo:** v1.2 — in100tiva como Software House (iniciado 2026-04-27)

Fork hard do paperclip operacional sobre Supabase compartilhado, com pool multi-account Claude Code, multi-company isolation, cost attribution e UI/agentes/skills 100% traduzidos pt-BR. v1.1 entregou 26 requisitos (16 UATs empíricos pendentes, não-bloqueantes).

**Histórico:** Ver `.planning/MILESTONES.md` para resumo completo e `.planning/milestones/v1.{0,1}-*.md` para arquivos detalhados.

## Milestone Atual: v1.2 in100tiva como Software House

**Objetivo:** Importar (one-shot) os 18 agentes do framework `.claude/agents/` e as 3 skills `.claude/skills/` para a empresa `in100tiva` no paperclip, organizados como uma software house real — Architecture (gate sequencial) → Engineering (parallel) → Quality (gate pós-eng) — para visualização no organograma e atribuição de issues, mantendo o framework Claude Code rodando local como hoje (paperclip é vitrine/registro).

**Funcionalidades alvo:**
- Script idempotente de importação (`pnpm sync-agents` ou equivalente) que cria os 17 novos agentes + 3 skills na in100tiva com hierarquia, role, descrição, adapterType `claude_local`, prompts derivados dos `.md`
- Hierarquia software-house: CEO → 4 Heads (Architecture, Engineering, Quality, Analytics) → especialistas
- Metadado `parallelism_policy` em cada agente (`serial` para Architecture/DB; `parallel` para Engineering; `serial-gate` para Quality) — UI mostra badge
- 3 skills importadas como CompanySkill (`sourceType: local_path` apontando pra `.claude/skills/*`)
- Mapeamento skill→agente por cargo: `paperclip` (governança em todos os Heads), `company-creator` (CEO), `design-guide` (UI-researcher + UI-checker + UI-auditor)
- Idempotente: re-rodar não duplica nem quebra estado existente
- Documentação `AGENTS-IMPORT.md` explicando reimportação após editar arquivos do framework

---

## O Que É

Fork hard do [Paperclip](https://github.com/paperclipai/paperclip) — plataforma de orquestração de agentes de IA — adaptado para nossa equipe de devs. Substitui o PostgreSQL embedded por um Supabase compartilhado, permitindo que múltiplos desenvolvedores rodem o app localmente apontando para o mesmo backend, com suporte a troca entre múltiplas contas Claude Code quando tokens se esgotam.

## Valor Central

A equipe inteira opera sobre um único estado compartilhado (Supabase remoto), e o trabalho dos agentes nunca é interrompido por limites de token de uma conta — basta trocar a conta e continuar de onde parou.

## Requisitos

### Validados

- ✓ Paperclip clonado e convertido em fork hard (sem upstream) — Fase 1 (SHA `40782f7`)
- ✓ Identidade reescrita como `ddd`, política de fork documentada (`UPSTREAM_REFERENCE.md`, `CONTRIBUTING.md`) — Fase 1
- ✓ Smoke test baseline: `pnpm install` + `pnpm dev` rodam em Windows com embedded Postgres — Fase 1
- ✓ PostgreSQL embedded substituído por Supabase remoto (`bxlczioxgizgvtznukwt`) via Supavisor pooler com `prepare:false` — Fase 2
- ✓ 71 migrations Drizzle aplicadas em `bxlczioxgizgvtznukwt`; 80 tabelas em `public.*`; auto-migrations no startup desabilitadas; GitHub Actions é o único caminho legítimo de `db:migrate` em merge para main — Fase 2
- ✓ Better Auth funcional contra Postgres do Supabase com cookie prefix `paperclip-team-shared` — Fase 2 (smoke 7/7 PASS, single-machine)
- ✓ Pre-commit hook detectando leaks de service-role key (`eyJ...` em arquivos client-side) — Fase 2
- ✓ Auditoria de acoplamentos Postgres-embedded → Supavisor (LISTEN/NOTIFY, advisory locks, prepared statements, long-lived txs) documentada em `MIGRATION_AUDIT.md` — Fase 2
- ✓ Setup script `pnpm run setup` valida ambiente do dev novo (Node, pnpm, env vars, ping Supabase, schema Better Auth, claude CLI) com fail-fast acionável — Fase 3
- ✓ `ONBOARDING.md` (pt-br, 7 seções, <30min target) e `TROUBLESHOOTING.md` (7 problemas conhecidos: Windows NTFS, stale registry, limite Supabase, cookie prefix, schema desatualizado, claude CLI ausente, prepared statements vs pooler) na raiz do repo — Fase 3
- ✓ Procedimento documentado de cadastro coletivo (`TEAM-SIGNUP-PROCEDURE.md`) reusando fluxo de invite/board-claim do paperclip; bootstrap_ceo via script existente — Fase 3
- ✓ Procedimento de smoke E2E cross-machine documentado (`CROSS-MACHINE-SMOKE.md`) com fallback single-host aceito — Fase 3
- ✓ Documentado setup local para qualquer dev clonar o repo e começar a usar sem fricção — Fase 3
- ✓ Taxonomia 429 do Claude Code (`CLAUDE_429_TAXONOMY.md`) com auditoria contra `CLAUDE_TRANSIENT_UPSTREAM_RE` existente: 4 tipos cobertos, 2 partial — Fase 4
- ✓ Estratégia de detecção decidida (`DECISION-DETECTION-STRATEGY.md`): reativo primary + pré-emptivo opcional, cooldown 30s configurável, `retry-after` honrado — Fase 4
- ✓ Protótipo descartável `detect-quota-exhausted` com 6 fixtures stub e suite vitest standalone (8/8 testes passando) — Fase 4
- ✓ Harness empírico (`capture-fixture.sh` + `test-multi-account-resume.sh`) preparado para HUMAN-UAT com 2 contas — Fase 4
- ✓ Findings da Fase 4 mapeados a MULTI-01/04/05/06/08 (`FINDINGS-FOR-PHASE-5.md`): regex existente reusável, `CLAUDE_CONFIG_DIR` passthrough já presente em `execute.ts:253`, schema `lastQuotaWindowsJson` deve refletir taxonomia — Fase 4
- ✓ 3 schemas multi-account (`claude_accounts`, `agent_account_bindings`, `agent_step_executions`) + migration `0071` gerada (não aplicada localmente — DB-03 restringe apply para CI) — Fase 5
- ✓ Service `claudeAccountsService(db)` com 7 métodos (listAccounts, selectActiveAccount, rotateOnQuotaExhausted com W1 split, recordSwapOutcome, resolveCredentialDir, recordStepExecution, markCooldownPassed) + advisory lock; 21+ testes passando — Fase 5
- ✓ Classifier `detectClaudeQuotaExhausted` em `parse.ts` reusando `CLAUDE_TRANSIENT_UPSTREAM_RE` existente, 6 sub-tipos (rpm/tpm/daily/weekly/5h/org_tier), 10 testes passando — Fase 5
- ✓ `claudeConfigDir` wired em `execute.ts` → `env.CLAUDE_CONFIG_DIR` (multi-account spawning funcional) — Fase 5
- ✓ Heartbeat integrado: `selectActiveAccount` antes de cada spawn Claude; `orchestrateClaudeSwap` Strategy A (resume) + Strategy B (full-context fallback per Plano B); `executingAccountId` rastreado para attribution correto — Fase 5
- ✓ UI `ClaudeAccounts.tsx` (lista + register + status + history) + REST API + rota `/company/settings/claude-accounts` — Fase 5
- ✓ Activity log emite `claude_account_rotated` com `swapStrategy` efetivo (resume/fallback_full_context) via split rotation/log emit — Fase 5
- ✓ Implementar troca de conta Claude Code com retomada do trabalho dos agentes de onde pararam — Fase 5 (smoke real validação UAT-05-01 pendente)
- ✓ Persistir estado dos agentes no Supabase de forma que a troca de conta não perca progresso — Fase 5
- ✓ Multi-company isolation validado (smoke procedure + UAT real); pool config per-company OU shared via `companies.claudeAccountPoolMode` + `claude_accounts.scope`; `selectActiveAccount` honra pool mode com fail-closed default — Fase 6
- ✓ Cost attribution por `(companyId, accountId)` via `claudeAccountCostsService.aggregateByCompany` + endpoint `/cost-summary` + UI section — Fase 6
- ✓ Suportar múltiplos projetos rodando em paralelo no fluxo da equipe — Fase 6
- ✓ **v1.0 declarado pronto:** 45/45 requisitos completos, 7 UATs pendentes (não-bloqueantes; convergência via uso real), `V1-READINESS.md` formaliza closure — Fase 6

### Ativos

**v1.2 — in100tiva como Software House (em andamento):**

- [ ] Importar 17 agentes (planner, executor, debugger, etc.) na in100tiva via script idempotente
- [ ] Hierarquia software-house: CEO → Heads (Architecture, Engineering, Quality, Analytics) → especialistas
- [ ] Metadado `parallelism_policy` (`serial` / `parallel` / `serial-gate`) refletido na UI do paperclip
- [ ] Importar 3 skills (`paperclip`, `company-creator`, `design-guide`) como CompanySkill local_path
- [ ] Mapeamento skill→agente por cargo (paperclip nos Heads; company-creator no CEO; design-guide no time UI)
- [ ] Re-execução do script é idempotente (não duplica, não quebra estado existente)
- [ ] Documentação `AGENTS-IMPORT.md` cobrindo reimportação

**v1.1 (carry-over não-bloqueantes):**

- [ ] HUMAN-UAT pendentes: UAT-07-01..02, UAT-08-01..05, UAT-09-01..04, UAT-10-01..03, UAT-11-01..03 (convergência via uso real)

**v1.0 (carry-over não-bloqueantes):**

- [ ] Cross-machine multi-dev e 5+ devs reais — UAT-03-01, UAT-03-02
- [ ] RLS opcional v1 ainda pendente

**Concluídos:** v1.0 (45/45) + v1.1 (26/26 reqs no código; UATs empíricos pendentes). Backlog v2 (POOL, OBS, AUTH2, RLS, STOR) em `.planning/milestones/v1.0-REQUIREMENTS.md`.

### Fora do Escopo

- Manter sincronização com o upstream do paperclip — escolhemos fork hard, modificamos livremente
- Hospedar uma única instância web pública do paperclip — cada dev roda local
- Supabase isolado por dev — todos compartilham o mesmo backend
- Migrar para Supabase Auth no v1 — Better Auth do paperclip funciona perfeitamente contra Postgres do Supabase, migração pode vir em milestone futuro
- OAuth (Google/GitHub) no v1 — Better Auth email/senha herdado do paperclip é suficiente para começar
- Mobile app — paperclip é web, mantemos web

## Contexto

- **Origem:** Paperclip é um projeto open-source (Node.js + React + TypeScript, 97.8% TS) que orquestra agentes de IA (Claude Code, Codex, Cursor, OpenClaw) como se fossem funcionários de uma empresa — gerencia org chart, tarefas, orçamento, governança.
- **Storage atual do paperclip:** PostgreSQL com instância embedded auto-criada para dev local. Precisamos substituir por Supabase remoto.
- **Supabase target:** projeto `bxlczioxgizgvtznukwt` (já criado pelo usuário antes do início).
- **Equipe:** 5+ devs trabalhando em múltiplos projetos paralelos. Cada dev pode ter mais de uma conta Claude Code para contornar limites de token.
- **Diretório atual:** `d:\projetos\ddd` — vazio (greenfield no FS), git recém-inicializado. O fork será clonado para dentro deste repo.

## Restrições

- **Stack de tecnologia**: Manter Node.js + React + TypeScript do paperclip — não reescrever em outra linguagem
- **Banco de dados**: Supabase (Postgres gerenciado) — único backend de estado para a equipe
- **Auth**: Better Auth (mantido do paperclip) — schema persiste no Supabase Postgres, sem trocar para Supabase Auth
- **Deploy**: Cada dev roda local, sem servidor central web
- **Compartilhamento de estado**: Todos os devs compartilham o mesmo projeto Supabase (`bxlczioxgizgvtznukwt`)

## Decisões Chave

| Decisão | Justificativa | Resultado |
|---------|---------------|-----------|
| Fork hard (sem upstream) | Liberdade para customizar profundamente sem custo de merge contínuo | ✓ Boa — Fase 1 confirmou `pnpm dev` funcional pós-corte |
| Supabase remoto compartilhado | Estado único da equipe, qualquer dev em qualquer máquina vê o mesmo | ✓ Validado — Fase 2 (71 migrations aplicadas, smoke 7/7 PASS) |
| Local-first + Supabase remoto | Evita custo/complexidade de hospedar instância única; cada dev tem ambiente próprio mas estado central | ✓ Validado — Fase 2 |
| Manter Better Auth, Supabase só como Postgres | Schemas Better Auth (text id) incompatíveis com `auth.users` (uuid); migração HIGH effort sem ganho v1 | ✓ Validado — Fase 2 (cookie `paperclip-team-shared.session_token` empiricamente confirmado) |
| RLS opcional no v1 | Sem `auth.uid()` resolúvel (Better Auth ≠ Supabase Auth); autorização aplicacional via membership por company_id; service-role key no servidor | — Decisão mantida; RLS não implementado v1 |
| Supavisor transaction mode (porta 6543) com `prepare:false` | Pooler do Supabase desabilita prepared statements em txn mode; código herdado tinha 1 prepared statement (auditoria F.1) que precisa de adaptação | ✓ Implementado — Fase 2 |

## Evolução

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Última atualização: 2026-04-27 ao iniciar milestone v1.2 (in100tiva como Software House) — escopo: importar 18 agentes + 3 skills do framework como funcionários da in100tiva com hierarquia software-house e parallelism_policy*
