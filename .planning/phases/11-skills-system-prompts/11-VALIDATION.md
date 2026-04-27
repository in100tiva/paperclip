---
phase: 11
slug: skills-system-prompts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Fase 11 — Estratégia de Validação

> System prompts condicionais por locale. Última fase do milestone v1.1. Validação combina automated (resolução de locale, composição de directive) + HUMAN-UAT (modelo realmente responde em pt-BR).

---

## Infraestrutura de Testes

| Propriedade | Valor |
|-------------|-------|
| Framework | Vitest 3.0.5 (server) |
| Comando rápido | `pnpm --filter @paperclipai/server test:run -- agent-instructions` |
| Suite completa | `pnpm test:run && pnpm -r typecheck` |

---

## Mapa de Verificação Por Requisito

| Req | Plano | Wave | Tipo | Comando |
|-----|-------|------|------|---------|
| AGENT-SKILL-01 (directive condicional) | 11-02 | 2 | unit | `vitest run -- agent-instructions.locale-directive` |
| AGENT-SKILL-02 (skills traduzidos) | 11-03 | 2 | unit + filesystem | `vitest run -- skills.locale-variants` |
| AGENT-SKILL-03 (locale propagation) | 11-01 | 1 | integration | `vitest run -- agent-instructions.locale-resolution` |
| AGENT-SKILL-04 (validação empírica) | 11-03 | 2 | HUMAN-UAT | UAT-11-01..03 |

---

## Wave 0 — Test Files

- [ ] `server/src/services/__tests__/agent-instructions.locale-resolution.test.ts` — locale lookup via wakeup actorId
- [ ] `server/src/services/__tests__/agent-instructions.locale-directive.test.ts` — directive content composition
- [ ] `server/src/services/__tests__/skills.locale-variants.test.ts` — SKILL.{locale}.md loading
- [ ] `server/src/services/__tests__/prompt-cache.locale-key.test.ts` — bundleKey includes locale
- [ ] 4 SKILL.pt-BR.md files for skills/paperclip/, skills/paperclip-create-agent/, skills/paperclip-create-plugin/, skills/para-memory-files/

---

## HUMAN-UAT (Required AGENT-SKILL-04)

| UAT | Behavior |
|-----|----------|
| UAT-11-01 | User locale=pt-BR aciona novo agente via Claude Code → output do agente em pt-BR |
| UAT-11-02 | User troca para en-US → próxima execução agente responde em inglês (sem cache pollution) |
| UAT-11-03 | Skill variant pt-BR carregada e referenciada corretamente em chat com agente |

---

## Aprovação

- [ ] Toda task automated tem `<verify><automated>`
- [ ] HUMAN-UAT-11 documentado para AGENT-SKILL-04
- [ ] `nyquist_compliant: true` ao concluir

**Aprovação:** pending
