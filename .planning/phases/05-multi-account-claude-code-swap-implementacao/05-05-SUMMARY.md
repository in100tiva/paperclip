---
phase: 05-multi-account-claude-code-swap-implementacao
plan: 05
subsystem: adapter
tags: [claude-code, multi-account, env-wiring, typescript, vitest]

requires:
  - phase: 04-spike-multi-account-claude-code-detection
    provides: "Finding 2 (CLAUDE_CONFIG_DIR já em includeRuntimeKeys execute.ts:253) — confirma que MULTI-05 é wiring, não patch from-scratch"
provides:
  - "Campo opcional config.claudeConfigDir em buildClaudeRuntimeConfig do adapter claude-local"
  - "Wiring config.claudeConfigDir → env.CLAUDE_CONFIG_DIR antes do spawn (precedência sobre config.env.CLAUDE_CONFIG_DIR)"
  - "Test suite (3 cases) validando wiring + precedência + comportamento default"
affects: [05-06-heartbeat-integration, multi-account-rotation, claude-account-isolation]

tech-stack:
  added: []
  patterns:
    - "Cross-platform env wiring test via onMeta callback (captura loggedEnv antes do spawn — bypassa shebang resolution no Windows)"
    - "Config field com precedência sobre config.env genérico (pattern reutilizável para outros campos dedicados em adapters)"

key-files:
  created: []
  modified:
    - "packages/adapters/claude-local/src/server/execute.ts (+11 linhas — wiring claudeConfigDir + comentário MULTI-05 documentando precedência)"
    - "server/src/__tests__/claude-local-execute.test.ts (+114 linhas — describe 'MULTI-05 — claudeConfigDir wiring' com 3 cases)"

key-decisions:
  - "Precedência: config.claudeConfigDir > config.env.CLAUDE_CONFIG_DIR > process.env.CLAUDE_CONFIG_DIR (via includeRuntimeKeys logging)"
  - "Wiring inserido APÓS loop envConfig (linhas 240-242) — campo dedicado vence env genérico se ambos fornecidos"
  - "includeRuntimeKeys[HOME, CLAUDE_CONFIG_DIR] na linha 253 PERMANECE intacta (logging side; ortogonal ao wiring)"
  - "Tests usam process.execPath + onMeta capture (não fake CLI script com shebang) — funcionam em Windows sem requerer .cmd wrapper"
  - "Test localizado em server/src/__tests__/claude-local-execute.test.ts (Opção A do plano) — pattern existente lá já capturava CLAUDE_CONFIG_DIR; reuso de helpers como setupExecuteEnv não foi necessário pois onMeta capture é suficiente"
  - "Login flow (runClaudeLogin, linha 280+) NÃO modificado — fora escopo MULTI-05 v1; spawn de execute() é o único caller que precisa de per-account isolation"

patterns-established:
  - "Adapter config schema: campos dedicados (claudeConfigDir) > env genérico (config.env.CLAUDE_CONFIG_DIR) > host process.env (via runtimeEnv merge). Documentar precedência inline."
  - "Test cross-platform de env wiring: capture via onMeta antes do spawn; ignora exit code do child process. Reusable para outros adapters."
  - "Comentário inline com requisito (MULTI-05) + referência a Phase/Finding (FINDINGS-FOR-PHASE-5.md Finding 2) para rastreabilidade."

requirements-completed: [MULTI-05]

duration: ~7min
completed: 2026-04-26
---

# Phase 5 Plan 05: MULTI-05 claudeConfigDir Wiring Summary

**Adapter claude-local agora aceita `config.claudeConfigDir` opcional e o roteia para `env.CLAUDE_CONFIG_DIR` antes do spawn, habilitando o caller (heartbeat 05-06) a injetar credencial dir per-account sem mutar process.env.**

## Performance

- **Duração:** ~7min
- **Iniciado:** 2026-04-26T06:19:03Z
- **Concluído:** 2026-04-26T06:26:21Z
- **Tarefas:** 2/2
- **Arquivos modificados:** 2

## Realizações

- Wiring cirúrgico (11 linhas) em `buildClaudeRuntimeConfig` (execute.ts) — campo dedicado `config.claudeConfigDir` é honrado APÓS loop envConfig, então tem precedência sobre `config.env.CLAUDE_CONFIG_DIR`
- 3 test cases passando confirmam: (1) wiring básico — campo fornecido vira env, (2) precedência — campo dedicado vence env genérico, (3) comportamento default preservado — sem campo, host process.env continua propagando via includeRuntimeKeys
- Tests cross-platform (rodam em Windows sem shebang resolution issues)
- Existing claude-local-* tests (15 cases em 3 arquivos) continuam passando — zero regressão

## Diff em execute.ts (linhas adicionadas)

