---
phase: 11-skills-system-prompts
plan: 02
subsystem: i18n
tags: [locale, agent-skill, system-prompt, language-directive, prompt-cache, claude-local, bundle-key, resume-fallback]

requires:
  - phase: 11-skills-system-prompts
    plan: 01
    provides: "RuntimeLocale type ('pt-BR' | 'en-US') exported from server/src/services/heartbeat-locale.ts + context.runtimeLocale propagation channel mutated by heartbeat.ts before adapter.execute"

provides:
  - "buildLanguageDirectiveBlock(locale: RuntimeLocale): string — pure function that returns the canonical pt-BR directive markdown block (or empty string for en-US) appended to agent system prompts"
  - "agent-instructions.exportFiles({ locale }) — appends the directive to the entry-file content when locale = 'pt-BR'; backward-compatible (no-op when option is missing or locale = 'en-US')"
  - "buildClaudePromptBundleKey({ locale, ... }) — locale required; bundle hash version bumped v1 → v2 so caches differ per locale"
  - "prepareClaudePromptBundle({ locale, ... }) — propagates locale to the bundle key from the adapter's runtimeLocale read on context"
  - "execute.ts resume-session fallback — language directive appended to the prompt body via joinPromptSections when sessionId exists (Pitfall 2 mitigation, semantic only — UAT validates empirically)"

affects:
  - "11-03-PLAN — skill variant materialization keys on the same context.runtimeLocale; bundleKey already locale-aware so 11-03 inherits cache-isolation"

tech-stack:
  added: []
  patterns:
    - "Canonical-text-duplication-with-sync-comment for cross-package one-way deps: server -> adapters dependency direction means adapters cannot import server helpers; we duplicate buildLanguageDirectiveBlock inline with an explicit 'keep in sync' comment instead of inverting the dep graph"
    - "Resume-session prompt-body fallback for system-prompt directives: claude-local's --append-system-prompt-file is one-shot (skipped on resume), so directives that must reach every heartbeat are appended to the prompt body via joinPromptSections — no-op string for en-US so the path stays universal"
    - "Bundle hash version-bump pattern: when bundleKey hash input shape changes, bump the version literal so caches invalidate one-shot on first spawn after deploy (no migration script, no TTL, content-addressed natural rotation)"

key-files:
  created:
    - "server/src/services/agent-instructions-locale-directive.ts"
    - "server/src/services/__tests__/agent-instructions-locale-directive.test.ts"
    - "server/src/__tests__/claude-local-prompt-cache-locale.test.ts"
  modified:
    - "server/src/services/agent-instructions.ts"
    - "server/src/__tests__/agent-instructions-service.test.ts"
    - "packages/adapters/claude-local/src/server/prompt-cache.ts"
    - "packages/adapters/claude-local/src/server/execute.ts"
    - "packages/adapters/claude-local/src/server/index.ts"

key-decisions:
  - "Inline-duplicate buildLanguageDirectiveBlock in claude-local execute.ts instead of cross-package import — @paperclipai/adapter-claude-local declares only adapter-utils + picocolors as dependencies; introducing a server -> adapter import would invert the dependency graph and break the publishable adapter package shape. The duplicated body is wrapped in a doc-comment that points to the canonical source"
  - "Empty string for en-US directive (not an explicit 'Respond in English' block) — en-US is the model default; emitting an explicit block costs tokens with no observable behavior change. Decision documented in 11-CONTEXT.md and reaffirmed by RESEARCH §'Open Questions' Q2; revisit only if UAT shows model drift"
  - "Resume-session fallback appends the directive at the END of the prompt body (via joinPromptSections last entry) — model attention typically biases toward the last instruction in the user message, maximizing the chance the directive overrides the cached system prompt language baseline that may have been compiled in en-US before the locale was switched"
  - "Bundle hash version bump v1 → v2 (not just adding the locale field) — including 'paperclip-claude-prompt-bundle:v2' as the prefix means the natural one-shot invalidation triggers automatically on first spawn after deploy, without a migration script. No TTL, no manual cache clear, no client-side coordination"
  - "exportFiles option is OPTIONAL (`options?: { locale? }`) not required — heartbeat is the only caller that knows the runtime locale today; adding a required parameter would break company-portability.ts:3244 (export-time call without runtime context). The optional option makes locale opt-in for migrating callers"

patterns-established:
  - "Canonical text + duplication + sync comment: when two packages must emit the same string but cannot share an import (one-way dep), keep both copies byte-identical and document the canonical source in a code comment. Acceptable here because the directive is a single short literal that will rarely change"
  - "Resume-session fallback for one-shot adapter flags: any data that the model must see on every heartbeat (not just first spawn) must reach the model via the prompt body, not the system-prompt file, because resume sessions skip the system-prompt flag for token economy"

