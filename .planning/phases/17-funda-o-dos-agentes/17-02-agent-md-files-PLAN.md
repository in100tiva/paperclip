---
phase: 17-funda-o-dos-agentes
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude/agents/orchestrator-maintenance.md
  - .claude/agents/research-doc.md
  - .claude/agents/code-analyzer.md
  - .claude/agents/qa-loop.md
  - .claude/agents/supabase-executor.md
  - .claude/agents/supabase-diagnostician.md
  - .claude/agents/doc-before-after.md
autonomous: true
requirements:
  - AGENT-01

must_haves:
  truths:
    - "Cada um dos 7 novos arquivos .md existe em .claude/agents/ com nome de arquivo idêntico ao slug do mapping (kebab-case)"
    - "Cada arquivo tem frontmatter YAML válido com campos obrigatórios: name, description, tools, color"
    - "O campo `name` em cada frontmatter coincide exatamente com o slug do arquivo (autoridade: slug do mapping em 17-01)"
    - "Cada arquivo tem corpo de 10-15 linhas descrevendo o papel em alto nível — comportamento detalhado fica adiado para fases 18-21"
    - "sync.ts consegue parsear cada arquivo via parseFrontmatter sem retornar frontmatter vazio (verificável via tsx + import)"
  artifacts:
    - path: ".claude/agents/orchestrator-maintenance.md"
      provides: "Arquivo de instrução mínimo para orchestrator-maintenance"
      contains: "name: orchestrator-maintenance"
      min_lines: 15
    - path: ".claude/agents/research-doc.md"
      provides: "Arquivo de instrução mínimo para research-doc"
      contains: "name: research-doc"
      min_lines: 15
    - path: ".claude/agents/code-analyzer.md"
      provides: "Arquivo de instrução mínimo para code-analyzer"
      contains: "name: code-analyzer"
      min_lines: 15
    - path: ".claude/agents/qa-loop.md"
      provides: "Arquivo de instrução mínimo para qa-loop"
      contains: "name: qa-loop"
      min_lines: 15
    - path: ".claude/agents/supabase-executor.md"
      provides: "Arquivo de instrução mínimo para supabase-executor"
      contains: "name: supabase-executor"
      min_lines: 15
    - path: ".claude/agents/supabase-diagnostician.md"
      provides: "Arquivo de instrução mínimo para supabase-diagnostician"
      contains: "name: supabase-diagnostician"
      min_lines: 15
    - path: ".claude/agents/doc-before-after.md"
      provides: "Arquivo de instrução mínimo para doc-before-after"
      contains: "name: doc-before-after"
      min_lines: 15
  key_links:
    - from: ".claude/agents/{slug}.md"
      to: "scripts/sync-agents/sync.ts (readAgentMarkdownFiles)"
      via: "parseFrontmatter extrai name + description + tools + color"
      pattern: "^name: [a-z][a-z0-9-]+$"
---

<objective>
Criar os 7 arquivos `.md` mínimos em `.claude/agents/` para os novos agentes do milestone v1.3, fornecendo o substrato que `pnpm sync-agents` (Plano 17-03) lê para criar os registros no Supabase. Frontmatter mínimo viável + corpo descritivo curto (10-15 linhas) — comportamento detalhado é deferido para as fases 18-21 conforme 17-CONTEXT.md `<deferred>`.

Purpose: O script `sync.ts` exige um arquivo `.md` por slug em `.claude/agents/` para resolver o slug a uma identidade de funcionário. Sem esses arquivos, o sync não tem fonte de descrição/tools para popular `agents.description`, `agents.tools` e o body que vira parte do `agents.metadata.framework_body`.

Output: 7 arquivos `.md` autocontidos seguindo o mesmo padrão dos 18 agentes v1.2 (frontmatter YAML + corpo prosa). Tools permissivas para esta fase (Read, Bash, Grep, Glob, Write, Edit) — refinamento de superfície de tool é trabalho das fases 18-21.
</objective>

