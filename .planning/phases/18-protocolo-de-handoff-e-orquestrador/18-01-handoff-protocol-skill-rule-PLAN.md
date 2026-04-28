---
phase: 18-protocolo-de-handoff-e-orquestrador
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude/skills/paperclip/rules/handoff-protocol.md
  - .claude/skills/paperclip/SKILL.md
autonomous: true
requirements:
  - HAND-01
  - HAND-02
  - HAND-03

must_haves:
  truths:
    - "Desenvolvedor abre `.claude/skills/paperclip/rules/handoff-protocol.md` e encontra o schema canônico `pipeline-handoff` com os 5 campos: pipeline_stage, upstream_findings, decisions_made, artifacts_produced, qa_gate_status"
    - "O arquivo de regra contém um exemplo YAML completo de `pipeline-handoff` que outro agente pode copiar e adaptar sem perguntas"
    - "O arquivo de regra documenta a regra de persistência: `PUT /api/issues/:issueId/documents/pipeline-handoff` (não comentário de thread)"
    - "SKILL.md tem uma seção (ou bullet em seção existente) que aponta para `rules/handoff-protocol.md` como fonte canônica"
  artifacts:
    - path: ".claude/skills/paperclip/rules/handoff-protocol.md"
      provides: "Regra canônica do protocolo pipeline-handoff (schema + persistência + emissão)"
      min_lines: 120
      contains: "pipeline_stage"
    - path: ".claude/skills/paperclip/SKILL.md"
      provides: "Skill central com referência a handoff-protocol.md"
      contains: "rules/handoff-protocol.md"
  key_links:
    - from: ".claude/skills/paperclip/SKILL.md"
      to: ".claude/skills/paperclip/rules/handoff-protocol.md"
      via: "Markdown link em seção de regras inter-agente"
      pattern: "rules/handoff-protocol\\.md"
    - from: ".claude/skills/paperclip/rules/handoff-protocol.md"
      to: "documentService.upsertIssueDocument"
      via: "Referência ao endpoint PUT /api/issues/:issueId/documents/:key e ao service que persiste"
      pattern: "issue_documents|pipeline-handoff"
---

<objective>
Criar o arquivo de regra `rules/handoff-protocol.md` na skill `paperclip` que define o schema canônico `pipeline-handoff`, regras de emissão e persistência via `issue_documents`. Atualizar `SKILL.md` para apontar para essa regra.

Purpose: Estabelecer fonte única de verdade para o protocolo de handoff antes de qualquer agente referenciá-lo. Sem esta regra, cada agente inventaria seu próprio formato — exatamente o problema que HAND-01..03 existe para resolver.

Output: Arquivo `rules/handoff-protocol.md` com schema YAML canônico + regras de persistência + exemplos. SKILL.md aponta para o novo arquivo. Cobre HAND-01 (schema), HAND-02 (todo agente emite), HAND-03 (persistência via issue_documents).
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

@.claude/skills/paperclip/SKILL.md
@server/src/services/documents.ts
@server/src/services/issue-continuation-summary.ts

<interfaces>
<!-- Endpoint canônico de persistência (já existente, não criar) -->
PUT /api/issues/:issueId/documents/:key
Body: { "title": string, "format": "markdown"|"yaml", "body": string, "baseRevisionId": string|null }

Response: { "id", "key", "latestRevisionId", "latestRevisionNumber", "updatedAt" }

<!-- O `key` para handoff DEVE ser exatamente "pipeline-handoff" (HAND-03) -->
<!-- Body do document é YAML em string (format: "yaml" ou "markdown" com bloco yaml) -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Tarefa 1: Criar `.claude/skills/paperclip/rules/handoff-protocol.md` com schema canônico</name>
  <files>.claude/skills/paperclip/rules/handoff-protocol.md</files>
  <read_first>
    - .planning/phases/18-protocolo-de-handoff-e-orquestrador/18-CONTEXT.md (decisões D-HAND-01 a D-HAND-04 — schema verbatim)
    - .claude/skills/paperclip/SKILL.md (estilo de redação, convenções da skill, formato dos blocos de exemplo)
    - server/src/services/documents.ts (linhas 1-80 para confirmar shape do upsert)
  </read_first>
  <action>
Criar o arquivo `.claude/skills/paperclip/rules/handoff-protocol.md` com a estrutura abaixo. Use o schema do 18-CONTEXT.md verbatim (decisão D-HAND-01). O arquivo é a fonte canônica — todo agente que precise emitir handoff vai ler este arquivo.

Estrutura obrigatória do arquivo (cabeçalhos H2 exatos):

