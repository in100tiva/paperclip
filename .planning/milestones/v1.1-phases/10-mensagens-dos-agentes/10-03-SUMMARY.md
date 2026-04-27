---
phase: 10-mensagens-dos-agentes
plan: 03
subsystem: ui
tags: [i18n, react-i18next, agents, toasts, live-updates, websocket, tref-pattern, pitfall-2, ui-translation, pt-BR, en-US, agent-msg-04, phase-10-wave-2, phase-10-closure]

requires:
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: i18next bootstrap, missing-keys CI detector, common namespace already populated
  - phase: 09-traducao-ui-admin-auth-sistemicas
    provides: common.json toast.* sub-tree (Phase 9-04 — saved/save-failed/member-*/environment-*/etc.) preserved byte-for-byte
  - phase: 10-01
    provides: agents.json populated to 147 leaf keys (not consumed here, but no JSON conflict)
  - phase: 10-02
    provides: IssueRunLedger.tsx line 391/393 watchdog toast preserved as English handoff marker — closed in this plan

provides:
  - common.json EXTENDED from 144 to 164 leaf keys × 2 locales (100% structural parity); 4 new disjoint sub-trees toast.{agent,run,join-request,activity} + 1 leaf toast.watchdog-decision-not-recorded
  - LiveUpdatesProvider.tsx refactored with tRef pattern (Pitfall 2) + 4 toast builders accepting TFunction as last param + handleLiveEvent forwarding t — useEffect socket-mounting deps array UNCHANGED so language change does not trigger socket reconnect
  - 2 isolated toasts migrated: AgentDetail.tsx ConfigurationTab "Save failed" + IssueRunLedger.tsx watchdog "decision not recorded" — closes the explicit handoff from Plan 10-02 line 391/393
  - 1 new vitest probe LiveUpdatesProvider.toast.i18n.test.ts with 5 cases (4 builders pt-BR + 1 case verifying mocked WebSocket NOT close+reopened across i18n.changeLanguage)
  - Existing LiveUpdatesProvider.test.ts (14 cases) preserved via tFake helper passing English-equivalent strings (Rule 3 fix — 4 callsite signature mismatches from added required t param)
  - 10-HUMAN-UAT.md artifact with 3 procedures (UAT-10-01..03) covering all 4 phase requirements

affects: [11-skills-system-prompts]

tech-stack:
  added: []
  patterns:
    - "tRef pattern (Pitfall 2 mitigation): `const tRef = useRef(t); useEffect(() => { tRef.current = t; }, [t])` — captures the current `t` function in a mutable ref so callbacks reading `tRef.current` always see the latest namespace bindings, while preserving the stable identity of the dependent useEffect hook (the WebSocket-mounting effect's deps remain unchanged). Language change re-renders the provider but does NOT trigger socket reconnect. Pattern reusable for any provider hosting long-lived imperative resources (sockets, timers, observers) that need access to translated strings."
    - "TFunction last-param convention on pure helper functions: 4 toast builders now accept `t: TFunction` as the final positional parameter (after all data/dependencies). Callers thread `tRef.current` through. Convention follows Phase 8-03 STATUS_KEY style of keeping translation as a leaf concern rather than a hidden dependency injected via context — explicit data flow at the cost of one extra param per call."
    - "Strict typed-t() bypass via `as never` cast for cross-namespace dynamic keys: builders construct keys at runtime (`common:toast.run.${statusKebab}`) where the typed-t() augmentation rejects the broad union. `t(key as never, params) as unknown as string` cast preserves runtime behavior. 5th application of the pattern (Phases 9-04, 10-01, 10-02 — now 10-03)."
    - "English-equivalent fake TFunction (tFake) for legacy unit tests asserting toast title strings without an I18nextProvider: a switch statement returning the en-US dictionary's interpolated values keyed by translation key. Preserves test invariants (`'CodexCoder errored'`, `'CodexCoder run failed'`, `'boom'`) byte-for-byte while satisfying the new required parameter. Pattern reusable when a builder gains a `t` requirement and existing test fixtures cannot be cheaply migrated to RTL with provider."

