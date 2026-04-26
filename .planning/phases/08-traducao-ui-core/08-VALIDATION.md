---
phase: 8
slug: traducao-ui-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-26
---

# Fase 8 — Estratégia de Validação

> Contrato de validação por fase. Tradução UI Core é predominantemente edição de strings; validação automatizada cobre presença de chaves, gaps de dicionários, e roundtrip do activity log. Validação visual final é HUMAN-UAT.

---

## Infraestrutura de Testes

| Propriedade | Valor |
|-------------|-------|
| **Framework** | Vitest 3.0.5 (UI + server) |
| **Arquivo de config** | `ui/vitest.config.ts`, `server/vitest.config.ts` (existentes) |
| **Comando UI rápido** | `pnpm --filter @paperclipai/ui test:run` |
| **Comando server rápido** | `pnpm --filter @paperclipai/server test:run` |
| **Detector i18n keys** | `pnpm --filter @paperclipai/ui test:run -- missing-keys` (CI=true → erra; dev=warn) |
| **Suite completa** | `pnpm test:run && pnpm -r typecheck` |

---

## Taxa de Amostragem

- **Após cada commit de tarefa:** vitest no workspace afetado
- **Após cada wave:** `pnpm test:run && pnpm -r typecheck`
- **Antes de `/verificar-trabalho`:** suite completa + `missing-keys` GREEN (CI=true) + visual UAT
- **Latência máxima:** ~60s por workspace

---

## Mapa de Verificação Por Requisito

| Requisito | Plano | Wave | Tipo de Teste | Comando Automatizado | Arquivo Existe | Status |
|-----------|-------|------|---------------|---------------------|----------------|--------|
| UI-01 (Inbox) | 08-01 | 1 | unit + missing-keys | `pnpm --filter @paperclipai/ui test:run -- inbox` + missing-keys | ❌ Wave 0 (extender missing-keys.test.ts patterns) | ⬜ pending |
| UI-02 (Projects) | 08-02 | 1 | unit + missing-keys | `pnpm --filter @paperclipai/ui test:run -- projects` + missing-keys | ❌ Wave 0 | ⬜ pending |
| UI-03 (Settings) | 08-03 | 1 | unit + missing-keys | `pnpm --filter @paperclipai/ui test:run -- settings` + missing-keys | ❌ Wave 0 | ⬜ pending |
| UI-05 (Nav) | 08-04 | 1 | unit (RTL render) + missing-keys | sidebar/header/breadcrumbs render tests | ❌ Wave 0 | ⬜ pending |
| UI-09 (Activity log) | 08-05 | 2 | integration (server emit) + unit (client render) | `auth-routes-locale` style; `ActivityRow.test.tsx` snapshot | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requisitos do Wave 0

- [ ] Estender `ui/src/i18n/__tests__/missing-keys.test.ts` se necessário para cobrir novas areas (provavelmente já cobre — só mais chaves)
- [ ] `ui/src/components/inbox/__tests__/InboxList.translation.test.tsx` — RTL render com pt-BR ativo, asserções de strings em PT
- [ ] `ui/src/pages/__tests__/Projects.translation.test.tsx` — RTL render
- [ ] `ui/src/components/layout/__tests__/Sidebar.translation.test.tsx` — RTL render
- [ ] `ui/src/components/activity/__tests__/ActivityRow.test.tsx` — render com `actionKey` (preferred) e fallback legacy `action`
- [ ] `server/src/__tests__/activity-log-action-key.test.ts` — integration test verificando `logActivity` aceita `actionKey + paramsJson` e persiste; emite event com shape correto
- [ ] `packages/db/src/migrations/0074_add_activity_action_key.sql` — migration source

---

## Verificações Somente Manuais

| Comportamento | Requisito | Por que Manual | Instruções de Teste |
|---------------|-----------|----------------|---------------------|
| Toggle pt-BR/en-US troca todas as labels visíveis em Inbox sem deixar string em inglês | UI-01 | Cobertura visual completa só validável em browser | UAT-08-01 |
| Idem para Projects | UI-02 | idem | UAT-08-02 |
| Idem para Settings | UI-03 | idem | UAT-08-03 |
| Sidebar/Header/Breadcrumbs todos em pt-BR | UI-05 | navegação global, validação visual | UAT-08-04 |
| Activity log entries antigos (sem actionKey) renderizam com fallback "(legado)" sem quebrar; entries novos renderizam traduzidos | UI-09 | DB tem entries históricos; precisa confirmar render real | UAT-08-05 |

---

## Aprovação de Validação

- [ ] Toda task tem verify automatizado (extensão de missing-keys + render tests por superfície)
- [ ] Sem 3 tarefas consecutivas sem verificação automatizada
- [ ] Wave 0 completo
- [ ] missing-keys.test.ts CI=true exit 0 ao final da fase
- [ ] HUMAN-UAT cobre cobertura visual de cada superfície
- [ ] `nyquist_compliant: true` ao concluir

**Aprovação:** pending
