# Pesquisa de Armadilhas

**Domínio:** Adição de workflow de manutenção paralela a sistema de orquestração de agentes existente (Paperclip fork v1.3) — paralelismo de agentes, agentes Supabase MCP, handoff de contexto, QA em loop com gate 80%, integração Notion para débito técnico
**Pesquisado:** 2026-04-28
**Confiança:** HIGH para mecânicas internas do Paperclip (código lido diretamente), HIGH para padrões Supabase MCP (docs oficiais + código existente do projeto), MEDIUM para Notion integration (padrão de integração de terceiros via MCP)

> **Escopo desta versão:** armadilhas específicas para v1.3. Armadilhas de v1.0–v1.2 (RLS, prepared statements, fork drift, multi-conta Claude Code, Realtime WS) continuam documentadas no arquivo v1.2 de PITFALLS.md e permanecem válidas.

---

## Armadilhas Críticas

### Armadilha 1: Orquestrador aguardando resultado dos dois agentes paralelos sem timeout explícito

**O que dá errado:**
O orquestrador cria child issues para Research-Doc e Code-Analyzer, e então entra em poll/wait aguardando ambas concluírem antes de distribuir correções. Se um dos agentes travar (erro não-tratado, quota esgotada, lease expirado, processo do adapter morto sem sinalizar), o orquestrador fica indefinidamente em `in_progress` sem nunca distribuir trabalho. O pipeline inteiro para sem mensagem clara de causa.

**Por que acontece:**
Paperclip usa `issueRelations` com tipo `blocks` para modelar dependência entre issues. A lógica de `listQueuedRunDependencyReadiness` em `heartbeat.ts` (linha ~4438) respeita esse bloqueio — uma run não inicia se a issue que ela bloqueia ainda está aberta. Mas não há timeout nativo nessa dependência: se a issue bloqueante nunca fechar, a issue dependente nunca sai de `queued`. O orquestrador precisa implementar um mecanismo ativo de detecção de travamento — o sistema não vai fazer isso por ele.

**Como evitar:**
1. Ao criar as duas child issues de pesquisa paralela, o orquestrador deve criar também uma routine (ou heartbeat periódico em si mesmo) que verifica o status das duas child issues a cada N minutos.
2. Implementar um TTL explícito nas child issues de pesquisa: se Research-Doc ou Code-Analyzer não fecharem em X minutos, o orquestrador abre uma issue de escalação com contexto, e prossegue com os resultados parciais disponíveis (partial collection strategy).
3. Usar o campo `priority` e `parentIssueId` corretamente para que o Paperclip issue tree reflita a hierarquia — isso ativa o mecanismo de `issueTreeControlService` (pause hold guard) que o Paperclip já tem para gerenciar subtrees.
4. Documentar explicitamente na instrução do agente orquestrador que ele NÃO deve usar `in_progress` polling loop — deve usar child issues com dependência explícita.

**Sinais de alerta:**
- Issue do orquestrador mostrando `in_progress` por mais de 2× o tempo esperado de pesquisa
- Child issues de pesquisa em status `in_progress` sem atividade de comentário nos últimos 30 minutos
- Nenhuma issue de execução criada após as duas issues de pesquisa fecharem (orquestrador não acordou)
- Logs mostrando `listQueuedRunDependencyReadiness` retornando `isDependencyReady: false` repetidamente para o mesmo par

**Fase para abordar:**
Fase de criação do orquestrador central. O timeout e a partial-collection strategy devem estar na instrução do agente desde a primeira versão.

---

### Armadilha 2: Handoff de contexto sem schema forçado — agente receptor não sabe o que recebeu

**O que dá errado:**
Research-Doc produz um resultado rico em markdown. Code-Analyzer produz outro resultado. O orquestrador tenta sintetizá-los e passá-los para os agentes de execução. Mas cada agente descreve o handoff de forma diferente: um usa lista de bullets, outro usa seções markdown, outro inclui código inline. O agente receptor não sabe se está recebendo um handoff completo ou parcial, qual campo é o achado principal, qual é contexto secundário, e quais itens precisam de ação. Resultado: agentes de execução ignoram partes do contexto ou duplicam trabalho que já foi feito.

**Por que acontece:**
Paperclip não tem um tipo nativo de "handoff packet" — o contexto entre agentes flui via comentários de issue e via `issueContinuationSummaryDocument` (documento vivo atualizado a cada heartbeat de `issue-continuation-summary.ts`). Sem schema estruturado, o handoff é texto livre. Em um pipeline de manutenção onde o contexto é técnico e denso, texto livre garante perda de informação entre agentes.

**Como evitar:**
1. Definir um schema explícito de handoff no `AGENTS.md` de cada agente do pipeline. Exemplo mínimo:
   ```
   ## Formato de Handoff Obrigatório
   Todo agente deve terminar seu work com um comentário de issue contendo:
   - **STATUS**: COMPLETE | PARTIAL | BLOCKED
   - **ACHADOS**: (lista numerada de descobertas)
   - **ARTEFATOS**: (links para arquivos criados/modificados)
   - **PENDÊNCIAS**: (o que ficou incompleto e por quê)
   - **PRÓXIMO AGENTE**: (qual agente deve agir e qual é o input esperado)
   ```
