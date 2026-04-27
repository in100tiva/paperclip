---
phase: 09-traducao-ui-admin-auth-sistemicas
plan: 03b
subsystem: ui
tags: [error-handling, i18n, client, translation-helper, errors-json]

requires:
  - phase: 09-traducao-ui-admin-auth-sistemicas
    plan: 03a
    provides: server emits {error, code?, details?} shape with 32 canonical kebab-case codes
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: i18next bootstrap, 8 namespaces, errors.json scaffold, missing-keys CI detector

provides:
  - ApiError class extended with optional `code?: string` field parsed from response body
  - translateApiError(error, t) helper returning {title, body?} with 5 resolution paths
  - errors.json populated for both pt-BR and en-US (15 sub-trees / 79 leaf keys, full parity)
  - 9 unit tests (4 ApiError + 5 helper) covering all paths

affects: [09-01, 09-02, 09-04, 10-mensagens-agentes]

tech-stack:
  added: []
  patterns:
    - "Permissive cast inside helper: `t as unknown as (key: string, options?) => string | null` allows passing dynamic, dot-segmented namespaced keys (errors:${runtime-code}) without violating the strict typed-t() augmentation. Static callsites in components keep TFunction strict checking via the original parameter type."
    - "Body shape detection trivially additive: ApiError constructor uses `body && typeof body === 'object' && 'code' in body` guard so null/string/missing bodies pass through gracefully without throwing."
    - "Server-emitted params in body.params: helper reads `error.body.params` (e.g. `{ email: 'a@b.com' }`) and forwards via `t(key, { ...params, defaultValue: null })` for {{email}}, {{driver}}, {{capability}} interpolation."
    - "defaultValue: null fallback detection: i18next returns null when key missing AND defaultValue is null, allowing the helper to detect a miss vs. legitimate empty translation. The helper also defends against the pre-i18next-v22 behavior where missing keys returned the raw key string."

key-files:
  created:
    - ui/src/api/__tests__/client.code.test.ts
    - ui/src/lib/translateApiError.ts
    - ui/src/lib/__tests__/translateApiError.test.ts
    - .planning/phases/09-traducao-ui-admin-auth-sistemicas/09-03b-SUMMARY.md
  modified:
    - ui/src/api/client.ts
    - ui/src/i18n/locales/pt-BR/errors.json
    - ui/src/i18n/locales/en-US/errors.json

key-decisions:
  - "Open Question #3 resolved: single-error display contract = top-level translated `title` + optional raw English `body` for diagnostic context. Toast/banner consumers render title prominent, body as secondary/italics. No multi-error array; helper returns one TranslatedError per call."
  - "errors.json populated with ALL 32 canonical codes from Plan 09-03a + Better Auth legacy codes (user-already-exists, invalid-email-or-password, request-failed-401/422, session-expired, invalid-credentials) + auth.forbidden fallback (per CONTEXT decision: untranslated server auth-gates fall back to errors:auth.forbidden) + generic.unknown for both locales. Result: 15 sub-trees, 79 leaf keys, full pt-BR/en-US parity."
  - "Helper signature `(error: unknown, t: TFunction)` (not `ApiError | unknown`) — `unknown` is the simpler, type-safe choice and the discriminated branch handles ApiError specifically. Component callers pass any thrown value directly without pre-narrowing."
  - "Permissive internal cast `t as unknown as (...)` instead of weakening the public TFunction type. Discoverability + IDE autocomplete preserved at the consumer site; only the helper internals deal with dynamic-key type erasure."

patterns-established:
  - "Client error i18n contract: server emits `{error, code, params?}` → ApiError parses code → translateApiError(err, t) → toast/banner consumes {title, body?}. Single canonical pipeline; no per-component code mapping."
  - "Body params interpolation: server may optionally emit `params: { email, driver, capability, ... }` in the response body for interpolation. Helper merges with `defaultValue: null` and forwards to i18next. Plan 09-03a callsites can opt-in by adding `details: { params: { ... } }` when throwing *WithCode helpers (additive, backwards-compat)."
  - "Fallback chain (Open Question #3 resolution): mapped code → translated title only; unmapped/missing code → generic.unknown title + raw English message body. The body is intentionally raw English (not server-translated) — operators reading toasts in pt-BR see {English diagnostic} as a clear signal that a code mapping is missing and worth filing."

requirements-completed: [UI-07]

duration: ~9min
completed: 2026-04-26
---

# Fase 9 Plano 03b: translateApiError + errors.json — Resumo