<execution_context>
@./.claude/framework/workflows/execute-plan.md
@./.claude/framework/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/17-funda-o-dos-agentes/17-CONTEXT.md
@.planning/research/SUMMARY.md
@AGENTS-IMPORT.md
@.claude/agents/executor.md
@.claude/agents/verifier.md
@.claude/agents/planner.md

<format-spec>
NOTE: Os arquivos `.claude/agents/*.md` reais (criados por este plano) USAM `---` como delimitadores de frontmatter YAML. Para que o validador deste PLAN.md não confunda esses delimitadores embebidos com o frontmatter do próprio plano, abaixo as especificações de cada arquivo são descritas como pares chave/valor + corpo (sem fence markdown contendo `---`). O executor deve montar o arquivo final assim:

  Linha 1: o caractere `-` repetido 3 vezes
  Linhas 2..N: pares `chave: valor` listados em "Frontmatter fields"
  Linha N+1: o caractere `-` repetido 3 vezes
  Linha N+2: linha em branco
  Linhas seguintes: corpo em prosa estruturada conforme "Body template"

Convenção de frontmatter dos 18 arquivos .md existentes (extraída de planner.md, executor.md, verifier.md):

Frontmatter campos obrigatórios e ordem:
  name        kebab-case-slug   (IDENTICAL to filename without .md)
  description 1-2 sentenças descrevendo papel
  tools       lista separada por vírgula de ferramentas Claude Code
  color       nome de cor CSS distinta

Tools permissivos para fase 17 (refinamento na fase 18-21):
- "Read, Write, Edit, Bash, Grep, Glob" — agentes que escrevem arquivos
- "Read, Bash, Grep, Glob" — read-only (research-doc, code-analyzer, supabase-diagnostician)

Cores ocupadas pelos 18 agentes v1.2 (NÃO usar): yellow (executor), green (verifier, planner). Cores disponíveis para os 7 novos: blue, cyan, purple, orange, red, pink, gray (cada agente novo usa cor distinta, total = 7 cores diferentes).
</format-spec>

<body-template>
Padrão de corpo (10-15 linhas) — estrutura literal a aplicar em cada arquivo:

  <role>
  [1 frase: o que este agente faz no pipeline v1.3]
  </role>

  <scope>
  - [bullet 1: responsabilidade primária]
  - [bullet 2: limites do papel]
  - [bullet 3: o que NÃO faz]
  </scope>

  <note>
  Comportamento detalhado, protocolo de handoff e ferramentas MCP serão definidos na fase {18|19|20|21}.
  </note>
</body-template>

<assignment-table>
Atribuição (slug → cor → tools → fase futura para detalhes):

| slug | color | tools (mínimo) | role 1-liner | fase futura |
|------|-------|----------------|--------------|-------------|
| orchestrator-maintenance | blue | Read, Write, Edit, Bash, Grep, Glob | Coordena pipeline de manutenção paralela | 18 |
| research-doc | cyan | Read, Bash, Grep, Glob, WebFetch | Busca documentação oficial e repos GitHub em modo read-only | 19 |
| code-analyzer | purple | Read, Bash, Grep, Glob | Analisa código para encontrar falhas em modo read-only | 19 |
| qa-loop | orange | Read, Write, Edit, Bash, Grep, Glob | Executa pnpm test --coverage e mede gate 80% | 19 |
| supabase-executor | red | Read, Write, Edit, Bash, Grep, Glob | Realiza deploys Supabase via MCP + CLI com gate humano | 20 |
| supabase-diagnostician | pink | Read, Bash, Grep, Glob | Verifica schema version e logs pós-deploy em modo read-only | 20 |
| doc-before-after | gray | Read, Write, Edit, Bash, Grep, Glob | Documenta estado antes/depois de cada etapa do pipeline | 19 |
</assignment-table>
</context>

<tasks>