requirements-completed: [AGENT-SKILL-01]

duration: ~10min
completed: 2026-04-27
---

# Phase 11 Plan 02: Language Directive Content + bundleKey + Resume Fallback Summary

**buildLanguageDirectiveBlock emits the canonical pt-BR system-prompt block, agent-instructions.exportFiles appends it to the entry file, bundleKey now keys on locale (v2 hash), and execute.ts re-injects the directive into the prompt body on resume so AGENT-SKILL-01 ships at code level.**

## Performance

- **Duração:** ~10min
- **Iniciado:** 2026-04-27T02:39:00Z (after 11-01 completion)
- **Concluído:** 2026-04-27T02:49:14Z
- **Tarefas:** 3
- **Arquivos modificados:** 7 (3 created + 4 modified)

## Realizações

- `buildLanguageDirectiveBlock(locale)` shipped as a pure function (`server/src/services/agent-instructions-locale-directive.ts`, 28 lines). Returns the canonical "Responda ao usuário em português brasileiro (pt-BR). Use linguagem natural, técnica quando apropriado. Mantenha termos técnicos em inglês quando idiomáticos…" block for `pt-BR` and the empty string for `en-US`. 4 unit cases GREEN.
- `agent-instructions.exportFiles` accepts `options?: { locale?: RuntimeLocale }` and appends the directive to the entry file content (only) when `locale === "pt-BR"`. Sibling files in the bundle are untouched. Three branches covered by new tests in `agent-instructions-service.test.ts`: pt-BR appends, en-US no-op, no-locale legacy behavior. Existing 8 tests in the suite remain GREEN — zero regression.
- `buildClaudePromptBundleKey` requires a `locale` field; bundle hash prefix bumped `paperclip-claude-prompt-bundle:v1\n` → `v2\n`. New test file `claude-local-prompt-cache-locale.test.ts` (3 cases GREEN) confirms key divergence between locales, stability across calls, and sha256-shape digest.
- `prepareClaudePromptBundle` now requires `locale` on its input; `execute.ts` reads `context.runtimeLocale` (default `"pt-BR"`) and feeds it to the bundle preparation step.
- Pitfall 2 fallback wired in `execute.ts`: when `sessionId` is set (resume path), the directive is appended to the prompt body via `joinPromptSections` so the directive reaches the model even though `--append-system-prompt-file` is intentionally skipped on resume. Empty string for en-US makes the path universal — no branching at call site.
- `__testing__` export added to `packages/adapters/claude-local/src/server/index.ts` so tests in `server/src/__tests__/` can reach internal helpers without re-exporting from the adapter's public API.

## Commits das Tarefas

Cada tarefa foi comitada atomicamente:

1. **Tarefa 1: Wave 0 RED + GREEN — buildLanguageDirectiveBlock pure function** — `1955666` (feat)
2. **Tarefa 2: Integration — agent-instructions.exportFiles concatenates directive when locale=pt-BR** — `6bf9896` (feat)
3. **Tarefa 3: bundleKey + claude-local execute integration — locale invalidates cache + resume fallback** — `e939fa0` (feat)

_Nota: 3 commits atômicos. Cada Tarefa fez TDD em uma única sequência (RED test escrito imediatamente antes do GREEN code) — o RED ficou local apenas pelo tempo do `vitest run`, então o commit final captura o par RED + GREEN juntos por escopo TDD compacto. O fluxo separado de "test commit, depois feat commit" não foi adotado porque os testes ficaram em arquivos novos e o atomicidade do "RED captured pre-impl" só agrega valor quando o RED já estava no master ou cobre mudança em arquivo legado existente — neste plano ambos os testes nasceram junto da implementação._

## Arquivos Criados/Modificados

### Criados

- `server/src/services/agent-instructions-locale-directive.ts` (28 lines) — pure function `buildLanguageDirectiveBlock(locale: RuntimeLocale): string`. Imports `RuntimeLocale` from `./heartbeat-locale.js` (single source of truth from Plan 11-01). No I/O, no DB, no global state.
- `server/src/services/__tests__/agent-instructions-locale-directive.test.ts` (28 lines) — 4 unit cases: pt-BR contains the canonical text, en-US returns empty string, idempotency, leading/trailing newline shape.
- `server/src/__tests__/claude-local-prompt-cache-locale.test.ts` (29 lines) — 3 unit cases against the bundle hasher: locale divergence, stability, sha256 shape. Reaches the helper through `__testing__` re-export on `@paperclipai/adapter-claude-local/server`.

### Modificados

