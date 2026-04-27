---
phase: 11-skills-system-prompts
plan: 03
subsystem: i18n
tags: [locale, agent-skill, claude-local, prompt-cache, skill-variants, pt-BR, materialization, human-uat, milestone-v1.1-final]

requires:
  - phase: 11-skills-system-prompts
    plan: 01
    provides: "RuntimeLocale type + context.runtimeLocale propagation channel from heartbeat to adapter.execute"
  - phase: 11-skills-system-prompts
    plan: 02
    provides: "buildClaudePromptBundleKey requires locale (v2 hash); prepareClaudePromptBundle accepts locale on input; bundleKey already keys on locale (cache isolation guaranteed before 11-03 lands)"

provides:
  - "skills/paperclip/SKILL.pt-BR.md (347 lines) — full pt-BR translation of the paperclip skill preserving env vars, endpoints, JSON payloads, shell commands, ticket prefixes, Co-Authored-By footer byte-identical"
  - "skills/paperclip-create-agent/SKILL.pt-BR.md (163 lines) — pt-BR variant of agent creation skill"
  - "skills/paperclip-create-plugin/SKILL.pt-BR.md (102 lines) — pt-BR variant of plugin authoring skill"
  - "skills/para-memory-files/SKILL.pt-BR.md (105 lines) — pt-BR variant of PARA memory files skill"
  - "materializeSkillForLocale(source, target, locale) — claude-local prompt-cache helper: copy+rename SKILL.pt-BR.md to SKILL.md when locale=pt-BR and variant exists; symlink fallback when locale=en-US or variant absent"
  - "copyDirRecursive(source, target) — recursive directory copy used by materializeSkillForLocale for skill subdirs (references/*.md siblings)"
  - "11-HUMAN-UAT.md (213 lines) — 3 procedures (UAT-11-01..03) covering AGENT-SKILL-04 empirical validation"

affects:
  - "Phase 11 milestone closure — last plan of v1.1 milestone; downstream operator UAT validates AGENT-SKILL-04 in browser"
  - "Future L10N-01 (v2 multi-locale) — SKILL.{locale}.md naming convention extensible to es/fr/etc.; materializeSkillForLocale already generic"

tech-stack:
  added: []
  patterns:
    - "Locale-conditional skill variant materialization: bundle dir contains either symlink (en-US fallback / variant absent) or real directory copy (pt-BR + variant exists) — never mutates source dir per Anti-Pattern §RESEARCH"
    - "Recursive copy helper inline (copyDirRecursive) instead of fs-extra dependency: keeps adapter package devDeps minimal (already established in claude-local: only adapter-utils + picocolors)"
    - "Test placement convention for adapter-internal helpers: server/src/__tests__/{adapter-name}-*.test.ts reaches adapter via __testing__ re-export when adapter pkg has no vitest devDep — established in 11-02, reaffirmed here"

key-files:
  created:
    - "skills/paperclip/SKILL.pt-BR.md"
    - "skills/paperclip-create-agent/SKILL.pt-BR.md"
    - "skills/paperclip-create-plugin/SKILL.pt-BR.md"
    - "skills/para-memory-files/SKILL.pt-BR.md"
    - "server/src/__tests__/claude-local-prompt-cache-skill-variants.test.ts"
    - ".planning/phases/11-skills-system-prompts/11-HUMAN-UAT.md"
  modified:
    - "packages/adapters/claude-local/src/server/prompt-cache.ts"

key-decisions:
  - "Test file placed in server/src/__tests__/ (not packages/adapters/claude-local/__tests__/) — claude-local pkg has no vitest devDep + no test script, follows 11-02 precedent. Reaches helper via __testing__ re-export from @paperclipai/adapter-claude-local/server. The PLAN.md suggested adapter-local placement but 11-02 SUMMARY.md explicitly documented this same adjustment as operational; reapplied here without further deviation tagging since it is established convention now."
  - "en-US short-circuit early in materializeSkillForLocale (return ensurePaperclipSkillSymlink immediately, before fs.access check) — saves a syscall per skill on the en-US default path; semantically identical because plan body says en-US always falls through regardless of variant existence"
  - "copyDirRecursive ignores symlinks/sockets/devices in source — skill source dirs in the repo only contain regular files + directories (verified via 4 paperclip skill source dirs); skipping defensively avoids surprising errors if a future skill ever ships a symlink, but a future plan must extend this if symlinks become legitimate"
  - "YAML frontmatter byte-identical preservation across all 4 SKILL.pt-BR.md — `name` field is the runtime identity key consumed by readPaperclipRuntimeSkillEntries (server-utils.ts:1043-1061). Translating `name` would silently break skill discovery. `description` field preserved in English too because the prompt-cache hashes the entry source into bundleKey and the skill discovery layer reads description for filtering — translating it would be a hidden contract change. Translation scope therefore strictly = body markdown."
  - "Co-Authored-By: Paperclip <noreply@paperclip.ing> footer in paperclip/SKILL.pt-BR.md preserved byte-identical — that string is emitted literally in commits agents author, so any drift would change git history identity"

