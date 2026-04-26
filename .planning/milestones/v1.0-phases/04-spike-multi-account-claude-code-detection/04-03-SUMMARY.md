---
phase: 04-spike-multi-account-claude-code-detection
plan: 03
subsystem: detection
tags: [claude-code, quota-detection, regex, vitest, prototype, spike]

requires:
  - phase: 04-spike-multi-account-claude-code-detection
    provides: CLAUDE_429_TAXONOMY.md (6-tipo taxonomy), DECISION-DETECTION-STRATEGY.md (reativa primary)
provides:
  - Disposable prototype `detectClaudeQuotaExhausted` (TS) classifying 6 quota types
  - Standalone vitest suite (8 cases) running outside monorepo workspace
  - 6 stub fixtures (1 per taxonomy type) ready for HUMAN-UAT-04-01 replacement
  - Architectural reference for Phase 5 MULTI-06 production implementation
affects: [phase-05-multi-account, MULTI-06, MULTI-04, MULTI-01]

tech-stack:
  added: []
  patterns:
    - "Reuso direto de regex de produção (parse.ts:13-15) em vez de duplicar"
    - "Sub-tipo discriminator com ordem most-specific-first"
    - "Standalone vitest via --config bypassando workspace projects"

key-files:
  created:
    - .planning/phases/04-spike-multi-account-claude-code-detection/prototype/detect-quota-exhausted.ts
    - .planning/phases/04-spike-multi-account-claude-code-detection/prototype/detect-quota-exhausted.test.ts
    - .planning/phases/04-spike-multi-account-claude-code-detection/prototype/vitest.config.ts
    - .planning/phases/04-spike-multi-account-claude-code-detection/prototype/README.md
    - .planning/phases/04-spike-multi-account-claude-code-detection/prototype/fixtures/rpm_transient.txt
    - .planning/phases/04-spike-multi-account-claude-code-detection/prototype/fixtures/tpm_transient.txt
    - .planning/phases/04-spike-multi-account-claude-code-detection/prototype/fixtures/daily_quota.txt
    - .planning/phases/04-spike-multi-account-claude-code-detection/prototype/fixtures/weekly_quota.txt
    - .planning/phases/04-spike-multi-account-claude-code-detection/prototype/fixtures/org_tier.txt
    - .planning/phases/04-spike-multi-account-claude-code-detection/prototype/fixtures/session_5h.txt
  modified: []

key-decisions:
  - 'Discriminator strict para session_5h: exige token literal "5-hour limit reached"; "claude usage limit reached" sozinho cai em daily_quota (default conservador)'
  - "Standalone vitest config com esbuild.tsconfigRaw inline para bypassar tsconfck walk-up que falha em referência stale a packages/adapters/droid-local"
  - "Protótipo standalone — vive em .planning/phases/04-*/prototype/, NÃO em packages/ (D-09); descartável após Phase 5 MULTI-06"

patterns-established:
  - "Sub-tipo discriminator pattern: regex top-level amplo + chain de discriminators most-specific-first; ambíguos roteados para o tipo mais conservador"
  - "Disposable prototype lives in .planning/phases/{phase}/prototype/ com vitest.config.ts standalone; rodado via npx vitest run --config <path>"

requirements-completed: [SPIKE-02]

duration: 8 min
completed: 2026-04-26
---

# Phase 4 Plan 03: Disposable Prototype detectClaudeQuotaExhausted Summary

**Classifier protótipo TypeScript reusando regex de parse.ts:13-15, com 8 cases vitest validando 6 fixtures stub (1 por tipo da taxonomia 429), rodando standalone via vitest config próprio que bypassa o workspace principal do monorepo.**

## Performance

- **Duração:** ~8 min
- **Iniciado:** 2026-04-26T05:17:27Z (sessão de execução)
- **Concluído:** 2026-04-26T05:25:12Z
- **Tarefas:** 3 (todas auto, Tarefas 1-2 com TDD)
- **Arquivos criados:** 10 (1 classifier + 1 test + 1 vitest config + 1 README + 6 fixtures)
- **Arquivos modificados em produção:** 0 (spike read-only sobre `packages/`)

## Realizações

- Protótipo `detectClaudeQuotaExhausted(input: string): { type, confidence, retryAt, source }` exportado e operacional, classificando 6 tipos da taxonomia (`rpm_transient`, `tpm_transient`, `daily_quota`, `weekly_quota`, `session_5h`, `org_tier`) + `unknown` fallback.
- 8 vitest cases passando (6 fixtures + 2 negative: empty, non-quota), validando partial coverage acceptable em `org_tier`/`tpm_transient` conforme taxonomia.
- 6 fixtures stub criados em pt-br, baseados em mensagens conhecidas do regex existente + docs Anthropic (D-11). HUMAN-UAT-04-01 substituirá com captura real.
- README pt-br documentando API, comando exato de execução, natureza descartável, limitações conhecidas (ambiguidade "claude usage limit reached", headers fora de escopo, fixtures stub).
- Prova arquitetural para Phase 5 MULTI-06: shape `{ type, confidence, retryAt, source }` é viável; reuso de regex existente é o caminho (não duplicar).

