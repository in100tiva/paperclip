# Pesquisa de Stack — DDD Paperclip v1.3: Workflow de Manutenção Paralela

**Domínio:** Adições de stack para pipeline de manutenção com paralelismo — pipeline de agentes em paralelo, Supabase via MCP, Notion via MCP, handoff de contexto estruturado entre agentes.
**Pesquisado:** 2026-04-28
**Confiança:** HIGH para primitivas nativas do Paperclip (lidas diretamente do código); MEDIUM para integração MCP (MCP tools disponíveis no ambiente mas comportamento de wiring depende de instrução em system prompt de agente, não de código novo).

> **Nota de escopo**: Este documento complementa o STACK.md existente (pesquisa de 2026-04-25, que cobre o baseline v1.0–v1.2 completo). Cobre **somente as adições necessárias para v1.3**. Tecnologias já documentadas (Drizzle, Express, Better Auth, postgres-js, Supabase pooler, multi-account pool) não são repetidas aqui.

---

## Resumo Executivo

O v1.3 não exige nenhuma dependência npm nova. As quatro capacidades alvo — (1) pipeline de execução paralela, (2) deploy Supabase via MCP, (3) criação de páginas Notion via MCP, (4) handoff de contexto estruturado — todas se implementam inteiramente sobre primitivas já existentes no Paperclip, combinadas com:

- **Configuração de agentes** (system prompt + `agents.metadata`) para novos agentes especializados — nenhum código novo de runtime.
- **Issue tree + blockers** (tabelas `issues.parent_id` + `issue_relations.type = 'blocks'`) já presentes e funcionais para controlar paralelismo.
- **`issue_documents` / `documentService`** já presentes para armazenar handoffs estruturados como documentos em issues.
- **MCP tools** (`mcp__supabase__*` e `mcp__notion__*`) injetadas no ambiente Claude Code pelos system prompts dos agentes Supabase-Executor e Notion-Doc — **sem wiring de código do servidor**.
- **`agent_continuation_summary`** (document key `__continuation_summary__`) já implementada com `refreshIssueContinuationSummary` — reaproveitável como base dos handoffs.

O único código novo do servidor necessário está em dois pontos opcionais de polimento: (a) um script de sync de agentes expandido para adicionar os 7 novos agentes ao org chart da in100tiva, e (b) possivelmente um novo `issue_document` key reservado `__handoff__` se o handoff estruturado precisar de semântica separada da continuation summary existente.

---

## Stack Recomendado para v1.3

### Primitivas Nativas do Paperclip — Já Existentes, Nenhuma Instalação Necessária

| Primitiva | Localização no Código | Como Serve ao v1.3 | Confiança |
|-----------|----------------------|-------------------|-----------|
| **`issues.parent_id`** | `packages/db/src/schema/issues.ts:29` | Cria issues filhas de uma issue orquestradora — base do pipeline hierárquico paralelo | HIGH |
| **`issue_relations` (`type = 'blocks'`)**| `packages/db/src/schema/issue_relations.ts:12` | Bloqueia agentes em sequência; orquestrador pode criar relação `blocks` entre Research-Doc e Code-Analyzer para forçar gate antes da execução | HIGH |
| **`issueTreeControlService`** | `server/src/services/issue-tree-control.ts` | `createHold(mode: 'pause')` / `releaseHold` — pausar/resumir sub-árvores de issues para gate de QA e gate 80% | HIGH |
| **`documentService.upsertIssueDocument`** | `server/src/services/documents.ts:171` | Criar/atualizar documentos com key customizada em qualquer issue — é o mecanismo de armazenamento de handoff estruturado | HIGH |
| **`refreshIssueContinuationSummary`** | `server/src/services/issue-continuation-summary.ts:227` | Já cria documento `__continuation_summary__` com estrutura Objective / Acceptance Criteria / Recent Actions / Blockers / Next Action — reaproveitável como template de handoff | HIGH |
| **`ISSUE_CONTINUATION_SUMMARY_DOCUMENT_KEY`** | `packages/shared` | Chave reservada `__continuation_summary__` — agente pode ler este doc da issue anterior via `GET /api/issues/{id}/documents/__continuation_summary__` | HIGH |
| **`agents.metadata` JSONB** | `packages/db/src/schema/agents.ts:36` | Armazena `{ parallelismPolicy, department, ... }` — campo já usado pelo sync-agents v1.2; novos agentes Supabase/Notion usam este campo | HIGH |
| **`agents.reportsTo`** | `packages/db/src/schema/agents.ts:24` | Foreign key UUID para hierarquia — novos agentes reportam ao orquestrador central | HIGH |
| **`DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE`** | `packages/adapter-utils/src/server-utils.ts:84–99` | Template de instrução canônico citando child issues para paralelismo: `"Use child issues for parallel or long delegated work"` — confirma que child issues é o mecanismo correto | HIGH |
| **`POST /api/issues/{id}/children`** (via `createChildIssueSchema`) | `server/src/routes/issues.ts:15` | Endpoint para criar issue filha diretamente — agentes criam filhas em runtime para decompor tarefas | HIGH |
| **`issueRelationService`** | `server/src/services/issue-references.ts` | Cria relações `blocks` programaticamente | HIGH |
| **`plugin-host-services` (HostServices SDK)** | `server/src/services/plugin-host-services.ts` | Interface que um agente usa para criar issues, comentar, acessar documentos — o orquestrador interage com o board inteiramente via esta API sem código novo | HIGH |

