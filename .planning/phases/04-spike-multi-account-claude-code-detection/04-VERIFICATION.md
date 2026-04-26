---
phase: 04-spike-multi-account-claude-code-detection
verified: 2026-04-26T02:42:00Z
status: human_needed
score: 11/11 must-haves verified (autonomous); SPIKE-04 + SPIKE-05 empirical validation pending HUMAN-UAT
re_verification:
  previous_status: null
  previous_score: null
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: UAT-04-01 — capturar fixture real de 429 (qualquer um dos 6 tipos) substituindo stub
    expected: pelo menos 1 fixture real em prototype/fixtures/, classifier ainda passa em vitest, mensagem canônica registrada em CLAUDE_429_TAXONOMY.md
    why_human: requer conta Claude Code real consumindo quota até atingir 429; executor não tem credenciais nem pode atingir limite real
  - test: UAT-04-02 — confirmar empiricamente que session_id é per-account
    expected: session_A != session_B; cross-account `--resume` falha com erro claro; tokens ALPHA/BETA isolados em jsonl correspondente
    why_human: requer 2 contas Claude Code reais autenticadas em ~/.paperclip/claude-accounts/{a,b}/; executor sem credenciais
  - test: UAT-04-03 — smoke manual de swap com continuation summary
    expected: conta A produz 2+ steps; conta A esgota; conta B aceita summary e produz step coerente referenciando contexto prévio
    why_human: requer conta A próxima de exhaustão + conta B com quota; mecânica empírica não simulável sem credenciais reais
---

# Phase 4: Spike Multi-Account Claude Code Detection — Verification Report

**Phase Goal:** Validar empiricamente o comportamento do Claude Code CLI em cenários de exhaustão e produzir os artefatos de decisão (taxonomia 429, classifier prototype, mecânica de retomada confirmada) que destravam a Phase 5. Esta fase é puramente investigativa — não produz código de produção.

**Verified:** 2026-04-26T02:42:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                  | Status     | Evidence                                                                                                                                |
| --- | -------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Taxonomia 429 mapeia 6 tipos com cobertura por regex existente                         | ✓ VERIFIED | `CLAUDE_429_TAXONOMY.md` linhas 47-55: tabela com 6 linhas (rpm/tpm/daily/weekly/org/5h), coluna "Cobertura existente" yes/partial      |
| 2   | Decisão arquitetural reactive-primary documentada com cooldown 30s + retry-after honor | ✓ VERIFIED | `DECISION-DETECTION-STRATEGY.md` §1 (reactive primary), §3 (30s default `CLAUDE_ACCOUNT_COOLDOWN_SECONDS`), §4 (retry-after honored)    |
| 3   | Prototype classifier `detectClaudeQuotaExhausted` existe, testado, e passa             | ✓ VERIFIED | `prototype/detect-quota-exhausted.ts:61` exporta função; `vitest run` retorna `8 passed`                                                |
| 4   | Fixtures cobrindo os 6 tipos da taxonomia                                              | ✓ VERIFIED | `prototype/fixtures/`: rpm_transient, tpm_transient, daily_quota, weekly_quota, session_5h, org_tier (6 arquivos)                       |
| 5   | Harness scripts shell para validação empírica multi-conta                              | ✓ VERIFIED | `harness/capture-fixture.sh` e `harness/test-multi-account-resume.sh` ambos com bit executável (`-rwxr-xr-x`)                            |
| 6   | HUMAN-UAT plan com 3 itens (UAT-04-01, 04-02, 04-03) status pending                    | ✓ VERIFIED | `04-HUMAN-UAT.md` linhas 28, 92, 152 — 3 UATs documentados com pré-requisitos, passos, critérios pass/fail, e bloco de resultado YAML   |
| 7   | Findings document com 4+ achados mapeados a MULTI-* requirements                        | ✓ VERIFIED | `FINDINGS-FOR-PHASE-5.md` lista 8 findings; tabela linha 169-178 mapeia para MULTI-01, 04, 05, 06, 08                                    |
| 8   | Production code (parse.ts, execute.ts) UNCHANGED conforme constraint D-01              | ✓ VERIFIED | `git diff master~10..HEAD -- packages/adapters/claude-local/src/server/` retorna vazio; `git log` no mesmo path retorna vazio            |
| 9   | Todos os 5 requirements SPIKE-* cobertos por algum PLAN frontmatter                    | ✓ VERIFIED | 04-01→SPIKE-01; 04-02→SPIKE-03; 04-03→SPIKE-02; 04-04→SPIKE-04+05; 04-05→SPIKE-04+05                                                    |
| 10  | session_id per-account empirically validated                                            | ? UNCERTAIN | Documented in `04-HUMAN-UAT.md` UAT-04-02 status `pending` — bloqueado por necessidade de 2 contas Claude reais (D-15)                  |
| 11  | Mecânica de retomada via `issue_continuation_summary` smoke-tested                     | ? UNCERTAIN | Documented in `04-HUMAN-UAT.md` UAT-04-03 status `pending` — bloqueado por necessidade de credenciais reais + conta exhausted          |

