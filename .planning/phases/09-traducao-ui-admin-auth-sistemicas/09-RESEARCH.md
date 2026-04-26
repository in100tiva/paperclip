# Phase 9: Tradução UI Admin + Auth + Mensagens Sistêmicas — Research

**Researched:** 2026-04-26
**Domain:** UI translation completion (admin/company + auth + system messages) sobre fundação i18n da Fase 7 e padrões da Fase 8
**Confidence:** HIGH

## Summary

A Fase 8 estabeleceu o padrão `useTranslation([...])` em produção (CompanySettings/ClaudeAccounts já parcialmente migrado em 08-03). A Fase 9 fecha as 4 superfícies restantes:

1. **Admin/company** (UI-04) — superfície principal: `CompanySettings.tsx` (1480 LOC, ~95 strings hardcoded restantes — Phase 8 cobriu apenas Claude pool toggle), `CompanyAccess.tsx` (679 LOC, ~75 strings — superfície zero), `CompanyInvites.tsx`, `JoinRequestQueue.tsx`, `OrgChart.tsx`, `Org.tsx`, `Companies.tsx`, `CompanyExport.tsx`, `CompanyImport.tsx`, `CompanySkills.tsx`, `Costs.tsx`. Note: `ClaudeAccounts.tsx` (480 LOC) já foi feito em 08-03 e aparece como referência do pattern.
2. **Auth** (UI-06) — `Auth.tsx` (185 LOC, ~25 strings), `BoardClaim.tsx` (126 LOC, ~20 strings), `CliAuth.tsx` (185 LOC, ~28 strings), `InviteLanding.tsx` (828 LOC, ~75 strings — maior). Better Auth não fornece UI customizada — todas as 4 telas são paperclip-built.
3. **Mensagens sistêmicas** (UI-07) — superfície arquitetural: server **NÃO emite hoje** códigos de erro estáveis. `HttpError(status, message, details)` em `server/src/errors.ts:1-10` carrega apenas string + details opaque. `ZodError` retorna `{ error: "Validation error", details: err.errors }`. Plano 09-03 estende `HttpError` com campo `code?: string` opcional, atualiza `error-handler.ts:52-56` para emitir `{ error, code, details }`, e ApiError client em `ui/src/api/client.ts:3-13` para expor `.code`.
4. **Tooltips/empty/modais/toasts** (UI-08) — `useToast()` em `ui/src/context/ToastContext.tsx:189-193` (custom, não sonner; aceita `{title, body, tone, action, ttlMs, dedupeKey}`). `Dialog` shadcn em `ui/src/components/ui/dialog.tsx`. `Tooltip` shadcn em `ui/src/components/ui/tooltip.tsx`. Padrão de tooltip atual: `t()` em `title` ou `aria-label` (já consolidado no Phase 8 — ex: `Inbox.tsx:298,1981`). `window.confirm` ainda usado em `CompanySettings.tsx:1332` (Archive company) — manter native confirm com string traduzida.

**Distribuição estimada de strings (heurística regex `aria-label=|title=|placeholder=|>[A-Z][a-z]`):**

| Superfície | Plano | Arquivos primários | LOC | Strings est. |
|------------|-------|-----|-----|---------------|
| Admin/Company | 09-01 | CompanySettings, CompanyAccess, CompanyInvites, JoinRequestQueue, OrgChart, Org, Companies, CompanyExport, CompanyImport, CompanySkills, Costs | ~5500 | ~280 |
| Auth | 09-02 | Auth, BoardClaim, CliAuth, InviteLanding | ~1325 | ~150 |
| Erros sistêmicos | 09-03 | server/errors.ts, error-handler.ts, validate.ts, ApiError client, util `t-error.ts` (novo) + ~30 callsites HttpError prioritários (~70 throws) | ~servidor + UI cross | ~80 codes |
| Tooltips/modais/toasts | 09-04 | cross-cutting: tooltips inline em telas core + 3 dialogs sistêmicos + ~40 callsites pushToast em arquivos JÁ tocados pelos planos 08-* e 09-01..03 | — | ~120 strings (60 toasts + 30 confirms + 30 tooltips) |