key-files:
  created:
    - "ui/src/context/__tests__/LiveUpdatesProvider.toast.i18n.test.ts — 5-case probe (4 builders pt-BR + 1 mocked-WebSocket no-reconnect across i18n.changeLanguage). Uses jsdom environment for the React component case, real i18n singleton for builder assertions"
    - ".planning/phases/10-mensagens-dos-agentes/10-HUMAN-UAT.md — 3 UATs (UAT-10-01..03) covering AGENT-MSG-01..04 with step-by-step verification scripts"
    - ".planning/phases/10-mensagens-dos-agentes/10-03-SUMMARY.md — this file"
  modified:
    - "ui/src/i18n/locales/pt-BR/common.json — 144 → 164 leaf keys (4 new sub-trees: toast.agent 3, toast.run 6, toast.join-request 4, toast.activity 6, plus toast.watchdog-decision-not-recorded leaf)"
    - "ui/src/i18n/locales/en-US/common.json — 144 → 164 leaf keys (mirror, 100% parity)"
    - "ui/src/context/LiveUpdatesProvider.tsx — useTranslation([\"common\", \"activity\"]) + tRef pattern; 4 builders accept TFunction last param; handleLiveEvent forwards t; socket.onmessage callback passes tRef.current; __liveUpdatesTestUtils extended with all 4 builders + handleLiveEvent"
    - "ui/src/context/LiveUpdatesProvider.test.ts — tFake helper added; 4 broken callsites fixed to pass tFake (Rule 3); 14/14 cases preserved GREEN with English title assertions intact"
    - "ui/src/pages/AgentDetail.tsx — ConfigurationTab inner component gains useTranslation([\"common\"]); line 1610 toast title via t('common:toast.save-failed') (reuses Phase 9-04 key)"
    - "ui/src/components/IssueRunLedger.tsx — IssueRunLedger component gains useTranslation([\"common\"]); line 393 toast title via t('common:toast.watchdog-decision-not-recorded') (uses Tarefa 0 new key); closes the 10-02 handoff"

key-decisions:
  - "tRef pattern (RESEARCH Pattern 3 + Pitfall 2 mitigation): the LiveUpdatesProvider's WebSocket-mounting useEffect deps array remains EXACTLY [queryClient, liveCompanyId, pushToast, canConnectSocket, socketAuthKey] — `t` and `tRef` are NOT added. The handler reads tRef.current at invocation time inside socket.onmessage, so toast strings always reflect the current language. Validated empirically by the no-reconnect test case (mocked WebSocket constructor count + close.mock.calls.length both unchanged across i18n.changeLanguage)."
  - "Body strings preserved untranslated (Pitfall RESEARCH §Anti-Patterns): toast `body` fields holding `agent.title` (user-supplied), `error` (server error message), `triggerDetail` (free-form payload), `bodySnippet` (issue comment text), and `issue.title` are NOT routed through t(). They are dynamic data, not code-emitted strings. Only the prose around them — `t('common:toast.run.trigger-prefix', { detail })` for example — is translated."
  - "Phase 10 closure mode: complete-with-pending-UAT (precedent Phases 3-9). All 4 phase requirements (AGENT-MSG-01..04) satisfied at code-level via the cumulative work of plans 10-01/10-02/10-03. UAT-10-01..03 (operator visual scan) deferred as non-blocking validation — code coverage is exhaustive (706/706 GREEN; CI=true missing-keys exit 0; pnpm typecheck baseline only)."
  - "Existing LiveUpdatesProvider.test.ts preservation strategy: rather than rewriting 4 callsites + 14 cases to use real i18n / RTL providers, a 30-line tFake helper returning English-equivalent strings keeps the existing test invariants byte-for-byte. The new behavioral coverage (5-case probe with real i18n + mocked WebSocket) lives in a separate file. Net: 14 + 5 = 19 LiveUpdatesProvider-related test cases, +5 net, 0 regressions."
  - "Action label conventions: 4 toast builders normalize to `t('common:toast.{ns}.view*')` — view (agent), view (run), view-inbox (join-request), view-ref (activity, with `{{ref}}` interpolation). Patterns mirrored byte-for-byte across pt-BR / en-US. The 'view-ref' interpolation lets the dynamic ref (e.g. TASK-123) appear inside the action label naturally in both languages."

