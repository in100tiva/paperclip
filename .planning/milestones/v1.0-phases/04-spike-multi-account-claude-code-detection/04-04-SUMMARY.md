---
phase: 04-spike-multi-account-claude-code-detection
plan: 04
subsystem: testing
tags: [claude-cli, multi-account, harness, bash, stream-json, session-id]

requires:
  - phase: 04-spike-multi-account-claude-code-detection
    provides: "CLAUDE_CONFIG_DIR passthrough já existente em execute.ts:253; CLAUDE_429_TAXONOMY.md (plano 04-01); audit findings sobre mecânica de spawn"
provides:
  - "harness/capture-fixture.sh — captura stream-JSON por conta com CLAUDE_CONFIG_DIR isolado"
  - "harness/test-multi-account-resume.sh — smoke multi-account validando session_id per-account + cross-account resume"
  - "harness/README.md — documentação pt-br do fluxo HUMAN-UAT (UAT-04-01..03)"
affects: [04-05, phase-5-multi-account, MULTI-04, MULTI-06, HUMAN-UAT]

tech-stack:
  added: []
  patterns:
    - "Disposable harness em .planning/phases/04-*/harness/ (D-16/D-18) — não em scripts/ raiz"
    - "Pre-flight check pattern: validar account dirs + claude CLI antes de spawn"
    - "Reuso de mecânica de produção: scripts setam CLAUDE_CONFIG_DIR mesmo modo que execute.ts:253"

key-files:
  created:
    - .planning/phases/04-spike-multi-account-claude-code-detection/harness/capture-fixture.sh
    - .planning/phases/04-spike-multi-account-claude-code-detection/harness/test-multi-account-resume.sh
    - .planning/phases/04-spike-multi-account-claude-code-detection/harness/README.md
  modified: []

key-decisions:
  - "Harness vive em .planning/phases/04-*/harness/ (descartável), NÃO em scripts/ raiz — reforça D-16/D-18"
  - "Scripts geram multi-account-empirical.md no mesmo dir para consolidar resultado UAT-04-02 sem duplicar storage"
  - "test-multi-account-resume.sh reusa capture-fixture.sh em vez de duplicar lógica de spawn — single source of truth"
  - "Pre-flight rejeita execução se ~/.paperclip/claude-accounts/{a,b}/ ausentes — mensagem acionável guia operador para claude login"

patterns-established:
  - "Disposable phase harness: scripts auxiliares de fase moram em phases/XX-*/harness/, deletáveis quando fase entrar em produção"
  - "Per-account env isolation: CLAUDE_CONFIG_DIR=$HOME/.paperclip/claude-accounts/<slug> é a unidade de isolamento (mesmo padrão de execute.ts:253)"
  - "Empirical report generation: scripts geram .md de resultado dentro do harness/ com checklist manual para HUMAN-UAT"

requirements-completed: [SPIKE-04, SPIKE-05]

duration: 2min
completed: 2026-04-26
---

# Fase 04 Plano 04: Multi-Account Harness — Resumo

**Harness bash descartável para validação empírica de session_id per-account e cross-account resume usando CLAUDE_CONFIG_DIR isolado (capture-fixture.sh + test-multi-account-resume.sh + README pt-br)**

## Performance

- **Duração:** ~2min (artefatos puros, scripts shell + docs)
- **Iniciado:** 2026-04-26T05:21:56Z
- **Concluído:** 2026-04-26T05:24:07Z
- **Tarefas:** 3
- **Arquivos modificados:** 3 (todos novos, 0 produção tocada)

## Realizações

- `capture-fixture.sh` (74 linhas): spawna `claude` CLI com `CLAUDE_CONFIG_DIR=$HOME/.paperclip/claude-accounts/<slug>`, captura stream-JSON com `--output-format stream-json --verbose`, extrai `session_id` para stderr. Pre-flight rejeita ausência de account dir ou CLI com mensagem acionável.
- `test-multi-account-resume.sh` (141 linhas): orquestra 3 etapas — captura baseline A (CLAUDE_CONFIG_DIR=a), captura baseline B (CLAUDE_CONFIG_DIR=b), tenta cross-account resume da sessão A via account B (`--resume`). Compara session_ids e gera `multi-account-empirical.md` com tabela de resultados + checklist de observações manuais.
- `README.md` (95 linhas, pt-br): documenta pré-requisitos (`claude login` para 2 dirs), uso de cada script, fluxo HUMAN-UAT recomendado mapeando UAT-04-01 (captura fixture 429), UAT-04-02 (session_id per-account), UAT-04-03 (swap manual com continuação), limitações (bash-only, custo de quota), nota disposable (D-18).

## Commits das Tarefas

Cada tarefa comitada atomicamente com `--no-verify`:

1. **Tarefa 1: capture-fixture.sh** — `f1dcbd9` (feat)
2. **Tarefa 2: test-multi-account-resume.sh** — `04f6fab` (feat)
3. **Tarefa 3: README.md** — `e583107` (docs)

## Arquivos Criados/Modificados

- `.planning/phases/04-spike-multi-account-claude-code-detection/harness/capture-fixture.sh` — captura stream-JSON do `claude` CLI por conta isolada via `CLAUDE_CONFIG_DIR`
- `.planning/phases/04-spike-multi-account-claude-code-detection/harness/test-multi-account-resume.sh` — smoke multi-account: session_id distinct check + cross-account resume attempt + report generation
- `.planning/phases/04-spike-multi-account-claude-code-detection/harness/README.md` — guia pt-br para operador humano executar UAT-04-01..03

## Decisões Tomadas

- **Harness path:** `.planning/phases/04-*/harness/` (não `scripts/` raiz) — reforça D-16/D-18 (descartável, sem poluir produção). Phase 5 implementará produção em `services/claude-accounts.ts` (MULTI-04); harness é arquivado/deletado então.
- **Reuso de capture-fixture.sh dentro de test-multi-account-resume.sh:** evita duplicar lógica de spawn (`CLAUDE_CONFIG_DIR=$DIR claude --output-format stream-json -p ...`); single source of truth para o mecanismo de captura.
- **Relatório `multi-account-empirical.md` gerado pelo próprio test script:** preenche dados objetivos (session IDs, exit codes) e deixa checklist manual para o operador inspecionar conteúdo dos JSONLs (sanity de tokens ALPHA/BETA, mensagem exata do cross-account failure, etc).
- **Bash-only assumido:** não há tentativa de wrapper PowerShell/CMD. Operador em Windows usa Git Bash ou WSL — documentado como expected limitation no README.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. Os 3 scripts foram criados verbatim conforme especificação do PLAN.md (heredocs do plano colados na ferramenta Write). Verificações automáticas (`bash -n`, grep de tokens) passaram em primeira tentativa.

## Problemas Encontrados

Nenhum. Apenas warnings cosméticos do git sobre LF→CRLF em Windows (esperado, não afeta execução em ambientes POSIX onde scripts realmente rodam).

## Configuração Manual Necessária

Nenhuma na criação. **Para uso real (HUMAN-UAT):**
- Operador precisa rodar `mkdir -p ~/.paperclip/claude-accounts/{a,b}` e `CLAUDE_CONFIG_DIR=<dir> claude login` para cada conta antes de invocar `test-multi-account-resume.sh`. Documentado no README seção "Pré-requisitos".

## Constraint SPIKE Respeitada

`git diff master~3..master -- packages/adapters/claude-local/src/server/` retorna vazio. Zero linhas de produção modificadas. Audit target permanece read-only conforme D-01.

## Prontidão para Próxima Fase

- **Plano 04-05** (FINDINGS-FOR-PHASE-5.md + 04-HUMAN-UAT.md): pode referenciar este harness diretamente nos UAT-04-01..03. README já antecipa anchors `#uat-04-01`, `#uat-04-02`, `#uat-04-03` no `04-HUMAN-UAT.md` ainda a ser criado.
- **Phase 5** (MULTI-04 implementação produção):
  - Reusar mecânica de spawn já provada no harness e em `execute.ts:253`
  - `multi-account-empirical.md` (gerado pelo test script quando operador rodar) alimentará design final do swap em `services/claude-accounts.ts`
  - Se UAT-04-02 confirmar `session_id` per-account: design pode assumir storage de sessões isolado por `claude_accounts.id`
  - Se cross-account resume falhar (esperado): swap usa `issue_continuation_summary` + nova sessão na conta target, não `--resume` cross-account
- **HUMAN-UAT bloqueado por hardware do operador:** scripts não podem ser auto-executados — requerem 2 contas Claude reais, custam quota, e validam comportamento empírico que depende de implementação interna do `claude` CLI (fora do controle do paperclip).

## Self-Check: PASSED

- [x] `harness/capture-fixture.sh` existe (verified via `ls -la`)
- [x] `harness/test-multi-account-resume.sh` existe (verified via `ls -la`)
- [x] `harness/README.md` existe e tem 95 linhas (≥30 mínimo do plano)
- [x] Ambos scripts passam `bash -n` (sintaxe válida)
- [x] Tokens obrigatórios presentes: `CLAUDE_CONFIG_DIR`, `stream-json`, `session_id`, `resume`, `UAT-04-0`, `capture-fixture.sh`, `test-multi-account-resume.sh`
- [x] Commits f1dcbd9, 04f6fab, e583107 todos presentes em `git log`
- [x] Zero arquivos em `packages/adapters/claude-local/src/server/` modificados (SPIKE constraint mantida)

---
*Fase: 04-spike-multi-account-claude-code-detection*
*Concluída: 2026-04-26*
