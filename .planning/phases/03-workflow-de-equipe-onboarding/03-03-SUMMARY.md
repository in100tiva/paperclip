---
phase: 03-workflow-de-equipe-onboarding
plan: 03
subsystem: docs
tags: [troubleshooting, onboarding, docs, pt-br, team-05]
requires: []
provides: [troubleshooting-guide, team-05-coverage]
affects: [ONBOARDING.md cross-links, pnpm setup error messages]
tech_stack_added: []
tech_stack_patterns: [pt-br-docs, sintoma-causa-solucao]
key_files_created:
  - TROUBLESHOOTING.md
key_files_modified: []
decisions:
  - D-17 honored: 7 known-issue sections, no Phase 4+ multi-account problems mentioned
  - D-18 honored: every causa in code cites file path (and line where applicable)
  - Anchors em GitHub-flavored slugs alinhados com links pré-existentes do ONBOARDING.md
metrics:
  duration_min: 4
  tasks_completed: 1
  files_created: 1
  files_modified: 0
  commits: 1
  lines_written: 193
completed_date: "2026-04-26"
---

# Phase 3 Plan 03: TROUBLESHOOTING.md Summary

## One-Liner

Guia pt-br `TROUBLESHOOTING.md` (193 linhas) com 7 seções Sintoma→Causa→Solução cobrindo Windows NTFS, stale registry, limite de conexões Supabase, cookie prefix divergente, schema desatualizado, ausência de `claude` CLI e `prepared statement` em pooler 6543 — cada problema com causa em código cita arquivo/linha exato.

## What Was Built

Arquivo único `TROUBLESHOOTING.md` na raiz do repo com a estrutura travada por D-17 (cobertura mínima de 7 problemas) e D-18 (citações de arquivo/linha).

### Seções escritas (ordem do arquivo)

| # | H2                                                | Anchor GitHub-flavored                                            | Causa cita arquivo               |
|---|---------------------------------------------------|-------------------------------------------------------------------|----------------------------------|
| 1 | Windows NTFS                                      | `#windows-ntfs`                                                   | scripts/kill-dev.sh              |
| 2 | Stale runtime-services registry                   | `#stale-runtime-services-registry`                                | scripts/kill-dev.sh + SMOKE-TEST-LOG.md |
| 3 | Supabase no limite de conexões (`too many connections`) | `#supabase-no-limite-de-conex%C3%B5es-too-many-connections` | packages/db/src/client.ts:85     |
| 4 | Cookie prefix divergente                          | `#cookie-prefix-divergente`                                       | server/src/auth/better-auth.ts:65-71 |
| 5 | Schema desatualizado                              | `#schema-desatualizado`                                           | .github/workflows/db-migrate.yml |
| 6 | `claude` CLI ausente                              | `#claude-cli-ausente`                                             | (link externo docs.claude.com)   |
| 7 | `prepared statement does not exist` (pooler 6543) | `#prepared-statement-does-not-exist-pooler-6543`                  | packages/db/src/client.ts:74-94 (snippet `prepare: false`) |
| – | Não achou seu problema?                           | `#n%C3%A3o-achou-seu-problema`                                    | (CTA)                            |

### Convenções aplicadas

- Idioma pt-br conforme D-16 ("Sintoma", "Causa", "Solução" como labels).
- Cada bloco de solução tem comando(s) acionável(is) (bash/powershell/sql/node).
- Citações pontuais: `packages/db/src/client.ts:85`, `server/src/auth/better-auth.ts:65-71`, `MIGRATION_AUDIT.md §A.1`, `MIGRATION_AUDIT.md §G.1`.
- Cross-links: `ONBOARDING.md` (header), `CONTRIBUTING.md §"Database Migration Policy"` (D-03).
- Footer: convite a abrir PR adicionando seções novas — alinhado com cultura "todo mundo agradece" do team-shared.

## Key Decisions Made

