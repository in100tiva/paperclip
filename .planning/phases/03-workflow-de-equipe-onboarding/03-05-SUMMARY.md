---
phase: 03-workflow-de-equipe-onboarding
plan: 05
subsystem: docs
tags: [onboarding, invite-flow, bootstrap_ceo, company_join, supabase, better-auth]

requires:
  - phase: 02-supabase
    provides: "Supabase remoto operacional, Better Auth funcional, schema aplicado, cookie prefix paperclip-team-shared validado"
  - phase: 03-workflow-de-equipe-onboarding
    provides: "ONBOARDING.md (TEAM-02), TROUBLESHOOTING.md (TEAM-05) já criados em Wave 1 (03-02, 03-03)"
provides:
  - "TEAM-SIGNUP-PROCEDURE.md: procedimento documentado de bootstrap CEO + cadastro coletivo de 5+ devs"
  - "SQL queries de validação prontas para executar no Supabase Studio (count users, distribuição por company)"
  - "Fallback explícito (pending-team-growth) quando < 5 devs reais disponíveis"
affects:
  - "03-04-PLAN (HUMAN-UAT) — referenciado por UAT-03-02"
  - "Phase 3 closure — TEAM-01 satisfeito no que é automatizável"

tech-stack:
  added: []
  patterns:
    - "Procedure-doc-only quando execução é HUMAN-UAT (não fingir auto-passable)"
    - "SQL de validação literal embutida no doc para copy-paste no Supabase Studio"
    - "Reuso explícito de fluxo existente (D-09): zero código novo no servidor/UI"

key-files:
  created:
    - ".planning/phases/03-workflow-de-equipe-onboarding/TEAM-SIGNUP-PROCEDURE.md"
  modified: []

key-decisions:
  - "Procedure documenta TODO o fluxo mas NÃO executa nada — execução real é HUMAN-UAT (5+ devs reais cadastrando)"
  - "SQL de validação assume schema com camelCase (user_id, companyId) com nota de fallback para snake_case caso Drizzle gere diferente"
  - "Fallback pending-team-growth aceito explicitamente — proibido falsificar users via SQL direto (viola D-09 e quebra cost attribution na Fase 6)"

patterns-established:
  - "Procedure docs roteiam execução real para HUMAN-UAT quando o critério depende de N humanos reais"
  - "Cross-reference loop fechado: PROCEDURE → HUMAN-UAT → PROCEDURE (caixas de checklist refletindo estado de execução real)"

requirements-completed: [TEAM-01]

duration: ~2min
completed: 2026-04-26
---

# Phase 3 Plan 05: Team Signup Procedure Summary

**Procedimento manual documentando bootstrap CEO via script existente + cadastro coletivo de 4+ devs via fluxo company_join, reusando 100% do invite flow do paperclip (zero código novo) e roteando execução real para HUMAN-UAT.**

## Performance

- **Duração:** ~2min
- **Iniciado:** 2026-04-26T04:45:45Z
- **Concluído:** 2026-04-26T04:47:12Z
- **Tarefas:** 1/1
- **Arquivos criados:** 1
- **Arquivos modificados:** 0

## Realizações

- TEAM-SIGNUP-PROCEDURE.md (185 linhas) com fluxo completo bootstrap_ceo → company_join → admin approval → dashboard compartilhado
- Comando exato do bootstrap script citado literal com flags `--config` e `--base-url`
- Modo `authenticated` documentado como override obrigatório (Better Auth handler não monta em local_trusted, finding 02-06)
- 3 SQL queries de validação prontas: check bootstrap_ceo existente (Passo 1), validação intermediária (1 user/1 company), validação final TEAM-01 (5+ users na company shared)
- Notas operacionais cobrindo: proibição de criar users via SQL, proibição de versionar invite tokens, validação de cookie prefix, revogação de invites não usados
- Cross-references válidos: ONBOARDING.md, TROUBLESHOOTING.md (anchor `#cookie-prefix-divergente`), doc/spec/invite-flow.md, 03-HUMAN-UAT.md (UAT-03-02)

## Commits das Tarefas

1. **Tarefa 1: Criar TEAM-SIGNUP-PROCEDURE.md** — `63f5451` (docs)

## Arquivos Criados/Modificados

- `.planning/phases/03-workflow-de-equipe-onboarding/TEAM-SIGNUP-PROCEDURE.md` — Procedure de cadastro coletivo (TEAM-01)

## Estrutura Final do Procedimento

