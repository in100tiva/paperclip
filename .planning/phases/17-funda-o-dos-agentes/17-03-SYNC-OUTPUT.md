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

## Verificação SQL de hierarquia (preenchida na Tarefa 3)

{a preencher}
