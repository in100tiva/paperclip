---
phase: 07-foundation-i18n-toggle-de-settings
plan: 05
subsystem: ui-i18n-toggle
tags: [react, i18next, react-i18next, tanstack-query, optimistic-mutation, vitest, testing-library, profile-settings, locale]

requires:
  - phase: 07-01
    provides: "ProfileSettings.locale-toggle.test.tsx Wave 0 RED test (SETTINGS-01 + SETTINGS-04)"
  - phase: 07-02
    provides: "currentUserProfileSchema.locale required + UpdateCurrentUserProfile.locale + Locale type from @paperclipai/shared"
  - phase: 07-03
    provides: "ui/src/i18n/index.ts default i18next singleton + 8 namespaces + en-US fallback"
  - phase: 07-04
    provides: "PATCH /api/auth/profile round-trips locale; req.locale wired server-side via 3-tier fallback"
provides:
  - I18nextProvider mounted in main.tsx between QueryClientProvider and ThemeProvider (Pitfall 5 satisfied)
  - ProfileSettings Language section with 2 radios (pt-BR / en-US) labeled via t("settings:language.*")
  - Optimistic locale mutation with await i18n.changeLanguage(newLocale) BEFORE queryClient.setQueryData (Pitfall 3 satisfied)
  - Session-driven hydration of i18n.language from session.user.locale on first session load
  - Rollback path on error reverts both i18n.language and invalidates session query
  - Last Wave 0 UI test ProfileSettings.locale-toggle.test.tsx 2/2 GREEN — closes the validation contract
  - 07-HUMAN-UAT.md artifact persisted (UAT-07-01 + UAT-07-02 deferred as pending HUMAN-UAT per project precedent)
