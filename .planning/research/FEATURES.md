# Pesquisa de Funcionalidades — DDD (Fork de Paperclip)

**Domínio:** Plataforma de orquestração de agentes de IA (control plane multi-agent) — fork hard do `paperclipai/paperclip` adaptado para uma equipe de 5+ devs com backend Supabase compartilhado e troca multi-conta Claude Code.
**Pesquisado:** 2026-04-25
**Confiança:** HIGH para inventário do paperclip (lido direto do repo `master`); MEDIUM para multi-account swap (paperclip tem fundações mas não a feature completa); HIGH para anti-features (já estão em `PROJECT.md`).

---

## Sumário Executivo

Paperclip (58k stars, projeto open-source da `paperclipai`, Node.js + TypeScript 97.8%) é um control plane maduro para orquestrar agentes de IA como se fossem funcionários de uma empresa. Ele já entrega quase todas as features estruturais que nosso fork precisa: org chart, hierarquia, tarefas com checkout atômico, fila acordável (DB-backed wakeup queue), orçamento por escopo, governança com aprovações, audit log durável, adapters para Claude Code / Codex / Cursor / OpenClaw / Gemini / Bash / HTTP, multi-empresa isolada, dois modos de deploy (`local_trusted` e `authenticated`), múltiplos usuários humanos e Supabase já listado oficialmente como banco hosted.

Isso significa que **a maior parte do trabalho de "table-stakes" do nosso fork não é construir features novas — é trocar duas peças de infraestrutura** (auth: Better Auth → Supabase Auth; persistência: Postgres embedded auto-criado → projeto Supabase compartilhado `bxlczioxgizgvtznukwt`) e **adicionar uma feature genuinamente nova** que paperclip não tem: troca automática (ou semi-automática) de conta Claude Code quando uma conta esgota tokens, preservando continuidade de sessão.

O paperclip já tem **fundações parciais** para multi-account: o adapter `claude-local` lê `CLAUDE_CONFIG_DIR` por processo (permitindo `~/.claude-acct-a` e `~/.claude-acct-b`), polling de quota windows da API Anthropic, leitura de `~/.claude/.credentials.json` com OAuth tokens, e detecção de `claude auth status`. Falta o **orquestrador** que decide *qual conta usar para cada agente* e *quando trocar*, persistindo essa decisão no estado do agente para sobreviver a heartbeats.

---

## Panorama de Funcionalidades

### Requisitos Básicos (Usuários Esperam Estes)

Funcionalidades que devem existir ou o produto não embarca. Para um fork interno de equipe de 5+ devs, "usuário" = membro da equipe que clona o repo e quer ser produtivo na primeira hora.

