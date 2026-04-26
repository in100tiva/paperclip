---
phase: 09-traducao-ui-admin-auth-sistemicas
plan: 03a
type: execute
wave: 1
depends_on: []
files_modified:
  - server/src/errors.ts
  - server/src/middleware/error-handler.ts
  - server/src/middleware/__tests__/error-handler-emits-code.test.ts
  - server/src/__tests__/errors-with-code.test.ts
  - server/src/routes/companies.ts
  - server/src/routes/access.ts
  - server/src/routes/issues.ts
  - server/src/routes/agents.ts
  - server/src/routes/projects.ts
  - server/src/routes/routines.ts
  - server/src/routes/plugins.ts
autonomous: true
requirements:
  - UI-07
must_haves:
  truths:
    - "HttpError carries optional stable code field (e.g., 'company.not-found')"
    - "Error response JSON body emits {error, code?, details?} when code present"
    - "ZodError emits code: 'validation.error' + per-issue codes derived from issue.code"
    - "Existing 130+ HttpError callsites continue compiling and emitting same body shape (zero regression on legacy paths)"
    - "Priority callsites in auth/companies/issues/agents/projects/routines/plugins routes throw via *WithCode() helpers and emit stable codes"
  artifacts:
    - path: "server/src/errors.ts"
      provides: "HttpError + *WithCode() helpers"
      contains: "code?: string"
    - path: "server/src/middleware/error-handler.ts"
      provides: "Error middleware emitting {error, code?, details?}"
      contains: "err.code"
    - path: "server/src/middleware/__tests__/error-handler-emits-code.test.ts"
      provides: "Integration test asserting response body shape with code"
      min_lines: 60
    - path: "server/src/__tests__/errors-with-code.test.ts"
      provides: "Unit test for *WithCode() helpers"
      min_lines: 30
  key_links:
    - from: "server/src/routes/companies.ts (and 6 sibling routes)"
      to: "server/src/errors.ts *WithCode() helpers"
      via: "throw badRequestWithCode(msg, code, details?)"
      pattern: "(badRequest|notFound|forbidden|unauthorized|conflict|unprocessable)WithCode\\("
    - from: "server/src/middleware/error-handler.ts"
      to: "Express response body"
      via: "res.status().json({error, code?, details?})"
      pattern: "err\\.code \\? \\{ code: err\\.code \\}"
---

<objective>
Estender a infraestrutura de erros do servidor para emitir códigos de erro estáveis no body da resposta JSON, sem quebrar os ~130 callsites existentes de `HttpError`. Adicionar campo `code?: string` opcional ao `HttpError`, novos helpers `*WithCode()` paralelos aos existentes (preservando assinatura legada), atualizar o `errorHandler` middleware para emitir `code` quando presente, atualizar o tratamento de `ZodError` para emitir `code: "validation.error"` + códigos por-issue derivados de `issue.code`, e migrar ~40 callsites prioritários em routes de alta-visibilidade UI (auth/companies/issues/agents/projects/routines/plugins) para usar os novos helpers com códigos canônicos.

Purpose: Habilita o lado-cliente (Plano 09-03b) a mapear `error.code → t("errors:${code}")` para tradução determinística de mensagens de erro de API. Server permanece em inglês (operadores leem logs em inglês — decisão locked CONTEXT.md); cliente traduz. Sem este plano, Plano 09-03b cai sempre no fallback `t("errors:generic.unknown")` + raw message (Pitfall 5 do RESEARCH).

Output: HttpError extended + 6 helpers `*WithCode()` + error-handler emit shape + ~40 priority callsites migrados + 2 testes (unit do helper + integration do middleware).
</objective>

<execution_context>
@./.claude/framework/workflows/execute-plan.md
@./.claude/framework/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/09-traducao-ui-admin-auth-sistemicas/09-CONTEXT.md
@.planning/phases/09-traducao-ui-admin-auth-sistemicas/09-RESEARCH.md
@.planning/phases/09-traducao-ui-admin-auth-sistemicas/09-VALIDATION.md

@server/src/errors.ts
@server/src/middleware/error-handler.ts
@server/src/middleware/validate.ts

<interfaces>
<!-- Estado atual do server/src/errors.ts (verificado em RESEARCH.md linhas 466-478) -->

```typescript
// server/src/errors.ts (atual)
export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Helpers existentes (NÃO MUDAR ASSINATURA):
export function badRequest(message: string, details?: unknown): HttpError;
export function notFound(message: string, details?: unknown): HttpError;
export function forbidden(message: string, details?: unknown): HttpError;
export function unauthorized(message: string, details?: unknown): HttpError;
export function conflict(message: string, details?: unknown): HttpError;
export function unprocessable(message: string, details?: unknown): HttpError;
```

