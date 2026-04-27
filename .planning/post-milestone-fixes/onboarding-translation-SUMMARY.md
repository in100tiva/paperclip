---
type: post-milestone-fix
milestone: v1.1
fix-id: onboarding-translation
date: 2026-04-26
tags: [i18n, onboarding, ui, pt-BR, en-US]
namespaces-added: [onboarding]
key-files:
  created:
    - ui/src/i18n/locales/pt-BR/onboarding.json
    - ui/src/i18n/locales/en-US/onboarding.json
    - .planning/post-milestone-fixes/deferred-items.md
  modified:
    - ui/src/components/OnboardingWizard.tsx
    - ui/src/i18n/index.ts
    - ui/src/i18n/resources.ts
commits:
  - c4b1329 feat(i18n): bootstrap onboarding namespace + dictionaries
  - 6e46887 feat(i18n): migrate OnboardingWizard.tsx to useTranslation
---

# Post-Milestone Fix: OnboardingWizard Translation

## One-liner

Adds the `onboarding` i18n namespace (pt-BR + en-US) and migrates `OnboardingWizard.tsx` (1343 LOC, 4-step wizard) to `useTranslation`, closing the localization gap that the v1.1 milestone phases 8-9 did not cover.

## Why

OnboardingWizard was the entry point first-run operators see and was still rendering hardcoded English while the rest of the app shipped pt-BR/en-US in v1.1. The operator caught it in real use after the milestone audit.

## What was done

### 1. New `onboarding` namespace

Two dictionaries with 100% structural parity:

- `ui/src/i18n/locales/pt-BR/onboarding.json` — 56 leaf keys
- `ui/src/i18n/locales/en-US/onboarding.json` — 56 leaf keys

Top-level groups:

- `close`
- `tab.{company,agent,task,launch}`
- `step.{company,agent,task,launch}.{title,description}`
- `field.{company-name,company-goal,agent-name,adapter-type,model,task-title,task-description,webhook-url,gateway-url}.{label,placeholder,…}`
- `adapter.{recommended-badge,more-types,coming-soon}`
- `adapter.env-check.{title,description,test-now,testing,passed,warnings,failed,manual-debug,prompt-label,prompt-value,auth-fail-hint,claude-login-hint,anthropic-key-warning,unset-anthropic,retrying}`
- `summary.{company,task}`
- `button.{back,next,creating,create-and-open}`
- `error.{create-company-failed,create-agent-failed,create-task-failed,no-company-selected,adapter-env-failed,opencode-model-required,opencode-models-load-failed,opencode-models-loading,opencode-no-models,opencode-model-unavailable,anthropic-key-still-failing,unset-anthropic-failed}`

Registered in `ui/src/i18n/resources.ts` (both locale maps) and added to the `ns: [...]` array in `ui/src/i18n/index.ts`. The TypeScript module augmentation in `ui/src/i18n/i18next.d.ts` infers the namespace automatically from `resources["pt-BR"]`, so no change was needed there.

### 2. OnboardingWizard.tsx migration

- Added `import { Trans, useTranslation } from "react-i18next";`
- Wired `const { t } = useTranslation(["onboarding", "common"]);` at the top of `OnboardingWizard()`.
- Replaced every user-facing string in the four steps:
  - **Step 1 (Company):** title, description, "Company name" label/placeholder ("Acme Corp"), "Mission / goal (optional)" label/placeholder.
  - **Step 2 (Agent):** title, description, "Agent name" label/placeholder, "Adapter type" label, "Recommended" badge, "More Agent Adapter Types" disclosure, "Coming soon" fallback, "Model" label, model search placeholder, "Default" / "Select model (required)" trigger labels, "No models discovered." empty state, adapter environment-check panel ("Adapter environment check", "Runs a live probe…", "Test now"/"Testing…", "Passed" badge, "Manual debug" / "Prompt:" / "Respond with hello." debug block, "Unset ANTHROPIC_API_KEY" recovery CTA, "Retrying…"), "Webhook URL" / "Gateway URL" inputs.
  - **Step 3 (Task):** title, description, "Task title" label/placeholder, "Description (optional)" label/placeholder.
  - **Step 4 (Launch):** title, description, summary row trailing labels ("Company", "Task").