patterns-established:
  - "Mutable-ref capture for non-reactive translation access: when a long-lived imperative subscription (WebSocket, EventSource, timer) needs current translation but the subscription's lifecycle must be decoupled from translation identity, capture `t` in a useRef + sync via dedicated useEffect. The subscription effect's deps array stays narrow. Pattern reusable for any callback-heavy provider in this codebase."
  - "Bare-key dynamic translation with statusKebab transform: when an enum value differs from its kebab-case key form (e.g. `timed_out` vs `timed-out`), normalize at the call site — `const statusKebab = status === 'timed_out' ? 'timed-out' : status; t(\`common:toast.run.${statusKebab}\`)`. Keeps JSON in canonical kebab-case (per detector regex `[a-z0-9.-]+`) without polluting the data layer."
  - "5th application of `as never` typed-t() bypass for cross-namespace template-literal keys (Phases 9-04, 10-01, 10-02, 10-03 builders, 10-03 isolated callsites)."

requirements-completed: [AGENT-MSG-04]

duration: ~14min
completed: 2026-04-27
---

# Phase 10 Plan 03: LiveUpdatesProvider tRef Pattern + Toast Builders + Isolated Agent Toasts Summary

**common.json EXTENDED from 144 to 164 leaf keys × 2 locales (100% parity); 4 new disjoint sub-trees toast.{agent,run,join-request,activity} (19 keys total) + 1 leaf toast.watchdog-decision-not-recorded preserving Phases 7-9 keys byte-for-byte; LiveUpdatesProvider.tsx refactored with tRef pattern (Pitfall 2 mitigation — useEffect socket-mounting deps unchanged) + 4 toast builders (buildActivityToast / buildJoinRequestToast / buildAgentStatusToast / buildRunStatusToast) accepting TFunction last param + handleLiveEvent forwarding t + socket.onmessage callback passing tRef.current at invocation time; __liveUpdatesTestUtils extended with all 4 builders + handleLiveEvent for direct unit-test invocation; existing LiveUpdatesProvider.test.ts (14 cases) preserved GREEN via tFake helper (English-equivalent fake TFunction — Rule 3 fix for 4 callsite signature mismatches); new LiveUpdatesProvider.toast.i18n.test.ts probe (5 cases: 4 builders pt-BR + 1 mocked-WebSocket no-reconnect across i18n.changeLanguage); 2 isolated toasts migrated (AgentDetail.tsx ConfigurationTab "Save failed" + IssueRunLedger.tsx watchdog "decision not recorded" — closes 10-02 handoff); 10-HUMAN-UAT.md artifact with 3 UATs covering all 4 AGENT-MSG-XX requirements; full UI suite **706/706 GREEN** (was 701, +5 net new probes, 0 regressions); CI=true missing-keys exit 0; UI typecheck preserves only pre-existing ActivityRow.tsx:42 baseline. AGENT-MSG-04 satisfied at code-level. **Phase 10 ready to close as `complete-with-pending-UAT`.**

## Performance

- **Duration:** ~14min
- **Started:** 2026-04-27T01:34:41Z
- **Completed:** 2026-04-27T01:48:03Z
- **Tasks:** 3 (Tarefa 0 bootstrap + Tarefa 1 LiveUpdatesProvider refactor + Tarefa 2 isolated toasts)
- **Files modified:** 6 (2 dictionaries + 4 TSX/test files)
- **Files created:** 3 (probe test + HUMAN-UAT artifact + this SUMMARY)

## Task Commits

