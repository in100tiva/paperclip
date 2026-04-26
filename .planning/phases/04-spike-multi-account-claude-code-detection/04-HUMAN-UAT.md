---
type: human-uat
phase: 04-spike-multi-account-claude-code-detection
status: pending
created: 2026-04-26
---

# Phase 4 — HUMAN-UAT (Spike Multi-Account Claude Code Detection)

**Status:** pending — execução depende de operador humano com 2 contas Claude Code reais
**Cobre requirements:** SPIKE-04 (validação empírica session_id + retomada), SPIKE-05 (smoke manual 2 contas)
**Harness:** ver `harness/README.md` neste diretório

## Por que HUMAN-UAT?

Conforme D-15 (04-CONTEXT.md): SPIKE-04/05 exigem 2 contas Claude Code reais com `~/.paperclip/claude-accounts/{a,b}/` populadas, e idealmente uma conta exhausted (ou simulação). Executor Claude não pode rodar isto autonomamente — não tem credenciais, não pode atingir 429 real.

Spike (planos 04-01..04-04) entregou:
- Taxonomia de 6 tipos (`CLAUDE_429_TAXONOMY.md`)
- Decisão arquitetural (`DECISION-DETECTION-STRATEGY.md`)
- Protótipo classifier + 6 fixtures stub (`prototype/`)
- Harness shell scripts (`harness/`)

UATs abaixo substituem fixtures stub por capturas reais e validam empiricamente que session_id é per-account.

---

## UAT-04-01: Capturar fixtures reais de 429

**Status:** pending
**Cobre:** SPIKE-01 (taxonomia validada empiricamente), SPIKE-02 (fixtures reais substituem stubs)
**Tempo estimado:** 30-60min (depende de quão rápido conta atinge limit)
**Custo:** quota de uma conta de teste (descartável)

### Pré-requisitos

- `claude` CLI no PATH
- Uma conta Claude Code de teste (idealmente próxima do limit ou com plano pequeno)
- `harness/capture-fixture.sh` funcional

### Passos

1. Setup do diretório:
   ```bash
   mkdir -p ~/.paperclip/claude-accounts/test
   CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/test claude login
   ```

2. Rodar agente até atingir limit. Estratégias possíveis:
   - **Daily quota:** prompt grande iterativo até "usage limit reached" / "out of extra usage"
     ```bash
     ./harness/capture-fixture.sh test "Write 50000 tokens of detailed technical analysis on quantum cryptography." captures/real-daily.jsonl
     ```
   - **5h limit:** uso prolongado em janela de 5h até "5-hour limit reached"
   - **RPM transient:** rajada de requests em poucos segundos (`while true; do claude -p "hi" & done` por 10s)

3. Inspecionar output. Se contém token de 429 da taxonomia, mover para `prototype/fixtures/<tipo>.txt`:
   ```bash
   cp captures/real-daily.jsonl prototype/fixtures/daily_quota.txt
   ```

4. Re-rodar tests do protótipo para confirmar classifier ainda passa:
   ```bash
   npx vitest run .planning/phases/04-spike-multi-account-claude-code-detection/prototype/detect-quota-exhausted.test.ts --no-coverage
   ```

### Critério de Pass

- [ ] Pelo menos 1 fixture real (não stub) substituiu um fixture stub correspondente em `prototype/fixtures/`
- [ ] `npx vitest` ainda passa após substituição (classifier robusto a variações reais)
- [ ] Mensagem canônica do tipo capturado registrada em `CLAUDE_429_TAXONOMY.md` na coluna apropriada (atualizar)

### Critério de Fail

- Classifier classifica fixture real como `unknown` → regex existente tem gap; documentar em `FINDINGS-FOR-PHASE-5.md` (atualizar)

### Resultado

Preencher após execução:

```yaml
status: pending  # passed | failed | inconclusive
executed_at: null
operator: null
fixtures_substituted: []
findings: |
  TBD
```

---

## UAT-04-02: Confirmar empiricamente que session_id é per-account

**Status:** pending
**Cobre:** SPIKE-04 success criterion #4 (`session_id` é por-conta — assumido true; precisa confirmação)
**Tempo estimado:** 10-15min
**Custo:** ~2 prompts curtos por conta

### Pré-requisitos

- Duas contas Claude Code reais
- `~/.paperclip/claude-accounts/a/` e `~/.paperclip/claude-accounts/b/` configuradas e logadas
- `harness/test-multi-account-resume.sh` funcional

### Passos

1. Setup dos dois diretórios:
   ```bash
   mkdir -p ~/.paperclip/claude-accounts/a ~/.paperclip/claude-accounts/b
   CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/a claude login   # conta A
   CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/b claude login   # conta B (diferente!)
   ```