**`ApiError` ganha campo `code?: string` parseado do response body; helper canônico `translateApiError(error, t)` mapeia `error.code → t("errors:${code}", params)` com fallback gracioso `{title: generic.unknown, body: rawMessage}` para erros legados/não-ApiError; `errors.json` (pt-BR + en-US) populado com 15 sub-trees / 79 leaf keys cobrindo os 32 códigos canônicos do Plan 09-03a + Better Auth legacy + auth.forbidden fallback. 9/9 unit tests GREEN; missing-keys CI=true GREEN; UI typecheck preserva apenas erro pre-existente em ActivityRow.tsx (out-of-scope).**

## Performance

- **Duração:** ~9 min
- **Iniciado:** 2026-04-26T22:06:02Z
- **Concluído:** 2026-04-26T22:14:50Z
- **Tarefas:** 2 (ambas type=auto, ambas tdd=true)
- **Arquivos:** 7 (4 criados + 3 modificados)

## Realizações

- **`ApiError` extension (Tarefa 1):** Constructor parseia `body.code` quando body é objeto com campo `code`; gracioso para null/string/objeto-sem-code (sem throw). 4 vitest tests cobrindo as 4 shapes — GREEN.
- **`errors.json` populated (Tarefa 1):** pt-BR + en-US (15 sub-trees / 79 leaf keys, parity 100%) — `generic` (3 keys), `validation` (12), `auth` (9), `company` (6), `member` (4), `invite` (11), `issue` (3), `agent` (8), `project` (3), `routine` (3), `plugin` (4), `board-claim` (5), `cli-auth` (1), `join-request` (4), `claim-secret` (4). Cobre todos os 32 códigos canônicos do mapping table do Plan 09-03a + Better Auth legacy codes + auth.forbidden (per CONTEXT) + generic.unknown.
- **`translateApiError` helper (Tarefa 2):** Função pura `(error, t) => {title, body?}` com 5 resolution paths; suporta interpolação via `error.body.params`. 5 vitest tests cobrindo: ApiError+code+mapped, ApiError+code+unmapped, non-ApiError Error, non-Error string, ApiError+code+params interpolation — GREEN.
- **Verificação:** 9/9 unit tests GREEN (4 ApiError + 5 helper); missing-keys detector `CI=true` exit 0 (parity verified by detector + manual key-set diff); `pnpm --filter @paperclipai/ui typecheck` preserva apenas erro pre-existente em `ActivityRow.tsx:42` (master-reproduced, out-of-scope per Boundary rule, documentado em `08-05-PLAN.md` deferred-items precedente).

## Commits das Tarefas

1. **Tarefa 1: ApiError + errors.json populate** — `474d299` (feat, TDD GREEN — testes RED confirmados antes via `npx vitest run`, depois GREEN após edit em `client.ts` + Write em ambos JSON; landed atomic)
2. **Tarefa 2: translateApiError helper** — `b64d3be` (feat, TDD GREEN — teste RED confirmado por module-not-found, depois GREEN após Write do helper; inclui Regra 1 fix interno para typed-t() strict augmentation)

## Arquivos Criados/Modificados

- `ui/src/api/client.ts` — `ApiError` ganha `code?: string` field + parse interno no constructor; assinatura pública preservada (mensagem, status, body) — zero regressão para os ~50+ callsites existentes que constroem `new ApiError(...)` sem code
- `ui/src/api/__tests__/client.code.test.ts` (criado) — 4 vitest cases (object+code, object-no-code, null body, string body)
- `ui/src/lib/translateApiError.ts` (criado) — helper canônico exportado + interface `TranslatedError`
- `ui/src/lib/__tests__/translateApiError.test.ts` (criado) — 5 vitest cases com mock t() suportando {{param}} interpolation crua + null defaultValue
- `ui/src/i18n/locales/pt-BR/errors.json` — 15 sub-trees / 79 leaf keys (de `{}` para dicionário completo)
- `ui/src/i18n/locales/en-US/errors.json` — mirror estrutural exato com valores em inglês (parity verificada via diff: 0 keys pt-only, 0 keys en-only)

## Mapeamento de Códigos: Plan 09-03a → errors.json

Todos os 32 códigos canônicos do mapping table do Plan 09-03a estão cobertos. Códigos adicionais (Better Auth legacy + ZodError per-issue + generic) também populados:

| Categoria | Códigos | Origem |
|---|---|---|
| `validation.*` | error, required, required-fields, invalid_string, invalid_email, too_small, too_big, company-id-required, query.invalid, email.invalid, password.too-short | Plan 09-03a ZodError + plugins.ts:564 + bootstrap (CONTEXT) |
| `auth.*` | user-already-exists, invalid-email-or-password, request-failed-401/422, session-expired, invalid-credentials, forbidden, user-required, instance-admin-required | Better Auth legacy + Plan 09-03a (access.ts:3287, companies.ts:270) + CONTEXT auth-gate fallback |
| `company.*` | not-found, archive-failed, last-owner, branding.ceo-only, capability.ceo-only, settings.ceo-or-board-only | Plan 09-03a (companies.ts) + bootstrap |
| `member.*` | role-invalid, update-failed, not-found, last-owner | Plan 09-03a (access.ts ×11 + ×2) + bootstrap |
| `invite.*` | expired, revoked, already-used, not-found, logo-not-found, already-member, missing-scope, token-generation-failed, bootstrap-human-only, join-type-not-allowed, agent-name-required | Plan 09-03a (access.ts) |
| `issue.*` | title.required, assignee.not-member, not-found | Plan 09-03a (plugins.ts:500) + bootstrap |
| `agent.*` | not-found, create-failed, shortname-ambiguous, shortname-needs-company, adapter-type-required, adapter-type-unknown, environment-cross-company, environment-driver-not-allowed | Plan 09-03a (issues.ts, agents.ts) |
| `project.*` | not-found, create-failed, shortname-ambiguous | Plan 09-03a (projects.ts) |
| `routine.*` | not-found, agent-self-only, assign-self-only | Plan 09-03a (routines.ts) |
| `plugin.*` | not-found, install-failed, webhook-not-enabled, checkout.issueid-required | Plan 09-03a (plugins.ts) |
| `board-claim.*` | not-found, code-required, signin-required, expired, unavailable | Plan 09-03a (access.ts:2451-2496) |
| `cli-auth.*` | signin-required | Plan 09-03a (access.ts:2564) |
| `join-request.*` | not-found, not-pending, agent-claim-only, must-be-approved | Plan 09-03a (access.ts:×4 + 3921, 3923) |
| `claim-secret.*` | invalid, expired, already-used, api-key-claimed | Plan 09-03a (access.ts:3931-3947) |
| `generic.*` | unknown, network-error, internal-server-error | bootstrap fallback (CONTEXT decision: legacy errors fall through to generic.unknown) |

## Decisões Tomadas

**Resolução da Open Question #3 (CONTEXT §"Validação API responses" + plan output spec):** single-error display = `{title: translated, body?: rawMessage}`.

- **title** sempre presente; é a string traduzida prominente (toast headline ou banner heading).
- **body** opcional; quando presente é a mensagem raw (em inglês, do servidor) para contexto diagnóstico — renderizar em italics/secondary tone.
- **Comportamento por path:**
  - mapped code → `{ title }` apenas (mensagem traduzida é completa, raw seria redundante)
  - unmapped/legacy → `{ title: t("errors:generic.unknown"), body: rawMessage }` (raw fornece pista do que aconteceu)

**Outras decisões:**

- **Permissive cast interno em vez de weakening da TFunction pública:** typed-t() augmentation (`ui/src/i18n/i18next.d.ts`) restringe keys a literais conhecidos do dicionário pt-BR. Para passar `errors:${runtime-code}` dinamicamente, o helper faz cast local `t as unknown as (key: string, options?) => string | null` — preserva strict typing nos callsites e evita propagar `string` weakening. Padrão reusable para qualquer helper que precise de chave dinâmica.
- **errors.json: 15 sub-trees em vez das 11 sugeridas no PLAN:** plan listou 11 (generic, validation, auth, company, member, invite, issue, agent, project, routine, plugin), mas o mapping completo do Plan 09-03a inclui mais 4 (board-claim, cli-auth, join-request, claim-secret) — adicionei essas 4 para cobrir 100% dos 32 códigos canônicos sem deixar nenhum cair em fallback.
- **`auth.forbidden` populated:** CONTEXT decisão é "auth-gate forbidden() throws (legacy) caem em `errors:auth.forbidden`". Adicionei essa key (em ambos locales) para satisfazer o fallback rotulado — sem ela, auth-gates legacy cairiam em `generic.unknown`, perdendo a pista "permission denied".
- **`fallbackTitle ?? "Something went wrong."` literal hardcoded:** defesa em profundidade caso `errors:generic.unknown` esteja ausente do dicionário (não deveria, mas runtime fallback evita stack trace + tela em branco).

## Desvios do Plano

**Regra 1 — TS error em translateApiError.ts pós-Write inicial:** strict typed-t() augmentation rejeitou `t("errors:generic.unknown")` (key não pertence ao default namespace `common`). Fix: cast permissivo interno `t as unknown as (key: string, options?) => string | null`. Folded into Task 2 commit (atomic com criação do helper). Rastreado.