2. O orquestrador deve verificar a presença desse schema antes de prosseguir — se o handoff está incompleto, solicitar complemento via comentário antes de distribuir.
3. Usar `issueDocuments` (work products) para artefatos persistentes que precisam sobreviver entre heartbeats, em vez de depender apenas de comentários.
4. Nunca depender da `issueContinuationSummary` como único veículo de handoff — ela é um sumário de continuação interno do agente, não um protocolo de comunicação entre agentes.

**Sinais de alerta:**
- Agentes de execução perguntando ao orquestrador "qual é o problema a corrigir?" depois de já ter recebido o handoff
- Comentários de handoff sem seção "PRÓXIMO AGENTE" ou "ACHADOS"
- Agente executor iniciando trabalho que contradiz o diagnóstico do Code-Analyzer
- Múltiplos agentes editando o mesmo arquivo sem coordenação (não há divisão de escopo no handoff)

**Fase para abordar:**
Fase de design do pipeline — schema de handoff deve ser entregável antes de criar os agentes, não depois.

---

### Armadilha 3: Supabase-Executor solicitando access token via issue comment em texto plano

**O que dá errado:**
O Supabase-Executor precisa do Supabase Management API access token para fazer deploys via MCP. O caminho mais natural é o agente pedir o token via comentário de issue ao humano ("Por favor, forneça o access token do Supabase"). O humano copia o token no comentário. O token fica persistido no histórico de comentários da issue — acessível a todos os agentes que leem aquela issue, indexado, potencialmente enviado para o contexto de LLM de outros agentes em heartbeats futuros, e persistido indefinidamente no Supabase.

**Por que acontece:**
Issues do Paperclip são o canal natural de comunicação humano↔agente. É o mecanismo que o sistema oferece para input humano. Agentes novatos no design de segurança vão instintivamente usar o que conhecem. O Management API token do Supabase dá acesso total a todos os projetos Supabase da conta — escopo de dano é máximo.

**Como evitar:**
1. **Nunca solicitar tokens via comentário de issue.** A instrução do agente deve ser explícita: "Nunca solicite credenciais sensíveis via comentário de issue."
2. **Mecanismo de entrega fora de banda:** o token deve ser injetado via variável de ambiente (`SUPABASE_ACCESS_TOKEN`) no `.env` local de cada dev, e o agente deve verificar se `process.env.SUPABASE_ACCESS_TOKEN` está disponível via tool call (ex: bash `echo $SUPABASE_ACCESS_TOKEN | wc -c` para verificar sem expor o valor).
3. **Usar `company_secrets` do Paperclip:** a plataforma tem um serviço de secrets (`server/src/services/secrets.ts`) com cifragem. O token pode ser armazenado como secret da company e injetado no ambiente do agente — esse é o canal seguro pretendido pelo sistema.
4. **Skill do Supabase MCP deve encapsular autenticação:** o skill deve verificar internamente se as credenciais estão disponíveis e falhar com mensagem "configure SUPABASE_ACCESS_TOKEN no .env" — nunca pedindo o token ao usuário via chat.
5. **Pre-commit hook:** o hook existente no projeto que detecta `eyJ...` (JWT format) deve ser estendido para detectar o formato do Supabase access token (que tem formato de personal access token da Supabase, não JWT).

**Sinais de alerta:**
- Comentário de issue contendo "sbp_", "eyJ" ou qualquer string longa de aparência de token
- Agente postando mensagem "Por favor, forneça seu token Supabase" ou similar
- Access token aparecendo em logs do servidor (heartbeat echo do contexto)
- Token sendo passado via `PAPERCLIP_*` env vars em vez do channel de secrets

**Fase para abordar:**
Fase de criação dos agentes Supabase. A verificação de credential delivery é pré-requisito para o primeiro heartbeat do Supabase-Executor.

---

### Armadilha 4: QA loop sem critério de parada — iteração infinita entre executor e QA

**O que dá errado:**
O agente de QA detecta falha, devolve para o executor. O executor corrige, entrega de volta ao QA. QA detecta nova falha (diferente ou a mesma). Executor corrige novamente. Esse ciclo pode se repetir indefinidamente sem atingir 80%. Pior: cada iteração consome tokens e budget. Após N ciclos, o budget do agente esgota, o pipeline travado não foi documentado no Notion (gate não foi atingido), e não há artefato útil para o developer humano entender o estado.

**Por que acontece:**
Gate de 80% é uma regra de negócio, não uma feature nativa do Paperclip. O sistema não tem conceito de "tentativa N de M" ou "o loop atingiu o limite de iterações". Sem isso explicitamente modelado na instrução do agente de QA (ou do orquestrador), o loop é tecnicamente ilimitado. Issues do Paperclip podem ficar indefinidamente em `in_progress`.

**Como evitar:**
1. **Contador de iterações obrigatório:** o agente de QA deve manter um contador explícito no trabalho product (via `issueDocuments` ou em comentário estruturado). A cada ciclo: `QA_ITERATION: N`. Após N=3 (ou valor configurável), o comportamento muda.
2. **Política de parada:** na instrução do QA — "Se após 3 iterações a taxa ainda está abaixo de 80%, marcar issue como `blocked`, criar issue de débito técnico no Notion com evidências das 3 iterações, e fechar o loop com status PARTIAL_SUCCESS."
3. **Débito técnico como saída legítima:** o gate de 80% não deve ser interpretado como "loop até atingir 100% ou não entregar". Sub-80% com documentação Notion é um resultado válido. A instrução deve deixar isso claro.
4. **Budget hard stop:** o orquestrador deve configurar um budget mensal específico para o ciclo de QA. Quando o budget atingir 70% do allocado para o ciclo, QA deve encerrar com status de débito.
5. **Timeout de wall clock:** além de iterações, limite de tempo real (ex: 2 horas). Após o limite, mesma política de débito.

