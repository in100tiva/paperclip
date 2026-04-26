# Requisitos: DDD — Paperclip da Equipe

**Definidos:** 2026-04-25
**Valor Central:** A equipe inteira opera sobre um único estado compartilhado (Supabase remoto), e o trabalho dos agentes nunca é interrompido por limites de token de uma conta — basta trocar a conta e continuar de onde parou.

## Requisitos v1

Requisitos para o v1 do fork. Cada um mapeia para uma fase do roadmap.

### Fork

- [x] **FORK-01**: Repo `paperclipai/paperclip` clonado para `d:\projetos\ddd` em commit conhecido (SHA registrado)
- [x] **FORK-02**: Remote upstream removido; `UPSTREAM_REFERENCE.md` documenta SHA original e política de port manual
- [x] **FORK-03**: `package.json` raiz renomeado para `ddd` (sem manter identidade do paperclip)
- [x] **FORK-04**: `CONTRIBUTING.md` declara política de fork hard (sem PRs upstream, port manual quando útil)
- [x] **FORK-05**: `pnpm install` + `pnpm dev` rodam localmente em Windows com embedded Postgres (smoke test baseline antes de mexer)

### Infra

- [x] **INFRA-01**: `MIGRATION_AUDIT.md` mapeia uso de `LISTEN/NOTIFY`, `pg_advisory_lock`, `CREATE TEMP`, prepared statements e transactions long-lived no código do paperclip
- [x] **INFRA-02**: `packages/db/src/client.ts` usa `prepare: false` quando connection string tem porta 6543 (Supavisor pooler)
- [x] **INFRA-03**: `packages/db/src/runtime-config.ts` privilegia `DATABASE_URL` Supabase sobre embedded Postgres
- [x] **INFRA-04**: `.env.example` lista `DATABASE_URL` (pooler 6543), `SUPABASE_DB_URL` (direct 5432 para DDL), `BETTER_AUTH_SECRET`, `PAPERCLIP_INSTANCE_ID`
- [x] **INFRA-05**: Pool de conexões configurado com `max: 5`, `idle_timeout: 20` por instância dev (não saturar Supabase free tier)
- [x] **INFRA-06**: Embedded Postgres permanece como fallback opt-in mas desabilitado por default

### Banco de Dados

- [x] **DB-01**: Migrations Drizzle aplicadas no projeto Supabase `bxlczioxgizgvtznukwt`
- [x] **DB-02**: Auto-migrations no startup desabilitadas — startup falha rápido se schema estiver desatualizado
- [x] **DB-03**: Pipeline GitHub Actions é único caminho que roda `pnpm db:migrate` no Supabase (em merge para main)
- [x] **DB-04**: PRs com mudança de schema requerem aprovação obrigatória antes de merge
- [x] **DB-05**: Drizzle-kit é fonte única de verdade — não usar `supabase migration new` em paralelo

### Auth

- [x] **AUTH-01**: Better Auth funciona contra Postgres do Supabase (schema `user`/`session`/`account`/`verification` com IDs text)
- [x] **AUTH-02**: Cookie prefix configurado via `PAPERCLIP_INSTANCE_ID=team-shared` para todos os devs compartilharem mesma sessão lógica
- [x] **AUTH-03**: Modo `authenticated` ativo — todas as rotas (exceto signup/login) requerem sessão Better Auth válida
- [x] **AUTH-04**: Signup com email/senha disponível para 5+ devs da equipe
- [x] **AUTH-05**: Service-role key do Supabase apenas no servidor — nunca exposto no bundle Vite (verificado por pre-commit hook)

### Equipe

- [ ] **TEAM-01**: 5+ devs cadastrados via fluxo de invite/board-claim do paperclip apontando para Supabase compartilhado
- [x] **TEAM-02**: README de setup local documenta passo-a-passo: clonar, env vars, login, primeiro run
- [x] **TEAM-03**: Setup script (`pnpm setup`) valida env vars críticas, conexão Supabase, presença do `claude` CLI, login Better Auth
- [ ] **TEAM-04**: Smoke test E2E: dev A faz login + cria company; dev B em outra máquina vê a mesma company (estado compartilhado funcional)
- [x] **TEAM-05**: Doc de troubleshooting cobre falhas comuns (Windows NTFS, Supabase no limite de conexões, cookie prefix)

