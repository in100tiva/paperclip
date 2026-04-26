---
phase: 07-foundation-i18n-toggle-de-settings
verified: 2026-04-26T11:35:00Z
status: human_needed
score: 9/9 must-haves verified (automated); 2 HUMAN-UAT pending
re_verification: false
human_verification:
  - test: "UAT-07-01 — Hot-swap + persistence"
    expected: "Toggle radio en-US in /instance/settings/profile changes UI strings instantly without reload, no flicker of raw `ns:key`; persists across F5 reload; persists across logout/login cycle; no console errors."
    why_human: "Visual perception (instant vs flicker, raw key visibility), real browser session (DevTools console, multi-page navigation, F5/logout/login flow), end-to-end PATCH→DB→session-rehydration validation that automation cannot judge perceptually."
    requirements: [SETTINGS-01, SETTINGS-04, SETTINGS-02]
    procedure: ".planning/phases/07-foundation-i18n-toggle-de-settings/07-HUMAN-UAT.md §UAT-07-01 (13 steps)"
  - test: "UAT-07-02 — Default pt-BR for new user"
    expected: "Brand-new signup lands on first authenticated screen in pt-BR; /instance/settings/profile shows pt-BR radio selected by default; session payload includes `locale: \"pt-BR\"`."
    why_human: "Requires capacity to sign up a fresh user (signup flow + email or admin-create), then navigate first authenticated screen and inspect it perceptually plus DevTools network tab."
    requirements: [SETTINGS-03]
    procedure: ".planning/phases/07-foundation-i18n-toggle-de-settings/07-HUMAN-UAT.md §UAT-07-02 (4 steps)"
---

# Phase 7: Foundation i18n + Toggle de Settings — Verification Report

**Phase Goal:** Estabelecer a fundação técnica completa de internacionalização — preferência de idioma persistida por usuário, toggle funcional em instance/settings, biblioteca i18n integrada com namespaces, dicionários pt-BR/en-US versionados no repo, fallback en-US para chaves ausentes, locale disponível no servidor (SSR/API/templates) e detector de chaves não traduzidas em build/CI.

**Verified:** 2026-04-26T11:35:00Z
**Status:** human_needed (complete-with-pending-UAT — precedente Phases 3, 4, 5, 6)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                         | Status      | Evidence                                                                                                  |
| --- | --------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| 1   | DB column `authUsers.locale` exists with NOT NULL DEFAULT 'pt-BR' + CHECK enum                | ✓ VERIFIED  | `packages/db/src/schema/auth.ts:9` + migration `0073_add_user_locale.sql` (ADD COLUMN + CHECK constraint) |
| 2   | i18next initialized with 8 namespaces, fallbackLng en-US, default lng pt-BR, useSuspense:false | ✓ VERIFIED  | `ui/src/i18n/index.ts` — full config inspected; `init.test.ts` 3/3 GREEN                                 |
| 3   | 16 dictionary JSON files exist (8 namespaces × 2 locales)                                     | ✓ VERIFIED  | `ui/src/i18n/locales/{pt-BR,en-US}/*.json` — 8 files each; `init.test.ts` I18N-02 GREEN                   |
| 4   | Fallback en-US for missing pt-BR keys works                                                   | ✓ VERIFIED  | `init.test.ts` I18N-03 GREEN; `index.ts` has `fallbackLng: "en-US"`                                       |
| 5   | Missing-keys detector (CI fail / dev warn) wired                                              | ✓ VERIFIED  | `missing-keys.test.ts` 1/1 GREEN; uses `process.env.CI` gate                                              |
| 6   | Server `req.locale` populated on every middleware code path (3-tier fallback)                 | ✓ VERIFIED  | `server/src/middleware/auth.ts` — 9 `req.locale = ...` assignments covering all branches; `middleware-locale.test.ts` 3/3 GREEN |
| 7   | PATCH `/api/auth/profile` accepts `{ locale }`, persists, returns it                          | ✓ VERIFIED  | `server/src/routes/auth.ts` — `patch.locale !== undefined ? { locale: patch.locale }` + `RETURNING ... locale`; `auth-routes-locale.test.ts` 3/3 GREEN |
| 8   | ProfileSettings renders 2 radios labeled via `t("settings:language.*")` and toggles call `i18n.changeLanguage` BEFORE `setQueryData` | ✓ VERIFIED | `ui/src/pages/ProfileSettings.tsx:127-150` — `updateLocaleMutation` with `await i18n.changeLanguage(newLocale)` preceding `queryClient.setQueryData`; `ProfileSettings.locale-toggle.test.tsx` 2/2 GREEN |
| 9   | Better Auth `additionalFields.locale` registered → `session.user.locale` typed and populated  | ✓ VERIFIED  | `server/src/auth/better-auth.ts:53` (type) + `:149` (additionalFields config) + resolver assembles locale  |
| 10  | I18nextProvider mounted in main.tsx wrapping ThemeProvider + descendants                      | ✓ VERIFIED  | `ui/src/main.tsx:7` (import), `:45` (open), `:71` (close) — between QueryClientProvider and ThemeProvider |
| 11  | Hot-swap + persistence visually confirmed (no reload, no flicker, persists logout/login)      | ? UNCERTAIN | Requires browser-bound human verification — UAT-07-01                                                     |
| 12  | Default pt-BR perceived by new user on first screen                                           | ? UNCERTAIN | Requires real signup flow — UAT-07-02                                                                     |

