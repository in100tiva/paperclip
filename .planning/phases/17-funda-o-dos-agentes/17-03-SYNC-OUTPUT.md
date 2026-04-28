# 17-03 Sync Output Log

Auditoria de execução de `pnpm sync-agents` para registrar os 7 novos agentes do milestone v1.3 na in100tiva.

## Pré-flight Validations

- Mapping atualizado (25 agentes): OK — `grep -c "AGENT_MAPPING.length !== 25"` retorna 1
- 7 arquivos .md presentes: OK — orchestrator-maintenance, research-doc, code-analyzer, qa-loop, supabase-executor, supabase-diagnostician, doc-before-after todos em `.claude/agents/`
- .paperclip/.env com DATABASE_URL: OK

## Run 1 — Dry-run

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 sync-agents — paperclip in100tiva employee importer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target company: 4b0a1c03-b502-4f28-acfd-dfd646cd5cf6
Mode:           dry-run (no writes)

✓ Company exists: in100tiva (4b0a1c03-b502-4f28-acfd-dfd646cd5cf6)
✓ CEO present: CEO (d64a9f21-3ad0-4ca5-b7e8-58dbefb55b75)

Pass 1: upsert agents (no reports_to yet) ...
Pass 2: link reports_to hierarchy ...
✓ CEO intact: CEO, reportsTo=null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Created:   7
Updated:   0
Unchanged: 18
Skipped:   0
Error:     0

  unchanged  planner                      bef1e57f-a7df-4f6a-b873-5f2b414f0c50
  unchanged  roadmapper                   dc283418-c590-44f4-b220-3eedff0e73ab
  unchanged  project-researcher           e8fabc12-5219-45ee-bbde-c147146980af
  unchanged  phase-researcher             ff4e8376-f949-47ef-b8c6-c607e1999185
  unchanged  advisor-researcher           a2c72047-1945-4898-97d9-3b4883a53604
  unchanged  assumptions-analyzer         66c41bca-807d-4d30-86ec-7add98e8725b
  unchanged  codebase-mapper              d01a6fa5-4762-4fd8-982b-8778b852a8b5
  unchanged  plan-checker                 bfa4f58e-95ae-41be-b3e9-577d4e47bb1c
  unchanged  research-synthesizer         2e24faa8-35b2-4f91-9d03-159b3d72e9ab
  unchanged  executor                     d7af1e4a-dea3-4c64-9a69-98cf881b0c4b
  unchanged  debugger                     aa588543-f594-4ca9-9074-efc23d5467a1
  unchanged  integration-checker          daedf29b-dbe9-4512-839b-839aae5c5a0a
  unchanged  ui-researcher                9e4d0431-c112-4112-8c1a-baba66f8ce43
  created    orchestrator-maintenance     would-insert (dry-run)
  created    research-doc                 would-insert (dry-run)
  created    code-analyzer                would-insert (dry-run)
  created    supabase-executor            would-insert (dry-run)
  unchanged  verifier                     fa6a4fc9-2d13-42d6-8beb-d4585e7a0c5f
  unchanged  nyquist-auditor              6a7187bd-22d1-482b-9dbd-d040cc26d983
  unchanged  ui-auditor                   7aa84d02-14e4-4f39-8c26-fac0d24f0711
  unchanged  ui-checker                   f72337be-17e7-4606-8f21-f288864e8ae5
  created    qa-loop                      would-insert (dry-run)
  created    supabase-diagnostician       would-insert (dry-run)
  unchanged  user-profiler                80a4ad34-2808-4d3e-b2e4-1676f0da7b79
  created    doc-before-after             would-insert (dry-run)