**Sinais de alerta:**
- Issue em `in_progress` por mais de 4 horas sem transição para outro status
- Mais de 3 comentários com "QA_ITERATION" na mesma issue
- Budget de um agente consumido mais rápido que o esperado (sinal de loop)
- Nenhuma page Notion criada após ciclos longos (gate não foi honrado nem como saída de débito)

**Fase para abordar:**
Fase de criação do agente QA. O critério de parada é o único mecanismo que previne consumo infinito de budget.

---

### Armadilha 5: Agentes paralelos de execução editando os mesmos arquivos sem coordenação

**O que dá errado:**
O orquestrador distribui N correções para N agentes executores em paralelo. Dois agentes recebem tarefas que tocam no mesmo arquivo (`server/src/services/heartbeat.ts`, por exemplo). Ambos fazem checkout, um salva primeiro, o segundo salva por cima sem ver as mudanças do primeiro. O resultado é que uma das correções é perdida silenciosamente. Alternativa pior: ambos criam PRs concorrentes para o mesmo arquivo com mudanças conflitantes.

**Por que acontece:**
Paperclip foi projetado para agentes com escopo de trabalho diferente (CEO, CTO, coder, QA, ops) — em operação normal, a probabilidade de dois agentes editarem o mesmo arquivo no mesmo momento é baixa. No pipeline de manutenção, onde múltiplos executores trabalham em paralelo nas correções de um único issue, a sobreposição de escopo é muito mais provável, especialmente em arquivos centrais do sistema.

**Como evitar:**
1. **Distribuição de escopo no handoff:** o orquestrador deve dividir as correções por arquivo ou por módulo, garantindo que cada executor tem um conjunto de arquivos disjunto. Isso deve ser explícito no handoff do orquestrador para cada executor.
2. **Serialização para arquivos hot:** arquivos com alto índice de co-modificação (heartbeat.ts, agents.ts, schema) devem ser corrigidos em série, não em paralelo. Regra na instrução do orquestrador.
3. **Usar child issues com `blocks` relation:** executor B deve ter uma `blocks` relation para executor A quando há sobreposição de arquivo. O mecanismo de `listQueuedRunDependencyReadiness` do Paperclip vai garantir a ordem.
4. **Commits atômicos por scope:** cada executor deve trabalhar em branch separada (ex: `fix/maint-ISSUE-ID-scope-A`). O PR deve ser criado e revisado antes do próximo executor fazer merge.
5. **Verificação de conflito antes de merge:** na instrução do executor — "antes de criar PR, verificar se algum outro agente do mesmo pipeline criou PR tocando os mesmos arquivos".

**Sinais de alerta:**
- Dois PRs abertos simultaneamente com `diff` sobreposto em qualquer arquivo
- Merge conflicts em arquivos-chave que não tinham mudanças humanas recentes
- Um executor desfazendo silenciosamente a correção de outro (diff do arquivo após ambos mergearem mostra que uma correção sumiu)
- Revisão de PR apontando "esse código já foi corrigido em outro PR"

**Fase para abordar:**
Fase de design do orquestrador. A política de distribuição por escopo disjunto deve ser definida antes de criar os agentes executores.

---

### Armadilha 6: Supabase-Diagnostician consumindo a quota de Management API sem rate limiting

**O que dá errado:**
O Supabase-Diagnostician é instruído a "monitorar logs e verificar versões em produção". Sem frequência explícita, o agente pode fazer polling agressivo da Supabase Management API a cada heartbeat (por exemplo, a cada 30 segundos se configurado com timer heartbeat). A Supabase Management API tem rate limits (não documentados publicamente, mas observados empiricamente em ~600 requests/min por token). Um agente mal-configurado pode atingir esse limite, causando falhas em outras operações legítimas do Supabase-Executor que usa o mesmo access token.

**Por que acontece:**
Agentes com timer heartbeat habilitado tendem a fazer "tudo o que podem" a cada ciclo. Sem instrução explícita de frequência para operações externas, e sem mecanismo de rate limiting no Paperclip para chamadas a APIs externas, o agente vai fazer o máximo que conseguir por ciclo. O Supabase MCP não tem throttling embutido.

**Como evitar:**
1. **Frequência explícita na instrução:** "Consulte logs do Supabase no máximo 1 vez a cada 5 minutos. Cache o resultado internamente entre heartbeats via issueDocuments."
2. **Timer heartbeat longo:** se o Diagnostician precisa de timer heartbeat, usar `intervalSec` de no mínimo 300 (5 minutos), não o default.
3. **Separação de access tokens:** Executor e Diagnostician devem usar tokens diferentes se possível — um token de deploy (escopo amplo) e um token de leitura de logs (escopo restrito). Assim, rate limit de um não afeta o outro.
4. **Backoff no agente:** a instrução deve incluir — "Se receber erro 429 da Supabase Management API, aguardar pelo menos 60 segundos antes de tentar novamente e registrar o evento no issue".
5. **Desabilitar timer heartbeat por default:** o Diagnostician deve acordar on-demand (quando chamado pelo orquestrador), não em timer fixo. Só habilitar timer se houver caso de uso de monitoramento contínuo explicitamente aprovado.

