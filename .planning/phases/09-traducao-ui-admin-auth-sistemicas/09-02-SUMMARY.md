---
phase: 09-traducao-ui-admin-auth-sistemicas
plan: 02
subsystem: ui
tags: [i18n, react-i18next, auth, sign-in, sign-up, invite, board-claim, cli-auth, ui-translation, pt-BR, en-US, trans-component, brand-preserving, better-auth]

requires:
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: i18next bootstrap, missing-keys CI detector, auth.json scaffold
  - phase: 08-traducao-ui-core
    provides: brand-preserving interpolation, fixture-fix protocol (Rule 1), inner-component useTranslation pattern
  - plan: 09-03b
    provides: ApiError.code field + translateApiError(error, t) helper for error toast localization, errors:auth.* sub-tree (user-already-exists, invalid-email-or-password, request-failed-401/422)
  - plan: 09-01
    provides: AnyTFunction = TFunction<any, undefined> signature widening pattern, permissive cast at component scope, fixture-fix protocol Nth-application precedent

provides:
  - auth.json populated for both pt-BR and en-US (5 sub-trees / 132 leaf keys, 100% parity verified)
  - 4 auth pages fully migrated to useTranslation (Auth, BoardClaim, CliAuth, InviteLanding — 1324 LOC total)
  - mapInviteAuthFeedback refactored: signature accepts `t: AnyTFunction` and returns `t('auth:invite.auth.{key}', { email })` instead of inline strings; Better Auth code map (USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL, INVALID_EMAIL_OR_PASSWORD) + Request failed 401/422 string match → namespaced keys
  - 4 new RTL probe tests (Auth.i18n + BoardClaim.i18n + CliAuth.i18n + InviteLanding.i18n) covering 17 cases including pt-BR ↔ en-US toggle, Better Auth code mapping with {{email}} interpolation, Trans component for HTML interpolation (signed-in-as + ask-them-to-visit), brand-preserving 'Paperclip' literal
  - Rule 1 fixture-fix applied to pre-existing InviteLanding.test.tsx (wrapped in I18nextProvider + beforeAll/afterAll en-US locale pin) — 10th application of the pattern across milestone v1.1
  - <linkTo> non-void tag name pattern documented for future Trans HTML interpolation (avoids `<link>` collision with HTML void element which causes self-closing render emptying children)

affects: [09-04, 10-mensagens-agentes]

tech-stack:
  added: []
  patterns:
    - "Trans component <linkTo> non-void tag pattern: i18next Trans HTML interpolation with `<link>...</link>` tag name causes the placeholder `<a href=...>` to render as self-closing `<a></a>` (children stripped — `<link>` is treated as HTML void element by the parser regardless of attribute slot). Fix: rename the named tag to a non-void identifier like `<linkTo>` in BOTH the JSON template and the components map. Confirmed via debug repro test: `<a href='http://x'/>` placeholder + `<link>...</link>` template → `<a></a>Company Settings → Access` (text adjacent, not inside anchor); `<linkTo>...</linkTo>` template → `<a href='http://x'>Company Settings → Access</a>` (correct). Pattern applies to any Trans HTML interpolation — avoid HTML void element names (link, br, img, hr, input, meta) as Trans tag identifiers."
    - "AnyTFunction parameter for non-component helpers (mapInviteAuthFeedback): mirror translateApiError pattern — accept `TFunction<any, undefined>` so callers' useTranslation tuples (e.g. TFunction<['auth','common','errors'], undefined>) bind without per-call casts; internal permissive cast `t as unknown as (key: string, options?) => string` handles dynamic namespaced keys (`auth:invite.auth.${runtime-code}`) that strict typed-t() augmentation cannot statically prove. Pattern now established for any helper consuming dynamic dictionary lookups."
    - "typed-Trans i18nKey cast `i18nKey={'auth:...' as never}`: react-i18next Trans component's `i18nKey` prop inherits the strict typed-t() augmentation default-namespace constraint, rejecting dot-segmented namespaced keys like `auth:invite.field.signed-in-as`. Cast `as never` (rather than `as any`) preserves the union narrowing — TS treats it as compatible with the impossible-key intersection while still type-checking the surrounding JSX. Pattern reusable wherever Trans uses non-default-namespace keys."

