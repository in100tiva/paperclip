# Resumo da Pesquisa do Projeto

**Projeto:** DDD — Paperclip da Equipe (fork hard de `paperclipai/paperclip`)
**Domínio:** Plataforma de orquestração de agentes de IA (control plane multi-agent), local-first com backend Postgres compartilhado via Supabase
**Pesquisado:** 2026-04-25
**Confiança:** HIGH

## Resumo Executivo

Paperclip é um control plane maduro (Node 20+, TypeScript 5.7, monorepo pnpm com workspaces `server`, `ui`, `cli`, `packages/db`, `packages/shared`, `packages/adapters/*`) que já entrega ~95% das fundações que nosso fork precisa: org chart de agentes, issues com checkout atômico, wakeup queue DB-backed, budget hard-stops, governança com aprovações, audit log, adapters multi-provider (Claude Code / Codex / Cursor / OpenClaw / Gemini / Bash / HTTP), workspaces de execução isolados (git worktrees), persistência de sessão por agente em `agent_runtime_state` + `agent_task_sessions` + `heartbeat_runs`, multi-empresa com isolamento, modo `authenticated` com login obrigatório, e Supabase já listado oficialmente em `docs/deploy/database.md` como modo hosted suportado. **A maior parte do trabalho do fork não é construir features — é trocar uma peça de infraestrutura (Postgres embedded → Supabase remoto compartilhado) e adicionar uma feature genuinamente nova (pool de contas Claude Code com swap automático em token exhaustion).**

A abordagem recomendada é **cirúrgica e localizada**: manter Drizzle ORM + postgres-js como camada de dados (apontando para Supabase via Supavisor pooler com `prepare: false`); **manter Better Auth** com seu schema próprio (`user`/`session`/`account`/`verification` com IDs text) rodando no Postgres do Supabase — **migração para Supabase Auth está explicitamente fora do escopo do v1** e fica como milestone futuro; tratar Supabase puramente como backend Postgres gerenciado, **não como auth provider nem RLS-gated client**. Autorização permanece aplicacional (middleware Express + checks por `companyId`/membership já existentes); RLS é minimal/opcional no v1 porque sem `auth.uid()` resolúvel, políticas exigiriam GUC custom frágil. Servidor usa service-role key; UI fala apenas com a API Express. O delta novo é uma camada `services/claude-accounts.ts` + tabelas `claude_accounts` + `agent_account_bindings` que orquestram troca de `CLAUDE_CONFIG_DIR` por agente quando uma conta esgota quota, persistindo continuidade via `issue_continuation_summary` (mecanismo do paperclip que sobrevive a sessões CLI invalidadas no swap).

Os riscos principais são quatro e todos têm mitigação clara: (1) acoplamentos escondidos do Postgres embedded (LISTEN/NOTIFY, pg_advisory_lock, prepared statements) que quebram em pgBouncer/Supavisor — auditoria sistemática em fase dedicada; (2) race conditions no swap de conta mid-flight — pattern drain → checkpoint → swap → resume com lock pessimista por agent_run; (3) detecção falsa positiva de exhaustão (todo 429 tratado igual) — classifier que distingue rate-limit transient de quota-exhausted real; (4) 5+ devs simultâneos no mesmo Supabase — auto-migrations desabilitadas, pipeline CI como único caminho de `db push`, conexão pool reduzida (`max:5` por instância dev).

## Principais Descobertas

### Stack Recomendado

Paperclip é monorepo pnpm 9.15+ com TypeScript 5.7, Node 20+ (recomendado Node 22 LTS), ESM puro. Toda a stack é mantida sem mudança — o trabalho do fork é configuração e duas adições, não substituições. Drizzle ORM 0.38.4 + drizzle-kit 0.31.9 + postgres-js 3.4.5 continuam apontando para o connection string do Supabase. Better Auth 1.4.18 permanece com `drizzleAdapter` provider `pg`. Não subir Drizzle para 0.45.x porque isso obriga subir Better Auth para 1.6.x — sem ganho v1.

