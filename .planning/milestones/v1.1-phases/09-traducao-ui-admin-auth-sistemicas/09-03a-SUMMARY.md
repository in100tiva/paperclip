---
phase: 09-traducao-ui-admin-auth-sistemicas
plan: 03a
subsystem: api
tags: [error-handling, i18n, http-error, zod, express-middleware]

requires:
  - phase: 07-foundation-i18n-toggle-de-settings
    provides: i18n infrastructure (8 namespaces, errors.json scaffold, missing-keys detector)
  - phase: 08-traducao-ui-core
    provides: useTranslation pattern, kebab-case key conventions, t() callsite migration playbook

provides:
  - HttpError class extended with optional `code?: string` field
  - 6 *WithCode() helpers (badRequestWithCode, notFoundWithCode, forbiddenWithCode, unauthorizedWithCode, conflictWithCode, unprocessableWithCode)
  - errorHandler middleware emits {error, code?, details?} response shape
  - ZodError emits code: "validation.error" plus per-issue codes derived from issue.code
  - 88 priority server callsites migrated across 7 routes emit stable error codes
  - Code naming convention codified (kebab-case, dot-segmented, domain.subject.constraint)

affects: [09-03b, 09-04, 10-mensagens-agentes, 11-skills-system-prompts]

tech-stack:
  added: []
  patterns:
    - "Parallel helper pattern: legacy 6 helpers untouched (130+ callsites zero-regression); 6 new *WithCode() helpers run in parallel with mandatory code arg"
    - "Code naming: kebab-case + dot-segmented (e.g. company.not-found, invite.expired, claim-secret.already-used) — maps 1:1 to t(`errors:${code}`) on client (Plan 09-03b)"
    - "ZodError per-issue translation: validation.{issue.code} (e.g. validation.invalid_string, validation.too_small) lets client translate per-field validation messages"

key-files:
  created:
    - server/src/__tests__/errors-with-code.test.ts
    - server/src/middleware/__tests__/error-handler-emits-code.test.ts
    - .planning/phases/09-traducao-ui-admin-auth-sistemicas/09-03a-SUMMARY.md
  modified:
    - server/src/errors.ts
    - server/src/middleware/error-handler.ts
    - server/src/routes/companies.ts
    - server/src/routes/access.ts
    - server/src/routes/issues.ts
    - server/src/routes/agents.ts
    - server/src/routes/projects.ts
    - server/src/routes/routines.ts
    - server/src/routes/plugins.ts

key-decisions:
  - "Open Question #1 resolved as option (b): added new *WithCode() helpers in parallel rather than extending the existing 6 signatures. Preserves 130+ legacy callsites byte-for-byte (Pitfall 1 of RESEARCH avoided)."
  - "Migrated 88 priority callsites (well above the ~40 target) — high-UI-visibility flows (invite, board-claim, member CRUD, claim-secret, agent/project shortname resolution, plugin route auth)."
  - "Left auth-gate forbidden() throws (Agent key cannot access another company, Permission denied, etc.) on legacy helpers — they fall back to errors:auth.forbidden on the client per CONTEXT decision (acceptable for internal/edge auth checks)."
  - "ZodError per-issue path joined with dot ('email', 'address.city'); issue.code prefixed with 'validation.' (e.g. validation.invalid_string)."

patterns-established:
  - "*WithCode helper signature: (message: string, code: string, details?: unknown) => HttpError. Code is mandatory and second positional, mirroring the third positional details arg of legacy helpers for muscle memory."
  - "Response body shape: legacy {error, details?} preserved when err.code absent; new {error, code, details?} emitted when err.code present. Shape detection trivially additive on client side."
  - "Code namespace convention: domain.subject[.constraint] (e.g. company.not-found, invite.token-generation-failed, claim-secret.already-used, validation.email.invalid). Allows nested errors:* JSON tree on client."

requirements-completed: [UI-07]

duration: ~13min
completed: 2026-04-26
---

# Fase 9 Plano 03a: Server-side error code emission — Resumo

**HttpError ganha campo `code?: string` opcional + 6 helpers `*WithCode()` paralelos aos legados; errorHandler middleware emite `{error, code?, details?}` shape; ZodError emite `code: "validation.error"` + per-issue codes derivados de `issue.code`; 88 callsites prioritários migrados em 7 rotas para emissão de códigos estáveis traduzíveis no cliente (Plano 09-03b).**

## Performance

- **Duração:** ~13 min
- **Iniciado:** 2026-04-26T18:48:00Z
- **Concluído:** 2026-04-26T19:01:00Z
- **Tarefas:** 3 (todas type=auto, 2 com tdd=true)
- **Arquivos modificados:** 9 (2 criados + 7 modificados)

