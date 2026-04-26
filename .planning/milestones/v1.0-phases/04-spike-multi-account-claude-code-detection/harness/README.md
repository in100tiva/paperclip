# Harness: Multi-Account Empirical Validation (Spike Phase 4)

**Spike Phase 4 — código descartável.** Vive em `.planning/phases/04-*/harness/`, NÃO em `scripts/` raiz (D-16, D-18).

## Propósito

Permitir que o usuário (operador humano) valide empiricamente os SPIKE-04 e SPIKE-05 quando tiver 2 contas Claude Code reais disponíveis. Executor Claude não pode rodar isto autonomamente — precisa de credenciais reais e potencialmente uma conta exhausted.

Itens HUMAN-UAT cobertos:
- **UAT-04-02**: confirmar empiricamente que `session_id` é per-account
- **UAT-04-03**: smoke manual de swap mid-flight com `CLAUDE_CONFIG_DIR` e tentativa de continuação

## Pré-requisitos

1. `claude` CLI instalado e no PATH
2. Diretórios de conta criados e logados:
   ```bash
   mkdir -p ~/.paperclip/claude-accounts/a ~/.paperclip/claude-accounts/b
   CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/a claude login
   CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/b claude login
   ```
3. (Opcional para UAT-04-01) Uma das contas próxima do limit, ou conta de teste descartável para captura real de 429

## Scripts

### `capture-fixture.sh`

Captura um stream-JSON de uma única conta para uso como fixture.

```bash
./capture-fixture.sh <account-slug> "<prompt>" [output-file]
```

Exemplo (UAT-04-01 — capturar fixture real de 429 quando conta atingir limit):

```bash
# Rodar contra conta com limit próximo
./capture-fixture.sh test "explain quantum mechanics in 50000 tokens of detail" captures/real-429-daily.jsonl
```

Inspecionar o output: se contém token de 429 da taxonomia (`rate_limit_error`, `usage limit reached`, etc), mover para `../prototype/fixtures/<tipo>.txt` substituindo o stub correspondente.

### `test-multi-account-resume.sh`

Roda smoke multi-account completo:
1. Captura baseline de account A (sessão 1, `CLAUDE_CONFIG_DIR=a`)
2. Captura baseline de account B (sessão 2, `CLAUDE_CONFIG_DIR=b`)
3. Tenta resumir sessão A via `CLAUDE_CONFIG_DIR=b` (cross-account resume — esperado falhar)
4. Gera `multi-account-empirical.md` com relatório

```bash
./test-multi-account-resume.sh
```

Output:
- `captures/account-a-baseline.jsonl`
- `captures/account-b-baseline.jsonl`
- `captures/cross-account-resume.jsonl`
- `multi-account-empirical.md` (preencher observações manuais)

## Fluxo HUMAN-UAT recomendado

1. **UAT-04-01 (capture real 429 fixture):**
   - Rodar `capture-fixture.sh` contra conta de teste com prompt grande até atingir 429
   - Mover output para `../prototype/fixtures/<tipo>.txt` substituindo stub
   - Re-rodar `npx vitest` no protótipo para confirmar que classifier ainda passa

2. **UAT-04-02 (session_id per-account):**
   - Rodar `test-multi-account-resume.sh`
   - Verificar `multi-account-empirical.md` Step 1+2: session_A != session_B?
   - Marcar UAT-04-02 como passed/failed em `04-HUMAN-UAT.md`

3. **UAT-04-03 (swap manual com continuação):**
   - Iniciar agente em conta A: `CLAUDE_CONFIG_DIR=a claude -p "start a multi-step task"` (capturar session_id)
   - Simular exhaustão (ou aguardar real)
   - Trocar para conta B: `CLAUDE_CONFIG_DIR=b claude -p "<continuation summary>" --resume <session_id_A>` (ou nova sessão B com summary)
   - Documentar comportamento em `04-HUMAN-UAT.md` UAT-04-03

## Limitações conhecidas

- **Bash-only**: scripts assumem ambiente POSIX. Windows precisa Git Bash ou WSL. (Operador roda em Linux/macOS típico ou Git Bash; documentado como expected.)
- **Reset de session storage**: scripts não limpam `~/.paperclip/claude-accounts/*` antes de rodar — assumem estado dos diretórios é responsabilidade do operador.
- **Custo**: cada execução consome quota nas duas contas. Usar prompts mínimos.

## Disposable

Conforme D-18: este harness é descartável. Phase 5 implementa a versão de produção em `services/claude-accounts.ts` (MULTI-04). Quando Phase 5 estiver completa, este diretório pode ser arquivado ou deletado.

## Referências

- `../04-CONTEXT.md` D-15..D-18
- `../04-HUMAN-UAT.md` (criado em plano 04-05) — UAT-04-01..03
- `packages/adapters/claude-local/src/server/execute.ts:253` — `CLAUDE_CONFIG_DIR` passthrough já implementado
- `.planning/REQUIREMENTS.md` SPIKE-04, SPIKE-05, MULTI-05
- `.planning/ROADMAP.md` §"Phase 4" success criterion #4