```markdown
# Pipeline Handoff Protocol

> Canonical handoff format for the in100tiva v1.3 maintenance pipeline. Every agent
> in the pipeline (orchestrator-maintenance, research-doc, code-analyzer, qa-loop,
> supabase-executor, supabase-diagnostician, doc-before-after) MUST emit a
> `pipeline-handoff` document before finishing its task.

## When to Emit

Emit a `pipeline-handoff` document at the END of every pipeline task, just before
patching the issue to `done` / `in_review`. The handoff is what the next agent
(or the orchestrator) reads to continue — without it, the pipeline cannot resume.

Emission rules:

1. ONE handoff per agent per pipeline stage. If you retry, overwrite the existing
   document (use `baseRevisionId` from the previous read).
2. Emit BEFORE the final `PATCH /api/issues/:issueId` status update. The handoff
   is part of the contract; status `done` without a handoff is a protocol violation.
3. Persist via `issue_documents` (key `pipeline-handoff`), NEVER via thread comments.
4. The body is YAML (preferred) or a markdown document with a single ```yaml block.

## Canonical Schema

Document key: `pipeline-handoff`
Document title: `Pipeline Handoff — <agent-name>` (e.g., "Pipeline Handoff — code-analyzer")
Document format: `yaml`

```yaml
pipeline_stage: research      # one of: research | execution | qa | deploy | diagnostic | documentation
upstream_findings:            # what previous agents discovered (omit fields that don't apply)
  research_doc: |             # findings from external docs/repos (research-doc only)
    Multi-line summary of canonical patterns found.
  code_analyzer: |            # location of failure in local code (code-analyzer only)
    Multi-line diagnostic of where the bug lives.
  prior_artifacts:            # paths of artifacts from upstream stages
    - server/src/services/foo.ts
    - .planning/phases/18-.../some-doc.md
decisions_made:               # decisions THIS agent made during this stage
  - decision: "Use jose instead of jsonwebtoken"
    rationale: "jsonwebtoken has CommonJS issues with Edge runtime; jose is ESM-native"
  - decision: "Apply migration in two steps"
    rationale: "ALTER TABLE on large table requires backfill before NOT NULL constraint"
artifacts_produced:           # what THIS agent delivered
  - path: server/src/services/auth.ts
    type: code                # one of: code | doc | test | config | diagnostic
    summary: "Added JWT validation with refresh rotation"
  - path: server/src/services/auth.test.ts
    type: test
    summary: "12 tests covering happy path + 4 error cases"
qa_gate_status: PENDING       # one of: n/a | PENDING | APPROVED | RETRY | PARTIAL_SUCCESS
```

### Field Reference

- **pipeline_stage** (required, string enum): which stage of the pipeline emitted
  this handoff. Used by orchestrator-maintenance to route the next agent.
- **upstream_findings** (required, object): what the previous agents told you.
  - `research_doc` (string|null): only the research-doc agent populates this; downstream agents copy it forward unchanged
  - `code_analyzer` (string|null): only the code-analyzer agent populates this
  - `prior_artifacts` (string[]): file paths of relevant artifacts from upstream
- **decisions_made** (required, array): non-trivial choices made during this stage.
  Empty array `[]` is valid for purely mechanical stages.
- **artifacts_produced** (required, array): every file this agent created or
  modified, with type and one-sentence summary.
- **qa_gate_status** (required, string enum): current gate state.
  - `n/a` — stage doesn't run through QA (e.g., research)
  - `PENDING` — execution stage finished, awaiting QA-Loop
  - `APPROVED` — QA-Loop confirmed coverage ≥ 80%
  - `RETRY` — QA-Loop saw coverage < 80%, returning task for correction
  - `PARTIAL_SUCCESS` — QA-Loop hit max iterations without gate; tech-debt path triggered

## Persistence

Use the `issue_documents` API directly:

```bash
PUT /api/issues/{issueId}/documents/pipeline-handoff
Headers:
  Authorization: Bearer $PAPERCLIP_API_KEY
  X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
Body: {
  "title": "Pipeline Handoff — <agent-name>",
  "format": "yaml",
  "body": "<YAML body as string>",
  "baseRevisionId": null  // or the latest revision id when overwriting
}
```

If the document already exists (retry case), GET it first to read
`latestRevisionId` and pass it as `baseRevisionId` to satisfy optimistic
concurrency.

After the PUT succeeds, leave a brief comment on the issue with a deep link to
the document:

```markdown
Handoff persisted: [pipeline-handoff](/<prefix>/issues/<issue-identifier>#document-pipeline-handoff)
```

## Anti-Patterns (Will Be Rejected)

- **Posting handoff content as a thread comment.** Comments are not queryable as
  structured documents and cannot be overwritten cleanly across retries.
- **Skipping `qa_gate_status`.** Even non-QA stages must set it (use `n/a`). The
  field is what QA-Loop and the orchestrator branch on.
- **Inventing custom fields at the top level.** If you need extra context, put
  it inside `decisions_made[].rationale` or `artifacts_produced[].summary`.
  Top-level keys are reserved for the canonical 5.
