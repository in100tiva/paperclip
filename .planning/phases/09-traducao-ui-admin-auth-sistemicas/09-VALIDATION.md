---
phase: 9
slug: traducao-ui-admin-auth-sistemicas
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-26
---

# Fase 9 — Estratégia de Validação

> Tradução UI Admin + Auth + Mensagens Sistêmicas. Reusa infraestrutura i18n (Fase 7) + padrões de tradução (Fase 8). Adiciona contrato server-error-code → client-translate.

---

## Infraestrutura de Testes

| Propriedade | Valor |
|-------------|-------|
| Framework | Vitest 3.0.5 (UI + server) |
| Comando UI rápido | `pnpm --filter @paperclipai/ui test:run` |
| Comando server rápido | `pnpm --filter @paperclipai/server test:run` |
| Detector i18n keys | `CI=true pnpm --filter @paperclipai/ui test:run -- missing-keys` |
| Suite completa | `pnpm test:run && pnpm -r typecheck` |

---

## Mapa de Verificação Por Requisito

| Req | Plano | Wave | Tipo | Comando | Wave 0 |
|-----|-------|------|------|---------|--------|
| UI-04 (Admin) | 09-01 | 1 | unit + missing-keys | `vitest run -- admin.translation` | ❌ |
| UI-06 (Auth) | 09-02 | 1 | unit + missing-keys | `vitest run -- auth.translation` | ❌ |
| UI-07 (Errors) | 09-03 | 1 (server) + 2 (client) | integration + unit | server: `vitest run -- error-codes`; client: `vitest run -- translateApiError` | ❌ |
| UI-08 (Tooltips/etc) | 09-04 | 2 | unit (RTL render) | `vitest run -- toast.translation` `confirm.translation` `tooltip.translation` | ❌ |

---

## Wave 0 — Test Files / Infra Stubs

- [ ] `server/src/errors.ts` — Add optional `code` field to HttpError + new `*WithCode()` helpers (preserves 130+ callsites)
- [ ] `server/src/__tests__/error-codes.test.ts` — Server emits stable codes for prioritized errors
- [ ] `ui/src/lib/translateApiError.ts` — Client-side helper mapping error.code → t("errors:code"); fallback to raw + italics
- [ ] `ui/src/lib/__tests__/translateApiError.test.ts` — Unit tests
- [ ] `ui/src/pages/__tests__/Admin.translation.test.tsx`
- [ ] `ui/src/pages/__tests__/Auth.translation.test.tsx`
- [ ] `ui/src/components/ui/__tests__/Toast.translation.test.tsx` (or context test)
- [ ] auth.json + errors.json populated for both locales (currently `{}`)
- [ ] common.json extended with confirm/toast/empty/tooltip sub-trees (preserving Phase 7-8 keys)

---

## HUMAN-UAT (não-automatizável)

| UAT | Behavior |
|-----|----------|
| UAT-09-01 | CompanySettings + ClaudeAccounts + members/roles em pt-BR completo |
| UAT-09-02 | Auth flow completo (signup → login → reset → invite) em pt-BR |
| UAT-09-03 | Erros de validação visualizados em pt-BR (ex: email inválido, senha curta) |
| UAT-09-04 | Toasts, modais de confirmação e tooltips em pt-BR; toggle volta para en-US |

---

## Aprovação

- [ ] Toda task tem `<verify><automated>`
- [ ] missing-keys CI=true exit 0 ao final
- [ ] Wave 0 completo
- [ ] HUMAN-UATs documentados
- [ ] `nyquist_compliant: true` ao concluir

**Aprovação:** pending
