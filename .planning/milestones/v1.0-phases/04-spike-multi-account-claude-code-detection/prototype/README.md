# Protótipo: detectClaudeQuotaExhausted

**Spike Phase 4 — código descartável.** NÃO IMPORTAR em produção.

## Propósito

Validar empiricamente uma estrutura de classifier para exhaustão de Claude Code CLI antes de implementar a versão de produção em Phase 5 (`packages/adapters/claude-local/src/server/parse.ts` MULTI-06).

Conforme D-09 (04-CONTEXT.md): protótipo standalone, vive em `.planning/phases/04-*/prototype/`, NÃO em `packages/` ou `scripts/`.

## API

```typescript
import { detectClaudeQuotaExhausted } from "./detect-quota-exhausted";

const result = detectClaudeQuotaExhausted(streamJsonOrStderr);
// { type: "session_5h", confidence: 0.9, retryAt: Date, source: "regex" }
```

**Tipos suportados:** `rpm_transient`, `tpm_transient`, `daily_quota`, `weekly_quota`, `session_5h`, `org_tier`, `unknown`.

## Como rodar os tests

```bash
npx vitest run --config .planning/phases/04-spike-multi-account-claude-code-detection/prototype/vitest.config.ts --no-coverage
```

A flag `--config` é obrigatória — o `vitest.config.ts` da raiz declara workspace projects que excluem qualquer arquivo fora de `packages/`, `server/`, `ui/`, `cli/`. O config standalone aqui (`vitest.config.ts` neste diretório) também desativa o walk-up do tsconfck (`esbuild.tsconfigRaw` inline) para contornar uma referência stale em `./tsconfig.json` apontando para `packages/adapters/droid-local` (pasta inexistente — issue pre-existente fora do escopo do spike).

## Estrutura

- `detect-quota-exhausted.ts` — função classifier
- `detect-quota-exhausted.test.ts` — vitest suite (8 cases)
- `fixtures/` — 6 fixtures stub (1 por tipo da taxonomia)
- `vitest.config.ts` — config standalone para rodar isolado do workspace principal

## Fixtures

Conforme D-11: fixtures iniciais são **stubs** baseados em mensagens conhecidas (regex existente em `parse.ts:12-15` + docs Anthropic). Captura real é feita em **HUMAN-UAT-04-01** (ver `04-HUMAN-UAT.md`) e substitui os stubs incrementalmente.

| Fixture | Tipo | Status |
|---------|------|--------|
| `fixtures/rpm_transient.txt` | rpm_transient | stub |
| `fixtures/tpm_transient.txt` | tpm_transient | stub |
| `fixtures/daily_quota.txt` | daily_quota | stub |
| `fixtures/weekly_quota.txt` | weekly_quota | stub |
| `fixtures/org_tier.txt` | org_tier | stub |
| `fixtures/session_5h.txt` | session_5h | stub |

## Relação com produção (Phase 5)

Phase 5 MULTI-06 implementa a versão de produção. O protótipo aqui:
1. Valida que a forma de output `{ type, confidence, retryAt, source }` é viável
2. Demonstra reuso das regex existentes (`CLAUDE_TRANSIENT_UPSTREAM_RE`, `CLAUDE_EXTRA_USAGE_RESET_RE`) em vez de reescrever do zero
3. Identifica edge cases (org_tier partial coverage, RPM/TPM ambiguity, "claude usage limit reached" overlapping daily vs session_5h) para a implementação real

Quando Phase 5 estiver completa, este diretório pode ser arquivado ou deletado.

## Limitações conhecidas

- **Partial coverage** para `org_tier` e `tpm_transient`: regex top-level dispara, mas discriminator é heurístico. Tests aceitam variações.
- **Ambiguidade "claude usage limit reached"**: token aparece em daily_quota e session_5h. Discriminator strict para session_5h exige `5-hour limit reached` literal; sem ele, a string cai em daily_quota (default conservador).
- **Headers HTTP não cobertos**: protótipo só processa string (stream-JSON ou stderr blob). Detecção pré-emptiva via `anthropic-ratelimit-*` headers é decisão de Phase 5 (ver `DECISION-DETECTION-STRATEGY.md`).
- **Fixtures são stubs**: HUMAN-UAT-04-01 substitui com captura real quando disponível.

## Referências

- `../CLAUDE_429_TAXONOMY.md` — taxonomia 6-tipos com cobertura por regex existente
- `../DECISION-DETECTION-STRATEGY.md` — decisão arquitetural reativo vs pré-emptivo
- `packages/adapters/claude-local/src/server/parse.ts:12-15` — regex de produção (audit target, READ-ONLY no spike)