2. Rodar harness completo:
   ```bash
   cd .planning/phases/04-spike-multi-account-claude-code-detection/harness
   ./test-multi-account-resume.sh
   ```

3. Inspecionar `multi-account-empirical.md` gerado.

### Critério de Pass

- [ ] `session_A` != `session_B` (sessions distintas)
- [ ] Cross-account resume falha com erro claro (esperado — sessions per-account)
- [ ] `account-a-baseline.jsonl` contém token "ALPHA"
- [ ] `account-b-baseline.jsonl` contém token "BETA"

### Critério de Fail / Inconclusivo

- session_ids iguais → claude CLI usa source distinto de session_id (não per-account); design da Phase 5 muda
- Cross-account resume **funciona** (inesperado) → sessions são compartilhadas; documenta-se em `FINDINGS-FOR-PHASE-5.md`

### Resultado

Preencher após execução:

```yaml
status: pending  # passed | failed | inconclusive
executed_at: null
operator: null
session_a: null
session_b: null
session_distinct: null  # YES | NO
cross_account_resume_exit: null
findings: |
  TBD (ver multi-account-empirical.md)
```

---

## UAT-04-03: Smoke manual de swap com continuação

**Status:** pending
**Cobre:** SPIKE-04 success criterion #4 (mecânica de retomada via `issue_continuation_summary`), SPIKE-05 (smoke 2 contas com exhaustão)
**Tempo estimado:** 30-45min
**Custo:** quota de uma conta (atingir exhaustão) + alguns prompts na outra

### Pré-requisitos

- UAT-04-02 passed (session_id confirmado per-account)
- Conta A próxima do limit (ou simular interrupção)
- Conta B com quota disponível

### Passos

1. Iniciar agente em conta A com tarefa multi-passo:
   ```bash
   CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/a claude \
     --output-format stream-json \
     -p "Plan a 5-step refactor of a TypeScript module. Output step 1 in detail." \
     > captures/uat-04-03-step1.jsonl
   ```
   Capturar `session_id` da conta A do output.

2. Continuar mesma sessão até conta A esgotar (ou simular):
   ```bash
   CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/a claude \
     --output-format stream-json \
     --resume <session_id_A> \
     -p "Continue with step 2." \
     >> captures/uat-04-03-step2.jsonl
   ```
   Repetir até atingir 429 ou rate limit (conforme UAT-04-01).

3. Quando exhausted, capturar **continuation summary** (extrair contexto do output até este ponto — estado do task como prosa).

4. Tentar swap para conta B com summary embutido:
   ```bash
   CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/b claude \
     --output-format stream-json \
     -p "Continuation context from a previous session: <summary aqui>. Continue with step 3 of the refactor." \
     > captures/uat-04-03-resume-on-b.jsonl
   ```

5. Validar: conta B continuou o trabalho de forma coerente?

### Critério de Pass

- [ ] Conta A produziu pelo menos 2 steps antes de exhaustion
- [ ] Conta B aceitou continuation summary e produziu step 3 coerente com steps 1-2
- [ ] Output de B referencia contexto prévio (sinal de que summary foi efetivo)

### Critério de Fail

- Conta B trata como sessão nova sem contexto → mecânica de `issue_continuation_summary` não é suficiente; Phase 5 MULTI-08 precisa abordagem diferente
- Conta A não esgota em prazo razoável → escolher conta de teste com plano menor ou simular via timeout

### Resultado

Preencher após execução:

```yaml
status: pending  # passed | failed | inconclusive
executed_at: null
operator: null
account_a_session_id: null
account_a_exhausted_at: null
account_b_continued_coherently: null  # YES | NO | PARTIAL
findings: |
  TBD
```

---

## Próximos Passos

- Quando UATs forem executados, atualizar status pending → passed/failed/inconclusive
- Findings de cada UAT são copiados para `FINDINGS-FOR-PHASE-5.md` antes de Phase 5 começar
- Phase 5 MULTI-08 (swap automático com continuidade) depende criticamente de UAT-04-03

## Referências

- `harness/README.md` — instruções operacionais
- `prototype/README.md` — protótipo classifier (re-rodar com fixtures reais via UAT-04-01)
- `CLAUDE_429_TAXONOMY.md` — atualizar coluna "mensagem canônica" com captura real
- `FINDINGS-FOR-PHASE-5.md` — destino dos findings finais
- `.planning/REQUIREMENTS.md` SPIKE-01..05
- `.planning/ROADMAP.md` §"Phase 4" success criteria
- Precedente: `.planning/phases/03-workflow-de-equipe-onboarding/03-HUMAN-UAT.md`
