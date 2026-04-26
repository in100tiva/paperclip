# Pesquisa de Armadilhas

**Domínio:** Fork hard de plataforma de orquestração de agentes (Paperclip) com swap PostgreSQL embedded → Supabase compartilhado, multi-conta Claude Code, equipe de 5+ devs em desenvolvimento local
**Pesquisado:** 2026-04-25
**Confiança:** HIGH para Supabase/Auth/RLS (Context7 + docs oficiais), MEDIUM para Paperclip-específicos (depende de leitura de código upstream pendente), MEDIUM para Claude Code rate-limit (issues GitHub recentes)

---

## Armadilhas Críticas

### Armadilha 1: Reset de identidade do fork sem decisão de "destino do upstream"

**O que dá errado:**
A equipe clona paperclip, começa a modificar agressivamente (tabelas, schema, auth), e três meses depois descobre que o upstream lançou um patch crítico de segurança ou um recurso desejado. Tentar puxar o upstream agora gera centenas de conflitos em arquivos que foram reescritos. A equipe escolhe entre (a) abandonar o patch, (b) gastar uma semana fazendo merge manual, ou (c) tentar cherry-pick e quebrar a codebase. PROJECT.md diz "fork hard sem upstream", mas a tentação de pegar fixes do upstream sempre volta.

**Por que acontece:**
"Fork hard" é uma decisão de governança, não uma decisão técnica do git. Sem disciplina, o repo ainda mantém o remote `upstream`, devs ocasionalmente fazem `git fetch upstream`, e a equipe oscila entre "vamos pegar esse fix" e "vamos ignorar o upstream", sem critério. Estudo da CMU (Zhou et al., 2020) mostra que hard forks que não declaram explicitamente sua relação com o upstream tendem a sofrer com decisões ad-hoc por anos.

**Como evitar:**
Na primeira fase, executar uma cerimônia técnica de "corte do cordão":
1. Após o clone inicial, remover o remote `upstream` do git config (`git remote remove upstream`).
2. Renomear o package (`paperclip` → `ddd` ou similar) para evitar confusão de namespace em logs/imports.
3. Reescrever o histórico inicial com um único commit "Initial fork from paperclipai@<sha>" e deletar branches de feature do upstream.
4. Documentar em CONTRIBUTING.md: "Este projeto NÃO recebe atualizações do upstream. Se o upstream tiver um fix relevante, port manualmente como patch nosso, citando o SHA original no commit message."
5. Criar um arquivo `UPSTREAM_REFERENCE.md` com o SHA do clone inicial — útil para auditoria e port manual de fixes específicos.

**Sinais de alerta:**
- Devs perguntando "como pegar o fix X do paperclip?" mais de uma vez por mês
- PRs com mensagens mencionando "synced with upstream"
- Conflitos de merge persistentes em arquivos como `package.json` ou `README.md`
- Existência de remote `upstream` em `.git/config` de qualquer dev

**Fase para abordar:**
Fase 1 (Setup do Fork). Executar a cerimônia ANTES de qualquer modificação de código.

---

### Armadilha 2: Substituir o adapter de Postgres embedded sem mapear todos os pontos de acoplamento

**O que dá errado:**
A equipe encontra "o módulo que cria o Postgres embedded", troca por uma URL do Supabase, e o app inicia. Tudo parece funcionar nos primeiros testes. Semanas depois descobrem que: (a) o paperclip usava `LISTEN/NOTIFY` para coordenação inter-processo de agentes — não funciona em pgbouncer transaction mode, (b) usava `CREATE TEMPORARY TABLE` em alguns workflows — quebra silenciosamente, (c) tinha auto-migrations que rodavam toda inicialização — agora 5 devs disputam o lock de migration, (d) usava `pg_advisory_lock` para garantir agentes não rodam duas vezes — comportamento muda quando a mesma conexão pooled é reutilizada.

**Por que acontece:**
Embedded Postgres roda em localhost com latência sub-milissegundo, sem pooling, com conexão dedicada por processo. O código do paperclip foi escrito assumindo essas propriedades. Trocar por Supabase remoto via Supavisor (transaction mode, porta 6543) muda o contrato fundamental: prepared statements quebram, sessões não persistem entre transactions, latência de rede entra em jogo. A documentação do Supabase é explícita: "transaction mode does not support prepared statements, SET commands, LISTEN/NOTIFY, or temporary tables."

**Como evitar:**
Antes de tocar no código:
1. Fazer uma auditoria sistemática do código upstream procurando: `LISTEN`, `NOTIFY`, `pg_advisory_lock`, `CREATE TEMP`, `SET LOCAL`, `PREPARE`, transactions de longa duração, e qualquer uso de `pg_notify`. Documentar cada ocorrência em `MIGRATION_AUDIT.md`.
2. Decidir entre Supavisor session mode (porta 5432, mantém sessão por conexão, melhor para apps tradicionais) vs transaction mode (6543, mais escalável mas restrito). Para uma equipe pequena com app de longa duração, **session mode é provavelmente o caminho** — mas valide medindo concorrência real.
3. Para cada ocorrência problemática: portar para um padrão Supabase-compatível (Realtime para LISTEN/NOTIFY, advisory locks transacionais em vez de session-level, eliminar temp tables ou usar CTEs).
4. Desabilitar prepared statement caching no driver (`statement_cache_size: 0` se usando node-postgres com transaction mode).

**Sinais de alerta:**
- Erros intermitentes "prepared statement does not exist" ou "another command is already in progress"
- Funcionalidade que "funciona às vezes" e a flakiness aumenta sob carga
- Logs do Supabase mostrando erros de "Max client connections reached"
- Agentes executando duas vezes em paralelo (advisory lock perdido)

**Fase para abordar:**
Fase 2 (Migration de Storage). MIGRATION_AUDIT.md deve ser entregável obrigatório antes do swap.

---

### Armadilha 3: Auto-migrations conflitando entre 5 devs no mesmo Supabase