**Tecnologias core (herdadas, manter):**
- Node.js >=20 + TypeScript ^5.7.3 — pnpm 9.15.4 obrigatório.
- Express ^5.1.0 — async error handling nativo.
- Drizzle ORM ^0.38.4 + drizzle-kit ^0.31.9 — fonte única de verdade para schema.
- postgres ^3.4.5 — driver; **crítico: `prepare: false`** quando porta 6543 (Supavisor transaction mode).
- **Better Auth 1.4.18** — schema próprio (text IDs) no Postgres do Supabase. **Decisão resolvida: manter no v1.** Migração para Supabase Auth é milestone futuro.
- React ^19.0.0 + Vite ^6.1.0 + Tailwind ^4.0.7 + TanStack Query ^5.90.21 + react-router-dom ^7.1.5.
- pino, zod, ws, embedded-postgres (mantido inativo como fallback).

**Configuração de conexão (resolvida):**
- Projeto target: `bxlczioxgizgvtznukwt`.
- Supavisor pooler porta 6543 com `prepare: false` no postgres-js — necessário para uso concorrente.
- Env vars: `DATABASE_URL` (pooler), `SUPABASE_DB_URL` (direct para DDL), `BETTER_AUTH_SECRET`, `PAPERCLIP_INSTANCE_ID=team-shared`.

Detalhes em [STACK.md](./STACK.md).

### Funcionalidades Esperadas

Paperclip vanilla já cobre quase todo o "table-stakes". Lançar nosso fork exige apenas: (a) rodar contra Supabase compartilhado com Better Auth preservado; (b) adicionar pool de contas Claude Code; (c) documentar setup local sem fricção.

**Deve ter (v1):**
- Fork hard com cerimônia de "corte do cordão" (`UPSTREAM_REFERENCE.md` com SHA do clone).
- `DATABASE_URL` + `SUPABASE_DB_URL` apontando para `bxlczioxgizgvtznukwt`.
- Embedded Postgres desabilitado por default; permanece como fallback.
- Migrations Drizzle aplicadas via CI ou designated dev; nunca via `supabase migration new`.
- Better Auth funcionando contra Supabase Postgres (cookie prefix `paperclip-team-shared`).
- Modo `authenticated` ativo; OAuth fora do escopo v1.
- Pool de contas Claude Code (schema + UI básica).
- Swap automático em token exhaustion com continuidade via `issue_continuation_summary`.
- README de setup local; 5+ devs cadastrados.

**Deveria ter (v1.x):** Heartbeat-aware account selection; painel observability; per-dev claim; RLS defensivo opcional em tabelas sensíveis.

**Adiar (v2+):** Migração Supabase Auth; OAuth; pool multi-provider; Supabase Storage; Realtime; mobile/desktop/cloud.

Detalhes em [FEATURES.md](./FEATURES.md).

### Abordagem de Arquitetura

Paperclip já tem arquitetura monorepo cristalina com Postgres como única fonte de verdade. Estado de execução já é checkpointed em `agent_runtime_state`, `agent_task_sessions`, `heartbeat_runs`. O fork toca **três pontos cirúrgicos**: (1) `packages/db/src/{client.ts, runtime-config.ts}` para Supabase com `prepare: false`; (2) tabelas novas `claude_accounts` + `agent_account_bindings` + `services/claude-accounts.ts`; (3) patch em `claude-local/src/server/{execute.ts, parse.ts}` para `claudeConfigDir` + detecção de exhaustion. Auth permanece intacta.

**Componentes principais:**