| Funcionalidade | Por Que É Esperada | Complexidade | Origem | Notas |
|----------------|--------------------|--------------|--------|-------|
| Org chart / hierarquia de agentes (cargos, chefes, descrições de função) | Núcleo do paperclip — "Hierarchies, roles, reporting lines. Your agents have a boss, a title, and a job description." | — | **Herdada do paperclip** | Schema completo em `packages/db/src/schema/agents.ts`, `companies.ts`, `company_memberships.ts`. Nada a fazer. |
| Issues/tarefas com checkout atômico, parent/project/goal links, blockers, comentários, work products | Modelo de trabalho central do paperclip — "Issues carry company/project/goal/parent links, atomic checkout with execution locks, first-class blocker dependencies." | — | **Herdada do paperclip** | Tabelas `issues`, `issue_comments`, `issue_relations`, `issue_work_products`, `issue_thread_interactions`, etc. Não tocar. |
| Wakeup queue DB-backed com coalescing, budget checks, secret injection, skill loading | Como agentes realmente rodam no paperclip — fila durável em vez de memória | — | **Herdada do paperclip** | `agent_wakeup_requests` + `services/heartbeat.ts`, `services/issue-assignment-wakeup.ts`. Sobrevive automaticamente quando trocamos para Supabase porque é só uma tabela Postgres. |
| Token & cost tracking por company/agent/project/goal/issue/provider/model + budget hard-stops + auto-pause em overspend | Controle financeiro é primeira-classe no paperclip — "Overspend pauses agents and cancels queued work automatically." | — | **Herdada do paperclip** | `cost_events`, `budget_policies`, `budget_incidents`, `services/budgets.ts`, `services/finance.ts`. Roadmap do paperclip marca "Better Budgeting" como ✅. |
| Aprovações (board approval workflows, review/approval stages, decision tracking, audit log) | Governança como cidadã primeira classe — "Board approval workflows, execution policies with review/approval stages, decision tracking." Roadmap "Agent Reviews and Approvals" ✅ | — | **Herdada do paperclip** | `approvals`, `approval_comments`, `issue_approvals`, `issue_execution_decisions`, `services/approvals.ts`, `services/issue-execution-policy.ts`. |
| Audit log durável (mutating actions, heartbeat state, cost events, approvals, comments, work products) | Compliance e debugging para equipe — "recorded as durable activity" | — | **Herdada do paperclip** | `activity_log`, `services/activity.ts`, `services/activity-log.ts`. |
| Adapters Claude Code, Codex, Cursor, OpenClaw, Gemini, OpenCode, Bash, HTTP | Multi-provider é tese central — "If it can receive a heartbeat, it's hired." | — | **Herdada do paperclip** | `packages/adapters/{claude-local,codex-local,cursor-local,gemini-local,openclaw-gateway,opencode-local,pi-local}`. |
| Workspaces de execução isolados (git worktrees, operator branches, dev servers, preview URLs) | Cada agente trabalha em sandbox sem pisar nos outros — "Project workspaces, isolated execution workspaces (git worktrees, operator branches), and runtime services." | — | **Herdada do paperclip** | `execution_workspaces`, `workspace_runtime_services`, `services/execution-workspaces.ts`, `services/workspace-runtime.ts`, `dev-runner-worktree.ts`. |
| Persistência de sessão Claude Code entre heartbeats (resume ID por cwd) | Agente continua de onde parou em vez de reiniciar — explícito em `docs/adapters/claude-local.md`: "The adapter persists Claude Code session IDs between heartbeats." | — | **Herdada do paperclip** | `agent_runtime_state`, `agent_task_sessions`, `heartbeat_runs`. |
| Múltiplas empresas com isolamento total (multi-tenant) | "One deployment, many companies. Complete data isolation." | — | **Herdada do paperclip** | Já no schema. Para nossa equipe basicamente não usaremos múltiplas companies, mas o isolamento existe. |
| Múltiplos usuários humanos compartilhando uma board (5+ devs no nosso caso) | Roadmap "Multiple Human Users" ✅ — "shared board access, safer collaboration, several humans supervising the same autonomous company." | — | **Herdada do paperclip** | `instance_user_roles`, `company_memberships`, `principal_permission_grants`, `invites`. Já desenhado para nosso caso. |
| Modo `authenticated` com login via Better Auth + bind privado (LAN/Tailscale/loopback) | Necessário para múltiplos devs apontarem para mesmo backend com identidade — paperclip já tem dois modos: `local_trusted` (sem login) e `authenticated` (login obrigatório) | — | **Herdada do paperclip** | `docs/deploy/deployment-modes.md`. **Mas o auth provider muda** — ver linha abaixo. |
| Secrets management (instance + company secrets, encrypted local, secret refs em env de agente) | Chaves como `ANTHROPIC_API_KEY` precisam ser injetadas em runtime sem aparecer em prompts — "Sensitive values stay out of prompts." | — | **Herdada do paperclip** | `company_secrets`, `company_secret_versions`, `services/secrets.ts`, `services/plugin-secrets-handler.ts`, `routes/secrets.ts`. Suporta `secret_ref` em config de adapter. |
| **Persistência em Supabase remoto compartilhado (não Postgres embedded)** | Tese central do nosso fork — todos devs partilham mesmo estado | LOW | **Adaptação do paperclip** | Paperclip **já documenta Supabase como modo hosted oficial** em `docs/deploy/database.md` (modo 3). É só `DATABASE_URL=postgres://...supabase.com...` + `prepare: false` em `packages/db/src/client.ts` para connection pooling. Tem dois caveats: (1) precisa **desabilitar o módulo embedded-postgres** que o paperclip auto-cria se `DATABASE_URL` ausente; (2) decidir se usaremos direct connection (5432) ou pooler (6543). Drizzle migrations rodam contra Supabase normalmente via `drizzle-kit push` ou `migrate.ts`. |
| **Autenticação Supabase Auth (email/senha) substituindo Better Auth** | Decisão fixada em `PROJECT.md`: "Supabase Auth nativo, não rolar nosso próprio" | HIGH | **Novo no fork** | Better Auth está profundamente integrado em `server/src/auth/better-auth.ts` com schema próprio (`authUsers`, `authAccounts`, `authSessions`, `authVerifications` em `packages/db/src/schema/auth.ts`) e middleware Express que injeta `req.user`. Substituir por Supabase Auth requer: (a) bridging entre `auth.users` do Supabase e tabelas internas que referenciam users por ID em todo lugar (instance_user_roles, company_memberships, principal_permission_grants, invites, board_api_keys, cli_auth_challenges, etc.); (b) decidir se mantemos os schemas `authUsers`/etc. como espelho local ou os removemos e referenciamos `auth.users(id)` direto via foreign keys cross-schema; (c) trocar middleware de session validation (cookie Better Auth → JWT Supabase no header `Authorization`); (d) board claim flow precisa entender o novo fluxo de login. Esta é a peça mais cara do fork. |
| **Row Level Security no Supabase** | Sem RLS, qualquer dev com `service_role` ou anon key vê tudo — risco para state compartilhado | MEDIUM | **Novo no fork** | Paperclip aplica autorização **só em camada de aplicação** (middleware Express, services como `authz.ts`). Em Supabase compartilhado o ideal é RLS defensivo: pelo menos isolar por `company_id` para todas as tabelas de domínio (issues, agents, cost_events, approvals, etc.). Decisão chave: o backend Node usa `service_role` (bypassa RLS) e mantém auth na app, ou usa anon key + JWT do user e RLS faz o gate? Recomendado: **service_role no backend** (preserva código de authz existente do paperclip), **RLS defensiva em todas as tabelas** como segunda camada caso vaze conexão direta. |
| **Migrations rodam contra Supabase a partir do clone do repo** | Qualquer dev faz `git clone && pnpm install && pnpm migrate` e está pronto | LOW | **Adaptação** | `packages/db/src/migrate.ts` já existe. Precisa: (1) bootstrap script com `DATABASE_URL` apontando para Supabase compartilhado; (2) decidir se cada dev roda migrations (não — apenas um designado) ou se há CI/script `migration-status.ts` (já existe!) que verifica antes de rodar app. Paperclip já tem `check-migration-numbering.ts`, `migration-status.ts`, `migration-runtime.ts`. |
| **Setup local sem fricção (qualquer dev clona e roda)** | "Documentar setup local para qualquer dev clonar o repo e começar a usar sem fricção" — `PROJECT.md` | LOW-MEDIUM | **Adaptação** | Paperclip já tem `pnpm paperclipai onboard` (CLI interativa) e `docs/start/quickstart.md`. Adaptar para nosso caso: `.env.example` com `DATABASE_URL` aponta para Supabase compartilhado, `SUPABASE_URL` + `SUPABASE_ANON_KEY` documentados, `BETTER_AUTH_SECRET` substituído. README de fork documenta: clonar, copiar `.env.example`, instalar `claude` CLI, rodar `pnpm paperclipai onboard` em modo `authenticated`. |
| **Multi-Claude-Code-account swap com continuidade de estado** | Tese diferenciadora do nosso fork — quando uma conta esgota tokens, agente troca de conta sem perder o trabalho | **HIGH** | **Novo no fork** | Detalhado abaixo na seção de diferenciais — é a única feature genuinamente nova e tecnicamente não-trivial. Marquei como "table-stakes" porque sem isso o fork não justifica existir. |

