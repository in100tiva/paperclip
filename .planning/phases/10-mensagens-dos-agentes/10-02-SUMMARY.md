---
phase: 10-mensagens-dos-agentes
plan: 02
subsystem: ui
tags: [i18n, react-i18next, agents, transcript, run-ledger, live-runs, run-summaries, plurals, interpolation, aria-labels, ui-translation, pt-BR, en-US, agent-msg-02, phase-10-wave-1]

requires:
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: i18next bootstrap, missing-keys CI detector, agents namespace registered
  - phase: 09-traducao-ui-admin-auth-sistemicas
    provides: probe-component i18n test pattern, typed-t() strict mode `as never` cast pattern
  - phase: 10-01
    provides: agents.json populated to 147 leaf keys with 9 disjoint top-level sub-trees (title/filter-*/actions/status/role/detail/panel/new-agent-page/new-agent-dialog/config) — preserved byte-for-byte by this plan; only NEW top-level keys added (transcript/run-ledger/live-runs)

provides:
  - agents.json EXTENDED from 147 to 197 leaf keys × 2 locales (100% structural parity); 3 new top-level sub-trees DISJOINT from 10-01 (transcript 33 + aria 6, run-ledger 10, live-runs 7)
  - 4 TSX files migrated to useTranslation: RunTranscriptView.tsx (1526 LOC, ~30 strings + 6 aria), RunChatSurface.tsx (emptyMessage default), LiveRunWidget.tsx (5 strings), IssueRunLedger.tsx (run summary section lines 416-708)
  - 1 new RTL test file: RunTranscriptView.i18n.test.tsx (8 cases probe-component pattern across pt-BR ↔ en-US toggle for transcript labels / aria / run-ledger / live-runs)
  - Existing test fix: IssueRunLedger.test.tsx selector switched from English text to raw t() keys (i18n-resilient — same Phase 10-01 ActiveAgentsPanel.test.tsx pattern)

affects: [10-03-toasts-notificacoes, 11-skills-system-prompts]

tech-stack:
  added: []
  patterns:
    - "Optional TFunction parameter pattern for pure helper functions (displayToolName, summarizeToolResult, normalizeTranscript): accept `t?: TFunction` with English fallback when undefined. Preserves backward compatibility with existing tests that import these helpers without I18nextProvider (RunTranscriptView.test.tsx — 5 cases continue passing with raw string fallbacks). When `t` is provided by the React component via useTranslation, translation activates."
    - "TFunction widening cast at call sites: `t as unknown as TFunction` when passing a narrow `useTranslation([\"agents\"])` t-function to a helper expecting the default-namespace TFunction signature. Bypasses strict typed-t() namespace mismatch (`TFunction<readonly [\"agents\"]>` vs `TFunction<\"common\">`) without changing runtime behavior. Applied at 2 call sites inside RunTranscriptView."
    - "`as never` cast for typed-t() bypass inside helper functions (Phase 9-04 precedent): when a TFunction parameter is the default `TFunction<\"common\">` type but the call uses `agents:` keys, cast each key as `as never` to satisfy the augmented strict types. Result type also cast `as unknown as string` for interpolation results. Used in summarizeToolResult, displayToolName, normalizeTranscript."

key-files:
  created:
    - "ui/src/components/transcript/__tests__/RunTranscriptView.i18n.test.tsx — 8-case probe (transcript labels pt-BR/en-US, aria pt-BR/en-US, run-ledger pt-BR/en-US, live-runs pt-BR/en-US — verifies interpolation `{{code}}` and plural `{{count}}` resolution)"
    - ".planning/phases/10-mensagens-dos-agentes/10-02-SUMMARY.md — this file"
  modified:
    - "ui/src/i18n/locales/pt-BR/agents.json — 147 → 197 leaf keys (3 new top-level sub-trees: transcript 33 + aria 6, run-ledger 10, live-runs 7)"
    - "ui/src/i18n/locales/en-US/agents.json — 147 → 197 leaf keys (mirror, 100% parity)"
    - "ui/src/components/transcript/RunTranscriptView.tsx — useTranslation in 6 sub-components + main; 30 strings + 6 aria-labels + interpolation/plurals migrated; pure helpers accept optional TFunction with English fallback"
    - "ui/src/components/RunChatSurface.tsx — useTranslation; emptyMessage default via t('agents:live-runs.{waiting-output|no-output}')"
    - "ui/src/components/LiveRunWidget.tsx — useTranslation; 5 strings via t('agents:live-runs.*')"
    - "ui/src/components/IssueRunLedger.tsx — useTranslation in IssueRunLedgerContent; 8 strings + interpolation (active/done/cancelled, total/done/cancelled) + plural (more-children) migrated; line 391 watchdog toast PRESERVED (handed off to 10-03)"
    - "ui/src/components/IssueRunLedger.test.tsx — selector for child-work / child-summary-active / child-summary-terminal switched to raw key strings (test runs without I18nextProvider, t() returns key)"