affects:
  - phase-08 (Tradução UI Core consumes I18nextProvider mounted here; useTranslation() now usable from any descendant)
  - phase-09 (Tradução UI Admin + Auth + Sistêmicas; same provider tree)
  - phase-10 (Mensagens dos Agentes; locale already propagated to server via Plan 04)
  - phase-11 (Skills + System Prompts; user.locale persisted by Plan 02 + this plan's hydration loop)

tech-stack:
  added:
    - "@testing-library/react (devDependency for ui workspace — needed by Wave 0 ProfileSettings.locale-toggle.test.tsx)"
    - "@testing-library/jest-dom (devDependency — toBeInTheDocument matcher)"
    - "@testing-library/user-event (devDependency — radio click simulation)"
  patterns:
    - "Provider tree ordering: QueryClientProvider > I18nextProvider > ThemeProvider > BrowserRouter > … (Pitfall 5 — I18nextProvider above any useTranslation() consumer; inside QC so mutations can use both useQueryClient and useTranslation)"
    - "Optimistic mutation invariant (Pitfall 3): await i18n.changeLanguage(newLocale) MUST precede queryClient.setQueryData inside onMutate; rollback context = { previous: i18n.language as Locale }"
    - "Session-driven i18n.language hydration: useEffect watching sessionQuery.data calls i18n.changeLanguage(session.user.locale) only when locale differs (avoid render loop)"
    - "Radio accessibility: <label><input type='radio'/><span>{t(label)}</span></label> — wrap input in label so getByRole('radio', { name: /…/ }) resolves accessible name from t() output"

key-files:
  created:
    - ".planning/phases/07-foundation-i18n-toggle-de-settings/07-HUMAN-UAT.md"
  modified:
    - "ui/src/main.tsx"
    - "ui/src/pages/ProfileSettings.tsx"
    - "ui/package.json (testing-library devDependencies)"
    - "packages/shared (barrel re-exports for Locale type — see Deviation 2)"

key-decisions:
  - "HUMAN-UAT artifact persisted with status: pending (not status: passed) — UAT-07-01 / UAT-07-02 require human-in-the-loop browser session that is not in scope for autonomous executor; defers to project precedent established by Phases 3-6 (complete-with-pending-UAT closure pattern)."
  - "Phase 7 closes as complete-with-pending-UAT — automated Wave 0 contract is fully GREEN (5 test files, 12 assertions covering SETTINGS-01..04 + I18N-01..05 at code level); human visual/perceptual UAT deferred to operator on real browser per Phase 3-6 precedent."
  - "I18nextProvider mounted INSIDE QueryClientProvider (not above): this allows ProfileSettings useMutation onMutate to call both useQueryClient() (for setQueryData rollback) and useTranslation() (i18n instance) without prop drilling."
  - "session.user.locale takes precedence over i18n.language for radio checked state — sessionQuery.data is the single source of truth post-hydration; i18n.language is only the fallback before session loads."

patterns-established:
  - "Pitfall 3 enforcement: await i18n.changeLanguage(newLocale) precedes queryClient.setQueryData in optimistic onMutate — verified by grep ordering in acceptance criteria"
  - "Pitfall 5 enforcement: I18nextProvider position in tree (above ThemeProvider, below QueryClientProvider) verified by grep line-number ordering"
  - "HUMAN-UAT routing: when UAT requires browser-in-the-loop or perceptual judgment, persist artifact with status: pending and document deferred items; framework precedent (Phases 3, 4, 5, 6) established for closure as complete-with-pending-UAT"

requirements-completed:
  - SETTINGS-01  # automated: ProfileSettings.locale-toggle.test.tsx 2/2 GREEN; HUMAN-UAT-07-01 deferred (status: pending)
  - SETTINGS-03  # already Complete from Plan 02 (default 'pt-BR' DDL) + Plan 04 (server fallback chain); reaffirmed by hydration logic
  - SETTINGS-04  # automated: ProfileSettings.locale-toggle.test.tsx 2/2 GREEN; HUMAN-UAT-07-01 deferred (status: pending)

duration: ~18min
completed: 2026-04-26
---

# Phase 07 Plan 05: I18nextProvider Wiring + ProfileSettings Language Toggle

**I18nextProvider wired in main.tsx; ProfileSettings Language toggle with optimistic locale mutation, session-driven hydration, and Pitfall 3 ordering; UAT-07-01 / UAT-07-02 deferred as pending HUMAN-UAT per project precedent.**

## Performance

- **Duration:** ~18 min (executor wall-clock — across 3 task commits)
- **Started:** 2026-04-26 (Task 1)
- **Completed:** 2026-04-26 (Task 3 artifact created; HUMAN-UAT deferred for human operator)
- **Tasks:** 3 / 3 (Task 3 closed via artifact creation; UAT execution deferred)
- **Files modified:** 2 (`ui/src/main.tsx`, `ui/src/pages/ProfileSettings.tsx`)
- **Files created:** 1 (`07-HUMAN-UAT.md`)

## Accomplishments

- `ui/src/main.tsx`: Side-effect import `./i18n` triggers i18next.init at module load. `<I18nextProvider i18n={i18n}>` wraps `<ThemeProvider>` and everything below, sitting inside `<QueryClientProvider>` (Pitfall 5 — i18n provider above any `useTranslation()` consumer; below QC so mutations can use both `useQueryClient` and `useTranslation`).
- `ui/src/pages/ProfileSettings.tsx`: New Language section rendered below the existing profile form with two radios (`pt-BR` / `en-US`), labeled via `t("settings:language.title")`, `t("settings:language.description")`, `t("settings:language.pt-br")`, `t("settings:language.en-us")`.
- Optimistic locale mutation in `updateLocaleMutation`: `onMutate` first awaits `i18n.changeLanguage(newLocale)`, THEN calls `queryClient.setQueryData<AuthSession | null>(queryKeys.auth.session, …)` to optimistically update the session cache (Pitfall 3 ordering). Returns `{ previous: i18n.language as Locale }` for rollback on error.
- `onError` rolls back via `void i18n.changeLanguage(ctx.previous)` and invalidates `queryKeys.auth.session`; `onSuccess` calls `syncSessionProfile(profile)` so the canonical session shape stays consistent with the server response.
- Session-driven hydration: existing `useEffect` watching `sessionQuery.data` extended to call `i18n.changeLanguage(userLocale)` only when `i18n.language !== userLocale` — avoids render loops while still hydrating from persisted preference on first session load (returning user sees saved locale, not the default).
- Wave 0 UI test `ui/src/pages/__tests__/ProfileSettings.locale-toggle.test.tsx` flips RED → GREEN: 2/2 (SETTINGS-01 radio render + SETTINGS-04 click triggers `i18n.changeLanguage('en-US')` AND `authApi.updateProfile({ locale: 'en-US', … })`).
- Full UI vitest suite **637 / 637 GREEN** post-changes (zero regression across the entire `@paperclipai/ui` workspace).
- `pnpm -r typecheck` exit 0; `pnpm --filter @paperclipai/ui build` exit 0.
- `07-HUMAN-UAT.md` artifact persisted (frontmatter `type: human-uat`, `status: pending`, `requirements: [SETTINGS-01, SETTINGS-03, SETTINGS-04]`) with full UAT-07-01 (hot-swap + persistence cross-reload + cross-logout/login) and UAT-07-02 (default pt-BR for new user) procedures.

## Task Commits

1. **Task 1: Wire I18nextProvider into ui/src/main.tsx (+ install testing-library deps)** — `151d5ba` (feat)
2. **Task 2: ProfileSettings — Language section + optimistic locale toggle + session hydration** — `84d909c` (feat)
3. **Task 3: HUMAN-UAT artifact persisted (deferred to human operator)** — `6a8a16b` (docs)

**Plan metadata commit:** _this commit_ (docs: complete plan with pending UAT)

## Files Created/Modified

- `ui/src/main.tsx` — Added side-effect import `./i18n` (triggers i18next init at module load) + `import { I18nextProvider } from "react-i18next"` + `import i18n from "./i18n"`; wrapped `<ThemeProvider>` with `<I18nextProvider i18n={i18n}>` directly inside `<QueryClientProvider>`. All other providers retained their relative order.
- `ui/src/pages/ProfileSettings.tsx` — Added imports (`useTranslation` from `react-i18next`, `Locale` type from `@paperclipai/shared`); added `const { t, i18n } = useTranslation();` near other hooks; added `updateLocaleMutation` (useMutation) after existing `removeAvatarMutation` with optimistic onMutate/onError/onSuccess wired per Pitfall 3 ordering; extended existing `useEffect(…, [sessionQuery.data, i18n])` with session-locale hydration branch; rendered new `<section>` with heading + description + `<fieldset>` containing two `<label><input type="radio" name="locale" value="…"/><span>{t(…)}</span></label>` rows.
- `ui/package.json` — Added devDependencies: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` (Wave 0 test was specified before Plan 03 had these deps in place; Rule 3 install).
- `packages/shared/src/index.ts` (or barrel equivalent) — Added re-exports for `Locale` type so `import type { Locale } from "@paperclipai/shared"` resolves cleanly in UI (Rule 3 — was previously only nested under validators path).
- `.planning/phases/07-foundation-i18n-toggle-de-settings/07-HUMAN-UAT.md` — New 130-line artifact documenting UAT-07-01 + UAT-07-02 with pre-conditions, step-by-step procedures, pass/fail dimension tables, and reporting protocol. Frontmatter follows precedent from 06-HUMAN-UAT.md (Phase 6 closure).

## Decisões Tomadas

- **HUMAN-UAT deferral as Phase 7 closure model:** Following the precedent of Phase 3 (TEAM-04), Phase 4 (SPIKE-04/05), Phase 5 (UAT-05-01) and Phase 6 (UAT-06-01) — when validation requires real browser session + human perceptual judgment (hot-swap visible to the eye, no flicker of raw `ns:key` strings, persistence felt across logout/login), the executor persists the UAT artifact with `status: pending` and routes the phase closure to `complete-with-pending-UAT`. This avoids fabricating validation that cannot be honestly automated, while still capturing every requirement (SETTINGS-01 + SETTINGS-04) under an automated Wave 0 test that passes at the code level.
- **I18nextProvider position INSIDE QueryClientProvider (not outside):** the i18n provider does not need to wrap QC — it only needs to wrap any `useTranslation()` consumer. Placing it inside QC keeps mutations in `ProfileSettings` able to call both `useQueryClient()` (for `setQueryData` rollback) and `useTranslation()` (for `i18n.changeLanguage`) without prop drilling. Pitfall 5 satisfied.
- **Pitfall 3 ordering enforced (`await changeLanguage` before `setQueryData`):** if the order were inverted, a fast user clicking before the i18n promise resolved would briefly see UI strings still in the old locale while session.user.locale already says the new one — visible flicker. Awaiting first guarantees the t() output is already in newLocale before React re-renders from the cache update.
- **session.user.locale > i18n.language for radio `checked` state:** during early mount before sessionQuery resolves, `i18n.language` is the fallback (default `pt-BR`). Once session data arrives, the hydration effect synchronizes both, and the radio checked condition `(sessionQuery.data?.user.locale ?? i18n.language) === "pt-BR"` makes the persisted preference authoritative.

## Desvios do Plano

### Problemas Corrigidos Automaticamente

**1. [Regra 3 - Bloqueador] testing-library devDependencies missing in ui workspace**
- **Encontrado durante:** Task 2 (running Wave 0 test `ProfileSettings.locale-toggle.test.tsx`)
- **Problema:** Wave 0 test (Plan 01) imports `render`, `screen`, `userEvent` from `@testing-library/react` and `@testing-library/user-event`, plus `toBeInTheDocument` from `@testing-library/jest-dom`. None of these were in `ui/package.json` devDependencies — Plan 01 wrote the test, Plan 03 installed `i18next`+`react-i18next` only. Test could not even compile.
- **Correção:** Added `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` to `ui/package.json` devDependencies; `pnpm install` resolved the workspace. Folded into Task 1 commit (`151d5ba`) since the testing-library presence is a precondition for verifying Task 1's I18nextProvider wiring via integration test.
- **Arquivos modificados:** `ui/package.json`, `pnpm-lock.yaml`
- **Verificação:** `pnpm --filter @paperclipai/ui test:run -- ProfileSettings.locale-toggle` compiles cleanly post-install; 2/2 GREEN after Task 2.
- **Comitado em:** `151d5ba` (Task 1)

**2. [Regra 3 - Bloqueador] `Locale` type not re-exported from `@paperclipai/shared` barrel**
- **Encontrado durante:** Task 2 (`import type { Locale } from "@paperclipai/shared"` resolved as `unknown` / typescript error)
- **Problema:** Plan 02 added `localeSchema` and `Locale` type in `packages/shared/src/validators/access.ts` but they were not re-exported from the package barrel (`packages/shared/src/index.ts`). The plan instructed `import type { Locale } from "@paperclipai/shared"` — that import path was unresolvable until the barrel exposed it.
- **Correção:** Added `export type { Locale } from "./validators/access"` (and `export { localeSchema }`) to the shared barrel so the public surface includes the type. Folded into Task 2 commit (`84d909c`).
- **Arquivos modificados:** `packages/shared/src/index.ts`
- **Verificação:** `pnpm -r typecheck` exit 0 post-fix; `import type { Locale } from "@paperclipai/shared"` resolves to the literal union `"pt-BR" | "en-US"` in `ProfileSettings.tsx`.
- **Comitado em:** `84d909c` (Task 2)

**3. [Regra 3 - Bloqueador] Wave 0 test missing render wrappers (QueryClient + I18nextProvider)**
- **Encontrado durante:** Task 2 (Wave 0 test threw "no QueryClient set" / "no i18n instance" at first run)
- **Problema:** The Wave 0 test from Plan 01 used a bare `render(<ProfileSettings />)` without wrapping in QueryClientProvider or I18nextProvider — but `ProfileSettings` calls `useQueryClient()` and `useTranslation()`. Test could not run as written.
- **Correção:** Updated the test's `renderProfileSettings()` helper (or added one) to wrap in `<QueryClientProvider>` (with a fresh `QueryClient`) and `<I18nextProvider i18n={i18n}>` matching production. Test still asserts the same behavior contract from the plan (radios present, click triggers `i18n.changeLanguage('en-US')` + `authApi.updateProfile({ locale: 'en-US', … })`). Folded into Task 2 commit.
- **Arquivos modificados:** `ui/src/pages/__tests__/ProfileSettings.locale-toggle.test.tsx`
- **Verificação:** 2/2 GREEN; full UI suite 637/637 GREEN (no regression to existing tests by introducing the fresh QC).
- **Comitado em:** `84d909c` (Task 2)

---

**Total de desvios:** 3 corrigidos automaticamente (3× Regra 3 — todos bloqueadores de execução, não mudanças de escopo)
**Impacto no plano:** Todos os desvios foram pré-condições ausentes para que o plano executasse como escrito (deps de teste, re-exports de tipo, render wrappers). Nenhuma mudança de comportamento ou escopo. O contrato do plano (I18nextProvider mounted, ProfileSettings toggle wired, Wave 0 test GREEN) foi atendido na íntegra.

## Problemas Encontrados

- **HUMAN-UAT execution out-of-scope for autonomous executor:** UAT-07-01 (hot-swap + cross-reload/cross-session persistence) and UAT-07-02 (new-user default pt-BR) require a real browser session, fresh user signup capability, and human perceptual judgment about flicker/instant-update visual quality. The executor persisted the artifact with full procedures and `status: pending`; the project precedent (Phases 3-6) routes such cases to `complete-with-pending-UAT` rather than fabricating validation. The UAT remains queued for the operator.

## Configuração Manual Necessária

**HUMAN-UAT execution required to flip Phase 7 closure status from `complete-with-pending-UAT` to `complete`.** See [`07-HUMAN-UAT.md`](./07-HUMAN-UAT.md) for:
- UAT-07-01 procedure (13 steps): hot-swap + persistence cross-reload + cross-logout/login
- UAT-07-02 procedure (4 steps): default pt-BR for newly signed-up user
- Pass/fail dimension tables for objective reporting
- Resume signal protocol: type `aprovado` if both pass; otherwise document failures and route to `/planejar-fase 07 --gaps`

No code-level setup required (no env vars, no migrations, no external services).

## Self-Check

Verificado:
- Files created exist:
  - FOUND: `.planning/phases/07-foundation-i18n-toggle-de-settings/07-HUMAN-UAT.md` (130 lines, frontmatter `type: human-uat status: pending`)
- Files modified contain expected content:
  - `grep 'import { I18nextProvider } from "react-i18next"' ui/src/main.tsx` → match
  - `grep 'import i18n from "./i18n"' ui/src/main.tsx` → match
  - `grep '<I18nextProvider i18n={i18n}>' ui/src/main.tsx` → match
  - `grep 'useTranslation()' ui/src/pages/ProfileSettings.tsx` → match
  - `grep 'updateLocaleMutation' ui/src/pages/ProfileSettings.tsx` → match
  - `grep 'await i18n.changeLanguage(newLocale)' ui/src/pages/ProfileSettings.tsx` → match (Pitfall 3)
  - `grep 'i18n.changeLanguage(userLocale)' ui/src/pages/ProfileSettings.tsx` → match (hydration)
  - Line ordering verified: `await i18n.changeLanguage(newLocale)` precedes `queryClient.setQueryData` inside onMutate
- Commits exist in git log:
  - FOUND: `151d5ba` (feat 07-05 Task 1 — wire I18nextProvider + testing-library deps)
  - FOUND: `84d909c` (feat 07-05 Task 2 — ProfileSettings Language section + optimistic toggle + hydration)
  - FOUND: `6a8a16b` (docs 07-05 Task 3 — 07-HUMAN-UAT.md persisted)
- Build & typecheck:
  - `pnpm --filter @paperclipai/ui build` → exit 0
  - `pnpm -r typecheck` → exit 0
- Wave 0 UI test:
  - `pnpm --filter @paperclipai/ui test:run -- ProfileSettings.locale-toggle` → 2/2 GREEN (SETTINGS-01 + SETTINGS-04 closed at code level)
- Full UI suite regression:
  - `pnpm --filter @paperclipai/ui test:run` → 637/637 GREEN (zero regression)
- HUMAN-UAT artifact integrity:
  - Frontmatter contains `type: human-uat`, `status: pending`, `requirements: [SETTINGS-01, SETTINGS-03, SETTINGS-04]`
  - Body contains both `## UAT-07-01` and `## UAT-07-02` headings
  - Pass/fail dimension tables present for both UATs

## Self-Check: PASSED

## Next Phase Readiness

**Phase 7 closes as `complete-with-pending-UAT`** (precedent: Phases 3, 4, 5, 6).

**Wave 0 RED → GREEN status fully resolved at code level:**
- ✅ `init.test.ts` — GREEN (Plan 03)
- ✅ `missing-keys.test.ts` — GREEN (Plan 03 — CI=true mode covered I18N-04)
- ✅ `auth-routes-locale.test.ts` — GREEN (Plan 04 — SETTINGS-02 + SETTINGS-03 server-side)
- ✅ `middleware-locale.test.ts` — GREEN (Plan 04 — I18N-05)
- ✅ `ProfileSettings.locale-toggle.test.tsx` — GREEN (this plan — SETTINGS-01 + SETTINGS-04 UI-side)

**Phase 7 requirements coverage:**
- SETTINGS-01 — automated GREEN; HUMAN-UAT-07-01 deferred (status: pending)
- SETTINGS-02 — Complete (Plan 02 + Plan 04)
- SETTINGS-03 — Complete (Plan 02 DDL + Plan 04 fallback chain + this plan's hydration loop)
- SETTINGS-04 — automated GREEN; HUMAN-UAT-07-01 deferred (status: pending)
- I18N-01..05 — Complete (Plans 01, 03, 04)

**Phase 8 (Tradução UI Core) preconditions all met:**
- I18nextProvider mounted globally — any descendant can call `useTranslation()` without prop drilling
- 8 namespaces ready (`common`, `inbox`, `projects`, `settings`, `auth`, `agents`, `errors`, `activity`) with pt-BR/en-US bootstrap dictionaries
- Missing-keys detector wired in CI mode — Phase 8 strings added to namespaces will be enforced
- session.user.locale fully round-trips DB → server → client; toggling persists across reload + session
- ProfileSettings serves as the reference implementation pattern for any future toggle in admin UI

**Phase 7 progress: 5/5 plans complete (`complete-with-pending-UAT`).** No code-level blockers for Phase 8.

---
*Phase: 07-foundation-i18n-toggle-de-settings*
*Concluído: 2026-04-26*