**Score:** 10/10 automatable truths verified · 2 truths pending HUMAN-UAT (consistent with `complete-with-pending-UAT` precedent)

### Required Artifacts

| Artifact                                                  | Expected                              | Exists | Substantive | Connected | Status      |
| --------------------------------------------------------- | ------------------------------------- | ------ | ----------- | --------- | ----------- |
| `packages/db/src/migrations/0073_add_user_locale.sql`     | DDL ADD COLUMN + CHECK                | ✓      | ✓ (2 lines, both ALTERs) | ✓ (journal idx=73) | ✓ VERIFIED |
| `packages/db/src/schema/auth.ts`                          | `locale: text("locale")`              | ✓      | ✓ (line 9)  | ✓         | ✓ VERIFIED  |
| `packages/shared/src/validators/access.ts`                | `localeSchema` enum + schemas         | ✓      | ✓ (lines 172, 180, 202) | ✓ (re-exported via barrel) | ✓ VERIFIED |
| `server/src/auth/better-auth.ts`                          | additionalFields + type augmentation  | ✓      | ✓ (line 53, 149) | ✓ (resolver reads value.user.locale) | ✓ VERIFIED |
| `server/src/lib/parse-accept-language.ts`                 | RFC-light pt/en parser                | ✓      | ✓ (20 lines, exports) | ✓ (imported by middleware) | ✓ VERIFIED |
| `server/src/types/express.d.ts`                           | `Request.locale: 'pt-BR' \| 'en-US'`  | ✓      | ✓ (line 24) | ✓ (consumed across server) | ✓ VERIFIED |
| `server/src/middleware/auth.ts`                           | 3-tier fallback on every path         | ✓      | ✓ (9 assignments) | ✓ (test green) | ✓ VERIFIED |
| `server/src/routes/auth.ts`                               | PATCH locale + GET returns locale     | ✓      | ✓           | ✓         | ✓ VERIFIED  |
| `ui/src/i18n/index.ts`                                    | i18next singleton, 8 ns, fallback     | ✓      | ✓ (37 lines, full config) | ✓ (imported by main.tsx + tests) | ✓ VERIFIED |
| `ui/src/i18n/resources.ts`                                | 16 static JSON imports + typed object | ✓      | ✓ (47 lines, 16 imports) | ✓ (imported by index.ts + i18next.d.ts) | ✓ VERIFIED |
| `ui/src/i18n/i18next.d.ts`                                | CustomTypeOptions augmentation        | ✓      | ✓ (9 lines, declare module) | ✓ (TS picks up via .d.ts) | ✓ VERIFIED |
| `ui/src/i18n/locales/{pt-BR,en-US}/common.json`           | bootstrap `app-name`                  | ✓      | ✓ (4 keys each) | ✓ (resources.ts) | ✓ VERIFIED |
| `ui/src/i18n/locales/{pt-BR,en-US}/settings.json`         | `language.{title,description,pt-br,en-us}` | ✓ | ✓ (full toggle bootstrap) | ✓ (consumed by ProfileSettings.tsx) | ✓ VERIFIED |
| `ui/src/i18n/locales/{pt-BR,en-US}/{6 placeholders}.json` | `{}` empty placeholders               | ✓      | ✓ (intentional placeholders for Phases 8-11) | ✓ (resources.ts wires them) | ✓ VERIFIED |
| `ui/src/main.tsx`                                         | I18nextProvider in tree               | ✓      | ✓ (3 lines added) | ✓ (above ThemeProvider, inside QC) | ✓ VERIFIED |
| `ui/src/pages/ProfileSettings.tsx`                        | Language section + toggle + hydration | ✓      | ✓ (mutation + radios + useEffect) | ✓ (consumes useTranslation, authApi.updateProfile) | ✓ VERIFIED |
| `ui/src/i18n/__tests__/init.test.ts`                      | I18N-01/02/03 tests                   | ✓      | ✓ (3 cases, all assertions) | ✓ (imports `../index`, `../resources` via test) | ✓ VERIFIED — 3/3 GREEN |
| `ui/src/i18n/__tests__/missing-keys.test.ts`              | I18N-04 detector test                 | ✓      | ✓           | ✓         | ✓ VERIFIED — 1/1 GREEN |
| `ui/src/pages/__tests__/ProfileSettings.locale-toggle.test.tsx` | SETTINGS-01/04 tests          | ✓      | ✓ (2 cases) | ✓ (imports `@/i18n`, ProfileSettings, mocks authApi) | ✓ VERIFIED — 2/2 GREEN |
| `server/src/__tests__/auth-routes-locale.test.ts`         | SETTINGS-02/03 tests                  | ✓      | ✓ (3 cases) | ✓         | ✓ VERIFIED — 3/3 GREEN |
| `server/src/__tests__/middleware-locale.test.ts`          | I18N-05 test                          | ✓      | ✓ (3 cases) | ✓         | ✓ VERIFIED — 3/3 GREEN |

