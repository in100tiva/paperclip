# Fase 9: Tradução UI Admin + Auth + Mensagens Sistêmicas - Contexto

**Coletado:** 2026-04-26
**Status:** Pronto para planejamento
**Modo:** Decisões autônomas (auto mode); padrões da Fase 8 reusados

<domain>
## Limite da Fase

Cobrir as superfícies UI restantes:

- **Admin/Company** (UI-04) — membros, roles, claude accounts pool, cost summary, rotation history em CompanySettings
- **Auth** (UI-06) — login, signup, reset password, invite/board-claim
- **Mensagens sistêmicas** (UI-07) — erros de formulário, validação, mensagens de erro de API
- **Tooltips/empty states/modais/toasts** (UI-08) — sistêmicos cross-cutting

Fora desta fase:
- Mensagens dos agentes ao usuário → Fase 10
- System prompts dos agentes → Fase 11

</domain>

<decisions>
## Decisões de Implementação

### Reuso de padrões da Fase 8
- **Estratégia de extração:** manual via grep + edição inline (mesmo padrão Fase 8)
- **Granularidade:** um plano por superfície
  - 09-01: Admin/Company UI (UI-04) — CompanySettings + ClaudeAccounts + members/roles + cost summary + rotation history
  - 09-02: Auth forms (UI-06) — login/signup/reset/invite/board-claim
  - 09-03: Mensagens sistêmicas (UI-07) — errors/validation/API responses
  - 09-04: Tooltips/empty states/modais/toasts (UI-08) — sistêmicos
- **Padrões reusáveis:** STATUS_KEY enum→kebab pattern, _one/_other plurais via i18next nativo, useTranslation(["ns", "common"])
- **Wave structure:** 4 planos paralelos (file sets disjuntos: admin pages vs auth pages vs error/validation strings vs cross-cutting tooltips)

### Namespaces afetados
- `settings.json` — extension para admin/company sub-trees (membros, roles, claude pool extension)
- `auth.json` — populado totalmente (login/signup/reset/invite/board-claim)
- `errors.json` — populado totalmente (validação client + erros API responses)
- `common.json` — extension para tooltips/empty/confirm/toast genéricos

### Validação API responses
- **Erros de API traduzidos no client:** server emite código de erro estável (ex: `"validation.email.invalid"`); client mapeia para `t("errors:validation.email-invalid")`. Reusa contrato Phase 7 (locale do request).
- **Server NÃO retorna strings traduzidas em produção** — código + params; client traduz. Mantém DB/log estável.
- **Errors legacy (sem código)** caem em fallback genérico `t("errors:generic.unknown")` + display do raw message em italics.

### Padrões para tooltips/modais/toasts (UI-08)
- **Tooltips usam `t()` em prop `title` ou `aria-label`** — não em texto visível dentro de Tooltip component (a menos que existente)
- **Modais de confirmação:** `t("common:confirm.{action}.title")` + `body` + `cta-confirm` + `cta-cancel`
- **Toasts:** estrutura `t("common:toast.{event}")` + interpolação params

### Discrição do Claude
- Granularidade de sub-namespaces dentro de cada arquivo JSON
- Ordem de tradução das strings dentro de cada superfície
- Mapeamento exato de códigos de erro → keys (executor decide via grep do server emit + alinhamento client)

</decisions>

<code_context>
## Insights do Código Existente

### Fundação i18n (Fases 7-8)
- 8 namespaces, ~605 chaves já populadas; padrão estável
- `useTranslation(["ns", "common"])` em qualquer componente
- Detector `missing-keys.test.ts` em CI
- Activity log já tem actionKey + paramsJson

### Pontos de integração para Fase 9
- **Admin/Company UI:** `ui/src/pages/CompanySettings.tsx` (já tem section pool + scope da v1.0 Fase 6); `ui/src/pages/ClaudeAccounts.tsx` (Fase 5); membros/roles em CompanySettings
- **Auth UI:** procurar `ui/src/pages/Login.tsx`, `Signup.tsx`, `ResetPassword.tsx`, `InviteAccept.tsx`, `BoardClaim.tsx`
- **Erros:** distribuídos em formulários — react-hook-form? Zod? — descobrir padrão usado e i18n-ar mensagens
- **Toasts:** procurar `useToast` ou similar em `ui/src/components/ui/` ou hooks
- **Modais:** procurar `Dialog`/`AlertDialog` em `ui/src/components/ui/`
</code_context>

<specifics>
## Ideias Específicas

- Esta fase fecha "UI sem strings em inglês quando locale=pt-BR" — após ela, varredura visual das telas inteiras deve estar em português.
- Erros de API são o trecho mais arquitetural; resto é tradução mecânica.

</specifics>

<deferred>
## Ideias Adiadas

- Tradução de auth providers externos (Better Auth UI components não-customizados) — aceitar inglês default; v2 se demandar.
- Tradução de mensagens de erro raw do banco/Postgres → fora de escopo (REQUIREMENTS.md já exclui).

</deferred>