- `server/src/services/agent-instructions.ts` (+18 lines net) — added 2 imports (`buildLanguageDirectiveBlock`, `RuntimeLocale`) at top; extended `exportFiles` signature with `options?: { locale?: RuntimeLocale }`; appended directive to `files[entryFile]` in both the managed/external bundle path and the legacy fallback path.
- `server/src/__tests__/agent-instructions-service.test.ts` (+65 lines) — three new cases at the end of the describe block.
- `packages/adapters/claude-local/src/server/prompt-cache.ts` (+18 lines net):
  - Lines 86-118 (after edit): added `ClaudePromptBundleLocale` literal type with sync-comment; bumped hash literal v1 → v2 (line ~96); added `hash.update(\`locale:${input.locale}\\n\`)` (line ~97); accepts `locale` on input shape.
  - Lines ~141-150 (after edit): `prepareClaudePromptBundle` destructures `locale` and forwards to `buildClaudePromptBundleKey`.
  - Lines ~177-181 (end of file): added `export const __testing__ = { buildClaudePromptBundleKey }` for test access.
- `packages/adapters/claude-local/src/server/index.ts` (+1 line) — re-exports `__testing__` from `./prompt-cache.js`.
- `packages/adapters/claude-local/src/server/execute.ts` (+27 lines net):
  - Lines 108-128 (after edit): inline-duplicated `buildLanguageDirectiveBlockForResume` with sync-comment pointing at the canonical source.
  - Lines ~404-413 (after edit): reads `context.runtimeLocale` defaulting to `"pt-BR"`; passes to `prepareClaudePromptBundle`.
  - Lines ~510-525 (after edit): adds `resumeLanguageDirective` (empty when no sessionId, empty for en-US even on resume) as the last entry passed to `joinPromptSections`.

## Decisões Tomadas

**1. Inline-duplicate `buildLanguageDirectiveBlock` in `execute.ts` (not cross-package import).**
The claude-local adapter package's only deps are `@paperclipai/adapter-utils` and `picocolors`. Importing from `@paperclipai/server` would (a) invert the documented dependency direction (server consumes adapters, never the reverse), (b) break the publishable adapter package because users installing the adapter standalone would then transitively pull in the server package, (c) create a cycle in `tsconfig` references. Duplication of a 28-line literal-text function is the lighter price. The doc-comment explicitly names the canonical source and asks for sync.

**2. Empty string for en-US directive.**
en-US is the model default for Claude/Codex/GPT. Emitting an explicit "Respond in English" block costs ~30 tokens per heartbeat with no observable benefit because the model already responds in English without a directive. Decision aligned with `11-CONTEXT.md` "decisions" section and `11-RESEARCH.md` §"Open Questions" Q2. UAT-11-XX revisits empirically; if drift is observed for any model, the function flips to emit an explicit block.

**3. Resume-session directive at the END of the prompt body.**
The `joinPromptSections` call places `resumeLanguageDirective` as the final entry. LLMs typically weight recency in the user-message context window — the last instruction is likeliest to be respected. Placing the directive last therefore maximizes pt-BR adherence on resumed sessions where the cached system prompt may have been baked in en-US before the user toggled their locale.

**4. Hash version bump v1 → v2.**
Including `paperclip-claude-prompt-bundle:v2\n` as the hash prefix means the very first spawn after deploy automatically writes a new bundle dir — old `v1`-keyed bundles become orphan and are naturally cleaned up by the existing cache lifecycle. No migration script, no TTL, no operator action. Pitfall 1 closed without infra changes.

**5. `exportFiles` `options` parameter is OPTIONAL.**
`company-portability.ts:3244` calls `exportFiles(agent)` at export time without any runtime context. Forcing a `locale` parameter would either (a) require company-portability to fabricate a default (introducing a coupling), or (b) be applied uniformly which is semantically wrong (export bundles are user-locale-agnostic). Optional opt-in keeps the contract clean: heartbeat passes locale, portability does not.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito.