### Key Link Verification

| From                                | To                                          | Via                                          | Verified | Detail |
| ----------------------------------- | ------------------------------------------- | -------------------------------------------- | -------- | ------ |
| `packages/db/src/schema/auth.ts`    | migration `0073_add_user_locale.sql`        | drizzle-kit generate + manual CHECK append   | ✓ WIRED  | Schema column + journal entry idx=73 + ADD COLUMN + ADD CONSTRAINT both present |
| `server/src/auth/better-auth.ts`    | `packages/db/src/schema/auth.ts`            | imports `authUsers` + matches column         | ✓ WIRED  | additionalFields.locale matches DB column type/default |
| `packages/shared/src/validators/access.ts` | `server/src/routes/auth.ts`         | `validate(updateCurrentUserProfileSchema)`   | ✓ WIRED  | Route uses validator middleware; schema accepts optional `locale`; route persists it |
| `server/src/middleware/auth.ts`     | `packages/db/src/schema/auth.ts`            | imports `authUsers` + 3rd Promise.all SELECT | ✓ WIRED  | `db.select({ locale: authUsers.locale }).from(authUsers).where(eq(authUsers.id, userId))` in authenticated branch |
| `server/src/middleware/auth.ts`     | `server/src/lib/parse-accept-language.ts`   | import + fallback chain                      | ✓ WIRED  | `from "../lib/parse-accept-language.js"`; called on 8 non-authenticated paths |
| `ui/src/main.tsx`                   | `ui/src/i18n/index.ts`                      | side-effect import + I18nextProvider         | ✓ WIRED  | Default export consumed; I18nextProvider mounted line 45 |
| `ui/src/pages/ProfileSettings.tsx`  | `ui/src/i18n/index.ts`                      | useTranslation() + i18n.changeLanguage()     | ✓ WIRED  | `useTranslation` hook + `i18n.changeLanguage(newLocale)` (line 134) before setQueryData |
| `ui/src/pages/ProfileSettings.tsx`  | `ui/src/api/auth.ts`                        | `authApi.updateProfile({ locale })`          | ✓ WIRED  | Mutation calls `authApi.updateProfile` with `{ name, locale }`; test mock asserts payload |
| ProfileSettings session hydration   | sessionQuery.data → i18n.language           | useEffect on `[sessionQuery.data, i18n]`     | ✓ WIRED  | Line 53: `void i18n.changeLanguage(userLocale)` when differs |
| Optimistic mutation order (Pitfall 3) | `await i18n.changeLanguage(newLocale)` BEFORE `queryClient.setQueryData` | onMutate body | ✓ WIRED | Line 134 (await change) precedes setQueryData; rollback on error reverts both |

