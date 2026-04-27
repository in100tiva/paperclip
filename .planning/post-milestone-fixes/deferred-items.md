# Deferred Items — Post-Milestone Fixes

Items discovered during post-milestone fix work that are out-of-scope for the
current fix and remain unaddressed. These should be triaged into a future plan.

## Preexisting typecheck error: ActivityRow.tsx:42

- **Discovered during:** onboarding-translation fix (2026-04-26)
- **File:** `ui/src/components/ActivityRow.tsx:42`
- **Error:** `TS2339: Property 'length' does not exist on type 'never'.`
- **Last touched:** commit `e283f75` (Phase 08-05) — predates v1.1 milestone fix work.
- **Why deferred:** Out-of-scope per execute-plan FRONTEIRA DE ESCOPO. The error
  is unrelated to OnboardingWizard i18n migration. The runtime call
  `t(...)` with `defaultValue: ""` returns `string | object` per i18next typings,
  and the `translated.length` access is narrowed only after `typeof === "string"`,
  but TS infers `never` because of overload resolution with the typed namespace.
- **Suggested fix:** Cast `translated` to `string` once narrowed, or use
  `String(translated).length`. Should be a 1-line patch in a separate commit.