### MCP Tools — Disponíveis no Ambiente, Nenhuma Dependência Nova

Os agentes Supabase-Executor e Supabase-Diagnostician invocam `mcp__supabase__*` diretamente nos seus system prompts. O Notion-Doc invoca `mcp__notion__*`. Nenhum código do servidor Paperclip é necessário para rotear essas chamadas — elas são executadas pelo Claude Code process spawned pelo adapter `claude-local` no contexto de cada heartbeat run.

| MCP Namespace | Disponível | Capacidades Relevantes para v1.3 | Como Configurar |
|---------------|-----------|----------------------------------|----------------|
| **`mcp__supabase__*`** | Sim (confirmado no milestone context) | `apply_migration` (deploy de DDL), `execute_sql` (diagnóstico de queries), `get_logs` (Supabase project logs), `list_tables`, `list_migrations` (auditoria de estado de schema) | Listar explicitamente os tools permitidos na instrução do agente; passar `SUPABASE_PROJECT_REF` como variável no system prompt ou via env do processo |
| **`mcp__notion__*`** | Sim (confirmado no milestone context) | `create_page` (criar página de débito técnico), `update_page`, `append_block_children` (adicionar seções à página) | Passar `NOTION_DATABASE_ID` para a página de rastreamento de débitos técnicos no system prompt do agente |

**Wiring necessário para MCP nos agentes:**

Os dois agentes Supabase e o agente de documentação Notion precisam ter em sua instrução (campo `capabilities` ou system prompt via `adapterConfig`) as ferramentas MCP explicitamente mencionadas. O Claude Code automaticamente dispõe das tools MCP do ambiente — o que falta é o agente *saber que pode usá-las*. O wiring é puramente de instrução, não de código.

Exemplo de fragmento de instrução para Supabase-Executor:
```
Você tem acesso às ferramentas MCP do Supabase: mcp__supabase__apply_migration,
mcp__supabase__execute_sql, mcp__supabase__list_migrations. Use-as para aplicar
migrations e verificar o estado do schema em produção antes de reportar sucesso.
Ao aplicar uma migration, informe o access token via SUPABASE_ACCESS_TOKEN
(solicite ao usuário se não estiver disponível no ambiente).
```

### Novo Script de Sync — Extensão do Existente

O `scripts/sync-agents/` (já implementado para v1.2) precisa ser estendido para incluir os 7 novos agentes do pipeline v1.3. Nenhum mecanismo novo — apenas novas entradas em `mapping.ts`.

