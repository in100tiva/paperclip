---
phase: 7
slug: foundation-i18n-toggle-de-settings
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-26
---

# Fase 7 — Estratégia de Validação

> Contrato de validação por fase para amostragem de feedback durante a execução.

---

## Infraestrutura de Testes

| Propriedade | Valor |
|-------------|-------|
| **Framework** | Vitest 3.0.5 (UI workspace) + Vitest 3.0.5 (server workspace) |
| **Arquivo de config** | `ui/vitest.config.ts`, `server/vitest.config.ts` (existentes) |
| **Comando de execução rápida** | `pnpm --filter @paperclipai/ui test:run` ou `pnpm --filter @paperclipai/server test:run` |
| **Comando de suite completa** | `pnpm test:run && pnpm -r typecheck` |
| **Tempo estimado** | ~60s (UI) + ~30s (server) + ~20s (typecheck) |

---

## Taxa de Amostragem

- **Após cada commit de tarefa:** `pnpm --filter @paperclipai/{ui|server} test:run` (workspace afetado)
- **Após cada wave do plano:** `pnpm test:run && pnpm -r typecheck`
- **Antes de `/verificar-trabalho`:** Suite completa verde + UAT-07-01/02 confirmados
- **Latência máxima de feedback:** ~60 segundos por workspace

---

## Mapa de Verificação Por Tarefa

| Requisito | Plano | Wave | Tipo de Teste | Comando Automatizado | Arquivo Existe | Status |
|-----------|-------|------|---------------|---------------------|----------------|--------|
| SETTINGS-01 | TBD | TBD | unit (RTL) | `pnpm --filter @paperclipai/ui test:run -- ProfileSettings` | ❌ Wave 0 | ⬜ pending |
| SETTINGS-02 | TBD | TBD | integration | `pnpm --filter @paperclipai/server test:run -- auth.locale` | ❌ Wave 0 | ⬜ pending |
| SETTINGS-03 | TBD | TBD | integration + unit | server route + UI init test | ❌ Wave 0 | ⬜ pending |
| SETTINGS-04 | TBD | TBD | unit (RTL) + HUMAN-UAT | `await i18n.changeLanguage('en-US')` em mutation | ❌ Wave 0 + UAT-07-01 | ⬜ pending |
| I18N-01 | TBD | TBD | unit | `pnpm --filter @paperclipai/ui test:run -- i18n.init` | ❌ Wave 0 | ⬜ pending |
| I18N-02 | TBD | TBD | filesystem test | walk locales dir, assert 16 JSON files | ❌ Wave 0 | ⬜ pending |
| I18N-03 | TBD | TBD | unit | `i18n.t('settings.test-key-only-in-en')` retorna en-US | ❌ Wave 0 | ⬜ pending |
| I18N-04 | TBD | TBD | self-validating test | `pnpm test -- missing-keys` | ❌ Wave 0 | ⬜ pending |
| I18N-05 | TBD | TBD | integration | supertest + middleware-locale.test.ts | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Plano e Wave preenchidos pelo planner ao gerar PLAN.md.*

---

## Requisitos do Wave 0

- [ ] `ui/src/i18n/index.ts` — i18next init module (consumido por todas as tasks UI)
- [ ] `ui/src/i18n/resources.ts` — static JSON imports + resources object
- [ ] `ui/src/i18n/i18next.d.ts` — TypeScript module augmentation
- [ ] `ui/src/i18n/locales/pt-BR/{common,inbox,projects,settings,auth,agents,errors,activity}.json` — 8 bootstrap dicts
- [ ] `ui/src/i18n/locales/en-US/{common,inbox,projects,settings,auth,agents,errors,activity}.json` — 8 bootstrap dicts
- [ ] `ui/src/i18n/__tests__/init.test.ts` — cobre I18N-01, I18N-02, I18N-03
- [ ] `ui/src/i18n/__tests__/missing-keys.test.ts` — cobre I18N-04 (Pattern 7 do RESEARCH)
- [ ] `ui/src/pages/__tests__/ProfileSettings.locale-toggle.test.tsx` — cobre SETTINGS-01, SETTINGS-04
- [ ] `server/src/__tests__/auth-routes-locale.test.ts` — cobre SETTINGS-02, SETTINGS-03 (server side)
- [ ] `server/src/__tests__/middleware-locale.test.ts` — cobre I18N-05
- [ ] `packages/db/src/migrations/0073_add_user_locale.sql` — migration source (DB-03 CI-only apply)
- [ ] Test fixtures: factory para criar `authUsers` row com `locale='pt-BR'` ou `'en-US'`

---

## Verificações Somente Manuais

| Comportamento | Requisito | Por que Manual | Instruções de Teste |
|---------------|-----------|----------------|---------------------|
| Toggle troca idioma da UI ao vivo, sem reload | SETTINGS-01, SETTINGS-04 | Validação visual end-to-end depende de browser real interagindo com server real | UAT-07-01 (ver RESEARCH §"HUMAN-UAT") |
| Default pt-BR para novo usuário | SETTINGS-03 | Fluxo de signup envolve Better Auth + redirects + first-render — UAT confirma path completo | UAT-07-02 (ver RESEARCH §"HUMAN-UAT") |

---

## Aprovação de Validação

- [ ] Todas as tarefas têm verify `<automated>` ou dependências Wave 0
- [ ] Continuidade de amostragem: sem 3 tarefas consecutivas sem verificação automatizada
- [ ] Wave 0 cobre todas as referências MISSING acima
- [ ] Sem flags de modo watch
- [ ] Latência de feedback < 60s por workspace
- [ ] `nyquist_compliant: true` definido no frontmatter ao final do planejamento

**Aprovação:** pending
