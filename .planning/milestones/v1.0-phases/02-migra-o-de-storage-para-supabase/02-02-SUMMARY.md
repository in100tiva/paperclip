---
phase: 02-migra-o-de-storage-para-supabase
plan: 02
subsystem: infra
tags: [husky, git-hooks, security, secret-scanning, jwt, vitest]

requires:
  - phase: 01-fork-hard-cerim-nia-de-corte
    provides: pnpm workspace with vitest@3.0.5, scripts/ directory, root package.json
provides:
  - Pre-commit hook blocking JWT-shaped literals in client-side files (ui/src/**, *.tsx, *.jsx)
  - Pre-commit hook blocking VITE_*SERVICE_ROLE* / VITE_*SECRET* env var names anywhere
  - Reusable checkDiff() ESM export for programmatic diff scanning
  - Zero-friction install path: husky auto-installs via prepare script on pnpm install
affects: [02-03, 02-04, 02-05, 02-06, all future phases that touch ui/src or *.env*]

tech-stack:
  added: [husky@9.1.7]
  patterns:
    - "Standalone vitest config in scripts/ to bypass root workspace projects (vitest-config-bypass)"
    - "ESM ESM script with isMain detection so it can be both CLI and importable module"
    - "Patterns regex-based; minimum-length quantifiers ({15,}.{10,}.{10,}) prevent false positives on short eyJ substrings"

key-files:
  created:
    - scripts/check-no-service-role-leak.mjs
    - scripts/check-no-service-role-leak.test.mjs
    - scripts/check-no-service-role-leak.vitest.config.mjs
    - .husky/pre-commit
  modified:
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Path classification: ui/src/** and *.tsx/*.jsx are client-side (forbidden for JWTs); server/**, packages/**, scripts/** are server-side (allowed)"
  - "Two independent checks per added line: (1) VITE_*SERVICE_ROLE*/SECRET* applies anywhere, (2) JWT regex applies only to client-side paths"
  - "Standalone vitest config (scripts/check-no-service-role-leak.vitest.config.mjs) avoids running the entire workspace test matrix when only this single file needs to be exercised by the hook's verification"
  - "Hook contains a single line (no shebang, no source) — husky 9 idiomatic"

patterns-established:
  - "Scripts that are both CLI and importable: detect isMain via import.meta.url comparison with process.argv[1] (Windows-safe via replaceAll('\\\\','/'))"
  - "Regex-as-policy: structural JWT detection (3 segments, length floor) instead of value-based denylist — catches future leaks without maintenance"
  - "git diff --cached --unified=0 is the canonical input; checker only flags additions (lines starting with `+` but not `+++`)"

requirements-completed: [AUTH-05]

duration: 5min
completed: 2026-04-26
---

# Phase 02 Plan 02: Pre-commit Service-Role Leak Guard Summary

**Husky-managed pre-commit hook that blocks JWT-shaped literals in `ui/src/**`/`*.tsx`/`*.jsx` and `VITE_*SERVICE_ROLE*`/`VITE_*SECRET*` env vars from ever reaching a commit, validated by 7 vitest cases covering both real leaks and false-positive edge cases.**

## Performance

- **Duração:** ~5 min (excluding pnpm install network time of 2m11s)
- **Iniciado:** 2026-04-26T02:48:41Z
- **Concluído:** 2026-04-26T02:53:38Z
- **Tarefas:** 2
- **Arquivos modificados:** 6

## Realizações

- AUTH-05 satisfied — first line of defense against accidental Supabase service-role key leaks
- Detector exposed as both CLI (entrypoint) and ESM `checkDiff(diff)` export, fully test-covered (7/7 passing)
- Husky auto-installs hooks on any `pnpm install`, so any new dev cloning the repo gets the guard with zero manual setup
- False-positive resilient: `eyJshort` substrings, removed lines (`-` prefix), and server-side paths all pass through cleanly

## Commits das Tarefas

Cada tarefa foi comitada atomicamente:

1. **Tarefa 1 (TDD RED): test for service-role leak detector** - `ba29530` (test)
2. **Tarefa 1 (TDD GREEN): implement service-role leak detector** - `7e0f562` (feat)
3. **Tarefa 2: wire husky pre-commit hook** - `cdd17cf` (feat)

**Metadados do plano:** _(será criado pelo final commit, ver state_updates)_

_Nota: Tarefa 1 era TDD; tem dois commits (RED test + GREEN impl). Tarefa 2 não é TDD; um commit._

## Arquivos Criados/Modificados

- `scripts/check-no-service-role-leak.mjs` — detector ESM script + CLI entrypoint; exports `checkDiff(diff)`
- `scripts/check-no-service-role-leak.test.mjs` — 7 vitest cases (clean diff, JWT in ui/src, VITE_SERVICE_ROLE, server-side allow, VITE_SECRET, eyJshort false-positive, removal-only diff)
- `scripts/check-no-service-role-leak.vitest.config.mjs` — minimal vitest config that scopes the run to this single file, bypassing the root `vitest.config.ts` workspace projects
- `.husky/pre-commit` — single-line hook invoking `node scripts/check-no-service-role-leak.mjs`; tracked with mode `100755`
- `package.json` — added `husky@^9.1.7` to devDependencies, added `"prepare": "husky"` script
- `pnpm-lock.yaml` — husky added to lockfile

## Caminhos Protegidos vs Caminhos Livres

| Categoria | Padrão | Comportamento |
|-----------|--------|---------------|
| Client-side (forbidden) | `ui/src/**` | JWT-shaped literal → blocked |
| Client-side (forbidden) | `*.tsx`, `*.jsx` | JWT-shaped literal → blocked |
| Server-side (allowed) | `server/**`, `packages/**`, `scripts/**` | JWT-shaped literal → permitido |
| Env vars (forbidden anywhere) | `VITE_*SERVICE_ROLE*`, `VITE_*SECRET*` | Nome bloqueado em qualquer arquivo |

## Comandos de Validação

```bash
# Run the test suite (7 cases):
pnpm exec vitest run --config scripts/check-no-service-role-leak.vitest.config.mjs

# Verify hook content:
cat .husky/pre-commit
# Expect: node scripts/check-no-service-role-leak.mjs

# Verify husky auto-install path:
node -e "console.log(require('./package.json').scripts.prepare, require('./package.json').devDependencies.husky)"
# Expect: husky ^9.1.7

# Smoke the detector against current staged state:
node scripts/check-no-service-role-leak.mjs && echo OK
```

## Decisões Tomadas

- **Standalone vitest config:** the root `vitest.config.ts` declares 12 workspace projects (server, ui, cli, all adapters). Running `pnpm exec vitest run scripts/...` from root spawned vitest in every project, none of which collected the file. Created `scripts/check-no-service-role-leak.vitest.config.mjs` as a minimal scoped config — added to repo so anyone (including the hook itself if extended) can re-run the suite trivially.
- **Hook is single-line:** husky 9 dropped the boilerplate (shebang + source husky.sh). Plan called for one line; implementation followed.
- **Mode 100755:** explicitly set via `git update-index --chmod=+x` so the executable bit travels in the tree (Windows ignores it locally but Linux/macOS dev machines and CI need it).
- **JWT regex `eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}`:** structural three-segment match with length floors. `eyJshort` (under threshold) bypasses; real JWTs (always >100 chars) trigger. Tests 6 + 7 specifically cover this behavior.

## Desvios do Plano

Nenhum desvio funcional. Um detalhe de implementação prático foi adicionado fora do plano:

### Adições Práticas

**1. [Regra 3 - Bloqueador] Created `scripts/check-no-service-role-leak.vitest.config.mjs`**
- **Encontrado durante:** Tarefa 1 (vitest run)
- **Problema:** O `vitest.config.ts` da raiz declara 12 workspace projects, então `pnpm exec vitest run scripts/...` não rodava o arquivo (cada project tem seu próprio include glob).
- **Correção:** Adicionado um vitest config minimal em `scripts/` para escopear o run ao arquivo único.
- **Arquivos modificados:** `scripts/check-no-service-role-leak.vitest.config.mjs` (novo)
- **Verificação:** `pnpm exec vitest run --config scripts/check-no-service-role-leak.vitest.config.mjs` → 7/7 passed
- **Comitado em:** `ba29530` (junto com o test file na fase RED)

**Total de desvios:** 1 corrigido automaticamente (Regra 3 — bloqueador de execução de teste)
**Impacto no plano:** Não muda a superfície de saída; apenas adiciona um arquivo de config necessário para tornar o comando de verificação do plano executável.

## Problemas Encontrados

- **vitest workspace projects:** o root `vitest.config.ts` herda 12 projects (server, ui, cli, packages/*); rodar vitest direto na raiz dispara em cada um, nenhum deles inclui `scripts/`. Resolvido via config standalone.
- **Windows line endings:** `git commit` emite warning `LF will be replaced by CRLF`. Esperado e benigno; husky hook é shell script invocado por git core, não interpretado pelo OS.

## Configuração Manual Necessária

Nenhuma — `pnpm install` já foi executado nesta sessão e disparou o `prepare` script do husky, que escreveu `.git/hooks/pre-commit` delegando para `.husky/`. Devs novos clonando o repo só precisam de um `pnpm install` para herdar o guard.

## Prontidão para Próxima Fase

- AUTH-05 fechado. As próximas waves do plano (Wave 2: 02-03 schema, Wave 3: 02-04 RLS / 02-05 server config, Wave 4: 02-06 docs) podem assumir que qualquer commit acidentalmente expondo service-role key será rejeitado localmente antes de chegar ao remoto.
- Plan 02-01 (paralelo nesta wave) trata da criação do projeto Supabase em si; este plano é independente e não tem coupling.
- Sem bloqueios.

## Self-Check: PASSED

- FOUND: scripts/check-no-service-role-leak.mjs
- FOUND: scripts/check-no-service-role-leak.test.mjs
- FOUND: scripts/check-no-service-role-leak.vitest.config.mjs
- FOUND: .husky/pre-commit
- FOUND: commit ba29530 (test RED)
- FOUND: commit 7e0f562 (feat GREEN)
- FOUND: commit cdd17cf (Task 2: husky wiring)

---
*Fase: 02-migra-o-de-storage-para-supabase*
*Concluída: 2026-04-26*