- **Emitting handoff AFTER patching status to `done`.** The contract is: handoff
  first, status update second.

## Sample (Complete, Copy-Adaptable)

```yaml
pipeline_stage: execution
upstream_findings:
  research_doc: |
    Evolution API v2.2 expects webhook URL to be HTTPS-only. PostgREST 12 docs
    confirm `count: exact` is the right header for total-row count.
  code_analyzer: |
    server/src/services/webhook.ts:42 builds URL with http:// when env=dev.
    Same file:67 calls fetch without `count` header — explains missing totals.
  prior_artifacts:
    - .planning/phases/18-.../18-CONTEXT.md
    - server/src/services/webhook.ts
decisions_made:
  - decision: "Force https:// in production, allow http:// only when NODE_ENV=test"
    rationale: "Evolution API rejects http in prod; tests need http for local fixtures"
  - decision: "Add `count: exact` header in pagination helper, not per-call"
    rationale: "Single source of truth; avoids drift across 14 callers"
artifacts_produced:
  - path: server/src/services/webhook.ts
    type: code
    summary: "Force https in prod; throw on http when NODE_ENV=production"
  - path: server/src/services/pagination.ts
    type: code
    summary: "Centralized count: exact header"
  - path: server/src/services/webhook.test.ts
    type: test
    summary: "8 new cases for env-conditional protocol"
qa_gate_status: PENDING
```

## See Also

- `.claude/skills/paperclip/SKILL.md` — main paperclip skill (heartbeat procedure)
- `.claude/agents/orchestrator-maintenance.md` — consumes handoffs to coordinate the pipeline
- `server/src/services/documents.ts` — backend implementation of `upsertIssueDocument`
```

Detalhes obrigatórios:
- TODO o YAML acima copiado verbatim no arquivo (não parafrasear).
- Mínimo 120 linhas no arquivo final.
- Strings dos enums devem aparecer literalmente (`research`, `execution`, `qa`, `deploy`, `diagnostic`, `documentation` para `pipeline_stage`; `n/a`, `PENDING`, `APPROVED`, `RETRY`, `PARTIAL_SUCCESS` para `qa_gate_status`).
- O exemplo "Sample (Complete, Copy-Adaptable)" deve ter os 5 campos preenchidos com valores plausíveis.
  </action>
  <verify>
    <automated>
      test -f .claude/skills/paperclip/rules/handoff-protocol.md \
        && [ "$(wc -l < .claude/skills/paperclip/rules/handoff-protocol.md)" -ge 120 ] \
        && grep -q "pipeline_stage:" .claude/skills/paperclip/rules/handoff-protocol.md \
        && grep -q "upstream_findings:" .claude/skills/paperclip/rules/handoff-protocol.md \
        && grep -q "decisions_made:" .claude/skills/paperclip/rules/handoff-protocol.md \
        && grep -q "artifacts_produced:" .claude/skills/paperclip/rules/handoff-protocol.md \
        && grep -q "qa_gate_status:" .claude/skills/paperclip/rules/handoff-protocol.md \
        && grep -q "PARTIAL_SUCCESS" .claude/skills/paperclip/rules/handoff-protocol.md \
        && grep -q "PUT /api/issues/{issueId}/documents/pipeline-handoff" .claude/skills/paperclip/rules/handoff-protocol.md
    </automated>
  </verify>
  <acceptance_criteria>
    - Arquivo existe em `.claude/skills/paperclip/rules/handoff-protocol.md`
    - Mínimo 120 linhas
    - Os 5 campos canônicos (`pipeline_stage`, `upstream_findings`, `decisions_made`, `artifacts_produced`, `qa_gate_status`) aparecem como chaves YAML (com `:` no final) em pelo menos um bloco de schema
    - Os 5 valores válidos de `qa_gate_status` (`n/a`, `PENDING`, `APPROVED`, `RETRY`, `PARTIAL_SUCCESS`) aparecem listados no doc
    - Os 6 valores válidos de `pipeline_stage` (`research`, `execution`, `qa`, `deploy`, `diagnostic`, `documentation`) aparecem listados no doc
    - O endpoint canônico `PUT /api/issues/{issueId}/documents/pipeline-handoff` aparece literalmente
    - O arquivo contém pelo menos um bloco `## Anti-Patterns` (ou equivalente) listando 3+ anti-padrões
  </acceptance_criteria>
  <done>
    Arquivo de regra existe, schema canônico documentado, exemplo completo presente, regras de persistência claras o suficiente para outro agente seguir sem perguntar.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Tarefa 2: Atualizar `SKILL.md` para apontar para `rules/handoff-protocol.md`</name>
  <files>.claude/skills/paperclip/SKILL.md</files>
  <read_first>
    - .claude/skills/paperclip/SKILL.md (arquivo inteiro — 347 linhas)
    - .claude/skills/paperclip/rules/handoff-protocol.md (criado na Tarefa 1)
  </read_first>
  <action>