### Spike

- [ ] **SPIKE-01**: `CLAUDE_429_TAXONOMY.md` mapeia tipos de 429 do Claude Code (RPM transient, TPM transient, daily quota, weekly quota, organization tier, "5h limit reached")
- [ ] **SPIKE-02**: Protótipo de classifier `detectClaudeQuotaExhausted` testado contra fixtures reais capturadas
- [ ] **SPIKE-03**: Decisão documentada sobre detecção pré-emptiva (via `tokens-remaining` header) vs reativa (parse de stream)
- [ ] **SPIKE-04**: Validação empírica: `session_id` do Claude CLI é por-conta? Mecânica de retomada via `issue_continuation_summary` confirmada
- [ ] **SPIKE-05**: Smoke test manual com 2 contas em filesystem disparando swap em exhaustão simulada

### Multi-Conta

- [ ] **MULTI-01**: Schema `claude_accounts` (id, companyId, ownerUserId, label, configDirSlug, status, lastQuotaWindowsJson, lastUsedAt, exhaustedUntil) migrado e funcional
- [ ] **MULTI-02**: Schema `agent_account_bindings` (agentId PK, activeAccountId, rotationPolicy, lastRotatedAt) migrado
- [ ] **MULTI-03**: Schema `agent_step_executions` append-only com (run_id, step_id, account_id, input_tokens, output_tokens, cost_usd, started_at, completed_at) para attribution
- [ ] **MULTI-04**: `services/claude-accounts.ts` implementa `listAccounts`, `selectActiveAccount`, `rotateOnQuotaExhausted`, `resolveCredentialDir` com lock pessimista (`pg_advisory_xact_lock` por agent_run)
- [ ] **MULTI-05**: Patch `claude-local/src/server/execute.ts` aceita `config.claudeConfigDir` e propaga para spawn env (`CLAUDE_CONFIG_DIR`)
- [ ] **MULTI-06**: Patch `claude-local/src/server/parse.ts` adiciona `detectClaudeQuotaExhausted` baseado no spike
- [ ] **MULTI-07**: `services/heartbeat.ts` chama `selectActiveAccount` antes de cada spawn de agente
- [ ] **MULTI-08**: Swap automático: ao detectar exhaustão, drena step atual → checkpoint → swap → resume usando `issue_continuation_summary`
- [ ] **MULTI-09**: UI `ui/src/pages/ClaudeAccounts.tsx` permite registrar conta, ver status (live/exhausted/cooldown), histórico de rotações
- [ ] **MULTI-10**: Activity log emite `claude_account_rotated` com (from, to, reason, agentId) a cada swap
- [ ] **MULTI-11**: Smoke test E2E: agente roda → conta A esgota → swap automático para B → continuidade preservada → cost atribuído corretamente a cada conta

### Multi-Projeto

- [ ] **PROJ-01**: Múltiplas companies/projects podem rodar agentes em paralelo no mesmo Supabase sem cross-contamination
- [ ] **PROJ-02**: Pool de contas Claude pode ser per-company (cada empresa registra suas próprias contas) ou shared (configurável)
- [ ] **PROJ-03**: Cost attribution agrega por (companyId, accountId) para visibilidade de gasto por projeto

## Requisitos v2

Diferidos para milestone futuro. Rastreados mas não no roadmap atual.

### Auth Migration

- **AUTH2-01**: Migrar de Better Auth para Supabase Auth (resolução de conflito text-id ↔ uuid)
- **AUTH2-02**: Habilitar RLS completa com `auth.uid()` resolúvel
- **AUTH2-03**: OAuth (Google/GitHub) via Supabase Auth providers

### Observability

- **OBS-01**: Painel observability mostrando qual conta está rodando qual agente em tempo real
- **OBS-02**: Reconciliação periódica de cost vs Anthropic dashboard
- **OBS-03**: Alertas quando pool de contas está perto de saturar

### Polish Multi-Conta