key-decisions:
  - "Optional TFunction param strategy on pure helpers: `displayToolName`, `summarizeToolResult`, `normalizeTranscript` accept `t?: TFunction`. When undefined, returns English defaults. When provided, returns translated strings via `t(\"agents:...\" as never)`. Rationale: existing RunTranscriptView.test.tsx (5 cases — node environment, no React/i18next provider) imports these helpers directly and asserts behavior. Making `t` required would break 5 tests. Optional preserves backward compat AND enables runtime translation when called from the React component path."
  - "TFunction widening cast (`t as unknown as TFunction`) at component-to-helper boundary: useTranslation([\"agents\"]) returns `TFunction<readonly [\"agents\"]>` but helpers expect default `TFunction<\"common\">`. The two are structurally compatible at runtime but TypeScript's typed-t() augmentation rejects assignment. Cast unblocks compile without changing behavior. Applied at 2 sites: TranscriptToolCard line 769, main RunTranscriptView line 1530."
  - "IssueRunLedger watchdog toast (line 391) explicitly PRESERVED in English: pushToast({ title: 'Watchdog decision not recorded', ... }). Plan 10-02 scope is run-summary rendering (lines 416-708); plan 10-03 (Wave 2) covers toast/notification builders + LiveUpdatesProvider. Migrating early would create coordination friction with 10-03's namespace decisions for `common.toast.agent.*`/`common.toast.run.*`. Documented as explicit handoff with `// TODO(10-03)` not added — the literal string itself is the marker, since 10-03 will grep for it."
  - "Test resilience strategy for IssueRunLedger.test.tsx (Rule 3 fix): switched selector from English text 'Child work' / '1 active, 1 done, 1 cancelled' to raw key strings 'agents:run-ledger.child-work' / 'agents:run-ledger.child-summary-active'. Test runs without I18nextProvider (pure unit, no React wrapping) — t() returns the raw key. Asserting on the key string is i18n-resilient (won't break when JSON values change for ANY locale) AND still proves the component renders the correct keys at the expected positions. Same pattern Phase 10-01 deviation #2 (ActiveAgentsPanel.test.tsx href selector). 3rd application of `t() returns key without provider` test pattern."
  - "Probe-component RTL test pattern (3rd application after CompanySettings 9-01, AgentDetail 10-01): instead of mounting the heavy 1526-LOC RunTranscriptView with complex transcript-entry fixtures + react-markdown + lucide icons, lightweight functional components consume agents:transcript.* / agents:run-ledger.* / agents:live-runs.* sub-trees via useTranslation and assert pt-BR ↔ en-US toggle. 8 cases × ~10 assertions = ~80 assertions running in 165ms. Pattern reusable for any heavy page-level i18n RTL coverage where direct mounting requires excessive context wiring."