key-files:
  created:
    - "ui/src/pages/__tests__/Auth.i18n.test.tsx — 5 tests (probe-component, pt-BR + en-US, sign_in/sign_up modes, Better Auth user-already-exists with {{email}})"
    - "ui/src/pages/__tests__/BoardClaim.i18n.test.tsx — 2 tests (board-claim.* full sub-tree pt-BR + en-US)"
    - "ui/src/pages/__tests__/CliAuth.i18n.test.tsx — 3 tests (cli-auth.* approve view + state titles + fields/access enum)"
    - "ui/src/pages/__tests__/InviteLanding.i18n.test.tsx — 7 tests (largest probe: header, agent form, inline auth, awaiting-approval Trans, Better Auth feedback, success states, brand-preserving)"
    - ".planning/phases/09-traducao-ui-admin-auth-sistemicas/09-02-SUMMARY.md"
  modified:
    - "ui/src/i18n/locales/pt-BR/auth.json — 0 → 132 leaf keys (was {} placeholder); 5 sub-trees: common (9), page (9), board-claim (15), cli-auth (29), invite (70 incl. auth.* + awaiting-approval.*)"
    - "ui/src/i18n/locales/en-US/auth.json — mirror 132 keys, full structural parity"
    - "ui/src/pages/Auth.tsx — 185 LOC, ~25 strings: useTranslation([auth, common, errors]); page titles + descriptions toggle by mode; field labels via auth:common; switch CTAs; submit button; mutation onError consumes translateApiError fallback to auth:page.auth-failed-fallback; validation via errors:validation.required-fields"
    - "ui/src/pages/BoardClaim.tsx — 126 LOC, ~20 strings: full claim flow translated (invalid-url, loading, unavailable with translateApiError, claimed, sign-in-required, claim CTA + pending state)"
    - "ui/src/pages/CliAuth.tsx — 185 LOC, ~28 strings: full CLI approval flow (loading, unavailable with translateApiError, approved/expired/cancelled state titles, sign-in-required, approve view with field labels + access enum + client-fallback + requires-instance-admin guard, approve/cancel CTAs); fixed `auth:cli-auth.cancel-cta` (added missing key)"
    - "ui/src/pages/InviteLanding.tsx — 828 LOC, ~75 strings: largest auth surface migrated; mapInviteAuthFeedback refactored (signature +t, codeMap → t calls); AwaitingJoinApprovalPanel as inner-component useTranslation (11th application); Trans for signed-in-as <strong> + ask-them-to-visit <linkTo>; brand-preserving 'Paperclip' literal; useMemo joinButtonLabel with [t] dep for locale reactivity"
    - "ui/src/pages/InviteLanding.test.tsx — Rule 1 fixture-fix (10th application): all 8 createRoot.render() calls wrapped in I18nextProvider + beforeAll/afterAll en-US locale pin; one assertion updated 'Checking your access...' → '…' (Unicode ellipsis canon)"

key-decisions:
  - "Better Auth code audit (Open Question #2 from RESEARCH) closed: only 2 codes are consumed client-side — USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL and INVALID_EMAIL_OR_PASSWORD (verified via grep `error.code === / err.code === / .code === ` across ui/src/). String-matched fallbacks (Request failed: 401, Request failed: 422) cover the 422-no-code path. errors:auth.* (Plan 09-03b) already covers all 4 paths. No additional codes added to errors.json."
  - "D-PITFALL7 honored — NOT extracting AuthForm shared component: InviteLanding.tsx has inline auth form duplicate of Auth.tsx (lines 657-784 in original; preserved in migration). Extracting shared component is out-of-scope refactor for this phase. Translation duplicated via shared keys auth:common.{name|email|password} avoids string duplication; component-level duplication remains."
  - "Trans <linkTo> rename (rather than `<link>`): debugged via isolated repro test — `<link>` is parsed as HTML void element by the i18next/Trans pipeline, causing the placeholder `<a href={url}/>` to render with empty children + adjacent text node `<a></a>Company Settings → Access`. Renaming to non-void `<linkTo>` fixes by avoiding the void-element collision. Established pattern: NEVER use HTML void element names (link, br, img, hr, input, meta, source, track, wbr, area, base, col, embed) as Trans component tag names."
  - "auth:invite.auth.* sub-sub-tree (5 keys: user-already-exists-info, invalid-email-or-password, request-failed-401, request-failed-422, fallback) lives under invite.* (not at top-level errors.* nor under errors:auth.*) because the messages are invite-specific copy ('Sign in below to continue with this invite' — extra context vs. generic auth errors:auth.user-already-exists). Plan 09-03b's errors:auth.* covers generic Better Auth fallbacks for non-invite contexts (Auth.tsx mutation onError); InviteLanding has its own contextualized variants. Both populated; component decides which to use."
  - "ellipsis canon: '…' (Unicode U+2026) chosen over '...' (3 ASCII dots) for consistency. RESEARCH-cited 'auth.json bootstrap' template uses '…' throughout. One pre-existing test assertion updated to match (rest of dictionary already converged via Phase 9-01 settings.json which uses '…')."
  - "InviteLanding.test.tsx fixture-fix Rule 1 (10th application across milestone v1.1): 8 createRoot.render() calls wrapped in <I18nextProvider i18n={i18n}> outermost + beforeAll/afterAll en-US locale pin. Tests are behavioral (mutation flows, mock auth APIs) not translation probes — but they assert visible English strings rendered by the component, which now go through t(). Without I18nextProvider, t() returns raw keys ('auth:invite.header-eyebrow' instead of 'You've been invited to join Paperclip'). Wrapping is mandatory whenever a t()-using component is rendered in a vitest test."

