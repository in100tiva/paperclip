---
phase: 09-traducao-ui-admin-auth-sistemicas
plan: 03b
type: execute
wave: 1
depends_on: []
files_modified:
  - ui/src/api/client.ts
  - ui/src/api/__tests__/client.code.test.ts
  - ui/src/lib/translateApiError.ts
  - ui/src/lib/__tests__/translateApiError.test.ts
  - ui/src/i18n/locales/pt-BR/errors.json
  - ui/src/i18n/locales/en-US/errors.json
autonomous: true
requirements:
  - UI-07
must_haves:
  truths:
    - "ApiError client class exposes parsed `.code` field from response body"
    - "translateApiError(error, t) helper returns translated title when error.code maps to errors.json key"
    - "translateApiError falls back to t('errors:generic.unknown') + raw message body in italics when code missing or unmapped"
    - "errors.json populated with full sub-trees: generic.*, validation.*, auth.*, company.*, member.*, invite.*, issue.*, agent.*, project.*, routine.*, plugin.* (both pt-BR and en-US)"
    - "Existing 8 namespaces and ~605 keys (Phase 7-8) remain intact"
  artifacts:
    - path: "ui/src/api/client.ts"
      provides: "ApiError class with optional .code"
      contains: "code?: string"
    - path: "ui/src/lib/translateApiError.ts"
      provides: "translateApiError helper"
      exports: ["translateApiError"]
    - path: "ui/src/lib/__tests__/translateApiError.test.ts"
      provides: "Helper unit tests covering 4 scenarios"
      min_lines: 80
    - path: "ui/src/api/__tests__/client.code.test.ts"
      provides: "ApiError unit tests covering body.code parsing"
      min_lines: 30
    - path: "ui/src/i18n/locales/pt-BR/errors.json"
      provides: "Full pt-BR error code dictionary"
      contains: "generic"
    - path: "ui/src/i18n/locales/en-US/errors.json"
      provides: "Mirror en-US dictionary"
      contains: "generic"
  key_links:
    - from: "ui/src/lib/translateApiError.ts"
      to: "errors.json sub-trees"
      via: "t(`errors:${error.code}`, params, { defaultValue: null })"
      pattern: "t\\(`errors:\\$\\{"
    - from: "ui/src/api/client.ts ApiError"
      to: "Server response body.code"
      via: "constructor parses (body as { code? }).code"
      pattern: "\\.code = \\(body"
---

<objective>
Construir a infraestrutura cliente para traduzir erros de API server-emitted: estender `ApiError` (em `ui/src/api/client.ts`) para parsear o campo `code` do response body, criar o helper canônico `translateApiError(error, t)` em `ui/src/lib/translateApiError.ts` que mapeia `error.code → t("errors:${code}")` com fallback gracioso para erros legados sem code, e popular completamente os dicionários `ui/src/i18n/locales/{pt-BR,en-US}/errors.json` (atualmente `{}`) com sub-trees canônicas cobrindo validação Zod + auth (Better Auth codes) + company/member/invite/issue/agent/project/routine/plugin codes derivados do convention do RESEARCH.

Purpose: Sem este plano, mesmo que o servidor (Plano 09-03a) emita códigos, o cliente não tem como traduzi-los. Este plano fornece a única peça-fim para Planos 09-01 e 09-02 consumirem `translateApiError(err, t)` em `pushToast({...translateApiError(err, t), tone: "error"})` e renderizarem mensagens em pt-BR.

Output: ApiError com `.code` parseado + helper canônico `translateApiError` + 2 dicionários `errors.json` completamente populados + 2 arquivos de teste.
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

@ui/src/api/client.ts
@ui/src/i18n/resources.ts
@ui/src/i18n/locales/pt-BR/errors.json
@ui/src/i18n/locales/en-US/errors.json
@ui/src/i18n/__tests__/missing-keys.test.ts

<interfaces>
<!-- Estado atual de ui/src/api/client.ts:3-13 (verificado em RESEARCH.md linha 13) -->

```typescript
// ApiError atual (linhas 3-13)
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}
```

<!-- Estado atual de errors.json (verificado: arquivo existe mas conteúdo é `{}`) -->

```json
{}
```

<!-- Dicionário canônico bootstrap (do RESEARCH §"errors.json bootstrap" linhas 605-647) -->
<!-- Reproduzido como REFERÊNCIA — implementação deve seguir essa estrutura literal -->