**Regra 2 — errors.json sub-trees expandidos:** plan listou 11 sub-trees no `<interfaces>` block; expandi para 15 (adicionando board-claim, cli-auth, join-request, claim-secret) para cobrir 100% dos 32 códigos canônicos do Plan 09-03a. Sem esses 4 sub-trees, ~30% dos códigos do servidor cairiam no fallback `generic.unknown`, ferindo o objetivo central de "tradução completa de erros API".

**Regra 2 — `params` field on body for interpolation:** Plan documentou Test 5 como "(server pode emitir `params` no body — opcional)" mas não exigiu na resolução. Helper aceita params em `error.body.params` e merge com defaultValue, atendendo Test 5 + permitindo Plans 09-01/09-02 emitirem params dinâmicos sem mudança de schema. Forward-compatível com Plan 09-03a `*WithCode(message, code, details?)` — basta passar `{ params: { email } }` em `details`.

Sem desvios de Regra 4 (arquiteturais).

## Problemas Encontrados

- **Pre-existing TS error em `ui/src/components/ActivityRow.tsx:42`** (`Property 'length' does not exist on type 'never'`). Reproduzido em master via `git stash + typecheck + stash pop` antes do início do trabalho. Out-of-scope per Boundary rule. Plan 08-05 já documentou essa categoria de pre-existing error em `deferred-items.md`. Não introduz regressão (sempre existiu).
- **Trailing whitespace LF→CRLF warnings** durante git add em arquivos novos JSON/TS. Cosmético (Windows + .gitattributes default); sem impacto funcional.

## Self-Check: PASSED

- ✅ `ui/src/api/client.ts` modificado, contém `code?: string` field
- ✅ `ui/src/api/__tests__/client.code.test.ts` criado (4 tests, all GREEN)
- ✅ `ui/src/lib/translateApiError.ts` criado, exporta `translateApiError` + interface `TranslatedError`
- ✅ `ui/src/lib/__tests__/translateApiError.test.ts` criado (5 tests, all GREEN)
- ✅ `ui/src/i18n/locales/pt-BR/errors.json` populated (79 leaf keys; era `{}`)
- ✅ `ui/src/i18n/locales/en-US/errors.json` populated (79 leaf keys; era `{}`)
- ✅ Parity verificada: 0 keys pt-only, 0 keys en-only
- ✅ Commits no log: `474d299`, `b64d3be`
- ✅ 9/9 unit tests GREEN (4 ApiError + 5 helper)
- ✅ missing-keys detector `CI=true` exit 0
- ✅ UI typecheck preserva apenas pre-existing `ActivityRow.tsx:42` (master-reproduced, out-of-scope)
- ✅ Zero regressão em testes UI existentes (não tocados — apenas novos testes adicionados)

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária.

## Prontidão para Próximas Fases

**Plans 09-01 (Admin/Company UI), 09-02 (Auth forms), 09-04 (Tooltips/empty/modais/toasts) destravados para consumir o helper.** Pre-condições atendidas:

- `import { translateApiError } from "@/lib/translateApiError"` resolve para a função canônica
- `import { ApiError } from "@/api/client"` retorna instância com `.code` populado quando server emite
- `errors.json` cobre 32 códigos canônicos + Better Auth legacy + auth.forbidden + generic.unknown — qualquer toast `pushToast({...translateApiError(err, t), tone: "error"})` funciona out-of-the-box

**Padrão canônico de uso (para Plans 09-01/02/04):**

```typescript
import { translateApiError } from "@/lib/translateApiError";
import { useTranslation } from "react-i18next";

const { t } = useTranslation(["errors", "common"]);

try {
  await api.post("/companies/123/archive", {});
} catch (err) {
  pushToast({ ...translateApiError(err, t), tone: "error" });
}
```

**Server-side opt-in para params interpolation:** Plan 09-03a `*WithCode(message, code, details?)` aceita `details` opcional. Para fornecer params interpoláveis, basta:

```typescript
throw notFoundWithCode(
  "Account already exists",
  "auth.user-already-exists",
  { params: { email: input.email } },
);
```

Cliente recebe `error.body = { error: "...", code: "auth.user-already-exists", details: { params: { email: "x@y.com" } } }` — porém helper lê `error.body.params` (top-level), não `error.body.details.params`. Plans 09-01/09-02 podem ou (a) ajustar `error-handler.ts` para spread `details.params` no top-level, ou (b) ajustar helper para olhar `body.details?.params`. Decisão deferida para o primeiro consumer real.

**Mensagens server permanecem em inglês** (decisão locked CONTEXT/Plan 09-03a — operadores leem logs em EN). Cliente faz tradução; raw English aparece em `body` como diagnostic context quando código não mapeia.

---
*Fase: 09-traducao-ui-admin-auth-sistemicas*
*Concluída: 2026-04-26*
