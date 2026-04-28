# Fase 19: Pesquisadores Paralelos e QA - Contexto

**Coletado:** 2026-04-28
**Status:** Pronto para execução direta
**Modo:** Auto-gerado (continua o padrão da Fase 18 — instruções operacionais para agentes)

<domain>
## Limite da Fase

Substituir os corpos mínimos (Fase 17) de 4 agentes por instruções operacionais completas:
- `research-doc.md` — busca docs/repos externos read-only
- `code-analyzer.md` — análise de código local read-only
- `qa-loop.md` — gate 80% com critério de parada explícito
- `doc-before-after.md` — captura state-before/after via issue_documents

Já existe a seção `## Handoff at completion` em cada arquivo (Fase 18). Esta fase preenche o corpo principal antes da seção de handoff.

</domain>

<decisions>
## Decisões de Implementação

### research-doc — comportamento detalhado (PIPE-01, PIPE-03)
- Modo: estritamente read-only (sem Write/Edit no repo local)
- Ferramentas: WebSearch, WebFetch, Grep, Read em referências locais
- Saída: findings em `pipeline-handoff.upstream_findings.research_doc` (multi-line YAML)
- Foco: padrões canônicos, versão correta de API/lib, exemplos do GitHub
- TTL: respeita 30min imposto pelo orquestrador

### code-analyzer — comportamento detalhado (PIPE-02, PIPE-03)
- Modo: estritamente read-only (Read, Grep, Bash apenas para leitura — `git log`, `cat`, `grep`)
- Saída: diagnóstico em `pipeline-handoff.upstream_findings.code_analyzer` (arquivo, linha, função, padrão problemático, callers/callees)
- Profundidade: até 2 níveis de callers/callees por padrão
- TTL: respeita 30min

### qa-loop — gate objetivo + critério de parada (PIPE-04, PIPE-05, PIPE-06)
- Comando único: `pnpm test --coverage --reporter=json` (ou equivalente do projeto)
- Métrica única: campo `total.lines.pct` ≥ 80 do JSON output
- 3 outcomes:
  - APPROVED (≥80%) → handoff `qa_gate_status: APPROVED` → orquestrador prossegue
  - RETRY (<80%, iteração < 3) → handoff `qa_gate_status: RETRY` + lista de testes falhando → orquestrador devolve para correção, incrementa iteration em pipeline-status
  - PARTIAL_SUCCESS (3 iterações sem atingir gate) → handoff `qa_gate_status: PARTIAL_SUCCESS` → orquestrador encadeia Tech-Debt-Documenter (Fase 21) e encerra com débito documentado

### doc-before-after — captura por etapa (PIPE-07)
- Acionado APÓS cada etapa que modificou o sistema (execução, deploy)
- Persiste 2 documentos por etapa modificada:
  - `state-before-{stage}` — git diff dos arquivos antes (ou snapshot se non-git state)
  - `state-after-{stage}` — git diff equivalente depois
- "Estado relevante" = arquivos listados em `pipeline-status.completed_stages[].artifacts_produced`

### Discrição do Claude
- Formato exato dos códigos exemplos no system prompt: a critério (manter consistente com o padrão da Fase 18)
- Linguagem do system prompt: inglês para orquestração técnica (consistente com orchestrator-maintenance e padrão Claude Code)

</decisions>

<code_context>
## Insights do Código Existente

### Ativos Reutilizáveis (já consolidados)
- `skills/paperclip/rules/handoff-protocol.md` (Fase 18) — schema canônico
- `.claude/agents/orchestrator-maintenance.md` (Fase 18, 364 linhas) — referência de formato e tom
- Seção `## Handoff at completion` já presente em cada um dos 4 agentes (Fase 18)

### Padrão Estabelecido na Fase 18
- Body começa com objetivo de 1 parágrafo
- Seção "Pipeline Stages" se aplicável
- Seção "Procedure" passo-a-passo com bash blocks de exemplo
- Seção "Handoff at completion" (já presente)

</code_context>

<specifics>
## Ideias Específicas
- O comando exato do pnpm para coverage deve referenciar o test runner usado no monorepo (vitest na maioria dos packages)
- O JSON parser do qa-loop deve falhar abertamente se o output não tiver `total.lines.pct` — não interpretar subjetivamente

</specifics>

<deferred>
## Ideias Adiadas
- Supabase agents (executor + diagnostician) → Fase 20
- Tech-Debt-Documenter + Notion → Fase 21
- E2E smoke validation → Fase 22

</deferred>