```json
{
  "generic": {
    "unknown": "Algo deu errado.",
    "network-error": "Erro de rede. Verifique sua conexão.",
    "internal-server-error": "Erro interno do servidor."
  },
  "validation": {
    "error": "Erro de validação",
    "required": "Este campo é obrigatório.",
    "required-fields": "Preencha todos os campos obrigatórios.",
    "invalid_string": "Valor inválido.",
    "invalid_email": "Email inválido.",
    "too_small": "Valor muito curto.",
    "too_big": "Valor muito longo.",
    "email": { "invalid": "Endereço de email inválido." },
    "password": { "too-short": "Senha muito curta. Mínimo 8 caracteres." }
  },
  "auth": {
    "user-already-exists": "Já existe uma conta para {{email}}. Entre abaixo para continuar.",
    "invalid-email-or-password": "Email ou senha não correspondem a uma conta Paperclip.",
    "request-failed-401": "Email ou senha inválidos.",
    "request-failed-422": "Talvez já exista uma conta para {{email}}. Tente fazer login.",
    "session-expired": "Sessão expirada.",
    "invalid-credentials": "Credenciais inválidas."
  },
  "company": {
    "not-found": "Empresa não encontrada.",
    "archive-failed": "Falha ao arquivar empresa.",
    "last-owner": "Não é possível remover o último proprietário."
  },
  "member": {
    "role-invalid": "Função inválida.",
    "update-failed": "Falha ao atualizar membro."
  },
  "invite": {
    "expired": "Convite expirado.",
    "revoked": "Convite revogado.",
    "already-used": "Convite já usado."
  },
  "issue": {
    "title": { "required": "Título é obrigatório." },
    "assignee": { "not-member": "Responsável precisa ser membro da empresa." },
    "not-found": "Tarefa não encontrada."
  },
  "agent": {
    "not-found": "Agente não encontrado.",
    "create-failed": "Falha ao criar agente."
  },
  "project": {
    "not-found": "Projeto não encontrado.",
    "create-failed": "Falha ao criar projeto."
  },
  "routine": { "not-found": "Rotina não encontrada." },
  "plugin": {
    "not-found": "Plugin não encontrado.",
    "install-failed": "Falha ao instalar plugin."
  }
}
```

<!-- Mirror en-US (deve ter EXATAMENTE as mesmas keys, valores em inglês) -->
<!-- Detector missing-keys (Phase 7) compara estrutura entre locales — keys ausentes em um locale = build error em CI -->