**O que dá errado:**
O paperclip provavelmente tem auto-migrations que rodam no startup (típico para apps com embedded DB). Cinco devs iniciam o app simultaneamente apontando para o mesmo Supabase. Cada um tenta aplicar migrations; uns ganham o lock, outros falham com erro críptico. Pior: dev A está em uma branch com migration nova, dev B está em main; A roda primeiro, aplica a migration; B inicia, vê schema com tabela que ele não conhece, app crasha em queries que não esperam essa coluna. Ou pior ainda: B tenta uma migration "down" que apaga a coluna que A precisa, e A perde dados.

**Por que acontece:**
Migrations automáticas no startup são um padrão sensato em dev local com DB próprio (custo de erro = recriar localmente), mas viram caos em DB compartilhado. A documentação do Supabase explicitamente diz: "Coordinate so only one person runs db push at a time, as migration files are applied in timestamp order, and concurrent pushes from different machines can cause conflicts." Junte isso ao fato de que dois devs em branches diferentes podem ter migrations com timestamps próximos, e você tem rebase de migrations como tarefa semanal.

**Como evitar:**
1. **Desabilitar auto-migrations no startup do app.** Migrations só devem ser aplicadas via comando explícito (`supabase db push` ou via CI).
2. **Pipeline de migrations centralizado:** apenas o GitHub Actions (ou um designated dev por semana) tem permissão para aplicar migrations no Supabase compartilhado. PRs com novas migrations passam por review e são aplicadas no merge para main.
3. **Convenção de timestamps:** migrations devem ter timestamps incrementais reais; quando dois devs criam migrations em paralelo em branches separadas, o segundo a fazer merge renomeia sua migration para um timestamp maior que o último merged.
4. **Schema-first review:** PRs que mudam schema requerem aprovação de pelo menos um outro dev e descrição obrigatória de "impacto no estado existente".
5. **Bloquear `db push` direto da máquina de dev** via git hook ou política — só CI aplica.
6. **Snapshot pré-migration:** o pipeline de CI deve fazer pg_dump antes de aplicar uma migration potencialmente destrutiva.

**Sinais de alerta:**
- Erros "relation already exists" no startup
- Schema do Supabase divergente do schema esperado pelo código de algum dev
- Migrations sendo aplicadas via SQL Editor da dashboard (bypassa o histórico de migrations e quebra `db push` futuro)
- Mais de uma pessoa rodando `supabase db push` por semana

**Fase para abordar:**
Fase 2 (Migration de Storage) e Fase 3 (Workflow de Equipe). Pipeline de CI é entregável da Fase 3.

---

### Armadilha 4: RLS configurada permissiva demais ou bloqueando o trabalho dos agentes

**O que dá errado:**
Cenário A (over-permissive): equipe tem pressa para fazer o app funcionar, escreve políticas `USING (true)` em tudo "porque somos só 5 devs internos". Resultado: qualquer usuário autenticado lê e modifica todo o estado de todo mundo, incluindo budgets, configs e tarefas. Um dev acidentalmente deleta tarefas de outro projeto. Pior: o token de qualquer dev na máquina dele dá acesso total — se um dev é comprometido (laptop perdido), tudo está exposto.

Cenário B (over-restrictive): equipe escreve RLS rigorosa baseada em `auth.uid()`, mas esquece que agentes rodam em background sem JWT do usuário, ou que o serviço de orchestrator precisa atualizar tarefas em nome de qualquer dev. Resultado: agentes não conseguem persistir progresso, queries voltam vazias silenciosamente, equipe começa a usar `service_role` em todo lugar para "fazer funcionar", anulando RLS.

Cenário C (performance): RLS habilitada com `user_id = auth.uid()`, mas user_id sem índice. Tabela de execuções de agente cresce para 100k linhas em uma semana de uso ativo, queries começam a timeout (50ms vira 5s vira timeout). Equipe culpa o Supabase, considera abandonar RLS.

**Por que acontece:**
RLS exige modelagem cuidadosa de "quem pode fazer o quê com quais dados", e em uma plataforma de orquestração de agentes onde o ator nem sempre é um humano (background jobs, agentes autônomos, schedulers), os papéis são confusos. Não há decisão clara de "agentes operam com qual identidade?" — a tentação é usar service_role, mas isso quebra qualquer auditoria. Performance de RLS é comumente negligenciada — `auth.uid()` é uma function call por linha avaliada, e sem índice em colunas de filtro, queries degradam não-linearmente com volume.

**Como evitar:**
1. **Modelar papéis explicitamente no schema antes de escrever política alguma:**
   - `human_user` (autenticado via Supabase Auth) — pode ler/modificar projetos de que participa
   - `agent_runner` (serviço backend) — usa service_role, mas SEMPRE registra `acting_on_behalf_of` em auditoria
   - `system` (jobs) — service_role, idem
2. **Política base:** habilitar RLS em TODAS as tabelas (nunca esquecer — verificar com query `SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false`).
3. **Sempre adicionar `TO authenticated`** explicitamente em políticas — nunca deixar como `public`.
4. **Sempre `WITH CHECK` em INSERT/UPDATE** — sem isso, usuários podem inserir registros com `user_id` de outros ou roubar ownership via UPDATE.
5. **Indexar todas as colunas usadas em RLS:** `CREATE INDEX ON tasks (user_id, project_id)` — performance degrada 100x sem isso em tabelas com 10k+ linhas.
6. **Wrap `auth.uid()` em subselect para caching:** `(select auth.uid())` em vez de `auth.uid()` direto — Postgres caches o resultado por query em vez de chamar por linha.
7. **Service_role apenas para operações claramente administrativas** (migrations, cleanup, agent execution backend) — nunca em código que processa input de usuário.
8. **Testar RLS via cliente autenticado, NÃO via SQL Editor** — SQL Editor roda como postgres superuser e bypassa RLS, dando falso senso de segurança.