## Commits das Tarefas

1. **Tarefa 1: Criar 6 fixtures stub** — `d6b427e` (test)
2. **Tarefa 2: Implementar classifier + vitest suite** — `068b12b` (feat — inclui correção [Regra 1 - Bug] na ordenação de discriminators e workaround [Regra 3 - Bloqueante] para tsconfck via standalone vitest config)
3. **Tarefa 3: README do protótipo** — `6dd5662` (docs)

**Metadados do plano:** _(commit final via `/executar-fase` orchestrator)_

## Arquivos Criados/Modificados

- `prototype/detect-quota-exhausted.ts` (90 linhas) — classifier exportando `detectClaudeQuotaExhausted` e `QuotaDetectionResult`. Top-level regex espelho de `CLAUDE_TRANSIENT_UPSTREAM_RE` (parse.ts:13); reset extraction espelho de `CLAUDE_EXTRA_USAGE_RESET_RE` (parse.ts:14-15); chain de discriminators most-specific-first.
- `prototype/detect-quota-exhausted.test.ts` (74 linhas) — 8 vitest cases carregando fixtures via `fs.readFileSync` + `import.meta.url` (ESM-native).
- `prototype/vitest.config.ts` (19 linhas) — config standalone com `esbuild.tsconfigRaw` inline para bypassar tsconfck walk-up.
- `prototype/README.md` (70 linhas, pt-br) — API, comando de execução, fixtures table, limitações, referências cruzadas para `CLAUDE_429_TAXONOMY.md` e `DECISION-DETECTION-STRATEGY.md`.
- `prototype/fixtures/{6 arquivos}.txt` — stubs com 1-2 linhas de stream-JSON ou stderr blob por tipo.

## Decisões Tomadas

1. **Discriminator strict para session_5h**: token literal `5-hour limit reached` é o discriminator único; a string compartilhada `claude usage limit reached` (presente em daily_quota e session_5h) cai em `daily_quota` por default. Justificativa: daily reset é menos disruptivo que 5h-window (default conservador favorece UX previsível). Phase 5 pode refinar quando HUMAN-UAT-04-01 fornecer fixtures reais com headers + contexto adicional.

2. **Standalone vitest config**: o `vitest.config.ts` da raiz declara `projects: [...]` com paths fechados em `packages/`, `server/`, `ui/`, `cli/` — qualquer arquivo fora desses dirs é silenciosamente excluído. Para o protótipo (vive em `.planning/`) rodar, é necessário `npx vitest run --config <path>` apontando para um config próprio. Adicionalmente, `esbuild.tsconfigRaw` inline desativa tsconfck walk-up que falharia em referência stale a `packages/adapters/droid-local` (issue pre-existente fora do escopo do spike).

3. **Protótipo descartável** (D-09): vive em `.planning/phases/04-*/prototype/`, NÃO em `packages/` ou `scripts/`. Phase 5 MULTI-06 implementa a versão de produção; este diretório pode ser arquivado/deletado depois.

## Desvios do Plano

### Problemas Corrigidos Automaticamente

**1. [Regra 1 - Bug] Ordenação de discriminators classificava daily_quota como session_5h**
- **Encontrado durante:** Tarefa 2 (primeira execução do vitest)
- **Problema:** O discriminator inicial `SESSION_5H_RE = /5[-\s]?hour\s+limit\s+reached|claude\s+usage\s+limit\s+reached/i` casava o token compartilhado `claude usage limit reached` antes que o discriminator de `daily_quota` tivesse chance. Fixture `daily_quota.txt` (linha 2: "Claude usage limit reached. Resets at...") era classificada como `session_5h`. Test fail: `expected 'session_5h' to be 'daily_quota'`.
- **Correção:** Restringir `SESSION_5H_RE` ao token literal `5-hour limit reached`; mover `claude usage limit reached` para `DAILY_RE`. Comentário inline explica o trade-off (default conservador).
- **Arquivos modificados:** `prototype/detect-quota-exhausted.ts`
- **Verificação:** vitest re-run → 8/8 passing
- **Comitado em:** `068b12b` (parte do commit da Tarefa 2)