### Diferenciais (Vantagem Competitiva da Equipe)

Funcionalidades que não são esperadas no paperclip vanilla mas dão à nossa equipe vantagem operacional. Diferenciais devem se alinhar ao Valor Central de `PROJECT.md`: "trabalho dos agentes nunca é interrompido por limites de token de uma conta — basta trocar a conta e continuar."

| Funcionalidade | Proposta de Valor | Complexidade | Origem | Notas |
|----------------|-------------------|--------------|--------|-------|
| **Pool de contas Claude Code com swap automático em token exhaustion** | Agentes não param quando uma conta atinge limite. Multiplica throughput efetivo da equipe pelo número de contas no pool sem aumentar custo (assinaturas pagas por conta). | HIGH | **Novo** | Modelo de dados: tabela `claude_accounts` (id, label, config_dir, owner_user_id, status, last_quota_check_at, quota_remaining, exhausted_until). Tabela `agent_account_assignments` (agent_id, account_id, assigned_at, reason) registra qual conta cada agente está usando agora. Lógica de swap: heartbeat tenta rodar; se Claude CLI retorna erro de rate limit / 429 / "weekly limit reached", o handler pega próxima conta `available` do pool, atualiza assignment, marca conta atual como `exhausted_until=<timestamp do reset window>`, e re-enfileira o wakeup. Continuidade: `agent_runtime_state` já persiste session ID por cwd; trocar conta significa **trocar `CLAUDE_CONFIG_DIR` para o do novo perfil** mas manter o session ID — **isso só funciona se o session ID for válido na nova conta**, o que **não é** (sessões são por conta). Solução pragmática: trocar conta força novo session (perde turn history dentro do CLI, mas mantém issue context que é recarregado do paperclip a cada heartbeat). Documentar trade-off. |
| Multi-projetos paralelos no fluxo da equipe | 5+ devs trabalhando em projetos diferentes simultaneamente sem coordenação manual de quem está rodando o quê | LOW | **Herdada + ajuste** | Paperclip já suporta múltiplos `projects` por company e `execution_workspaces` isolados. Tuning para nosso fluxo: garantir que workers/heartbeats não saturam o Supabase quando 5+ devs rodam local com agentes ativos. Provável adicionar: limite por dev, ou queue prioritizada por `instance_id` para fairness. |
| Per-dev preferences sem quebrar shared state | Cada dev customiza UI, sidebar, filtros sem afetar outros | LOW | **Herdada** | Paperclip já tem `user_sidebar_preferences` e `company_user_sidebar_preferences`. Apenas garantir que estes resolvem por `auth.users.id` do Supabase corretamente após swap de auth. |
| Observability de qual conta está rodando qual agente | Operador da equipe vê em tempo real "agent X usando conta Y, restam Z% de tokens na janela" | MEDIUM | **Novo** | UI nova: painel de "Account Pool Status" listando contas, % usado, próximo reset, agente assignado. Backend: agregar `quota_windows` (já existe via `services/quota-windows.ts`) por conta, juntar com `agent_account_assignments`. Provavelmente uma rota nova `/accounts/status` e card no dashboard. |
| Heartbeat-aware account selection (escolher conta com mais quota disponível) | Em vez de round-robin cego, agente novo recebe a conta com maior `quota_remaining` | MEDIUM | **Novo** | Estende a lógica de swap acima. Quando agente vai pegar wakeup, lookup pool, ranqueia por `quota_remaining` desc, pega top 1 que esteja `available`. Já temos `fetchAllQuotaWindows()` em `services/quota-windows.ts` — só precisamos correlacionar `provider=anthropic` window por conta (cada conta = `CLAUDE_CONFIG_DIR` diferente). |
| Per-dev "claim" de conta para trabalho focado | Dev quer rodar pesado num projeto e reserva temporariamente uma conta inteira para si, evitando swap automático | LOW | **Novo** | Boolean flag `pinned_to_user_id` em `claude_accounts`. Pool selection ignora contas pinned para outro user. UI permite "claim" / "release". |