- **POOL-01**: Heartbeat-aware account selection (não picar conta que acabou de retornar 429)
- **POOL-02**: Per-dev claim de conta (dev pode "marcar" uma conta para uso pessoal)
- **POOL-03**: Multi-provider pool (Codex, Cursor, etc além de Claude)

### Storage

- **STOR-01**: Migrar uploads do paperclip para Supabase Storage (atualmente filesystem local)
- **STOR-02**: Supabase Realtime para broadcast de status de agente substituindo WebSocket interno

### Defesa em Profundidade

- **RLS-01**: RLS defensivo opcional em tabelas sensíveis (`company_secrets`, `cost_events`) para times >10 devs
- **RLS-02**: Cleanup periódico de `heartbeat_runs` e `activity_log` (TTL configurável)

## Fora do Escopo

| Funcionalidade | Motivo |
|----------------|--------|
| Migração para Supabase Auth no v1 | Schemas Better Auth (text id) incompatíveis com `auth.users` (uuid); migração HIGH effort sem ganho v1 |
| RLS completa no v1 | Sem `auth.uid()` resolúvel (Better Auth ≠ Supabase Auth); GUC custom seria frágil; autorização aplicacional via membership é suficiente |
| OAuth (Google/GitHub) no v1 | Better Auth email/senha herdado é suficiente para 5+ devs internos |
| Hospedar instância web pública única | Cada dev roda local; estado compartilhado via Supabase é o único shared state |
| Supabase isolado por dev | Todos compartilham `bxlczioxgizgvtznukwt` — esse é o ponto |
| Mobile app | Paperclip é web; mantemos web |
| Sincronização com upstream paperclip | Fork hard — modificamos livremente sem custo de merge |
| Pool multi-provider (Codex, Cursor) no v1 | Foco do v1 é Claude Code; pool genérico vira v2 |

## Rastreabilidade

Quais fases cobrem quais requisitos. Atualizado durante a criação do roadmap.

| Requisito | Fase | Status |
|-----------|------|--------|
| FORK-01 | Phase 1 | Complete |
| FORK-02 | Phase 1 | Complete |
| FORK-03 | Phase 1 | Complete |
| FORK-04 | Phase 1 | Complete |
| FORK-05 | Phase 1 | Complete |
| INFRA-01 | Phase 2 | Complete |
| INFRA-02 | Phase 2 | Complete |
| INFRA-03 | Phase 2 | Complete |
| INFRA-04 | Phase 2 | Complete |
| INFRA-05 | Phase 2 | Complete |
| INFRA-06 | Phase 2 | Complete |
| DB-01 | Phase 2 | Complete |
| DB-02 | Phase 2 | Complete |
| DB-03 | Phase 2 | Complete |
| DB-04 | Phase 2 | Complete |
| DB-05 | Phase 2 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| TEAM-01 | Phase 3 | Pending |
| TEAM-02 | Phase 3 | Complete |
| TEAM-03 | Phase 3 | Complete |
| TEAM-04 | Phase 3 | Pending |
| TEAM-05 | Phase 3 | Complete |
| SPIKE-01 | Phase 4 | Pending |
| SPIKE-02 | Phase 4 | Pending |
| SPIKE-03 | Phase 4 | Pending |
| SPIKE-04 | Phase 4 | Pending |
| SPIKE-05 | Phase 4 | Pending |
| MULTI-01 | Phase 5 | Pending |
| MULTI-02 | Phase 5 | Pending |
| MULTI-03 | Phase 5 | Pending |
| MULTI-04 | Phase 5 | Pending |
| MULTI-05 | Phase 5 | Pending |
| MULTI-06 | Phase 5 | Pending |
| MULTI-07 | Phase 5 | Pending |
| MULTI-08 | Phase 5 | Pending |
| MULTI-09 | Phase 5 | Pending |
| MULTI-10 | Phase 5 | Pending |
| MULTI-11 | Phase 5 | Pending |
| PROJ-01 | Phase 6 | Pending |
| PROJ-02 | Phase 6 | Pending |
| PROJ-03 | Phase 6 | Pending |

**Cobertura:**
- Requisitos v1: 44 total
- Mapeados para fases: 44
- Não mapeados: 0 ✓

---
*Requisitos definidos: 2026-04-25*
*Última atualização: 2026-04-25 após criação do roadmap*
