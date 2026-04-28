---
phase: 17-funda-o-dos-agentes
plan: 03
type: execute
wave: 2
depends_on:
  - 17-01-mapping-and-invariants
  - 17-02-agent-md-files
files_modified:
  - .planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md
autonomous: true
requirements:
  - AGENT-03
  - AGENT-04

must_haves:
  truths:
    - "Primeira execução de `pnpm sync-agents` reporta exatamente 7 created (orchestrator-maintenance, research-doc, code-analyzer, qa-loop, supabase-executor, supabase-diagnostician, doc-before-after) e 18 unchanged dos slugs v1.2"
    - "Segunda execução de `pnpm sync-agents` (idempotência) reporta 0 created e 25 unchanged — nenhum updated"
    - "Query SQL contra `agents` na in100tiva confirma reports_to correto para os 7 novos: orchestrator-maintenance.reports_to == executor.id; research-doc/code-analyzer/supabase-executor.reports_to == orchestrator-maintenance.id; qa-loop/supabase-diagnostician.reports_to == verifier.id; doc-before-after.reports_to == user-profiler.id"
    - "Total de agents na in100tiva = 26 (CEO + 4 Heads + 21 specialists)"
  artifacts:
    - path: ".planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md"
      provides: "Log das execuções de sync (run 1 + run 2 idempotente) + output da query SQL de verificação de hierarquia"
      contains: "created: 7"
      min_lines: 30
  key_links:
    - from: "scripts/sync-agents/mapping.ts (AGENT_MAPPING) + .claude/agents/*.md"
      to: "Postgres agents table (in100tiva company)"
      via: "pnpm sync-agents (Pass 1 upsert + Pass 2 reports_to linking via slugToAgentId map)"
      pattern: "frameworkSlug.*orchestrator-maintenance"
    - from: "agents.metadata.managerSlug"
      to: "agents.reports_to (UUID)"
      via: "Pass 2 do sync.ts resolve slugToAgentId.get(managerSlug) → reports_to"
      pattern: "reports_to.*UUID"
---

<objective>
Executar `pnpm sync-agents` para criar os 7 novos agentes na in100tiva via Supabase, validar idempotência (re-execução = 0 created), e verificar via SQL que a hierarquia `reports_to` está correta para todos os 7 agentes novos. Persistir os outputs em `17-03-SYNC-OUTPUT.md` para auditoria.

Purpose: Plano 17-01 atualizou o mapping canônico, Plano 17-02 criou os arquivos `.md` que o sync exige. Este plano fecha a fase exercitando o pipeline real (Plan 13 do v1.2 já garantiu a idempotência do `sync.ts`) e prova que os 7 novos funcionários existem no banco com hierarquia correta — encerrando os critérios de sucesso 3 e 4 do roadmap (AGENT-03, AGENT-04).

Output: 7 agentes criados em produção (in100tiva), arquivo de evidência `17-03-SYNC-OUTPUT.md` com logs literais das duas execuções + output da query de verificação de hierarquia.
</objective>

<execution_context>
@./.claude/framework/workflows/execute-plan.md
@./.claude/framework/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/17-funda-o-dos-agentes/17-CONTEXT.md
@.planning/phases/17-funda-o-dos-agentes/17-01-mapping-and-invariants-PLAN.md
@.planning/phases/17-funda-o-dos-agentes/17-02-agent-md-files-PLAN.md
@scripts/sync-agents/sync.ts
@scripts/sync-agents/mapping.ts
@scripts/sync-agents/types.ts
@AGENTS-IMPORT.md

<interfaces>
<!-- Constantes operacionais (de scripts/sync-agents/types.ts): -->

```typescript
export const TARGET_COMPANY_ID = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6'; // in100tiva
export const CEO_AGENT_ID = 'd64a9f21-3ad0-4ca5-b7e8-58dbefb55b75';     // pre-existing CEO
```

<!-- Output esperado de sync.ts (status field do ReportRow em sync.ts:42-44): -->