### Anti-Funcionalidades (Comumente Pedidas, Frequentemente Problemáticas)

Decisões fixadas em `PROJECT.md` (seção Fora do Escopo) reproduzidas aqui com justificativa de produto.

| Funcionalidade | Por Que É Pedida | Por Que É Problemática | Alternativa |
|----------------|------------------|------------------------|-------------|
| Hospedar instância web pública única para a equipe | "Mais simples, todo mundo acessa um URL" | (1) Custo de infra dedicada e operação 24/7. (2) Cada dev rodando local pode bater no `claude` CLI da própria máquina sem precisar de tunnel para o servidor central. (3) Workspace de execução são git worktrees em filesystem local — uma instância central precisaria sincronizar ou montar workspaces remotos. (4) Paperclip é desenhado local-first; o modo `authenticated+public` existe mas tem checks mais rígidos no doctor e exige reverse proxy adequado. (5) Para 5+ devs internos, complexidade não compensa. | Cada dev roda local em modo `authenticated`. Backend de estado é Supabase compartilhado. Auth identifica quem é. |
| OAuth (Google/GitHub login) na v1 | Login mais rápido, menos uma senha pra lembrar | (1) Supabase Auth email/senha é trivialmente configurável e suficiente para 5+ devs internos. (2) OAuth providers exigem registro de app em cada provider, redirect URI configurado para cada ambiente local de cada dev — onerosamente complexo. (3) Distrai do trabalho real do fork. | Supabase Auth email/senha v1. OAuth é trivial de adicionar depois (Supabase dá em poucas linhas) se a equipe pedir. |
| Mobile app | "Quero monitorar agentes do celular" | (1) Paperclip é web por design — UI inteira em React/Vite/Tailwind. (2) Reescrever em React Native ou wrapper Capacitor multiplica superfície de manutenção do fork. (3) Para monitorar de fora, web responsivo + Tailscale resolve 90%. | Manter web. Web responsivo em mobile já é decent. Se necessário, configurar Tailscale para acessar instância de qualquer dev de fora. |
| Sincronização ativa com upstream paperclip | "Pegar fixes e features novas grátis" | (1) Decisão fixada: fork hard. (2) Mexer em auth e DB é exatamente onde o conflito de merge será doloroso. (3) Paperclip itera rápido — ROADMAP lista 14+ milestones; tentar acompanhar drena energia da equipe. | Fork hard. Cherry-pick manual de fixes específicos quando relevante. Documentar SHA do fork point para referência futura. |
| Supabase isolado por dev | "Cada dev tem sandbox próprio sem afetar os outros" | (1) Quebra a tese central do projeto: estado compartilhado da equipe. (2) Multiplica custo de Supabase. (3) Devs precisariam exportar/importar `companies` toda hora (paperclip tem `companies-spec.md` mas é workflow extra). | Supabase único compartilhado (`bxlczioxgizgvtznukwt`). RLS e environments do paperclip já isolam por company se quisermos sandboxing lógico. |
| Pool de contas multi-provider em v1 (rotacionar entre OpenAI + Anthropic) | "Aproveitar quotas de todos os providers" | (1) Cada provider tem semântica de quota / billing / sessão diferente — generalizar prematuramente é design especulativo. (2) Codex e Cursor têm seus próprios CLIs com seus próprios estados. (3) MVP foca em Claude Code porque é o que a equipe usa. | v1 = pool de contas Claude Code apenas. Se OpenAI/Codex virar gargalo depois, generalizar. |
| Auto-renovação de sessão Claude Code on swap (preservar turn history) | "Trocar conta mantendo conversa do Claude Code intacta" | (1) Sessões Claude Code são por conta — session ID criado em conta A é inválido em conta B. Não é limitação do paperclip; é da Anthropic. (2) Tentar workaround (replay de history) gasta tokens novamente do zero. | Aceitar que swap = nova sessão. O **issue context** do paperclip é o estado real (recarregado a cada heartbeat); o session do Claude CLI é cache de turn history. Documentar trade-off no README. |