1. **`ui/` (React + Vite)** — chama `/api/*` Express; auth via cookies Better Auth; sem mudança estrutural.
2. **`server/` (Express)** — `actorMiddleware` resolve actor via Better Auth; novo `services/claude-accounts.ts` orquestra rotação; `services/heartbeat.ts` patched para `selectActiveAccount` antes de cada run.
3. **`packages/db/`** — `client.ts` com `prepare: false` quando porta 6543; schemas inalterados exceto adições.
4. **`packages/adapters/claude-local/`** — `execute.ts` aceita `config.claudeConfigDir`; `parse.ts` adiciona `detectClaudeQuotaExhausted`.
5. **Supabase project `bxlczioxgizgvtznukwt`** — Postgres compartilhado; schema `auth` interno do Supabase **não usado**; service-role key apenas no servidor.

**Padrões chave:**
- Server como único caller de service-role; UI fala apenas com Express via fetch.
- Adapter como black box, estado como diff persistido (padrão paperclip).
- Quota-aware round-robin para multi-account.
- Drain → checkpoint → swap → resume; swap só em step boundary.

**Decisões resolvidas:**
- Auth: Better Auth preservado v1; schema text-IDs em `public.user`/etc.
- RLS: minimal/opcional v1; sem `auth.uid()` resolúvel, GUC custom seria frágil; autorização aplicacional via membership.
- Credenciais Claude OAuth: filesystem do dev (Opção A); Supabase só guarda metadata.

Detalhes em [ARCHITECTURE.md](./ARCHITECTURE.md).

### Armadilhas Críticas

1. **Reset de identidade do fork sem cerimônia** — sem disciplina, drift inevitável em 3+ meses. **Prevenção:** Fase 1 executa `git remote remove upstream`, `UPSTREAM_REFERENCE.md`, política em CONTRIBUTING.md.

2. **Embedded Postgres → Supabase com acoplamentos escondidos** — `LISTEN/NOTIFY`, `pg_advisory_lock`, `CREATE TEMP`, prepared statements quebram em Supavisor transaction mode. **Prevenção:** `MIGRATION_AUDIT.md` antes do swap; `prepare: false` no postgres-js; pool `max: 5`.

3. **Auto-migrations conflitando entre 5 devs** — múltiplos devs disputam lock; schemas divergentes. **Prevenção:** desabilitar auto-migrations no startup; pipeline CI como único caminho de `pnpm db:migrate`; pg_dump antes de migrations destrutivas.

4. **Race condition na troca de conta mid-execution** — request em vôo da conta A escreve depois do swap. **Prevenção:** swap só em step boundary; `pg_advisory_xact_lock` por agent_run; `agent_step_executions` append-only com `account_id`; tool calls idempotentes.

5. **Detecção falsa positiva de exhaustão (todo 429 igual)** — issues GitHub #41788, #22876 reportam comportamento errático. **Prevenção:** classifier distingue tipos (RPM transient vs daily quota vs overload); detecção pré-emptiva via `tokens-remaining`; cooldown entre swaps; honrar `retry-after`.

6. **Service-role key vazando para o cliente** — `.env.local` indo para Vite bundle. **Prevenção:** convenção estrita (NUNCA `VITE_` prefix); pre-commit hook detectando `eyJ...`; `.gitignore` agressivo; rotação trimestral; 1Password.

Detalhes em [PITFALLS.md](./PITFALLS.md).

## Implicações para o Roadmap

### Fase 1: Fork Hard + Cerimônia de Corte

**Justificativa:** Cerimônia de identidade é decisão de governança que precisa cristalizar antes de mudança técnica. Smoke test do paperclip vanilla valida que monorepo builda em Windows + macOS antes de mexer em qualquer coisa.

**Entrega:** Clone para `D:\projetos\ddd`, `git remote remove upstream`, package renomeado para `ddd`, single commit "Initial fork from paperclipai@<sha>" + `UPSTREAM_REFERENCE.md`, `CONTRIBUTING.md` com política de port manual, pre-commit hook + `.gitignore` agressivo + 1Password setup, `pnpm dev` funcionando com embedded Postgres em cada máquina dev.