**Primary recommendation:** Executar 09-01 e 09-02 em paralelo (file sets disjuntos: company/* vs auth pages/*). 09-03 (errors) é **sequencial parcial** — as edições de servidor (HttpError extension, error-handler) podem rodar paralelas a 09-01/02, mas a tradução de `t("errors:code")` no client cruza com 09-01/02/04 (cada plano que toca uma página com erro deve usar o helper já-existente). 09-04 (tooltips/modais/toasts) é o **último** — depende de 09-01..03 estarem mergeados porque amarra ad-hoc strings de toast nas mesmas telas. Wave structure: Wave 0 (server error infrastructure + dictionary bootstrap), Wave 1 (planos 09-01, 09-02 paralelos + 09-03-server-emit), Wave 2 (09-03-client-translate + 09-04 cross-cutting).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-04 | Telas admin/company traduzidas (membros, roles, claude accounts pool, cost summary, rotation history) | Plano 09-01: extend namespace `settings` (sub-tree `company.*`) cobrindo `CompanySettings.tsx:605-1366` (general/appearance/environments/hiring/claude-pool/invites/import-export/danger-zone), `CompanyAccess.tsx:269-617` (Humans table + edit/remove dialogs + PendingJoinRequestCard), `CompanyInvites.tsx`, `JoinRequestQueue.tsx`, `OrgChart.tsx`, `Org.tsx`, `Companies.tsx`. ClaudeAccounts.tsx pool/cost/rotation history já feito em Plano 08-03 (linhas 70-486 já usam `useTranslation`). Cost summary table headers (`accountLabel`, `Cost USD`, `Input tokens`, `Output tokens`, `Steps`) — confirmado em ClaudeAccounts.tsx:336-351 (já traduzido). Rotation history — ClaudeAccounts.tsx:380-425 (já traduzido). |
| UI-06 | Formulários auth (login, signup, reset password, invite/board-claim) traduzidos | Plano 09-02: popula namespace `auth` (atualmente `{}`) cobrindo `Auth.tsx:75-184` (sign-in/sign-up unified form), `BoardClaim.tsx:43-125` (claim challenge), `CliAuth.tsx:47-184` (CLI approval challenge), `InviteLanding.tsx:215-827` (invite landing — agent form / human auth inline / accept flow / awaiting-approval panel / bootstrap-complete / joined-now). **Não há reset password** no codebase (Better Auth fornece se necessário; v1 não exposed). **Não há `Login.tsx`/`Signup.tsx` separados** — `Auth.tsx` é o único e tem toggle `mode: "sign_in" | "sign_up"`. |
| UI-07 | Mensagens de erro, validação de formulários e mensagens de API traduzidas | Plano 09-03: (a) extends `HttpError` com `code?: string` field; (b) atualiza `errorHandler` em `server/src/middleware/error-handler.ts:52-56` para emitir `{ error, code?, details? }`; (c) atualiza `ApiError` em `ui/src/api/client.ts:3-13` para parse `body.code`; (d) helper UI `ui/src/lib/translate-api-error.ts` (novo) que mapeia `error.code → t("errors:${code}")` com fallback para raw `error.message` em italics; (e) popula `errors.json` (atualmente `{}`) com codes de validação Zod canônicos (`validation.email.invalid`, `validation.required`, etc.) + ~40 codes mapeados de routes prioritárias. **130+ HttpError callsites no server** (grep confirmado em routes/) — apenas ~40 prioritários (auth/admin/issue create) recebem `code` em Wave 1; resto cai no fallback raw. Validação client: `Auth.tsx:101-104` usa `setError("Please fill in all required fields.")` ad-hoc; padronizar via helper `t("errors:validation.required-fields")`. |
| UI-08 | Tooltips, empty states, modais de confirmação e toasts traduzidos | Plano 09-04: (a) extends `common.json` com sub-trees `confirm.*` (modais de confirmação), `toast.*` (eventos sistêmicos genéricos), `tooltip.*` (não — tooltips ficam no namespace da feature); (b) varre `pushToast({title, body})` em ~40 callsites já tocados (CompanySettings.tsx:363-407, CompanyAccess.tsx:115-220, etc.) substituindo title/body por `t("ns:toast.{event}", params)`; (c) varre `window.confirm("...")` em CompanySettings.tsx:1332 (1 ocorrência confirmada) substituindo por `t("settings:company.danger-zone.archive-confirm", { name })`; (d) tooltips inline (já passam `title=` ou `aria-label=` via `t()` desde Fase 8 — verificar passagem completa nos arquivos das fases 09-01/02). Empty states (já cobertos parcialmente em 08-*): completar nas novas superfícies de 09-01. |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Reuso de padrões da Fase 8:**
- **Estratégia de extração:** manual via grep + edição inline (mesmo padrão Fase 8)
- **Granularidade:** um plano por superfície
  - 09-01: Admin/Company UI (UI-04) — CompanySettings + ClaudeAccounts + members/roles + cost summary + rotation history
  - 09-02: Auth forms (UI-06) — login/signup/reset/invite/board-claim
  - 09-03: Mensagens sistêmicas (UI-07) — errors/validation/API responses
  - 09-04: Tooltips/empty states/modais/toasts (UI-08) — sistêmicos
- **Padrões reusáveis:** STATUS_KEY enum→kebab pattern (ClaudeAccounts.tsx:42-47), _one/_other plurais via i18next nativo, useTranslation(["ns", "common"])
- **Wave structure:** 4 planos paralelos (file sets disjuntos: admin pages vs auth pages vs error/validation strings vs cross-cutting tooltips)

**Namespaces afetados:**
- `settings.json` — extension para admin/company sub-trees (membros, roles, claude pool extension)
- `auth.json` — populado totalmente (login/signup/reset/invite/board-claim)
- `errors.json` — populado totalmente (validação client + erros API responses)
- `common.json` — extension para tooltips/empty/confirm/toast genéricos

**Validação API responses:**
- **Erros de API traduzidos no client:** server emite código de erro estável (ex: `"validation.email.invalid"`); client mapeia para `t("errors:validation.email-invalid")`. Reusa contrato Phase 7 (locale do request).
- **Server NÃO retorna strings traduzidas em produção** — código + params; client traduz. Mantém DB/log estável.
- **Errors legacy (sem código)** caem em fallback genérico `t("errors:generic.unknown")` + display do raw message em italics.

**Padrões para tooltips/modais/toasts (UI-08):**
- **Tooltips usam `t()` em prop `title` ou `aria-label`** — não em texto visível dentro de Tooltip component (a menos que existente)
- **Modais de confirmação:** `t("common:confirm.{action}.title")` + `body` + `cta-confirm` + `cta-cancel`
- **Toasts:** estrutura `t("common:toast.{event}")` + interpolação params

### Claude's Discretion

- Granularidade de sub-namespaces dentro de cada arquivo JSON
- Ordem de tradução das strings dentro de cada superfície
- Mapeamento exato de códigos de erro → keys (executor decide via grep do server emit + alinhamento client)

### Deferred Ideas (OUT OF SCOPE)

- Tradução de auth providers externos (Better Auth UI components não-customizados) — aceitar inglês default; v2 se demandar.
- Tradução de mensagens de erro raw do banco/Postgres → fora de escopo (REQUIREMENTS.md já exclui).
</user_constraints>

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` ausente no diretório. Constraints derivam do CONTEXT.md, padrões consolidados (Phase 7-8) e config do repositório:
- TypeScript strict, vitest 3.0.5
- Drizzle migrations sequenciais (DB-03)
- Sem `db:migrate` local; migrations aplicadas via `.github/workflows/db-migrate.yml`
- Detector i18n missing-keys em CI (bloqueante quando `process.env.CI`)
- `commit_docs: true` em `.planning/config.json` — RESEARCH.md deve ter commit no git
- `nyquist_validation: true` — seção Validation Architecture obrigatória

## Standard Stack

Sem novas dependências. Tudo herdado da Fase 7-8:

| Library | Version | Purpose |
|---------|---------|---------|
| `i18next` | 26.0.8 | Translation engine |
| `react-i18next` | 17.0.4 | React bindings |
| `vitest` | 3.0.5 | Detector + RTL tests |
| `zod` | (inline em server) | Validação body de routes — gera `ZodError` capturado por errorHandler |

**Server Express error middleware** (`server/src/middleware/error-handler.ts`) — modificado por 09-03 para emitir `code` opcional. `HttpError` em `server/src/errors.ts` recebe `code?: string` (3rd construtor arg → 4th, ou nova field).

## Architecture Patterns

### Pattern 1: Reuso do STATUS_KEY enum→kebab (do Phase 8-03)

Padrão canônico estabelecido em `ClaudeAccounts.tsx:42-47`:

```typescript
const STATUS_KEY: Record<ClaudeAccountStatus, "settings:claude-accounts.status.live" | ...> = {
  live: "settings:claude-accounts.status.live",
  exhausted: "settings:claude-accounts.status.exhausted",
  cooldown: "settings:claude-accounts.status.cooldown",
  disabled: "settings:claude-accounts.status.disabled",
};
```

**Aplicação em 09-01:**
- `CompanyMember["membershipRole"]` ∈ `{owner, admin, operator, viewer, null}` — substituir `HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS` (constants.ts:464-469, hardcoded "Owner"/"Admin"/etc) por `t("settings:company.access.role.{key}")`. **Decisão de granularidade:** manter `HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS` em `packages/shared/src/constants.ts` mas mover usage no UI para um lookup `ROLE_KEY: Record<HumanCompanyMembershipRole, "settings:..."`. Server-side display (logs, exports) continua usando o constant inglês.
- `CompanyMember["status"]` ∈ `{pending, active, suspended}` — mesmo pattern.
- `Permission keys` (constants em `permissionLabels` em CompanyAccess.tsx:30-39) — converter para sub-tree `settings:company.access.permission.{key-kebab}`.

### Pattern 2: Auth surface (Plano 09-02) — superfície maior é InviteLanding

**Arquivos in-scope** (verificados via Read direto):

| File | LOC | Notes |
|------|-----|-------|
| `ui/src/pages/Auth.tsx` | 185 | Sign-in/sign-up unified — "Sign in to Paperclip"/"Create your Paperclip account" (linha 86), descriptions (89-92), labels "Name"/"Email"/"Password" (110, 123, 136), button labels "Sign In"/"Create Account"/"Working…" (155-158), "Need an account?"/"Already have an account?" + "Create one"/"Sign in" (162-173), error fallback "Authentication failed" (58), validation message "Please fill in all required fields." (102) |
| `ui/src/pages/BoardClaim.tsx` | 126 | "Invalid board claim URL." (44), "Loading claim challenge..." (48), "Claim challenge unavailable" (54), "Challenge is invalid or expired." (57), "Board ownership claimed" (73) + descrição (74), "Open board" (78), "Sign in required" + descrição (89-91), "Sign in / Create account" (94), "Claim Board ownership" (104) + descrição (105-107), "Failed to claim board ownership" (111), "Claim ownership"/"Claiming…" (120) |
| `ui/src/pages/CliAuth.tsx` | 185 | "Invalid CLI auth URL." (48), "Loading CLI auth challenge..." (52), "CLI auth challenge unavailable" + descrição (59-61), "CLI access approved" (77) + descrição (78-80), "Command:" prefix (82), "CLI auth challenge expired"/"cancelled" (94), "Start the CLI auth flow again..." (96-98), "Sign in required" (108) + descrição (109-110), "Approve Paperclip CLI access" (123) + descrição (124-126), labels "Command"/"Client"/"Requested access"/"Requested company" (130-146), `"Instance admin"/"Board"` (140), default fallback `"paperclipai cli"` (135), "Failed to update CLI auth challenge" (155), "This challenge requires instance-admin access..." (160-162), "Approve CLI access"/"Approving..."/"Cancel"/"Cancelling..." (170-178) |
| `ui/src/pages/InviteLanding.tsx` | 828 | **Maior superfície de auth.** "Invalid invite token." (422), "Loading invite..." (426), "Checking your access..." (430), "Invite not available" + "This invite may be expired..." (437-440), "Opening company..." (451), "Request to join {companyName}" (176), "Your request is still awaiting approval. {approverLabel} must approve..." (179-181), "Approval page" + "Company Settings → Access" link (183-189), "Refresh this page after you've been approved..." (194-196), "Claim secret" + "POST" + "Onboarding:" (200-208), "This join request was not approved."/"This invite has already been used." (471-473), "Bootstrap complete" + "Open board" (484-487), "You joined the company" (517) + "Open board" (521), "You've been invited to join Paperclip" (553-554), "Set up Paperclip"/"Join {company}" (557), description (560-565), labels "Company"/"Invited by"/"Requested access"/"Invite expires" (571-587), "Paperclip board" fallback (576), "Agent join request"/"Company access" (581), "Message from inviter" (591), "Signed in as {sessionLabel}" (599), "Submit agent details" + "This invite will create..." (608-611), "Agent name"/"Adapter type"/"Capabilities" (614, 622, 636), " (Coming soon)" suffix (630), "Submit request"/"Continue"/"Accept invite" labels (414-419), "Working..." (650), "Create your account"/"Sign in to continue" (657), descriptions (660-663), buttons "Create account"/"I already have an account" (679, 693), feedback messages "Please fill in all required fields." (705), "Sign in and continue"/"Create account and continue" (775-776), tail copy (781-784), "Submitting join request"/"Accept bootstrap invite"/"Accept company invite" (791-794), "Submitting your join request for {company}." (798), "This account already belongs to {company}." (800), "This will finish setting up Paperclip"/"submit or complete your join request..." (802-803), "Submitting request..."/"Finishing sign-in..." (809), `mapInviteAuthFeedback` strings (linhas 75, 83-84, 91-92, 98, 105) — error feedback templates com `{emailLabel}` interpolation |

**Auth-specific error code mapping (09-02 ↔ 09-03 cooperation):**
- Better Auth emits `code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"` and `code: "INVALID_EMAIL_OR_PASSWORD"` (verified at InviteLanding.tsx:72, 79). 09-03 adds these to `errors.json`:
  ```json
  {
    "auth": {
      "user-already-exists": "Já existe uma conta para {{email}}. Faça login abaixo para continuar.",
      "invalid-email-or-password": "Email ou senha não correspondem a uma conta Paperclip existente.",
      "request-failed-401": "Email ou senha inválidos.",
      "request-failed-422": "Talvez já exista uma conta para {{email}}. Tente fazer login."
    }
  }
  ```
- Plano 09-02 reescreve `mapInviteAuthFeedback` (linhas 63-106) para retornar `t("errors:auth.{code}", { email })` em vez de strings inline.

**auth.json bootstrap (proposed sub-tree):**

```json
{
  "common": {
    "sign-in": "Entrar",
    "sign-up": "Criar conta",
    "create-account": "Criar conta",
    "working": "Trabalhando…",
    "loading": "Carregando…",
    "name": "Nome",
    "email": "Email",
    "password": "Senha",
    "open-board": "Abrir board"
  },
  "page": {
    "sign-in-title": "Entrar no Paperclip",
    "sign-up-title": "Criar sua conta Paperclip",
    "sign-in-description": "Use seu email e senha para acessar esta instância.",
    "sign-up-description": "Crie uma conta nesta instância. Confirmação por email não é necessária na v1.",
    "switch-to-sign-up": "Precisa de uma conta?",
    "switch-to-sign-in": "Já tem uma conta?",
    "switch-cta-sign-up": "Crie uma",
    "switch-cta-sign-in": "Entrar",
    "auth-failed-fallback": "Falha na autenticação"
  },
  "board-claim": {
    "invalid-url": "URL de reivindicação de board inválida.",
    "loading": "Carregando desafio de reivindicação…",
    "challenge-unavailable-title": "Desafio de reivindicação indisponível",
    "challenge-unavailable-fallback": "O desafio é inválido ou expirou.",
    "claimed-title": "Propriedade do board reivindicada",
    "claimed-description": "Esta instância está agora vinculada ao seu usuário autenticado.",
    "sign-in-required-title": "Login necessário",
    "sign-in-required-description": "Faça login ou crie uma conta, depois retorne a esta página para reivindicar a propriedade do board.",
    "sign-in-cta": "Entrar / Criar conta",
    "claim-title": "Reivindicar propriedade do board",
    "claim-description": "Isso promoverá seu usuário a admin da instância e migrará o acesso de propriedade da empresa do modo confiável local.",
    "claim-cta": "Reivindicar propriedade",
    "claim-cta-pending": "Reivindicando…",
    "claim-failed-fallback": "Falha ao reivindicar propriedade do board"
  },
  "cli-auth": {
    "invalid-url": "URL de autenticação CLI inválida.",
    "loading": "Carregando desafio de autenticação CLI…",
    "challenge-unavailable-title": "Desafio de autenticação CLI indisponível",
    "approved-title": "Acesso CLI aprovado",
    "approved-description": "O CLI Paperclip pode agora finalizar a autenticação na máquina solicitante.",
    "command-label": "Comando:",
    "expired-title": "Desafio de autenticação CLI expirado",
    "cancelled-title": "Desafio de autenticação CLI cancelado",
    "expired-description": "Inicie o fluxo de autenticação CLI novamente do seu terminal para gerar uma nova solicitação de aprovação.",
    "approve-title": "Aprovar acesso do CLI Paperclip",
    "approve-description": "Um processo CLI Paperclip local está solicitando acesso ao board desta instância.",
    "field": {
      "command": "Comando",
      "client": "Cliente",
      "requested-access": "Acesso solicitado",
      "requested-company": "Empresa solicitada"
    },
    "access": {
      "instance-admin": "Admin da instância",
      "board": "Board"
    },
    "client-fallback": "paperclipai cli",
    "requires-instance-admin": "Este desafio requer acesso de admin da instância. Faça login com uma conta de admin da instância para aprová-lo.",
    "approve-cta": "Aprovar acesso CLI",
    "approving": "Aprovando…",
    "cancelling": "Cancelando…",
    "update-failed-fallback": "Falha ao atualizar desafio de autenticação CLI"
  },
  "invite": {
    "invalid-token": "Token de convite inválido.",
    "loading": "Carregando convite…",
    "checking-access": "Verificando seu acesso…",
    "not-available-title": "Convite indisponível",
    "not-available-description": "Este convite pode ter expirado, sido revogado ou já usado.",
    "rejected-description": "Esta solicitação de entrada não foi aprovada.",
    "already-used-description": "Este convite já foi usado.",
    "opening-company": "Abrindo empresa…",
    "bootstrap-complete-title": "Bootstrap concluído",
    "joined-title": "Você entrou na empresa",
    "header-eyebrow": "Você foi convidado para entrar no Paperclip",
    "header-bootstrap": "Configurar Paperclip",
    "header-join": "Entrar em {{companyName}}",
    "company-fallback": "esta empresa Paperclip",
    "description-agent": "Revise os detalhes do convite, então envie as informações do agente abaixo para iniciar a solicitação de entrada.",
    "description-human-needs-account": "Crie sua conta Paperclip primeiro. Se já tem uma, troque para entrar e continue o convite com o mesmo email.",
    "description-ready": "Sua conta está pronta. Revise os detalhes do convite, depois aceite-o para continuar.",
    "field": {
      "company": "Empresa",
      "invited-by": "Convidado por",
      "requested-access": "Acesso solicitado",
      "expires": "Convite expira",
      "message": "Mensagem do convidante",
      "signed-in-as": "Conectado como <strong>{{name}}</strong>.",
      "agent-name": "Nome do agente",
      "adapter-type": "Tipo de adaptador",
      "capabilities": "Capacidades"
    },
    "invited-by-fallback": "Board Paperclip",
    "access-agent": "Solicitação de entrada de agente",
    "access-company": "Acesso à empresa",
    "agent-form-title": "Enviar detalhes do agente",
    "agent-form-description": "Este convite criará uma solicitação de aprovação para um novo agente em {{companyName}}.",
    "coming-soon-suffix": " (em breve)",
    "submit-cta": "Enviar solicitação",
    "accept-cta": "Aceitar convite",
    "continue-cta": "Continuar",
    "create-account-title": "Criar sua conta",
    "sign-in-title": "Entrar para continuar",
    "create-account-description": "Comece com uma conta Paperclip. Depois disso, você voltará aqui para aceitar o convite para {{companyName}}.",
    "sign-in-description": "Use a conta Paperclip que já corresponde a este convite. Se ainda não tem uma, troque de volta para criar conta.",
    "mode-create-account": "Criar conta",
    "mode-have-account": "Já tenho uma conta",
    "submit-create": "Criar conta e continuar",
    "submit-sign-in": "Entrar e continuar",
    "tail-copy-create": "Já se cadastrou antes? Use a opção de conta existente para que o convite vincule ao usuário Paperclip correto.",
    "tail-copy-sign-in": "Sem conta ainda? Volte para criar conta para aceitar o convite com um novo login.",
    "auto-accept-title": "Enviando solicitação de entrada",
    "auto-accept-description": "Enviando sua solicitação de entrada para {{companyName}}.",
    "already-member": "Esta conta já pertence a {{companyName}}.",
    "this-will-bootstrap": "Isso finalizará a configuração do Paperclip",
    "this-will-join": "submeterá ou completará sua solicitação de entrada para {{companyName}}",
    "submitting-request": "Enviando solicitação…",
    "finishing-signin": "Finalizando login…",
    "awaiting-approval": {
      "title": "Solicitação para entrar em {{companyName}}",
      "description": "Sua solicitação ainda aguarda aprovação. {{approver}} deve aprovar sua solicitação para entrar.",
      "approver-fallback": "Um admin da empresa",
      "approval-page-label": "Página de aprovação",
      "approval-page-link": "Configurações da empresa → Acesso",
      "ask-them-to-visit": "Peça para visitarem <link>Configurações da empresa → Acesso</link> para aprovar sua solicitação.",
      "refresh-hint": "Atualize esta página depois que for aprovado — você será redirecionado automaticamente.",
      "claim-secret-label": "Segredo de reivindicação",
      "onboarding-label": "Onboarding:"
    }
  }
}
```

### Pattern 3: Admin/Company surface (Plano 09-01)

**Arquivos in-scope:**

| File | LOC | Status | Notes |
|------|-----|--------|-------|
| `ui/src/pages/CompanySettings.tsx` | 1480 | Phase 8 cobriu apenas seção pool toggle (linhas 1163-1205); restante hardcoded | Section headers ("General", "Appearance", "Environments", "Hiring", "Claude Account Pool", "Invites", "Company Packages", "Danger Zone"), Field labels/hints (linhas 618-732, 904-1035), all toast strings (363-407), confirm dialog (1332-1335 — `window.confirm`), botões "Save changes"/"Saving..."/"Saved"/"Failed to save" (746-755), environments table headers (775-784), environments empty state (817), environment list rows (823-893), draft probe section, "Generate OpenClaw Invite Prompt" section (1208-1283), "Company Packages" section (1285-1310), "Danger Zone" section (1312-1363) |
| `ui/src/pages/CompanyAccess.tsx` | 679 | Zero traduzido | Breadcrumb labels (74-77), section headers ("Humans"/"Company Access"), permissionLabels (30-39 — convert para sub-tree `settings:company.access.permission.*`), `HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS` usage (linhas 367, 424, 458, 493) — wrap in `t()`, status badges (`active`/`pending`/`suspended` — replace with kebab keys), all toast strings (115-220), Edit member Dialog (403-528) — title, description, all labels, footer buttons, Remove member Dialog (530-614), PendingJoinRequestCard component (632-678), error messages (244-249) |
| `ui/src/pages/CompanyInvites.tsx` | (não medido — Read tool não chamado) | — | Listing de convites + revoke + create. Padrão similar a CompanyAccess. Plano 09-01 deve fazer Read antes de extrair. |
| `ui/src/pages/JoinRequestQueue.tsx` | (não medido) | — | Queue de approvals pending. |
| `ui/src/pages/Companies.tsx` | (não medido) | — | Lista de empresas (instance admin). |
| `ui/src/pages/CompanyExport.tsx` + `CompanyImport.tsx` | (não medido) | — | Páginas dedicadas referenciadas em CompanySettings.tsx:1297-1306 |
| `ui/src/pages/Org.tsx` + `OrgChart.tsx` | (não medido) | — | Org chart visualization. |
| `ui/src/pages/CompanySkills.tsx` | (não medido) | — | Skills da empresa. |
| `ui/src/pages/Costs.tsx` | (não medido) | — | Costs page (cross com Phase 8 — verificar se já cobriu). |

**Estimated keys:** ~280 em sub-trees `settings:company.*`, `settings:org.*`, `settings:invites.*`, `settings:costs.*` (ou fragmentar em namespaces separados conforme discrição do executor).

**Sample bootstrap (settings.json sub-tree extension):**

```json
{
  "company": {
    "title": "Configurações da empresa",
    "general": {
      "section": "Geral",
      "name-label": "Nome da empresa",
      "name-hint": "O nome de exibição para sua empresa.",
      "description-label": "Descrição",
      "description-hint": "Descrição opcional mostrada no perfil da empresa.",
      "description-placeholder": "Descrição opcional da empresa"
    },
    "appearance": {
      "section": "Aparência",
      "logo-label": "Logo",
      "logo-hint": "Carregue uma imagem PNG, JPEG, WEBP, GIF ou SVG.",
      "remove-logo": "Remover logo",
      "removing-logo": "Removendo…",
      "logo-upload-failed": "Falha ao enviar logo",
      "uploading-logo": "Enviando logo…",
      "brand-color-label": "Cor da marca",
      "brand-color-hint": "Define a cor do ícone da empresa. Deixe vazio para cor auto-gerada.",
      "brand-color-clear": "Limpar"
    },
    "actions": {
      "save-changes": "Salvar alterações",
      "saving": "Salvando…",
      "saved": "Salvo",
      "save-failed": "Falha ao salvar"
    },
    "environments": { "section": "Ambientes", "...": "..." },
    "hiring": {
      "section": "Contratação",
      "require-approval-label": "Exigir aprovação do board para novas contratações",
      "require-approval-hint": "Novas contratações de agente ficam pendentes até aprovação do board."
    },
    "claude-pool": {
      "section": "Pool de contas Claude",
      "description": "Controla quais contas Claude os agentes desta empresa podem rotacionar...",
      "...": "..."
    },
    "invites": {
      "section": "Convites",
      "generate-description": "Gere um snippet de convite para agente OpenClaw.",
      "generate-cta": "Gerar prompt de convite OpenClaw",
      "generating": "Gerando…",
      "snippet-label": "Prompt de convite OpenClaw",
      "copied": "Copiado",
      "copy": "Copiar snippet",
      "copied-snippet": "Snippet copiado"
    },
    "packages": {
      "section": "Pacotes da empresa",
      "description-prefix": "Importação e exportação foram movidas para páginas dedicadas, acessíveis no header do",
      "description-link": "Org Chart",
      "export": "Exportar",
      "import": "Importar"
    },
    "danger-zone": {
      "section": "Zona de perigo",
      "archive-description": "Arquive esta empresa para escondê-la da barra lateral. Isso persiste no banco de dados.",
      "archive-cta": "Arquivar empresa",
      "archiving": "Arquivando…",
      "already-archived": "Já arquivada",
      "archive-failed": "Falha ao arquivar empresa",
      "archive-confirm": "Arquivar empresa \"{{name}}\"? Ela será escondida da barra lateral."
    },
    "no-company-selected": "Nenhuma empresa selecionada. Selecione uma empresa no seletor acima.",
    "access": {
      "title": "Acesso da empresa",
      "description": "Gerencie associações de usuários humanos, status de associação e permissões explícitas para {{name}}.",
      "amber-banner": "Esta conta pode gerenciar acesso aqui via privilégios de admin da instância, mas não tem associação ativa.",
      "humans-section": "Humanos",
      "humans-description": "Gerencie associações humanas, status e permissões aqui.",
      "pending-joins-title": "Solicitações pendentes",
      "pending-joins-description": "Revise solicitações humanas antes que se tornem membros ativos.",
      "pending-count": "{{count}} pendente",
      "pending-count_plural": "{{count}} pendentes",
      "table": {
        "user-account": "Conta de usuário",
        "role": "Função",
        "status": "Status",
        "grants": "Permissões",
        "action": "Ação",
        "no-members": "Nenhuma associação encontrada para esta empresa ainda.",
        "no-grants": "Sem permissões explícitas",
        "edit": "Editar",
        "remove": "Remover"
      },
      "role": {
        "owner": "Proprietário",
        "admin": "Admin",
        "operator": "Operador",
        "viewer": "Visualizador",
        "unset": "Não definido"
      },
      "status": {
        "active": "ativo",
        "pending": "pendente",
        "suspended": "suspenso"
      },
      "permission": {
        "agents-create": "Criar agentes",
        "users-invite": "Convidar humanos e agentes",
        "users-manage-permissions": "Gerenciar membros e permissões",
        "tasks-assign": "Atribuir tarefas",
        "tasks-assign-scope": "Atribuir tarefas com escopo",
        "tasks-manage-active-checkouts": "Gerenciar checkouts ativos",
        "joins-approve": "Aprovar solicitações de entrada",
        "environments-manage": "Gerenciar ambientes"
      },
      "edit-dialog": {
        "title": "Editar membro",
        "description": "Atualize função, status e permissões para {{name}}.",
        "role-label": "Função na empresa",
        "status-label": "Status da associação",
        "grants-section": "Permissões",
        "grants-description": "Funções fornecem permissões implícitas. Permissões explícitas são para overrides.",
        "implicit-grants-title": "Permissões implícitas pela função",
        "implicit-grants-description": "{{role}} inclui estas permissões automaticamente.",
        "no-role-implicit": "Nenhuma função selecionada — sem permissões implícitas.",
        "save": "Salvar acesso",
        "saving": "Salvando…"
      },
      "remove-dialog": {
        "title": "Remover membro",
        "description": "Arquive {{name}} e mova atribuições ativas antes de esconder este usuário dos campos de atribuição.",
        "checking-issues": "Verificando tarefas atribuídas…",
        "open-issues_one": "{{count}} tarefa atribuída em aberto",
        "open-issues_other": "{{count}} tarefas atribuídas em aberto",
        "reassignment-label": "Reatribuição de tarefas",
        "leave-unassigned": "Deixar sem atribuição",
        "humans-group": "Humanos",
        "agents-group": "Agentes",
        "more-issues_one": "mais {{count}} tarefa",
        "more-issues_other": "mais {{count}} tarefas",
        "remove-cta": "Remover membro",
        "removing": "Removendo…"
      },
      "join-request": {
        "approve-human": "Aprovar humano",
        "reject-human": "Rejeitar humano",
        "submitted-at": "Enviado em {{date}}",
        "no-email": "Email não disponível",
        "unknown-requester": "Solicitante desconhecido",
        "invite-metadata-unavailable": "Metadata do convite indisponível"
      }
    }
  }
}
```

### Pattern 4: Server error code architecture (Plano 09-03)

**Current state (verified at `server/src/errors.ts:1-10` + `server/src/middleware/error-handler.ts:35-78`):**

```typescript
// errors.ts — atual
export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) { ... }
}

// error-handler.ts — atual response shape
res.status(err.status).json({
  error: err.message,
  ...(err.details ? { details: err.details } : {}),
});
```

**Plan 09-03 changes:**

1. **`server/src/errors.ts` — extend HttpError com `code?: string`:**

```typescript
export class HttpError extends Error {
  status: number;
  code?: string;       // NEW — stable error code (e.g., "validation.email.invalid")
  details?: unknown;
  constructor(status: number, message: string, options?: { code?: string; details?: unknown }) {
    super(message);
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

// Helpers ganham 3rd arg opcional
export function badRequest(message: string, code?: string, details?: unknown) {
  return new HttpError(400, message, { code, details });
}
// + similar para forbidden/notFound/conflict/unprocessable/unauthorized
```

**Backward compat:** Helpers atuais são chamados com `badRequest(message)` ou `badRequest(message, details)` — argumento `details` muda de posição. **MIGRATION:** Plano 09-03 deve auditar todos os ~130 callsites e ajustar:
   - Sem args extras: `badRequest("...")` → idempotente
   - Com `details`: `badRequest(msg, details)` → `badRequest(msg, undefined, details)` (BREAKING para callsites que passam details). **Alternativa preferida:** novo método `badRequestWithCode(message, code, details?)` para evitar quebra. **Decisão recomendada:** novos métodos `*WithCode()` para evitar regression risk.

2. **`server/src/middleware/error-handler.ts:52-56` — emit code:**

```typescript
res.status(err.status).json({
  error: err.message,
  ...(err.code ? { code: err.code } : {}),
  ...(err.details ? { details: err.details } : {}),
});
```

3. **`ZodError` handler (linha 59-62)** — emite codes derivados de Zod issues:

```typescript
if (err instanceof ZodError) {
  res.status(400).json({
    error: "Validation error",
    code: "validation.error",
    details: err.errors.map((issue) => ({
      path: issue.path.join("."),
      code: `validation.${issue.code}`,  // e.g., "validation.invalid_string", "validation.too_small"
      message: issue.message,
    })),
  });
  return;
}
```

4. **`ui/src/api/client.ts:3-13` — ApiError exposes `.code`:**

```typescript
export class ApiError extends Error {
  status: number;
  code?: string;       // NEW
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = (body as { code?: string } | null)?.code;
    this.body = body;
  }
}
```

5. **`ui/src/lib/translate-api-error.ts` (novo) — helper canônico:**

```typescript
import type { TFunction } from "i18next";
import { ApiError } from "@/api/client";

export function translateApiError(error: unknown, t: TFunction): { title: string; body?: string } {
  if (error instanceof ApiError && error.code) {
    const translated = t(`errors:${error.code}`, { defaultValue: null });
    if (translated) return { title: translated };
  }
  // Fallback: raw message in italics + generic prefix
  const rawMessage = error instanceof Error ? error.message : String(error);
  return {
    title: t("errors:generic.unknown"),
    body: rawMessage,  // UI renders body in italic
  };
}
```

**Callsites prioritários para receber `code` em Wave 1 (~40 throws):**

Auth/access (alta visibilidade UI):
- `server/src/routes/access.ts` — invite errors, board claim errors
- `server/src/routes/companies.ts` — create/update/archive errors
- `server/src/routes/issues.ts` — create/update errors (8 callsites)
- `server/src/routes/agents.ts` — create/update errors
- `server/src/routes/projects.ts` — create/update errors
- `server/src/routes/routines.ts` — 7 callsites
- `server/src/routes/plugins.ts` — 9 callsites

**Code naming convention:**

```
auth.session.expired
auth.invalid-credentials
validation.{zod-issue-code}             // e.g., "validation.invalid_string"
validation.{field}.{constraint}          // e.g., "validation.email.invalid"
company.not-found
company.archive-failed
company.last-owner                       // can't remove last owner
member.role.invalid
issue.title.required
issue.assignee.not-member
agent.create-failed
plugin.install-failed
generic.unknown                          // default fallback
generic.network-error                    // when fetch fails before reaching server
```

**errors.json bootstrap (Wave 0):**

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
    "email": {
      "invalid": "Endereço de email inválido."
    },
    "password": {
      "too-short": "Senha muito curta. Mínimo 8 caracteres."
    }
  },
  "auth": {
    "user-already-exists": "Já existe uma conta para {{email}}. Entre abaixo para continuar.",
    "invalid-email-or-password": "Email ou senha não correspondem a uma conta Paperclip.",
    "request-failed-401": "Email ou senha inválidos.",
    "request-failed-422": "Talvez já exista uma conta para {{email}}. Tente fazer login."
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
  }
}
```

### Pattern 5: Tooltips/Modais/Toasts cross-cutting (Plano 09-04)

**Toast pattern (verified at `ui/src/context/ToastContext.tsx`):**

`useToast()` retorna `{pushToast, dismissToast, clearToasts, toasts}`. `pushToast` aceita `{title, body?, tone, action?, ttlMs?, dedupeKey?}`. **Não é sonner** — implementação custom com dedupe window e TTL por tone.

**Padrão atual (verified at CompanySettings.tsx:363-407, CompanyAccess.tsx:115-220):**

```typescript
// Hardcoded — Phase 9 substitui:
pushToast({
  title: "Member updated",
  tone: "success",
});

// Para:
pushToast({
  title: t("common:toast.member-updated"),
  tone: "success",
});

// Com interpolação:
pushToast({
  title: t("common:toast.environment-saved", { name: environment.name }),
  tone: "success",
});
```

**common.json toast sub-tree (proposed):**

```json
{
  "toast": {
    "saved": "Salvo",
    "save-failed": "Falha ao salvar",
    "deleted": "Excluído",
    "delete-failed": "Falha ao excluir",
    "member-updated": "Membro atualizado",
    "member-update-failed": "Falha ao atualizar membro",
    "member-removed": "Membro removido",
    "member-remove-failed": "Falha ao remover membro",
    "member-removed-with-reassignment_one": "{{count}} tarefa reatribuída.",
    "member-removed-with-reassignment_other": "{{count}} tarefas reatribuídas.",
    "join-approved": "Solicitação aprovada",
    "join-approve-failed": "Falha ao aprovar solicitação",
    "join-rejected": "Solicitação rejeitada",
    "join-reject-failed": "Falha ao rejeitar solicitação",
    "environment-created": "Ambiente criado",
    "environment-updated": "Ambiente atualizado",
    "environment-save-failed": "Falha ao salvar ambiente",
    "environment-probe-passed": "Probe do ambiente passou",
    "environment-probe-failed": "Probe do ambiente falhou",
    "draft-probe-passed": "Probe de rascunho passou",
    "draft-probe-failed": "Probe de rascunho falhou",
    "environment-ready": "{{name}} está pronto.",
    "unknown-error": "Erro desconhecido"
  },
  "confirm": {
    "archive-company": {
      "title": "Arquivar empresa?",
      "body": "Arquivar empresa \"{{name}}\"? Ela será escondida da barra lateral.",
      "cta-confirm": "Arquivar",
      "cta-cancel": "Cancelar"
    },
    "remove-member": {
      "title": "Remover membro?",
      "cta-confirm": "Remover",
      "cta-cancel": "Cancelar"
    },
    "delete-generic": {
      "title": "Confirmar exclusão",
      "body": "Esta ação não pode ser desfeita.",
      "cta-confirm": "Excluir",
      "cta-cancel": "Cancelar"
    }
  },
  "empty-state": {
    "no-results": "Sem resultados.",
    "no-data": "Sem dados.",
    "loading": "Carregando…"
  }
}
```

**Tooltip pattern (verified at Inbox.tsx:298,1981 — Phase 8 já consolidou):**

```typescript
// Phase 8 pattern (já em produção):
<button aria-label={t("inbox:actions.mark-as-read")} title={t("inbox:actions.mark-as-read")}>
```

Plano 09-04 estende para superfícies de 09-01/02. Tooltip wrapper component (`<Tooltip><TooltipTrigger><TooltipContent>`) é raramente usado para texto inline — `aria-label`/`title` atributos cobrem ~95% dos casos.

**`window.confirm` callsites (verificado via grep):**

```bash
grep -rn "window.confirm" ui/src/pages/ ui/src/components/
```

CompanySettings.tsx:1332 ("Archive company...") é o único confirmado (mais possíveis em arquivos não lidos). Plano 09-04 deve grep completo e substituir cada ocorrência por `t("common:confirm.{action}.body", params)`. **Decisão:** manter `window.confirm` (não migrar para `<Dialog>` shadcn — fora do escopo desta fase).

### Anti-Patterns to Avoid

- **NÃO traduza `HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS` em `packages/shared/src/constants.ts`.** Esse constant é usado server-side (logs, exports) e deve permanecer em inglês. UI cria seu próprio lookup `ROLE_KEY` que mapeia para keys i18n.
- **NÃO traduza `permissionLabels` em CompanyAccess.tsx:30-39 in-place.** Mover para sub-tree i18n e renderizar via `t("settings:company.access.permission.{key}")`.
- **NÃO emita strings traduzidas do server** — server emite `code` + `params`; client traduz. Decisão locked em CONTEXT.md.
- **NÃO mude assinatura existente de `badRequest(msg, details?)` quebrando 130 callsites.** Adicione novos helpers `badRequestWithCode(msg, code, details?)`. Migration incremental.
- **NÃO traduza Better Auth UI components** (deferred to v2). Apenas `Auth.tsx` (paperclip-built wrapper) e error feedback de chamadas Better Auth API.
- **NÃO consolide tudo em `common.json`.** Erros vão em `errors.json`; auth vai em `auth.json`; admin/company vai em `settings.json` (extension).
- **NÃO mexa no contrato `details` do error response.** Mantém shape atual; apenas adiciona `code` opcional ao top-level.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Toast queueing | Custom queue logic | `useToast()` em `ui/src/context/ToastContext.tsx:189-193` (já tem dedupe + TTL) |
| Modal de confirmação | Refazer em `<Dialog>` shadcn | `window.confirm(t(...))` mantém UX atual; migration para Dialog é v2 |
| Error code mapping | switch/case in cada catch block | Helper `translateApiError(error, t)` em `ui/src/lib/translate-api-error.ts` (criar em Wave 0) |
| Pluralização ("1 membro"/"2 membros") | Funções inline | i18next built-in plurals (`{count}` → `_one`/`_other`) |
| Interpolação nome | Template literals | `t("...", { name })` |
| Validação client | Reescrever Zod no client | Apenas mensagens — server permanece source of truth para validação real (zod schema em routes) |

**Key insight:** Toda infraestrutura UI está pronta (Phase 7-8). A única peça nova-arquitetural é o **error code field** no server response. Restante é grep + replace + JSON edit.

## Runtime State Inventory

Phase 9 é puramente código. **Sem migrations.** Sem mudança de schema. Sem dados em runtime que precisem migration.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — i18n keys são estáticas em JSON; activity_log já tem actionKey/paramsJson da Fase 8; HttpError não persiste | Nenhuma |
| Live service config | None — Better Auth config não muda; error response shape é additive (campo opcional) | Nenhuma |
| OS-registered state | None | Nenhuma |
| Secrets/env vars | None — locale do user já em DB (Fase 7); sem novas env vars | Nenhuma |
| Build artifacts | None — sem mudança de package | Nenhuma |

**Verified:** Phase 9 não toca packages/db/src/schema/, não roda Drizzle generate, não tem migration. RESEARCH para o plan_check valida que `nyquist_validation` segue mas Wave 0 cobre apenas test scaffolding e error infrastructure (server + client helpers + dictionary bootstrap).

## Common Pitfalls

### Pitfall 1: HttpError signature change quebra 130 callsites
**What goes wrong:** Mudar `HttpError(status, message, details)` → `HttpError(status, message, { code, details })` quebra TODOS os callsites que passam details como 3o positional arg.
**How to avoid:** Adicione campos opcionais ao constructor sem mudar a assinatura (`details?: unknown` continua sendo 3rd arg, `code` é opcional via override). OU adicione novos helpers `badRequestWithCode/notFoundWithCode` e deixe os antigos intactos. Plano 09-03 deve documentar a estratégia escolhida na sua tarefa Wave 0.

### Pitfall 2: Better Auth error codes mudam silenciosamente
**What goes wrong:** Better Auth pode emitir códigos como `INVALID_EMAIL_OR_PASSWORD` ou retornar 401 com `Request failed: 401` literal (verificado em InviteLanding.tsx:87). Se Better Auth atualizar para emitir um novo código sem aviso, o mapping silenciosamente falha para o fallback "Authentication failed".
**How to avoid:** Plano 09-02 deve documentar todos os códigos Better Auth conhecidos e usar `t("errors:auth.{code}", { defaultValue: "Authentication failed" })`. Tests RTL devem cobrir os códigos canônicos (USER_ALREADY_EXISTS, INVALID_EMAIL_OR_PASSWORD, 401, 422).

### Pitfall 3: Strings em arrays JS não detectadas pelo regex `\bt\(`
**What goes wrong:** `permissionLabels: Record<PermissionKey, string> = { "agents:create": "Create agents", ... }` em CompanyAccess.tsx:30-39 não é detectado pelo regex se você apenas mover os labels para o JSON mas continuar populando o objeto JS com strings hardcoded.
**How to avoid:** Pattern recomendado (do Phase 8):
```typescript
const PERMISSION_KEY: Record<PermissionKey, string> = {
  "agents:create": "settings:company.access.permission.agents-create",
  ...
};
// no JSX: t(PERMISSION_KEY[permissionKey])
```
Detector reconhece `t(VAR)` quando VAR resolve para uma key conhecida, ou usa-se chamadas literais inline.

### Pitfall 4: Toast strings com interpolação manual perdem context
**What goes wrong:** `pushToast({title: \`\${count} tarefa\${count !== 1 ? "s" : ""} reatribuída\${count !== 1 ? "s" : ""}\`})` (CompanyAccess.tsx:208 atual) é monstruoso e perde gênero/concordância em pt-BR.
**How to avoid:** Usar i18next plurals nativos:
```json
{
  "member-removed-with-reassignment_one": "{{count}} tarefa reatribuída.",
  "member-removed-with-reassignment_other": "{{count}} tarefas reatribuídas."
}
```
```typescript
pushToast({
  title: t("common:toast.member-removed"),
  body: result.reassignedIssueCount > 0
    ? t("common:toast.member-removed-with-reassignment", { count: result.reassignedIssueCount })
    : undefined,
});
```

### Pitfall 5: Client tenta traduzir `code` mas server não emite
**What goes wrong:** Plano 09-03 atualiza ApiError para parsear `body.code`, mas o servidor continua emitindo `{ error: "..." }` sem `code`. Client cai em fallback `t("errors:generic.unknown")` para tudo.
**How to avoid:** Garantir que Wave 1 inclua TANTO o emit no server (errors.ts + error-handler.ts) QUANTO o parse no client (api/client.ts) NA MESMA wave. Mapeamento server → key é incremental — começar com 40 callsites prioritários e expandir.

### Pitfall 6: `window.confirm` retorna booleano síncrono — i18next interpolação OK
**What goes wrong:** Não é uma armadilha — `window.confirm(t(...))` funciona perfeitamente. Apenas confirmar que sub-tree `confirm.*` em common.json não usa keys terminadas em `:body` ambíguas com tooltip body.
**How to avoid:** Sub-tree disambiguation explícita: `confirm.archive-company.body` ≠ `tooltip.archive-company`.

### Pitfall 7: InviteLanding tem inline auth form (não delega para Auth.tsx)
**What goes wrong:** Plano 09-02 traduz Auth.tsx mas esquece que InviteLanding.tsx:653-784 contém um formulário sign-in/sign-up *inline* duplicado (com strings independentes).
**How to avoid:** Plano 09-02 deve listar AMBOS os formulários de auth (Auth.tsx E InviteLanding.tsx inline). Considerar extrair sub-tree compartilhado `auth.common.*` reusado em ambos para keys de form fields ("Email"/"Password"/"Name") evitando duplicação.

### Pitfall 8: 28 admin pages não auditadas (apenas CompanySettings + CompanyAccess + ClaudeAccounts foram lidos)
**What goes wrong:** Plano 09-01 lista CompanyInvites/JoinRequestQueue/OrgChart/Org/Companies/CompanyExport/CompanyImport/CompanySkills/Costs como in-scope mas a contagem ~280 strings é estimada via heurística — pode ser ±50.
**How to avoid:** Wave 0 do Plano 09-01 inclui tarefa "audit string density: read each in-scope file e count strings hardcoded". Re-baseline numbers antes de subdividir Wave 1.

## Code Examples

Todos os patterns canônicos verificados em produção:

### Pattern A: Cabeçalho i18n em componente admin (Source: ClaudeAccounts.tsx:75)

```typescript
import { useTranslation } from "react-i18next";

export function CompanyAccess() {
  const { t } = useTranslation(["settings", "common"]);
  return <h1>{t("settings:company.access.title")}</h1>;
}
```

### Pattern B: STATUS_KEY enum lookup (Source: ClaudeAccounts.tsx:42-47)

```typescript
const ROLE_KEY: Record<NonNullable<CompanyMember["membershipRole"]>, string> = {
  owner: "settings:company.access.role.owner",
  admin: "settings:company.access.role.admin",
  operator: "settings:company.access.role.operator",
  viewer: "settings:company.access.role.viewer",
};

// no JSX:
{member.membershipRole ? t(ROLE_KEY[member.membershipRole]) : t("settings:company.access.role.unset")}
```

### Pattern C: Toast com interpolação (proposed)

```typescript
pushToast({
  title: t("common:toast.environment-saved"),
  body: t("common:toast.environment-ready", { name: environment.name }),
  tone: "success",
});
```

### Pattern D: Translation com fallback raw message (proposed `translate-api-error.ts`)

```typescript
import type { TFunction } from "i18next";
import { ApiError } from "@/api/client";

export function translateApiError(error: unknown, t: TFunction): { title: string; body?: string } {
  if (error instanceof ApiError && error.code) {
    const params = (error.body as { params?: Record<string, unknown> } | null)?.params ?? {};
    const translated = t(`errors:${error.code}`, { ...params, defaultValue: null as any });
    if (translated) return { title: translated };
  }
  const rawMessage = error instanceof Error ? error.message : String(error);
  return {
    title: t("errors:generic.unknown"),
    body: rawMessage,
  };
}

// Uso em mutation onError:
onError: (err) => {
  pushToast({ ...translateApiError(err, t), tone: "error" });
}
```

### Pattern E: Server emit com code (proposed)

```typescript
// server/src/routes/companies.ts (exemplo)
if (!company) {
  throw new HttpError(404, `Company ${companyId} not found`, {
    code: "company.not-found",
  });
}

// Validation Zod — automatic via errorHandler middleware
// (sem mudança no callsite)
```

## State of the Art

| Old Approach | Current Approach (post-09) | Impact |
|--------------|------------------|--------|
| Server emite strings hardcoded em inglês via `HttpError(404, "Not found")` | Server emite `code: "entity.not-found"` + i18n no client | Operadores leem English em logs (mantido); usuários veem pt-BR |
| Toast strings via concatenação JS template | i18next pluralization nativo | Concordância gramatical correta em pt-BR |
| `window.confirm("Archive...?")` literal | `window.confirm(t("common:confirm.{action}.body"))` | Confirmações em pt-BR; UX nativo do browser preservado |
| Permission/Role labels hardcoded em `packages/shared/src/constants.ts` | UI tem lookup `ROLE_KEY` que mapeia para sub-tree i18n; constants permanecem en-US para server | Server logs/exports estáveis; UI traduzida |
| Better Auth error codes mapeados ad-hoc inline (InviteLanding.tsx:72-99) | Mapped to `errors:auth.{code}` namespace | Centralization + override fácil |

**Deprecated/outdated:** Nenhum. Phase 9 é aditiva; código existente continua funcionando durante migration incremental.

## Open Questions

1. **HttpError constructor signature: extend opcional vs. novo helper?**
   - What we know: 130+ callsites usam `badRequest/notFound/conflict/etc.` Mudar 3rd arg de `details` para `{ code, details }` quebra todos os que passam details posicionalmente.
   - What's unclear: Quantos exatamente passam details? (não auditado em detalhe — apenas contagem total).
   - Recommendation: Plano 09-03 Wave 0 inclui task "audit detailed signature usage" + decisão entre (a) extend optional `code` como NEW 4th arg, (b) novos helpers `*WithCode()`, ou (c) breaking change com codemod. **Recomendação default: (b) — novos helpers, zero risco de regression.**

2. **Better Auth specific error codes — todos catalogados?**
   - What we know: 2 códigos confirmados (USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL, INVALID_EMAIL_OR_PASSWORD) + 2 fallbacks string match (Request failed: 401, Request failed: 422).
   - What's unclear: Better Auth pode emitir outros códigos (rate limit, magic link expirado, etc.) não cobertos.
   - Recommendation: Plano 09-02 inclui task "grep `code === ` em ui/src/ + better-auth source para enumerar todos códigos retornados". Adicionar com fallback `t("errors:auth.unknown", { defaultValue: error.message })`.

3. **`details` em response shape — traduzir o quê?**
   - What we know: ZodError emite `details: [{ path, code, message }]`. Atualmente client mostra raw `error.message` em catch blocks.
   - What's unclear: Se UI deve renderizar lista de erros field-by-field (e.g., "Email: inválido / Password: muito curta") ou apenas o primeiro.
   - Recommendation: Plano 09-03 escolhe single error display (mais simples). UI mostra `t("errors:validation.error")` no top-level + lista de raw `details[].message` em italics abaixo. v2 (L10N-03) implementa per-field translation com path resolution.

4. **Quantos arquivos admin não auditados?**
   - What we know: 6 arquivos lidos diretamente (CompanySettings, CompanyAccess, ClaudeAccounts, Auth, BoardClaim, CliAuth, InviteLanding). 5+ arquivos in-scope não medidos (CompanyInvites, JoinRequestQueue, OrgChart, Org, Companies, CompanyExport, CompanyImport, CompanySkills, Costs).
   - What's unclear: String density real desses arquivos.
   - Recommendation: Plano 09-01 Wave 0 inclui task "Read + count" para os 5+ arquivos não medidos. Re-baseline estimativa antes de subdividir wave de execução. Documentado no Pitfall 8.

## Environment Availability

Sem novas dependências. Tudo herdado.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22+ | Build, dev | ✓ | 22+ | — |
| pnpm | Workspace | ✓ | 9.15.4 | — |
| Vitest | Detector + RTL | ✓ | 3.0.5 | — |
| i18next | Translation | ✓ | 26.0.8 | — |
| react-i18next | React bindings | ✓ | 17.0.4 | — |
| zod | Server validation (já em uso) | ✓ | inline em server/package.json | — |

**Missing dependencies:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.0.5 (UI workspace + server workspace) |
| Config files | `ui/vitest.config.ts`, `server/vitest.config.ts` (existentes) |
| Quick run command (UI) | `pnpm --filter @paperclipai/ui test:run` |
| Quick run command (server) | `pnpm --filter @paperclipai/server test:run` |
| Full suite | `pnpm test:run && pnpm -r typecheck` |
| Detector vitest custom | `ui/src/i18n/__tests__/missing-keys.test.ts` (Phase 7) — bloqueante em CI |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-04 | Toda string visível em admin/company passa por `t()` | unit (detector) | `pnpm --filter @paperclipai/ui test:run -- missing-keys` | ✅ Phase 7 — apenas validar passing |
| UI-04 | CompanySettings, CompanyAccess, OrgChart, Org renderizam em pt-BR | RTL render | `pnpm --filter @paperclipai/ui test:run -- CompanySettings.i18n` | ❌ Wave 0 — `ui/src/pages/__tests__/CompanySettings.i18n.test.tsx`, `CompanyAccess.i18n.test.tsx` |
| UI-04 | Admin/company surface 100% pt-BR (visual) | HUMAN-UAT | UAT-09-01 | ❌ N/A (manual) |
| UI-06 | Auth, BoardClaim, CliAuth, InviteLanding renderizam em pt-BR | RTL render | `pnpm --filter @paperclipai/ui test:run -- Auth.i18n` | ❌ Wave 0 — `ui/src/pages/__tests__/Auth.i18n.test.tsx`, `BoardClaim.i18n.test.tsx`, `CliAuth.i18n.test.tsx`, `InviteLanding.i18n.test.tsx` |
| UI-06 | Better Auth error codes traduzem corretamente | RTL render | render `<AuthPage>` → mock authApi rejeitar com `code: "USER_ALREADY_EXISTS..."` → assert traduzido | ❌ Wave 0 — incluso em `Auth.i18n.test.tsx` |
| UI-06 | Auth flow 100% pt-BR (visual) | HUMAN-UAT | UAT-09-02 | ❌ N/A (manual) |
| UI-07 | Server `HttpError(status, msg, {code})` emite `{error, code}` no body JSON | integration (supertest) | `pnpm --filter @paperclipai/server test:run -- error-handler` → POST a route com error → assert `body.code` igual | ❌ Wave 0 — `server/src/middleware/__tests__/error-handler-emits-code.test.ts` |
| UI-07 | ZodError emite shape `{error, code: "validation.error", details: [{path, code, message}]}` | integration (supertest) | enviar payload inválido a route com Zod schema → assert response shape | ❌ Wave 0 — incluso no test acima |
| UI-07 | ApiError client expõe `.code` parseado de body | unit | `new ApiError("...", 400, { code: "validation.email.invalid" })` → assert `.code === "validation.email.invalid"` | ❌ Wave 0 — `ui/src/api/__tests__/client.code.test.ts` |
| UI-07 | `translateApiError` retorna translated quando code presente, raw quando ausente | unit | `translateApiError(new ApiError(...))` → assert | ❌ Wave 0 — `ui/src/lib/__tests__/translate-api-error.test.ts` |
| UI-07 | Mensagens de erro em telas auth/admin renderizam em pt-BR | HUMAN-UAT | UAT-09-03 | ❌ N/A (manual) |
| UI-08 | Toast strings em ToastContext consumers usam `t()` | unit (detector) | mesma command (passa quando todas keys existem) | ✅ Phase 7 |
| UI-08 | `window.confirm` calls usam `t()` | grep test | `grep -rn "window.confirm" ui/src/` deve retornar apenas matches dentro de `t()` | ❌ Wave 0 — `ui/src/__tests__/confirm-strings.lint.test.ts` |
| UI-08 | Tooltips/empty/modais 100% pt-BR (visual) | HUMAN-UAT | UAT-09-04 | ❌ N/A (manual) |

### HUMAN-UAT (visual UI verification)

| UAT ID | Behavior | Steps |
|--------|----------|-------|
| UAT-09-01 | Admin/company 100% pt-BR | (1) login → settings → trocar pt-BR; (2) navegar `/company/settings` — varrer general/appearance/environments/hiring/claude-pool/invites/packages/danger-zone; (3) `/company/settings/access` — humans table, edit member dialog, remove member dialog, pending join requests; (4) `/org` + `/org/chart`; (5) `/companies` (instance admin); (6) `/company/export` + `/company/import`; (7) `/company/skills`; (8) `/costs`; (9) sem string em inglês visível |
| UAT-09-02 | Auth flow 100% pt-BR | (1) logout → `/auth` em pt-BR; (2) trocar entre sign-in/sign-up; (3) submeter com campos vazios — assert mensagem "Preencha todos os campos…"; (4) sign-up com email já existente → assert "Já existe uma conta para X. Entre abaixo…"; (5) sign-in com password errada → assert "Email ou senha inválidos."; (6) `/board-claim/{token}?code=X` → assert "Reivindicar propriedade do board"; (7) `/cli-auth/{id}?token=Y` → assert "Aprovar acesso CLI"; (8) `/invite/{token}` em pt-BR — varrer agent form, human auth inline, awaiting approval panel, bootstrap complete, joined now; (9) sem string em inglês |
| UAT-09-03 | API errors 100% pt-BR | (1) pt-BR ativo; (2) abrir DevTools Network; (3) tentar criar empresa com nome vazio → toast "Erro de validação"; (4) tentar arquivar empresa que tem agentes ativos → toast "Não é possível arquivar empresa com agentes ativos" (ou similar — verificar lista de codes); (5) tentar acessar /api/companies sem auth → toast "Sessão expirada"; (6) entries antigas (sem code) caem no fallback "Algo deu errado." + raw message em italics; (7) sem mensagem em inglês visível |
| UAT-09-04 | Tooltips/modais/toasts 100% pt-BR | (1) pt-BR ativo; (2) hover em tooltips de admin/company surfaces — todos em pt-BR; (3) abrir confirm "Arquivar empresa?" — texto em pt-BR; (4) executar ações que disparam toast (criar issue, salvar settings, etc.) — todos em pt-BR; (5) empty states em listas vazias — todos em pt-BR; (6) modais de confirmação de delete/remove — todos em pt-BR; (7) sem string em inglês |

### Sampling Rate
- **Per task commit:** `pnpm --filter @paperclipai/ui test:run -- missing-keys` (rápido, < 5s)
- **Per wave merge:** `pnpm test:run && pnpm -r typecheck` (full UI + server suite)
- **Phase gate:** Full suite green + UAT-09-01..04 manualmente verificados pelo operador

### Wave 0 Gaps

- [ ] `server/src/errors.ts` — extend `HttpError` com `code?: string` (decisão: novos helpers `*WithCode()` ou extend optional 4th arg)
- [ ] `server/src/middleware/error-handler.ts` — emit `{error, code?, details?}` shape; ZodError emite `code: "validation.error"` + per-issue codes
- [ ] `server/src/middleware/__tests__/error-handler-emits-code.test.ts` — covers UI-07 (server emit shape)
- [ ] `ui/src/api/client.ts` — extend `ApiError` com `.code` parsed do body
- [ ] `ui/src/api/__tests__/client.code.test.ts` — covers ApiError.code
- [ ] `ui/src/lib/translate-api-error.ts` (NEW) — helper canônico
- [ ] `ui/src/lib/__tests__/translate-api-error.test.ts` — covers helper
- [ ] `ui/src/i18n/locales/pt-BR/auth.json` — populate full sub-tree (atualmente `{}`)
- [ ] `ui/src/i18n/locales/en-US/auth.json` — populate full sub-tree
- [ ] `ui/src/i18n/locales/pt-BR/errors.json` — populate full sub-tree (atualmente `{}`)
- [ ] `ui/src/i18n/locales/en-US/errors.json` — populate full sub-tree
- [ ] `ui/src/i18n/locales/pt-BR/common.json` — extend com `toast.*`, `confirm.*`, `empty-state.*` sub-trees
- [ ] `ui/src/i18n/locales/en-US/common.json` — mirror
- [ ] `ui/src/i18n/locales/pt-BR/settings.json` — extend com `company.*` sub-tree (general, appearance, hiring, environments, invites, packages, danger-zone, access — role/status/permission/edit-dialog/remove-dialog/join-request)
- [ ] `ui/src/i18n/locales/en-US/settings.json` — mirror
- [ ] `ui/src/pages/__tests__/Auth.i18n.test.tsx` — RTL test cobrindo sign-in/sign-up + Better Auth error codes
- [ ] `ui/src/pages/__tests__/BoardClaim.i18n.test.tsx`
- [ ] `ui/src/pages/__tests__/CliAuth.i18n.test.tsx`
- [ ] `ui/src/pages/__tests__/InviteLanding.i18n.test.tsx` — cobrir agent form + human auth inline + awaiting approval panel
- [ ] `ui/src/pages/__tests__/CompanySettings.i18n.test.tsx`
- [ ] `ui/src/pages/__tests__/CompanyAccess.i18n.test.tsx`
- [ ] `ui/src/__tests__/confirm-strings.lint.test.ts` — grep `window.confirm(...)` deve estar dentro de `t()` (anti-regression)
- [ ] **Audit task** (Plano 09-01 Wave 0): Read CompanyInvites/JoinRequestQueue/OrgChart/Org/Companies/CompanyExport/CompanyImport/CompanySkills/Costs e re-baseline string density
- [ ] **Audit task** (Plano 09-03 Wave 0): grep `badRequest|notFound|forbidden|unauthorized|conflict|unprocessable` em server/src/, listar callsites que passam `details` (positional 3rd arg) — informa decisão de signature

## Sources

### Primary (HIGH confidence)
- `.planning/phases/09-traducao-ui-admin-auth-sistemicas/09-CONTEXT.md` — todas decisões locked
- `.planning/REQUIREMENTS.md:31-35,99-103` — UI-04, UI-06, UI-07, UI-08
- `.planning/phases/08-traducao-ui-core/08-RESEARCH.md` — padrões i18n consolidados
- `.planning/config.json` — `nyquist_validation: true`, `commit_docs: true`
- `ui/src/pages/CompanySettings.tsx:1-1480` — superfície admin maior; section headers em 614, 643, 763, 1145, 1162, 1209, 1287, 1314; window.confirm em 1332
- `ui/src/pages/ClaudeAccounts.tsx:1-486` — referência canônica STATUS_KEY pattern (linhas 42-47); admin parcialmente migrado
- `ui/src/pages/CompanyAccess.tsx:1-679` — superfície admin não traduzida; permissionLabels em 30-39, dialogs em 403-614, PendingJoinRequestCard em 632-678
- `ui/src/pages/Auth.tsx:1-184` — auth principal
- `ui/src/pages/BoardClaim.tsx:1-126` — board claim flow
- `ui/src/pages/CliAuth.tsx:1-185` — CLI auth flow
- `ui/src/pages/InviteLanding.tsx:1-828` — invite landing (maior auth surface); error feedback mapping em 63-106
- `ui/src/context/ToastContext.tsx:1-194` — useToast custom (não sonner); pushToast aceita `{title, body, tone, action, ttlMs, dedupeKey}`
- `ui/src/context/DialogContext.tsx:1-144` — dialogs business (NewIssue, NewProject, NewGoal, NewAgent, Onboarding); confirm dialogs ficam em useToast/window.confirm
- `ui/src/components/ui/dialog.tsx`, `ui/src/components/ui/tooltip.tsx` — shadcn primitives (sem strings — passthrough)
- `ui/src/api/client.ts:1-50` — ApiError class; body.error parsed mas body.code ainda não
- `server/src/errors.ts:1-68` — HttpError class (status, message, details); helpers `badRequest/notFound/forbidden/unauthorized/conflict/unprocessable`
- `server/src/middleware/error-handler.ts:1-78` — emit `{error, details?}`; ZodError emite `{error: "Validation error", details}`
- `server/src/middleware/validate.ts:1-9` — Zod parse middleware
- `ui/src/i18n/resources.ts:1-48` — 8 namespaces × 2 locales
- `ui/src/i18n/locales/pt-BR/auth.json` — atualmente `{}`
- `ui/src/i18n/locales/pt-BR/errors.json` — atualmente `{}`
- `ui/src/i18n/locales/pt-BR/common.json:1-114` — sub-trees nav.*, actions.*; sem `confirm`/`toast`/`empty-state` ainda
- `ui/src/i18n/locales/pt-BR/settings.json` — populated language.* + claude-accounts.* (Phase 7-8)
- `ui/src/i18n/__tests__/missing-keys.test.ts:1-50` — detector regex; key whitelist `[a-z0-9.\-]+(?::[a-z0-9.\-]+)?`
- `packages/shared/src/constants.ts:464-469` — `HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS` hardcoded (en-US)
- ls `ui/src/pages/` — confirma ausência de Login.tsx/Signup.tsx/ResetPassword.tsx separados; Auth.tsx unificado
- ls `ui/src/components/ui/` — confirma shadcn dialog/tooltip; sem sonner
- ls `ui/src/context/` — confirma ToastContext custom (não sonner)
- grep `badRequest|notFound|forbidden|...` em `server/src/routes/` — 130+ callsites distribuídos em 30+ arquivos; counts amostrados (issues=8, plugins=9, routines=7, instance-settings=3, llms=3, etc.)

### Secondary (MEDIUM confidence)
- Estimativas de string density por arquivo derivadas de heurística regex visual scan; ordem de magnitude correta mas margem ±20% (cf. Pitfall 8)
- 40 callsites prioritários para receber `code` no Wave 1 — selecionados por overlap com superfícies UI traduzidas (auth/access/companies/issues/agents/projects/routines/plugins). Lista exata fica em Plano 09-03 Wave 0 audit.

### Tertiary (LOW confidence)
- Conjunto completo de Better Auth error codes (apenas 2 confirmados via grep no client; outros podem existir e devem ser auditados em Plano 09-02 Wave 0).

## Metadata

**Confidence breakdown:**
- File paths and line numbers: HIGH — todos verificados via Read direto.
- String density estimates (admin): MEDIUM — apenas 3 admin files lidos diretamente; restantes (CompanyInvites, OrgChart, etc.) estimados por heurística — Pitfall 8 documenta gap.
- Auth surfaces inventory: HIGH — todos 4 auth files lidos completos.
- Server error infrastructure: HIGH — errors.ts + error-handler.ts + validate.ts + ApiError client lidos direto; shape atual confirmado.
- Toast/Dialog/Tooltip infrastructure: HIGH — useToast lido completo; Dialog/Tooltip são shadcn primitives sem strings.
- Better Auth error code inventory: MEDIUM — 2 códigos confirmados; conjunto completo precisa audit em Wave 0 do Plano 09-02.
- HttpError signature change strategy: MEDIUM — recomendação de novos helpers preserva compat, mas escolha final fica no Plano 09-03 após audit (Open Question 1).

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 dias; padrões i18next/error infra estáveis; superfícies admin podem ganhar novas strings antes do plano executar — re-grep necessário no momento da execução de cada plano)