<!-- ProfileSettings.tsx canonical example de useTranslation pattern (do contexto inicial) -->
```typescript
import { useTranslation } from "react-i18next";
const { t, i18n } = useTranslation(["settings", "common"]);
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Tarefa 1: Estender ApiError com .code + popular errors.json (pt-BR + en-US)</name>
  <files>ui/src/api/client.ts, ui/src/api/__tests__/client.code.test.ts, ui/src/i18n/locales/pt-BR/errors.json, ui/src/i18n/locales/en-US/errors.json</files>
  <behavior>
    - Test 1: `new ApiError("msg", 404, { error: "msg", code: "company.not-found" })` produz instância com `.code === "company.not-found"`
    - Test 2: `new ApiError("msg", 404, { error: "msg" })` (sem code) produz `.code === undefined`
    - Test 3: `new ApiError("msg", 500, null)` produz `.code === undefined` (não throw)
    - Test 4: `new ApiError("msg", 400, "raw string body")` produz `.code === undefined` (graceful para body não-objeto)
  </behavior>
  <action>
    1. Editar `ui/src/api/client.ts` (Read primeiro para ver estado real — linhas 3-13 indicadas em RESEARCH):
       - Adicionar campo `code?: string;` à classe ApiError
       - Atualizar constructor para parsear:
         ```typescript
         this.code = (body && typeof body === "object" && "code" in body)
           ? ((body as { code?: unknown }).code as string | undefined) ?? undefined
           : undefined;
         ```
       - NÃO mudar assinatura existente do constructor (`message, status, body`) — apenas adicionar o parse interno

    2. Criar `ui/src/api/__tests__/client.code.test.ts`:
       - 4 vitest cases conforme behavior acima
       - Importar `ApiError` de `../client`

    3. Substituir `ui/src/i18n/locales/pt-BR/errors.json` (atualmente `{}`) pelo dicionário completo do bloco `<interfaces>` acima.

    4. Criar mirror `ui/src/i18n/locales/en-US/errors.json` com as MESMAS keys, valores em inglês:
       ```json
       {
         "generic": {
           "unknown": "Something went wrong.",
           "network-error": "Network error. Check your connection.",
           "internal-server-error": "Internal server error."
         },
         "validation": {
           "error": "Validation error",
           "required": "This field is required.",
           "required-fields": "Please fill in all required fields.",
           "invalid_string": "Invalid value.",
           "invalid_email": "Invalid email.",
           "too_small": "Value too short.",
           "too_big": "Value too long.",
           "email": { "invalid": "Invalid email address." },
           "password": { "too-short": "Password too short. Minimum 8 characters." }
         },
         "auth": {
           "user-already-exists": "An account already exists for {{email}}. Sign in below to continue.",
           "invalid-email-or-password": "Email or password do not match a Paperclip account.",
           "request-failed-401": "Invalid email or password.",
           "request-failed-422": "An account may already exist for {{email}}. Try signing in.",
           "session-expired": "Session expired.",
           "invalid-credentials": "Invalid credentials."
         },
         "company": {
           "not-found": "Company not found.",
           "archive-failed": "Failed to archive company.",
           "last-owner": "Cannot remove the last owner."
         },
         "member": {
           "role-invalid": "Invalid role.",
           "update-failed": "Failed to update member."
         },
         "invite": {
           "expired": "Invite expired.",
           "revoked": "Invite revoked.",
           "already-used": "Invite already used."
         },
         "issue": {
           "title": { "required": "Title is required." },
           "assignee": { "not-member": "Assignee must be a member of the company." },
           "not-found": "Issue not found."
         },
         "agent": {
           "not-found": "Agent not found.",
           "create-failed": "Failed to create agent."
         },
         "project": {
           "not-found": "Project not found.",
           "create-failed": "Failed to create project."
         },
         "routine": { "not-found": "Routine not found." },
         "plugin": {
           "not-found": "Plugin not found.",
           "install-failed": "Failed to install plugin."
         }
       }
       ```

    5. Validar JSON: `node -e 'JSON.parse(require("fs").readFileSync("ui/src/i18n/locales/pt-BR/errors.json"))' && node -e 'JSON.parse(require("fs").readFileSync("ui/src/i18n/locales/en-US/errors.json"))'`

    6. Rodar `pnpm --filter @paperclipai/ui test:run -- client.code` → 4 GREEN.

    7. Rodar `CI=true pnpm --filter @paperclipai/ui test:run -- missing-keys` para confirmar que os dicionários populados não introduzem keys órfãs (apenas keys realmente usadas em código devem aparecer; este passo é validação estrutural — se o detector reclamar de keys NÃO USADAS em código nesta tarefa, isso é OK, pois Planos 09-01/02/04 vão consumi-las).

    Endereça UI-07 (client parse + dictionaries).
  </action>
  <verify>
    <automated>pnpm --filter @paperclipai/ui test:run -- client.code</automated>
  </verify>
  <done>ApiError parseia `body.code` graciosamente; errors.json populado em ambos locales com 11 sub-trees alinhadas; 4 testes ApiError GREEN; pnpm --filter @paperclipai/ui typecheck exit 0; arquivos JSON válidos.</done>
</task>

<task type="auto" tdd="true">
  <name>Tarefa 2: Criar translateApiError helper + testes</name>
  <files>ui/src/lib/translateApiError.ts, ui/src/lib/__tests__/translateApiError.test.ts</files>
  <behavior>
    - Test 1: `translateApiError(new ApiError("Not found", 404, { error: "Not found", code: "company.not-found" }), tMock)` retorna `{ title: "Empresa não encontrada." }` quando t resolve a key (no body)
    - Test 2: `translateApiError(new ApiError("Whatever", 400, { error: "Whatever", code: "unmapped.code" }), tMock)` retorna `{ title: t("errors:generic.unknown"), body: "Whatever" }` (fallback porque defaultValue: null retorna null)
    - Test 3: `translateApiError(new Error("Network failure"), tMock)` (não-ApiError) retorna `{ title: t("errors:generic.unknown"), body: "Network failure" }`
    - Test 4: `translateApiError("string error", tMock)` retorna `{ title: t("errors:generic.unknown"), body: "string error" }`
    - Test 5: `translateApiError(new ApiError("X", 400, { error: "X", code: "auth.user-already-exists", params: { email: "a@b.com" } }), tMock)` retorna `{ title: "Já existe uma conta para a@b.com..." }` com interpolação params (server pode emitir `params` no body — opcional)
  </behavior>
  <action>
    1. Criar `ui/src/lib/translateApiError.ts`:
       ```typescript
       import type { TFunction } from "i18next";
       import { ApiError } from "@/api/client";

       export interface TranslatedError {
         title: string;
         body?: string;
       }

       export function translateApiError(error: unknown, t: TFunction): TranslatedError {
         if (error instanceof ApiError && error.code) {
           const params = (error.body && typeof error.body === "object" && "params" in error.body)
             ? ((error.body as { params?: Record<string, unknown> }).params ?? {})
             : {};
           const translated = t(`errors:${error.code}`, { ...params, defaultValue: null as unknown as string });
           if (translated && translated !== `errors:${error.code}`) {
             return { title: translated };
           }
         }
         const rawMessage = error instanceof Error ? error.message : String(error);
         return {
           title: t("errors:generic.unknown"),
           body: rawMessage,
         };
       }
       ```

    2. Criar `ui/src/lib/__tests__/translateApiError.test.ts`:
       - Importar `translateApiError` + `ApiError`
       - Mock `t: TFunction` com implementação que:
         - Resolve `errors:company.not-found` → "Empresa não encontrada."
         - Resolve `errors:auth.user-already-exists` → "Já existe uma conta para {{email}}. Entre abaixo para continuar." com interpolação simples manual no mock
         - Resolve `errors:generic.unknown` → "Algo deu errado."
         - Para qualquer outra key + `defaultValue: null` retorna `null` (simulando i18next behavior)
       - 5 vitest cases conforme behavior acima
       - Pattern do mock t (simples, sem i18next real):
         ```typescript
         const tMock = ((key: string, options?: any) => {
           const dict: Record<string, string> = {
             "errors:company.not-found": "Empresa não encontrada.",
             "errors:generic.unknown": "Algo deu errado.",
             "errors:auth.user-already-exists": "Já existe uma conta para {{email}}. Entre abaixo para continuar.",
           };
           const raw = dict[key];
           if (!raw && options?.defaultValue === null) return null;
           if (!raw) return key;
           // crude interpolation
           if (options) {
             return raw.replace(/\{\{(\w+)\}\}/g, (_, name) => String(options[name] ?? `{{${name}}}`));
           }
           return raw;
         }) as unknown as TFunction;
         ```

    3. Rodar `pnpm --filter @paperclipai/ui test:run -- translateApiError` → 5 GREEN.

    4. Rodar `CI=true pnpm --filter @paperclipai/ui test:run -- missing-keys` → confirmar que keys novas adicionadas pelo helper-test (`errors:generic.unknown`, etc.) não quebram detector (já estão em errors.json da Tarefa 1).

    5. Rodar `pnpm --filter @paperclipai/ui typecheck` exit 0.

    Endereça UI-07 (helper canônico).
  </action>
  <verify>
    <automated>pnpm --filter @paperclipai/ui test:run -- translateApiError</automated>
  </verify>
  <done>translateApiError exportado em `ui/src/lib/translateApiError.ts`; 5 testes GREEN; pnpm --filter @paperclipai/ui typecheck exit 0; missing-keys CI=true detector GREEN.</done>
</task>

</tasks>

<verification>
1. `pnpm --filter @paperclipai/ui test:run -- client.code translateApiError` → 9 testes GREEN
2. `pnpm --filter @paperclipai/ui typecheck` → exit 0
3. `CI=true pnpm --filter @paperclipai/ui test:run -- missing-keys` → exit 0
4. `node -e 'JSON.parse(...)'` em ambos errors.json → válidos
5. Diff key counts: pt-BR/errors.json e en-US/errors.json têm exatamente os mesmos keys (paridade estrutural)
</verification>

<success_criteria>
- ApiError class exposes `.code` parsed from body
- translateApiError helper handles 4 paths: ApiError+code+mapped, ApiError+code+unmapped, ApiError+no-code, non-ApiError
- errors.json (pt-BR + en-US) populated with 11 sub-trees: generic, validation, auth, company, member, invite, issue, agent, project, routine, plugin
- Keys parity between locales (detector clean)
- 9 unit tests GREEN; full UI suite preserves Phase 7-8 GREEN status
</success_criteria>

<output>
After completion, create `.planning/phases/09-traducao-ui-admin-auth-sistemicas/09-03b-SUMMARY.md` documenting:
- ApiError shape change (additive)
- translateApiError API contract (signature + return shape)
- errors.json structure (11 sub-trees, ~50 leaf keys)
- Open Question #3 resolution (single error display — top-level title + raw details body)
</output>
</content>
</invoke>