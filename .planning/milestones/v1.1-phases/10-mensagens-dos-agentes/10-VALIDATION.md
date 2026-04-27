---
phase: 10
slug: mensagens-dos-agentes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Fase 10 — Estratégia de Validação

> Tradução de mensagens dos agentes (texto do código paperclip, NÃO output do modelo). Reusa toda infra Fases 7-9.

---

## Infraestrutura de Testes

| Propriedade | Valor |
|-------------|-------|
| Framework | Vitest 3.0.5 (UI + server) |
| Comando UI rápido | `pnpm --filter @paperclipai/ui test:run` |
| Detector i18n keys | `CI=true pnpm --filter @paperclipai/ui test:run -- missing-keys` |
| Suite completa | `pnpm test:run && pnpm -r typecheck` |

---

## Mapa de Verificação Por Requisito

| Req | Plano | Wave | Tipo | Comando |
|-----|-------|------|------|---------|
| AGENT-MSG-01 (status) | 10-01 | 1 | unit + missing-keys | `vitest run -- AgentDetail.i18n` |
| AGENT-MSG-02 (summaries) | 10-02 | 1 | unit + missing-keys | `vitest run -- RunTranscript.i18n` |
| AGENT-MSG-03 (prompts UI) | 10-01 | 1 | unit + missing-keys | shared with AGENT-MSG-01 |
| AGENT-MSG-04 (notifications) | 10-03 | 2 | unit (LiveUpdatesProvider tRef) | `vitest run -- LiveUpdatesProvider.i18n` |

---

## Wave 0 — Test Files

- [ ] `agents.json` populated for both locales (currently `{}`)
- [ ] `common.json` extended with `toast.agent.*` + `toast.run.*` sub-trees (preserving Phases 7-9 keys)
- [ ] `ui/src/pages/__tests__/AgentDetail.i18n.test.tsx`
- [ ] `ui/src/components/agents/__tests__/RunTranscript.i18n.test.tsx`
- [ ] `ui/src/context/__tests__/LiveUpdatesProvider.i18n.test.tsx`

---

## HUMAN-UAT

| UAT | Behavior |
|-----|----------|
| UAT-10-01 | AgentDetail painel todo em pt-BR (status badges, abas, action buttons, configuration view) |
| UAT-10-02 | Run summaries (transcript view, ledger, chat surface) em pt-BR |
| UAT-10-03 | Toasts de eventos de agente (status change, swap, approval-required) em pt-BR |

---

## Aprovação

- [ ] Toda task tem `<verify><automated>`
- [ ] missing-keys CI=true exit 0 ao final
- [ ] HUMAN-UATs documentados
- [ ] `nyquist_compliant: true` ao concluir

**Aprovação:** pending