<task type="auto">
  <name>Tarefa 1: Criar arquivos .md para Engineering (4 agentes)</name>

  <read_first>
    - .claude/agents/executor.md (linhas 1-13 — referência de frontmatter Engineering Head)
    - .claude/agents/planner.md (linhas 1-12 — referência de frontmatter Architecture Head)
    - .planning/phases/17-funda-o-dos-agentes/17-CONTEXT.md (tabela canônica + decisão "conteúdo mínimo viável")
    - AGENTS-IMPORT.md (convenção de frontmatter + departamento Engineering)
  </read_first>

  <files>
    .claude/agents/orchestrator-maintenance.md,
    .claude/agents/research-doc.md,
    .claude/agents/code-analyzer.md,
    .claude/agents/supabase-executor.md
  </files>

  <action>
    Criar 4 arquivos via ferramenta Write (NUNCA usar `cat << 'EOF'` ou heredoc). Cada arquivo segue exatamente a estrutura: linha 1 abre frontmatter (3 hífens), linhas seguintes são pares chave/valor do frontmatter, linha de fechamento de frontmatter (3 hífens), linha em branco, depois o corpo conforme `<body-template>`.

    **Arquivo 1: `.claude/agents/orchestrator-maintenance.md`**

    Frontmatter (escrever literalmente entre dois delimitadores de 3 hífens):
      name: orchestrator-maintenance
      description: Coordena o pipeline de manutenção paralela in100tiva — cria child issues paralelas para pesquisadores, distribui correções com escopos disjuntos e checkpointing por etapa.
      tools: Read, Write, Edit, Bash, Grep, Glob
      color: blue

    Corpo (após linha em branco pós-frontmatter):

      <role>
      Orquestrador de manutenção da in100tiva. Coordena o pipeline v1.3 desde a entrada da issue até o handoff final, gerenciando paralelismo e estado intermediário.
      </role>

      <scope>
      - Cria child issues paralelas para Research-Doc e Code-Analyzer ao iniciar uma tarefa de manutenção.
      - Distribui correções com escopos de arquivo disjuntos para agentes de execução, prevenindo colisões de edição.
      - Mantém checkpoint do estado do pipeline em `issue_documents` após cada etapa para suportar retomada após swap de conta Claude.
      - NÃO executa código de produção, NÃO realiza pesquisa diretamente — delega.
      </scope>

      <note>
      Protocolo de handoff estruturado, criação de child issues, checkpointing detalhado e TTL para pesquisadores travados serão definidos na Fase 18 (HAND-01..04, ORCH-01..05).
      </note>

    **Arquivo 2: `.claude/agents/research-doc.md`**

    Frontmatter:
      name: research-doc
      description: Pesquisa documentação oficial e repos GitHub em modo estritamente read-only para informar correções do pipeline de manutenção.
      tools: Read, Bash, Grep, Glob, WebFetch
      color: cyan

    Corpo:

      <role>
      Pesquisador de documentação read-only. Executa em paralelo a Code-Analyzer como child issue do Orchestrator-Maintenance, fornecendo achados externos (docs oficiais, exemplos de repos, mudanças de API).
      </role>

      <scope>
      - Busca documentação oficial de bibliotecas e frameworks relevantes à issue corrente.
      - Consulta repos GitHub para padrões de uso e changelogs.
      - Modo estritamente read-only — NUNCA edita arquivos do repositório.
      - Emite findings via handoff estruturado para o orquestrador agregar.
      </scope>

      <note>
      Protocolo de handoff `pipeline-handoff` (campos `pipeline_stage`, `upstream_findings`, `decisions_made`, `artifacts_produced`, `qa_gate_status`), `parallelismPolicy: parallel` operacional e ferramentas MCP serão definidos na Fase 19 (PIPE-01, PIPE-03).
      </note>

    **Arquivo 3: `.claude/agents/code-analyzer.md`**

    Frontmatter:
      name: code-analyzer
      description: Analisa o código do repositório para identificar falhas, anti-padrões e pontos de quebra em modo estritamente read-only.
      tools: Read, Bash, Grep, Glob
      color: purple

    Corpo:

      <role>
      Analisador de código read-only. Executa em paralelo a Research-Doc como child issue do Orchestrator-Maintenance, mapeando falhas e dependências internas que motivam a manutenção.
      </role>

      <scope>
      - Lê código fonte para encontrar bugs, anti-padrões, conexões quebradas e cobertura de testes ausente.
      - Usa grep, AST inspection e análise estática manual.
      - Modo estritamente read-only — NUNCA edita arquivos.
      - Emite findings via handoff estruturado para o orquestrador agregar com saída de Research-Doc.
      </scope>

      <note>
      Protocolo de handoff, critérios de detecção e ferramentas de análise específicas serão definidos na Fase 19 (PIPE-02, PIPE-03).
      </note>

    **Arquivo 4: `.claude/agents/supabase-executor.md`**

    Frontmatter:
      name: supabase-executor
      description: Realiza deploys Supabase auditáveis via MCP e CLI, com aprovação humana obrigatória antes de qualquer operação destrutiva.
      tools: Read, Write, Edit, Bash, Grep, Glob
      color: red

    Corpo:

      <role>
      Executor de deploys Supabase. Aplica migrations e deploys de Edge Functions usando o MCP do Supabase como caminho preferencial, caindo para a CLI `supabase` quando o MCP não cobre a operação.
      </role>

      <scope>
      - Aplica migrations via `mcp__supabase__apply_migration` e ferramentas equivalentes.
      - Usa CLI `supabase functions deploy` quando MCP não cobre.
      - Obtém access token via `company_secrets` ou env var `SUPABASE_ACCESS_TOKEN` — NUNCA via comentário de issue.
      - Aguarda confirmação humana explícita (`checkpoint:human-action`) antes de qualquer deploy.
      </scope>

      <note>
      Skill `supabase-mcp` reutilizável, fluxo de approval gate detalhado e tratamento de access token serão definidos na Fase 20 (SUPA-01..04, SUPA-07).
      </note>

    Escrever os 4 arquivos via Write (cada um com `---` REAL na linha 1 e na linha de fechamento do frontmatter — o sync.ts depende deles para parsear). Após criar todos, executar comando de verificação.
  </action>

  <verify>
    <automated>cd /home/tech-lead/Documentos/DEV/paperclip-master && for f in orchestrator-maintenance research-doc code-analyzer supabase-executor; do path=".claude/agents/$f.md"; [ -f "$path" ] || { echo "MISSING $path"; exit 1; }; head -1 "$path" | grep -q "^---$" || { echo "BAD-FRONTMATTER $path"; exit 1; }; grep -q "^name: $f$" "$path" || { echo "NAME-MISMATCH $path"; exit 1; }; lines=$(wc -l < "$path"); [ "$lines" -ge 15 ] || { echo "TOO-SHORT $path lines=$lines"; exit 1; }; echo "OK $path lines=$lines"; done</automated>
  </verify>

  <acceptance_criteria>
    - 4 arquivos existem: `.claude/agents/orchestrator-maintenance.md`, `.claude/agents/research-doc.md`, `.claude/agents/code-analyzer.md`, `.claude/agents/supabase-executor.md`
    - Cada arquivo começa com 3 hífens (frontmatter aberto) na linha 1 — verificável via `head -1 "$path" | grep -q "^---$"`
    - Cada arquivo contém literalmente `name: <slug>` matching o filename — verificável via `grep -q "^name: <slug>$"`
    - Cada arquivo contém literalmente `tools: ` no frontmatter (linha começando com `tools: `)
    - Cada arquivo contém literalmente `color: ` no frontmatter
    - Cada arquivo tem ≥ 15 linhas (verificável via `wc -l`)
    - Cores distintas: blue/cyan/purple/red — `grep -h "^color: " .claude/agents/orchestrator-maintenance.md .claude/agents/research-doc.md .claude/agents/code-analyzer.md .claude/agents/supabase-executor.md | sort -u | wc -l` retorna 4
    - Cada arquivo contém menção literal a "Fase 18", "Fase 19" ou "Fase 20" na seção `<note>` indicando deferral
    - Commit criado com prefixo `feat(17-02): add Engineering agent .md files (4 of 7)`
  </acceptance_criteria>

  <done>
    4 arquivos `.md` criados, frontmatter parseável, slug=filename, corpo com role/scope/note, cores distintas.
  </done>