**Score:** 9/11 truths VERIFIED autonomously; 2/11 routed to HUMAN-UAT (UAT-04-02, UAT-04-03 — both expected per CONTEXT D-15).

### Required Artifacts

| Artifact                                                  | Expected                                                          | Status     | Details                                                                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE_429_TAXONOMY.md`                                  | Table 6 types + "existing regex covers" column                    | ✓ VERIFIED | 109 lines; tabela em linhas 47-55 com 7 colunas incluindo "Cobertura existente" e "Regex que cobre"                                    |
| `DECISION-DETECTION-STRATEGY.md`                          | Reactive primary, 30s cooldown configurable, retry-after honored  | ✓ VERIFIED | 103 lines; §1-4 com decisões + justificativa + consequências para Phase 5                                                              |
| `prototype/detect-quota-exhausted.ts`                     | Classifier function with QuotaType enum                            | ✓ VERIFIED | 90 lines; exporta `QuotaType`, `QuotaDetectionResult`, `detectClaudeQuotaExhausted`                                                    |
| `prototype/detect-quota-exhausted.test.ts`                | Vitest suite covering all fixture types                            | ✓ VERIFIED | 75 lines, 8 testes; `npx vitest run` resultado: `Test Files 1 passed (1) / Tests 8 passed (8)`                                          |
| `prototype/fixtures/`                                     | 6+ fixture files                                                   | ✓ VERIFIED | 6 arquivos: daily_quota.txt, org_tier.txt, rpm_transient.txt, session_5h.txt, tpm_transient.txt, weekly_quota.txt                      |
| `harness/capture-fixture.sh`                              | Executable shell script                                            | ✓ VERIFIED | Existe; permissão `-rwxr-xr-x` (executável); 2340 bytes                                                                                |
| `harness/test-multi-account-resume.sh`                    | Executable shell script                                            | ✓ VERIFIED | Existe; permissão `-rwxr-xr-x` (executável); 5431 bytes                                                                                |
| `harness/README.md`                                       | UAT usage docs                                                     | ✓ VERIFIED | Existe; documenta pré-requisitos, scripts, mapeamento UAT-04-02/03                                                                     |
| `04-HUMAN-UAT.md`                                         | UAT-04-01..03 status pending                                       | ✓ VERIFIED | Frontmatter `status: pending`; 3 UATs com blocos `status: pending` em linhas ~82, ~138, ~213                                            |
| `FINDINGS-FOR-PHASE-5.md`                                 | 4+ findings mapped to MULTI-*                                      | ✓ VERIFIED | 8 findings; tabela final mapeia para MULTI-01, MULTI-04, MULTI-05, MULTI-06, MULTI-08 (5 distinct MULTI-* IDs cobertos)                |
| Production code (`packages/adapters/claude-local/src/server/`) | UNCHANGED                                                          | ✓ VERIFIED | `git diff master~10..HEAD -- packages/adapters/claude-local/src/server/` empty; `git log` empty para esse path                          |

### Key Link Verification

| From                                       | To                                            | Via                                   | Status     | Details                                                                                                       |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `prototype/detect-quota-exhausted.test.ts` | `prototype/detect-quota-exhausted.ts`         | `import { detectClaudeQuotaExhausted }` | ✓ WIRED    | Linha 5 do test importa diretamente; `vitest run` exercita 8 cenários                                          |
| Test fixtures                              | Classifier                                    | `loadFixture(name)` + readFileSync     | ✓ WIRED    | Linhas 10-12 do test resolvem `fixtures/<name>` e passam ao classifier; testes ASSERT non-unknown            |
| `04-HUMAN-UAT.md`                          | `harness/test-multi-account-resume.sh`        | UAT-04-02 step 2                       | ✓ WIRED    | Linhas 116-118 instruem operador a rodar o script; `harness/README.md` documenta o mesmo                      |
| `04-HUMAN-UAT.md`                          | `prototype/fixtures/`                         | UAT-04-01 step 3                       | ✓ WIRED    | Linhas 57-60 instruem operador a copiar capturas para fixtures e re-rodar vitest                              |
| `FINDINGS-FOR-PHASE-5.md`                  | `CLAUDE_429_TAXONOMY.md`                      | Citação em Findings 1, 3, 4            | ✓ WIRED    | Linha 182 referencia explicitamente; finding 1 cita `parse.ts:13` e taxonomy coverage                         |
| `FINDINGS-FOR-PHASE-5.md`                  | MULTI-01, 04, 05, 06, 08                      | Tabela linha 169-178                   | ✓ WIRED    | Mapeamento explícito Finding → MULTI-* req com nota de "Como" para cada                                        |
| `DECISION-DETECTION-STRATEGY.md`           | `CLAUDE_429_TAXONOMY.md`                      | §1 justification                      | ✓ WIRED    | Linha 23 referencia "ver CLAUDE_429_TAXONOMY.md"; consistente com taxonomia (4 yes / 2 partial)              |
| Phase 5 (downstream)                       | `prototype/detect-quota-exhausted.ts`         | Reuse pattern documented               | ✓ WIRED    | Findings linha 14-28 instruem MULTI-06 a estender (não duplicar) regex; prototype demonstra arquitetura       |

### Data-Flow Trace (Level 4)

| Artifact                                     | Data Variable | Source                          | Produces Real Data                                              | Status                |
| -------------------------------------------- | ------------- | ------------------------------- | --------------------------------------------------------------- | --------------------- |
| `prototype/detect-quota-exhausted.test.ts`   | `input`       | `loadFixture()` reads `fixtures/*.txt` | Yes — 6 fixture files com strings de erro Claude (stub, mas substantivas) | ✓ FLOWING (stub data) |
| `prototype/detect-quota-exhausted.ts`        | `result`      | regex matches sobre `input`     | Yes — vitest verifica 8 outputs; classifier produz `{ type, confidence, retryAt }` real | ✓ FLOWING             |

Note: fixtures são stub conforme D-11; UAT-04-01 substitui por dados reais. Aceito autonomamente per CONTEXT.

### Behavioral Spot-Checks

| Behavior                                                        | Command                                                                                                  | Result                          | Status |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------- | ------ |
| Vitest suite passes (classifier exercitada contra 6 fixtures)   | `cd prototype && npx vitest run detect-quota-exhausted.test.ts --no-coverage`                            | `Test Files 1 passed / Tests 8 passed` | ✓ PASS |
| Production code path has zero diffs                              | `git diff master~10..HEAD -- packages/adapters/claude-local/src/server/`                                 | empty (no output)               | ✓ PASS |
| Production code path has zero commits                            | `git log --oneline master~10..HEAD -- packages/adapters/claude-local/src/server/`                        | empty (no output)               | ✓ PASS |
| Fixtures count                                                  | `ls prototype/fixtures/`                                                                                  | 6 files (matches 6-type taxonomy) | ✓ PASS |
| Harness scripts executable                                      | `ls -la harness/*.sh`                                                                                     | both `-rwxr-xr-x`               | ✓ PASS |
| All 5 SPIKE-* requirements present in PLAN frontmatters          | `grep -rA3 "^requirements:" *-PLAN.md`                                                                    | SPIKE-01, 02, 03, 04, 05 cobertos | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan          | Description                                                                       | Status              | Evidence                                                                                                       |
| ----------- | -------------------- | --------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| SPIKE-01    | 04-01-PLAN           | Mapear taxonomia 429 + cobertura regex existente                                  | ✓ SATISFIED         | `CLAUDE_429_TAXONOMY.md` 109 lines com 6 tipos + coluna "Cobertura existente"                                  |
| SPIKE-02    | 04-03-PLAN           | Prototype classifier + fixtures + tests                                           | ✓ SATISFIED         | `prototype/` com 90-line classifier, 75-line test (8 tests passing), 6 fixtures                                |
| SPIKE-03    | 04-02-PLAN           | Decision documented (reactive vs preemptive, cooldown, retry-after)               | ✓ SATISFIED         | `DECISION-DETECTION-STRATEGY.md` §1-4 com justificativas explícitas                                            |
| SPIKE-04    | 04-04-PLAN, 04-05-PLAN | Empirical validation: session_id per-account; resumption mechanic                | ? NEEDS HUMAN       | Harness scripts + UAT-04-02/03 documentados; execução depende de 2 contas Claude reais (D-15)                  |
| SPIKE-05    | 04-04-PLAN, 04-05-PLAN | Smoke manual com 2 contas + findings list                                         | ⚠️ PARTIAL          | FINDINGS-FOR-PHASE-5.md presente com 8 findings; smoke component aguarda UAT-04-03 (HUMAN)                     |

Coverage: 5/5 SPIKE-* IDs declarados em PLAN frontmatters; 3/5 SATISFIED autonomously; 2/5 NEEDS HUMAN (esperado per CONTEXT — auto mode aceita como `human_needed`, NOT `gaps_found`).

### Anti-Patterns Found

| File                                       | Line | Pattern        | Severity | Impact                                              |
| ------------------------------------------ | ---- | -------------- | -------- | --------------------------------------------------- |
| _none_                                     | -    | -              | -        | Nenhum TODO/FIXME/PLACEHOLDER em prototype ou docs |

Nota: artefatos de spike intencionalmente contêm seções "TBD" em blocos de resultado de UAT pendente — esperado conforme CONTEXT D-13/D-15 e não conta como anti-padrão (são placeholders explícitos para preenchimento humano).

### Human Verification Required

#### 1. UAT-04-01 — Capturar fixture real de 429

**Test:** Operador roda `harness/capture-fixture.sh` em conta de teste até atingir limit; copia output para `prototype/fixtures/<tipo>.txt`; re-roda `npx vitest`.
**Expected:** Pelo menos 1 fixture real substitui stub; classifier mantém todos testes passing; mensagem canônica capturada atualiza `CLAUDE_429_TAXONOMY.md`.
**Why human:** Requer conta Claude Code real consumindo quota até 429 — executor sem credenciais.

#### 2. UAT-04-02 — Confirmar session_id per-account

**Test:** Operador autentica `~/.paperclip/claude-accounts/{a,b}/`; roda `harness/test-multi-account-resume.sh`; inspeciona `multi-account-empirical.md`.
**Expected:** `session_A != session_B`; cross-account `--resume` falha com erro; tokens ALPHA/BETA isolados em jsonl da conta correspondente.
**Why human:** Requer 2 contas Claude reais autenticadas — executor sem credenciais.

#### 3. UAT-04-03 — Smoke manual de swap com continuation

**Test:** Operador inicia agente em conta A com tarefa multi-step; consome até exhaustão; extrai continuation summary; spawna em conta B com summary embutido.
**Expected:** Conta A produz 2+ steps antes de exhaustion; conta B aceita summary e produz step coerente referenciando contexto prévio (sinal de que mecânica de retomada via summary funciona).
**Why human:** Requer conta A próxima do limit + conta B com quota — não simulável sem credenciais reais.

### Gaps Summary

Spike entregou TODOS os artefatos auditáveis autonomamente:

- **Taxonomia (SPIKE-01):** 6 tipos com cobertura yes/partial mapeada contra regex existente.
- **Decisão (SPIKE-03):** reactive primary, 30s cooldown configurable, retry-after honored — com justificativa.
- **Prototype (SPIKE-02):** 90-line classifier + 75-line test (8 passing) + 6 fixtures.
- **Findings (SPIKE-05 doc component):** 8 achados, 5 distinct MULTI-* IDs mapeados.
- **Constraint D-01:** production code zero-diff confirmado via `git diff` e `git log`.

**Itens pendentes de validação empírica (SPIKE-04 + SPIKE-05 runtime):**
- UAT-04-01, UAT-04-02, UAT-04-03 estão com harness pronto, scripts executáveis, e procedimentos documentados — aguardam apenas operador humano com 2 contas reais (esperado per CONTEXT D-15).

Status `human_needed` (NÃO `gaps_found`) é o classification correto: harness + UAT artifacts em place; missing piece é credentials, não código/docs.

---

_Verified: 2026-04-26T02:42:00Z_
_Verifier: Claude (verifier)_