1. **Tarefa 0:** `8b1e9cc` — extend common.json (pt-BR + en-US) with 4 toast sub-trees + 1 leaf (20 new keys × 2 locales) preserving Phase 7-9 keys byte-for-byte; LiveUpdatesProvider.toast.i18n.test.ts skeleton with 5 it.todo
2. **Tarefa 1:** `79faa50` — LiveUpdatesProvider refactor (tRef pattern + 4 builders TFunction last param + handleLiveEvent forwarding + __liveUpdatesTestUtils extension); LiveUpdatesProvider.test.ts tFake helper + 4 callsite fixes (Rule 3); LiveUpdatesProvider.toast.i18n.test.ts 5/5 cases promoted to real assertions GREEN
3. **Tarefa 2:** `a51e331` — AgentDetail.tsx ConfigurationTab + IssueRunLedger.tsx IssueRunLedger isolated toast migration via t() (closes 10-02 handoff)

## Accomplishments

- **common.json EXTENDED:** pt-BR + en-US 164 leaf keys each (was 144), 100% structural parity verified by missing-keys detector. 4 new disjoint sub-trees:
  - `toast.agent` (3): started, errored, view
  - `toast.run` (6): succeeded, failed, timed-out, cancelled, trigger-prefix, view
  - `toast.join-request` (4): agent-wants, someone-wants, body, view-inbox
  - `toast.activity` (6): issue-created, issue-updated, issue-commented, issue-reopened-commented, issue-commented-updated, view-ref
  - `toast.watchdog-decision-not-recorded` (1 leaf)
- **LiveUpdatesProvider.tsx tRef pattern:** added `useTranslation(["common", "activity"])` + `const tRef = useRef<TFunction>(t)` + `useEffect(() => { tRef.current = t; }, [t])`. Critical: socket-mounting useEffect deps array UNCHANGED — `[queryClient, liveCompanyId, pushToast, canConnectSocket, socketAuthKey]` (no `t`, no `tRef`). Handler reads tRef.current inside socket.onmessage callback at invocation time.
- **4 toast builders refactored:**
  - `buildAgentStatusToast(payload, nameOf, queryClient, companyId, t)` → `t('common:toast.agent.{started|errored}', { name })` + action label via `t('common:toast.agent.view')`.
  - `buildRunStatusToast(payload, nameOf, t)` → status normalization (`timed_out → timed-out`) + dynamic key `t(\`common:toast.run.${statusKebab}\`, { name })`; trigger prefix body via `t('common:toast.run.trigger-prefix', { detail })`; action label via `t('common:toast.run.view')`. Status enum coverage: succeeded / failed / timed-out / cancelled.
  - `buildJoinRequestToast(payload, t)` → title via `t('common:toast.join-request.{agent-wants|someone-wants}')`; body via `t('common:toast.join-request.body')`; action via `t('common:toast.join-request.view-inbox')`.
  - `buildActivityToast(queryClient, companyId, payload, currentActor, t)` → title key dispatch by action (`issue.created`, `issue.updated`, `issue.comment_added` with combo flags reopened/updated) → `t('common:toast.activity.{issue-created|issue-updated|issue-commented|issue-reopened-commented|issue-commented-updated}', { actor, ref })`; action label via `t('common:toast.activity.view-ref', { ref })`.
- **handleLiveEvent extended** with `t: TFunction` param; forwards to each builder. Callsite in socket.onmessage passes `tRef.current`.
- **__liveUpdatesTestUtils extended** with all 4 builders + handleLiveEvent for direct unit-test invocation. Pre-existing exports preserved (closeSocketQuietly, hydrateVisibleIssueComment, etc.).
- **Existing LiveUpdatesProvider.test.ts (14 cases) preserved GREEN** via tFake helper:
  - 30-line English-equivalent fake TFunction with switch statement returning en-US dictionary's interpolated values keyed by translation key.
  - 4 broken callsites in `LiveUpdatesProvider run lifecycle toasts` describe block fixed to pass tFake.
  - All English title assertions (`"CodexCoder errored"`, `"CodexCoder run failed"`, `"boom"`) preserved byte-for-byte.