**Sinais de alerta:**
- Logs do servidor mostrando 429 de `api.supabase.com` ou `supabase.io`
- Supabase-Executor falhando em deploys com erro de autenticação quando o token está correto
- Múltiplos heartbeats do Diagnostician em sequência rápida sem interação humana
- Cost dashboard mostrando heartbeats do Diagnostician a cada 30 segundos

**Fase para abordar:**
Fase de criação do Supabase-Diagnostician. Frequência e rate limit devem ser definidos antes de habilitar o agente.

---

### Armadilha 7: Gate de 80% sem definição mensurável de cobertura — gate se torna subjetivo

**O que dá errado:**
O agente de QA é instruído a "garantir gate de 80% antes de aprovar". Mas 80% de quê? Se for cobertura de testes Jest/Vitest, o agente precisa rodar `pnpm test --coverage` e ler o relatório. Se for "80% dos casos de teste manuais passando", é subjetivo. Se for "80% dos critérios de aceitação da issue", quem definiu esses critérios? Sem uma definição operacional, o QA vai ou interpretar de forma mais permissiva (qualquer 80% serve), ou travar sem saber como medir, ou usar um proxy errado (ex: "4 de 5 casos de uso funcionam" quando o caso que não funciona é o crítico).

**Por que acontece:**
"Gate de 80%" é uma regra de negócio que faz sentido semanticamente mas não tem correlação direta com nenhuma métrica de teste automatizada que o Paperclip surfaca nativamente. Sem mapeamento para um comando concreto e um número mensurável, o gate existe apenas na intenção.

**Como evitar:**
1. **Definir operacionalmente na instrução do QA:** "Gate de 80% = cobertura de testes Vitest reportada por `pnpm test --coverage` no escopo dos arquivos modificados. O relatório de coverage deve mostrar `Lines: ≥ 80%` ou `Statements: ≥ 80%` para cada arquivo tocado pelo pipeline de manutenção."
2. **Artefato de evidência obrigatório:** o agente QA deve incluir o output do coverage report (ou link para o artefato) como `issueWorkProducts` antes de declarar gate atingido.
3. **Critério de aceitação na issue mãe:** o orquestrador deve incluir um campo "Critério de gate" em cada issue de manutenção no momento da criação, com o tipo de medição e o threshold.
4. **Fallback para projetos sem testes:** se não há testes automatizados no módulo corrigido, o QA deve criar pelo menos um smoke test básico como parte do ciclo, e o gate mede a taxa de sucesso do smoke test.
5. **Gate ≠ 100% de cobertura:** a instrução deve ser explícita que 80% é o piso, não o alvo perfeito — para prevenir que o QA entre em loop perseguindo 100%.

**Sinais de alerta:**
- QA completando ciclos sem anexar output de coverage report
- Gate declarado "atingido" sem evidência no comentário
- Múltiplos ciclos QA→executor sem mudança observável na cobertura (QA está usando métrica errada)
- Coverage report mostrando < 80% e agente declarando gate atingido

**Fase para abordar:**
Fase de design do QA. A definição do gate deve ser entregável antes do primeiro ciclo de QA.

---

### Armadilha 8: Débito técnico no Notion com link quebrado no PR — gate nominal mas não rastreável

**O que dá errado:**
O agente de documentação cria uma page Notion registrando o débito técnico, obtém o URL, inclui no PR description como "Débito técnico: [link]". Três semanas depois, alguém quer revisar os débitos pendentes, mas: (a) a page Notion está em uma workspace errada ou foi movida, (b) o URL é de uma page privada e o dev que abriu o PR saiu da equipe, (c) a page existe mas contém apenas o título — o conteúdo real (impacto, critério de resolução, estimativa) não foi preenchido. O link existe, o gate nominal foi cumprido, mas o débito é irrastreável na prática.

**Por que acontece:**
O gate exige "documentado no Notion com link no PR". Isso é verificável mecanicamente (link está presente?), mas não cobre qualidade do conteúdo ou acessibilidade persistente. Agentes vão cumprir a letra do gate (criar page, incluir link) sem necessariamente garantir que a page seja utilizável meses depois.

**Como evitar:**
1. **Schema obrigatório da page de débito:** a instrução do agente de documentação deve incluir o template mínimo da page Notion:
   ```
   ## Débito Técnico: [descrição em uma linha]
   **Data:** [ISO date]
   **Pipeline:** [issue ID da manutenção]
   **Impacto atual:** [o que vai continuar quebrado/subótimo]
   **Critério de resolução:** [como saber que foi resolvido]
   **Estimativa de esforço:** [Low/Medium/High]
   **Arquivos afetados:** [lista]
   **Link para evidências:** [link para issue + coverage report]
   ```