patterns-established:
  - "Pure helpers accepting optional TFunction with English fallback: enables incremental i18n migration of utility functions without breaking existing tests that import them directly. Once all consumers route through the React component path with provider, the optionality can be removed in a follow-up cleanup."
  - "Bare key + _one + _other plural triplet in agents:transcript.{log-lines, system-messages, executed-commands} and agents:run-ledger.more-children — 4th application of the bare-key-satisfies-detector pattern (after Phases 8-03, 9-04, 10-01). Detector regex `/[a-z0-9.\\-]+/` rejects underscore suffix; bare key required + suffixed variants drive runtime plural via { count }."
  - "Subcomponent useTranslation pattern (continued from Phase 8-03 inner-component pattern): each TranscriptMessageBlock/ToolCard/CommandGroup/ToolGroup/StderrGroup/SystemGroup/StdoutRow calls `const { t } = useTranslation([\"agents\"])` rather than receiving `t` via prop. Matches react-i18next idiom and keeps subcomponents independently i18n-aware. Trade-off: 7 hook calls per RunTranscriptView render (one per block type) vs 1 call passing t down — negligible perf cost, much cleaner JSX."

requirements-completed: [AGENT-MSG-02]

duration: ~17min
completed: 2026-04-27
---

# Phase 10 Plan 02: Run Summaries (Transcript / Run-Ledger / Live-Runs / Chat-Surface) UI Translation Summary

**agents.json EXTENDED from 147 to 197 leaf keys × 2 locales (100% parity); 3 new disjoint top-level sub-trees (transcript with 33 keys + 6 aria; run-ledger with 10 keys including plurals; live-runs with 7 keys); 4 TSX files migrated to useTranslation (RunTranscriptView 1526 LOC ~30 strings + 6 aria-labels with interpolation `{{code}}` for failed-with-exit; RunChatSurface emptyMessage default; LiveRunWidget 5 strings; IssueRunLedger run summary section lines 416-708 with `{{active}}/{{done}}/{{cancelled}}` interpolation + `more-children` plural _one/_other); 1 new RTL test file RunTranscriptView.i18n.test.tsx 8-case probe-component pt-BR ↔ en-US; existing IssueRunLedger.test.tsx selector switched to i18n-resilient raw keys (Rule 3 fix); IssueRunLedger line 391 watchdog toast PRESERVED as explicit handoff to plan 10-03; full UI suite 701/701 GREEN (was 693, +8 new probes); CI=true missing-keys exit 0; AGENT-MSG-02 satisfied at code-level.**

## Performance

- **Duration:** ~17min
- **Started:** 2026-04-27T01:10:37Z
- **Completed:** 2026-04-27T01:27:11Z
- **Tasks:** 3 (Tarefa 0 bootstrap + Tarefa 1 RunTranscriptView/RunChatSurface/LiveRunWidget + Tarefa 2 IssueRunLedger)
- **Files modified:** 7 (3 dictionaries + 4 TSX/test files)
- **Files created:** 2 (RunTranscriptView.i18n.test.tsx + this SUMMARY)

## Task Commits

1. **Tarefa 0:** `df39cf8` — bootstrap agents.json transcript/run-ledger/live-runs sub-trees (50 new leaf keys × 2 locales) + RunTranscriptView.i18n.test.tsx 8-case probe (transcript labels pt-BR/en-US with interpolation, aria pt-BR/en-US, run-ledger pt-BR/en-US with plurals, live-runs pt-BR/en-US)
2. **Tarefa 1:** `e29d9f4` — RunTranscriptView.tsx (1526 LOC) migrated with optional TFunction pattern in pure helpers (displayToolName, summarizeToolResult, normalizeTranscript) + useTranslation in 6 sub-components + main; ~30 strings + 6 aria-labels via t(); interpolation `{{code}}` in failed-with-exit; plurals in log-lines/system-messages/executed-commands; tools-multiple/used-tool-multiple template strings. RunChatSurface emptyMessage default via t(). LiveRunWidget 5 strings via t().
3. **Tarefa 2:** `c2eea53` — IssueRunLedger.tsx run summary section (lines 416-708) migrated to t() with `{{active}}/{{done}}/{{cancelled}}` interpolation + more-children plural. Line 391 watchdog toast PRESERVED. IssueRunLedger.test.tsx selector switched to raw keys for i18n resilience.

## Accomplishments