</task>

<task type="auto">
  <name>Tarefa 2: Criar arquivos .md para Quality + Analytics (3 agentes) e validar parse</name>

  <read_first>
    - .claude/agents/verifier.md (linhas 1-13 — referência de frontmatter Quality Head)
    - .claude/agents/user-profiler.md (linhas 1-13 — referência de frontmatter Analytics Head)
    - scripts/sync-agents/sync.ts (função `parseFrontmatter` linhas 60-85 — para entender o que o sync espera)
    - .planning/phases/17-funda-o-dos-agentes/17-CONTEXT.md
  </read_first>

  <files>
    .claude/agents/qa-loop.md,
    .claude/agents/supabase-diagnostician.md,
    .claude/agents/doc-before-after.md
  </files>

  <action>
    Criar 3 arquivos via ferramenta Write seguindo o mesmo template da Tarefa 1. Cada arquivo: linha 1 = 3 hífens, depois pares frontmatter, depois linha 3 hífens fechando, depois linha em branco, depois corpo. NUNCA usar `cat << 'EOF'` ou heredoc.

    **Arquivo 1: `.claude/agents/qa-loop.md`**

    Frontmatter:
      name: qa-loop
      description: Executa pnpm test --coverage em loop com gate objetivo de 80% e critério de parada explícito (máx 3 iterações), encerrando com PARTIAL_SUCCESS quando o gate não é atingido.
      tools: Read, Write, Edit, Bash, Grep, Glob
      color: orange

    Corpo:

      <role>
      Loop de QA com gate objetivo. Executa testes de cobertura e decide se a manutenção atingiu o limiar de qualidade ou precisa documentar débito técnico.
      </role>

      <scope>
      - Executa `pnpm test --coverage` e extrai o campo `Lines: X%` do relatório como único critério.
      - Se cobertura ≥ 80%, encerra com `APPROVED` no campo `qa_gate_status` do handoff.
      - Se < 80%, retorna tarefa para correção; após 3 iterações sem atingir, encerra com `PARTIAL_SUCCESS` e aciona Doc-Before-After.
      - Gate é estritamente objetivo — nenhuma avaliação subjetiva permitida.
      </scope>

      <note>
      Implementação do contador de iterações, integração com Tech-Debt-Documenter e parsing exato do output de coverage serão definidos na Fase 19 (PIPE-04, PIPE-05, PIPE-06).
      </note>

    **Arquivo 2: `.claude/agents/supabase-diagnostician.md`**

    Frontmatter:
      name: supabase-diagnostician
      description: Verifica schema version atual e logs pós-deploy do Supabase em modo estritamente read-only, reportando divergências ao orquestrador com dados concretos.
      tools: Read, Bash, Grep, Glob
      color: pink

    Corpo:

      <role>
      Diagnosticador Supabase read-only. Acionado on-demand após deploys do Supabase-Executor para verificar o estado pós-deploy sem efeitos colaterais.
      </role>

      <scope>
      - Verifica schema version atual em produção e compara com versão esperada.
      - Lê logs pós-deploy via MCP Supabase para detectar erros silenciosos.
      - Modo estritamente read-only — NUNCA escreve no banco, NUNCA aplica migrations.
      - Reporta divergências ao orquestrador com dados concretos (versão esperada vs encontrada).
      </scope>

      <note>
      Skill `supabase-mcp` compartilhada com Supabase-Executor e protocolo de detecção de divergência serão definidos na Fase 20 (SUPA-05, SUPA-06, SUPA-07).
      </note>

    **Arquivo 3: `.claude/agents/doc-before-after.md`**

    Frontmatter:
      name: doc-before-after
      description: Documenta o estado antes e depois de cada etapa do pipeline via issue_documents, criando trilha de auditoria para retrospectivas e fechamento de débito técnico.
      tools: Read, Write, Edit, Bash, Grep, Glob
      color: gray

    Corpo:

      <role>
      Documentador de estado antes/depois. Acionado pelo orquestrador (ou por QA-Loop em caso de PARTIAL_SUCCESS) para persistir snapshots por etapa do pipeline.
      </role>

      <scope>
      - Persiste documentos `state-before-{stage}` e `state-after-{stage}` em `issue_documents` para cada etapa do pipeline onde houve modificação.
      - Captura arquivos afetados, comandos executados e métricas de cobertura por etapa.
      - Suporta retomada do pipeline e auditoria pós-merge.
      - NÃO modifica código — apenas observa e documenta.
      </scope>

      <note>
      Schema exato de `state-before` / `state-after`, integração com QA-Loop em caso de débito técnico e formato de documento serão definidos na Fase 19 (PIPE-07).
      </note>

    Escrever os 3 arquivos via Write (cada um com `---` REAL nos delimitadores de frontmatter). Após criar todos, validar via tsx que `parseFrontmatter` consegue parsear cada um (smoke test do contrato de Plano 17-03).

    Comando de smoke test (replicar a lógica de `parseFrontmatter` de `scripts/sync-agents/sync.ts:60-85`):

      cd /home/tech-lead/Documentos/DEV/paperclip-master
      npx tsx -e '
        import { readFile } from "node:fs/promises";
        function parse(raw) {
          const n = raw.replace(/\r\n/g,"\n");
          if (!n.startsWith("---\n")) return { frontmatter: {}, body: n };
          const c = n.indexOf("\n---\n", 4);
          if (c < 0) return { frontmatter: {}, body: n };
          const fr = n.slice(4, c);
          const fm = {};
          for (const l of fr.split("\n")) {
            const t = l.trim();
            if (!t || t.startsWith("#")) continue;
            const i = t.indexOf(":");
            if (i < 0) continue;
            fm[t.slice(0, i).trim()] = t.slice(i + 1).trim();
          }
          return { frontmatter: fm, body: n.slice(c + 5) };
        }
        const slugs = ["orchestrator-maintenance","research-doc","code-analyzer","qa-loop","supabase-executor","supabase-diagnostician","doc-before-after"];
        for (const s of slugs) {
          const raw = await readFile(".claude/agents/" + s + ".md","utf8");
          const p = parse(raw);
          if (p.frontmatter.name !== s) { console.error("FAIL",s,"name=",p.frontmatter.name); process.exit(1); }
          if (!p.frontmatter.description || !p.frontmatter.tools || !p.frontmatter.color) { console.error("FAIL",s,"missing fields"); process.exit(1); }
          console.log("OK",s,"name=" + p.frontmatter.name,"tools=" + p.frontmatter.tools);
        }
      '
  </action>

  <verify>
    <automated>cd /home/tech-lead/Documentos/DEV/paperclip-master && for f in qa-loop supabase-diagnostician doc-before-after; do path=".claude/agents/$f.md"; [ -f "$path" ] || { echo "MISSING $path"; exit 1; }; head -1 "$path" | grep -q "^---$" || { echo "BAD-FRONTMATTER $path"; exit 1; }; grep -q "^name: $f$" "$path" || { echo "NAME-MISMATCH $path"; exit 1; }; lines=$(wc -l < "$path"); [ "$lines" -ge 15 ] || { echo "TOO-SHORT $path lines=$lines"; exit 1; }; echo "OK $path lines=$lines"; done && echo "--- parse smoke test ---" && npx tsx -e 'import { readFile } from "node:fs/promises"; function parse(raw){const n=raw.replace(/\r\n/g,"\n");if(!n.startsWith("---\n"))return{frontmatter:{},body:n};const c=n.indexOf("\n---\n",4);if(c<0)return{frontmatter:{},body:n};const fr=n.slice(4,c);const fm={};for(const l of fr.split("\n")){const t=l.trim();if(!t||t.startsWith("#"))continue;const i=t.indexOf(":");if(i<0)continue;fm[t.slice(0,i).trim()]=t.slice(i+1).trim();}return{frontmatter:fm,body:n.slice(c+5)};} const slugs=["orchestrator-maintenance","research-doc","code-analyzer","qa-loop","supabase-executor","supabase-diagnostician","doc-before-after"]; for(const s of slugs){const raw=await readFile(".claude/agents/"+s+".md","utf8");const p=parse(raw);if(p.frontmatter.name!==s){console.error("FAIL",s,"name=",p.frontmatter.name);process.exit(1);}if(!p.frontmatter.description||!p.frontmatter.tools||!p.frontmatter.color){console.error("FAIL",s,"missing fields");process.exit(1);}console.log("OK",s,"name="+p.frontmatter.name,"tools="+p.frontmatter.tools);}'</automated>
  </verify>

  <acceptance_criteria>
    - 3 arquivos novos existem: `.claude/agents/qa-loop.md`, `.claude/agents/supabase-diagnostician.md`, `.claude/agents/doc-before-after.md`
    - Total de novos arquivos da Fase 17 (Tarefa 1 + Tarefa 2): 7
    - Cada arquivo tem `name: <slug>` matching filename
    - Cada arquivo tem ≥ 15 linhas
    - Smoke test do parseFrontmatter (replicado da sync.ts linhas 60-85) imprime `OK <slug>` para todos os 7 slugs novos sem `FAIL`
    - 7 cores distintas em total entre os 7 novos arquivos: `cat .claude/agents/orchestrator-maintenance.md .claude/agents/research-doc.md .claude/agents/code-analyzer.md .claude/agents/qa-loop.md .claude/agents/supabase-executor.md .claude/agents/supabase-diagnostician.md .claude/agents/doc-before-after.md | grep "^color: " | sort -u | wc -l` retorna 7
    - Nenhum dos 18 arquivos v1.2 foi modificado: `git diff --name-only .claude/agents/ | grep -vE "(orchestrator-maintenance|research-doc|code-analyzer|qa-loop|supabase-executor|supabase-diagnostician|doc-before-after)\.md" | wc -l` retorna 0
    - Commit criado com prefixo `feat(17-02): add Quality+Analytics agent .md files (3 of 7)`
  </acceptance_criteria>

  <done>
    7 arquivos `.md` totais existem em `.claude/agents/`. parseFrontmatter (espelho da implementação real em sync.ts) retorna name/description/tools/color para cada um. Os 18 arquivos v1.2 estão intocados.
  </done>