Adicionar uma seção curta ao `SKILL.md` que aponte para a nova regra de handoff. A seção vai LOGO APÓS a seção `## Routines` e ANTES de `## Issue Workspace Runtime Controls` (a estrutura existente segue padrão `## Niche Workflow Pointers` → `## Company Skills Workflow` → `## Routines` → `## Issue Workspace Runtime Controls` → `## Critical Rules`).

Conteúdo exato a inserir (uma seção H2 nova):

```markdown
## Pipeline Handoff Protocol (v1.3 Maintenance Pipeline)

If you are an agent in the v1.3 maintenance pipeline (`orchestrator-maintenance`,
`research-doc`, `code-analyzer`, `qa-loop`, `supabase-executor`,
`supabase-diagnostician`, `doc-before-after`), you MUST emit a structured
handoff document at the end of your task before patching the issue status.

The canonical schema, persistence rules, and emission contract live in:

`skills/paperclip/rules/handoff-protocol.md`

Read that file when:
- You are about to finish a pipeline task and have not emitted a handoff yet
- You are an orchestrator about to read upstream handoffs
- You need the exact list of valid values for `pipeline_stage` or `qa_gate_status`

Quick contract:
- Persist via `PUT /api/issues/:issueId/documents/pipeline-handoff` (NEVER via thread comments)
- Emit BEFORE the final status PATCH
- Use YAML body with the 5 canonical fields: `pipeline_stage`, `upstream_findings`, `decisions_made`, `artifacts_produced`, `qa_gate_status`
- Leave a comment with a deep link: `[pipeline-handoff](/<prefix>/issues/<id>#document-pipeline-handoff)`

```

Detalhes:
- Inserir como seção H2 entre `## Routines` e `## Issue Workspace Runtime Controls`.
- NÃO modificar nenhuma outra seção do SKILL.md.
- O caminho referenciado deve ser exatamente `skills/paperclip/rules/handoff-protocol.md` (mesmo padrão usado em outras seções da skill que apontam para `references/...`).
  </action>
  <verify>
    <automated>
      grep -q "Pipeline Handoff Protocol" .claude/skills/paperclip/SKILL.md \
        && grep -q "skills/paperclip/rules/handoff-protocol.md" .claude/skills/paperclip/SKILL.md \
        && grep -q "pipeline_stage" .claude/skills/paperclip/SKILL.md \
        && grep -q "qa_gate_status" .claude/skills/paperclip/SKILL.md
    </automated>
  </verify>
  <acceptance_criteria>
    - SKILL.md tem nova seção H2 com título contendo "Pipeline Handoff Protocol"
    - SKILL.md referencia o caminho `skills/paperclip/rules/handoff-protocol.md`
    - SKILL.md menciona pelo menos os campos `pipeline_stage` e `qa_gate_status` no contrato rápido
    - Nenhuma outra seção do SKILL.md foi alterada (verificar via git diff que apenas a nova seção foi adicionada)
    - A nova seção fica posicionada entre `## Routines` e `## Issue Workspace Runtime Controls`
  </acceptance_criteria>
  <done>
    SKILL.md aponta canonicamente para `rules/handoff-protocol.md`. Agentes que carregam a skill descobrem a regra de handoff sem precisar grep no repo.
  </done>
</task>

</tasks>

<verification>
1. `test -f .claude/skills/paperclip/rules/handoff-protocol.md` retorna 0
2. `grep -c "pipeline_stage" .claude/skills/paperclip/rules/handoff-protocol.md` retorna número ≥ 3 (uma vez no schema, uma no exemplo, uma na referência de campo)
3. `grep -q "rules/handoff-protocol.md" .claude/skills/paperclip/SKILL.md` retorna 0
4. `git diff .claude/skills/paperclip/SKILL.md | grep "^+" | grep -c "^+## "` retorna exatamente 1 (uma única seção H2 adicionada)
</verification>

<success_criteria>
- HAND-01 atendido: schema canônico definido (5 campos, valores enumerados explícitos)
- HAND-02 referenciado: regra estabelece "todo agente do pipeline emite handoff" como requisito
- HAND-03 atendido: persistência via `issue_documents` key `pipeline-handoff` é a única regra documentada
- Outros agentes podem carregar a skill `paperclip` e descobrir a regra via SKILL.md → rules/handoff-protocol.md sem buscar pelo repo
- Schema é copiável verbatim por outro agente (exemplo completo presente)
</success_criteria>

<output>
After completion, create `.planning/phases/18-protocolo-de-handoff-e-orquestrador/18-01-handoff-protocol-skill-rule-SUMMARY.md`
</output>
