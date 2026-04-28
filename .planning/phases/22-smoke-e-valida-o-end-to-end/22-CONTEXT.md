# Fase 22: Smoke e Validação End-to-End - Contexto

**Coletado:** 2026-04-28
**Status:** Pronto para HUMAN-UAT
**Modo:** Validação empírica — exige paperclip rodando com a in100tiva no Supabase

<domain>
## Limite da Fase

Validar que o pipeline completo construído pelas Fases 17-21 funciona de
ponta a ponta com uma issue real de manutenção. Esta fase NÃO escreve novo
código — ela executa o sistema construído e captura evidência empírica.

A validação é HUMAN-UAT por natureza: requer paperclip dev rodando, conta
Claude Code conectada, e a in100tiva populada no Supabase compartilhado.

</domain>

<decisions>
## Decisões de Implementação

### Procedimento canônico

Persistido em `22-HUMAN-UAT.md` com 5 UATs cobrindo:
- UAT-22-01: Paralelismo Research-Doc + Code-Analyzer simultaneamente
- UAT-22-02: Orchestrator distribui escopos disjuntos para executores
- UAT-22-03: QA-Loop encerra em ≤ 3 iterações com resultado objetivo
- UAT-22-04: Handoffs estruturados com 5 campos preenchidos em cada etapa
- UAT-22-05: Notion URL no PR quando passRate < 80%; ausente quando ≥ 80%

### Discrição do Claude

- A escolha exata da issue de smoke é do operador humano (recomendado: bug
  pequeno e localizável, escopo de 1-2 arquivos, com testes existentes)
- A calibração final do budget do orquestrador (Open Question da pesquisa)
  só é mensurável após a primeira execução completa

</decisions>

<code_context>
## Insights do Código Existente

Toda a infraestrutura está pronta:
- Fase 17: 7 agentes registrados com hierarquia
- Fase 18: protocolo de handoff + orchestrator-maintenance operacional
- Fase 19: research-doc, code-analyzer, qa-loop, doc-before-after com bodies completos
- Fase 20: supabase-executor + supabase-diagnostician + skill supabase-mcp
- Fase 21: notion-config.json com tech_debt + procedimento Notion no orchestrator

</code_context>

<specifics>
## Ideias Específicas

- Antes do smoke, popular `notion-config.json.tech_debt` com um database real
- Antes do smoke, garantir `SUPABASE_ACCESS_TOKEN` disponível via env (caso
  o smoke envolva deploy)

</specifics>

<deferred>
## Ideias Adiadas

- Calibração de budget do orquestrador → mensurável apenas após smoke real
- Refinamento de TTL (30min) → ajustar empíricamente após múltiplas execuções

</deferred>