2. **Parent page centralizada:** usar a estrutura `notion-config.json` do projeto (`.claude/notion-config.json`) que já define onde ficam pages do projeto. Débitos de manutenção devem ir para uma subpage específica (`tech-debt/`) sob a página do projeto, não em workspaces aleatórios.
3. **Verificação de acesso:** após criar a page, o agente deve verificar que o URL é público ou compartilhado com toda a equipe — não apenas acessível ao owner da integração.
4. **Database de débitos em vez de pages avulsas:** a longo prazo, usar um Notion Database (tabela) para débitos — permite filtrar, priorizar e rastrear status de resolução. Pages avulsas por débito não escalam.
5. **Verificação no PR:** o reviewer humano deve checar que o link Notion abre e tem conteúdo, não apenas que o link existe.

**Sinais de alerta:**
- Pages Notion de débito com apenas título e sem body
- Links de débito retornando 404 ou "Page not found"
- Débitos distribuídos em múltiplas workspaces Notion sem estrutura central
- PRs com mais de 3 débitos em links Notion sem nenhum revisado pelo humano

**Fase para abordar:**
Fase de criação do agente de documentação. O schema e a estrutura de destino devem ser configurados antes do primeiro PR com débito.

---

### Armadilha 9: Agentes de pesquisa paralela (Research-Doc + Code-Analyzer) lendo o mesmo repo simultaneamente e causando contention

**O que dá errado:**
Research-Doc acessa docs oficiais via WebFetch/Context7 (externo, sem problema). Code-Analyzer acessa o repo local para análise de código. Mas no pipeline de manutenção real, se a análise de código inclui executar linters, type-check ou testes para entender os erros, dois agentes podem invocar `pnpm` no mesmo diretório de trabalho simultaneamente. Processos do pnpm lockfile disputam acesso a `node_modules`. Um dos agentes pode crashar o processo do outro, ou ambos ficam degradados esperando lock do filesystem.

**Por que acontece:**
Paperclip tem o conceito de `executionWorkspace` com modos `shared` (mesmo cwd para múltiplos agentes) e `isolated` (cwd separado por agente). Em `shared` mode, dois agentes podem usar o mesmo diretório de trabalho simultaneamente. Se as instruções não especificam que Code-Analyzer deve apenas ler (não executar builds), o agente pode invocar processos que conflitam.

**Como evitar:**
1. **Separação de modo de execução:** Research-Doc deve ser configurado com `executionWorkspace.mode = shared` (lê apenas). Code-Analyzer deve usar `executionWorkspace.mode = isolated` com um clone ou symlink para análise, ou ser explicitamente instruído a realizar apenas leituras (`Read` tool, `grep`, `find`) sem invocar `pnpm`, `npm`, `tsc` ou similar.
2. **Instrução explícita de "read-only analysis":** "Durante a fase de análise, você não deve modificar arquivos, instalar dependências ou executar builds. Use apenas leitura de arquivos e busca de padrões."
3. **Sequencializar operações de build:** qualquer execução de testes ou type-check deve acontecer apenas na fase de QA, não na fase de pesquisa/diagnóstico.
4. **Advisory lock via Paperclip:** o sistema tem `agent-start-lock.ts` que serializa starts por agentId. Mas isso não cobre dois agentes diferentes. Para operações de escrita no filesystem, usar um lock externo (arquivo `.lock` ou via `pg_advisory_xact_lock`) se for estritamente necessário executar em paralelo.

**Sinais de alerta:**
- Erros "EBUSY" ou "ELOCKED" nos logs do adapter
- `pnpm install` abortando com "Another install is already in progress"
- Type-check (tsc) retornando resultados erráticos dependendo da ordem de invocação
- Dois heartbeat runs mostrando o mesmo PID de processo filho

**Fase para abordar:**
Fase de criação dos agentes de pesquisa. O modo de workspace deve ser configurado na criação do agente, não depois.

---

### Armadilha 10: Agente orquestrador como single point of failure — todo o pipeline para se ele travar

**O que dá errado:**
O orquestrador distribui trabalho, coleta resultados, decide próxima ação. Mas o próprio orquestrador é um agente Paperclip com heartbeat, quota de Claude Code, e budget. Se o orquestrador atingir quota no meio de um pipeline (por exemplo, enquanto sintetiza os resultados de pesquisa que são documentos longos), o pipeline para. Os agentes executores ficam com issues atribuídas mas sem instrução de handoff completa. Os agentes de QA não sabem o que revisar. O pipeline fica em estado parcialmente executado sem caminho claro de retomada.

**Por que acontece:**
Em pipelines sequenciais simples, um agente que trava apenas atrasa sua própria issue. Em um pipeline de orquestração onde um agente central coordena N outros, o travamento do orquestrador propaga para todos os N. O Paperclip tem mecanismo de account swap (v1.2) que pode retomar o orquestrador — mas apenas se o `contextSnapshot` foi salvo corretamente antes do travamento.

