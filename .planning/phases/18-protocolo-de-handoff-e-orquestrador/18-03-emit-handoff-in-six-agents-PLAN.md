---
phase: 18-protocolo-de-handoff-e-orquestrador
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude/agents/research-doc.md
  - .claude/agents/code-analyzer.md
  - .claude/agents/qa-loop.md
  - .claude/agents/supabase-executor.md
  - .claude/agents/supabase-diagnostician.md
  - .claude/agents/doc-before-after.md
autonomous: true
requirements:
  - HAND-02

must_haves:
  truths:
    - "Cada um dos 6 agentes (research-doc, code-analyzer, qa-loop, supabase-executor, supabase-diagnostician, doc-before-after) tem uma seção `## Handoff at completion` no corpo do system prompt"
    - "Cada seção referencia explicitamente `skills/paperclip/rules/handoff-protocol.md` como fonte canônica"
    - "Cada seção declara o `pipeline_stage` específico do agente (research, qa, deploy, diagnostic, documentation, etc.)"
    - "Cada seção declara o `qa_gate_status` típico do agente (n/a, PENDING, APPROVED, RETRY, PARTIAL_SUCCESS) ou regra para escolha"
    - "Frontmatter YAML existente de cada um dos 6 agentes é preservado verbatim (name, description, tools, color, parallelism_policy)"
  artifacts:
    - path: ".claude/agents/research-doc.md"
      provides: "research-doc com regra de handoff (pipeline_stage=research, qa_gate_status=n/a)"
      contains: "rules/handoff-protocol.md"
    - path: ".claude/agents/code-analyzer.md"
      provides: "code-analyzer com regra de handoff (pipeline_stage=research, qa_gate_status=n/a)"
      contains: "rules/handoff-protocol.md"
    - path: ".claude/agents/qa-loop.md"
      provides: "qa-loop com regra de handoff (pipeline_stage=qa, qa_gate_status=APPROVED|RETRY|PARTIAL_SUCCESS)"
      contains: "rules/handoff-protocol.md"
    - path: ".claude/agents/supabase-executor.md"
      provides: "supabase-executor com regra de handoff (pipeline_stage=deploy)"
      contains: "rules/handoff-protocol.md"
    - path: ".claude/agents/supabase-diagnostician.md"
      provides: "supabase-diagnostician com regra de handoff (pipeline_stage=diagnostic, qa_gate_status=n/a)"
      contains: "rules/handoff-protocol.md"
    - path: ".claude/agents/doc-before-after.md"
      provides: "doc-before-after com regra de handoff (pipeline_stage=documentation, qa_gate_status=n/a)"
      contains: "rules/handoff-protocol.md"
  key_links:
    - from: ".claude/agents/research-doc.md"
      to: ".claude/skills/paperclip/rules/handoff-protocol.md"
      via: "Referência textual ao caminho canônico da regra"
      pattern: "rules/handoff-protocol\\.md"
    - from: ".claude/agents/qa-loop.md"
      to: "qa_gate_status enum"
      via: "Mapeamento explícito de coverage → qa_gate_status (APPROVED|RETRY|PARTIAL_SUCCESS)"
      pattern: "APPROVED.*RETRY.*PARTIAL_SUCCESS|qa_gate_status"
---

<objective>
Adicionar uma seção curta `## Handoff at completion` ao corpo de cada um dos 6 agentes do pipeline (research-doc, code-analyzer, qa-loop, supabase-executor, supabase-diagnostician, doc-before-after). Cada seção referencia a regra canônica `skills/paperclip/rules/handoff-protocol.md` e declara o `pipeline_stage` e o `qa_gate_status` típico daquele agente — sem reescrever o comportamento detalhado dos agentes (que fica para Fases 19-20).

Purpose: HAND-02 exige que TODO agente do pipeline emita handoff estruturado. Sem esta seção em cada arquivo, agentes não saberão emitir o handoff e o orquestrador (Plan 18-02) não terá nada para ler. As Fases 19-20 vão expandir o comportamento operacional desses agentes; esta fase apenas garante que TODOS sabem como/quando emitir o handoff.