---

## Dependências de Funcionalidades

```
[Supabase shared DB]
    └──habilita──> [Supabase Auth]
                       └──habilita──> [RLS defensivo por company_id]
                                          └──habilita──> [5+ devs locais usando shared state com segurança]

[Supabase shared DB]
    └──habilita──> [Migrations a partir de clone do repo]
                       └──habilita──> [Setup local sem fricção]

[Pool de contas Claude Code (schema novo)]
    └──requer──> [Supabase Auth]                    (precisa saber quem é dono de cada conta)
    └──requer──> [Secrets management do paperclip]  (cada conta tem credenciais separadas)
    └──habilita──> [Account swap automático em token exhaustion]
                       └──requer──> [services/quota-windows.ts existente]
                       └──habilita──> [Observability de account assignments]
                       └──habilita──> [Heartbeat-aware account selection]
                       └──habilita──> [Per-dev claim de conta]

[CLAUDE_CONFIG_DIR per-process do paperclip]
    └──habilita──> [Account swap] (técnica subjacente: cada conta = config dir diferente)

[agent_runtime_state + heartbeat-runs do paperclip]
    └──habilita──> [Continuidade após swap]
        └──com caveat──> Session ID Claude CLI invalida no swap; issue context do paperclip sobrevive

[Better Auth removal]
    └──conflita──> [Schema authUsers/authAccounts/authSessions/authVerifications existente]
        └──decisão──> remover schemas ou manter como espelho de auth.users do Supabase
```

### Notas de Dependência