✓ Dry-run complete. No writes performed.
```

### Validações do dry-run

- 7 slugs novos reportados como `created` (would-insert): PASS
- 18 slugs v1.2 reportados como `unchanged`: PASS

## Run 2 — Apply

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 sync-agents — paperclip in100tiva employee importer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target company: 4b0a1c03-b502-4f28-acfd-dfd646cd5cf6
Mode:           apply

✓ Company exists: in100tiva (4b0a1c03-b502-4f28-acfd-dfd646cd5cf6)
✓ CEO present: CEO (d64a9f21-3ad0-4ca5-b7e8-58dbefb55b75)

Pass 1: upsert agents (no reports_to yet) ...
Pass 2: link reports_to hierarchy ...
✓ CEO intact: CEO, reportsTo=null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Created:   7
Updated:   0
Unchanged: 18
Skipped:   0
Error:     0

  unchanged  planner                      bef1e57f-a7df-4f6a-b873-5f2b414f0c50
  unchanged  roadmapper                   dc283418-c590-44f4-b220-3eedff0e73ab
  unchanged  project-researcher           e8fabc12-5219-45ee-bbde-c147146980af
  unchanged  phase-researcher             ff4e8376-f949-47ef-b8c6-c607e1999185
  unchanged  advisor-researcher           a2c72047-1945-4898-97d9-3b4883a53604
  unchanged  assumptions-analyzer         66c41bca-807d-4d30-86ec-7add98e8725b
  unchanged  codebase-mapper              d01a6fa5-4762-4fd8-982b-8778b852a8b5
  unchanged  plan-checker                 bfa4f58e-95ae-41be-b3e9-577d4e47bb1c
  unchanged  research-synthesizer         2e24faa8-35b2-4f91-9d03-159b3d72e9ab
  unchanged  executor                     d7af1e4a-dea3-4c64-9a69-98cf881b0c4b
  unchanged  debugger                     aa588543-f594-4ca9-9074-efc23d5467a1
  unchanged  integration-checker          daedf29b-dbe9-4512-839b-839aae5c5a0a
  unchanged  ui-researcher                9e4d0431-c112-4112-8c1a-baba66f8ce43
  created    orchestrator-maintenance     d7835a62-e76a-4c21-a9fd-8a0d13046986
  created    research-doc                 4029d35a-dbdd-40f4-858d-08da11679de1
  created    code-analyzer                8a303df6-1ca0-4450-bd10-b3a51a823df9
  created    supabase-executor            fda7519e-a2e6-4bc7-9e53-059ec1713fc1
  unchanged  verifier                     fa6a4fc9-2d13-42d6-8beb-d4585e7a0c5f
  unchanged  nyquist-auditor              6a7187bd-22d1-482b-9dbd-d040cc26d983
  unchanged  ui-auditor                   7aa84d02-14e4-4f39-8c26-fac0d24f0711
  unchanged  ui-checker                   f72337be-17e7-4606-8f21-f288864e8ae5
  created    qa-loop                      f3657484-9f91-4a37-8b19-09ae203a8874
  created    supabase-diagnostician       b0b9876f-8055-4d2f-ac04-c7b70ca4006a
  unchanged  user-profiler                80a4ad34-2808-4d3e-b2e4-1676f0da7b79
  created    doc-before-after             ff9cc41a-552f-4a47-839d-c60236f24ea1

✓ Sync complete.
```

### Validações do Run 2

- 7 `created` (com UUID concreto): PASS
- 18 `unchanged` para v1.2: PASS
- 0 `updated`: PASS
- 0 erros: PASS

## Run 3 — Idempotência

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 sync-agents — paperclip in100tiva employee importer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target company: 4b0a1c03-b502-4f28-acfd-dfd646cd5cf6
Mode:           apply

✓ Company exists: in100tiva (4b0a1c03-b502-4f28-acfd-dfd646cd5cf6)
✓ CEO present: CEO (d64a9f21-3ad0-4ca5-b7e8-58dbefb55b75)

Pass 1: upsert agents (no reports_to yet) ...
Pass 2: link reports_to hierarchy ...
✓ CEO intact: CEO, reportsTo=null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Created:   0
Updated:   0
Unchanged: 25
Skipped:   0
Error:     0

  unchanged  planner                      bef1e57f-a7df-4f6a-b873-5f2b414f0c50
  unchanged  roadmapper                   dc283418-c590-44f4-b220-3eedff0e73ab
  unchanged  project-researcher           e8fabc12-5219-45ee-bbde-c147146980af
  unchanged  phase-researcher             ff4e8376-f949-47ef-b8c6-c607e1999185
  unchanged  advisor-researcher           a2c72047-1945-4898-97d9-3b4883a53604
  unchanged  assumptions-analyzer         66c41bca-807d-4d30-86ec-7add98e8725b
  unchanged  codebase-mapper              d01a6fa5-4762-4fd8-982b-8778b852a8b5
  unchanged  plan-checker                 bfa4f58e-95ae-41be-b3e9-577d4e47bb1c
  unchanged  research-synthesizer         2e24faa8-35b2-4f91-9d03-159b3d72e9ab
  unchanged  executor                     d7af1e4a-dea3-4c64-9a69-98cf881b0c4b
  unchanged  debugger                     aa588543-f594-4ca9-9074-efc23d5467a1
  unchanged  integration-checker          daedf29b-dbe9-4512-839b-839aae5c5a0a
  unchanged  ui-researcher                9e4d0431-c112-4112-8c1a-baba66f8ce43
  unchanged  orchestrator-maintenance     d7835a62-e76a-4c21-a9fd-8a0d13046986
  unchanged  research-doc                 4029d35a-dbdd-40f4-858d-08da11679de1
  unchanged  code-analyzer                8a303df6-1ca0-4450-bd10-b3a51a823df9
  unchanged  supabase-executor            fda7519e-a2e6-4bc7-9e53-059ec1713fc1
  unchanged  verifier                     fa6a4fc9-2d13-42d6-8beb-d4585e7a0c5f
  unchanged  nyquist-auditor              6a7187bd-22d1-482b-9dbd-d040cc26d983
  unchanged  ui-auditor                   7aa84d02-14e4-4f39-8c26-fac0d24f0711
  unchanged  ui-checker                   f72337be-17e7-4606-8f21-f288864e8ae5
  unchanged  qa-loop                      f3657484-9f91-4a37-8b19-09ae203a8874
  unchanged  supabase-diagnostician       b0b9876f-8055-4d2f-ac04-c7b70ca4006a
  unchanged  user-profiler                80a4ad34-2808-4d3e-b2e4-1676f0da7b79
  unchanged  doc-before-after             ff9cc41a-552f-4a47-839d-c60236f24ea1

