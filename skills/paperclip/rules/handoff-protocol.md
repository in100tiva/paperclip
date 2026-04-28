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
  Valid values: `research` | `execution` | `qa` | `deploy` | `diagnostic` | `documentation`
- **upstream_findings** (required, object): what the previous agents told you.
  - `research_doc` (string|null): only the research-doc agent populates this; downstream agents copy it forward unchanged
  - `code_analyzer` (string|null): only the code-analyzer agent populates this
  - `prior_artifacts` (string[]): file paths of relevant artifacts from upstream
- **decisions_made** (required, array): non-trivial choices made during this stage.
  Empty array `[]` is valid for purely mechanical stages.
- **artifacts_produced** (required, array): every file this agent created or
  modified, with type and one-sentence summary.
- **qa_gate_status** (required, string enum): current gate state.
  Valid values: `n/a` | `PENDING` | `APPROVED` | `RETRY` | `PARTIAL_SUCCESS`
  - `n/a` — stage doesn't run through QA (e.g., research)
  - `PENDING` — execution stage finished, awaiting QA-Loop
  - `APPROVED` — QA-Loop confirmed coverage >= 80%
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

### Response Shape

A successful PUT returns:

```json
{
  "id": "<document-id>",
  "key": "pipeline-handoff",
  "latestRevisionId": "<revision-id>",
  "latestRevisionNumber": 1,
  "updatedAt": "<ISO8601>"
}
```

Store `latestRevisionId` if you plan to overwrite this document in a subsequent
retry — pass it as `baseRevisionId` on the next PUT.

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
- **Omitting `upstream_findings` entirely.** Even if you are the first agent in the
  pipeline, include `upstream_findings` with `prior_artifacts: []` — the orchestrator
  reads this field unconditionally.
- **Using a different document key.** The key MUST be exactly `pipeline-handoff`
  (lowercase, hyphen-separated). Any other key will not be found by the orchestrator.

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