Output: 6 arquivos `.md` em `.claude/agents/`, cada um com uma seção nova adicionada antes da seção `**Hierarquia:**` final. Frontmatter e corpo existente preservados. Cobre HAND-02 (universal handoff emission).
</objective>

<execution_context>
@./.claude/framework/workflows/execute-plan.md
@./.claude/framework/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/18-protocolo-de-handoff-e-orquestrador/18-CONTEXT.md

@.claude/agents/research-doc.md
@.claude/agents/code-analyzer.md
@.claude/agents/qa-loop.md
@.claude/agents/supabase-executor.md
@.claude/agents/supabase-diagnostician.md
@.claude/agents/doc-before-after.md

<interfaces>
<!-- Cada arquivo de agente tem hoje a estrutura -->
<!-- --- -->
name: <agent-name>
description: <descrição>
tools: <ferramentas>
color: <cor>
<!-- --- -->

# <Title>

<parágrafo principal>

<parágrafo de contexto v1.3>

**Comportamento detalhado** ... é definido nas Fases X-Y do milestone v1.3.

**Hierarquia:** ...

<!-- A nova seção `## Handoff at completion` deve ser inserida ANTES de `**Hierarquia:**` -->
<!-- e DEPOIS do parágrafo "Comportamento detalhado" -->

<!-- Mapeamento de pipeline_stage por agente: -->
research-doc            → pipeline_stage: research      ; qa_gate_status: n/a
code-analyzer           → pipeline_stage: research      ; qa_gate_status: n/a
qa-loop                 → pipeline_stage: qa            ; qa_gate_status: APPROVED|RETRY|PARTIAL_SUCCESS
supabase-executor       → pipeline_stage: deploy        ; qa_gate_status: PENDING
supabase-diagnostician  → pipeline_stage: diagnostic    ; qa_gate_status: n/a
doc-before-after        → pipeline_stage: documentation ; qa_gate_status: n/a
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Tarefa 1: Adicionar seção `## Handoff at completion` aos 4 agentes com `qa_gate_status: n/a`</name>
  <files>.claude/agents/research-doc.md, .claude/agents/code-analyzer.md, .claude/agents/supabase-diagnostician.md, .claude/agents/doc-before-after.md</files>
  <read_first>
    - .claude/agents/research-doc.md (estado atual, formato exato)
    - .claude/agents/code-analyzer.md (estado atual)
    - .claude/agents/supabase-diagnostician.md (estado atual)
    - .claude/agents/doc-before-after.md (estado atual)
    - .planning/phases/18-protocolo-de-handoff-e-orquestrador/18-CONTEXT.md (decisões do schema)
  </read_first>
  <action>
Para cada um dos 4 arquivos abaixo, inserir uma seção H2 nova `## Handoff at completion` ANTES da linha `**Hierarquia:**` e DEPOIS do parágrafo `**Comportamento detalhado** ...`. Frontmatter e demais parágrafos preservados verbatim.

### 1.1 — research-doc.md

Inserir esta seção:

```markdown
## Handoff at completion

Antes de finalizar a child issue, emitir um documento `pipeline-handoff` conforme `skills/paperclip/rules/handoff-protocol.md`.

Valores específicos para Research-Doc:

- `pipeline_stage: research`
- `upstream_findings.research_doc`: o resumo dos padrões canônicos encontrados em docs/repos externos (multi-line)
- `upstream_findings.code_analyzer`: omitir (será preenchido pelo agente irmão code-analyzer no handoff dele)
- `upstream_findings.prior_artifacts`: paths de qualquer artefato relevante consultado no repo local (read-only)
- `decisions_made`: decisões metodológicas (qual fonte priorizar, qual versão da doc tomar como referência) — pode ser `[]` se nenhuma decisão não-trivial
- `artifacts_produced`: type sempre `doc` (research-doc não escreve código). Se a saída for embutida no próprio handoff, deixe `artifacts_produced: []` e coloque o conteúdo em `upstream_findings.research_doc`
- `qa_gate_status: n/a` (research não passa por QA)

Persistir via `PUT /api/issues/{issueId}/documents/pipeline-handoff` ANTES do PATCH final que move a issue para `done`. O orchestrator-maintenance lê este documento via `issue_children_completed` para sintetizar findings.

```