### Behavioral Spot-Checks

| Behavior                                       | Command                                                                     | Result | Status |
| ---------------------------------------------- | --------------------------------------------------------------------------- | ------ | ------ |
| UI Wave 0 tests pass (init + missing-keys + ProfileSettings.locale-toggle) | `npx vitest run --root ui src/i18n/__tests__/init.test.ts src/i18n/__tests__/missing-keys.test.ts src/pages/__tests__/ProfileSettings.locale-toggle.test.tsx` | 3 files / 6 tests passed | ✓ PASS |
| Server Wave 0 tests pass (auth-routes-locale + middleware-locale) | `npx vitest run --root server src/__tests__/auth-routes-locale.test.ts src/__tests__/middleware-locale.test.ts` | 2 files / 6 tests passed | ✓ PASS |
| Migration SQL parses + has both DDL statements | `cat packages/db/src/migrations/0073_add_user_locale.sql`                   | ADD COLUMN + ADD CONSTRAINT present, no RENAME | ✓ PASS |
| 16 JSON dicts exist and parse                  | `ls ui/src/i18n/locales/{pt-BR,en-US}/*.json` (16 paths)                    | All 16 present + Plan 01 inline `node -e` JSON.parse confirmed valid | ✓ PASS |
| i18next config has 8 ns + en-US fallback + pt-BR default + useSuspense:false | inspect `ui/src/i18n/index.ts`                              | All flags present | ✓ PASS |

### Requirements Coverage

| Requirement   | Source Plan(s) | Description                                                  | Status        | Evidence                                                                 |
| ------------- | -------------- | ------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------ |
| SETTINGS-01   | 07-01, 07-05   | Toggle radio render + clique muda idioma                     | ✓ SATISFIED (auto) + ? HUMAN-UAT-07-01 pending | ProfileSettings.locale-toggle.test.tsx 2/2 GREEN; visual hot-swap pending UAT |
| SETTINGS-02   | 07-01, 07-02, 07-04 | Preferência persiste no Supabase (coluna user.locale)   | ✓ SATISFIED   | DB column + migration + PATCH persists; auth-routes-locale.test.ts 3/3 GREEN |
| SETTINGS-03   | 07-01, 07-02, 07-04, 07-05 | Default pt-BR + fallback en-US                  | ✓ SATISFIED (auto) + ? HUMAN-UAT-07-02 pending | DB DEFAULT 'pt-BR'; middleware fallback; auth-routes-locale tests; UAT pending for new-user perceived default |
| SETTINGS-04   | 07-01, 07-05   | Mudança aplica imediato sem reload                           | ✓ SATISFIED (auto) + ? HUMAN-UAT-07-01 pending | Pitfall 3 ordering enforced (await before setQueryData); test 2/2 GREEN; visual instant-update pending UAT |
| I18N-01       | 07-01, 07-03   | i18next + react-i18next + 8 namespaces                       | ✓ SATISFIED   | init.test.ts I18N-01 GREEN; index.ts has 8 ns                            |
| I18N-02       | 07-01, 07-03   | Dicionários pt-BR e en-US versionados                        | ✓ SATISFIED   | 16 JSON files; init.test.ts I18N-02 GREEN                                |
| I18N-03       | 07-01, 07-03   | Fallback en-US para chaves pt-BR ausentes                    | ✓ SATISFIED   | fallbackLng:"en-US"; init.test.ts I18N-03 GREEN                          |
| I18N-04       | 07-01, 07-03   | Detector de chaves não traduzidas em CI                      | ✓ SATISFIED   | missing-keys.test.ts GREEN; CI gate via `process.env.CI`                 |
| I18N-05       | 07-01, 07-04   | Locale disponível no context do servidor                     | ✓ SATISFIED   | req.locale on every middleware path; middleware-locale.test.ts 3/3 GREEN |

**Cobertura total:** 9/9 requisitos satisfeitos no nível automatizado. SETTINGS-01, SETTINGS-03, SETTINGS-04 têm dimensão visual/perceptual adicional pendente em HUMAN-UAT (não bloqueador — precedente `complete-with-pending-UAT` das Phases 3-6).

