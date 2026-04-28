# Fase 21: Integração Notion e Gate de Produção - Contexto

**Coletado:** 2026-04-28
**Status:** Pronto para execução

<domain>
- Adicionar chave `tech_debt` ao `.claude/notion-config.json` (NOTI-04)
- Documentar criação automática de página Notion no orchestrator-maintenance quando QA retorna PARTIAL_SUCCESS (NOTI-01, NOTI-02, NOTI-03)
</domain>

<decisions>
### Procedimento (no orchestrator-maintenance)
- Step A: ler tech_debt ID do notion-config.json; falhar com NOTION_TECH_DEBT_NOT_CONFIGURED se placeholder
- Step B: schema de campos obrigatórios (date, pipeline, title, impact, resolution_criteria, estimate, affected_files, qa_evidence)
- Step C: usar mcp__claude_ai_Notion__notion-create-pages com title prefixado por [issue-id]
- Step D: gh pr edit appending Notion URL ao PR body
- Step E: registrar tech_debt_recorded em pipeline-status

### Discrição do Claude
- Formato exato do markdown body: a critério (Notion converte estruturas comuns)
- Estimate: small/medium/large baseado em dias

</decisions>

<deferred>
- Validação runtime do tech_debt page schema → futuro
- UI de listagem de débitos no paperclip → v2

</deferred>