```typescript
// server/src/middleware/error-handler.ts (atual, linhas 35-78)
// Para HttpError:
res.status(err.status).json({
  error: err.message,
  ...(err.details ? { details: err.details } : {}),
});

// Para ZodError:
res.status(400).json({
  error: "Validation error",
  details: err.errors,
});
```

<!-- Códigos canônicos a serem usados pelos callsites prioritários (ver RESEARCH §"Code naming convention" linhas 584-600) -->
- `auth.session.expired`, `auth.invalid-credentials`
- `validation.{zod-issue-code}` (e.g., `validation.invalid_string`, `validation.too_small`)
- `validation.{field}.{constraint}` (e.g., `validation.email.invalid`)
- `company.not-found`, `company.archive-failed`, `company.last-owner`
- `member.role.invalid`, `member.update-failed`
- `issue.title.required`, `issue.assignee.not-member`
- `agent.create-failed`, `plugin.install-failed`
- `invite.expired`, `invite.revoked`, `invite.already-used`
- `generic.unknown`, `generic.network-error`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Tarefa 1: Estender HttpError + criar helpers *WithCode() + testes</name>
  <files>server/src/errors.ts, server/src/__tests__/errors-with-code.test.ts</files>
  <behavior>
    - Test 1: `new HttpError(404, "msg")` continua funcionando (3rd arg `details?` opcional, sem `code`)
    - Test 2: `new HttpError(404, "msg", "details")` continua funcionando (3rd arg posicional para details legado)
    - Test 3: `notFoundWithCode("msg", "company.not-found")` retorna instância com `.status === 404`, `.message === "msg"`, `.code === "company.not-found"`, `.details === undefined`
    - Test 4: `badRequestWithCode("msg", "validation.email.invalid", { field: "email" })` retorna `.code === "validation.email.invalid"` + `.details === { field: "email" }`
    - Test 5: Cada um dos 6 helpers `*WithCode()` retorna `HttpError` com status correto: badRequest=400, notFound=404, forbidden=403, unauthorized=401, conflict=409, unprocessable=422
    - Test 6: Helpers legados (`badRequest`, `notFound`, etc.) continuam exportados e funcionais sem mudança de assinatura
  </behavior>
  <action>
    **CRÍTICO (Pitfall 1 do RESEARCH):** NÃO mudar a assinatura de `HttpError(status, message, details?)` nem dos helpers existentes. Adicionar campos/helpers PARALELOS, preservando 100% backward compat.

    1. Editar `server/src/errors.ts`:
       - Manter constructor existente `constructor(status: number, message: string, details?: unknown)` byte-por-byte
       - Adicionar campo opcional `code?: string` à classe
       - Adicionar overload via método estático OU via constructor sobrecarregado:
         ```typescript
         export class HttpError extends Error {
           status: number;
           code?: string;
           details?: unknown;
           constructor(status: number, message: string, details?: unknown) {
             super(message);
             this.status = status;
             this.details = details;
           }
         }
         ```
       - Adicionar 6 novos helpers paralelos (NÃO substituir os existentes):
         ```typescript
         export function badRequestWithCode(message: string, code: string, details?: unknown): HttpError {
           const err = new HttpError(400, message, details);
           err.code = code;
           return err;
         }
         // + notFoundWithCode (404), forbiddenWithCode (403), unauthorizedWithCode (401),
         //   conflictWithCode (409), unprocessableWithCode (422)
         ```
       - Manter os 6 helpers legados (`badRequest`, `notFound`, etc.) intocados.

    2. Criar `server/src/__tests__/errors-with-code.test.ts`:
       - Importar `HttpError`, todos 6 helpers `*WithCode()`, e os 6 legados
       - 6 describe blocks (um por helper *WithCode), cada um com asserts de status/code/details
       - 1 describe block "backward compat" verificando que os 6 helpers legados retornam instâncias sem `.code` (ou `code === undefined`)
       - Usar `vitest` (já em uso no workspace server)

    3. Confirmar via `pnpm --filter @paperclipai/server test:run -- errors-with-code` que os 6+ testes passam.

    Endereça parte de UI-07 (decisão CONTEXT: server emite código + params; client traduz).
  </action>
  <verify>
    <automated>pnpm --filter @paperclipai/server test:run -- errors-with-code</automated>
  </verify>
  <done>HttpError tem campo `code?: string`; 6 novos helpers `*WithCode()` exportados; 6 helpers legados intocados (assinatura preservada); arquivo de teste com 7+ test cases todos GREEN; pnpm typecheck server exit 0.</done>
</task>