**Aborda:** Cerimônia de identidade; setup base; bootstrap de segurança contra leak.
**Evita:** Drift do upstream (Armadilha 1); service-role vazando (Armadilha 6).

### Fase 2: Migração de Storage para Supabase (Better Auth Preservado)

**Justificativa:** Trocar backend de Postgres é mudança crítica isolada — fazer ANTES de qualquer mudança em features para ter único ponto de falha. Better Auth permanece intacto (decisão resolvida). Auditoria de acoplamentos do embedded é entregável obrigatório antes do swap real.

**Entrega:**
- `MIGRATION_AUDIT.md` mapeando `LISTEN/NOTIFY`, `pg_advisory_lock`, `CREATE TEMP`, prepared statements, transactions long-lived.
- Patch `packages/db/src/client.ts`: `prepare: false`, `max: 10`, `idle_timeout: 20`.
- Patch `packages/db/src/runtime-config.ts`: privilegiar `DATABASE_URL` Supabase.
- `.env.example` atualizado com `DATABASE_URL` (6543), `SUPABASE_DB_URL` (5432), `BETTER_AUTH_SECRET`, `PAPERCLIP_INSTANCE_ID=team-shared`.
- Migrations Drizzle aplicadas em `bxlczioxgizgvtznukwt` via designated dev.
- Smoke test E2E: 1 dev faz login Better Auth, cria company; 2º dev em outra máquina vê.
- Auto-migrations desabilitadas; pipeline CI documentado.
- Profiling pós-migração: `pg_stat_statements` top 50; auditoria N+1.

**Usa:** postgres-js + Drizzle do STACK; Better Auth preservado.
**Evita:** Acoplamentos escondidos (Armadilha 2); auto-migrations conflitando (Armadilha 3); N+1 com latência alta; pool saturado.

### Fase 3: Workflow de Equipe + Onboarding

**Justificativa:** Com Supabase ligado, devs começarão a usar o fork imediatamente. Sem convenção operacional, devs pisam nos dados uns dos outros e onboarding novo dev demora dias.

**Entrega:**
- README de setup do fork.
- Setup script validando env vars, Supabase, Better Auth, `claude` CLI.
- 5+ devs cadastrados via invite/board-claim do paperclip.
- Pipeline CI/CD para migrations: PRs com schema requerem aprovação; `pnpm db:migrate` apenas via GitHub Actions no merge para main.
- Convenção de workspace soft (companies próprias para experimentação).
- UX de conexão: indicador "live"/"stale"/"reconnecting".
- Doc de troubleshooting (Windows NTFS, conexões Supabase no limite, Better Auth cookie prefix).

**Usa:** Modo `authenticated`; fluxo invite/board-claim existente.
**Evita:** Devs pisando nos dados (Armadilha 9); migrations sem review; UX confusa.

### Fase 4: Spike Técnico — Multi-Account Claude Code Swap Detection