**Como evitar:**
1. **Checkpointing explícito do estado do pipeline:** o orquestrador deve manter um documento de estado do pipeline (via `issueDocuments`) atualizado após cada etapa. O documento deve incluir: quais agentes foram invocados, quais concluíram, quais resultados foram recebidos, qual é a próxima ação. Em caso de swap de conta, o orquestrador retoma lendo esse documento.
2. **Budget conservador para o orquestrador:** o orquestrador processa documentos de resultado dos agentes de pesquisa (que podem ser longos). Allocar budget maior do que o que parece necessário — síntese de contexto longo é cara em tokens.
3. **Agentes de execução autocontidos:** cada agente executor deve ter instrução suficiente para trabalhar de forma autônoma, sem precisar de nova instrução do orquestrador. O handoff deve ser completo o suficiente para que o executor possa terminar mesmo que o orquestrador não responda.
4. **Não usar timer heartbeat no orquestrador:** o orquestrador deve acordar on-demand (quando child issues atualizam), não em timer. Timer heartbeats queimam context mesmo sem trabalho a fazer.
5. **Pipeline state como issue document:** usar `POST /api/issues/:issueId/documents` para persistir o estado do pipeline — isso garante que o estado sobrevive a swaps de conta e restarts de processo.

**Sinais de alerta:**
- Orquestrador em `in_progress` sem atividade de comentário por >1h
- Child issues de execução em `todo` sem comentário de handoff após orquestrador ter recebido resultados de pesquisa
- Agentes executores postando "aguardando instrução" sem resposta
- Budget do orquestrador consumido antes de distribuir todas as correções

**Fase para abordar:**
Fase de design do orquestrador. O esquema de checkpointing deve ser projetado antes da implementação.

---

## Padrões de Dívida Técnica

| Atalho | Benefício Imediato | Custo a Longo Prazo | Quando É Aceitável |
|--------|--------------------|---------------------|--------------------|
| Handoff via comentário de texto livre sem schema | Implementação imediata sem design de contrato | Perdas de contexto entre agentes, debugging impossível | Nunca em pipelines com 3+ agentes |
| Access token Supabase em variável de ambiente não-gerenciada | Setup rápido | Token rotacionado manualmente por todos os devs, sem rastreabilidade, risk de commit acidental | Apenas para desenvolvimento local com .env no .gitignore absoluto |
| Gate de 80% avaliado subjetivamente pelo agente QA | Sem overhead de definição | Gate se torna nominal, débito técnico acumula silenciosamente | Nunca — definição operacional é obrigatória |
| Orquestrador sem checkpointing de estado do pipeline | Menos complexidade de implementação | Pipeline irrecuperável após swap de conta do orquestrador | Nunca para pipelines com mais de 2 etapas |
| Timer heartbeat padrão no Diagnostician | Monitoramento "sempre ligado" | Quota consumida sem utilidade, rate limit da Management API do Supabase | Apenas se houver alerta ativo de produção — desligar quando incidente resolve |
| Criar page Notion por débito sem database central | Cada débito tem sua page | Débitos sem visibilidade agregada, impossível priorizar ou rastrear resolução | Apenas como MVP — database deve vir na iteração seguinte |
| Agentes executores em escopo de arquivo livre (sem divisão) | Sem overhead de coordenação de escopo | Conflitos de edição em arquivos-chave, trabalho sobrescrito | Nunca quando mais de 1 executor trabalha em paralelo |

---

## Armadilhas de Integração

| Integração | Erro Comum | Abordagem Correta |
|------------|------------|-------------------|
| Supabase Management API (via MCP) | Usar o mesmo access token para Executor e Diagnostician | Tokens separados com escopos diferentes: um para deploy (write), um para logs (read) |
| Supabase MCP para deploys | Pedir access token ao humano via comentário de issue | Injetar via `company_secrets` do Paperclip ou variável de ambiente gerenciada |
| Notion MCP | Criar pages em workspace errada ou sem estrutura | Usar `notion-config.json` do projeto que mapeia IDs e URLs de destino corretos |
| Notion MCP | Pages de débito sem schema forçado | Template de page com campos obrigatórios na instrução do agente de documentação |
| Paperclip `issueRelations` (blocks) | Não usar relação de bloqueio para dependências de pipeline | Modelar cada dependência inter-agente como `blocks` relation para aproveitar o mecanismo nativo de `listQueuedRunDependencyReadiness` |
| Paperclip `issueDocuments` | Usar apenas comentários para persistir estado de pipeline | State document via `POST /api/issues/:id/documents` para sobreviver a swaps de conta |
| Paperclip `executionWorkspace` | Dois agentes paralelos em shared workspace executando builds | Configurar Code-Analyzer em modo read-only ou isolated workspace |
| Claude Code (orquestrador) | Não estimar custo de síntese de contexto longo | Allocar budget 3× maior que o esperado para o orquestrador — contexto de resultados de pesquisa é denso |

---

## Armadilhas de Performance

| Armadilha | Sintomas | Prevenção | Quando Quebra |
|-----------|----------|-----------|---------------|
| Orquestrador recebendo outputs completos dos agentes de pesquisa no prompt | Context window overflow, degradação de qualidade de síntese | Agentes de pesquisa devem entregar sumário executivo (< 500 linhas) + link para artefatos completos | A partir de 2 rodadas de pesquisa com resultados densos |
| Supabase-Diagnostician fazendo polling a cada heartbeat | 429 da Management API, falhas do Executor no mesmo token | Frequência mínima de 5 minutos, resultado em cache via issueDocument | Imediatamente se timer heartbeat ≤ 60s |
| QA rodando suite completa de testes a cada iteração em vez de testes do escopo | Ciclo de QA 10× mais lento que necessário, burn de budget | Testar apenas arquivos modificados pelo pipeline com `--testPathPattern` ou `--changed` | Quando suite tem > 200 testes e ciclo excede budget de iteração |
| Issue do orquestrador acumulando 50+ comentários de handoff | Latência alta ao carregar contexto do issue, truncation no prompt | Usar issueDocuments para artefatos, comentários apenas para comunicação de status | A partir de ~30 comentários com conteúdo técnico denso |