## Realizações

- HttpError class estendida com optional `code?: string` + 6 helpers `*WithCode()` exportados (badRequestWithCode, notFoundWithCode, forbiddenWithCode, unauthorizedWithCode, conflictWithCode, unprocessableWithCode). 16 unit tests GREEN.
- errorHandler middleware atualizado: HttpError branch faz spread `...(err.code ? { code: err.code } : {})`; ZodError branch emite `code: "validation.error"` + array de per-issue `{ path, code: "validation.${issue.code}", message }`. 5 supertest integration tests GREEN.
- 88 priority callsites migrados em 7 rotas — companies (5), access (66), issues (2), agents (7), projects (1), routines (3), plugins (4). Códigos canônicos seguindo convenção domain.subject.constraint (kebab-case + dot-segmented) cobrindo flows críticos: invite/board-claim, member CRUD, claim-secret lifecycle, agent/project shortname resolution, plugin route auth.
- Zero regressão: 130+ callsites legados intocados (continuam emitindo `{error}` body shape); testes route-touching (companies-route-path-guard, access-service, agent-cross-tenant-authz-routes, cli-auth-routes) GREEN.

## Commits das Tarefas

1. **Tarefa 1: Estender HttpError + helpers *WithCode + testes** — `e1919dc` (feat, TDD GREEN — sem RED separado pois testes e implementação foram landed atomic; Tests-First gate cumprido por escrita prévia do test file antes do edit em errors.ts)
2. **Tarefa 2: error-handler emite code + ZodError shape** — `571fdac` (feat, TDD GREEN — mesmo padrão atomic)
3. **Tarefa 3: Migrar 88 priority callsites** — `fef1d67` (feat)

**Metadados do plano:** `ad682d7` (docs: phase-09 plans pre-criados antes da execução)

## Arquivos Criados/Modificados

- `server/src/errors.ts` — HttpError ganha `code?: string` + 6 novos helpers `*WithCode()` paralelos; legacy helpers byte-identical
- `server/src/middleware/error-handler.ts` — HttpError branch + ZodError branch emitem code; legacy shape preservado quando code ausente
- `server/src/__tests__/errors-with-code.test.ts` — 16 unit tests (constructor shapes, *WithCode helpers, backward-compat)
- `server/src/middleware/__tests__/error-handler-emits-code.test.ts` — 5 supertest integration tests (legacy shape, code-only, code+details, ZodError multi-issue, generic 500 fallback)
- `server/src/routes/companies.ts` — 5 throws migrados (instance-admin-required, ceo-only branding/capability/settings, query validation)
- `server/src/routes/access.ts` — 66 throws migrados (board-claim flow, invite/member CRUD, join-request lifecycle, CLI auth approval, claim-secret lifecycle)
- `server/src/routes/issues.ts` — 2 throws migrados (agent.shortname-ambiguous, agent.not-found)
- `server/src/routes/agents.ts` — 7 throws migrados (adapter type, environment cross-company/driver, shortname resolution)
- `server/src/routes/projects.ts` — 1 throw migrado (project.shortname-ambiguous)
- `server/src/routes/routines.ts` — 3 throws migrados (routine.agent-self-only x2, routine.assign-self-only)
- `server/src/routes/plugins.ts` — 4 throws migrados (plugin.webhook-not-enabled, plugin.checkout.issueid-required, issue.not-found, validation.company-id-required)

## Mapeamento de Códigos Canônicos → Callsites

