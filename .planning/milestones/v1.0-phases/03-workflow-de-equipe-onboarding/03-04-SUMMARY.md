---
phase: 03-workflow-de-equipe-onboarding
plan: 04
subsystem: testing
tags: [smoke-test, cross-machine, human-uat, e2e, supabase, better-auth, team-workflow]

requires:
  - phase: 02-migra-o-de-storage-para-supabase
    provides: Supabase remoto operacional, cookie prefix `paperclip-team-shared` validado, server `authenticated` mode invocável
  - phase: 03-workflow-de-equipe-onboarding (waves 1-2 anteriores)
    provides: ONBOARDING.md (pré-requisito do smoke), TROUBLESHOOTING.md (recovery paths), scripts/setup.ts (env validation)
provides:
  - Procedimento manual de smoke E2E cross-machine canônico (D-13) com fallback single-host (D-14) e bloco de log (D-15)
  - Lista HUMAN-UAT explícita (UAT-03-01 cross-machine, UAT-03-02 5+ devs) com SQL de validação para TEAM-01
  - Frame de "complete-with-pending-UAT" para a Phase 3 fechar artefatos sem fingir validação humana
affects: [phase-03-closure, future-team-onboarding-runs, milestone-v1-acceptance]

tech-stack:
  added: []
  patterns:
    - "Documentação de procedimento humano com ramo canônico (cross-machine) + fallback aceito (single-host) + bloco de log timestamped"
    - "HUMAN-UAT como tipo de entregável de primeira classe quando o executor não pode validar honestamente sozinho"

key-files:
  created:
    - .planning/phases/03-workflow-de-equipe-onboarding/CROSS-MACHINE-SMOKE.md
    - .planning/phases/03-workflow-de-equipe-onboarding/03-HUMAN-UAT.md
  modified: []

key-decisions:
  - "Procedimento cross-machine canônico travado em D-13 (Dev A cria company → Dev B em outra máquina vê → Dev B cria task → Dev A vê após refresh)"
  - "Fallback single-host (D-14) aceito com limitação explícita: prova interoperabilidade entre sessions na mesma máquina, NÃO entre máquinas físicas distintas"
  - "TEAM-04 e TEAM-01 roteados para HUMAN-UAT em vez de fingidos como auto-passable — executor (Claude em ambiente único) não tem duas máquinas distintas nem 5+ contas reais"
  - "Phase 3 pode fechar como 'complete-with-pending-UAT' — artefatos entregues, validação humana fica como trabalho contínuo da equipe"

patterns-established:
  - "HUMAN-UAT.md por fase: lista itens que o executor automatizado não pode validar; status pending por default; fallbacks parciais aceitos com sufixos de status (pending-cross-machine, pending-team-growth)"
  - "SQL de validação inline copy-paste para itens UAT que envolvem inspeção de DB compartilhada (Supabase Studio SQL Editor)"

requirements-completed: [TEAM-04]

duration: ~3min
completed: 2026-04-26
---

# Phase 3 Plan 04: Smoke E2E Cross-Machine + HUMAN-UAT Routing Summary

**Procedimento manual canônico de smoke cross-machine (Dev A em máquina X → Dev B em máquina Y vê company compartilhada via Supabase remoto + cookie `paperclip-team-shared`) com fallback single-host explicitamente limitado, e roteamento honesto de TEAM-04 + TEAM-01 para HUMAN-UAT em vez de fingir validação automatizada**

## Performance

- **Duração:** ~3 min
- **Iniciado:** 2026-04-26T04:45:50Z
- **Concluído:** 2026-04-26T04:47:48Z
- **Tarefas:** 2
- **Arquivos modificados:** 2 (ambos criados, zero modificados)

## Realizações

- `CROSS-MACHINE-SMOKE.md` (142 linhas) documenta o procedimento canônico D-13 + fallback single-host D-14 + bloco de log timestamped D-15, todo em pt-br consistente com `ONBOARDING.md`/`TROUBLESHOOTING.md` da Wave 1.
- `03-HUMAN-UAT.md` (82 linhas) com frontmatter YAML válido, dois UATs (`UAT-03-01` cross-machine TEAM-04, `UAT-03-02` 5+ devs TEAM-01), SQL pronto pra copy-paste no Supabase Studio, e fallbacks parciais aceitos com sufixos de status.
- TEAM-04 satisfeito enquanto **artefato** (procedimento existe e está auto-suficiente); validação **empírica** explicitamente roteada para HUMAN-UAT — sinal honesto de "infra OK + flow documentado, falta humano executar".