---

## Erros de Segurança

| Erro | Risco | Prevenção |
|------|-------|-----------|
| Supabase access token em comentário de issue | Acesso total à conta Supabase em texto persistente, enviado para LLM de outros agentes | Nunca solicitar via issue; usar company_secrets ou .env gerenciado |
| Supabase-Executor com permissões de Management API em escopo de toda a conta | Um bug no agente pode destruir projetos Supabase fora do escopo da manutenção | Usar access token com escopo restrito ao projeto específico se a API suportar |
| Logs de output dos agentes persistindo valores de variáveis de ambiente | Secrets em activity log, heartbeat run events, issue comments | Sanitização explícita de `process.env.*` em logs de adapter; o projeto já tem `REDACTED_EVENT_VALUE` em `server/src/redaction.ts` — verificar que cobre o Executor |
| Agente de documentação escrevendo análise de falhas de segurança em pages Notion públicas | Vulnerabilidades expostas antes de patch | Pages de débito relacionadas a falhas de segurança devem ser privadas (só equipe); não usar Notion público |
| Instrução do orquestrador embarcando credenciais de acesso ao Notion | Token Notion em `adapterConfig.promptTemplate` commitado | Usar `desiredSkills` para o MCP do Notion, não hardcode em promptTemplate |

---

## Armadilhas de UX

| Armadilha | Impacto no Usuário | Melhor Abordagem |
|-----------|-------------------|------------------|
| Pipeline de 5+ agentes sem painel de status consolidado | Desenvolvedor não sabe em qual etapa está o pipeline, abre N issues para verificar | O orquestrador deve postar um "status update" periódico na issue mãe com o estado de cada agente |
| Debate técnico tomando o formato de débito no Notion em vez de decisão arquitetural | Developer volta ao Notion semanas depois e não entende por que o débito existe | Template de débito inclui campo "Contexto de decisão" explicando por que foi aceito |
| Gate de 80% passado, PR criado, link Notion incluído — mas developer não sabe se deve revisar | PR fica aberto sem ação humana esperada clara | Instrução dos agentes: ao criar PR com gate passado, sempre mencionar "@dev-name revisão de [escopo] esperada" |
| Agentes paralelos postando nos mesmos canais da plataforma simultaneamente | Feed de atividade do Paperclip poluído, desenvolvedor não consegue acompanhar | Definir horário de heartbeat diferente para cada agente paralelo (offset de 30s) para evitar flood simultâneo |

---

## Checklist "Parece Pronto Mas Não Está"

- [ ] **Pipeline paralelo:** frequentemente falta timeout em child issues — verificar que o orquestrador tem TTL definido para issues de pesquisa
- [ ] **Handoff de contexto:** frequentemente o schema existe na instrução mas não é validado pelo receptor — verificar que o orquestrador tem lógica de "schema check" antes de prosseguir
- [ ] **Supabase-Executor:** frequentemente o access token está disponível em `.env` mas o skill MCP não está configurado para usá-lo — verificar `desiredSkills` e que o MCP tem a variável mapeada
- [ ] **Gate de 80%:** frequentemente definido em texto mas não em comando concreto — verificar que a instrução do QA referencia um comando específico (`pnpm test --coverage`) e um campo específico do relatório
- [ ] **Notion link no PR:** frequentemente o link existe mas a page está vazia ou em workspace errada — revisor deve clicar no link antes de aprovar
- [ ] **Budget do orquestrador:** frequentemente estimado com base em uma rodada mas aumenta com contexto longo dos pesquisadores — verificar após primeira execução real e ajustar
- [ ] **Executores paralelos:** frequentemente testados um de cada vez mas não em paralelo real — verificar com dois executores ativos ao mesmo tempo que não há conflito de arquivo
- [ ] **Supabase-Diagnostician:** frequentemente habilitado com timer heartbeat curto "para teste" e nunca ajustado — verificar `intervalSec` antes de deixar rodando em produção
- [ ] **Agente de documentação:** frequentemente cria page no Notion mas no workspace pessoal do dev em vez da workspace da equipe — verificar `parent.page_id` no `notion-config.json`
- [ ] **Orquestrador sem checkpointing:** frequentemente o state document é planejado mas não implementado na primeira versão — verificar que o orquestrador faz `PUT /api/issues/:id/documents` após cada etapa do pipeline

---

## Estratégias de Recuperação