```typescript
// MULTI-05 (Phase 5): explicit config field for Claude account credential dir.
// Precedence: config.claudeConfigDir > config.env.CLAUDE_CONFIG_DIR > process.env.CLAUDE_CONFIG_DIR
// (the last one is propagated via includeRuntimeKeys below for logging visibility, but the spawn
// env now honors a dedicated field so callers — heartbeat in 05-06 — can inject per-account
// isolation via selectActiveAccount(agent) → resolveCredentialDir without mutating process.env.
// See: server/src/services/claude-accounts.ts and FINDINGS-FOR-PHASE-5.md Finding 2.
const claudeConfigDir = asString(config.claudeConfigDir, "");
if (claudeConfigDir) {
  env.CLAUDE_CONFIG_DIR = claudeConfigDir;
}
```

Inserido entre o loop `for (const [key, value] of Object.entries(envConfig))` (linha 240-242) e o assign de `env.PAPERCLIP_API_KEY` (linha 244-246). `includeRuntimeKeys: ["HOME", "CLAUDE_CONFIG_DIR"]` na linha 253 (agora ~265 com offset) permanece intacta.

## Localização do test

Optei pela **Opção A** do plano: adicionar 3 cases em `server/src/__tests__/claude-local-execute.test.ts` em vez de criar `packages/adapters/claude-local/src/server/execute.test.ts` separado.

**Justificativa:**
- Test file existente já tinha pattern de captura de `claudeConfigDir` via fake CLI script (linhas 39, 75) e via `loggedEnv` (linha 388 — `expect(loggedEnv.CLAUDE_CONFIG_DIR).toBe(claudeConfigDir)`).
- Centralizar tests do adapter `execute()` em um único arquivo facilita manutenção.
- Workspace vitest do `server` package roda automaticamente; criar test file no claude-local package exigiria configurar standalone vitest setup (extra trabalho sem ganho).

**Implementação técnica:**
- Tests usam helper `runExecuteCapturingMeta` que captura `loggedEnv` via `onMeta` callback ANTES do spawn ser executado.
- Spawn aponta para `process.execPath` (Node binary) — cross-platform; bypassa resolução de shebang `#!/usr/bin/env node` que falha em Windows sem `.cmd` wrapper.
- Não asserto `result.exitCode === 0` porque o wiring está totalmente capturado na fase `buildClaudeRuntimeConfig` (antes do child process iniciar). Spawn pode falhar ou suceder; é irrelevante para o que se está validando.
- Existing tests no mesmo arquivo (que assumem Linux shebang) continuam falhando em Windows — comportamento preexistente, não regressão minha; foi confirmado rodando `pnpm vitest run -t "passes --append-system-prompt-file on a fresh session"` no Windows pré-mudança.

## Confirmação de Finding 2 (Phase 4)

`packages/adapters/claude-local/src/server/execute.ts:253` (agora linha ~265 após insert) tinha:

```typescript
includeRuntimeKeys: ["HOME", "CLAUDE_CONFIG_DIR"],
```

Isso já propagava `process.env.CLAUDE_CONFIG_DIR` para `loggedEnv` (e indiretamente para o spawn via `runtimeEnv = { ...process.env, ...env }` na linha 248). Significa que **multi-account funcionava** desde que o caller mutasse `process.env.CLAUDE_CONFIG_DIR` antes de invocar `execute()`. Mas isso seria global (process-wide) e não thread-safe entre múltiplos heartbeats concorrentes para agentes diferentes.

Este plano formaliza a passagem por **objeto config** (per-call), permitindo que o caller (heartbeat em 05-06) faça:

```typescript
const account = await claudeAccountsService.selectActiveAccount(agentId);
const claudeConfigDir = claudeAccountsService.resolveCredentialDir(account);
await execute({
  ...,
  config: { ..., claudeConfigDir }, // per-call, não muta process.env
});
```

## Precedência Documentada

Ordem de resolução de `CLAUDE_CONFIG_DIR` no spawn final:

1. **`config.claudeConfigDir`** (campo dedicado MULTI-05) — vence se fornecido
2. **`config.env.CLAUDE_CONFIG_DIR`** (env genérico do adapter config) — vence se (1) ausente
3. **`process.env.CLAUDE_CONFIG_DIR`** (host environment via `runtimeEnv = { ...process.env, ...env }` na linha 248) — fallback final

`includeRuntimeKeys: ["HOME", "CLAUDE_CONFIG_DIR"]` (linha 253) é **logging-side** — só afeta `loggedEnv` para visibilidade em metadata; ortogonal à precedência efetiva no spawn (que é determinada pela ordem de assignment em `env`).

## Edge Cases NÃO Cobertos (intencional, fora de escopo)

- **Login flow (`runClaudeLogin`, linha 280+):** Pode também se beneficiar de `claudeConfigDir`, mas login é um flow separado e MULTI-05 v1 cobre apenas spawn de execute. Refinar quando UI MULTI-09 expor "registrar conta" (provavelmente plano 05-09 ou similar).
- **Validação que `claudeConfigDir` aponta para diretório existente:** Não validado pelo adapter — caller (heartbeat) é responsável via `claudeAccountsService.resolveCredentialDir` (D-09 do 05-CONTEXT.md), que lança `CredentialDirMissingError` se diretório não existe.
- **Sluggify / sanitização do path:** Trustamos que caller passa path absoluto válido. Adapter apenas seta env var; não faz path manipulation.

