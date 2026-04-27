---
type: human-uat
status: pending
phase: 09-traducao-ui-admin-auth-sistemicas
requirements: [UI-04, UI-06, UI-07, UI-08]
created: 2026-04-26
---

# Phase 9 — HUMAN-UAT Procedures

Cobertura UAT residual da Phase 9 (Tradução UI Admin + Auth + Mensagens Sistêmicas + Cross-cutting Toast/Confirm). 4 procedimentos manuais que requerem julgamento perceptual humano (browser real, leitura linguística, fluxo end-to-end). **Status: pending** — fase fecha como `complete-with-pending-UAT` (precedente Phases 3-7).

## Pré-requisitos comuns

- 1 dev com paperclip rodando local (`pnpm dev`)
- Browser moderno (Chrome/Firefox/Safari)
- Conta de teste com membership em ≥1 empresa (criação fácil via 03-04 TEAM-SIGNUP-PROCEDURE.md)
- Toggle de idioma já validado em UAT-07-01 (Phase 7)

---

## UAT-09-01 — CompanySettings + ClaudeAccounts + members/roles em pt-BR

**Requisito:** UI-04
**Plano de origem:** 09-01

### Pré-condições

- Locale do usuário = `pt-BR` (verificar via `/instance-settings/profile` → seção "Idioma" radio "Português (Brasil)" ativo)
- Empresa de teste com ≥2 membros (1 owner + 1 outro membro)
- ≥1 invite ativo OU revogado em CompanyInvites
- ≥1 join request pendente OU resolvido em JoinRequestQueue
- ≥1 Claude Account registrada em ClaudeAccounts (status active)

### Steps

1. Login como owner da empresa de teste.
2. Navegar para `/{companyPrefix}/settings/company` (CompanySettings).
3. **Verificar:** Todos os títulos de seção, labels de campo, placeholders, botões e textos de ajuda em pt-BR. Atenção em: Environments table (header + empty state + probe results), Danger Zone (archive confirm modal — clicar "Arquivar empresa" e ler o `window.confirm`).
4. Navegar para `/{companyPrefix}/settings/access` (CompanyAccess).
5. **Verificar:** ROLE labels (Proprietário, Admin, Operador, Visualizador), STATUS badges (Ativo, Pendente, Suspenso), PERMISSION labels (Criar agentes, Convidar usuários, etc), abas "Humanos" / "Solicitações pendentes" / "Convites".
6. Clicar "Editar" em um membro → ler dialog completo (título, labels, save/cancel).
7. Clicar "Remover" em um membro com tarefas atribuídas → ler texto de reatribuição com plural correto ("1 tarefa" vs "3 tarefas").
8. Navegar para `/{companyPrefix}/settings/claude-accounts`.
9. **Verificar:** Register form (label, slug, scope radios), Accounts table (Status badges, Cost summary), Rotation history.
10. Tentar registrar conta com slug duplicado → ler toast de erro em pt-BR.
11. Toggle locale para `en-US` em /instance-settings/profile.
12. **Verificar:** TODAS as superfícies revistas voltam para inglês sem reload.

### Pass/Fail dimensions

| Dimensão | Pass |
|---|---|
| Section headers (CompanySettings + CompanyAccess + ClaudeAccounts) | 100% pt-BR |
| Buttons + form labels | 100% pt-BR |
| Toast titles + bodies (success + error) | 100% pt-BR |
| Modal/dialog copy (edit, remove, archive confirm) | 100% pt-BR |
| Plural correto (tarefa/tarefas, dia/dias, etc) | i18next plural ativo |
| Locale toggle reativo sem reload | Hot-swap |
| Brand "Paperclip" preserved literal across locales | Brand intact |

---

## UAT-09-02 — Auth flow completo (signup → login → reset → invite) em pt-BR

**Requisito:** UI-06
**Plano de origem:** 09-02

### Pré-condições

- Browser limpo (cookies clearos, ou modo incógnito)
- Locale do dispositivo Accept-Language preferindo pt-BR (ou anonymous → fallback default pt-BR)
- 1 invite válido emitido por outra conta de teste

### Steps

1. Acessar `/auth?mode=sign_up` em browser limpo.
2. **Verificar:** Header eyebrow, sign-up title, descrição, labels (Nome, Email, Senha), submit button, switch CTA ("Já tem conta?") em pt-BR. Brand "Paperclip" mantido literal.
3. Preencher form com email já existente → submit.
4. **Verificar:** Toast de erro Better Auth USER_ALREADY_EXISTS em pt-BR ("Este email já está em uso. Faça login com outra conta.") com {{email}} interpolado.
5. Trocar para sign_in mode → tentar login com senha errada.
6. **Verificar:** Toast/feedback INVALID_EMAIL_OR_PASSWORD em pt-BR.
7. Acessar `/board-claim?token=...` (board claim flow) com token inválido.
8. **Verificar:** Estados (invalid-url, loading, claimed, sign-in-required, claim CTA) em pt-BR.
9. Acessar `/cli-auth?token=...` (CLI auth approval).
10. **Verificar:** Estados (loading, approved, expired, cancelled, sign-in-required) + approve view fields (Nome do dispositivo, Acesso, etc) em pt-BR.
11. Acessar `/invite?token=...` com invite válido como anonymous.
12. **Verificar:** Header eyebrow ("Você foi convidado para o Paperclip"), agent form (se invite for agent-invite), inline auth (sign-in/sign-up modes), accept CTAs, awaiting-approval panel em pt-BR.
13. Toggle locale para en-US (após login) → re-visitar invite landing.
14. **Verificar:** Todas as superfícies em inglês, brand "Paperclip" idêntico.