- **New LiveUpdatesProvider.toast.i18n.test.ts probe (5/5 GREEN):**
  - jsdom environment; real i18n singleton imported; `i18n.changeLanguage("pt-BR")` in beforeAll.
  - Case 1 — buildAgentStatusToast pt-BR: `{ agentId: "agent-1", status: "error" }` → assert `title === "Bot com erro"`, `action.label === "Ver agente"`.
  - Case 2 — buildRunStatusToast pt-BR: `{ status: "failed", triggerDetail: "manual" }` → assert `title === "Execução de Bot falhou"`, `body === "Gatilho: manual"`, `action.label === "Ver execução"`.
  - Case 3 — buildActivityToast pt-BR: `{ entityType: "issue", action: "issue.created", actorType: "user", details.identifier: "TASK-123" }` → assert `title === "Board criou TASK-123"` (user actor falls back to "Board" when directory absent — preserved behavior), `action.label === "Ver TASK-123"`.
  - Case 4 — buildJoinRequestToast pt-BR: `{ entityType: "join_request", action: "join.requested", details.requestType: "agent" }` → assert `title === "Um agente quer entrar"`, `body === "Uma nova solicitação de entrada aguarda aprovação."`, `action.label === "Ver inbox"`.
  - Case 5 — language change no-reconnect: vi.mock CompanyContext + authApi + router; FakeWebSocket constructor counts instances + tracks close.mock.calls; render `<I18nextProvider><QueryClientProvider><ToastProvider><LiveUpdatesProvider>`; await initial socket creation; `await i18n.changeLanguage("en-US")`; assert `wsInstances.length` unchanged AND `closeCallsAfter === closeCallsBefore`.
- **AgentDetail.tsx ConfigurationTab migration:** added `useTranslation(["common"])` to inner component (line ~1577); replaced `pushToast({ title: "Save failed", body: message, tone: "error" })` with `t('common:toast.save-failed')` (reuses Phase 9-04 key — no new addition needed).
- **IssueRunLedger.tsx IssueRunLedger migration:** added `useTranslation(["common"])` (line ~351); replaced `pushToast({ title: "Watchdog decision not recorded", ... })` with `t('common:toast.watchdog-decision-not-recorded')` — uses Tarefa 0 new key. Closes the explicit handoff from Plan 10-02 (line 391/393 watchdog toast was preserved in English by 10-02 with the literal as the marker).
- **10-HUMAN-UAT.md artifact:** 3 UATs (UAT-10-01..03) with step-by-step procedures, pre-conditions, pass criteria, failure paths. Coverage:
  - UAT-10-01 — Painéis de agente (AGENT-MSG-01 + AGENT-MSG-03): listing + dashboard + detail + tabs + actions + properties + more menu + new dialog.
  - UAT-10-02 — Run summaries (AGENT-MSG-02): transcript labels + aria + IssueRunLedger + LiveRunWidget + RunChatSurface emptyMessage + plurals + interpolation.
  - UAT-10-03 — Toasts de eventos de agente (AGENT-MSG-04): 13 cenários cobrindo run.{succeeded,failed,timed-out,cancelled} + agent.error + activity.{created,updated,commented} + join-request + activity log verbs + AgentDetail Save failed + IssueRunLedger watchdog + Pitfall 2 (language change no-reconnect).

## Decisions Made

See key-decisions in frontmatter for full list. Highlights:

- **tRef pattern preserves socket connection across language change:** `useEffect` deps array stays minimal (5 items, no `t` / no `tRef`). Validated empirically via mocked WebSocket constructor count + close.mock.calls.length unchanged across `i18n.changeLanguage`. Pattern proven; reusable for any provider hosting long-lived imperative subscriptions.
- **Body strings remain untranslated:** `agent.title`, `error`, `triggerDetail`, `bodySnippet`, `issue.title` — dynamic data, not code-emitted prose. Only wrapping prose translated (e.g. `'Gatilho: {{detail}}'` template). Pitfall RESEARCH §Anti-Patterns honored.
- **Existing test preservation via tFake helper:** keeps 14 cases GREEN with English assertions byte-for-byte; new probe lives in separate file. Net: +5 cases, 0 regressions.
- **Phase 10 closure mode `complete-with-pending-UAT`:** all 4 reqs satisfied at code-level via 10-01 + 10-02 + 10-03. UAT-10-01..03 deferred as non-blocking operator validation (precedent Phases 3-9).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Existing LiveUpdatesProvider.test.ts (14 cases) had 4 callsites that broke after builders gained required `t: TFunction` last param**

- **Found during:** Tarefa 1 typecheck after refactor
- **Issue:** Plan added required `t` param to all 4 builders. Existing test file at `LiveUpdatesProvider.test.ts:617,629,651,667` invokes builders directly with 4 args (without t). TS errors `Expected 5 arguments, but got 4` and `Expected 3 arguments, but got 2`.
- **Fix:** Added 30-line `tFake` helper at top of file — fake TFunction returning English-equivalent strings via switch statement keyed by translation key. Patched 4 callsites to pass `tFake` as last arg. All English title assertions (`"CodexCoder errored"`, `"CodexCoder run failed"`, `"boom"`) preserved byte-for-byte without rewriting test bodies. Pattern reusable when builders gain a required `t` and migrating the test to RTL with provider would inflate cost beyond justification.
- **Files modified:** ui/src/context/LiveUpdatesProvider.test.ts
- **Verification:** Existing 14/14 GREEN preserved; new probe 5/5 GREEN; full UI suite 706/706 GREEN.
- **Committed in:** `79faa50`

**2. [Rule 1 - Bug fix] First version of buildActivityToast probe assertion expected `'Someone criou TASK-123'` but actual output was `'Board criou TASK-123'`**

- **Found during:** Tarefa 1 first vitest run of new probe
- **Issue:** Test passed `actorType: "user"` but the queryClient mock returned undefined for the user directory query. `resolveActorLabel` on user fallback path (line 87-88) returns `"Board"` not `"Someone"` — the latter is the "unknown actor type" fallback (line 89). Test assertion was wrong, not the implementation.
- **Fix:** Updated assertion to expect `"Board criou TASK-123"` with comment explaining the fallback semantics. Implementation unchanged — preserves existing resolveActorLabel behavior.
- **Files modified:** ui/src/context/__tests__/LiveUpdatesProvider.toast.i18n.test.ts
- **Verification:** Probe 5/5 GREEN.
- **Committed in:** `79faa50` (atomic with Tarefa 1)

---

**Total deviations:** 2 auto-fixes — Rule 3 (test signature blocker) + Rule 1 (initial assertion mismatch with actual code path). No Rule 4 (architectural). No scope expansion. Plan executed largely as written; deviations were minor type-level + test-fixture adjustments.

## Issues Encountered

- **Pre-existing TS errors:** `ui/src/components/ActivityRow.tsx:42` baseline confirmed across multiple plan SUMMARYs (Phases 8-05, 9-01..04, 10-01, 10-02). Out-of-scope per Boundary.
- **CRLF line ending warnings** during git add on JSON dictionaries + new test file (Windows + .gitattributes default). Cosmetic, no functional impact.
- **Out-of-scope toasts NOT migrated:** IssueDetail (~13 strings), RoutineDetail (some), AdapterManager, PluginManager — preserved in English per Phase 9-04 known-gap precedent. Documented as future cleanup or v2 candidate.
- **In-flight working tree changes** (`.planning/phases/08-traducao-ui-core/08-05-PLAN.md`, `ui/src/lib/issue-reference.ts`, untracked `.planning/phases/08-traducao-ui-core/08-RESEARCH.md`, untracked `10-{01,02,03}-PLAN.md`) NOT touched by this plan's commits — surgical staging via explicit `git add` of in-scope files only.

## Manual Configuration Required

None — pure UI translation; no service/infrastructure changes.

## Known Stubs