| Agente Novo | Slug Proposto | Department | `parallelismPolicy` | `managerSlug` | MCP / Skills |
|-------------|--------------|------------|--------------------|--------------|----|
| Orchestrator-Maintenance | `maintenance-orchestrator` | `engineering` | `serial` | `executor` | `paperclip` |
| Research-Doc | `research-doc` | `architecture` | `parallel` | `maintenance-orchestrator` | — |
| Code-Analyzer | `code-analyzer` | `architecture` | `parallel` | `maintenance-orchestrator` | — |
| Supabase-Executor | `supabase-executor` | `engineering` | `serial` | `maintenance-orchestrator` | — |
| Supabase-Diagnostician | `supabase-diagnostician` | `engineering` | `parallel` | `maintenance-orchestrator` | — |
| QA-Agent | `qa-agent` | `quality` | `serial_gate` | `verifier` | — |
| Notion-Doc | `notion-doc` | `architecture` | `serial` | `maintenance-orchestrator` | — |

> **Decisão de estrutura**: Research-Doc e Code-Analyzer são criados como issues filhas de uma issue de pesquisa raiz com `parallelismPolicy: 'parallel'` — o Paperclip lança os dois heartbeats concorrentemente sem código adicional. O orquestrador central lê os dois `continuation_summary` quando as issues filhas ficam `done`.

### Handoff de Contexto — Document Key Reservada

O mecanismo de handoff usa o sistema `issue_documents` existente. A decisão é entre reaproveitamento da continuation summary existente versus chave nova:

**Opção A (recomendada): Reaproveitamento de `__continuation_summary__`**

A `refreshIssueContinuationSummary` já gera um documento estruturado com as seções exatas que um handoff precisa: Objective, Acceptance Criteria, Recent Actions, Files/Routes Touched, Blockers/Decisions, Next Action. O agente receptor lê `GET /api/issues/{issueId}/documents/__continuation_summary__` ao acordar e tem contexto completo. Custo: zero linhas de código novo.

**Opção B: Nova chave `__handoff__`**

Criar uma chave reservada `__handoff__` com schema mais rígido (JSON estruturado com campos `from_agent`, `to_agent`, `artifacts`, `gate_result`, `notion_page_url`). Útil se o handoff precisar de campos que a continuation summary não tem. Custo: ~50 linhas em `packages/shared/src/` para a chave e validação.

**Recomendação**: Começar com Opção A (reutilizar continuation summary) nas primeiras fases. Adicionar chave `__handoff__` apenas se o pipeline demonstrar necessidade de campos extras durante implementação.

---

## O Que NÃO Adicionar

| Evitar | Por Que | Alternativa |
|--------|---------|-------------|
| **Nova tabela `pipeline_runs`** | O estado do pipeline vive naturalmente na árvore de issues (`parent_id` + `issue_relations`) — adicionar uma tabela separada duplica estado e cria inconsistência | Usar `issueTreeControlService` + query de filhos por `parent_id` |
| **Novo endpoint REST para "paralelismo"** | O Paperclip já despacha heartbeats concorrentemente para issues filhas com agentes diferentes — o paralelismo é emergente da arquitetura, não uma feature nova | Criar issues filhas com `assigneeAgentId` distintos |
| **Webhooks de MCP para Supabase** | Os MCP tools são síncronos dentro do heartbeat do agente — não há necessidade de webhook | Supabase-Executor chama `mcp__supabase__apply_migration` diretamente e verifica resultado antes de fechar a issue |
| **SDK Notion para Node.js (`@notionhq/client`)** | O agente Notion-Doc usa `mcp__notion__*` dentro do Claude Code — nenhum código Node do servidor precisa importar Notion | System prompt do agente instrui uso das MCP tools disponíveis |
| **Supabase Realtime para sincronizar resultados paralelos** | O orquestrador central acorda por wakeup normal do Paperclip ao detectar issues filhas `done` — sem necessidade de stream | `agentWakeupRequests` + watcher existente |
| **Plugin SDK novo** | O Paperclip já tem `plugin-host-services.ts` com toda API que os agentes precisam | Usar `HostServices` existente |
| **Campo `gate_80_percent` na DB** | O gate de 80% é uma condição avaliada pelo agente QA ao ler os resultados de teste — resultado registrado como comentário e documento na issue, não como coluna separada | Agente QA documenta gate pass/fail em `__continuation_summary__` + comentário na issue pai |