### 1.2 — code-analyzer.md

Inserir esta seção:

```markdown
## Handoff at completion

Antes de finalizar a child issue, emitir um documento `pipeline-handoff` conforme `skills/paperclip/rules/handoff-protocol.md`.

Valores específicos para Code-Analyzer:

- `pipeline_stage: research`
- `upstream_findings.code_analyzer`: o diagnóstico exato — arquivo, linha, função, padrão problemático, callers/callees relevantes
- `upstream_findings.research_doc`: omitir (será preenchido pelo agente irmão research-doc no handoff dele)
- `upstream_findings.prior_artifacts`: paths dos arquivos analisados (read-only)
- `decisions_made`: decisões de escopo de análise (até onde rastrear callers, qual subsistema priorizar) — pode ser `[]`
- `artifacts_produced`: type sempre `diagnostic`. Não há código escrito; o "artefato" é o próprio diagnóstico estruturado embutido em `upstream_findings.code_analyzer`. Use `artifacts_produced: []` se o diagnóstico está embutido no handoff
- `qa_gate_status: n/a` (análise não passa por QA)

Persistir via `PUT /api/issues/{issueId}/documents/pipeline-handoff` ANTES do PATCH final que move a issue para `done`. O orchestrator-maintenance combina este diagnóstico com os achados do research-doc para distribuir correções com escopo disjunto.

```

### 1.3 — supabase-diagnostician.md

Inserir esta seção:

```markdown
## Handoff at completion

Antes de finalizar a verificação pós-deploy, emitir um documento `pipeline-handoff` conforme `skills/paperclip/rules/handoff-protocol.md`.

Valores específicos para Supabase-Diagnostician:

- `pipeline_stage: diagnostic`
- `upstream_findings.prior_artifacts`: paths dos artefatos do deploy (migration files, edge function source) que foram verificados
- `decisions_made`: decisões de escopo (quais tabelas/funções verificar, quais logs ler) — pode ser `[]` em verificação padrão
- `artifacts_produced`: type sempre `diagnostic`. Inclua: schema version detectada, log excerpts relevantes, divergência (se houver) entre versão esperada e encontrada
- `qa_gate_status: n/a` (diagnóstico read-only não tem gate próprio; reporta divergências ao orquestrador via decisions_made/artifacts_produced)

Quando detectar divergência (ex: schema version errada em produção), o handoff deve incluir os dados concretos no formato:

```yaml
artifacts_produced:
  - path: <child-issue-id>/diagnostic-report
    type: diagnostic
    summary: "Schema version mismatch: expected v42, found v40 in production"
```

Persistir via `PUT /api/issues/{issueId}/documents/pipeline-handoff` ANTES do PATCH final que move a issue para `done`.

```

### 1.4 — doc-before-after.md

Inserir esta seção:

```markdown
## Handoff at completion

Antes de finalizar a documentação de uma etapa, emitir um documento `pipeline-handoff` conforme `skills/paperclip/rules/handoff-protocol.md`.

Valores específicos para Doc-Before-After:

- `pipeline_stage: documentation`
- `upstream_findings.prior_artifacts`: paths dos arquivos cujo estado foi capturado (antes/depois)
- `decisions_made`: decisões de escopo (o que conta como "estado relevante" para esta etapa) — pode ser `[]` em casos padrão
- `artifacts_produced`: dois entries por etapa documentada — um para `state-before-{stage}` e um para `state-after-{stage}`, ambos com `type: doc`
- `qa_gate_status: n/a` (documentação não tem gate)

Exemplo de `artifacts_produced`:

```yaml
artifacts_produced:
  - path: <issue-id>/documents/state-before-execution
    type: doc
    summary: "Snapshot of server/src/services/auth.ts pre-correction (12 functions, 3 known bugs)"
  - path: <issue-id>/documents/state-after-execution
    type: doc
    summary: "Snapshot of same file post-correction (12 functions, 0 known bugs, 8 new tests)"