patterns-established:
  - "SKILL.{locale}.md naming convention: byte-identical YAML frontmatter (name + description) + translated body markdown; locale variants live alongside source SKILL.md in same dir; loader picks variant at bundle materialization time, source dir never mutated"
  - "Locale-aware prompt-cache materialization: prepareClaudePromptBundle delegates per-skill resolution to materializeSkillForLocale; the helper is the single decision point (en-US -> symlink, pt-BR + variant -> copy+rename, pt-BR + no variant -> symlink); bundleKey already keys on locale (Plan 11-02) so cache isolation is automatic"

requirements-completed: [AGENT-SKILL-02, AGENT-SKILL-04]

duration: ~10min
completed: 2026-04-27
---

# Phase 11 Plan 03: Skill pt-BR Variants + Locale-Aware Materialization + HUMAN-UAT Summary

**4 SKILL.pt-BR.md variants ship byte-identical YAML frontmatter + translated body markdown for the 4 paperclip skills, claude-local prompt-cache materializes the right variant per RuntimeLocale via materializeSkillForLocale (copy+rename for pt-BR + variant exists, symlink fallback otherwise), and 11-HUMAN-UAT.md persists 3 operator procedures covering AGENT-SKILL-04 empirical validation — last plan of milestone v1.1.**

## Performance

- **Duração:** ~10min
- **Iniciado:** 2026-04-27T02:56:17Z
- **Concluído:** 2026-04-27T03:06:08Z
- **Tarefas:** 3
- **Arquivos modificados:** 7 (6 created + 1 modified)

## Realizações