| Armadilha | Custo de Recuperação | Passos de Recuperação |
|-----------|----------------------|----------------------|
| Pipeline travado por child issue sem fechar | LOW | (1) Identificar qual agente travou; (2) fechar a issue manualmente com status `blocked`; (3) accordar o orquestrador via `paperclipai issue update`; (4) verificar se partial-collection strategy funciona corretamente |
| Access token Supabase exposto em comentário | HIGH | (1) Revogar o token no dashboard da Supabase imediatamente; (2) criar novo token com escopo mínimo; (3) atualizar todos os devs; (4) deletar o comentário da issue; (5) auditar se o token foi usado por outros endpoints nas últimas 24h |
| QA loop consumiu todo o budget antes do gate | MEDIUM | (1) Verificar qual iteração do QA consumiu mais tokens; (2) criar issue de débito manualmente no Notion com evidências do loop; (3) abrir PR parcial com mudanças aplicadas; (4) ajustar budget e critério de parada para próximo ciclo |
| Dois executores sobrescreveram mudança um do outro | MEDIUM | (1) Identificar o commit da primeira escrita e da segunda; (2) cherry-pick das mudanças do primeiro executor sobre o HEAD do segundo; (3) abrir PR de correção; (4) adicionar `blocks` relation para o próximo ciclo |
| Page Notion de débito inacessível (URL quebrado ou page privada) | LOW | (1) Criar nova page no destino correto; (2) atualizar descrição do PR com novo link; (3) configurar `notion-config.json` para prevenir recorrência |
| Orquestrador travado mid-pipeline (swap de conta) | MEDIUM | (1) Verificar state document do pipeline no `issueDocuments`; (2) se state document existe, o orquestrador retomará automaticamente após swap; (3) se não existe, identificar última etapa concluída via comentários e reiniciar manualmente a partir daí |

---

## Mapeamento de Armadilhas por Fase

| Armadilha | Fase de Prevenção | Verificação |
|-----------|-------------------|-------------|
| Orquestrador sem timeout em child issues | Fase de design do orquestrador | Instrução do agente tem TTL explícito para research issues |
| Handoff sem schema forçado | Fase de design do pipeline (antes de criar agentes) | Template de handoff documentado e referenciado em cada AGENTS.md |
| Supabase access token em issue comment | Fase de criação dos agentes Supabase | Instrução proíbe solicitação de credencial via issue; `company_secrets` configurado |
| QA loop infinito | Fase de criação do agente QA | Instrução tem critério de parada (N iterações + wall clock) |
| Executores paralelos sobrescrevendo arquivos | Fase de design do orquestrador | Política de distribuição por escopo disjunto na instrução do orquestrador |
| Diagnostician com polling agressivo | Fase de criação do Supabase-Diagnostician | `intervalSec` ≥ 300; timer heartbeat desabilitado por default |
| Gate de 80% sem definição operacional | Fase de design do QA | Instrução do QA referencia comando e campo mensurável específico |
| Débito Notion com link quebrado ou page vazia | Fase de criação do agente de documentação | Template de page com campos obrigatórios; estrutura de destino configurada |
| Agentes paralelos em conflito de filesystem | Fase de criação dos agentes de pesquisa | Code-Analyzer configurado em modo read-only ou isolated workspace |
| Orquestrador como single point of failure | Fase de design do orquestrador | State document de pipeline implementado; budget generoso alocado |
| Rate limit da Management API | Fase de criação do Supabase-Diagnostician | Tokens separados por função; frequência mínima documentada |
| Budget overflow no orquestrador por contexto longo | Fase de configuração dos agentes | Budget do orquestrador revisado após primeira execução real |

---

## Fontes

- Código-fonte do projeto: `server/src/services/heartbeat.ts` — mecânica de `listQueuedRunDependencyReadiness`, `maxConcurrentRuns`, `startNextQueuedRunForAgent`, `contextSnapshot`
- Código-fonte do projeto: `server/src/services/agent-start-lock.ts` — serialização de start por agentId (in-memory, não cross-agent)
- Código-fonte do projeto: `server/src/services/claude-accounts.ts` — padrão de swap de conta e `RotationOutcome`
- Código-fonte do projeto: `server/src/services/environment-run-orchestrator.ts` — lifecycle de lease e error codes de execução
- Código-fonte do projeto: `server/src/redaction.ts` — `REDACTED_EVENT_VALUE`, mecanismo de sanitização existente
- Código-fonte do projeto: `.claude/commands/setup-notion.md` — estrutura de destino Notion e `notion-config.json`
- Código-fonte do projeto: `skills/paperclip-create-agent/references/draft-review-checklist.md` — itens H (safety), G (governance), seção de heartbeat timer
- Código-fonte do projeto: `skills/paperclip-create-agent/references/baseline-role-guide.md` — anti-padrões de permission sprawl e secrets in adapter config
- Código-fonte do projeto: `skills/paperclip/references/routines.md` — `concurrencyPolicy`, `catchUpPolicy`, trigger API
- Código-fonte do projeto: `.planning/research/PITFALLS.md` (v1.0–v1.2) — armadilhas de Supabase, RLS, multi-conta (base existente, sem repetição)
- Código-fonte do projeto: `packages/adapters/claude-local/src/cli/quota-probe.ts` — verificação de OAuth access token local
- [Supabase Management API Rate Limits](https://supabase.com/docs/reference/api/introduction) — limites da API de gerenciamento (não publicados explicitamente, comportamento observado empiricamente)
- [Paperclip issue tree control](https://github.com/paperclipai/paperclip) — mecânica de pause hold e blocks relations

---
*Pesquisa de armadilhas para: Workflow de Manutenção Paralela (v1.3) — pipeline de orquestração, agentes Supabase MCP, handoff estruturado, QA loop, gate 80%, Notion*
*Pesquisado: 2026-04-28*