- **Pool de contas requer Supabase Auth:** Cada `claude_accounts` tem `owner_user_id` que referencia `auth.users(id)` do Supabase; sem auth resolvido, não dá pra fazer "per-dev claim" nem auditoria de quem cadastrou cada conta.
- **Pool de contas requer secrets management:** Credenciais OAuth Claude Code ficam em `~/.claude/.credentials.json` localmente. Paperclip já trata `CLAUDE_CONFIG_DIR` como variável de ambiente do agente; basta que `claude_accounts.config_dir` aponte para o diretório certo de cada conta. Tokens de API key (alternativa a OAuth) ficam em `company_secrets` e são referenciados via `secret_ref`.
- **Account swap conflita com session continuity (parcial):** O paperclip persiste session ID Claude Code por cwd em `agent_runtime_state` e tenta resume no próximo heartbeat. Se trocamos `CLAUDE_CONFIG_DIR` para outra conta, o session ID antigo é inválido nessa nova conta. Adapter `claude-local` já tem fallback ("If resume fails with an unknown session error, the adapter automatically retries with a fresh session") — esse comportamento existente já cobre o caso de swap, mas a equipe precisa entender que turn history dentro do CLI é descartada. Issue context do paperclip (comentários, work products, decisão policy) sobrevive porque vive na DB, não no CLI.
- **Better Auth removal conflita com schema:** `packages/db/src/schema/auth.ts` define `authUsers`, `authAccounts`, `authSessions`, `authVerifications` que são usadas como FK por outras tabelas (board_api_keys, cli_auth_challenges, instance_user_roles, etc.). Não dá pra simplesmente dropar — precisa decidir entre (a) manter schema mas sincronizar com `auth.users` do Supabase via trigger, ou (b) refatorar todas as FKs para apontar para `auth.users(id)` cross-schema. Opção (a) é menos invasiva e preserva código existente do paperclip; (b) é mais limpa mas mexe em muitos arquivos.
- **RLS defensiva é segunda camada:** Backend roda com `service_role` (bypassa RLS) então autorização real continua sendo a do paperclip (`services/access.ts`, `services/agent-permissions.ts`, middleware `authz.ts`). RLS protege apenas contra cenários de vazamento de connection string ou conexão direta de dev curioso via dashboard Supabase.

---

## Definição de MVP

### Lançar Com (v1)

Produto mínimo viável — o necessário para a equipe parar de usar `paperclip` vanilla e começar a usar nosso fork no dia-a-dia.

- [ ] **Fork hard de paperclipai/paperclip** — Clonar `master` no SHA atual, remover remote upstream, commit inicial em repo próprio. Essencial — base de código.
- [ ] **`DATABASE_URL` apontando para Supabase compartilhado `bxlczioxgizgvtznukwt`** — Trivial de configurar (paperclip já documenta este modo). `prepare: false` no `client.ts` se usarmos pooler.
- [ ] **Embedded Postgres desabilitado** — Garantir que `embedded-postgres` não auto-inicia quando `DATABASE_URL` está setado. Possivelmente já é comportamento default; validar.
- [ ] **Migrations Drizzle rodadas contra Supabase uma vez (por owner do projeto)** — Schema completo do paperclip existe em produção Supabase. Validar com `migration-status.ts`.
- [ ] **Supabase Auth substitui Better Auth** — A peça mais pesada. Refatorar `server/src/auth/better-auth.ts` para validar JWT do Supabase, ajustar middleware, refatorar schema `authUsers` ou criar bridge. Inclui board claim flow.
- [ ] **5+ devs cadastrados em Supabase Auth (email/senha)** — Convites enviados, primeiro login feito, board promotion executada via `board-claim` flow.
- [ ] **Modo `authenticated` ativo** — Onboard runs com `PAPERCLIP_DEPLOYMENT_MODE=authenticated`. Cada dev faz login local antes de usar.
- [ ] **Pool de contas Claude Code (schema + UI básica)** — Tabela `claude_accounts`, `agent_account_assignments`. Página simples para listar, adicionar (registrar `CLAUDE_CONFIG_DIR` + label), remover.
- [ ] **Swap automático em token exhaustion** — Hook no `claude-local` adapter que detecta erro de rate limit, marca conta exausta, reassigna agente para próxima conta disponível, re-enfileira wakeup. Mantém continuidade via reload do issue context (não session do CLI).
- [ ] **README de setup do fork** — `git clone`, `pnpm install`, copiar `.env.example`, login no Supabase, primeiro `pnpm paperclipai run`.
- [ ] **RLS defensivo básico** — Pelo menos `auth.users` (read-only para users) e tabelas mais sensíveis (`company_secrets`, `cost_events`) com policies. Backend continua usando `service_role`.

### Adicionar Após Validação (v1.x)

Funcionalidades para adicionar depois que o core funciona e a equipe está produtiva.

- [ ] **Heartbeat-aware account selection** — Disparado quando: equipe nota que swap reativo é lento e prefere preempção. Ranquear por `quota_remaining` antes de assignment.
- [ ] **Painel observability de account pool** — Disparado quando: alguém pergunta "qual conta tá rodando o quê?" mais de 2 vezes por semana. Adicionar card no dashboard.
- [ ] **Per-dev claim de conta** — Disparado quando: dois devs reclamam que a "minha conta" foi pega pelo agente do outro durante trabalho focado.
- [ ] **RLS completo (todas tabelas de domínio por `company_id`)** — Disparado quando: equipe cresce além de 10 ou conexão Supabase vaza para fora do controle de admin.