✓ Sync complete.
```

### Validações do Run 3

- 0 `created`: PASS (idempotência confirmada)
- 25 `unchanged`: PASS
- 0 `updated`: PASS
- 0 erros: PASS

### Resumo de contagens

| Run | created | updated | unchanged | erros |
|-----|---------|---------|-----------|-------|
| 1 dry-run | 7 (would-insert) | 0 | 18 | 0 |
| 2 apply | 7 | 0 | 18 | 0 |
| 3 idempotent | 0 | 0 | 25 | 0 |

## Verificação SQL de hierarquia

### Consulta executada

Consulta executada via Node.js/Drizzle (tsx) contra Supavisor pooler — mesmo mecanismo do `sync.ts` (psql não disponível na máquina, mas o resultado é idêntico por usar a mesma conexão Postgres).

### Resultado da query de hierarquia

```
=== Hierarchy Query Results ===

slug                     | role        | department  | policy      | reports_to_slug          | reports_to_id
-------------------------|-------------|-------------|-------------|--------------------------|--------------------------------------
code-analyzer            | specialist  | engineering | parallel    | orchestrator-maintenance  | d7835a62-e76a-4c21-a9fd-8a0d13046986
doc-before-after         | specialist  | analytics   | parallel    | user-profiler             | 80a4ad34-2808-4d3e-b2e4-1676f0da7b79
orchestrator-maintenance | specialist  | engineering | serial      | executor                  | d7af1e4a-dea3-4c64-9a69-98cf881b0c4b
qa-loop                  | specialist  | quality     | serial_gate | verifier                  | fa6a4fc9-2d13-42d6-8beb-d4585e7a0c5f
research-doc             | specialist  | engineering | parallel    | orchestrator-maintenance  | d7835a62-e76a-4c21-a9fd-8a0d13046986
supabase-diagnostician   | specialist  | quality     | parallel    | verifier                  | fa6a4fc9-2d13-42d6-8beb-d4585e7a0c5f
supabase-executor        | specialist  | engineering | serial      | orchestrator-maintenance  | d7835a62-e76a-4c21-a9fd-8a0d13046986
```

### Tabela de validação por slug

| slug | reports_to esperado | reports_to real | status |
|------|---------------------|-----------------|--------|
| code-analyzer | orchestrator-maintenance | orchestrator-maintenance | ✓ |
| doc-before-after | user-profiler | user-profiler | ✓ |
| orchestrator-maintenance | executor | executor | ✓ |
| qa-loop | verifier | verifier | ✓ |
| research-doc | orchestrator-maintenance | orchestrator-maintenance | ✓ |
| supabase-diagnostician | verifier | verifier | ✓ |
| supabase-executor | orchestrator-maintenance | orchestrator-maintenance | ✓ |

**Resultado: 7/7 PASSED**

### Resultado da query de contagem

```
=== Count Query Results ===

total_agents | ceo_count | head_count | specialist_count
-------------|-----------|------------|------------------
27           | 1         | 4          | 21
```

### Nota sobre total_agents = 27

O plano previa `total_agents = 26` (1 CEO + 4 Heads + 21 specialists). O banco retorna 27 porque há um agente pré-existente `CTO` (role=`cto`, id=`7f398adc-dd71-4ecd-a086-dc7bdc78d006`, sem `frameworkSlug`) que não estava no mapping v1.2 e não foi tocado pelo sync. Framework agents = 26 (conforme esperado); total da empresa = 27 por conta do CTO legado.

Os invariantes do framework estão corretos:
- ceo_count = 1 ✓
- head_count = 4 ✓
- specialist_count = 21 ✓
- 7 novos agentes com reports_to correto ✓

### Validações executadas

```
✓ code-analyzer: reports_to_slug=orchestrator-maintenance (expected orchestrator-maintenance)
✓ doc-before-after: reports_to_slug=user-profiler (expected user-profiler)
✓ orchestrator-maintenance: reports_to_slug=executor (expected executor)
✓ qa-loop: reports_to_slug=verifier (expected verifier)
✓ research-doc: reports_to_slug=orchestrator-maintenance (expected orchestrator-maintenance)
✓ supabase-diagnostician: reports_to_slug=verifier (expected verifier)
✓ supabase-executor: reports_to_slug=orchestrator-maintenance (expected orchestrator-maintenance)

✓ ceo_count = 1 (expected 1)
✓ head_count = 4 (expected 4)
✓ specialist_count = 21 (expected 21)
```

**HIERARCHY-VERIFIED** (7/7 reports_to corretos; discrepância total_agents=27 documentada — CTO pré-existente não gerenciado pelo sync)