## Commits das Tarefas

1. **Tarefa 1: Wire config.claudeConfigDir → env.CLAUDE_CONFIG_DIR em execute.ts** — `74f5f40` (feat)
2. **Tarefa 2: Test confirmando wiring claudeConfigDir → env** — `9a5c2b3` (test)

## Arquivos Criados/Modificados

- `packages/adapters/claude-local/src/server/execute.ts` — +11 linhas (wiring + comentário MULTI-05)
- `server/src/__tests__/claude-local-execute.test.ts` — +114 linhas (describe MULTI-05 com 3 cases + helper runExecuteCapturingMeta)

## Decisões Tomadas

- **Precedência claudeConfigDir > config.env.CLAUDE_CONFIG_DIR:** Campo dedicado é semantically explícito (caller declara intenção multi-account); env genérico é catch-all. Vencer faz sentido — caso contrário, adicionar campo dedicado seria inútil.
- **Tests via onMeta em vez de spawn capture:** Cross-platform (Windows) + foca no wiring (que ocorre antes do spawn) em vez de testar end-to-end do CLI execution (que é coberto por outros tests).
- **Não modificar `runClaudeLogin`:** Escopo MULTI-05 v1 é spawn de execute. Login flow pode ser refinado em fase de UI (MULTI-09) se necessário.
- **Test em server/src/__tests__/ (Opção A):** Pattern existente lá já capturava `CLAUDE_CONFIG_DIR`; centraliza adapter execute tests; evita configurar standalone vitest no claude-local package.

## Desvios do Plano

Nenhum desvio das Regras 1-3. Algumas adaptações pragmáticas durante implementação:

1. **Refator de tests para usar onMeta em vez de spawn capture (não é um desvio — é um detalhe de implementação previsto):** O plano sugeria reusar `setupExecuteEnv` helper, mas o problema de spawn não-trivial em Windows tornou claro que `onMeta` capture é mais simples e cross-platform. O plano explicitamente dizia "se test requer apenas uma chamada extra a uma fixture já existente" — onMeta foi a fixture certa.

**Total de desvios:** 0 (ajustes de implementação dentro do escopo do plano)
**Impacto no plano:** Nenhum — sucesso atendendo todos os success criteria sem ampliar escopo.

## Problemas Encontrados

1. **Tests iniciais falharam em Windows com "Failed to start command":** Fake CLI script com shebang `#!/usr/bin/env node` não resolve em Windows sem `.cmd` wrapper. Existing tests no mesmo arquivo (importados do paperclip upstream) também falham nessa plataforma — não é regressão minha. **Resolução:** refatorar tests para usar `onMeta` capture + `process.execPath` (cross-platform). Mantém wiring totalmente coberto sem depender de child process executar com sucesso.

2. **Linter refatorou test file durante a primeira invocação:** Ao salvar o test, o linter extraiu helper `setupExecuteEnv` e refatorou múltiplos tests existentes. Aceitei a refatoração (não revertí); meus tests usam o helper quando aplicável e bypassam-no quando não.

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo.

## Self-Check

- [x] `packages/adapters/claude-local/src/server/execute.ts` — `claudeConfigDir` aparece 4 vezes (declaração + assign + comentário); MULTI-05 aparece 1 vez; includeRuntimeKeys intacta
- [x] Commit `74f5f40` (Tarefa 1) — confirmado via `git log --oneline | grep 74f5f40`
- [x] Commit `9a5c2b3` (Tarefa 2) — confirmado via `git log --oneline | grep 9a5c2b3`
- [x] `cd packages/adapters/claude-local && pnpm tsc --noEmit` — exit 0
- [x] `cd server && pnpm tsc --noEmit` — exit 0
- [x] `cd server && pnpm vitest run src/__tests__/claude-local-execute.test.ts -t "MULTI-05"` — 3 passed
- [x] `cd server && pnpm vitest run src/__tests__/claude-local-adapter*.test.ts src/__tests__/claude-local-skill-sync.test.ts` — 15 passed (zero regressão)

## Self-Check: PASSED

## Prontidão para Próxima Fase

- **Pronto para 05-06 (Heartbeat Integration):** Adapter `claude-local` agora aceita `config.claudeConfigDir`. Heartbeat pode fazer:
  ```typescript
  const account = await claudeAccountsService.selectActiveAccount(agentId);
  const claudeConfigDir = claudeAccountsService.resolveCredentialDir(account);
  await executeAdapter({ ..., config: { ..., claudeConfigDir } });
  ```
- **Sem bloqueios:** wiring é trivial e testado; pronto para consumo.
- **Convergência futura:** se `runClaudeLogin` precisar de per-account isolation (ex: UI registrar conta), aplicar mesmo pattern em `runClaudeLogin` (linha 280+) — adicionar `if (claudeConfigDir) env.CLAUDE_CONFIG_DIR = claudeConfigDir;` em `buildClaudeRuntimeConfig` já cobre `runClaudeLogin` que usa a mesma função (linha 289).

---
*Fase: 05-multi-account-claude-code-swap-implementacao*
*Concluída: 2026-04-26*