### Consideração Futura (v2+)

Funcionalidades a adiar até que o uso real estabeleça necessidade.

- [ ] **OAuth providers** — Adiar até equipe explicitamente pedir. Supabase Auth torna isso trivial depois (10 linhas).
- [ ] **Pool multi-provider (OpenAI/Codex/Cursor além de Claude)** — Adiar até gargalo real. Generalização especulativa é desperdício.
- [ ] **Cloud deployment compartilhado** — Adiar indefinidamente. Local-first é a tese.
- [ ] **Mobile / desktop app** — Adiar indefinidamente.
- [ ] **Memória/knowledge avançado** — Está no roadmap do upstream paperclip; podemos cherry-pick depois se quisermos.
- [ ] **Auto-merge de upstream paperclip** — Decisão fixada como anti-feature; cherry-pick manual quando justificável.

---

## Matriz de Priorização de Funcionalidades

| Funcionalidade | Valor | Custo | Prioridade | Justificativa |
|----------------|-------|-------|------------|---------------|
| `DATABASE_URL` → Supabase | HIGH | LOW | P1 | Bloqueador de tudo. Paperclip já documenta este modo. |
| Embedded Postgres desabilitado | HIGH | LOW | P1 | Sem isso, paperclip cria DB local e ignora Supabase. |
| Migrations rodadas contra Supabase | HIGH | LOW | P1 | Bloqueador de qualquer feature que toque DB. |
| Supabase Auth substitui Better Auth | HIGH | HIGH | P1 | Sem isso, devs não logam. Custo alto pelo entrelaçamento de Better Auth. |
| Modo `authenticated` ativo | HIGH | LOW | P1 | Já existe no paperclip; só configurar. |
| Pool de contas Claude (schema + UI básica) | HIGH | MEDIUM | P1 | Sem isso, fork não justifica existir vs. paperclip vanilla. |
| Swap automático em token exhaustion | HIGH | HIGH | P1 | Tese central. Detecção de erro + reassignment + reload context. |
| README de setup | HIGH | LOW | P1 | Sem isso, devs não conseguem clonar e rodar. |
| RLS defensivo básico | MEDIUM | LOW | P1 | Custo baixo, defesa em profundidade barata. |
| 5+ devs cadastrados | HIGH | LOW | P1 | Operacional, não código — só convidar. |
| Heartbeat-aware account selection | MEDIUM | MEDIUM | P2 | Otimização sobre P1; reativo já cobre 90% do uso. |
| Painel observability de pool | MEDIUM | MEDIUM | P2 | Útil mas não bloqueante. |
| Per-dev claim de conta | LOW | LOW | P2 | Resolve atrito social entre devs; trivial de adicionar. |
| RLS completo todas tabelas | MEDIUM | MEDIUM | P2 | Defesa adicional; adicionar quando equipe crescer. |
| OAuth providers | LOW | LOW | P3 | Conveniência; email/senha é OK para 5+ devs. |
| Pool multi-provider | LOW | HIGH | P3 | Generalização especulativa. |
| Cloud deploy / mobile / desktop | LOW | HIGH | P3 | Anti-features de fato; fora da tese. |

**Chave:** P1 = obrigatório v1; P2 = adicionar pós-validação v1.x; P3 = consideração futura v2+.

---

## Análise Comparativa (Paperclip vs Nosso Fork)

| Funcionalidade | Paperclip Vanilla | Nosso Fork |
|----------------|-------------------|------------|
| Banco de dados | Embedded Postgres auto-criado em `~/.paperclip/instances/default/db` (modo default); Docker Postgres ou Supabase como modos opcionais | **Supabase compartilhado obrigatório** (`bxlczioxgizgvtznukwt`); embedded desabilitado |
| Auth | Better Auth (modo `authenticated`) ou nenhum (modo `local_trusted`) | **Supabase Auth (email/senha)** sempre ativo |
| Multi-account Claude Code | Suporte parcial: `CLAUDE_CONFIG_DIR` per-process, leitura de credenciais OAuth, polling de quota windows. **Falta orquestração de swap.** | **Pool de contas + swap automático** com persistência de assignment em `agent_account_assignments` |
| Multi-empresa | Sim, completo, com isolamento total | Sim, herdado; provavelmente uma empresa por equipe na prática |
| Multi-usuário humano | Sim, via Better Auth + `instance_user_roles` + `company_memberships` | Sim, via Supabase Auth + mesmo schema (com bridge ou refactor) |
| Deploy | Local-first; modos `local_trusted` ou `authenticated` (privado/público) | **Local-first com `authenticated` privado**; público é anti-feature |
| Adapters de agentes | Claude Code, Codex, Cursor, OpenClaw, Gemini, OpenCode, Pi, Bash, HTTP | Mesmo set; foco operacional em Claude Code |
| Workspaces de execução | Git worktrees, dev servers, preview URLs | Mesmo; herdado |
| Budget/cost/approvals/audit | Completo, primeira-classe | Mesmo; herdado |
| Plugin system | Sim, primeira-classe | Mesmo; herdado (não usaremos no v1) |