**Sem requisitos órfãos:** REQUIREMENTS.md mapeia exatamente os 9 IDs reivindicados nos PLANs (SETTINGS-01..04, I18N-01..05). Nenhum ID extra esperado nesta fase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `ui/src/i18n/locales/{pt-BR,en-US}/{inbox,projects,auth,agents,errors,activity}.json` | — | Empty `{}` placeholders | ℹ️ Info | Intentional — Phases 8-11 populam strings reais; documentado em CONTEXT/SUMMARY |

Nenhum stub bloqueador. Nenhum TODO/FIXME/PLACEHOLDER em código de produção entregue nesta fase. Loupe override em `package.json` é shim de ambiente local (NTFS corruption recovery), documentado em 07-03 SUMMARY — não afeta CI nem runtime.

### Human Verification Required

Dois UATs pendentes, ambos browser-bound + percepção visual:

#### 1. UAT-07-01 — Hot-swap + persistência

**Test:** Login → /instance/settings/profile → click radio en-US → verify instant UI update sem reload e sem flicker de raw `ns:key` → F5 → verify persistência → toggle pt-BR → logout → login → verify pt-BR persistido.
**Expected:** Strings driven por `t()` mudam instantaneamente; en-US persiste após reload; pt-BR persiste após logout/login; sem console errors; sem chaves cruas visíveis.
**Why human:** Julgamento perceptual (instant vs flicker, raw key visibility), browser real (DevTools console, F5, multi-session), validação end-to-end PATCH→DB→hydration que automação não consegue avaliar perceptualmente.
**Cobre:** SETTINGS-01, SETTINGS-04, SETTINGS-02 (side-effect)
**Procedimento detalhado:** `.planning/phases/07-foundation-i18n-toggle-de-settings/07-HUMAN-UAT.md` §UAT-07-01 (13 passos)

#### 2. UAT-07-02 — Default pt-BR para novo usuário

**Test:** Aba anônima → signup novo usuário → observar primeira tela autenticada → verify pt-BR (não en-US) → /instance/settings/profile → verify pt-BR radio selecionado por default → opcional: DevTools Network → verify session response inclui `locale: "pt-BR"`.
**Expected:** Primeira tela após signup em pt-BR; radio default pt-BR; session payload com `locale: "pt-BR"`.
**Why human:** Requer fluxo real de signup + navegação visual + inspeção DevTools.
**Cobre:** SETTINGS-03
**Procedimento detalhado:** `.planning/phases/07-foundation-i18n-toggle-de-settings/07-HUMAN-UAT.md` §UAT-07-02 (4 passos)

### Gaps Summary

**Nenhum gap automatizado.** Todos os 9 requisitos da fase têm pelo menos um teste automatizado verde cobrindo o contrato:

- 5 test files (3 UI + 2 server), 12 assertions distribuídas, todos GREEN no momento da verificação
- DB → server → UI contract round-trip verificado em código (PATCH persiste → GET retorna → hydration sincroniza i18n.language)
- Pitfall 3 (ordering: `await changeLanguage` antes de `setQueryData`) verificado por teste + grep ordering
- Pitfall 5 (Provider position: I18nextProvider dentro de QueryClientProvider, acima de ThemeProvider) verificado por grep line-number ordering
- Pitfall 4 (sem RENAME na migration auto-gerada) verificado em 07-02 SUMMARY

**Pendência humana (não-bloqueador, segue precedente):** UAT-07-01 (hot-swap visual + persistência cross-session) e UAT-07-02 (default pt-BR perceptual para novo usuário) requerem operador em browser real. Artefato `07-HUMAN-UAT.md` documenta procedimentos completos com critérios pass/fail tabulados.

**Padrão de fechamento:** `complete-with-pending-UAT` — precedente estabelecido por Phases 3 (TEAM-04), 4 (SPIKE-04/05), 5 (UAT-05-01), 6 (UAT-06-01). Orquestrador pode rotear para o usuário executar os UATs e sinalizar `aprovado`, ou aceitar a fase como `complete-with-pending-UAT` para liberar Phase 8.

---

_Verified: 2026-04-26T11:35:00Z_
_Verifier: Claude (verifier)_