```
1. Objetivo + critério ROADMAP
2. Visão Geral do Fluxo (ASCII art com 3 atores: CEO, devs novos, admin)
3. Pré-requisitos (Phase 2 closed, .env.local OK, modo authenticated up)
4. Passo 1: Bootstrap CEO (one-time) — SQL pre-check + script + aceite
5. Passo 2: Gerar invites company_join (admin UI loop)
6. Passo 3: Devs aceitam invites (cada dev em sua máquina)
7. Passo 4: Validação Final (SQL count + distribuição por company)
8. Notas Operacionais (proibições + cookie check)
9. Status de Execução (5 checkboxes para HUMAN-UAT)
10. Fallback Aceito (pending-team-growth)
```

## SQL Queries Incluídas

| Query | Local | Propósito |
|-------|-------|-----------|
| `SELECT id, "inviteType", "expiresAt", "acceptedAt", "revokedAt" FROM invites WHERE "inviteType" = 'bootstrap_ceo'` | Passo 1 (pre-check) | Detectar bootstrap já feito |
| `SELECT count(*)::int AS user_count FROM "user"` + `SELECT count(*)::int AS company_count FROM company` | Passo 1 (validação intermediária) | Confirmar 1 user / 1 company após bootstrap |
| `SELECT count(*)::int AS total_users FROM "user"` + JOIN para distribuição por company | Passo 4 (validação final) | Critério TEAM-01: 5+ users, todos na shared company |

Nota explícita no doc sobre fallback de naming convention (camelCase vs snake_case) caso Drizzle gere schema diferente.

## Decisões Tomadas

- **Procedure-doc-only, não execução:** Esta fase pode produzir o procedimento mas NÃO pode fingir cadastrar 5 devs reais (D-09, D-10, D-11). Execução real fica para HUMAN-UAT criado pelo plano 03-04 (paralelo a este).
- **SQL queries com `text id` (Better Auth) e double-quoted identifiers:** Schema Better Auth usa `"user"` (reserved keyword precisa quote) e camelCase via Drizzle (`"userId"`, `"companyId"`). Nota de fallback para snake_case adicionada para robustez.
- **Fallback `pending-team-growth` é critério de PASS condicional:** Se time não tem 5+ devs disponíveis hoje, marca-se status do UAT e re-checa quando atingir. Esta decisão evita pressão para falsificar dados (proibido por D-09).
- **Forward reference para 03-HUMAN-UAT.md aceito:** O arquivo é criado pelo plano 03-04 (Wave 2 paralelo). Link `03-HUMAN-UAT.md#uat-03-02` é dangling temporariamente; será resolvido quando 03-04 commitar. Padrão aceito em waves paralelas.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. O markdown content do PLAN.md (linhas 107-292 do `<action>`) foi escrito literalmente no arquivo de output.

## Problemas Encontrados

Nenhum.

## Configuração Manual Necessária

Nenhuma — este plano produz documentação. A execução real (Bootstrap CEO + 4+ devs) é HUMAN-UAT-03-02 e requer:
- Owner do time disponível para rodar `tsx packages/db/scripts/create-auth-bootstrap-invite.ts` uma vez
- 5+ devs reais com `.env.local` preenchido e willing to onboard via canal interno

## Prontidão para Próxima Fase

- TEAM-01 endereçado no que é automatizável (procedimento + SQL prontos)
- Forward link para `03-HUMAN-UAT.md#uat-03-02` será resolvido quando plano 03-04 (Wave 2 paralelo) commitar
- Phase 3 closure depende de: TEAM-04 (cross-machine smoke), execução do HUMAN-UAT-03-02 (5+ devs reais ou fallback pending-team-growth aceito pelo owner)

## Self-Check

```
FOUND: .planning/phases/03-workflow-de-equipe-onboarding/TEAM-SIGNUP-PROCEDURE.md (185 lines)
FOUND: commit 63f5451 (docs(03-05): document TEAM-01 signup procedure)
PASSED: All 13 acceptance regex checks (bootstrap_ceo, company_join, create-auth-bootstrap-invite, --config, --base-url, PAPERCLIP_DEPLOYMENT_MODE=authenticated, SELECT count, total_users, ONBOARDING.md, invite-flow.md, 03-HUMAN-UAT.md, canal interno, Fallback)
PASSED: Line count >= 80 (actual: 185)
```

## Self-Check: PASSED

---
*Fase: 03-workflow-de-equipe-onboarding*
*Concluída: 2026-04-26*