- **D-17 (cobertura travada em 7):** Não adicionar seções "preventivas" para Phase 4+ (multi-account, Claude CLI Pro vs Max). Apenas o que já é problema empiricamente reportado nas Fases 1-2 + previsível no escopo do free tier Supabase.
- **D-18 (citação fina):** Onde a causa está em código, citar `path:linha` literal (não só path). Isso ancora o doc ao snapshot atual do repo — quando linhas mudarem, anchor fica obviamente stale e força update.
- **Anchors alinhados com ONBOARDING.md:** Slugs em snake/kebab-case que GitHub gera automaticamente — sem `<a id>` HTML explícito, deixa o GFM fazer o trabalho. Validação cross-link real ocorre quando ONBOARDING.md (Plan 03-02) e setup CLI (Plan 03-01) puderem ser inspecionados juntos em runtime futuro.
- **Cookie prefix exemplo `paperclip-meunome`:** Escolhido como contraste claro vs `paperclip-team-shared` (literal validado na Fase 2). Reforça que o prefixo é determinado pelo `PAPERCLIP_INSTANCE_ID`.

## Deviations from Plan

None — plan executed exactly as written. Conteúdo literal do `<action>` foi aplicado direto após validação dos `read_first`:

- `scripts/kill-dev.sh` existe (executable, 6.9 KB).
- `packages/db/src/client.ts` linhas 74-94 batem com snippet citado (`buildPostgresOptions`, `if (port === "6543")` em :83).
- `server/src/auth/better-auth.ts` linhas 65-71 batem com `deriveAuthCookiePrefix` exportado.

Nenhuma divergência exigiu adaptação.

## Verification Results

### Automated (do `<verify>` block do plano)

```
node -e "..." → OK lines= 193
```

Cada uma das 7 seções regex (case-insensitive) bate; cada uma das 4 referências exigidas (`scripts/kill-dev.sh`, `packages/db/src/client.ts`, `better-auth.ts`, `.env.local`) presente; >= 150 linhas (got 193).

### Acceptance criteria

| Critério                                                                               | Resultado |
| -------------------------------------------------------------------------------------- | --------- |
| Arquivo existe                                                                         | ✓         |
| `wc -l TROUBLESHOOTING.md` >= 150                                                      | ✓ (193)   |
| `grep -c "^## "` >= 7                                                                  | ✓ (8)     |
| Seção Windows NTFS                                                                     | ✓         |
| Stale + scripts/kill-dev.sh                                                            | ✓         |
| Too many connections                                                                   | ✓         |
| Cookie prefix + team-shared + better-auth.ts                                           | ✓         |
| Schema desatualizado + db-migrate.yml                                                  | ✓         |
| claude CLI                                                                             | ✓         |
| prepared statement + packages/db/src/client.ts + 6543                                  | ✓         |
| Sintoma/Causa/Solução (pt-br)                                                          | ✓         |
| `grep -cE "(packages/db\|server/src\|scripts/\|\.env\.local)"` >= 5                    | ✓ (13)    |

## Self-Check: PASSED

- File exists: `D:/projetos/ddd/TROUBLESHOOTING.md` — FOUND
- Commit `926e83f` in `git log` — FOUND
- All 7 mandated sections present (regex check passed)
- All 4 mandated file references present
- 193 lines >= 150 minimum

## Commits

| Hash    | Type | Message                                                          |
| ------- | ---- | ---------------------------------------------------------------- |
| 926e83f | feat | feat(03-03): add TROUBLESHOOTING.md with 7 known-issue sections |

## Forward-Looking Notes (handoff para outras tarefas)

- **Plan 03-02 (ONBOARDING.md)** já assume que estes anchors existem — qualquer drift de slug aqui quebra os links lá. Verificador da fase deve cross-link.
- **Plan 03-01 (`pnpm setup`)** deve referenciar este doc nas mensagens de erro (ex: cookie prefix check → "ver TROUBLESHOOTING.md#cookie-prefix-divergente").
- **TEAM-05 (REQUIREMENTS):** Este SUMMARY fecha o requirement. Marcar via `requirements mark-complete TEAM-05`.

## Known Stubs

None.