**Justificativa:** Pergunta aberta crítica do projeto. Detecção de exhaustão e mecânica de swap precisa de investigação dedicada antes de implementação. 429 do Claude Code tem múltiplos significados; comportamento real divergiu de docs em issues GitHub recentes (#41788, #22876, #45756). Errar este classifier custa cascata de exhaustão.

**Entrega:**
- Protótipo de classifier `detectClaudeQuotaExhausted` testado contra fixtures reais (capturas de stream-JSON em diferentes condições).
- `CLAUDE_429_TAXONOMY.md` mapeando tipos de 429, mensagens canônicas, headers, comportamento esperado.
- Decisão sobre detecção pré-emptiva vs reativa; cooldown entre swaps.
- Validação empírica de session continuity: confirmar que `session_id` Claude CLI é por-conta; swap = nova sessão + reload de `issue_continuation_summary`.
- Smoke test manual: 2 contas em filesystem (`~/.paperclip/claude-accounts/{a,b}/`), agente roda até exhaustão simulada (mock 429), validar mecânica.

**Usa:** Adapter `claude-local` existente; `services/quota-windows.ts`; `agent_runtime_state`.
**Evita:** Detecção falsa positiva (Armadilha 7); race condition de design indefinido (Armadilha 6 prevenção); cost attribution perdida (Armadilha 8 schema decidido cedo).

**FLAG DE PESQUISA:** Spike investigativo dedicado. Comportamento exato do Claude Code CLI em diferentes cenários de exhaustão é mal documentado e mudou ao longo de 2024-2025.

### Fase 5: Multi-Account Claude Code Swap (Implementação)

**Justificativa:** Com classifier validado na Fase 4, implementa pool + UI + rotação atômica. Feature genuinamente nova que justifica o fork existir vs paperclip vanilla.

**Entrega:**
- Schema `claude_accounts` (id, companyId, ownerUserId, label, configDirSlug, status, lastQuotaWindowsJson, lastUsedAt, exhaustedUntil) + `agent_account_bindings` (agentId PK, activeAccountId, rotationPolicy, lastRotatedAt).
- Schema `agent_step_executions` append-only com `(run_id, step_id, account_id, input_tokens, output_tokens, cost_usd, started_at, completed_at)`.
- `services/claude-accounts.ts`: `listAccounts`, `selectActiveAccount`, `rotateOnQuotaExhausted`, `resolveCredentialDir`. Lock `pg_advisory_xact_lock(hashtext('claude_account_swap:'||agent_id))`.
- `routes/claude-accounts.ts`: CRUD + `/status` agregando quota windows.
- Patch `services/heartbeat.ts`: chama `selectActiveAccount` antes de spawn; injeta `ctx.config.claudeConfigDir`; persiste `agent_step_executions` por chamada.
- Patch `claude-local/server/execute.ts`: aceita `config.claudeConfigDir`, propaga para spawn env.
- `ui/src/pages/ClaudeAccounts.tsx`: lista, registro, status, observability.
- Activity log: `claude_account_rotated` (from, to, reason, agentId).
- Smoke test E2E com exhaustão real, swap automático, atribuição correta de custo, continuidade via `issue_continuation_summary`.

**Usa:** Resultado do spike Fase 4; service-role no servidor.
**Evita:** Race condition mid-flight (Armadilha 6); cost attribution perdida (Armadilha 8).

### Fase 6: Polish + v1.x Features (Pós-Validação)

**Justificativa:** Cada item disparado por sinal real, não planejamento especulativo.

**Entrega (priorizada por sinal):**
- Heartbeat-aware account selection — quando swap reativo for lento.
- Painel observability completo — quando perguntarem >2x/semana "qual conta tá rodando o quê?".
- Per-dev claim de conta — quando dois devs reclamarem.
- RLS defensivo opcional em `company_secrets`/`cost_events` — quando equipe crescer >10.
- Reconciliação periódica de cost vs Anthropic dashboard.
- Cleanup periódico de `heartbeat_runs`/`activity_log`.

### Justificativa do Ordenamento

- Fork hard antes de tudo: cerimônia de governança precede mudança técnica.
- Storage migration antes de features: Better Auth resolvido como "manter"; Postgres é fundação; auditoria de acoplamentos obrigatória.
- Workflow antes de feature diferenciadora: 5+ devs precisam de convenções funcionando antes de adicionar pool de contas.
- Spike (Fase 4) separado de implementação (Fase 5): incerteza alta documentada em issues GitHub; spike resolve antes de schema/UI custarem caro.
- Polish por último: depende de sinal real de uso.

### Flags de Pesquisa

Fases que precisarão de pesquisa mais aprofundada (`/pesquisar-fase`):
- **Fase 2 (Storage Migration):** auditoria sistemática do código upstream; decisão Supavisor session vs transaction mode com medição empírica.
- **Fase 4 (Spike Multi-Account):** comportamento exato do Claude Code CLI em diferentes cenários de exhaustão; classifier exige fixtures reais. **Fase puramente investigativa.**
- **Fase 5 (Multi-Account Implementation):** se spike revelar comportamento cross-account inesperado de `session_id`, pesquisa adicional sobre alternativas de continuidade.

Fases com padrões padrão (pular pesquisa):
- **Fase 1, 3, 6:** padrões git, UX/DX, iteração incremental — implementação direta.

## Avaliação de Confiança

| Área | Confiança | Notas |
|------|-----------|-------|
| Stack | HIGH | Paperclip lido direto do `master`; versões verificadas em npm; padrões Supabase/Drizzle/Better Auth em docs oficiais. |
| Funcionalidades | HIGH | Inventário completo do paperclip; anti-features fixadas em PROJECT.md; multi-account swap é única feature genuinamente nova. |
| Arquitetura | HIGH | AGENTS.md §3/§5/§6/§8; pontos de mudança identificados no código real; padrões em docs Supabase oficiais. |
| Armadilhas | HIGH para Supabase/Auth/RLS; MEDIUM-HIGH para race conditions; MEDIUM para Claude Code rate-limit (issues recentes). |

**Confiança geral:** HIGH para infra Supabase + Better Auth + Drizzle. MEDIUM-HIGH para mecânica de swap (depende de spike Fase 4 validar empiricamente).

### Lacunas a Abordar

- Comportamento exato do Claude Code CLI em exhaustão: spike Fase 4 com fixtures reais.
- Performance de Supabase pooler com 5+ devs: começar com `max: 5`, monitorar, subir para Pro plan se necessário.
- Acoplamentos exatos do paperclip ao embedded: `MIGRATION_AUDIT.md` Fase 2 obrigatório.
- Sessão Better Auth + cookie prefix em múltiplas máquinas: `PAPERCLIP_INSTANCE_ID=team-shared`; validar com smoke test E2E Fase 2.
- Migração futura para Supabase Auth: explicitamente fora do v1; milestone próprio quando virar prioridade.

## Fontes

### Primárias (HIGH)

- Repositório `paperclipai/paperclip @ master` (lido em 2026-04-25): `package.json`, `pnpm-workspace.yaml`, `.env.example`, `AGENTS.md`, `packages/db/{client.ts, runtime-config.ts, drizzle.config.ts}`, `packages/db/src/schema/` (66 arquivos), `server/src/{app.ts, auth/better-auth.ts, middleware/auth.ts, services/heartbeat.ts, services/quota-windows.ts, adapters/registry.ts}`, `packages/adapters/claude-local/src/server/{execute.ts, parse.ts, quota.ts}`, `docs/deploy/{database.md, deployment-modes.md}`, `docs/adapters/claude-local.md`, `ROADMAP.md`.
- npm registry (2026-04-25): drizzle-orm, drizzle-kit, postgres, better-auth, @supabase/supabase-js, react, vite, typescript, pino, zod, express, @tanstack/react-query.
- Supabase docs oficiais: Connecting to Postgres, Supavisor terminology, Drizzle integration, Database Migrations, Managing Environments, Row Level Security, RLS Performance, User sessions, Realtime silent disconnections.
- Better Auth docs: drizzleAdapter provider `pg`, schema mapping.

### Secundárias (MEDIUM)

- Claude Code (Anthropic): API Errors, Rate Limits, GitHub issues #41788, #22876, #45756; Claude-Code-Usage-Monitor.
- PostgreSQL latency: Cybertec benchmarks; Readyset N+1.
- Fork governance: CMU Hard Forks Study (Zhou et al., 2020); DEV lessons-from-maintaining-a-fork.

### Terciárias (LOW)

- Estimativas de complexidade do swap de auth (não aplicável v1; resolvido).
- Viabilidade exata de session continuity Claude CLI cross-account (depende de validação empírica Fase 4).

---
*Pesquisa concluída: 2026-04-25*
*Pronto para roadmap: sim*
