#!/usr/bin/env bash
# Spike Phase 4 — capture-fixture.sh
# Captura stream-JSON do claude CLI para uma conta específica.
#
# Uso:
#   ./capture-fixture.sh <account-slug> <prompt> [output-file]
#
# Exemplo:
#   ./capture-fixture.sh a "say hello in 3 words" fixtures/account-a-baseline.jsonl
#
# Requer:
#   - claude CLI no PATH
#   - $HOME/.paperclip/claude-accounts/<account-slug>/ existir e estar configurado
#
# Output:
#   - Stream-JSON salvo em <output-file> (default: account-<slug>-<timestamp>.jsonl)
#   - session_id extraído impresso no stderr para captura rápida

set -euo pipefail

ACCOUNT_SLUG="${1:-}"
PROMPT="${2:-say hello}"
OUTPUT_FILE="${3:-}"

if [[ -z "$ACCOUNT_SLUG" ]]; then
  echo "Usage: $0 <account-slug> <prompt> [output-file]" >&2
  echo "Example: $0 a \"say hello in 3 words\" fixtures/account-a-baseline.jsonl" >&2
  exit 64
fi

ACCOUNT_DIR="$HOME/.paperclip/claude-accounts/$ACCOUNT_SLUG"

if [[ ! -d "$ACCOUNT_DIR" ]]; then
  echo "ERROR: $ACCOUNT_DIR does not exist." >&2
  echo "Setup the account directory first (e.g. claude login with CLAUDE_CONFIG_DIR=$ACCOUNT_DIR)." >&2
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "ERROR: claude CLI not found in PATH." >&2
  exit 1
fi

if [[ -z "$OUTPUT_FILE" ]]; then
  TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
  OUTPUT_FILE="$(dirname "$0")/captured-account-${ACCOUNT_SLUG}-${TIMESTAMP}.jsonl"
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "[capture-fixture] account=$ACCOUNT_SLUG dir=$ACCOUNT_DIR output=$OUTPUT_FILE" >&2
echo "[capture-fixture] prompt=$PROMPT" >&2

# Spawn claude com CLAUDE_CONFIG_DIR isolado (mesmo mecanismo de produção, execute.ts:253)
CLAUDE_CONFIG_DIR="$ACCOUNT_DIR" claude \
  --output-format stream-json \
  --verbose \
  -p "$PROMPT" \
  > "$OUTPUT_FILE" 2>&1 || EXIT_CODE=$?

EXIT_CODE="${EXIT_CODE:-0}"

# Extrair session_id da primeira linha system/init
SESSION_ID=$(grep -o '"session_id":"[^"]*"' "$OUTPUT_FILE" | head -1 | sed 's/.*"session_id":"\([^"]*\)".*/\1/')

echo "[capture-fixture] exit_code=$EXIT_CODE" >&2
echo "[capture-fixture] session_id=${SESSION_ID:-<not_found>}" >&2
echo "[capture-fixture] saved to $OUTPUT_FILE" >&2

if [[ $EXIT_CODE -ne 0 ]]; then
  echo "[capture-fixture] WARNING: claude exited non-zero. Stream may include 429/auth errors — verifique fixture." >&2
fi

exit $EXIT_CODE