### Pass/Fail dimensions

| Dimensão | Pass |
|---|---|
| Auth.tsx (sign_in + sign_up modes) | 100% pt-BR |
| BoardClaim.tsx (5 estados) | 100% pt-BR |
| CliAuth.tsx (approval + states) | 100% pt-BR |
| InviteLanding.tsx (anon + authed paths + awaiting-approval) | 100% pt-BR |
| Better Auth error mapping com {{email}} | Interpolação ativa |
| Trans component (signed-in-as <strong> + ask-them-to-visit <linkTo>) | HTML interpolation correta |
| Brand "Paperclip" literal | 100% conservado |

---

## UAT-09-03 — Erros de validação em pt-BR

**Requisito:** UI-07
**Plano de origem:** 09-03a (server) + 09-03b (client)

### Pré-condições

- Locale do usuário = pt-BR
- Acesso a forms com validação Zod ativa: CompanySettings, CompanyInvites, NewIssueDialog, etc

### Steps

1. **Validação client (Zod schema → field error):** Em `/{companyPrefix}/settings/company` → tentar salvar sem name → ler erro de campo "obrigatório" ou similar em pt-BR.
2. **Validação server (Zod 422 → translateApiError):** Em qualquer mutation que dispare ZodError no server → ler toast com per-issue path traduzido (e.g., "validation.invalid_string", "validation.too_small").
3. **HttpError com code:** Tentar acessar empresa de outro tenant via URL direto → Erro `company.not-found` traduzido para pt-BR via `errors:company.not-found`.
4. **Better Auth errors:** Já cobertos em UAT-09-02.
5. **Generic fallback:** Forçar erro raw sem code (e.g., 500 server error) → toast com `errors:generic.unknown` + raw message em itálico.
6. Toggle locale en-US → re-disparar mesmos erros.
7. **Verificar:** Mesmos erros agora em inglês.

### Pass/Fail dimensions

| Dimensão | Pass |
|---|---|
| Zod field-level errors em pt-BR | Per-issue translated |
| HttpError(*WithCode) → translateApiError → t() | Code → key resolution |
| Generic fallback com raw italics | Graceful |
| Locale toggle para en-US re-traduz | Hot-swap |

---

## UAT-09-04 — Toasts, modais de confirmação e tooltips em pt-BR

**Requisito:** UI-08
**Plano de origem:** 09-04 (este plano)

### Pré-condições

- Locale do usuário = pt-BR
- Acesso a fluxos com toast/modal/confirm: CompanyAccess (remove member), CompanySettings (archive company), AgentDetail (clear sessions), ApprovalDetail (delete disapproved agent), heartbeats (disable all)

### Steps

1. **Toast simples:** Em CompanyAccess, editar membro → salvar → ler toast "Membro atualizado" (sucesso, `common:toast.member-updated` ou `settings:company.access.toasts.member-updated`).
2. **Toast com plural i18next:** Remover membro com 1 tarefa atribuída → reatribuir → ler "1 tarefa reatribuída." (singular). Repetir com 3 tarefas → ler "3 tarefas reatribuídas." (plural).
3. **Confirm body:** Em CompanySettings → Danger Zone → Arquivar empresa → ler `window.confirm` body em pt-BR ("Arquivar empresa \"{{name}}\"? Ela será escondida da barra lateral.").
4. **Confirm body com plural:** Em AgentDetail → RunDetail → "limpar sessão para essas tarefas" → ler "Limpar sessão para 1 tarefa tocada por esta execução?" (singular) ou "Limpar sessão para 3 tarefas tocadas..." (plural).
5. **Confirm body simples:** Em ApprovalDetail (agente reprovado) → "Excluir agente reprovado?" body em pt-BR.
6. **Tooltip/title:** Spot-check breadcrumbs sidebar toggle (open/close) → tooltip em pt-BR.
7. **Empty state:** Navegar para empresa sem agentes → ler empty state em pt-BR.
8. Toggle locale en-US → re-disparar mesmos toasts/modals.
9. **Verificar:** Todos voltam para inglês sem reload.

### Pass/Fail dimensions

| Dimensão | Pass |
|---|---|
| pushToast com title=t() | 100% pt-BR |
| Plural i18next _one/_other em toast | Singular/plural correto |
| window.confirm com t() | 100% pt-BR |
| Plural em confirm body | Singular/plural correto |
| Tooltips (title=, aria-label=) em superfícies migradas | 100% pt-BR |
| Empty states (sem dados, sem resultados) | 100% pt-BR |
| Locale toggle reativo | Hot-swap |

---

## Closure Mechanics

Após validação manual:

1. Operador marca cada UAT como **PASSED** ou **FAILED** + comentários neste arquivo.
2. Se PASSED: atualizar frontmatter `status: passed` e mover artifact para `.planning/phases/09-traducao-ui-admin-auth-sistemicas/closed/`.
3. Se FAILED: criar issue com label `i18n-regression` + linkar ao componente específico.
4. Atualizar `.planning/REQUIREMENTS.md` linha de cada UI-04/06/07/08 com data de validação humana real.