```

Persistir via `PUT /api/issues/{issueId}/documents/pipeline-handoff` ANTES do PATCH final que move a issue para `done`. Os documents `state-before-{stage}` e `state-after-{stage}` são persistidos separadamente via `PUT /api/issues/{issueId}/documents/state-before-{stage}` e `PUT /api/issues/{issueId}/documents/state-after-{stage}`.

```

### Regras de inserção (todos os 4 arquivos)

- Inserir a seção H2 entre o último parágrafo `**Comportamento detalhado** ...` e a linha `**Hierarquia:**`
- Manter linha em branco antes da nova seção e linha em branco depois
- NÃO modificar frontmatter, parágrafo principal, parágrafo v1.3 ou linha de hierarquia
- Caminho `skills/paperclip/rules/handoff-protocol.md` deve aparecer literalmente em cada arquivo
  </action>
  <verify>
    <automated>
      for f in research-doc code-analyzer supabase-diagnostician doc-before-after; do
        grep -q "## Handoff at completion" .claude/agents/$f.md || { echo "FAIL: $f missing handoff section"; exit 1; }
        grep -q "skills/paperclip/rules/handoff-protocol.md" .claude/agents/$f.md || { echo "FAIL: $f missing rule reference"; exit 1; }
        grep -q "pipeline-handoff" .claude/agents/$f.md || { echo "FAIL: $f missing pipeline-handoff token"; exit 1; }
        grep -q "qa_gate_status: n/a" .claude/agents/$f.md || { echo "FAIL: $f missing n/a gate"; exit 1; }
        head -7 .claude/agents/$f.md | grep -q "^name: $f$" || { echo "FAIL: $f frontmatter name corrupted"; exit 1; }
        grep -q "^\*\*Hierarquia:" .claude/agents/$f.md || { echo "FAIL: $f Hierarquia line lost"; exit 1; }
      done
      echo "all 4 OK"
    </automated>
  </verify>
  <acceptance_criteria>
    - Cada um dos 4 arquivos tem uma seção H2 com título exato `## Handoff at completion`
    - Cada arquivo referencia o caminho `skills/paperclip/rules/handoff-protocol.md`
    - Cada arquivo declara `qa_gate_status: n/a` na seção de handoff
    - Frontmatter `name: <agente>` está intacto na primeira seção do arquivo (preservado verbatim)
    - Linha `**Hierarquia:**` continua presente e é a última seção do arquivo
    - research-doc tem `pipeline_stage: research`, code-analyzer tem `pipeline_stage: research`, supabase-diagnostician tem `pipeline_stage: diagnostic`, doc-before-after tem `pipeline_stage: documentation`
  </acceptance_criteria>
  <done>
    Os 4 agentes não-execução do pipeline sabem emitir handoff com os valores corretos. O orquestrador (Plan 18-02) terá documents para ler quando esses agentes finalizarem.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Tarefa 2: Adicionar seção `## Handoff at completion` para qa-loop e supabase-executor (gates não-triviais)</name>
  <files>.claude/agents/qa-loop.md, .claude/agents/supabase-executor.md</files>
  <read_first>
    - .claude/agents/qa-loop.md (estado atual)
    - .claude/agents/supabase-executor.md (estado atual)
    - .planning/phases/18-protocolo-de-handoff-e-orquestrador/18-CONTEXT.md
    - .claude/skills/paperclip/rules/handoff-protocol.md (criado em 18-01 — validar enum de qa_gate_status)
  </read_first>
  <action>
Mesma regra de inserção da Tarefa 1: H2 nova entre `**Comportamento detalhado** ...` e `**Hierarquia:**`. Frontmatter preservado.

### 2.1 — qa-loop.md (gate principal — qa_gate_status NÃO é n/a)

Inserir esta seção:

```markdown
## Handoff at completion

Antes de finalizar uma iteração de QA, emitir um documento `pipeline-handoff` conforme `skills/paperclip/rules/handoff-protocol.md`.

Valores específicos para QA-Loop:

- `pipeline_stage: qa`
- `upstream_findings.prior_artifacts`: paths dos arquivos modificados pela etapa de execução que está sendo testada
- `decisions_made`: registrar a iteração corrente e o critério de parada — exemplo:
  ```yaml
  decisions_made:
    - decision: "Iteration 2 of 3 (max)"
      rationale: "Coverage 76%; below gate; returning to executor for additional tests"
  ```
- `artifacts_produced`: incluir o relatório de cobertura como artefato — `type: test` e `path` apontando para o output capturado:
  ```yaml
  artifacts_produced:
    - path: <issue-id>/coverage-report.txt
      type: test
      summary: "pnpm test --coverage output; Lines: 76%, Statements: 82%, Branches: 71%"
  ```
- `qa_gate_status`: este é o campo crítico do QA-Loop. Mapear assim:
  - **`APPROVED`** — extracted `Lines: X%` ≥ 80%
  - **`RETRY`** — `Lines: X%` < 80% AND iteration < 3 (devolver para correção)
  - **`PARTIAL_SUCCESS`** — `Lines: X%` < 80% AND iteration == 3 (esgotou tentativas; aciona Tech-Debt-Documenter)

Nunca usar `n/a` ou `PENDING` no QA-Loop — o agente sempre tem decisão concreta (cobertura medida).

Persistir via `PUT /api/issues/{issueId}/documents/pipeline-handoff` ANTES do PATCH final. O orchestrator-maintenance lê `qa_gate_status` para decidir entre: prosseguir (`APPROVED`), nova iteração de execução (`RETRY`), ou caminho de débito técnico (`PARTIAL_SUCCESS`).

```

### 2.2 — supabase-executor.md (deploy stage)

Inserir esta seção:

```markdown
## Handoff at completion

Antes de finalizar um deploy, emitir um documento `pipeline-handoff` conforme `skills/paperclip/rules/handoff-protocol.md`.

Valores específicos para Supabase-Executor:

- `pipeline_stage: deploy`
- `upstream_findings.prior_artifacts`: paths das migrations e edge function sources que foram aplicadas
- `decisions_made`: decisões de deploy (rota MCP vs CLI escolhida e por quê, ordem de aplicação se múltiplas migrations) — exemplo:
  ```yaml
  decisions_made:
    - decision: "Used mcp__supabase__apply_migration for SQL changes"
      rationale: "Native MCP coverage; no CLI fallback needed"
    - decision: "Deferred edge function deploy to next checkpoint"
      rationale: "Function depends on new column; requires schema migration to apply first"
  ```
- `artifacts_produced`: cada migration aplicada e cada function deployed:
  ```yaml
  artifacts_produced:
    - path: supabase/migrations/20260428_add_pipeline_status.sql
      type: config
      summary: "Applied via mcp__supabase__apply_migration; schema_version now 42"
    - path: supabase/functions/handoff-notifier/index.ts
      type: code
      summary: "Deployed via supabase functions deploy CLI"
  ```
- `qa_gate_status: PENDING` — deploy emite PENDING porque a verificação passa para o `supabase-diagnostician` no próximo stage. Não emitir `APPROVED` aqui (não é o agente de gate).

**Regra de segurança crítica:** o handoff NÃO deve conter o `SUPABASE_ACCESS_TOKEN` em nenhum campo. Se você precisou referenciá-lo, refira-se a `company_secrets.SUPABASE_ACCESS_TOKEN` ou `env.SUPABASE_ACCESS_TOKEN` — nunca o valor literal.

Persistir via `PUT /api/issues/{issueId}/documents/pipeline-handoff` APÓS a confirmação de `checkpoint:human-action` e ANTES do PATCH final.

```

### Regras de inserção (idênticas à Tarefa 1)