</task>

</tasks>

<verification>
Após ambas as tarefas:

1. Inventário completo: `cd /home/tech-lead/Documentos/DEV/paperclip-master && ls .claude/agents/ | wc -l` deve retornar 25 (18 v1.2 + 7 v1.3).

2. Slugs novos presentes:
   for slug in orchestrator-maintenance research-doc code-analyzer qa-loop supabase-executor supabase-diagnostician doc-before-after; do
     [ -f ".claude/agents/$slug.md" ] && echo "OK $slug" || echo "MISSING $slug"
   done

3. Frontmatter parseável (espelho da lógica de sync.ts) — comando exato disponível na verificação automatizada da Tarefa 2.
</verification>

<success_criteria>
- 7 novos arquivos `.md` criados em `.claude/agents/` com nome de arquivo igual ao slug
- Cada frontmatter tem name + description + tools + color
- name no frontmatter = filename (sem extensão)
- Corpo de 10-15 linhas com `<role>`, `<scope>`, `<note>` deferindo comportamento detalhado às fases 18-21
- 7 cores distintas para diferenciar no org-chart UI
- 18 arquivos v1.2 NÃO modificados
- 2 commits atômicos (Engineering 4 + Quality/Analytics 3)
</success_criteria>

<output>
After completion, create `.planning/phases/17-funda-o-dos-agentes/17-02-SUMMARY.md`
</output>