**Sinais de alerta:**
- Tabelas com `rowsecurity = false` em produção
- Políticas com `USING (true)` ou `USING (auth.role() = 'authenticated')` sem filtro de ownership
- Queries que ficam progressivamente mais lentas conforme dados crescem
- Service_role usado em código que processa input de browser/usuário
- Logs mostrando consultas vazias inesperadas (sintoma silencioso de RLS bloqueando)

**Fase para abordar:**
Fase 2 (Schema + RLS). Auditoria de RLS deve ser entregável de cada fase que adiciona tabelas.

---

### Armadilha 5: Service_role key vazando para o cliente ou commitada no git

**O que dá errado:**
Algum dev, frustrado com RLS bloqueando uma query no frontend, copia o `service_role` key para o `.env.local` que vai para o Vite/Webpack. Boom: a key é embedded no bundle JS servido ao browser. Qualquer pessoa que abrir o devtools vê o key. Como o app é "rodado localmente por cada dev", o assunto não é trivial — pode ser que algum dev exponha o app dele (port forward, localtunnel, demo) sem perceber. Ou a key é commitada acidentalmente no `.env.example` que vai pro repo público.

Service_role bypassa TODA RLS. Quem tiver a key tem acesso completo ao Supabase compartilhado da equipe. Não há recuperação além de rotação imediata, e rotação requer atualizar todos os devs simultaneamente.

**Por que acontece:**
Diferença entre `anon` key (segura para client) e `service_role` (NUNCA cliente) não é óbvia para devs novos no Supabase. Frameworks como Next.js misturam SSR e CSR, criando ambiguidade sobre "este código roda no servidor ou cliente". Em uma equipe local-first onde "tudo roda na minha máquina", a fronteira servidor/cliente é nebulosa.

**Como evitar:**
1. **Convenção de nomenclatura estrita:** variáveis com `SUPABASE_SERVICE_ROLE_KEY` NUNCA prefixadas com `VITE_`, `NEXT_PUBLIC_`, `REACT_APP_` ou similar. Se o framework expõe variáveis com prefixo ao cliente, service_role nunca terá esse prefixo.
2. **Pre-commit hook que falha** se detectar string com formato de service_role key em arquivos não-gitignored. (Service_role key tem prefixo `eyJ...` específico do JWT; pode ser detectado por regex contra a estrutura do projeto.)
3. **`.gitignore` agressivo:** todos os `.env*` exceto `.env.example` (que SÓ contém placeholders, nunca values reais).
4. **Uso de service_role isolado:** apenas em código backend explicitamente marcado (`/server/`, `/api/`), com lint rule que proíbe import de service_role client em qualquer arquivo do frontend.
5. **Rotação periódica:** mesmo sem incidente, rotacionar service_role key trimestralmente — força a equipe a manter o canal de distribuição funcional.
6. **Distribuição via 1Password/secret manager**, não Slack ou wiki — devs novos pegam acesso após onboarding.
7. **Auditoria mensal** dos logs do Supabase (`auth.audit_log_entries`) procurando por padrões anômalos.

**Sinais de alerta:**
- Service_role key aparecendo em qualquer arquivo committed
- Variáveis com nome contendo "service" e "VITE_/NEXT_PUBLIC_/PUBLIC_" simultaneamente
- Bundle de produção contendo string `eyJ...` em chunks de cliente
- Logs do Supabase mostrando service_role calls vindo de IPs não-conhecidos

**Fase para abordar:**
Fase 1 (Setup) — gitignore + pre-commit hook desde o dia zero.

---

### Armadilha 6: Race condition na troca de conta Claude Code mid-execution

**O que dá errado:**
Agente está executando uma tarefa long-running. Token da conta A esgota a 75% do trabalho. Sistema detecta, decide trocar para conta B, mas:
- A request HTTP em vôo da conta A termina depois da troca, escrevendo resultado no estado com o `account_id = A`
- A próxima request da conta B começa antes da anterior commitar
- Estado intermediário do agente (variáveis, contexto, history de tool calls) está parcialmente atualizado por A e parcialmente por B
- Resultado: agente "alucina" continuidade que não existe, ou repete trabalho, ou pula etapas

**Por que acontece:**
Troca de credencial mid-flight é fundamentalmente uma operação distribuída — há um período onde duas identidades estão ativas no sistema. Sem barreira explícita (drain + checkpoint + resume), você tem read-modify-write races. Pior: o paperclip foi projetado pensando em "uma identidade por agent runtime" provavelmente; injetar troca dinâmica viola assumptions internas.

**Como evitar:**
1. **Modelo de checkpoint atômico:** estado do agente persiste a cada "passo lógico" (tool call boundary, não character boundary). Troca de conta só pode ocorrer em boundary, nunca durante uma chamada em vôo.
2. **Pattern: drain → checkpoint → swap → resume**
   - Detector de exhaustão sinaliza "vou trocar"
   - Sistema espera in-flight requests da conta atual completarem (timeout configurável)
   - Snapshot do estado completo é persistido (incluindo conversation history, tool call history, working memory, file edits pending)
   - Account context é trocado atomicamente (única transação SQL)
   - Próxima request usa nova conta, lendo state do snapshot
3. **Idempotência de tool calls:** garantir que tool calls têm IDs únicos e são deduplicáveis — se uma chamada da conta A acabou de executar mas o resultado não foi persistido antes do swap, não pode duplicar.
4. **Lock pessimista por agent_run:** apenas uma conta pode estar "ativa" para um agent_run específico em qualquer momento. Implementar via `pg_advisory_xact_lock` ou coluna `active_account_id` com constraint.
5. **Audit log obrigatório:** cada operação registra `account_id, run_id, step_id, timestamp` — base para debugging quando algo dá errado.

**Sinais de alerta:**
- Logs mostrando `account_id` mudando dentro de um único `step_id`
- Tool calls duplicadas com timestamps próximos
- Agentes "esquecendo" estado depois de swap (sintoma de checkpoint incompleto)
- Cost attribution não fechando: soma por conta ≠ total do run

**Fase para abordar:**
Fase 4 (Multi-Conta) — design do mecanismo de swap deve ser feito antes de implementar detecção de exhaustão.

---