**2. [Regra 3 - Bloqueante] Vitest standalone falhou em tsconfck walk-up por referência stale**
- **Encontrado durante:** Tarefa 2 (primeira execução do vitest)
- **Problema:** `npx vitest run <test-file>` falhou com `TSConfckParseError: parsing D:/projetos/ddd/packages/adapters/droid-local/tsconfig.json failed: ENOENT`. Causa: `./tsconfig.json` da raiz tem `references: [{ "path": "./packages/adapters/droid-local" }]` mas a pasta `droid-local/` não existe (issue pre-existente — adapter foi removido do FS mas não do tsconfig).
- **Correção:** Adicionar `esbuild.tsconfigRaw` inline ao `vitest.config.ts` standalone do protótipo, fornecendo `compilerOptions` mínimos sem walk-up. Documentado no comentário do config + README. **NÃO** corrigi o `tsconfig.json` da raiz — fora do escopo do spike (boundary D-01: spike read-only sobre produção; tsconfig é infra de build, não detection target, mas mexer nele afetaria todos os outros packages e violaria escopo).
- **Arquivos modificados:** `prototype/vitest.config.ts`
- **Verificação:** vitest re-run resolveu test files corretamente
- **Comitado em:** `068b12b` (parte do commit da Tarefa 2)

**3. [Regra 3 - Bloqueante] Workspace projects do vitest.config.ts da raiz excluem `.planning/`**
- **Encontrado durante:** Tarefa 2 (primeira execução do vitest)
- **Problema:** Antes do erro tsconfck, o vitest exibia output dos 12 workspace projects e nenhum match para o test file. `vitest.config.ts` raiz declara `projects: [...]` com escopo em `packages/`, `server/`, `ui/`, `cli/` — `.planning/phases/04-*/prototype/` está fora.
- **Correção:** Criar `prototype/vitest.config.ts` standalone com `include: ["**/*.test.ts"]` e `root: __dirname`. README documenta o comando explícito com `--config`.
- **Arquivos modificados:** `prototype/vitest.config.ts`
- **Verificação:** vitest run com `--config` resolveu o test file
- **Comitado em:** `068b12b` (parte do commit da Tarefa 2)

### Itens Fora de Escopo (Deferred)

**Stale tsconfig reference** — `./tsconfig.json` referencia `packages/adapters/droid-local` que não existe no FS. Não corrigi: spike é read-only sobre produção (D-01) e o tsconfig é infra de build crítica para outros packages. Workaround local (esbuild.tsconfigRaw no vitest config do protótipo) isola o problema. **Recomendação:** abrir issue separada para limpar o tsconfig (não é responsabilidade desta Phase 4).

---

**Total de desvios:** 3 corrigidos automaticamente (1 R1 bug, 2 R3 bloqueantes) + 1 item fora de escopo deferido.
**Impacto no plano:** Todas as correções foram necessárias para que o protótipo executasse e produzisse output correto. Sem expansão de escopo — protótipo permanece descartável e contido em `.planning/phases/04-*/prototype/`. Zero linhas de produção tocadas.

## Problemas Encontrados

Nenhum além dos desvios acima — fluxo TDD direto: fixtures → classifier → tests → fix → README.

## Configuração Manual Necessária

Nenhuma — protótipo roda standalone via `npx vitest run --config .planning/phases/04-spike-multi-account-claude-code-detection/prototype/vitest.config.ts --no-coverage`.

## Prontidão para Próxima Fase

- **SPIKE-02 satisfeito:** protótipo testado contra 6 fixtures, tipos conformes à taxonomia, código descartável.
- **Phase 4 progress:** 3/5 planos concluídos (04-01 taxonomia, 04-02 decisão, 04-03 protótipo). Faltam 04-04 (mecânica de retomada) e 04-05 (FINDINGS-FOR-PHASE-5.md). 04-04 pode rodar em paralelo (Wave 1 dependency satisfeita).
- **Para Phase 5 MULTI-06:** shape `{ type, confidence, retryAt, source }` validado; reuso de regex existente é a abordagem; ambiguidade "claude usage limit reached" identificada como caso a refinar com fixtures reais (HUMAN-UAT-04-01).
- **Bloqueios:** nenhum.
- **HUMAN-UAT-04-01 forward:** fixtures stub neste protótipo serão substituídos por capturas reais quando UAT-04-01 executar (criado pelo plano 04-05).

## Self-Check

- ✓ `prototype/detect-quota-exhausted.ts` existe (verified via Write tool)
- ✓ `prototype/detect-quota-exhausted.test.ts` existe (verified via Write tool)
- ✓ `prototype/vitest.config.ts` existe
- ✓ `prototype/README.md` existe
- ✓ 6 fixtures em `prototype/fixtures/` (verified via `ls`)
- ✓ Vitest run: 8 tests passed (verified via terminal output)
- ✓ Commits: `d6b427e` (fixtures), `068b12b` (classifier+test+config), `6dd5662` (README) — verified via `git rev-parse`
- ✓ Zero diff em `packages/` (verified via `git diff master~3..HEAD -- packages/`)

## Self-Check: PASSED

---
*Fase: 04-spike-multi-account-claude-code-detection*
*Concluída: 2026-04-26*