patterns-established:
  - "Trans <linkTo> non-void tag pattern (canonical for milestone v1.1): never use HTML void element names as Trans component tag identifiers — use semantic non-void names like <linkTo>, <emphasis>, <highlight>. Avoid <link>, <br>, <img>, <hr>, <input>, <meta>, <source>, <track>, <wbr>, <area>, <base>, <col>, <embed>."
  - "AnyTFunction parameter for non-component helpers consuming dynamic dictionary keys: mapInviteAuthFeedback signature `(error, authMode, email, t: AnyTFunction)` mirrors translateApiError. Pattern reusable for any helper that bridges runtime-discovered codes (Better Auth, server error.code, validation paths) to t() lookups. Combined with internal permissive cast `t as unknown as (key: string, options?) => string`, preserves callsite type safety while accepting tuple-typed TFunction from any useTranslation declaration."
  - "Typed-Trans i18nKey cast `as never`: when Trans uses non-default-namespace keys, cast i18nKey to `never` (not `any`) to bypass strict typed-t() augmentation while preserving surrounding type safety."
  - "Inner-component useTranslation 11th application: AwaitingJoinApprovalPanel owns its own hook rather than receiving t as prop. Pattern fully canonical across v1.1; any leaf component with 2+ translated strings should consume its own hook."
  - "Brand-preserving interpolation reaffirmed (Plan 9-02 5th instance): 'Paperclip' stays literal in i18next templates (header-eyebrow, sign-in-title, sign-up-title, company-fallback, invited-by-fallback, agent-form-description). RTL probe asserts identical brand output across locales."
  - "Rule 1 fixture-fix 10th application: any pre-existing test rendering a t()-using component must be wrapped in I18nextProvider + beforeAll en-US pin. Atomic with the migration commit when feasible (here landed in same commit as InviteLanding.tsx migration since the test breakage was discovered when running the migrated component)."

requirements-completed: [UI-06]

duration: ~19min
completed: 2026-04-26
---

# Phase 9 Plan 02: Auth Forms Translation Summary

**4 auth pages (~1324 LOC across Auth.tsx + BoardClaim.tsx + CliAuth.tsx + InviteLanding.tsx) migrated to react-i18next with auth.json populated from `{}` placeholder to 132 leaf keys covering 5 sub-trees (common, page, board-claim, cli-auth, invite); mapInviteAuthFeedback refactored to consume errors:auth.* + auth:invite.auth.* via runtime code map; 4 new RTL probe tests (17 cases) covering pt-BR ↔ en-US toggle, Better Auth code mapping with {{email}} interpolation, Trans component HTML interpolation (signed-in-as + ask-them-to-visit), brand-preserving 'Paperclip' literal; Rule 1 fixture-fix applied to pre-existing InviteLanding.test.tsx; full UI suite 680/680 GREEN with +18 new tests.**

## Performance

- **Duration:** ~19 min
- **Started:** 2026-04-26T23:18:41Z
- **Completed:** 2026-04-26T23:38:02Z
- **Tasks:** 4 (3 implementation + 1 verification/SUMMARY)
- **Files created:** 5 (4 RTL probe tests + this SUMMARY)
- **Files modified:** 5 (2 dictionaries populated + 4 TSX pages migrated + 1 test fixture-fix)

## Accomplishments