---

## Fontes

Pesquisa baseada em leitura direta do repo `paperclipai/paperclip` no branch `master` em 2026-04-25 via GitHub API.

- **README e roadmap:** `paperclipai/paperclip/README.md` (via WebFetch), `paperclipai/paperclip/ROADMAP.md` (lido verbatim — confirma "Multiple Human Users" ✅, "Better Budgeting" ✅, "Agent Reviews and Approvals" ✅, "Cloud deployments" ⚪, "Desktop App" ⚪).
- **Estrutura de diretórios:** `gh api repos/paperclipai/paperclip/contents/...` para `packages/`, `server/src/`, `server/src/services/`, `server/src/routes/`, `server/src/auth/`, `packages/adapters/`, `packages/db/src/schema/`, `docs/`.
- **Schema completo do banco:** Listagem de `packages/db/src/schema/` (66 arquivos `.ts`), confirmando entidades como `agents`, `agent_runtime_state`, `agent_task_sessions`, `agent_wakeup_requests`, `approvals`, `budget_policies`, `cost_events`, `execution_workspaces`, `heartbeat_runs`, `instance_user_roles`, `principal_permission_grants`, `quota_windows` (via service), entre outras.
- **Configuração de banco:** `docs/deploy/database.md` (lido verbatim — confirma três modos: embedded, Docker, **Supabase hosted oficialmente suportado**), `packages/db/drizzle.config.ts` (lido verbatim).
- **Configuração de auth:** `server/src/auth/better-auth.ts` (lido verbatim, confirmando uso de `betterAuth()` + `drizzleAdapter` + tabelas `authUsers/authAccounts/authSessions/authVerifications`), `docs/deploy/deployment-modes.md` (lido verbatim, confirma dois modos `local_trusted` e `authenticated`).
- **Adapter Claude Code:** `docs/adapters/claude-local.md` (lido verbatim — confirma session persistence por cwd, fallback para fresh session em erro, suporte a `ANTHROPIC_API_KEY` ou subscription login, suporte a `dangerouslySkipPermissions`), `packages/adapters/claude-local/src/server/quota.ts` (lido verbatim — confirma leitura de `~/.claude/.credentials.json`, suporte a `CLAUDE_CONFIG_DIR` per-process, parsing de `claude auth status`, polling de quota windows da Anthropic).
- **Quota windows aggregator:** `server/src/services/quota-windows.ts` (lido verbatim — confirma `fetchAllQuotaWindows()` com timeout 20s, mapeamento `claude_local → anthropic`, agregação por adapter).
- **`.env.example` e configuração:** `paperclipai/paperclip/.env.example` (lido verbatim — confirma `DATABASE_URL`, `BETTER_AUTH_SECRET`, `PORT`, `SERVE_UI`).
- **Buscas de código (gh search code):** `ANTHROPIC_API_KEY`, `CLAUDE_CONFIG_DIR`, `subscription login`, `account`, `swap account`, `rate limit` — confirmaram presença/ausência de cada conceito.

**Confiança:**
- HIGH: tudo sobre o paperclip vanilla (lido do repo, não inferido).
- HIGH: anti-features (vêm de `PROJECT.md`, decisões fixadas).
- MEDIUM: estimativas de complexidade do swap de auth (depende de quão acoplado Better Auth está; alta probabilidade de surpresas).
- MEDIUM: viabilidade de session continuity em swap de conta (depende de comportamento exato do CLI Claude com session IDs cross-account; documentação não clarifica explicitamente, mas adapter já tem fallback de fresh session).

---
*Pesquisa de funcionalidades para: control plane multi-agent (fork de paperclip)*
*Pesquisado: 2026-04-25*
