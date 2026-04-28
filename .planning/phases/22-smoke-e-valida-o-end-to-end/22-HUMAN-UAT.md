---
status: pending
phase: 22-smoke-e-valida-o-end-to-end
source: [22-CONTEXT.md, ROADMAP.md phase 22 success criteria]
started: 2026-04-28
updated: 2026-04-28
---

## Teste Atual

[aguardando teste humano — pipeline E2E exige paperclip rodando + Supabase + Claude Code conta ativa]

## Pré-requisitos para o Smoke

Antes de rodar qualquer UAT desta fase, garantir:

1. ✓ paperclip dev rodando localmente apontando para Supabase compartilhado
2. ✓ in100tiva populada com 25 agentes (Fase 17 — verificável via `pnpm sync-agents` retornando "0 created, 25 unchanged")
3. ✓ Conta Claude Code ativa no pool multi-account
4. ⚠ `notion-config.json` com `tech_debt` ID real (não placeholder) — usuário precisa rodar `/setup-notion` ou manualmente criar database e colar ID
5. ⚠ `SUPABASE_ACCESS_TOKEN` disponível via env se a issue de smoke envolver deploy
6. ✓ `skills/paperclip/rules/handoff-protocol.md` existe e é canônica (Fase 18)
7. ✓ Skill `supabase-mcp` registrada e atribuída aos 2 agentes Supabase (Fase 20)

## Testes

### 1. UAT-22-01 — Paralelismo Research-Doc + Code-Analyzer

**objective:** Confirmar que `orchestrator-maintenance` cria EXATAMENTE 2 child issues simultâneas com `parallelismPolicy: parallel`, e que ambas executam ao mesmo tempo (não sequencialmente).

**procedure:**
1. Criar uma issue de manutenção real na in100tiva, atribuída ao agente `Maintenance Tech Lead` (slug `orchestrator-maintenance`). Título: "Smoke E2E v1.3 — fix `<um bug pequeno do repo>`". Description deve mencionar área específica do código.
2. Aguardar o heartbeat acordar o orquestrador
3. Verificar via UI do paperclip (org chart / issue tree) que:
   - 2 child issues foram criadas sob a issue mãe
   - Uma atribuída a Documentation Researcher (research-doc), outra a Code Auditor (code-analyzer)
   - Ambas com status `in_progress` simultaneamente (timestamps próximos)
4. Verificar via UI ou API: GET pipeline-status document → `current_stage: research`, `pending_stages` com 2 entradas

**expected:** 2 child issues paralelas em execução simultânea; pipeline-status persistido após o fan-out.

**result:** [pendente]

---

### 2. UAT-22-02 — Orquestrador distribui escopos disjuntos

**objective:** Confirmar que após receber os 2 handoffs (research + code), o orquestrador cria child issues de execução com `file_scope` disjuntos.

**procedure:**
1. Continuação direta de UAT-22-01 — após Research-Doc e Code-Analyzer terminarem
2. Aguardar wake do orquestrador via `issue_children_completed`
3. Inspecionar as novas child issues de execução criadas:
   - Cada child issue tem `executionPolicy.fileScope` ou descrição com lista de arquivos
   - Comparar duas-a-duas: nenhum arquivo aparece em mais de um escopo
   - Arquivos centrais (`heartbeat.ts`, `mapping.ts`, `db/schema/*`) ficam em escopo SOLO (uma child issue, parallelismPolicy: serial)

**expected:** Distribuição respeita disjuntividade. Arquivos centrais não paralelizam.

**result:** [pendente]

---

### 3. UAT-22-03 — QA-Loop encerra em ≤ 3 iterações com resultado objetivo

**objective:** Confirmar que o gate de 80% funciona com critério de parada explícito.

**procedure:**
1. Após executores terminarem, observar o orquestrador encadear o `QA Engineer` (qa-loop)
2. Inspecionar o handoff do QA-Loop (issue_documents key=pipeline-handoff):
   - `qa_gate_status` é EXATAMENTE um de: `APPROVED`, `RETRY`, `PARTIAL_SUCCESS` (não inventa outros)
   - Se `RETRY` aparece, contar quantas vezes — máximo 3 iterações antes de virar `PARTIAL_SUCCESS`
   - `artifacts_produced` inclui o coverage report com número concreto (ex: `Lines: 82.4%`)
3. Verificar pipeline-status: `iteration` foi incrementada corretamente

**expected:** Gate é objetivo (número, não opinião); cap de 3 iterações respeitado; nunca entra em loop infinito.

**result:** [pendente]

---

### 4. UAT-22-04 — Handoffs estruturados com 5 campos em cada etapa

**objective:** Confirmar que TODO agente do pipeline emitiu um `pipeline-handoff` válido com os 5 campos canônicos.

**procedure:**
1. Para cada child issue do pipeline (research-doc, code-analyzer, executores, qa-loop, supabase-*, doc-before-after):
   - GET /api/issues/{childId}/documents/pipeline-handoff
   - Verificar presença de TODOS os 5 campos: `pipeline_stage`, `upstream_findings`, `decisions_made`, `artifacts_produced`, `qa_gate_status`
   - Verificar que `pipeline_stage` é coerente com o agente (research-doc → "research", qa-loop → "qa", etc.)
2. Conferir que os handoffs do tipo `RETRY` (do qa-loop) listam os testes falhos em `decisions_made`
3. Conferir que NENHUM agente do pipeline finalizou child issue sem pipeline-handoff document

**expected:** 100% dos agentes do pipeline emitiram handoff com 5 campos preenchidos. Zero handoffs ausentes.

**result:** [pendente]

---

### 5. UAT-22-05 — Notion URL no PR quando passRate < 80%

**objective:** Validar o gate de produção end-to-end: débito documentado quando QA não atinge 80%.

**procedure (caminho A — passRate < 80%):**
1. Forçar uma situação onde o QA-Loop encerra com `PARTIAL_SUCCESS` (ex: smoke deliberadamente em código difícil de cobrir)
2. Verificar que o orquestrador executou os Steps A-E do procedimento Notion (do orchestrator-maintenance.md):
   - Página criada no database `tech_debt` do Notion com 8 campos obrigatórios preenchidos
   - URL da página presente no body do PR (gh pr view --json body)
   - `tech_debt_recorded` registrado em pipeline-status

**procedure (caminho B — passRate ≥ 80%):**
1. Em um smoke onde o QA aprovou (`APPROVED`)
2. Verificar que NENHUMA página Notion de débito foi criada
3. Verificar que o PR body NÃO contém URL de Notion-tech_debt

**expected:** A criação de página Notion é condicionada estritamente por `qa_gate_status: PARTIAL_SUCCESS`. Quando aprovado, ciclo termina sem débito.

**result:** [pendente]

---

## Resumo

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Lacunas

(nenhuma até o smoke ser executado pelo operador humano)
