---
status: pending
phase: 16
created_at: 2026-04-27
---

# Phase 16 — HUMAN-UAT

UATs empíricos delegados ao operador humano. Não foram executados pelo Claude executor por exigirem validação visual e mutação de arquivos do framework local.

## UAT-16-01: Re-execução idempotente

**Setup:** sync já rodou com sucesso (Phase 13/14).

1. Rode `pnpm sync-agents` sem editar nada.
2. Espere ver: `Created: 0, Updated: 0, Unchanged: 18`.
3. Rode `pnpm sync-skills` sem editar nada.
4. Espere ver: `Updated: 0, Unchanged: 20`.

**Critério de sucesso:** ambos retornam exit 0, zero changes, contagens batem.

## UAT-16-02: Drift detection em agente

**Setup:** sync rodou recentemente.

1. Edite [.claude/agents/planner.md](.claude/agents/planner.md), mude o `description:` no frontmatter.
2. Rode `pnpm sync-agents`.
3. Espere ver: `Updated: 1` (planner) e `Unchanged: 17`.
4. Verifique no banco que `agents.capabilities` reflete a nova description:
   ```sql
   SELECT name, capabilities FROM agents
   WHERE company_id = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6'
     AND metadata->>'frameworkSlug' = 'planner';
   ```
5. Reverta o arquivo (`git checkout .claude/agents/planner.md`).
6. Rode `pnpm sync-agents` novamente — espere `Updated: 1` (revertendo) e `Unchanged: 17`.

**Critério:** o sync detecta a mudança em `description` (que vai para `capabilities`), atualiza só o agente afetado, e reverte limpo.

## UAT-16-03: Drift detection em skill

**Setup:** sync já rodou.

1. Edite o SKILL.md de uma das skills — `.claude/skills/design-guide/SKILL.md` é o mais fácil (diretório direto).
2. Adicione um comentário ou trecho.
3. Rode `pnpm sync-skills`.
4. Espere ver no Skill rows section: `updated design-guide`.
5. Reverta o arquivo.
6. Rode `pnpm sync-skills` — espere `updated design-guide` (revertendo) e attachments unchanged.

**Critério:** skill atualizada não perde attachments dos UI agents (`ui-researcher`, `ui-auditor`, `ui-checker`).

## UAT-16-04: CEO/INTA-1 intactos após múltiplas execuções

**Setup:** sync já rodou várias vezes.

```sql
SELECT id, name, role, title, reports_to, adapter_config, runtime_config, metadata
FROM agents
WHERE id = 'd64a9f21-3ad0-4ca5-b7e8-58dbefb55b75';
```

**Critério:** CEO continua com `role='ceo'`, `reports_to IS NULL`, e seu `adapter_config` original (sem `desiredSkillKeys` modificado). `metadata.frameworkSlug` deve ser ausente — CEO não é tocado pelo sync.

```sql
SELECT identifier, title, status, assignee_agent_id
FROM issues
WHERE company_id = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6';
```

**Critério:** issue INTA-1 ainda existe com `assignee_agent_id` apontando para CEO.

## UAT-16-05: Visual no paperclip UI (combinado com Phase 15)

1. `pnpm dev` (subir servidor).
2. Abra `http://127.0.0.1:3100`, navegue para in100tiva.
3. Abra perfil do agente Planner.
4. Espere ver badge "Serial" amarelo próximo ao nome.
5. Abra perfil do Executor — espere "Parallel" verde.
6. Abra perfil do Verifier — espere "Gate" roxo.
7. Abra organograma — espere ver 4 níveis com 19 agentes (CEO + 4 Heads + 14 specialists + CTO se ainda existir).

**Critério:** badge renderiza com cor correta para cada policy; organograma mostra hierarquia limpa; CEO no topo, Heads no segundo nível, specialists abaixo.