```typescript
type ReportRow = {
  slug: string;
  status: 'created' | 'updated' | 'unchanged' | 'skipped' | 'error';
  detail?: string;
};
```

<!-- Lookup de hierarquia (sync.ts Pass 2 — linhas ~296-330): -->
<!-- Para cada AGENT_MAPPING entry, slugToAgentId.get(managerSlug) resolve o reports_to. -->
<!-- 'ceo' como managerSlug → CEO_AGENT_ID literal. -->
<!-- Outros slugs → resolvido a partir do upsert da Pass 1. -->

<!-- Pré-requisito de env (de AGENTS-IMPORT.md): -->
<!-- `.paperclip/.env` deve conter DATABASE_URL apontando ao Supavisor pooler 6543. -->
<!-- Source automático: `set -a; source .paperclip/.env; set +a` antes de invocar pnpm sync-agents. -->

<!-- Esquema de query SQL para verificação (Postgres via Supavisor): -->
<!-- Tabela: agents (companyId, id, name, role, reports_to, metadata JSONB) -->
<!-- metadata->>'frameworkSlug' identifica o slug do framework. -->
```

Tabela esperada de hierarquia após sync (slug → reports_to slug):

| novo agent | reports_to slug | reports_to slug resolve para... |
|------------|-----------------|--------------------------------|
| orchestrator-maintenance | executor | UUID do agent executor (Head Engineering) |
| research-doc | orchestrator-maintenance | UUID criado nesta sync |
| code-analyzer | orchestrator-maintenance | UUID criado nesta sync |
| qa-loop | verifier | UUID do agent verifier (Head Quality) |
| supabase-executor | orchestrator-maintenance | UUID criado nesta sync |
| supabase-diagnostician | verifier | UUID do agent verifier (Head Quality) |
| doc-before-after | user-profiler | UUID do agent user-profiler (Head Analytics) |
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Tarefa 1: Pré-flight + dry-run sync</name>

  <read_first>
    - scripts/sync-agents/sync.ts (linhas 153-220 — main() bootstrap, validação de env e CEO)
    - scripts/sync-agents/mapping.ts (estado pós-Plano 17-01 — 25 entradas, validateMapping atualizado)
    - .planning/phases/17-funda-o-dos-agentes/17-01-mapping-and-invariants-PLAN.md (verificar que está completo)
    - .planning/phases/17-funda-o-dos-agentes/17-02-agent-md-files-PLAN.md (verificar que está completo)
    - AGENTS-IMPORT.md (procedimento canônico de execução)
  </read_first>

  <files>.planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md</files>

  <action>
    Validar pré-condições e executar dry-run para inspeção sem efeito colateral antes do apply real.

    **Passo 1.1 — Validar pré-condições:**

    ```bash
    cd /home/tech-lead/Documentos/DEV/paperclip-master

    # 1. Mapping atualizado (de Plano 17-01)
    grep -c "AGENT_MAPPING.length !== 25" scripts/sync-agents/mapping.ts
    # Esperado: 1

    # 2. Os 7 arquivos .md existem (de Plano 17-02)
    for slug in orchestrator-maintenance research-doc code-analyzer qa-loop supabase-executor supabase-diagnostician doc-before-after; do
      [ -f ".claude/agents/$slug.md" ] && echo "OK $slug" || { echo "MISSING $slug"; exit 1; }
    done

    # 3. .paperclip/.env presente com DATABASE_URL
    [ -f .paperclip/.env ] && grep -q "^DATABASE_URL=" .paperclip/.env && echo "ENV-OK" || { echo "ENV-MISSING"; exit 1; }
    ```

    Se qualquer pré-condição falhar, parar e retornar checkpoint reportando o problema (Regra 3 — bloqueador).

    **Passo 1.2 — Dry-run:**

    ```bash
    cd /home/tech-lead/Documentos/DEV/paperclip-master
    set -a; source .paperclip/.env; set +a
    pnpm sync-agents --dry-run 2>&1 | tee /tmp/17-03-dry-run.log
    ```

    **Passo 1.3 — Validar output do dry-run:**

    O log deve conter exatamente 7 linhas com status `created` (would-insert) para os slugs novos e 18 linhas com status `unchanged` para os v1.2. Validar com:

    ```bash
    # 7 created esperados (would-insert no dry-run)
    created_count=$(grep -cE "(would-insert.*dry-run|created)" /tmp/17-03-dry-run.log | head -1)
    echo "Dry-run created count: $created_count"

    # Slugs novos especificamente reportados
    for slug in orchestrator-maintenance research-doc code-analyzer qa-loop supabase-executor supabase-diagnostician doc-before-after; do
      grep -q "$slug" /tmp/17-03-dry-run.log && echo "OK $slug in log" || echo "MISSING $slug in log"
    done
    ```

    **Passo 1.4 — Iniciar arquivo de output:**

    Criar `.planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md` (via Write, NUNCA heredoc) com:

    ```markdown
    # 17-03 Sync Output Log

    Auditoria de execução de `pnpm sync-agents` para registrar os 7 novos agentes do milestone v1.3 na in100tiva.

    ## Pré-flight Validations

    - Mapping atualizado (25 agentes): OK
    - 7 arquivos .md presentes: OK
    - .paperclip/.env com DATABASE_URL: OK

    ## Run 1 — Dry-run

    ```
    <colar conteúdo de /tmp/17-03-dry-run.log aqui>
    ```

    ### Validações do dry-run

    - 7 slugs novos reportados como `created` (would-insert): {pass/fail}
    - 18 slugs v1.2 reportados como `unchanged`: {pass/fail}

    ## Run 2 — Apply (preenchido na Tarefa 2)

    {a preencher}

    ## Run 3 — Idempotência (preenchido na Tarefa 2)

    {a preencher}

    ## Verificação SQL de hierarquia (preenchida na Tarefa 3)

    {a preencher}
    ```
  </action>

  <verify>
    <automated>cd /home/tech-lead/Documentos/DEV/paperclip-master && grep -c "AGENT_MAPPING.length !== 25" scripts/sync-agents/mapping.ts && for slug in orchestrator-maintenance research-doc code-analyzer qa-loop supabase-executor supabase-diagnostician doc-before-after; do [ -f ".claude/agents/$slug.md" ] || { echo "MISSING $slug"; exit 1; }; done && [ -f .planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md ] && grep -q "Run 1 — Dry-run" .planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md && echo "PRECHECK-OK"</automated>
  </verify>

  <acceptance_criteria>
    - `grep -c "AGENT_MAPPING.length !== 25" scripts/sync-agents/mapping.ts` retorna 1 (Plano 17-01 completo)
    - 7 arquivos .md existem em `.claude/agents/` (Plano 17-02 completo)
    - `.paperclip/.env` existe e contém `DATABASE_URL=`
    - `/tmp/17-03-dry-run.log` foi criado e contém os 7 slugs novos literalmente
    - O dry-run reporta exit 0 (sem `process.exit(1)` por validação de mapping ou env)
    - `17-03-SYNC-OUTPUT.md` criado com seções "Pré-flight", "Run 1 — Dry-run" populada com log literal, "Run 2 — Apply" e "Run 3 — Idempotência" e "Verificação SQL" como placeholders a preencher
    - Commit criado com prefixo `chore(17-03): pre-flight and dry-run validation`
  </acceptance_criteria>

  <done>
    Pré-condições validadas, dry-run executado com sucesso, output preliminar persistido. Plano 17-01 e 17-02 confirmados como completos via grep + file checks.
  </done>
</task>

<task type="auto">
  <name>Tarefa 2: Apply sync (Run 2) + idempotência (Run 3)</name>

  <read_first>
    - scripts/sync-agents/sync.ts (linhas 218-340 — Pass 1 upsert + Pass 2 reports_to linking + final report)
    - .planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md (estado pós-Tarefa 1)
  </read_first>

  <files>.planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md</files>

  <action>
    Executar o sync de verdade duas vezes — primeira aplica, segunda confirma idempotência.

    **Passo 2.1 — Run 2 (apply real):**

    ```bash
    cd /home/tech-lead/Documentos/DEV/paperclip-master
    set -a; source .paperclip/.env; set +a
    pnpm sync-agents 2>&1 | tee /tmp/17-03-run2-apply.log
    ```

    **Passo 2.2 — Validar Run 2:**

    O log deve reportar:
    - 7 linhas `created` para os 7 slugs novos (com UUID concreto no detail, não "would-insert")
    - 18 linhas `unchanged` para os v1.2 (sem drift — Plano 17-01 não alterou metadata existente, apenas adicionou entradas)

    ```bash
    grep -E "✓.*created" /tmp/17-03-run2-apply.log | wc -l   # esperado: 7
    grep -E "✓.*unchanged" /tmp/17-03-run2-apply.log | wc -l # esperado: 18
    grep -E "✓.*updated" /tmp/17-03-run2-apply.log | wc -l   # esperado: 0
    grep -E "✗|FATAL|Error" /tmp/17-03-run2-apply.log         # esperado: vazio
    ```

    Se `updated > 0` para slugs v1.2: investigar o drift (executor, planner, etc. podem ter capabilities/title alterados em PLAN 12 vs estado atual). NÃO é falha bloqueadora — apenas registrar no SUMMARY como observação.

    **Passo 2.3 — Run 3 (idempotência):**

    ```bash
    cd /home/tech-lead/Documentos/DEV/paperclip-master
    set -a; source .paperclip/.env; set +a
    pnpm sync-agents 2>&1 | tee /tmp/17-03-run3-idempotent.log
    ```

    **Passo 2.4 — Validar Run 3:**

    ```bash
    grep -E "✓.*created" /tmp/17-03-run3-idempotent.log | wc -l    # esperado: 0
    grep -E "✓.*unchanged" /tmp/17-03-run3-idempotent.log | wc -l  # esperado: 25
    grep -E "✓.*updated" /tmp/17-03-run3-idempotent.log | wc -l    # esperado: 0
    ```

    Se `unchanged != 25` ou `created/updated != 0`: o sync não está idempotente para os novos agentes — investigar `hasDrifted()` (sync.ts:138-151) para ver se `metadata.syncedAt` está sendo comparado erroneamente. Se for esse o caso, marcar como bloqueador (Regra 4 — possível ajuste arquitetural no `hasDrifted`) e PARAR retornando checkpoint.

    **Passo 2.5 — Atualizar `17-03-SYNC-OUTPUT.md`:**

    Substituir placeholders "Run 2 — Apply" e "Run 3 — Idempotência" com os logs literais e as validações. Usar Edit (não Write — preservar Run 1 e estrutura).

    Adicionar tabela resumo das contagens:

    ```markdown
    ### Resumo de contagens

    | Run | created | updated | unchanged | erros |
    |-----|---------|---------|-----------|-------|
    | 1 dry-run | 7 (would-insert) | 0 | 18 | 0 |
    | 2 apply | 7 | 0 | 18 | 0 |
    | 3 idempotent | 0 | 0 | 25 | 0 |
    ```
  </action>

  <verify>
    <automated>cd /home/tech-lead/Documentos/DEV/paperclip-master && c2_created=$(grep -cE "✓.*created" /tmp/17-03-run2-apply.log); c2_unchanged=$(grep -cE "✓.*unchanged" /tmp/17-03-run2-apply.log); c3_created=$(grep -cE "✓.*created" /tmp/17-03-run3-idempotent.log); c3_unchanged=$(grep -cE "✓.*unchanged" /tmp/17-03-run3-idempotent.log); errs2=$(grep -cE "✗|FATAL" /tmp/17-03-run2-apply.log); errs3=$(grep -cE "✗|FATAL" /tmp/17-03-run3-idempotent.log); echo "Run2: created=$c2_created unchanged=$c2_unchanged errors=$errs2"; echo "Run3: created=$c3_created unchanged=$c3_unchanged errors=$errs3"; [ "$c2_created" = "7" ] && [ "$c3_created" = "0" ] && [ "$c3_unchanged" = "25" ] && [ "$errs2" = "0" ] && [ "$errs3" = "0" ] && echo "IDEMPOTENCY-OK" || echo "IDEMPOTENCY-FAIL"</automated>
  </verify>

  <acceptance_criteria>
    - Run 2 reporta exatamente 7 `created` (corresponde aos 7 slugs novos: orchestrator-maintenance, research-doc, code-analyzer, qa-loop, supabase-executor, supabase-diagnostician, doc-before-after)
    - Run 2 reporta 0 erros (`grep -cE "✗|FATAL" /tmp/17-03-run2-apply.log` retorna 0)
    - Run 3 reporta exatamente 0 `created` e 25 `unchanged` (idempotência total)
    - Run 3 reporta 0 erros
    - `17-03-SYNC-OUTPUT.md` contém ambos os logs (Run 2 + Run 3) literalmente em blocos de código markdown
    - `17-03-SYNC-OUTPUT.md` contém a tabela "Resumo de contagens" com valores reais
    - Verificação final: `grep -c "created" .planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md` ≥ 7
    - Commit criado com prefixo `chore(17-03): apply sync and verify idempotency (7 created, 25 unchanged on re-run)`
  </acceptance_criteria>

  <done>
    7 agentes criados em produção (in100tiva). Re-execução confirmada como zero-op. Logs literais de ambas as execuções persistidos em 17-03-SYNC-OUTPUT.md.
  </done>
</task>

<task type="auto">
  <name>Tarefa 3: Verificar hierarquia reports_to via SQL</name>

  <read_first>
    - scripts/sync-agents/sync.ts (linhas 296-340 — Pass 2 lógica de reports_to)
    - .planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md (estado pós-Tarefa 2)
  </read_first>

  <files>.planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md</files>

  <action>
    Confirmar via query direta ao Postgres (Supavisor pooler) que cada um dos 7 novos agentes tem `reports_to` apontando ao agent correto. Resolver em duas etapas: primeiro descobrir os UUIDs dos managers, depois cross-checar.

    **Passo 3.1 — Query de verificação:**

    Usar `psql` com a `DATABASE_URL` do `.paperclip/.env`. Query única que faz self-join para mostrar cada novo agente com o slug do seu manager resolvido:

    ```bash
    cd /home/tech-lead/Documentos/DEV/paperclip-master
    set -a; source .paperclip/.env; set +a

    psql "$DATABASE_URL" -c "
      SELECT
        a.metadata->>'frameworkSlug'   AS slug,
        a.role                          AS role,
        a.metadata->>'department'       AS department,
        a.metadata->>'parallelismPolicy' AS policy,
        m.metadata->>'frameworkSlug'   AS reports_to_slug,
        m.id                            AS reports_to_id
      FROM agents a
      LEFT JOIN agents m ON m.id = a.reports_to
      WHERE a.company_id = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6'
        AND a.metadata->>'frameworkSlug' IN (
          'orchestrator-maintenance','research-doc','code-analyzer',
          'qa-loop','supabase-executor','supabase-diagnostician','doc-before-after'
        )
      ORDER BY a.metadata->>'frameworkSlug';
    " 2>&1 | tee /tmp/17-03-hierarchy-check.log
    ```

    Se o slug do CEO precisa aparecer (orchestrator-maintenance.reports_to_slug deve ser `executor`, não NULL), o LEFT JOIN cobre. Se algum reports_to_slug vier NULL, há bug no Pass 2 do sync — investigar (Regra 1 ou Regra 4 dependendo da causa).

    **Passo 3.2 — Validar resultados esperados:**

    Tabela esperada (ordem alfabética por slug):

    ```
    slug                     | role        | department  | policy      | reports_to_slug
    -------------------------+-------------+-------------+-------------+--------------------------
    code-analyzer            | specialist  | engineering | parallel    | orchestrator-maintenance
    doc-before-after         | specialist  | analytics   | parallel    | user-profiler
    orchestrator-maintenance | specialist  | engineering | serial      | executor
    qa-loop                  | specialist  | quality     | serial_gate | verifier
    research-doc             | specialist  | engineering | parallel    | orchestrator-maintenance
    supabase-diagnostician   | specialist  | quality     | parallel    | verifier
    supabase-executor        | specialist  | engineering | serial      | orchestrator-maintenance
    ```

    Validar com greps:

    ```bash
    log=/tmp/17-03-hierarchy-check.log
    grep -E "code-analyzer\s+\|\s+specialist\s+\|\s+engineering\s+\|\s+parallel\s+\|\s+orchestrator-maintenance" "$log" || { echo "FAIL code-analyzer"; exit 1; }
    grep -E "doc-before-after\s+\|\s+specialist\s+\|\s+analytics\s+\|\s+parallel\s+\|\s+user-profiler" "$log" || { echo "FAIL doc-before-after"; exit 1; }
    grep -E "orchestrator-maintenance\s+\|\s+specialist\s+\|\s+engineering\s+\|\s+serial\s+\|\s+executor" "$log" || { echo "FAIL orchestrator-maintenance"; exit 1; }
    grep -E "qa-loop\s+\|\s+specialist\s+\|\s+quality\s+\|\s+serial_gate\s+\|\s+verifier" "$log" || { echo "FAIL qa-loop"; exit 1; }
    grep -E "research-doc\s+\|\s+specialist\s+\|\s+engineering\s+\|\s+parallel\s+\|\s+orchestrator-maintenance" "$log" || { echo "FAIL research-doc"; exit 1; }
    grep -E "supabase-diagnostician\s+\|\s+specialist\s+\|\s+quality\s+\|\s+parallel\s+\|\s+verifier" "$log" || { echo "FAIL supabase-diagnostician"; exit 1; }
    grep -E "supabase-executor\s+\|\s+specialist\s+\|\s+engineering\s+\|\s+serial\s+\|\s+orchestrator-maintenance" "$log" || { echo "FAIL supabase-executor"; exit 1; }
    echo "ALL-HIERARCHY-OK"
    ```

    **Passo 3.3 — Query de contagem total:**

    ```bash
    psql "$DATABASE_URL" -c "
      SELECT
        COUNT(*) AS total_agents,
        COUNT(*) FILTER (WHERE role = 'ceo') AS ceo_count,
        COUNT(*) FILTER (WHERE role = 'head') AS head_count,
        COUNT(*) FILTER (WHERE role = 'specialist') AS specialist_count
      FROM agents
      WHERE company_id = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6';
    " 2>&1 | tee -a /tmp/17-03-hierarchy-check.log
    ```

    Esperado: `total_agents=26 ceo_count=1 head_count=4 specialist_count=21`. Total bate com 25 do AGENT_MAPPING + 1 CEO pré-existente (que não está no mapping mas existe no DB).

    **Passo 3.4 — Atualizar `17-03-SYNC-OUTPUT.md`:**

    Adicionar bloco "Verificação SQL de hierarquia" com:
    - Comando psql exato
    - Output literal de `/tmp/17-03-hierarchy-check.log` (tabela formatada)
    - Tabela de validação por slug com checkmarks (✓/✗)
    - Output da query de contagem com totais

    Usar Edit (preservar Runs 1-3 já populados).
  </action>

  <verify>
    <automated>cd /home/tech-lead/Documentos/DEV/paperclip-master && log=/tmp/17-03-hierarchy-check.log && fails=0 && for spec in "code-analyzer.*engineering.*parallel.*orchestrator-maintenance" "doc-before-after.*analytics.*parallel.*user-profiler" "orchestrator-maintenance.*engineering.*serial.*executor" "qa-loop.*quality.*serial_gate.*verifier" "research-doc.*engineering.*parallel.*orchestrator-maintenance" "supabase-diagnostician.*quality.*parallel.*verifier" "supabase-executor.*engineering.*serial.*orchestrator-maintenance"; do grep -qE "$spec" "$log" || { echo "FAIL: $spec"; fails=$((fails+1)); }; done; total=$(grep -oE "total_agents[[:space:]]*\|[[:space:]]*[0-9]+" "$log" | grep -oE "[0-9]+$" | head -1); spec_count=$(grep -oE "specialist_count[[:space:]]*\|[[:space:]]*[0-9]+" "$log" | grep -oE "[0-9]+$" | head -1); echo "total=$total specialist_count=$spec_count fails=$fails"; [ "$fails" = "0" ] && [ "$total" = "26" ] && [ "$spec_count" = "21" ] && echo "HIERARCHY-VERIFIED" || echo "HIERARCHY-FAIL"</automated>
  </verify>

  <acceptance_criteria>
    - Query psql executou sem erro de conexão (sem "FATAL: ..." ou "could not connect")
    - As 7 linhas esperadas aparecem em `/tmp/17-03-hierarchy-check.log` cada uma matching o pattern `slug.*department.*policy.*reports_to_slug`
    - `reports_to_slug` correto para cada um dos 7 (verificado por todos os 7 greps em Passo 3.2)
    - Query de contagem retorna `total_agents = 26`, `head_count = 4`, `specialist_count = 21`
    - `17-03-SYNC-OUTPUT.md` contém bloco "Verificação SQL de hierarquia" com:
      - Output literal da tabela do psql
      - Tabela markdown de checagens (slug → expected reports_to → actual reports_to → ✓/✗)
      - Bloco de contagem total com 26/1/4/21
    - Commit criado com prefixo `chore(17-03): verify hierarchy in production (26 agents, 7 new with correct reports_to)`
  </acceptance_criteria>

  <done>
    Hierarquia `reports_to` verificada em produção via SQL para todos os 7 novos agentes. Contagens totais batem com o mapping (1 CEO + 4 Heads + 21 specialists = 26). Auditoria persistida em 17-03-SYNC-OUTPUT.md.
  </done>
</task>

</tasks>

<verification>
Após todas as tarefas:

```bash
# 1. Idempotência: 4ª execução do sync deve dar zero-op
cd /home/tech-lead/Documentos/DEV/paperclip-master
set -a; source .paperclip/.env; set +a
pnpm sync-agents 2>&1 | tee /tmp/17-03-final-check.log
grep -cE "✓.*created" /tmp/17-03-final-check.log    # esperado: 0
grep -cE "✓.*unchanged" /tmp/17-03-final-check.log  # esperado: 25