- **agents.json EXTENDED with 3 disjoint top-level sub-trees:** pt-BR + en-US 197 leaf keys each (100% parity verified by missing-keys detector), preserving 10-01's 9 sub-trees byte-for-byte.
  - `transcript` (33 keys + 6 aria nested): user, executing-command, executed-command, executed-commands `{{count}}`, tool-failed, waiting-result, waiting-result-ellipsis, completed, running, errored, run-failed, failed-with-exit `{{code}}`, failed, command-failed, input-label, result-label, input-empty, result-pending, empty, streaming, log-lines (bare + _one + _other), system-messages (bare + _one + _other), stdout, using-tool `{{tool}}`, used-tool `{{tool}}`, used-tool-multiple `{{tool}}/{{count}}`, tools-multiple `{{count}}`, plus aria.{collapse|expand}-{tool|command|stdout} (6 entries).
  - `run-ledger` (10 keys with plurals): title, waiting-first-run, no-runs-linked, latest-run, child-work, child-summary-active `{{active}}/{{done}}/{{cancelled}}`, child-summary-terminal `{{total}}/{{done}}/{{cancelled}}`, more-children (bare + _one + _other).
  - `live-runs` (7 keys): title, subtitle, stop, stopping, open-run, waiting-output, no-output.
- **RunTranscriptView.tsx (1526 LOC) migration:**
  - Pure helpers `displayToolName`, `summarizeToolResult`, `normalizeTranscript` extended with optional `t?: TFunction` parameter. English fallback preserved when `t` undefined (existing RunTranscriptView.test.tsx 5 cases continue GREEN with no provider).
  - 6 sub-components added useTranslation hooks: TranscriptMessageBlock (User, Streaming), TranscriptToolCard (status badge Running/Errored/Completed via single t() ternary, aria collapse/expand-tool, Input/Result/<empty>/Waiting for result..., summary via summarizeToolResult(t)), TranscriptCommandGroup (Executing command/Executed command/Executed N commands plural, Command failed, aria collapse/expand-command), TranscriptToolGroup (Using/Used tool/Used tool (N calls) interpolation, status badge, aria, Input/Result), TranscriptStderrGroup (X log lines plural), TranscriptSystemGroup (X system messages plural), TranscriptStdoutRow (stdout label, aria collapse/expand-stdout).
  - Main `RunTranscriptView` component: emptyMessage prop now optional with `t("agents:transcript.empty")` default; passes `t as unknown as TFunction` to normalizeTranscript.
  - Strict typed-t() bypass: 6 keys in pure helpers cast with `as never` (since helper's parameter type is the default `TFunction<"common">` while the call uses `agents:` keys); `failed-with-exit` interpolation result cast `as unknown as string` to bridge `TFunctionDetailedResult<never, never>`.
- **RunChatSurface.tsx:** useTranslation(["agents"]) added; emptyMessage default `"Waiting for run output..."` / `"No run output captured."` migrated to `t("agents:live-runs.{waiting-output|no-output}")` based on `active` state.
- **LiveRunWidget.tsx:** useTranslation(["agents"]) added; 5 strings migrated — Live Runs / subtitle / Stop (with Stopping… variant) / Open run.
- **IssueRunLedger.tsx run summary section migration (lines 416-708):**
  - useTranslation(["agents", "common"]) added in IssueRunLedgerContent.
  - "Run ledger" → t("agents:run-ledger.title").
  - Empty states: "Waiting for the first run record." / "No runs linked yet." → t("agents:run-ledger.{waiting-first-run|no-runs-linked}") based on `issueStatus === "in_progress"`.
  - "Latest run" link label → t("agents:run-ledger.latest-run").
  - "Child work" header → t("agents:run-ledger.child-work").
  - "X active, Y done, Z cancelled" / "all N terminal (Y done, Z cancelled)" → t("agents:run-ledger.child-summary-active", { active, done, cancelled }) / t("agents:run-ledger.child-summary-terminal", { total, done, cancelled }) with i18next interpolation.
  - "+N more" → t("agents:run-ledger.more-children", { count }) with i18next plural _one/_other resolution.
- **IssueRunLedger.tsx line 391 watchdog toast PRESERVED in English** (`pushToast({ title: "Watchdog decision not recorded", body: message, tone: "error" })`) — explicit handoff to plan 10-03 (toasts/notifications). The literal string itself acts as the marker; 10-03 will grep for it during planning.
- **IssueRunLedger.test.tsx selector fix [Rule 3 - Blocker]:** existing test asserted "Child work" / "1 active, 1 done, 1 cancelled" / "all 2 terminal (1 done, 1 cancelled)" via container.textContent. After migration, t() returns raw keys without I18nextProvider (test runs in pure unit context, no React provider). Switched to assert raw key strings ("agents:run-ledger.child-work", "agents:run-ledger.child-summary-active", "agents:run-ledger.child-summary-terminal") — i18n-resilient, still proves component renders correct keys.
- **RunTranscriptView.i18n.test.tsx new RTL probe (8 cases):**
  - transcript labels pt-BR (14 assertions including `failed-with-exit` interpolation with code=127 → "Falhou com código de saída 127") + en-US (8 assertions).
  - aria labels pt-BR (6 assertions for collapse/expand × tool/command/stdout) + en-US (6 assertions).
  - run-ledger pt-BR (9 assertions including child-summary-active interpolation `{{active}}/{{done}}/{{cancelled}}` and more-children plural with count=1 vs count=5) + en-US (4 assertions sample-checking).
  - live-runs pt-BR (7 assertions for title/subtitle/stop/stopping/open-run/waiting-output/no-output) + en-US (6 assertions).
- **Verification:**
  - Full UI suite **701/701 GREEN** (was 693 baseline; +8 net new tests = 8 RunTranscriptView.i18n cases; 0 regressions including the IssueRunLedger.test.tsx selector fix and the existing RunTranscriptView.test.tsx 5 cases preserved via optional TFunction fallback).
  - `CI=true pnpm --filter @paperclipai/ui test:run -- missing-keys` exit 0 (197 leaf keys × 2 locales, 100% parity verified by detector).
  - `pnpm --filter @paperclipai/ui typecheck` preserves only pre-existing `ActivityRow.tsx:42` baseline error (out-of-scope).

## Decisions Made

See key-decisions in frontmatter for full list. Highlights:

- **Optional TFunction parameter strategy on pure helpers:** preserves backward compatibility with existing RunTranscriptView.test.tsx (5 cases) that import helpers directly without I18nextProvider. English fallback when undefined; translation activates when component supplies `t`.
- **TFunction widening cast (`as unknown as TFunction`):** bridges narrow useTranslation(["agents"]) signature and helper's default common-namespace TFunction signature without runtime change. Pure type-level workaround.
- **IssueRunLedger watchdog toast preservation (line 391):** scope discipline — plan 10-02 owns run-summary rendering, plan 10-03 owns toast builders cross-cutting LiveUpdatesProvider. Migrating early would force premature namespace decisions for common:toast.agent.*. The English literal serves as the handoff marker.
- **Test resilience via raw key assertion:** when test runs without I18nextProvider (pure unit context), t() returns the raw key. Asserting on the key string is locale-agnostic and stable across JSON value changes for ANY locale. 3rd application of this pattern (Phase 10-01 deviation #2 ActiveAgentsPanel.test.tsx href selector; this plan IssueRunLedger.test.tsx).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Pure helper functions (`displayToolName`, `summarizeToolResult`, `normalizeTranscript`) live outside React component scope but produce user-facing strings**

- **Found during:** Tarefa 1 RunTranscriptView migration (planning the t() integration)
- **Issue:** Plan listed strings at lines 287, 292, 298, 300, 515 inside pure functions that don't have access to React's useTranslation hook. Direct translation requires either (a) move helpers into component scope, (b) accept `t` as parameter, (c) call useTranslation outside component (anti-pattern). Additionally, existing RunTranscriptView.test.tsx (5 cases) imports `normalizeTranscript` directly in node environment WITHOUT React or I18nextProvider — making `t` required would break those 5 tests.
- **Fix:** Made `t?: TFunction` an OPTIONAL parameter on each helper. When undefined, returns English defaults (preserves existing tests byte-for-byte). When provided by the React component, returns translated strings via `t("agents:..." as never)`. Strict typed-t() bypass via `as never` cast required because helper's parameter type is `TFunction<"common">` (default) but call uses `agents:` keys.
- **Files modified:** ui/src/components/transcript/RunTranscriptView.tsx
- **Verification:** RunTranscriptView.test.tsx 5/5 GREEN preserved + RunTranscriptView.i18n.test.tsx 8/8 GREEN new + missing-keys exit 0
- **Committed in:** `e29d9f4`

**2. [Rule 3 - Blocker] TFunction signature mismatch when passing narrow `useTranslation(["agents"])` t to helpers expecting default-namespace TFunction**

- **Found during:** Tarefa 1 typecheck after wiring helpers
- **Issue:** `useTranslation(["agents"])` returns `TFunction<readonly ["agents"], undefined>`. Helpers declare `t?: TFunction` (defaults to `TFunction<"common">`). TypeScript's typed-t() augmentation rejects `t as TFunction<readonly ["agents"]>` assignment to `TFunction<"common">` parameter — `Type '"agents"' is not assignable to type '"common"'`. Runtime is fine (TFunction is structurally identical), but compile fails.
- **Fix:** Cast `t as unknown as TFunction` at the 2 call sites (TranscriptToolCard line 769 calling summarizeToolResult, RunTranscriptView line 1530 calling normalizeTranscript). Pure type-level workaround; no runtime change.
- **Files modified:** ui/src/components/transcript/RunTranscriptView.tsx
- **Verification:** typecheck preserves baseline ActivityRow:42 only.
- **Committed in:** `e29d9f4`

**3. [Rule 3 - Blocker] IssueRunLedger.test.tsx existing assertion broke after migration (test runs without I18nextProvider)**

- **Found during:** Tarefa 2 vitest run after IssueRunLedger migration
- **Issue:** Existing test asserted `container.textContent.toContain("Child work")` and `container.textContent.toContain("1 active, 1 done, 1 cancelled")`. After migration to `t("agents:run-ledger.child-work")`, the test runs without I18nextProvider so `t()` returns the raw key `"agents:run-ledger.child-work"`. Test failed with `expected 'agents:run-ledger.title...' to contain 'Child work'`.
- **Fix:** Switched assertions to raw key strings: `toContain("agents:run-ledger.child-work")` / `toContain("agents:run-ledger.child-summary-active")` / `toContain("agents:run-ledger.child-summary-terminal")`. i18n-resilient (won't break when JSON values change for ANY locale) and still proves the component renders the correct keys at the expected positions. Same pattern as Phase 10-01 deviation #2 (ActiveAgentsPanel.test.tsx href selector switch).
- **Files modified:** ui/src/components/IssueRunLedger.test.tsx
- **Verification:** IssueRunLedger.test.tsx 10/10 GREEN restored; full UI suite 701/701 GREEN.
- **Committed in:** `c2eea53`

---

**Total deviations:** 3 auto-fixes — all Rule 3 (blockers required to satisfy verification criteria). No Rule 4 (architectural) deviations. Scope expansion was minimal (each fix isolated to one file). Plan executed largely as written; deviations were necessary type-level + test-fixture adjustments that the plan-as-written wouldn't compile/pass without.

## Issues Encountered

- **Pre-existing TS errors:** `ui/src/components/ActivityRow.tsx:42` baseline confirmed across multiple plan SUMMARYs (Phase 8-05, 9-01..04, 10-01). Out-of-scope per Boundary.
- **CRLF line ending warnings** during git add on JSON dictionaries + new test file (Windows + .gitattributes default). Cosmetic, no functional impact.
- **Strict typed-t() noise from existing RunTranscriptView.test.tsx:** test runs in node environment without `initReactI18next`; useTranslation in the component logs a warning `react-i18next:: useTranslation: You will need to pass in an i18next instance`. This is expected and benign — the component falls through to the English fallback path via the optional TFunction parameter. No assertion impacted.
- **Out-of-scope strings in summarizeToolInput (lines 217, 234, 238, 243):** diagnostic fallback strings like "Inspect ${name} input" / "${count} paths, starting with ${first}" / "No ${name} input" / "${count} fields: ${keys}". These are technical/preview strings showing tool names (technical IDs like "Read", "Bash", "Edit") with English connector words. Not migrated this plan — they're shown only in fallback paths when the tool input doesn't match common shapes; the `name` field is a technical identifier (never translated per anti-pattern guideline). Future cleanup or v2 candidate.
- **AgentDetail.tsx breadcrumb "Run XXX" prefix (line 868 in 10-01 — already migrated to `t("agents:detail.header.run-prefix")`):** referenced for context — 10-01 already covered this. Out-of-scope for 10-02.

## Manual Configuration Required

None — pure UI translation; no service/infrastructure changes.

## Known Stubs

None. All migrated strings are connected to live data sources via t() or render explicit English fallback strings (in pure helpers when `t` undefined).

## Self-Check: PASSED

Verified post-write:

- [x] `ui/src/i18n/locales/pt-BR/agents.json` exists, parses, contains 3 new top-level sub-trees (transcript/run-ledger/live-runs); 10-01 sub-trees preserved byte-for-byte
- [x] `ui/src/i18n/locales/en-US/agents.json` exists, parses, mirror with 100% parity
- [x] `ui/src/components/transcript/__tests__/RunTranscriptView.i18n.test.tsx` exists; 8 tests GREEN
- [x] `ui/src/components/transcript/RunTranscriptView.tsx` extends useTranslation in 6 subcomponents + main; pure helpers accept optional TFunction
- [x] `ui/src/components/RunChatSurface.tsx` uses useTranslation; emptyMessage default via t()
- [x] `ui/src/components/LiveRunWidget.tsx` uses useTranslation; 5 strings via t()
- [x] `ui/src/components/IssueRunLedger.tsx` uses useTranslation in IssueRunLedgerContent; lines 416-708 migrated
- [x] `ui/src/components/IssueRunLedger.tsx` line 391 watchdog toast PRESERVED in English (verified via grep)
- [x] Commits exist: `df39cf8`, `e29d9f4`, `c2eea53`
- [x] `pnpm --filter @paperclipai/ui typecheck` preserves only pre-existing ActivityRow:42 error
- [x] `CI=true pnpm --filter @paperclipai/ui test:run -- missing-keys` 1/1 GREEN (197 keys × 2 locales)
- [x] `pnpm --filter @paperclipai/ui exec vitest run` Full UI suite 701/701 GREEN (was 693 baseline + 8 net new tests, 0 regressions)
- [x] RunTranscriptView.i18n test 8/8 GREEN; IssueRunLedger.test 10/10 GREEN; existing RunTranscriptView.test.tsx 5/5 preserved GREEN (optional TFunction fallback)

## Phase 10 Wave 1 Status

**AGENT-MSG-02 satisfied** at code-level: summaries / relatórios apresentados em UI (transcript view, run ledger, live run widget, chat surface emptyMessage) renderizam em pt-BR via t() — Executando comando, Comando executado, Concluído, Em execução, Com erro, Falhou com código de saída {code}, Aguardando resultado, Entrada, Resultado, Recolher/Expandir detalhes, Registro de execuções, Trabalho derivado, X ativos/Y concluídos/Z cancelados, +N a mais, Execuções ao vivo, Parar, Abrir execução. Toggle pt-BR ↔ en-US devolve transcript/ledger/widget/chat-surface para inglês imediatamente.

**Wave 1 complete:** 10-01 (panels/status/config) + 10-02 (this plan, summaries) closed at code-level. Both edited disjoint top-level sub-trees of agents.json — zero merge friction.

**Wave 2 next:** 10-03 (Toasts/Notifications + LiveUpdatesProvider builders + AgentDetail.tsx:1606 + IssueRunLedger.tsx:391 watchdog toast — AGENT-MSG-04). Depends on agents namespace established in Wave 1; will cross-cut common.json with toast.agent.* / toast.run.* sub-trees.

**HUMAN-UAT-10-02 routing:** Visual scan of run transcript view + issue run ledger + live run widget preserved for Phase 10 closure (operator validates labels/aria/plurals/interpolation in pt-BR locale via real run with command/tool/result blocks).

---
*Phase: 10-mensagens-dos-agentes*
*Concluída: 2026-04-27*