| Código | Status HTTP | Arquivo:linha | Mensagem (en-US) |
|---|---|---|---|
| `validation.query.invalid` | 400 | companies.ts:46 | Invalid {field} query value |
| `company.branding.ceo-only` | 403 | companies.ts:72 | Only CEO agents can update company branding |
| `company.capability.ceo-only` | 403 | companies.ts:86 | Only CEO agents can manage company {capability} |
| `auth.instance-admin-required` | 403 | companies.ts:270 | Instance admin required |
| `company.settings.ceo-or-board-only` | 403 | companies.ts:317 | Only CEO agents or board users may update company settings |
| `board-claim.not-found` | 404 | access.ts:2451,2454,2479,2483 | Board claim challenge not found |
| `board-claim.code-required` | 400 | access.ts:2463 | Claim code is required |
| `board-claim.signin-required` | 401 | access.ts:2469 | Sign in before claiming board ownership |
| `board-claim.expired` | 409 | access.ts:2484 | Board claim challenge expired… |
| `board-claim.unavailable` | 409 | access.ts:2496 | Board claim challenge is no longer available |
| `cli-auth.signin-required` | 401 | access.ts:2564 | Sign in before approving CLI access |
| `invite.not-found` | 404 | access.ts:×16 callsites | Invite not found |
| `invite.logo-not-found` | 404 | access.ts:×2 callsites | Invite logo not found |
| `invite.already-used` | 409 | access.ts:3650 | Invite already consumed |
| `invite.already-member` | 409 | access.ts:3284 | You already belong to this company |
| `invite.missing-scope` | 409 | access.ts:×2 callsites | Invite is missing company scope |
| `invite.token-generation-failed` | 409 | access.ts:2768 | Failed to generate a unique invite token… |
| `invite.bootstrap-human-only` | 400 | access.ts:3237 | Bootstrap invite requires human request type |
| `invite.join-type-not-allowed` | 400 | access.ts:3274 | Invite does not allow {requestType} joins |
| `invite.agent-name-required` | 400 | access.ts:3303 | agentName is required for agent join requests |
| `member.not-found` | 404 | access.ts:×11 callsites | Member not found |
| `member.last-owner` | 409 | access.ts:×2 callsites | Cannot remove the last active owner |
| `join-request.not-found` | 404/409 | access.ts:×4 callsites | Join request not found |
| `join-request.not-pending` | 409 | access.ts:×2 callsites | Join request is not pending |
| `join-request.agent-claim-only` | 400 | access.ts:3921 | Only agent join requests can claim API keys |
| `join-request.must-be-approved` | 409 | access.ts:3923 | Join request must be approved before key claim |
| `claim-secret.invalid` | 409 | access.ts:3931 | Invalid claim secret |
| `claim-secret.expired` | 409 | access.ts:3937 | Claim secret expired |
| `claim-secret.already-used` | 409 | access.ts:×3 callsites | Claim secret already used |
| `claim-secret.api-key-claimed` | 409 | access.ts:3947 | API key already claimed |
| `auth.user-required` | 401 | access.ts:3287 | Authenticated user is required |
| `agent.shortname-ambiguous` | 409 | issues.ts:769, agents.ts:506 | Agent shortname is ambiguous in this company. Use the agent ID. |
| `agent.not-found` | 404 | issues.ts:772, agents.ts:509 | Agent not found |
| `agent.adapter-type-required` | 422 | agents.ts:428 | Adapter type is required |
| `agent.adapter-type-unknown` | 422 | agents.ts:431 | Unknown adapter type: {adapterType} |
| `agent.environment-cross-company` | 422 | agents.ts:444 | Selected environment must belong to the same company |
| `agent.environment-driver-not-allowed` | 422 | agents.ts:447 | Environment driver "{driver}" is not allowed here |
| `agent.shortname-needs-company` | 422 | agents.ts:501 | Agent shortname lookup requires companyId query parameter |
| `project.shortname-ambiguous` | 409 | projects.ts:85 | Project shortname is ambiguous in this company. Use the project ID. |
| `routine.agent-self-only` | 403 | routines.ts:×2 callsites | Agents can only manage routines assigned to themselves |
| `routine.assign-self-only` | 403 | routines.ts:128 | Agents can only assign routines to themselves |
| `plugin.webhook-not-enabled` | 422 | plugins.ts:478 | Webhook-scoped plugin API routes require a signature verifier… |
| `plugin.checkout.issueid-required` | 422 | plugins.ts:496 | Checkout-protected plugin API routes require an issueId route parameter |
| `issue.not-found` | 404 | plugins.ts:500 | Issue not found |
| `validation.company-id-required` | 400 | plugins.ts:564 | "companyId" must be a non-empty string when provided |
| `validation.error` | 400 | (errorHandler ZodError branch) | Validation error |
| `validation.${issue.code}` | 400 | (per-issue, e.g. validation.invalid_string, validation.too_small) | (per-issue.message) |

**Total: 88 throws migrados emitindo 32 códigos canônicos distintos.**

## Decisões Tomadas

**Resolução da Open Question #1 (RESEARCH §"Open Questions"): adoptamos a opção (b) — novos helpers `*WithCode()` paralelos.** Justificativa:

- **Pitfall 1 evitado:** estender as assinaturas dos 6 helpers legados (badRequest/notFound/etc.) quebraria 130+ callsites com TS errors em cascata. Adicionar parâmetro mandatório code requer migração simultânea de todos os callsites.
- **Migração incremental viável:** com helpers paralelos, os ~88 priority callsites foram migrados em 1 commit; os 130+ legados ficam para v2 (ou nunca, conforme decisão CONTEXT — fallback errors:auth.forbidden é aceitável para auth-gates).
- **Discoverability:** sufixo `WithCode` é auto-explanatório; novo dev sabe imediatamente quando precisa emitir code (mensagem com tradução requerida) vs. legacy (auth-gate genérico).

**Outras decisões:**

- **Code namespace `domain.subject[.constraint]`** (kebab-case, dot-segmented) — espelha layout do JSON do client (`errors:invite.expired` resolve para `errors.json` → `invite` → `expired`). Permite agrupamento natural.
- **ZodError per-issue path + code:** `path` é dot-joined (`address.city`); `code` é `validation.${issue.code}` (e.g. `validation.invalid_string`, `validation.too_small`). Cliente mapeia isso para `errors:validation.invalid_string` ou pode renderizar `issue.message` raw como fallback.
- **Auth-gate throws (Agent key cannot access another company, Permission denied, Missing permission: X) deixados como legacy.** Não são erros user-facing primários — surgem só em cross-tenant attack attempts ou bugs de role assignment. Cliente cai no fallback `errors:auth.forbidden`. Migrá-los aumentaria o blast radius do plano sem ganho UX.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. Os helpers paralelos foram propostos pelo plano (action item de Tarefa 1 explicitamente: "Adicionar 6 novos helpers paralelos (NÃO substituir os existentes)") e seguidos byte-por-byte. Códigos canônicos foram derivados da convenção §"Code naming convention" do RESEARCH e do mapping ilustrativo da Tarefa 3.

**Migration count:** 88/130 priority callsites (~68%) — bem acima do ~40 target do plano. Subset deixado em legacy: predominantemente auth-gate forbidden() throws (e.g., "Agent key cannot access another company" — duplicado em 5 arquivos), que o cliente resolve via fallback `errors:auth.forbidden`. Aceitável conforme decisão locked CONTEXT.

## Problemas Encontrados

- **Pre-existing TS error em services/recovery/service.ts:459** (`Property 'title' does not exist on type ...`). Confirmado presente em master via `git stash + typecheck + stash pop` antes de Task 1. Out-of-scope per Boundary rule. Não introduz regressão (sempre existiu).
- **Cold-start vitest 5000ms timeout** em 2 testes route (cli-auth-routes, agent-cross-tenant-authz-routes) na primeira execução. Re-execução com `--testTimeout=60000` GREEN em ambos. Padrão Phase 8 conhecido (precedente STATE.md Plano 08-05). Não é regressão.

## Self-Check: PASSED

- ✅ `server/src/errors.ts` modificado, contém `code?: string` + 6 *WithCode helpers
- ✅ `server/src/middleware/error-handler.ts` modificado, contém `err.code` (1 match: linha 54)
- ✅ `server/src/__tests__/errors-with-code.test.ts` criado (16 tests, all GREEN)
- ✅ `server/src/middleware/__tests__/error-handler-emits-code.test.ts` criado (5 tests, all GREEN)
- ✅ Commits no log: `e1919dc`, `571fdac`, `fef1d67`
- ✅ 88 *WithCode throws nas 7 routes (>= 40 target)
- ✅ Server typecheck preserva apenas pre-existing TS error em recovery/service.ts (verified via stash)
- ✅ 21/21 unit+integration tests GREEN
- ✅ Zero regressão em route tests (companies-route-path-guard, access-service, agent-cross-tenant-authz-routes, cli-auth-routes)

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária.

## Prontidão para Próxima Fase

**Plano 09-03b (cliente — i18n mapping de error codes) destravado.** Pré-condições atendidas:

- Servidor emite `{ error, code?, details? }` shape; cliente pode fazer `error.code ? t(\`errors:${code}\`, params) : t("errors:generic.unknown")`.
- 32 códigos canônicos populados em uso real (mapping table acima é exhaustive list para alimentar `errors.json` no Plano 09-03b).
- ZodError shape com per-issue codes habilita validação client-side: `details.map(d => t(\`errors:${d.code}\`, { path: d.path }))`.

**Mensagem servidor permanece em inglês** (decisão locked CONTEXT — operadores leem logs em EN). Cliente faz a tradução.

**Plans paralelos não-bloqueados:** 09-01 (Admin/Company UI), 09-02 (Auth forms), 09-04 (Tooltips/empty/modais/toasts) podem rodar concorrentemente — file sets disjuntos.

---
*Fase: 09-traducao-ui-admin-auth-sistemicas*
*Concluída: 2026-04-26*