- Footer buttons: "Back", "Next", "Creating…", "Create & Open Issue".
- Error setters in handlers (`handleStep1Next`, `handleStep2Next`, `handleUnsetAnthropicApiKey`, `handleLaunch`, `runAdapterEnvironmentTest`) now translate fallback messages while still passing through server-supplied `Error.message` strings unchanged.
- Three rich-text segments use `<Trans i18nKey={... as never} components={...} />`, following the `as never` cast pattern already established in `InviteLanding.tsx` for cross-namespace keys against the typed pt-BR namespace inference:
  - `onboarding:adapter.env-check.anthropic-key-warning`
  - `onboarding:adapter.env-check.auth-fail-hint`
  - `onboarding:adapter.env-check.claude-login-hint`
- `AdapterEnvironmentResult` sub-component now receives a `labels: { passed, warnings, failed }` prop instead of hardcoding the status word, since it does not call `useTranslation` itself.

### 3. Skipped strings (per task spec)

Left literal:

- Brand `Paperclip` (none in this file, but enforced).
- Env var identifiers: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CURSOR_API_KEY`, `GEMINI_API_KEY`.
- CLI commands: `claude login`, `codex login`, `cursor agent login`, `gemini auth`, `opencode auth login`, `opencode models`.
- Adapter type identifiers (`claude_local`, `codex_local`, etc.) and command placeholders.
- Default agent name "CEO" (fed into form state on reset).
- Default task title and description (English seed kept verbatim — these are user-editable initial values, not display copy).

## Translated keys count

**56 leaf keys per locale, 112 total entries.** Both dictionaries have identical structure (parity 100% by construction — written side-by-side).

## Self-Check: PASSED

Commands run:

```bash
# 1. Typecheck (filtered to ui workspace)
$ pnpm --filter @paperclipai/ui typecheck
# Result: only one preexisting error in ui/src/components/ActivityRow.tsx:42
# (TS2339, last touched in commit e283f75 / Phase 08-05). Logged in
# .planning/post-milestone-fixes/deferred-items.md.
# OnboardingWizard.tsx itself: 0 errors.

# 2. Missing-keys i18n test
$ cd ui && CI=true npx vitest run --no-coverage missing-keys
# Result: ✓ src/i18n/__tests__/missing-keys.test.ts (1 test) 51ms
#         Test Files  1 passed (1)
#         Tests       1 passed (1)
# Confirms every t("onboarding:…") call in source has both pt-BR and en-US entries.

# 3. Verify no remaining hardcoded English copy in OnboardingWizard.tsx
$ rg '"(Company|Agent|Task|Launch|Back|Next|Cancel|Close|Save|Recommended|Default|Passed|Warnings|Failed|Testing|Retrying|Coming soon)"' ui/src/components/OnboardingWizard.tsx
# Result: no matches.

$ rg 'placeholder="[A-Z]' ui/src/components/OnboardingWizard.tsx
# Result: no matches.
```

Files verified to exist:

- `ui/src/i18n/locales/pt-BR/onboarding.json` — FOUND
- `ui/src/i18n/locales/en-US/onboarding.json` — FOUND
- `ui/src/i18n/resources.ts` — onboarding registered in both `pt-BR` and `en-US` maps
- `ui/src/i18n/index.ts` — `"onboarding"` present in `ns: [...]` array

Commits verified to exist:

- `c4b1329` — FOUND (namespace bootstrap)
- `6e46887` — FOUND (component migration)

## Deferred Issues

See `.planning/post-milestone-fixes/deferred-items.md` for the preexisting `ActivityRow.tsx:42` typecheck error that is out-of-scope for this fix.

## Notes for the next operator

- HMR was active throughout — no server restart needed.
- The `Trans` cast `as never` is a known TypeScript ergonomic gap when keys span namespaces; the same pattern is used in `InviteLanding.tsx`. A future cleanup could improve this with `keyPrefix` or per-namespace `<Trans />` wrappers, but that is unrelated to this fix.
- Brand "Paperclip" survives because the only occurrence in this file is implicitly via `getUIAdapter(adapterType).label` which comes from the adapter registry, not from this component.