# 2. Re-validar hierarquia uma vez via psql
psql "$DATABASE_URL" -c "
  SELECT COUNT(*) FROM agents
  WHERE company_id = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6'
    AND metadata->>'frameworkSlug' IN ('orchestrator-maintenance','research-doc','code-analyzer','qa-loop','supabase-executor','supabase-diagnostician','doc-before-after');
"
# esperado: 7

# 3. Confirmar arquivo de auditoria completo
wc -l .planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md  # esperado: ≥ 30
grep -c "Run [0-9]" .planning/phases/17-funda-o-dos-agentes/17-03-SYNC-OUTPUT.md  # esperado: ≥ 3
```
</verification>

<success_criteria>
- 7 novos agentes existem na in100tiva com metadata.frameworkSlug correto
- Cada um dos 7 tem `reports_to` apontando ao agent correto conforme tabela canônica
- `pnpm sync-agents` é idempotente (Run 3 reporta 0 created, 25 unchanged)
- Total de agents na in100tiva = 26 (1 CEO + 4 Heads + 21 specialists)
- 17-03-SYNC-OUTPUT.md persistido com auditoria de 3 runs + verificação SQL
- 3 commits atômicos (pré-flight + apply/idempotency + SQL verify)
</success_criteria>

<output>
After completion, create `.planning/phases/17-funda-o-dos-agentes/17-03-SUMMARY.md`
</output>