- **auth.json populated (Task 1):** pt-BR + en-US (132 leaf keys, parity 100%) from `{}` placeholder to 5 sub-trees: `common` (9 keys — sign-in/sign-up/create-account/working/loading/name/email/password/open-board), `page` (9 keys — Auth.tsx unified sign-in/sign-up titles + descriptions + switch CTAs + auth-failed-fallback), `board-claim` (15 keys — full claim challenge flow), `cli-auth` (29 keys — CLI approval flow with field/access sub-sub-trees + state titles), `invite` (70 keys — largest sub-tree with field/auth/awaiting-approval sub-sub-trees). Brand-preserving "Paperclip" literal across all sub-trees.
- **3 of 4 auth pages migrated (Task 2):** Auth.tsx (185 LOC, ~25 strings), BoardClaim.tsx (126 LOC, ~20 strings), CliAuth.tsx (185 LOC, ~28 strings). All mutation/query error paths route through translateApiError (from Plan 09-03b). 3 new RTL probe tests with 10 cases.
- **InviteLanding.tsx migrated (Task 3) — largest auth surface:** 828 LOC, ~75 strings. mapInviteAuthFeedback refactored: signature `+t: AnyTFunction`; Better Auth codes (USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL, INVALID_EMAIL_OR_PASSWORD) and Request failed: 401/422 string matches mapped via codeMap → `t("auth:invite.auth.{key}", { email })`. AwaitingJoinApprovalPanel inner-component useTranslation (11th application). Trans component for `signed-in-as <strong>` + `ask-them-to-visit <linkTo>` HTML interpolation. 1 new RTL probe test with 7 cases.
- **Better Auth code audit (Open Question #2 from RESEARCH) closed:** only 2 codes consumed client-side (USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL + INVALID_EMAIL_OR_PASSWORD). String fallbacks (`Request failed: 401/422`) cover the no-code paths. errors:auth.* sub-tree from Plan 09-03b sufficient; no additional codes needed.
- **Trans `<linkTo>` non-void tag pattern established:** debugged via isolated repro test that `<link>` causes self-closing render in i18next Trans (HTML void element collision). Renaming to `<linkTo>` fixes. Documented as canonical pattern for milestone v1.1.
- **Rule 1 fixture-fix 10th application:** InviteLanding.test.tsx (8 createRoot.render() calls wrapped in I18nextProvider + beforeAll/afterAll en-US pin); one assertion updated `Checking your access...` → `…` (Unicode ellipsis canon).
- **Verification:** Full UI suite **680/680 GREEN** (was 662 baseline; +18 new tests = 17 i18n probe cases + 1 fixture re-enabled); CI=true missing-keys vitest GREEN (132 + previous keys, 100% pt-BR ↔ en-US parity); pnpm --filter @paperclipai/ui typecheck preserves only pre-existing `ActivityRow.tsx:42` error (master-reproduced, out-of-scope per Boundary, documented across multiple SUMMARYs); zero residual hardcoded English strings in 4 auth pages (verified via grep).

## Task Commits

1. **Task 1: auth.json populated** — `aedef61` (feat — 132 leaf keys × 2 locales; structural parity verified)
2. **Task 2: Auth + BoardClaim + CliAuth migrated + 3 RTL tests** — `bc59fb4` (feat — 3 of 4 auth pages t()-driven; 10 i18n test cases)
3. **Task 3: InviteLanding migrated + mapInviteAuthFeedback rewrite + 1 RTL test + InviteLanding.test fixture-fix** — `44ea87f` (feat — largest auth surface; Trans <linkTo> pattern; 10th fixture-fix application)
4. **Task 4: SUMMARY + STATE/ROADMAP/REQUIREMENTS update** — final docs commit (this file)

## Better Auth Code Mapping (Open Question #2 Resolution)

| Code / Path | Source | Mapped to |
|---|---|---|
| USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL | Better Auth signUp 422 with code | `auth:invite.auth.user-already-exists-info` (invite context) / `errors:auth.user-already-exists` (general Auth.tsx, via translateApiError) |
| INVALID_EMAIL_OR_PASSWORD | Better Auth signIn 401 with code | `auth:invite.auth.invalid-email-or-password` (invite context) / `errors:auth.invalid-email-or-password` (general) |
| Request failed: 401 (sign_in path, no code) | fetch fallback | `auth:invite.auth.request-failed-401` (invite context) / `errors:auth.request-failed-401` (general) |
| Request failed: 422 (sign_up path, no code) | fetch fallback | `auth:invite.auth.request-failed-422` (invite context) / `errors:auth.request-failed-422` (general) |

No other Better Auth error codes consumed client-side (verified via `grep "error.code === / err.code === / .code === " ui/src/`).

## auth.json Structure

| Sub-tree | Leaf keys | Coverage |
|---|---|---|
| `common.*` | 9 | Shared field labels (name/email/password) + sign-in/sign-up/create-account + working/loading + open-board |
| `page.*` | 9 | Auth.tsx unified sign-in/sign-up: titles, descriptions, switch CTAs (×4), auth-failed-fallback |
| `board-claim.*` | 15 | Invalid-url, loading, challenge-unavailable (title + fallback), claimed (title + description), sign-in-required (title + description + cta), claim (title + description + cta + pending), claim-failed-fallback |
| `cli-auth.*` | 29 | Invalid-url, loading, challenge states (unavailable/approved/expired/cancelled), command-label, sign-in-required (title + description + cta), approve view (title + description + 4 field labels + 2 access values + client-fallback + requires-instance-admin), CTAs (approve/approving/cancel/cancelling), update-failed-fallback |
| `invite.*` | 70 | Status messages (invalid-token/loading/checking-access/not-available + 3 description variants), bootstrap-complete + joined, header (eyebrow + bootstrap + join with {{companyName}}), 6 field labels + 3 fallbacks, agent form (title + description with {{companyName}} + 3 field labels + coming-soon-suffix), 5 CTAs (submit/accept/continue/submit-create/submit-sign-in), inline auth (title + description × 2 modes + mode toggle CTAs + tail copy × 2), auto-accept (title + description with {{companyName}}), accept-bootstrap-title + accept-company-title + already-member with {{companyName}} + this-will-bootstrap + this-will-join, submitting-request + finishing-signin, fail/error fallbacks (4), `auth.*` sub-sub-tree (5 keys for Better Auth code mapping with {{email}} interpolation), `awaiting-approval.*` sub-sub-tree (10 keys with {{companyName}} + {{approver}} interpolation + Trans <linkTo> + claim-secret + onboarding) |

## Decisions Made

**Open Question #2 (Better Auth code audit):** closed — only 2 codes (see table above).

**D-PITFALL7 (no AuthForm shared component):** honored — translation duplicated via shared `auth:common.*` keys; refactor deferred to v2.

**Trans `<linkTo>` rename:** mandatory pattern for v1.1 — never use HTML void element names as Trans tag identifiers.

**`auth:invite.auth.*` namespace placement:** invite-specific contextualized error variants live under invite (not at errors:auth.*) because copy includes invite context ("Sign in below to continue with this invite" vs. generic). Plan 09-03b's `errors:auth.*` covers generic Auth.tsx Better Auth fallbacks.

**Ellipsis canon:** `…` (Unicode U+2026) over `...` (3 ASCII dots).

## Deviations from Plan

**Regra 1 — Trans `<link>` self-closing rendering bug:** isolated repro test confirmed `<link>` (HTML void element) causes Trans to render `<a href=...></a>Company Settings → Access` (empty anchor + adjacent text). Fix: rename to `<linkTo>` in BOTH JSON template (pt-BR + en-US ask-them-to-visit) and components map. Folded into Task 3 commit. Tracked.

**Regra 1 — InviteLanding.test.tsx fixture-fix (10th application):** pre-existing test rendered InviteLandingPage without I18nextProvider; after migration component called t() returning raw keys instead of strings, breaking 6 of 8 assertions. Fix: wrap all 8 createRoot.render() calls in I18nextProvider + beforeAll/afterAll en-US locale pin. One assertion updated for ellipsis canon (`...` → `…`). Folded into Task 3 commit (atomic with InviteLanding.tsx migration).

**Regra 1 — typed-Trans i18nKey cast:** strict typed-t() augmentation rejected `i18nKey="auth:invite.field.signed-in-as"` (not in default namespace `common`). Fix: cast `as never` in 4 occurrences (2 production InviteLanding.tsx + 2 probe test). Pattern documented as canonical for any Trans usage with non-default-namespace keys.

**Regra 2 — added missing `auth:cli-auth.cancel-cta` key:** RESEARCH bootstrap template did not include `cancel-cta` (only `cancelling`); but the original CliAuth.tsx had two distinct strings — "Cancelling..." (pending state) and "Cancel" (CTA label). Added `cancel-cta: "Cancelar"/"Cancel"` to both locales. Bootstrap-template gap.

**Regra 2 — added missing `auth:cli-auth.sign-in-required-*` + `auth:cli-auth.challenge-unavailable-fallback`:** RESEARCH bootstrap omitted these keys but CliAuth.tsx has a sign-in-required guard (lines 104-117 original) and challenge-unavailable fallback message. Added 4 keys to both locales (sign-in-required-title + sign-in-required-description + sign-in-cta + challenge-unavailable-fallback). Bootstrap-template gap.

**Regra 2 — added `auth:invite.accept-bootstrap-title` / `accept-company-title` / `accept-failed-fallback` / `checking-access-error` / `already-belongs` / `invite-not-found`:** RESEARCH bootstrap omitted runtime-state strings used by mutation onError + acceptMutation guards. Added 6 keys to both locales. Bootstrap-template gap.

No Rule 4 (architectural) deviations.

## Issues Encountered

- **`<link>` HTML void element collision in Trans:** debugged via isolated repro test (now removed). Solution: `<linkTo>` non-void tag name. Documented as canonical pattern.
- **Pre-existing TS error `ui/src/components/ActivityRow.tsx:42`** (`Property 'length' does not exist on type 'never'`) — confirmed pre-existing across 09-01, 09-03b SUMMARYs. Out-of-scope per Boundary rule.
- **Trailing LF→CRLF warnings** during git add (Windows + .gitattributes default). Cosmetic; no functional impact.

## Self-Check: PASSED

- ✅ `ui/src/i18n/locales/pt-BR/auth.json` — 132 leaf keys (was `{}`), 5 sub-trees populated
- ✅ `ui/src/i18n/locales/en-US/auth.json` — 132 leaf keys, 100% structural parity (verified via leaf-key set diff: 0 pt-only, 0 en-only)
- ✅ `ui/src/pages/Auth.tsx` modified — useTranslation([auth, common, errors]); zero hardcoded visible English
- ✅ `ui/src/pages/BoardClaim.tsx` modified — useTranslation; full board-claim flow t()-driven
- ✅ `ui/src/pages/CliAuth.tsx` modified — useTranslation; full CLI approval flow t()-driven
- ✅ `ui/src/pages/InviteLanding.tsx` modified — useTranslation; mapInviteAuthFeedback t-aware; AwaitingJoinApprovalPanel inner-component; Trans for HTML interpolation (signed-in-as + ask-them-to-visit)
- ✅ `ui/src/pages/__tests__/Auth.i18n.test.tsx` created (5 tests, all GREEN)
- ✅ `ui/src/pages/__tests__/BoardClaim.i18n.test.tsx` created (2 tests, all GREEN)
- ✅ `ui/src/pages/__tests__/CliAuth.i18n.test.tsx` created (3 tests, all GREEN)
- ✅ `ui/src/pages/__tests__/InviteLanding.i18n.test.tsx` created (7 tests, all GREEN)
- ✅ `ui/src/pages/InviteLanding.test.tsx` modified — Rule 1 fixture-fix; 8/8 pre-existing tests GREEN
- ✅ Commits in log: `aedef61`, `bc59fb4`, `44ea87f`
- ✅ Full UI suite **680/680 GREEN** (vitest run)
- ✅ CI=true missing-keys detector exit 0 (parity preserved)
- ✅ UI typecheck preserves only pre-existing ActivityRow.tsx:42 error (master-reproduced, out-of-scope per Boundary)
- ✅ Zero hardcoded English visible strings in 4 auth pages (spot grep: 0 matches outside variables/brand/testids/className)
- ✅ Brand-preserving "Paperclip" literal across all sub-trees (probe tests assert identical output across locales)

## Manual Configuration Required

None — pure UI translation; no service/infrastructure changes.

## Readiness for Next Phases

**Plan 09-04 (Tooltips/empty states/modais/toasts — UI-08) destravado.** Pre-conditions met:
- All auth surfaces (Auth, BoardClaim, CliAuth, InviteLanding) consume `useTranslation` consistently — no auth-page churn for 09-04 cross-cutting tooltip/toast layer
- translateApiError available for any onError handler 09-04 may add
- Trans component pattern documented (`<linkTo>` non-void) for any modal/tooltip needing HTML interpolation

**Phase 10 (Mensagens dos Agentes) destravada para auth context handoff:** activity log entries from auth flows (claim_secret, join_request) already use translated key paths from Plan 08-05 (actionKey/paramsJson schema); no auth-side coupling.

**v2 backlog signal:** AuthForm shared component extraction (D-PITFALL7) — both Auth.tsx and InviteLanding.tsx have inline auth duplicated; refactor would consolidate ~120 LOC. Defer until 2-3 additional auth surfaces emerge or Better Auth UI components are customized.

---
*Fase: 09-traducao-ui-admin-auth-sistemicas*
*Concluída: 2026-04-26*
