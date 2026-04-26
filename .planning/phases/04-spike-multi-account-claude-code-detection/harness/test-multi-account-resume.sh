#!/usr/bin/env bash
# Spike Phase 4 — test-multi-account-resume.sh
# Valida empiricamente:
#   1. session_id é distinto entre contas (CLAUDE_CONFIG_DIR=A vs CLAUDE_CONFIG_DIR=B)
#   2. Tentativa de resume da session A com CLAUDE_CONFIG_DIR=B (esperado: falha — session per-account)
#   3. Comportamento de issue_continuation_summary após swap (manual — operador inspeciona output)
#
# Uso:
#   ./test-multi-account-resume.sh
#
# Pré-requisitos:
#   - claude CLI no PATH
#   - $HOME/.paperclip/claude-accounts/a/ e $HOME/.paperclip/claude-accounts/b/ existem e estão logados
#
# Output:
#   - captures/account-a-baseline.jsonl
#   - captures/account-b-baseline.jsonl
#   - captures/cross-account-resume.jsonl
#   - multi-account-empirical.md (relatório com observações)

set -euo pipefail

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
CAPTURES_DIR="$HARNESS_DIR/captures"
REPORT_FILE="$HARNESS_DIR/multi-account-empirical.md"
ACCOUNT_A_DIR="$HOME/.paperclip/claude-accounts/a"
ACCOUNT_B_DIR="$HOME/.paperclip/claude-accounts/b"

# Pre-flight checks
for dir in "$ACCOUNT_A_DIR" "$ACCOUNT_B_DIR"; do
  if [[ ! -d "$dir" ]]; then
    echo "ERROR: $dir does not exist." >&2
    echo "Setup both account dirs first:" >&2
    echo "  CLAUDE_CONFIG_DIR=$ACCOUNT_A_DIR claude login" >&2
    echo "  CLAUDE_CONFIG_DIR=$ACCOUNT_B_DIR claude login" >&2
    exit 1
  fi
done

if ! command -v claude >/dev/null 2>&1; then
  echo "ERROR: claude CLI not found in PATH." >&2
  exit 1
fi

mkdir -p "$CAPTURES_DIR"

echo "[multi-account] === Step 1: Capture baseline session for account A ==="
"$HARNESS_DIR/capture-fixture.sh" a "Say only the word ALPHA. No explanation." "$CAPTURES_DIR/account-a-baseline.jsonl" || true
SESSION_A=$(grep -o '"session_id":"[^"]*"' "$CAPTURES_DIR/account-a-baseline.jsonl" | head -1 | sed 's/.*"session_id":"\([^"]*\)".*/\1/' || echo "")

echo "[multi-account] === Step 2: Capture baseline session for account B ==="
"$HARNESS_DIR/capture-fixture.sh" b "Say only the word BETA. No explanation." "$CAPTURES_DIR/account-b-baseline.jsonl" || true
SESSION_B=$(grep -o '"session_id":"[^"]*"' "$CAPTURES_DIR/account-b-baseline.jsonl" | head -1 | sed 's/.*"session_id":"\([^"]*\)".*/\1/' || echo "")

echo "[multi-account] session_A=$SESSION_A"
echo "[multi-account] session_B=$SESSION_B"

# Validação 1: session_id distinto?
if [[ -n "$SESSION_A" && -n "$SESSION_B" && "$SESSION_A" != "$SESSION_B" ]]; then
  SESSION_DISTINCT="YES"
else
  SESSION_DISTINCT="NO_OR_INCONCLUSIVE"
fi

echo "[multi-account] session_distinct=$SESSION_DISTINCT"

echo "[multi-account] === Step 3: Attempt cross-account resume (session A via account B) ==="
# Esperado: session_id de A não é resolvível em B (per-account storage)
RESUME_OUTPUT="$CAPTURES_DIR/cross-account-resume.jsonl"
if [[ -n "$SESSION_A" ]]; then
  CLAUDE_CONFIG_DIR="$ACCOUNT_B_DIR" claude \
    --output-format stream-json \
    --verbose \
    --resume "$SESSION_A" \
    -p "Continue: what word did I ask you to say?" \
    > "$RESUME_OUTPUT" 2>&1 || RESUME_EXIT=$?
  RESUME_EXIT="${RESUME_EXIT:-0}"
else
  RESUME_EXIT="N/A_NO_SESSION_A"
fi

echo "[multi-account] cross_account_resume_exit=$RESUME_EXIT"

# Gerar relatório markdown
cat > "$REPORT_FILE" <<REPORT
# Multi-Account Empirical Validation — Spike Phase 4

**Data da execução:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Operador:** ${USER:-unknown}
**Status:** Resultado bruto da execução do harness — preencher análise manual abaixo

## Setup

- Account A: \`$ACCOUNT_A_DIR\`
- Account B: \`$ACCOUNT_B_DIR\`

## Resultados

### Step 1+2: Captures baseline

| Conta | Session ID | Fixture |
|-------|------------|---------|
| A | \`${SESSION_A:-<missing>}\` | captures/account-a-baseline.jsonl |
| B | \`${SESSION_B:-<missing>}\` | captures/account-b-baseline.jsonl |

### Validação 1: session_id distinto entre contas?

**Resultado:** $SESSION_DISTINCT

- \`YES\`: session_id é per-account (esperado — confirma SPIKE-04 success criterion)
- \`NO_OR_INCONCLUSIVE\`: session_ids iguais ou não capturados — investigar (talvez claude CLI usa source distinto de session_id; ver fixtures)

### Step 3: Cross-account resume

**Exit code:** \`$RESUME_EXIT\`

- Esperado: erro de "session not found" / "unknown session" (sessions são per-account, não interoperáveis)
- Inspecionar \`captures/cross-account-resume.jsonl\` para mensagem exata

## Observações manuais (preencher após inspeção)

- [ ] Output de account-a-baseline.jsonl contém token "ALPHA" (sanity)?
- [ ] Output de account-b-baseline.jsonl contém token "BETA" (sanity)?
- [ ] Cross-account resume falhou com mensagem clara?
- [ ] Timestamps dos eventos confirmam que os spawns foram em contas distintas (não cache)?

## Próximos passos

- Atualizar \`04-HUMAN-UAT.md\` UAT-04-02 com status (passed/failed/inconclusive) e link para este relatório
- Se resume cross-account funcionar (inesperado), atualizar \`FINDINGS-FOR-PHASE-5.md\` — design do swap muda
- Capturar fixture real de 429 quando uma das contas atingir limit (UAT-04-01)

## Referências

- \`packages/adapters/claude-local/src/server/execute.ts:253\` — passthrough de CLAUDE_CONFIG_DIR (já existe)
- \`.planning/REQUIREMENTS.md\` SPIKE-04, SPIKE-05
- \`.planning/ROADMAP.md\` §"Phase 4" success criterion #4
REPORT

echo "[multi-account] Report saved to $REPORT_FILE"
echo "[multi-account] === DONE — review captures/ and $REPORT_FILE ==="