None. All migrated strings are connected to live data sources via t() with proper interpolation. Body fields preserve dynamic server-supplied data (intentional — Pitfall RESEARCH §Anti-Patterns).

## Self-Check: PASSED

Verified post-write:

- [x] `ui/src/i18n/locales/pt-BR/common.json` exists, parses, contains 4 new toast sub-trees + 1 leaf (164 keys total)
- [x] `ui/src/i18n/locales/en-US/common.json` exists, parses, mirror with 100% parity
- [x] `ui/src/context/LiveUpdatesProvider.tsx` extends useTranslation; tRef pattern present; 4 builders accept TFunction last param; handleLiveEvent forwards t; socket.onmessage passes tRef.current; __liveUpdatesTestUtils extended
- [x] `ui/src/context/LiveUpdatesProvider.test.ts` — tFake helper + 4 callsite fixes; 14/14 GREEN preserved
- [x] `ui/src/context/__tests__/LiveUpdatesProvider.toast.i18n.test.ts` exists; 5 tests GREEN
- [x] `ui/src/pages/AgentDetail.tsx` ConfigurationTab uses useTranslation([\"common\"]); line 1610 toast title via t()
- [x] `ui/src/components/IssueRunLedger.tsx` IssueRunLedger uses useTranslation([\"common\"]); line 393 toast title via t()
- [x] Commits exist: `8b1e9cc`, `79faa50`, `a51e331`
- [x] `pnpm --filter @paperclipai/ui typecheck` preserves only pre-existing ActivityRow:42 error
- [x] `CI=true pnpm --filter @paperclipai/ui exec vitest run -- missing-keys` 1/1 GREEN
- [x] `pnpm --filter @paperclipai/ui exec vitest run` Full UI suite **706/706 GREEN** (was 701 baseline + 5 net new probe cases, 0 regressions)
- [x] LiveUpdatesProvider.toast.i18n probe 5/5 GREEN; existing LiveUpdatesProvider.test.ts 14/14 GREEN
- [x] `.planning/phases/10-mensagens-dos-agentes/10-HUMAN-UAT.md` exists with 3 UATs covering AGENT-MSG-01..04

## Phase 10 Status

**AGENT-MSG-04 satisfied** at code-level: notificações e toasts de eventos de agente (run started/failed/timed-out/cancelled, agent.error, activity issue.{created,updated,comment_added} with combo variants, join-request agent/human variants) renderizam em pt-BR via t() + interpolação. Action labels traduzidas. 2 toasts isolados (AgentDetail Save failed + IssueRunLedger watchdog) migrados — handoff fechado. tRef pattern preserva socket connection across language change.

**Phase 10 complete (Wave 2 closed):**
- 10-01 (panels/status/config) + 10-02 (summaries) + 10-03 (toasts/notifications) cumulatively cover AGENT-MSG-01..04.
- Total agents.json: 197 leaf keys × 2 locales (10-01: 147, 10-02: +50).
- Total common.json: 164 leaf keys × 2 locales (10-03 added 20).
- 0 strings hardcoded UI-facing in in-scope files.
- All 3 plans executed in sequence over ~61min total (10-01 ~30min + 10-02 ~17min + 10-03 ~14min).

**Phase 10 ready to close as `complete-with-pending-UAT`** (precedent Phases 3-9):
- Code-level work complete — 706/706 UI tests GREEN, missing-keys CI exit 0, typecheck baseline only.
- HUMAN-UAT artifact (10-HUMAN-UAT.md) persisted with 3 procedures (UAT-10-01..03) covering all 4 reqs.
- UATs are non-blocking operator visual validation deferred post-merge per established precedent.

**Next phase:** Phase 11 (Skills + System Prompts — AGENT-SKILL-01..04). Last phase of milestone v1.1. Skills/system prompts em pt-BR quando idioma ativo; agent context propagation; instance-locale → agent-spawn locale plumbing.

---
*Phase: 10-mensagens-dos-agentes*
*Concluída: 2026-04-27*