Pequenos ajustes operacionais (não desvios):
- Test file location for `prompt-cache-locale.test.ts` placed under `server/src/__tests__/` (vs. plan's suggestion of `packages/adapters/claude-local/src/server/__tests__/`) because the claude-local package has no `vitest` devDependency and no `test` script — it relies on the server's vitest harness for test execution. Pattern matches existing `claude-local-execute.test.ts`. Decision documented in commit `e939fa0`.
- `__testing__` export added on `index.ts` of the adapter to make `buildClaudePromptBundleKey` reachable from server tests without exporting it as part of the formal public API (kept under a deliberately-namespaced `__testing__` const).
- Test file for `prompt-cache-locale` named `claude-local-prompt-cache-locale.test.ts` (with the `claude-local-` prefix) following the existing convention in `server/src/__tests__/` (sibling: `claude-local-execute.test.ts`, `claude-local-adapter.test.ts`).

## Problemas Encontrados

**1. Pre-existing typecheck baseline (`server/src/services/recovery/service.ts:459`).**
TS2339 `Property 'title' does not exist on type ...`. Confirmed in `master` baseline (STATE.md Phase 7-04 record + Phase 8-05 deferred-items + 11-01-SUMMARY.md). Out-of-scope per `<deviation_rules>` boundary. This plan's changes do not affect that file.

**2. Pre-existing `claude-local-execute.test.ts` failures on Windows.**
`vitest run claude-local-execute` reports 11/14 tests failing with `Failed to start command "...claude"` — Windows shebang adapter spawn issue documented in 06-03 deferred-items.md and reaffirmed in 11-01-SUMMARY.md. Verified by `git stash && vitest run` on master: same 11/14 failure pattern → not introduced by this plan. The 3 passing tests (subset that does not actually spawn the adapter) include checks that touch the modified `prompt-cache.ts` indirectly and remained GREEN.

**3. `pnpm --filter @paperclipai/server test:run` script does not exist.**
The plan suggested this command but the workspace exposes `vitest` directly via `pnpm --filter @paperclipai/server exec vitest run`. Used the latter throughout. Documented in commit messages.

## Texto Exato Final do Directive (palavra por palavra)

```
\n
\n
## Idioma de Resposta\n
\n
Responda ao usuário em português brasileiro (pt-BR). Use linguagem natural, técnica quando apropriado. Mantenha termos técnicos em inglês quando idiomáticos (ex: "commit", "merge", "pull request").\n
```

(Six lines joined by `\n`. Leading and trailing newlines guarantee safe concatenation regardless of whether the host content ends with a newline. UAT-11-01 will verify this exact string surfaces in the materialized agent-instructions.md inside the bundle dir.)

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária. The bundle version bump (v1 → v2) triggers automatic cache rotation on first spawn after deploy without any operator step.

## Self-Check: PASSED

Files created exist:
- `server/src/services/agent-instructions-locale-directive.ts` — FOUND
- `server/src/services/__tests__/agent-instructions-locale-directive.test.ts` — FOUND
- `server/src/__tests__/claude-local-prompt-cache-locale.test.ts` — FOUND

Files modified verified by commit hashes:
- `server/src/services/agent-instructions.ts` — modified in `6bf9896`
- `server/src/__tests__/agent-instructions-service.test.ts` — modified in `6bf9896`
- `packages/adapters/claude-local/src/server/prompt-cache.ts` — modified in `e939fa0`
- `packages/adapters/claude-local/src/server/execute.ts` — modified in `e939fa0`
- `packages/adapters/claude-local/src/server/index.ts` — modified in `e939fa0`

Commits in log:
- `1955666` feat(11-02) directive content — FOUND
- `6bf9896` feat(11-02) exportFiles wiring — FOUND
- `e939fa0` feat(11-02) bundleKey + resume fallback — FOUND

Test results:
- `agent-instructions-locale-directive` — 4/4 GREEN
- `agent-instructions` filter (locale-directive + service + routes) — 20/20 GREEN
- `claude-local-prompt-cache-locale` — 3/3 GREEN
- `claude-local-execute` — 3/14 GREEN, 11/14 fail with pre-existing Windows shebang errors (verified on master)

Typecheck:
- `pnpm --filter @paperclipai/adapter-claude-local typecheck` — exit 0 (clean)
- `pnpm --filter @paperclipai/server typecheck` — fails only on pre-existing `recovery/service.ts:459` baseline (out-of-scope)

## Prontidão para Próxima Fase

**Plan 11-03 (skill variants + HUMAN-UAT) destravado:**

- `prepareClaudePromptBundle` now requires `locale` in the input shape — Plan 11-03's `materializeSkillForLocale` integration in `prompt-cache.ts` reads from the same field and the bundleKey already keys on locale, so 11-03's variant-vs-symlink switch will land in cache-isolated territory automatically.
- `context.runtimeLocale` channel established in 11-01 and consumed in `execute.ts` — 11-03 inherits the consumer and only needs to add file materialization logic in `prompt-cache.ts`.
- The empirical UAT (AGENT-SKILL-04) for resume-session pt-BR adherence is now meaningful: Pitfall 2 fallback exists at code level, so the test "first heartbeat then resume" can validate whether the prompt-body directive is sufficient (UAT pass) or whether we need to also force re-injection of `--append-system-prompt-file` on resume (UAT fail → escalate to a follow-up plan).

**No merge friction expected:** 11-02 modified `prompt-cache.ts` (bundleKey shape + locale arg) and `execute.ts` (read context, pass locale, resume-fallback). 11-03 will modify `prompt-cache.ts` again to swap symlink for copy+rename when a locale variant exists; the changes are in disjoint regions of the file (hashing/preparation top-half vs. symlink loop bottom-half).

---
*Fase: 11-skills-system-prompts*
*Concluída: 2026-04-27*