<task type="auto" tdd="true">
  <name>Tarefa 2: Atualizar errorHandler middleware para emitir code + ZodError shape</name>
  <files>server/src/middleware/error-handler.ts, server/src/middleware/__tests__/error-handler-emits-code.test.ts</files>
  <behavior>
    - Test 1: `throw new HttpError(404, "Not found")` (sem code) → response body é `{ error: "Not found" }` (shape legado preservado)
    - Test 2: `throw notFoundWithCode("Company X not found", "company.not-found")` → response body é `{ error: "Company X not found", code: "company.not-found" }`
    - Test 3: `throw badRequestWithCode("Validation failed", "validation.email.invalid", { field: "email" })` → response body é `{ error: "Validation failed", code: "validation.email.invalid", details: { field: "email" } }`
    - Test 4: ZodError de schema parse falha → response body é `{ error: "Validation error", code: "validation.error", details: [{ path, code: "validation.{issue.code}", message }] }` para cada issue
    - Test 5: Generic Error não-HttpError continua emitindo `{ error: "Internal server error" }` com status 500 (legado preservado)
  </behavior>
  <action>
    1. Editar `server/src/middleware/error-handler.ts`:
       - Localizar branch `if (err instanceof HttpError)` (linha ~52-56) e atualizar response shape:
         ```typescript
         res.status(err.status).json({
           error: err.message,
           ...(err.code ? { code: err.code } : {}),
           ...(err.details ? { details: err.details } : {}),
         });
         ```
       - Localizar branch `if (err instanceof ZodError)` (linha ~59-62) e atualizar:
         ```typescript
         res.status(400).json({
           error: "Validation error",
           code: "validation.error",
           details: err.errors.map((issue) => ({
             path: issue.path.join("."),
             code: `validation.${issue.code}`,
             message: issue.message,
           })),
         });
         return;
         ```
       - Demais branches (catch-all 500, etc.) intocados.

    2. Criar `server/src/middleware/__tests__/error-handler-emits-code.test.ts`:
       - Setup express app mínimo com `errorHandler` mounted no fim
       - Rota `/test-legacy` que `throw new HttpError(404, "X")` → assert body `{ error: "X" }` (sem code/details keys)
       - Rota `/test-with-code` que `throw notFoundWithCode("Y", "company.not-found")` → assert body inclui `code: "company.not-found"`
       - Rota `/test-with-code-details` que `throw badRequestWithCode(...)` com details → assert body inclui code + details
       - Rota `/test-zod` com middleware `validate(schema)` onde schema = `z.object({email: z.string().email()})`, POST com body inválido → assert body é `{ error: "Validation error", code: "validation.error", details: [{path: "email", code: "validation.invalid_string", message: ...}] }`
       - Rota `/test-generic` que `throw new Error("Boom")` → assert status 500 + body `{ error: "Internal server error" }` (ou shape legado atual — verificar primeiro o comportamento existente)
       - Usar `supertest` (já em uso no workspace server — confirmar via grep `from "supertest"` em arquivos de teste server existentes; se ausente, usar fetch-mock dentro de test app handler).

    3. Rodar `pnpm --filter @paperclipai/server test:run -- error-handler-emits-code` e confirmar 5 testes GREEN.

    4. Rodar suite full do server para confirmar zero regressão: `pnpm --filter @paperclipai/server test:run`. Aceitar pre-existing failures documentadas no STATE.md (adapter shebang Windows + workspace-runtime taskkill ENOENT — fora de escopo).

    Endereça UI-07 (server emit shape).
  </action>
  <verify>
    <automated>pnpm --filter @paperclipai/server test:run -- error-handler-emits-code</automated>
  </verify>
  <done>error-handler.ts emite `code` opcional + ZodError com `code: "validation.error"` + per-issue codes; 5 testes integration GREEN; full server suite mantém pre-existing failures (não introduz novas).</done>
</task>