---

## Wiring Necessário por Capacidade

### 1. Pipeline de Execução Paralela

**O que já funciona**: Issues filhas com `parallelismPolicy: 'parallel'` são despachadas concorrentemente pelo heartbeat scheduler. O orquestrador que cria as filhas e aguarda via `parent_id` + status poll já existe em `issue-tree-control.ts`.

**O que precisa de wiring**:
- Adicionar 7 novos agentes via extensão de `scripts/sync-agents/mapping.ts` (≈60 linhas em mapping.ts)
- Escrever system prompts dos agentes em `.claude/agents/maintenance-orchestrator.md`, `research-doc.md`, `code-analyzer.md` etc. — sem código de servidor

**Estimativa de esforço**: 1 fase (sync de agentes + system prompts)

### 2. Supabase Deploy via MCP

**O que já funciona**: `mcp__supabase__*` disponível no ambiente. `execute_sql` e `apply_migration` já funcionam.

**O que precisa de wiring**:
- System prompt do `supabase-executor` instrui uso das tools MCP com sequência correta: (a) `list_migrations` para checar estado atual, (b) `apply_migration` com o SQL da migration, (c) `execute_sql` para smoke test pós-deploy, (d) comentar resultado na issue com link
- Env var `SUPABASE_ACCESS_TOKEN` precisa estar disponível no processo Claude Code (via `agents.runtimeConfig` ou `.env`) — o MCP Supabase usa esse token para autenticar
- System prompt do `supabase-diagnostician` instrui `get_logs` + `execute_sql` para diagnóstico, nunca `apply_migration`

**Estimativa de esforço**: inclusas na fase de agentes (apenas instrução)

### 3. Notion Tech Debt via MCP

**O que já funciona**: `mcp__notion__*` disponível. `create_page` e `append_block_children` funcionam.

**O que precisa de wiring**:
- System prompt do `notion-doc` instrui: (a) ler contexto da issue atual (título, link), (b) chamar `mcp__notion__create_page` com database ID correto e estrutura de campos padrão (título, URL do PR, agentes envolvidos, descrição do débito técnico tolerado, link da issue), (c) retornar URL da página criada como comentário na issue para ser incluído no PR
- `NOTION_DATABASE_ID` (ID do database de débitos técnicos) precisa estar disponível — via env ou via instrução explícita no system prompt
- **Não** é necessário criar nova coluna em `issues` para URL Notion — o URL é armazenado como comentário + no `__continuation_summary__` da issue

**Estimativa de esforço**: inclusas na fase de agentes (instrução + env var)

### 4. Handoff de Contexto Estruturado

**O que já funciona**: `documentService.upsertIssueDocument` + `refreshIssueContinuationSummary` — mecanismo completo de escrever e ler documentos por chave em issues.

**O que precisa de wiring**:
- Instrução em todos os agentes do pipeline: ao finalizar, atualizar `__continuation_summary__` com resultado, arquivos modificados, próxima ação esperada — usando `POST /api/issues/{id}/documents` com `key: "__continuation_summary__"`
- Instrução no orquestrador: ao acordar após issues filhas ficarem `done`, ler `GET /api/issues/{childId}/documents/__continuation_summary__` de cada filha antes de distribuir próxima etapa
- Se a Opção B (chave `__handoff__`) for necessária: adicionar `ISSUE_HANDOFF_DOCUMENT_KEY = '__handoff__'` em `packages/shared/src/constants/issue-documents.ts` e registrar no `isSystemIssueDocumentKey()` para filtrar da listagem pública

**Estimativa de esforço**: incluídas na fase de agentes (instrução) + opcional 1 hora para chave `__handoff__`

---

## Variáveis de Ambiente Adicionais para v1.3

Acrescentar ao `.env.example` existente:

```dotenv
# === MCP Supabase (usado por agentes Supabase-Executor e Supabase-Diagnostician) ===
SUPABASE_ACCESS_TOKEN=<personal access token gerado em app.supabase.com/account/tokens>

# === MCP Notion (usado por agente Notion-Doc) ===
# ID do database Notion onde débitos técnicos são registrados
NOTION_DATABASE_ID=<id-do-database-notion>
# Notion integration token (configurado no Notion workspace)
NOTION_TOKEN=<secret_...>
```

Esses valores são lidos pelo processo Claude Code via `agents.runtimeConfig` ou passados como env vars ao `claude` CLI através do mecanismo de `CLAUDE_CONFIG_DIR` já implementado no v1.2 (`execute.ts:253`).

---

## Compatibilidade de Versões — Nenhuma Mudança

Não há pacotes novos. Compatibilidade existente (documentada em STACK.md 2026-04-25) permanece inalterada.

---

## Alternativas Consideradas

| Recomendado | Alternativa | Por Que Não |
|-------------|-------------|-------------|
| **Issue tree nativa** (`parent_id` + `issue_relations`) para paralelismo | Fila de jobs customizada (BullMQ, Inngest) | Paperclip já tem scheduler de heartbeat com suporte a concorrência; adicionar outra fila de jobs cria dois mundos paralelos de estado sem benefício |
| **`documentService` para handoff** | Campo JSONB novo em `issues` | Documentos versionados com `documentRevisions` dão histórico completo de cada handoff; JSONB em `issues` sobrescreve sem histórico |
| **MCP tools nos system prompts dos agentes** | Código Node no servidor que chama Supabase/Notion APIs | Agentes com MCP são self-contained e não criam dependência de código no servidor; fácil de testar pelo dev rodando o agente manualmente |
| **`__continuation_summary__` reutilizado como handoff** | Nova chave `__handoff__` com schema próprio | Evita criação de infrastructure desnecessária; a continuation summary já tem as seções corretas; pode promover para chave dedicada em v1.4 se necessário |
| **7 novos agentes via extensão de `mapping.ts`** | Criar agentes manualmente via UI do Paperclip | Script idempotente garante reprodutibilidade; UI manual não é versionável |

---

## Fontes

- `packages/db/src/schema/issues.ts` — `parent_id` UUID (lido diretamente, 2026-04-28) — confiança HIGH
- `packages/db/src/schema/issue_relations.ts` — `type = 'blocks'` (lido diretamente, 2026-04-28) — confiança HIGH
- `packages/db/src/schema/agents.ts` — `metadata JSONB`, `reportsTo UUID` (lido diretamente, 2026-04-28) — confiança HIGH
- `server/src/services/issue-tree-control.ts` — `createHold`, `releaseHold`, `listTreeIssues` (lido diretamente, 2026-04-28) — confiança HIGH
- `server/src/services/documents.ts` — `upsertIssueDocument`, `getIssueDocumentByKey` (lido diretamente, 2026-04-28) — confiança HIGH
- `server/src/services/issue-continuation-summary.ts` — `refreshIssueContinuationSummary`, `ISSUE_CONTINUATION_SUMMARY_DOCUMENT_KEY`, estrutura do markdown (lido diretamente, 2026-04-28) — confiança HIGH
- `packages/adapter-utils/src/server-utils.ts:84–99` — `DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE` confirmando child issues como mecanismo de paralelismo (lido diretamente, 2026-04-28) — confiança HIGH
- `scripts/sync-agents/mapping.ts` + `types.ts` — mapping canônico v1.2 com `parallelismPolicy`, `department`, `desiredSkillKeys` (lido diretamente, 2026-04-28) — confiança HIGH
- `server/src/routes/issues.ts:15` — `createChildIssueSchema` import (lido diretamente, 2026-04-28) — confiança HIGH
- Milestone context fornecido pelo orquestrador — MCP `mcp__supabase__*` e `mcp__notion__*` confirmados disponíveis — confiança MEDIUM (declarado no contexto, não verificado por execução direta de ferramenta MCP nesta sessão)

---

*Pesquisa de stack para: v1.3 — workflow de manutenção paralela (pipeline paralelo, Supabase MCP, Notion MCP, handoff de contexto).*
*Pesquisado: 2026-04-28*