- 4 `SKILL.pt-BR.md` files committed alongside their English source counterparts in `skills/paperclip/`, `skills/paperclip-create-agent/`, `skills/paperclip-create-plugin/`, `skills/para-memory-files/`. Each variant has line count exactly matching its source (347 / 163 / 102 / 105) and byte-identical YAML frontmatter so `readPaperclipRuntimeSkillEntries` continues to discover skills by `name`. Body markdown translated with hard preservation of env vars (`PAPERCLIP_*`), endpoints (`/api/*`), HTTP headers (`Authorization: Bearer …`, `X-Paperclip-Run-Id: …`), JSON payload keys/values, shell commands (`paperclipai agent local-cli`, `scripts/paperclip-issue-update.sh`, `curl -sS …`), HTTP status codes (`409`, `422`), ticket-id prefixes (`PAP-`, `ZED-`), placeholder strings between `<…>`, and the canonical commit footer `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
- `materializeSkillForLocale(source, target, locale)` shipped in `prompt-cache.ts` as a public-test-exposed function. Decision flow: en-US short-circuits to `ensurePaperclipSkillSymlink` (zero behavior change for English path); pt-BR with `SKILL.pt-BR.md` present runs `copyDirRecursive(source, target)` then `fs.rename(SKILL.pt-BR.md → SKILL.md)` inside the bundle dir; pt-BR without variant falls back to symlink. Source skill dir under `skills/<name>/` is never mutated per RESEARCH §"Anti-Patterns to Avoid".
- `copyDirRecursive` helper added next to `materializeSkillForLocale` — handles regular files via `fs.copyFile` and recurses into subdirs (covers `references/*.md` siblings present in the paperclip skill).
- `prepareClaudePromptBundle` callsite swapped from direct `ensurePaperclipSkillSymlink(entry.source, target)` to `materializeSkillForLocale(entry.source, target, locale)`. Locale already flows in from `context.runtimeLocale` via the `input.locale` field added in Plan 11-02.
- 4-case test suite GREEN: pt-BR + variant materializes correctly (real dir, content from variant, recursive subdir copy verified), en-US falls back to symlink, pt-BR + no variant falls back to symlink, source dir untouched after materialization. Combined claude-local-prompt-cache suite (skill-variants + locale): 7/7 GREEN, zero regression.
- `11-HUMAN-UAT.md` persisted with 3 procedures (UAT-11-01 pt-BR agent response, UAT-11-02 reverse en-US no cache pollution, UAT-11-03 skill variant referenced in chat) plus pre-conditions, pass/failure paths per UAT, sign-off protocol, and routing notes for `/planejar-fase 11 --gaps` if any UAT fails. Frontmatter `status: pending` per `complete-with-pending-UAT` precedent (Phases 3-10).

## Commits das Tarefas

Cada tarefa foi comitada atomicamente:

1. **Tarefa 1: 4 SKILL.pt-BR.md variants** — `e2d8a71` (feat)
2. **Tarefa 2 (RED): materializeSkillForLocale skill variant test suite** — `54c374b` (test)
3. **Tarefa 2 (GREEN): materializeSkillForLocale + copyDirRecursive in prompt-cache.ts** — `a8e6d80` (feat)
4. **Tarefa 3: 11-HUMAN-UAT.md (3 UATs covering AGENT-SKILL-04)** — `91765e7` (docs)

_Nota: 4 commits atômicos (3 tarefas; Tarefa 2 segue padrão TDD com commit RED separado pré-implementação para preservar evidência da falha — replicando o padrão do Plan 11-01 onde RED foi commitado antes do GREEN)._

## Arquivos Criados/Modificados

### Criados

- `skills/paperclip/SKILL.pt-BR.md` (347 lines) — translates 9 H2 sections + 1 status guide + 1 endpoints table + comment style + planning section. Preserves the full `## Authentication` env-var block byte-identical (every `PAPERCLIP_*` token), the auth header literal, the audit-trail header rule, all 9 heartbeat steps, scoped-wake fast path, blocked-task dedup rule, full critical-rules list (16 bullets), and the "Hot Routes" endpoint table (24 rows).
- `skills/paperclip-create-agent/SKILL.pt-BR.md` (163 lines) — translates 9 workflow steps + governance state section. Preserves all `curl` invocations, the `agent-hires` JSON payload, instruction-source decision flow ("Exact template / Adjacent template / Generic fallback").
- `skills/paperclip-create-plugin/SKILL.pt-BR.md` (102 lines) — translates 6 sections (ground rules, preferred workflow, after scaffolding, app surfacing, verification, doc expectations). Preserves all `pnpm` and scaffold commands.
- `skills/para-memory-files/SKILL.pt-BR.md` (105 lines) — translates 3 memory layers + write-it-down + qmd recall + planning. Preserves filesystem layout block (`$AGENT_HOME/life/...` PARA tree) and `qmd` command examples.
- `server/src/__tests__/claude-local-prompt-cache-skill-variants.test.ts` (83 lines) — 4 vitest cases against the bundle materialization helper, using `os.tmpdir()` mkdtemp fixtures + cleanup in afterEach. Imports `materializeSkillForLocale` via `__testing__` re-export from `@paperclipai/adapter-claude-local/server`.
- `.planning/phases/11-skills-system-prompts/11-HUMAN-UAT.md` (213 lines) — 3 UATs covering pt-BR agent response, reverse en-US toggle, skill variant referenced in chat. Pass/failure paths per UAT, sign-off protocol, mapping back to specific code locations for failure triage.

### Modificados

- `packages/adapters/claude-local/src/server/prompt-cache.ts` (+64 lines net):
  - Added `copyDirRecursive(source, target)` (lines ~146-160) — recursive copy via `fs.copyFile` + `readdir` with dirent types.
  - Added `materializeSkillForLocale(source, target, locale)` (lines ~162-184) — exported function; decision flow per Pattern 3 of RESEARCH.
  - Replaced `ensurePaperclipSkillSymlink(entry.source, target)` callsite inside `prepareClaudePromptBundle` (line ~225, was line 166 pre-change) with `materializeSkillForLocale(entry.source, target, locale)`.
  - Extended `__testing__` namespace to expose `materializeSkillForLocale` alongside `buildClaudePromptBundleKey`.

## Decisões Tomadas

**1. en-US short-circuits early in `materializeSkillForLocale` (before `fs.access` check).**
The plan body specifies "if (!hasVariant || locale === 'en-US')". Implementing the en-US branch as the first check (before `fs.access`) saves one filesystem syscall per skill on the en-US path (the default for backward compatibility) and is semantically identical because en-US is documented as always falling through regardless of variant existence. Behavior is observably identical, performance is one fs.access lookup better per skill per spawn on en-US, and the test that "en-US even if variant exists falls back to symlink" still passes (proves no observable difference).

**2. `copyDirRecursive` skips entries that are not files or directories.**
The current 4 paperclip skill source dirs only contain regular files (`SKILL.md`, `SKILL.pt-BR.md`) and directories (`references/`). The implementation explicitly ignores symlinks, sockets, and devices via the `if (entry.isDirectory()) … else if (entry.isFile()) …` branches. If a future skill ever ships a symlink in source (e.g., a `references/` symlink to a sibling), a follow-up plan must extend `copyDirRecursive` to handle that case. Documented inline as a comment.

**3. YAML frontmatter byte-identical preservation across all 4 variants.**
The `name` field is the runtime identity key — `readPaperclipRuntimeSkillEntries` in `packages/adapter-utils/src/server-utils.ts:1043-1061` discovers skills by reading `SKILL.md` and matching on `name`. Translating `name` would silently break skill discovery (the runtime would not find the skill at all). `description` is preserved in English too because (a) it is an LLM-facing description used for skill routing/selection within the model's context, and (b) it is a versioned runtime contract (translating it would force every adapter consumer to re-validate their config). The translation scope was therefore strictly limited to the body markdown after `---`.

**4. Co-Authored-By footer string preserved byte-identical.**
The line `Co-Authored-By: Paperclip <noreply@paperclip.ing>` in paperclip/SKILL.md is emitted literally in commits agents author. Any drift in that string would change git history identity attribution. The pt-BR variant therefore carries the English string verbatim (translating the surrounding prose only). Same logic applies to env var names, endpoint paths, JSON payload keys, ticket prefixes (`PAP-`, `ZED-`), and HTTP status codes.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito.

Pequenos ajustes operacionais (não desvios, seguem precedente já documentado):

- Test file location for `prompt-cache-skill-variants.test.ts` placed under `server/src/__tests__/` (not `packages/adapters/claude-local/src/server/__tests__/` as the plan body suggested). Reason: the claude-local package has no vitest devDep and no `test` script — same constraint that Plan 11-02 documented and resolved by placing tests in the server harness with `__testing__` re-export. Following the established convention without further deviation tagging.
- Test file naming uses prefix `claude-local-` to match the existing convention in `server/src/__tests__/` (sibling: `claude-local-prompt-cache-locale.test.ts`, `claude-local-execute.test.ts`).

## Problemas Encontrados

**1. Pre-existing typecheck baseline (`server/src/services/recovery/service.ts:459`).**
TS2339 `Property 'title' does not exist on type ...`. Confirmed in master baseline (STATE.md Phase 7-04 record + Phase 8-05 deferred-items + 11-01-SUMMARY.md + 11-02-SUMMARY.md). Out-of-scope per `<deviation_rules>` boundary; not introduced by this plan. The plan-scoped `pnpm --filter @paperclipai/adapter-claude-local typecheck` is exit 0 (clean) because the modified file lives in the adapter package, not the server package.

**2. Pre-existing `claude-local-execute.test.ts` Windows shebang failures.**
Documented in 06-03 deferred-items.md, 11-01-SUMMARY.md, 11-02-SUMMARY.md. Reproducible on master without Plan 11-03 changes. Not introduced by this plan; out-of-scope.

## Confirmação de Frontmatter Byte-Identical

Verified by visual diff during translation: every `SKILL.pt-BR.md` frontmatter block (lines 1 through the closing `---`) is byte-identical to the source `SKILL.md` frontmatter. Specifically:

- `name:` field literal (`paperclip`, `paperclip-create-agent`, `paperclip-create-plugin`, `para-memory-files`) preserved.
- `description:` block preserved verbatim including English prose, line breaks, and the `>` YAML continuation marker.
- The `---` opening and closing fence preserved.

Validation script (Tarefa 1 verify gate) confirmed all 4 files start with `---`, contain `name: <skill>` matching the directory name, and carry their expected line counts (347/163/102/105 lines).

## Materialização — Localização Final no prompt-cache.ts

`materializeSkillForLocale` is exported from `packages/adapters/claude-local/src/server/prompt-cache.ts` (lines ~162-184 after the edit). Re-exported via `__testing__` for test consumption. The single callsite is inside `prepareClaudePromptBundle` (line ~225 after the edit, replacing the previous direct `ensurePaperclipSkillSymlink` call at line 166 pre-change).

## 11-HUMAN-UAT.md Status

`status: pending` per frontmatter. Operator runs the 3 UATs in browser real (estimated 20-30min total session); on full pass, marks AGENT-SKILL-04 complete via `node "./.claude/framework/bin/tools.cjs" requirements mark-complete AGENT-SKILL-04` and updates frontmatter to `status: passed` plus appends a `## Sign-off` section. AGENT-SKILL-02 is already complete code-level here (4 variants + materializer GREEN); AGENT-SKILL-04 is the empirical gate routed to operator validation.

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária. Bundle cache invalidation between locales is automatic (bundleKey v2 includes locale per Plan 11-02), so no operator step is required for the new variants to take effect; the first spawn after deploy with a pt-BR user will write a fresh bundle dir containing the materialized SKILL.pt-BR.md as SKILL.md.

## Self-Check: PASSED

Files created exist:
- `skills/paperclip/SKILL.pt-BR.md` — FOUND (347 lines)
- `skills/paperclip-create-agent/SKILL.pt-BR.md` — FOUND (163 lines)
- `skills/paperclip-create-plugin/SKILL.pt-BR.md` — FOUND (102 lines)
- `skills/para-memory-files/SKILL.pt-BR.md` — FOUND (105 lines)
- `server/src/__tests__/claude-local-prompt-cache-skill-variants.test.ts` — FOUND (83 lines)
- `.planning/phases/11-skills-system-prompts/11-HUMAN-UAT.md` — FOUND (213 lines)

Files modified verified by commit hash:
- `packages/adapters/claude-local/src/server/prompt-cache.ts` — modified in `a8e6d80`

Commits in log:
- `e2d8a71` feat(11-03) 4 SKILL.pt-BR.md variants — FOUND
- `54c374b` test(11-03) RED skill-variants — FOUND
- `a8e6d80` feat(11-03) materializeSkillForLocale GREEN — FOUND
- `91765e7` docs(11-03) 11-HUMAN-UAT.md — FOUND

Test results:
- `claude-local-prompt-cache-skill-variants` — 4/4 GREEN
- `claude-local-prompt-cache` filter (skill-variants + locale combined) — 7/7 GREEN
- Zero regression on Plan 11-02 prompt-cache-locale test (3/3 GREEN unchanged)

Typecheck:
- `pnpm --filter @paperclipai/adapter-claude-local typecheck` — exit 0 (clean)

## Prontidão para Próxima Fase

**Phase 11 plan execution complete.** With 11-01 (locale propagation), 11-02 (language directive + bundleKey + resume fallback), and 11-03 (skill variants + materializer + HUMAN-UAT) shipped:

- AGENT-SKILL-01 (system prompt language directive) — code-level complete in 11-02.
- AGENT-SKILL-02 (skills/templates translated) — code-level complete in this plan.
- AGENT-SKILL-03 (locale propagation server → adapter) — code-level complete in 11-01.
- AGENT-SKILL-04 (empirical HUMAN-UAT) — `11-HUMAN-UAT.md` artifact persisted; routed to operator validation in browser real per `complete-with-pending-UAT` closure.

**Milestone v1.1 (Internacionalização pt-BR) at code level closure.** Phases 7-11 ship the full i18n stack: Phase 7 toggle + infrastructure, Phases 8+9 UI translation (~1300 keys), Phase 10 agent messages tRef pattern, Phase 11 system prompts + skill variants. Total carry-over to UAT operator: UAT-07-01..02 + UAT-08-01..05 + UAT-09-01..04 + UAT-10-01..03 + UAT-11-01..03 (17 procedures total across 5 phases) — operator validates incrementally per `complete-with-pending-UAT` precedent.

**Next:** `/verificar-trabalho` for phase verification (or `/transitar` to close the phase officially), then `/audit-milestone` + `/complete-milestone` for v1.1 closure → archive to `.planning/milestones/v1.1-*.md`.

---
*Fase: 11-skills-system-prompts*
*Concluída: 2026-04-27*