<task type="auto">
  <name>Tarefa 3: Migrar ~40 callsites prioritários para *WithCode() helpers</name>
  <files>server/src/routes/companies.ts, server/src/routes/access.ts, server/src/routes/issues.ts, server/src/routes/agents.ts, server/src/routes/projects.ts, server/src/routes/routines.ts, server/src/routes/plugins.ts</files>
  <action>
    Migração incremental (NÃO precisa cobrir 130+ callsites — apenas os ~40 prioritários em routes de alta visibilidade UI). Manter callsites legados intocados (cairão em fallback `errors:generic.unknown` no client, comportamento aceitável conforme decisão locked).

    **Códigos canônicos para mapeamento** (ver RESEARCH §"Code naming convention" linhas 584-600 e Pattern E linhas 908-919):

    1. `server/src/routes/companies.ts` — substituir nos throws principais:
       - "not found" → `notFoundWithCode("Company {id} not found", "company.not-found")`
       - archive failures → `conflictWithCode(msg, "company.archive-failed")` ou `unprocessableWithCode`
       - last-owner check → `conflictWithCode(msg, "company.last-owner")`
       - update conflicts → conforme aplicável

    2. `server/src/routes/access.ts` — invite/board-claim errors:
       - invite expired → `unprocessableWithCode(msg, "invite.expired")`
       - invite revoked → `unprocessableWithCode(msg, "invite.revoked")`
       - invite already used → `conflictWithCode(msg, "invite.already-used")`
       - member role invalid → `badRequestWithCode(msg, "member.role-invalid")`
       - member update failed → `conflictWithCode(msg, "member.update-failed")`

    3. `server/src/routes/issues.ts` (8 callsites):
       - title required → `badRequestWithCode(msg, "issue.title.required")`
       - assignee not member → `unprocessableWithCode(msg, "issue.assignee.not-member")`
       - issue not found → `notFoundWithCode(msg, "issue.not-found")`

    4. `server/src/routes/agents.ts` — create/update errors:
       - agent not found → `notFoundWithCode(msg, "agent.not-found")`
       - create failed → `conflictWithCode(msg, "agent.create-failed")`

    5. `server/src/routes/projects.ts` — create/update errors:
       - project not found → `notFoundWithCode(msg, "project.not-found")`
       - create failed → `conflictWithCode(msg, "project.create-failed")`

    6. `server/src/routes/routines.ts` (7 callsites):
       - routine not found → `notFoundWithCode(msg, "routine.not-found")`
       - validation errors → `badRequestWithCode(msg, "routine.{specific}")`

    7. `server/src/routes/plugins.ts` (9 callsites):
       - plugin not found → `notFoundWithCode(msg, "plugin.not-found")`
       - install failed → `conflictWithCode(msg, "plugin.install-failed")`
       - validation → `badRequestWithCode(msg, "plugin.{specific}")`

    **Procedimento por arquivo:**
    1. Read o arquivo completo
    2. Grep `(badRequest|notFound|forbidden|unauthorized|conflict|unprocessable)\(` para listar callsites
    3. Para cada callsite QUE TEM significado UI claro (mensagem é mostrada ao usuário), substituir por `*WithCode(msg, "code", details?)` mantendo a mesma mensagem em inglês
    4. Para callsites internos (debug, edge cases raros), DEIXAR INTOCADOS — fallback `errors:generic.unknown` é aceitável
    5. Imports: adicionar `badRequestWithCode, notFoundWithCode, conflictWithCode, unprocessableWithCode` ao import de `../errors` conforme uso

    **Anti-pattern (Pitfall 1):** NÃO mudar callsites legados como `badRequest("...", details)` para `badRequestWithCode("...", code, details)` se o callsite não tem mensagem visível ao usuário — preserve esforço para os ~40 prioritários.

    **Validação incremental:** Após cada arquivo, rodar `pnpm --filter @paperclipai/server typecheck` para garantir zero TS errors.

    Endereça UI-07 (priority server emit).
  </action>
  <verify>
    <automated>pnpm --filter @paperclipai/server typecheck && pnpm --filter @paperclipai/server test:run -- error-handler-emits-code routes</automated>
  </verify>
  <done>~40 callsites prioritários migrados para `*WithCode()` com códigos canônicos do convention; servidor typecheck exit 0; testes existentes das routes migradas continuam GREEN (zero regressão); pre-existing failures (Windows adapter shebang) preservadas.</done>
</task>

</tasks>

<verification>
1. `pnpm --filter @paperclipai/server test:run -- errors-with-code error-handler-emits-code` → 12+ testes GREEN
2. `pnpm --filter @paperclipai/server typecheck` → exit 0
3. `pnpm --filter @paperclipai/server test:run` → suite full mantém apenas pre-existing failures documentadas em `.planning/phases/06-multi-projeto-polish/deferred-items.md`
4. Grep `(badRequestWithCode|notFoundWithCode|conflictWithCode|unprocessableWithCode|forbiddenWithCode|unauthorizedWithCode)` em routes/ retorna ≥40 matches
5. Grep `code: err.code` em error-handler.ts retorna 1 match
</verification>

<success_criteria>
- HttpError carries optional `code` field
- 6 new `*WithCode()` helpers exported and tested
- error-handler emits `{error, code?, details?}` shape (legacy preserved when code absent)
- ZodError emits `code: "validation.error"` + per-issue `code: "validation.{issue.code}"`
- ~40 priority callsites in 7 routes migrated to `*WithCode()` with canonical codes
- Zero regression on legacy callsites (130+ untouched, continue emitting `{error}` body)
- All new tests GREEN; full server suite preserves only pre-existing failures
</success_criteria>

<output>
After completion, create `.planning/phases/09-traducao-ui-admin-auth-sistemicas/09-03a-SUMMARY.md` documenting:
- HttpError shape change (additive)
- Mapping of priority codes → callsites (table)
- Decision rationale: novos helpers vs. extend signature (Pitfall 1)
- Open Question #1 resolution (recommendation `(b)` — novos helpers)
- Migration count: X/130 callsites (priority subset)
</output>
</content>
</invoke>