### Armadilha 7: Detecção falsa positiva de exhaustão — trocar conta antes de necessário

**O que dá errado:**
Sistema detecta um 429 do Claude Code e imediatamente troca de conta. Mas 429s podem ocorrer por: (a) rate limit de RPM atingido temporariamente (espera 60s e funciona), (b) rate limit por minuto de tokens (transient), (c) quota da janela de 5h esgotada (real exhaustão), (d) rate limit do tier de organização inteira. Trocar conta no caso (a) ou (b) queima tokens da nova conta sem necessidade — em uma equipe com várias contas, isso significa esgotar todas as contas em horas em vez de horas distribuídas.

Pior: issue do Claude Code (#41788) reporta que rate limits foram exauridos em ~70 minutos de janela de 5h em algumas instâncias, e (#22876) reporta 429s mesmo com quota disponível na dashboard. Lógica simples "vi 429 → trocar" leva a comportamento errático.

**Por que acontece:**
A API do Claude Code retorna 429 com `retry-after` header e mensagem específica indicando qual limite foi atingido — mas devs frequentemente ignoram esses sinais e tratam todo 429 igual. Headers `requests-remaining` e `tokens-remaining` permitem detecção pré-emptiva, mas requerem leitura ativa.

**Como evitar:**
1. **Parser de 429 que distingue:**
   - "Number of requests has exceeded your per-minute rate limit" → transient, esperar e retry com retry-after
   - "Number of request tokens has exceeded your daily rate limit" → exhaustão real, swap
   - "Anthropic's API is temporarily overloaded" → transient, exponential backoff sem swap
2. **Detecção pré-emptiva via headers:** monitorar `tokens-remaining` e `requests-remaining` em cada response. Quando `tokens-remaining < threshold` (e.g. 5% restante), iniciar swap proativo no próximo boundary, em vez de reativo no 429.
3. **Cooldown entre swaps:** após swap, não swap-back para a mesma conta por pelo menos a janela de reset (5h Claude Code). Sem isso, sistema oscila entre contas se ambas estão próximas do limite.
4. **Exponential backoff antes de swap:** primeiros N 429s tratados como transient (retry); só após confirmação por padrão (e.g. 3 falhas em 5min com mensagem de daily/quota), declarar exhaustão e swap.
5. **Honra `retry-after`:** se o header está presente e o valor é razoável (< janela), respeitar antes de qualquer ação. Apenas se retry-after sugere espera além da janela operacional, fazer swap.

**Sinais de alerta:**
- Múltiplos swaps em curto período de tempo
- Contas sendo "exauridas" em ordem rápida e ciclando
- Tasks demorando muito mais que o esperado (excesso de retries silenciosos)
- Cost dashboard mostrando spikes de uso em todas contas simultaneamente

**Fase para abordar:**
Fase 4 (Multi-Conta) — detector de exhaustão é módulo dedicado com testes específicos.

---

### Armadilha 8: Cost attribution e auditoria por conta perdidas no swap

**O que dá errado:**
Após meses de uso com swap entre contas, equipe quer saber: quanto cada conta gastou? quem (qual dev) usou mais cada conta? quais projetos consumiram mais tokens? Mas a tabela de `agent_runs` só armazena o `account_id` final do run — não o histórico de qual conta executou qual passo. Resultado: faturamento confuso, impossível atribuir custos, e quando uma conta passa do orçamento ninguém sabe por quê.

**Por que acontece:**
Pulo natural ao implementar swap é "atualizar o `account_id` da row" — mas isso destrói a história. Sem audit log explícito, atribuição de custo é perdida. Paperclip provavelmente já tem governança de budget — mas atribuição por conta é uma dimensão nova que não existe no modelo upstream.

**Como evitar:**
1. **Tabela `agent_step_executions`:** cada chamada de modelo gera uma row com `(run_id, step_id, account_id, input_tokens, output_tokens, cost_usd, started_at, completed_at)`. NUNCA atualizar — append-only.
2. **Vista materializada de cost por conta/projeto/dev:** atualizada periodicamente, fácil de consultar.
3. **Reconciliação periódica:** comparar custos calculados localmente vs. dashboard do Anthropic. Discrepância > 5% = bug em algum lugar.
4. **Budgets por conta + por projeto + por dev:** limites independentes, todos checados antes de cada step.
5. **Retenção:** logs de step nunca deletados (ou deletados após 1 ano com sumário agregado preservado).

**Sinais de alerta:**
- Pergunta "quanto custou tarefa X?" não tem resposta direta
- Soma de tokens por conta ≠ uso total do mês
- Dev recebendo bill maior que esperava sem explicação

**Fase para abordar:**
Fase 4 (Multi-Conta) — schema de auditoria projetado junto com schema de swap.

---

### Armadilha 9: Devs pisando uns nos dados dos outros sem isolation soft

**O que dá errado:**
5 devs no mesmo Supabase. Dev A está testando uma feature e cria um "projeto de teste". Dev B faz uma query de cleanup `DELETE FROM projects WHERE name LIKE '%test%'` e apaga o projeto de A. Dev C está rodando um agente que iteragem sobre todos os projetos da equipe e altera estado em um projeto de produção que A estava usando. Dev D adiciona um trigger via SQL Editor que afeta operações de todos.

Worse: agentes rodam em background. Dev E sai para o almoço e o agente dele continua rodando, modificando estado que outro dev está observando ao vivo na UI. Confusão geral.

**Por que acontece:**
Decisão "Supabase isolado por dev — não, todos compartilham" no PROJECT.md elimina o isolamento natural. RLS pode ajudar, mas RLS é sobre identidade do usuário, não sobre "qual ambiente isso é". Sem convenção de "espaço de trabalho", o estado vira commons e tragédia ensue.

**Como evitar:**
1. **Conceito de "workspace" ou "environment" no schema:** cada projeto/agente/tarefa pertence a um workspace. Workspaces podem ser `dev:alice`, `dev:bob`, `shared`, `prod` (eventualmente).
2. **Default workspace por dev:** ao logar, dev opera em seu próprio workspace (`dev:<username>`) por padrão. Mudança explícita para `shared` requer ação consciente.
3. **RLS reforçando workspace boundary:** políticas SELECT/UPDATE/DELETE filtram por workspace, com policy adicional permitindo leitura de `shared` workspaces.
4. **Convenção de cleanup:** queries de DELETE ad-hoc só permitidas no próprio workspace; cleanup em `shared` requer PR + review.
5. **Visibilidade na UI:** sempre mostrar "you are in workspace X" no topo da UI, com cor distintiva. Mudança de workspace tem confirmação.
6. **Reset script per-dev:** `npm run reset-my-workspace` recria estado limpo do dev, sem afetar outros.

**Sinais de alerta:**
- Devs reportando "minha tarefa sumiu" ou "alguém mudou meu projeto"
- DELETEs ad-hoc no SQL Editor frequentes
- Lentidão na tabela de projetos por estar cheia de "test_*"
- Confusão sobre "isso é meu ou compartilhado?"

**Fase para abordar:**
Fase 3 (Workflow de Equipe) — workspace concept entra no schema desde o início.

---

### Armadilha 10: Sessão Supabase Auth expirando mid-agent-run

**O que dá errado:**
Dev autentica no app, inicia uma execução de agente que vai durar 4 horas. JWT do Supabase expira em 1 hora (default). Aos 60min, próxima query do agente recebe 401, agente quebra sem checkpoint adequado, dev volta do almoço e encontra trabalho perdido.

Variante: agente roda em background no servidor (não no browser do dev), usando JWT do dev que iniciou. Servidor não tem cookies, não tem `startAutoRefresh()`, JWT expira sem renovação. Mesmo problema.

**Por que acontece:**
Supabase Auth foi projetado para sessões interativas no browser, com refresh automático via cookies. Long-running background processes não fazem parte desse modelo natural. Dev típico assume "JWT vai durar minha sessão inteira" — falso.

**Como evitar:**
1. **Para frontend (dev na UI):** configurar `supabase-js` com `autoRefreshToken: true` (default) e `persistSession: true`. Para tabs em background, usar `worker: true` no Realtime client para evitar throttling.
2. **Para backend (agent runner):** NÃO usar JWT do dev. O serviço backend deve ter sua própria identidade (service_role key, ou um JWT de serviço com role customizada). Identidade do dev é registrada no audit log mas não usada para autorização SQL.
3. **Pattern: "agent runs as service, audited as user":** todas as tabelas de agent runs têm coluna `initiated_by_user_id`, mas as queries do agente usam service_role. Auditoria preserva quem iniciou.
4. **Health check no início de cada step:** se o step depende de credencial do usuário (raro mas possível), verificar token validity e refresh proativamente.
5. **Configurar JWT expiry mais longo se apropriado:** Supabase permite até 7 dias, mas trade-off é segurança. Para internal team tool, 24h é razoável (default 1h é conservador para uso interativo intenso).

**Sinais de alerta:**
- 401 errors em logs do servidor, especialmente em horas pares (ciclo de 1h)
- Agentes "morrendo" silenciosamente após 60-90min
- Devs reportando "preciso re-logar todo dia"
- Realtime connections caindo após mudança de tab

**Fase para abordar:**
Fase 2 (Auth + Storage) — separação de identidades user/service desde o design inicial.

---

### Armadilha 11: Latência de rede expondo padrões N+1 escondidos

**O que dá errado:**
Embedded Postgres tem latência sub-milissegundo. Código que faz 1000 queries em loop (N+1 clássico) executa em ~500ms — perceptível mas tolerável. Mesmo código contra Supabase remoto (latência 30-100ms RTT da máquina do dev no Brasil): 1000 queries × 50ms = 50 segundos. UI congela, agentes timeout, devs culpam o Supabase.

Cybertec PostgreSQL benchmarks mostram throughput cair 20x com 10ms de latência adicional. EnterpriseDB documenta o mesmo padrão.

**Por que acontece:**
Paperclip foi otimizado (ou não otimizado, mas tolerado) para o caso embedded. Padrões como "para cada agente, busque o orçamento", "para cada tarefa, busque o status do agente", "para cada step, busque o contexto" — todos viram queries individuais. ORMs (se em uso) com lazy loading agravam. Sem profiling de queries, problema fica invisível até o usuário sentir.

**Como evitar:**
1. **Audit do código upstream para N+1:** procurar por `forEach`/`for...of` contendo `await db.query(...)` ou similar. Documentar e priorizar fixes.
2. **Profiling obrigatório nas primeiras semanas:** Supabase tem `pg_stat_statements` habilitado — revisar top 50 queries por tempo total semanalmente.
3. **Batch query patterns:** `WHERE id IN (...)` em vez de loop; CTE recursiva quando aplicável; views materializadas para hierarquias frequentes.
4. **DataLoader pattern:** se app é Node.js (é), usar DataLoader para coalescer queries em request boundary.
5. **Pipeline mode do node-postgres** para casos onde batch não é viável mas queries são independentes (envia múltiplas sem esperar round-trip individual).
6. **Cache local para dados raramente mutáveis:** config de projetos, definições de agentes — cache em memória com invalidação por Realtime.

**Sinais de alerta:**
- UI "carregando..." por mais de 2s em telas que tinham < 100ms localmente no fork original
- `pg_stat_statements` mostrando queries com `calls > 1000` em uma sessão única
- Devs reportando "Supabase está lento" (geralmente é N+1 no app)
- Operações de agente que duravam minutos agora duram horas

**Fase para abordar:**
Fase 2 (Migration de Storage) — profiling de queries é entregável da fase de validação.

---

### Armadilha 12: Realtime websocket dropping em background tabs (devs com tab inativa)

**O que dá errado:**
Dev abre dashboard do paperclip, inicia agente, troca para outra aba para esperar. Browser throttle a aba de background, heartbeats do Supabase Realtime falham, websocket cai. Dev volta para a aba 30min depois — UI mostra estado de 30min atrás. Pior: dev pensa que algo travou e força refresh, perdendo estado local.

GitHub issue #121 do realtime-js documenta exatamente esse problema. Solução é não-trivial.

**Por que acontece:**
Browsers (Chrome especialmente) throttlam timers em tabs inativas para economizar bateria. Heartbeat de websocket é um timer. Sem heartbeat, server desconecta. Reconnection automática existe mas tem buracos.

**Como evitar:**
1. **`worker: true` no Realtime client** — heartbeat roda em Web Worker, não throttled.
2. **`heartbeatCallback`** para detectar disconexão e força reconnect.
3. **Replay de estado on reconnect:** ao reconectar, app re-busca estado completo, não confia em delta.
4. **Indicador visual de conexão:** UI mostra "live" / "reconnecting" / "stale" claramente.
5. **Polling de fallback:** se websocket está flaky, polling a cada 30s como backup.

**Sinais de alerta:**
- Dev reporta "UI travou" mas refresh resolve
- Realtime subscriptions silenciosamente perdendo eventos
- Estado divergente entre devs olhando a mesma view

**Fase para abordar:**
Fase 3 (Workflow de Equipe) — UX de conexão é parte do MVP.

---

## Padrões de Dívida Técnica

| Atalho | Benefício Imediato | Custo a Longo Prazo | Quando É Aceitável |
|--------|--------------------|---------------------|--------------------|
| Service_role no frontend pra "fazer funcionar" RLS difícil | Desbloqueia trabalho em horas | Acesso total exposto, rotação dolorosa, audit perdida | NUNCA |
| Auto-migrations no startup do app | Setup de dev "zero-config" | Conflitos entre devs, migration aplicadas sem review | Apenas em DB local privado por dev (não compartilhado) |
| `USING (true)` em RLS para "depois melhorar" | Time-to-feature alto | Modelo de segurança nunca é revisado, vira default permanente | Apenas em tabelas com dados não-sensíveis e plano de fix com data |
| Trocar conta Claude Code em qualquer 429 | Implementação simples | Contas exauridas em cascata, desperdício de tokens em transients | Nunca como única estratégia — sempre com classifier de erro |
| Hardcoding `dev:<nome>` workspaces no código | Rapidez | Onboarding de novo dev requer code change | Apenas para os 2-3 devs iniciais durante bootstrap |
| Pular cerimônia de fork-cut | Não atrasa Day 1 | Drift painful em 3+ meses, decisões ad-hoc semanais | Nunca |
| Migrations aplicadas via SQL Editor da dashboard | "Rapidinho" | Quebra histórico, `db push` falha depois | Nunca em ambiente compartilhado |
| Single account Claude Code no MVP | Reduz complexidade da Fase 4 | Bloqueia equipe quando tokens esgotam | Aceitável apenas como Fase 3 prévia, não como solução final |
| Não persistir estado de agente entre steps | Implementação mais simples | Swap de conta perde trabalho, debugging impossível | Nunca para agentes long-running |

---

## Armadilhas de Integração

| Integração | Erro Comum | Abordagem Correta |
|------------|------------|-------------------|
| Supabase Postgres (Supavisor transaction mode) | Manter prepared statement caching do node-postgres ativo | `statement_cache_size: 0`, ou usar session mode (5432) se app usa session features |
| Supabase Auth | Usar JWT do user para queries de background jobs | Service-role para backend; `initiated_by_user_id` em audit |
| Supabase Realtime | Assumir que WS sobrevive tab background | `worker: true` + `heartbeatCallback` + replay on reconnect |
| Claude Code API | Tratar todo 429 como exhaustão | Parse mensagem; honrar `retry-after`; pre-empt via `tokens-remaining` |
| Anthropic billing | Atualizar `account_id` da row no swap | Append-only log de step executions |
| Supabase RLS | Testar políticas via SQL Editor | Testar via cliente autenticado com user real |
| Migrations Supabase | Aplicar via `supabase db push` da máquina de cada dev | Apenas via CI após PR review |
| Embedded Postgres → Supabase | Substituir só a connection string | Auditoria de LISTEN/NOTIFY/TEMP/PREPARED + driver config |

---

## Armadilhas de Performance

| Armadilha | Sintomas | Prevenção | Quando Quebra |
|-----------|----------|-----------|---------------|
| RLS policy sem index na coluna de filtro | Queries lentas escalando com row count | `CREATE INDEX ON tbl (user_id, project_id)` para todas FK usadas em RLS | ~10k rows |
| `auth.uid()` chamado por linha em vez de cached | CPU alta no Supabase, latência crescente | Wrap em `(select auth.uid())` para forçar initPlan caching | ~5k rows com policy complexa |
| N+1 queries herdadas do código embedded | UI travando, agente demorando 100x mais | Audit + DataLoader + batch queries | A partir do dia 1 com latência > 5ms |
| Pool de conexões saturado | "Max client connections reached" | Reduzir pool side-app + usar Supavisor; matar conexões idle | 5 devs × 20 conexões cada > limite Supabase free tier |
| Realtime subscription a tabelas grandes sem filter | Lag de eventos, custo alto | `eq()` filter + RLS-based filtering | Tabela > 100k rows com mudanças frequentes |
| Falta de `idle_in_transaction_session_timeout` | Conexões zumbis bloqueando recursos | `SET idle_in_transaction_session_timeout = '60s'` no role | Sob carga sustentada |
| Cache de prepared statements em transaction mode | Errors aleatórios "prepared statement does not exist" | Disable cache OU mude para session mode | Imediato |
| Step executions table sem partitioning | Queries de cost analytics ficam lentas | Particionar por mês após 100k rows | ~6 meses de uso |

---

## Erros de Segurança

| Erro | Risco | Prevenção |
|------|-------|-----------|
| Service_role key em variáveis VITE_/NEXT_PUBLIC_ | Acesso total ao DB exposto no bundle | Lint rule + pre-commit hook detectando padrão |
| RLS desabilitada em tabela após migration | Tabela exposta para qualquer authenticated user | Query CI: `SELECT * FROM pg_tables WHERE schemaname='public' AND rowsecurity=false` deve retornar 0 |
| INSERT/UPDATE policies sem `WITH CHECK` | Usuário inserindo com user_id de outro / roubo de ownership | Linting de policies; review obrigatório |
| Credenciais Claude Code commitadas em .env | Conta sequestrada, custo arbitrário | `.env` no gitignore + secret scanner pre-commit |
| Token JWT do user usado em backend para acesso a outros users' data | Vazamento horizontal | Backend usa service_role + audit explícito de `acting_on_behalf_of` |
| Magic links / password reset sem rate limit | Brute force account enumeration | Supabase Auth tem rate limit nativo — verificar habilitado |
| Logs persistindo prompts/responses com dados sensíveis | PII/credenciais em sistema de log | Sanitização explícita antes de log; retenção curta de raw payloads |
| Realtime subscription expondo todas as rows de uma tabela | Outro dev vê dados do projeto privado de outro | RLS aplicada também em Realtime (não esquecer) |
| Onboarding via Slack/wiki para credenciais | Histórico permanente de secrets | 1Password ou similar com expiry e revocation |

---

## Armadilhas de UX

| Armadilha | Impacto no Usuário | Melhor Abordagem |
|-----------|-------------------|------------------|
| Sem indicador de qual workspace o dev está | Apaga/edita dados errados | Banner persistente com cor distintiva por workspace |
| Sem feedback de troca de conta Claude Code | Dev não sabe por que agente "pulou" | Notificação clara: "Conta A esgotou, trocando para B em 5s" |
| Erro de rate limit mostrado como erro genérico | Dev faz refresh em loop, agrava o problema | Mensagem específica: "Aguardando reset em X minutos" + countdown |
| UI mostrando estado stale de Realtime drop | Dev acha que travou, força refresh, perde contexto local | Indicador "sincronizando..." e replay automático |
| Sessão Auth expirando sem warning | Dev perde trabalho ao 401 | Warning aos 5min restantes + refresh proativo silent |
| "Funcionou no laptop do João, não funciona no meu" | Onboarding doloroso | Setup script que valida tudo (env vars, DB connection, Auth, Claude API key) |
| Custo de execução só visível depois | Surpresa no fim do mês | Display de cost incremental durante execução, com alertas |
| Ações destrutivas sem confirmação cross-workspace | Dev apaga projeto de outro | Confirmação obrigatória se ação afeta workspace `shared` ou de outro dev |

---

## Checklist "Parece Pronto Mas Não Está"

- [ ] **Swap de conta:** Frequentemente falta checkpoint atômico — verificar que estado completo é persistido antes de troca, e que step boundary é respeitado
- [ ] **RLS em todas tabelas:** Frequentemente falta em tabelas adicionadas por migration tardia — verificar com query `pg_tables` em CI
- [ ] **Indexes em colunas de RLS:** Frequentemente faltam em FK adicionadas — verificar com `EXPLAIN ANALYZE` em queries top-50
- [ ] **JWT refresh em background:** Frequentemente falta em workers/cron — verificar com teste de session > 1h
- [ ] **Cleanup de service_role no frontend:** Frequentemente esquecido em código de debug — grep no bundle de produção
- [ ] **Audit log de step executions:** Frequentemente trunca dados pra "economizar storage" — verificar que cost attribution fecha
- [ ] **Detecção de exhaustão Claude Code:** Frequentemente trata todo 429 igual — verificar com testes de cada tipo de 429
- [ ] **Workspace isolation:** Frequentemente falta em queries de admin ou cleanup — verificar que dev não acessa workspace de outro sem ação explícita
- [ ] **Migrations bloqueadas em prod:** Frequentemente faltam alerts quando alguém roda `db push` localmente — verificar com hook
- [ ] **Realtime survival em background tab:** Frequentemente não testado — verificar com tab inativa por 30min
- [ ] **N+1 queries portados do upstream:** Frequentemente não detectados em testes locais (latência baixa) — profiling obrigatório com Supabase real
- [ ] **Pre-commit hook para secrets:** Frequentemente desabilitado por dev frustrado — verificar config no CI

---

## Estratégias de Recuperação

| Armadilha | Custo de Recuperação | Passos de Recuperação |
|-----------|----------------------|----------------------|
| Service_role key vazado | HIGH | (1) Rotacionar key no Supabase dashboard imediatamente; (2) atualizar todos os devs simultaneamente via 1Password; (3) auditar logs de service_role usage; (4) post-mortem |
| RLS over-permissive descoberto após uso | MEDIUM | (1) Bloquear acesso temporariamente; (2) snapshot do estado atual; (3) política nova + testes; (4) rollout gradual; (5) audit de dados acessados indevidamente |
| Migration destrutiva aplicada | HIGH | (1) `pg_dump` mais recente; (2) restore em projeto novo; (3) re-aplicar migrations selecionadas; (4) re-point app; (5) post-mortem de pipeline |
| Estado de agente corrompido por race de swap | MEDIUM | (1) Identificar runs afetados por timestamp; (2) marcar como `failed_swap`; (3) re-iniciar do último checkpoint válido; (4) audit log para entender extensão |
| Conta Claude Code banida por uso anômalo | HIGH | (1) Desabilitar conta no roteamento; (2) suporte Anthropic; (3) reduzir paralelismo nas contas restantes; (4) revisar lógica de detecção |
| Devs perdendo trabalho por session expiry | LOW | (1) Aumentar JWT expiry; (2) implementar warning + refresh; (3) refatorar para service_role no backend |
| Drift do upstream tornando port impossível | HIGH | (1) Decisão: aceitar perda de fix vs. port manual; (2) se port: cherry-pick com adaptações; (3) testes regressão |
| Workspace shared corrompido por DELETE acidental | MEDIUM | (1) `pg_dump` semanal disponível? restore parcial; (2) caso contrário, reconstruir do log de eventos; (3) política mais estrita pós-incidente |

---

## Mapeamento de Armadilhas por Fase

| Armadilha | Fase de Prevenção | Verificação |
|-----------|-------------------|-------------|
| Drift de fork sem decisão de upstream | Fase 1 (Setup) | Remote `upstream` removido; `UPSTREAM_REFERENCE.md` existe |
| Swap embedded → Supabase com acoplamentos escondidos | Fase 2 (Storage Migration) | `MIGRATION_AUDIT.md` lista todos LISTEN/NOTIFY/TEMP/PREPARE |
| Auto-migrations conflitando entre devs | Fase 2 + Fase 3 | Auto-migration desabilitada; CI é único caminho de `db push` |
| RLS over-permissive ou bloqueante | Fase 2 (Schema + RLS) | Toda tabela tem `rowsecurity=true`; testes via cliente autenticado |
| Service_role vazando | Fase 1 (Setup) | Pre-commit hook + lint rule + 1Password distribution |
| Race condition no swap de conta | Fase 4 (Multi-Conta) | Drain → checkpoint → swap → resume implementado e testado |
| Detecção falsa de exhaustão | Fase 4 (Multi-Conta) | Classifier de 429 com testes específicos por tipo |
| Cost attribution perdida | Fase 4 (Multi-Conta) | `agent_step_executions` append-only; reconciliação com Anthropic |
| Devs pisando uns nos outros | Fase 3 (Workflow de Equipe) | Workspace concept no schema; UI mostra workspace ativo |
| Sessão Auth expirando mid-run | Fase 2 (Auth) | Backend usa service_role; user JWT só para UI |
| N+1 queries de embedded → remote | Fase 2 (Validação pós-migration) | `pg_stat_statements` review; profile de queries top-50 |
| Realtime drop em background tab | Fase 3 (UX) | `worker: true` + `heartbeatCallback` configurados |
| Migrations sem review | Fase 3 (CI/CD) | Pipeline GitHub Actions é único deployer; PR template para schema changes |
| Multi-projeto contention | Fase 5 (Multi-Projeto) | Quotas por projeto; isolation de step queues |
| Workspace cleanup destrutivo | Fase 3 (UX) | Confirmação obrigatória; `npm run reset-my-workspace` por dev |

---

## Fontes

- [Paperclip GitHub repo (paperclipai/paperclip)](https://github.com/paperclipai/paperclip) — confirmação de stack: Node.js + React + TypeScript + embedded Postgres
- [Paperclip homepage](https://paperclip.ing/) — features de atomic execution, persistent agent state, governance
- [Supabase Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) — Supavisor session vs transaction mode
- [Supavisor and Connection Terminology Explained](https://supabase.com/docs/guides/troubleshooting/supavisor-and-connection-terminology-explained-9pr_ZO) — limitações de transaction mode (sem prepared statements, LISTEN/NOTIFY, temp tables)
- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) — boas práticas de migration em equipe
- [Managing Environments | Supabase Docs](https://supabase.com/docs/guides/deployment/managing-environments) — golden rule "never change remote DB directly"
- [RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — index requirements, `(select auth.uid())` caching pattern
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — políticas, WITH CHECK, role configuration
- [Why Your Supabase Data Is Exposed (DEV)](https://dev.to/jordan_sterchele/why-your-supabase-data-is-exposed-and-you-dont-know-it-25fh) — erros comuns de RLS over-permissive
- [Use the Supabase Service Key to Bypass Row Level Security](https://egghead.io/lessons/supabase-use-the-supabase-service-key-to-bypass-row-level-security) — service_role bypassa toda RLS
- [How to Secure Your Supabase Service Role Key (Chat2DB)](https://chat2db.ai/resources/blog/secure-supabase-role-key) — proteção contra leak
- [User sessions | Supabase Docs](https://supabase.com/docs/guides/auth/sessions) — JWT expiry, refresh tokens, configuração de duration
- [Supabase Auth refreshSession reference](https://supabase.com/docs/reference/javascript/auth-refreshsession) — comportamento de refresh
- [Realtime: Handling Silent Disconnections](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794) — `worker: true`, heartbeatCallback
- [Realtime websocket loses connection in background tab (issue #121)](https://github.com/supabase/realtime-js/issues/121) — bug recorrente, soluções
- [Claude API Errors](https://platform.claude.com/docs/en/api/errors) — formato 429, request_id
- [Claude API Rate Limits](https://platform.claude.com/docs/en/api/rate-limits) — headers `requests-remaining`, `tokens-remaining`, retry-after
- [Claude Code Pro Max 5x Quota Exhausted (issue #45756)](https://github.com/anthropics/claude-code/issues/45756) — exhaustão real-world em ~70min de janela 5h
- [Claude Code Rate Limit Reached Guide (LaoZhang AI)](https://blog.laozhang.ai/en/posts/claude-code-rate-limit-reached) — estratégias de prevenção
- [Claude Code Token Drain Crisis (DevOps.com)](https://devops.com/claude-code-quota-limits-usage-problems/) — comportamento anômalo recente
- [Maciek-roboblog/Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) — monitoring tool, padrões de detecção
- [PostgreSQL Network Latency BIG difference (Cybertec)](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — 20x throughput drop com 10ms latency
- [N+1 Query Problem (Readyset)](https://readyset.io/blog/investigating-and-optimizing-over-querying) — patterns e soluções
- [Hard Forks on GitHub Study (CMU 2020)](https://cmustrudel.github.io/papers/zhou20forks.pdf) — research sobre divergência de forks
- [Lessons from maintaining a fork (DEV)](https://dev.to/bengreenberg/lessons-learned-from-maintaining-a-fork-48i8) — pitfalls de fork management
- [Multi-tenant migration challenges (Medium)](https://medium.com/@justhamade/data-isolation-and-sharding-architectures-for-multi-tenant-systems-20584ae2bc31) — shared schema vs schema-per-tenant tradeoffs

---
*Pesquisa de armadilhas para: Fork de Paperclip com Supabase compartilhado, multi-conta Claude Code, equipe local-first*
*Pesquisado: 2026-04-25*
