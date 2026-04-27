# Phase 15: UI Surfacing & Hierarchy Validation - Contexto

**Coletado:** 2026-04-27
**Status:** Pronto para planejamento
**Modo:** Auto-gerado (UI mecânica — discuss pulado)

<domain>
## Limite

Adicionar badge `ParallelismBadge` ao perfil do agente (AgentDetail) lendo de `agent.metadata.parallelismPolicy`. OrgChart já consome `reports_to` automaticamente — basta verificar via HUMAN-UAT que a hierarquia importada renderiza correto.

</domain>

<decisions>
## Discrição do Claude

- **Componente novo:** `ui/src/components/ParallelismBadge.tsx` — leve, ~50 LOC, três cores (amber=serial, emerald=parallel, purple=gate), title attribute, render-nothing quando policy é null/undefined.
- **Integração:** AgentDetail.tsx header next to agent name, before status badge.
- **Type-safe access:** `(agent.metadata as Record<string, unknown> | null)?.parallelismPolicy as string | undefined`.
- **Test:** routed para HUMAN-UAT (precedente v1.1 — todas fases UI rotearam UATs visuais).
- **OrgChart:** sem mudanças necessárias — reports_to já populado pela Phase 13 alimenta o componente automaticamente.

</decisions>

<code_context>

- `StatusBadge` em `ui/src/components/StatusBadge.tsx` — pattern para badges pequenos.
- `OrgChart` em `ui/src/pages/OrgChart.tsx` — provavelmente já lê `reports_to` (precisa verificar via HUMAN-UAT).
- `Agent.metadata: Record<string, unknown> | null` — disponível no shared type.
- Pre-existing typecheck baseline: `ActivityRow.tsx:42` TS2339 (fora-de-escopo desde v1.1).

</code_context>

<deferred>
- Documentação operacional → Phase 16
</deferred>