## Commits das Tarefas

Cada tarefa foi comitada atomicamente:

1. **Tarefa 1: Criar CROSS-MACHINE-SMOKE.md com procedimento + fallback** — `9752f29` (docs)
2. **Tarefa 2: Criar 03-HUMAN-UAT.md roteando execução real para humanos** — `9683466` (docs)

## Arquivos Criados/Modificados

- `.planning/phases/03-workflow-de-equipe-onboarding/CROSS-MACHINE-SMOKE.md` — Procedimento canônico cross-machine (Dev A/Dev B em máquinas distintas), fallback single-host (two-browser-profiles), critérios PASS/FAIL explícitos, bloco de log "Execução N", recovery paths linkando TROUBLESHOOTING.md.
- `.planning/phases/03-workflow-de-equipe-onboarding/03-HUMAN-UAT.md` — Frontmatter YAML (`type: human-uat`, `status: pending`), dois UATs com Acceptance/Fallback/Quando aprovado, SQL de validação para TEAM-01 (count users + membership por company), sumário "complete-with-pending-UAT".

## Decisões Tomadas

- **Por que HUMAN-UAT em vez de "automated smoke":** O executor Claude roda em ambiente único — não tem duas máquinas físicas distintas nem 5+ contas reais. Fingir validação seria desonesto. UAT-driven é o frame correto: artefatos (docs) entregues automaticamente, execução real fica visível como pending.
- **Por que `complete-with-pending-UAT` é aceitável para fechar Phase 3:** Os UATs validam comportamento operacional contínuo da equipe (cross-machine sharing, team growth) que naturalmente é assíncrono em relação ao planejamento. Bloquear o close da fase nessas validações criaria ciclo onde a fase só fecha quando todos os 5 devs onboardarem — antitético à abordagem incremental.
- **Frontmatter YAML com `---`** (não `***` como o plano sugeriu textualmente): consistência com `02-HUMAN-UAT.md` existente e regex `/^---/m` do verify automatizado.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. A única ajuste textual (frontmatter `---` vs `***`) foi alinhamento com o padrão da Phase 2 que o próprio plano referencia como `read_first`, e a verify regex do plano já esperava `/^---/m`.

## Problemas Encontrados

Nenhum.

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária por este plano. Os UATs criados aqui descrevem ações humanas operacionais (executar smoke, cadastrar devs), não setup de infra.

## Prontidão para Próxima Fase

- **Phase 3 Wave 2 status:** Plano 03-04 completo. Plano 03-05 (próximo paralelo da Wave 2) precisa entregar o procedimento de bootstrap CEO + cadastro coletivo referenciado por `UAT-03-02`.
- **Para fechar Phase 3:** Wave 2 completa entrega todos os artefatos. Os dois UATs ficam `pending` indefinidamente até a equipe rodar — isso é o estado esperado e desejado.
- **Para o executor de plano 03-05:** este SUMMARY linka `03-HUMAN-UAT.md` que referencia `03-05-PLAN.md` — ao concluir, garantir que o procedimento de bootstrap descrito no plano 03-05 satisfaz o "Procedure" listado em UAT-03-02.

## Self-Check: PASSED

- `.planning/phases/03-workflow-de-equipe-onboarding/CROSS-MACHINE-SMOKE.md` — FOUND (142 lines, all 13 acceptance regex checks pass)
- `.planning/phases/03-workflow-de-equipe-onboarding/03-HUMAN-UAT.md` — FOUND (82 lines, all 11 acceptance regex checks pass; pendingCount=4 ≥2; fallbackCount=4 ≥2)
- Commit `9752f29` — FOUND (Tarefa 1)
- Commit `9683466` — FOUND (Tarefa 2)

---
*Fase: 03-workflow-de-equipe-onboarding*
*Concluída: 2026-04-26*