- Seção entre `**Comportamento detalhado** ...` e `**Hierarquia:**`
- Linha em branco antes e depois
- Frontmatter preservado verbatim
- Caminho `skills/paperclip/rules/handoff-protocol.md` aparece literalmente
  </action>
  <verify>
    <automated>
      grep -q "## Handoff at completion" .claude/agents/qa-loop.md \
        && grep -q "skills/paperclip/rules/handoff-protocol.md" .claude/agents/qa-loop.md \
        && grep -q "pipeline_stage: qa" .claude/agents/qa-loop.md \
        && grep -q "APPROVED" .claude/agents/qa-loop.md \
        && grep -q "RETRY" .claude/agents/qa-loop.md \
        && grep -q "PARTIAL_SUCCESS" .claude/agents/qa-loop.md \
        && head -7 .claude/agents/qa-loop.md | grep -q "^name: qa-loop$" \
        && grep -q "## Handoff at completion" .claude/agents/supabase-executor.md \
        && grep -q "skills/paperclip/rules/handoff-protocol.md" .claude/agents/supabase-executor.md \
        && grep -q "pipeline_stage: deploy" .claude/agents/supabase-executor.md \
        && grep -q "qa_gate_status: PENDING" .claude/agents/supabase-executor.md \
        && head -7 .claude/agents/supabase-executor.md | grep -q "^name: supabase-executor$" \
        && grep -q "SUPABASE_ACCESS_TOKEN" .claude/agents/supabase-executor.md
    </automated>
  </verify>
  <acceptance_criteria>
    - qa-loop.md tem seção `## Handoff at completion` com `pipeline_stage: qa`
    - qa-loop.md mapeia `APPROVED`, `RETRY`, `PARTIAL_SUCCESS` na seção de handoff (cobertura completa do enum não-trivial)
    - qa-loop.md NÃO menciona `qa_gate_status: n/a` na seção de handoff (regra explícita: nunca n/a no QA-Loop)
    - supabase-executor.md tem seção `## Handoff at completion` com `pipeline_stage: deploy` e `qa_gate_status: PENDING`
    - supabase-executor.md inclui regra de segurança proibindo token literal no handoff
    - Frontmatter de ambos os arquivos preservado: `name: qa-loop` e `name: supabase-executor`
    - Linha `**Hierarquia:**` presente e final em ambos
  </acceptance_criteria>
  <done>
    qa-loop e supabase-executor sabem emitir handoff com os valores não-triviais corretos. Os 6 agentes do pipeline (incluindo este plan + Tarefa 1) agora cobrem 100% de HAND-02 (todo agente emite handoff estruturado).
  </done>
</task>

</tasks>

<verification>
1. Todos os 6 agentes têm seção `## Handoff at completion`:
   ```bash
   for f in research-doc code-analyzer qa-loop supabase-executor supabase-diagnostician doc-before-after; do
     grep -q "## Handoff at completion" .claude/agents/$f.md && echo "$f OK" || echo "$f FAIL"
   done
   ```
2. Todos os 6 referenciam a regra canônica:
   ```bash
   grep -l "skills/paperclip/rules/handoff-protocol.md" .claude/agents/*.md | wc -l
   ```
   Deve retornar ≥ 6 (os 6 agentes do plano; SKILL.md não está em .claude/agents/).
3. Frontmatter `name:` preservado em todos os 6:
   ```bash
   for f in research-doc code-analyzer qa-loop supabase-executor supabase-diagnostician doc-before-after; do
     head -7 .claude/agents/$f.md | grep -q "^name: $f$" && echo "$f OK" || echo "$f FAIL"
   done
   ```
4. pipeline_stage correto por agente: research-doc/code-analyzer = research; qa-loop = qa; supabase-executor = deploy; supabase-diagnostician = diagnostic; doc-before-after = documentation
</verification>

<success_criteria>
- HAND-02 atendido: os 6 agentes do pipeline (mais o orchestrator-maintenance do Plan 18-02) emitem handoff estruturado
- Cada agente conhece seu `pipeline_stage` e `qa_gate_status` típico sem ambiguidade
- Frontmatter de todos os agentes intacto (name, description, tools, color, parallelism_policy preservados verbatim)
- Comportamento detalhado dos agentes não foi modificado — apenas a regra de handoff foi adicionada (esta fase é DOCUMENTAÇÃO; comportamento operacional vem nas Fases 19-20)
- Handoff Protocol (Plan 18-01) é referenciado canonicamente em todos os 6 arquivos
</success_criteria>

<output>
After completion, create `.planning/phases/18-protocolo-de-handoff-e-orquestrador/18-03-emit-handoff-in-six-agents-SUMMARY.md`
</output>
