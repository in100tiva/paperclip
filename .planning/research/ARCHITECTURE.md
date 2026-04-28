# Pesquisa de Arquitetura — v1.3 Workflow de Manutenção Paralela

**Domínio:** Integração de pipeline de manutenção paralela no fork Paperclip/in100tiva
**Pesquisado:** 2026-04-28
**Confiança:** HIGH — análise direta do código-fonte do repo (`packages/`, `server/src/`, `.claude/`, `scripts/`)

---

## Sumário Executivo

O milestone v1.3 **não reescreve nada** — ele estende o org-chart existente da in100tiva adicionando 7 novos agentes ao grafo `agents → reports_to` já existente, expande `mapping.ts` + os respectivos arquivos `.md` em `.claude/agents/`, e introduz dois artefatos de integração: um protocolo de handoff em JSON serializado em `issues.executionState` e uma integração Notion para débitos técnicos via MCP já presente no projeto.

A arquitetura existente já provê todos os primitivos necessários:
- **Paralelismo controlado**: `parallelismPolicy` em `agents.metadata` + `ParallelismBadge` já distinguem `serial`, `parallel`, `serial_gate` — só falta adicionar entradas para os novos agentes.
- **Handoff de contexto**: `issues.executionState` (JSONB livre) + `agent_task_sessions.session_params_json` já são usados para carregar contexto entre runs; basta definir um schema para o handoff estruturado.
- **Supabase MCP**: já disponível na sessão Claude Code do dev — Supabase-Executor e Supabase-Diagnostician o invocarão via suas ferramentas declaradas no frontmatter `.md`.
- **Notion MCP**: já em uso pelo comando `/publicar` via `mcp__claude_ai_Notion__notion-create-pages`; o mesmo MCP alimenta o rastreamento de débitos técnicos.
- **Gate de produção**: modelado como aprovação explícita — `issues.executionPolicy` (JSONB) já suporta políticas arbitrárias; o orquestrador pode checar a contagem de testes passando e recusar merge sem entrada no Notion.

O esforço real do milestone está em:
1. Definir e importar os 7 novos agentes no Supabase via `pnpm sync-agents`.
2. Escrever os arquivos `.md` de instruções para cada novo agente.
3. Implementar o schema de handoff estruturado como convenção (não migration nova — usa JSONB existente).
4. Criar/atualizar o skill `paperclip` para incluir instruções de handoff obrigatório e gate 80%.
5. Adicionar um script auxiliar (`scripts/sync-agents/sync-tech-debt.ts` ou similar) que emite débito técnico para o Notion quando o gate não é atingido.

---

## Arquitetura Existente — Linha de Base v1.2

### Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ui/  (React 19 + Vite 6 + TanStack Query 5 + react-router-dom 7)       │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ pages/               │  │ components/                              │  │
│  │  AgentDetail.tsx     │  │  ParallelismBadge.tsx  ← serial/parallel │  │
│  │  OrgChart            │  │  ClaudeAccounts.tsx                      │  │
│  └──────────────────────┘  └──────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  server/  (Express 5.1 + Pino 9 + WebSocket)                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ services/                                                          │  │
│  │  heartbeat.ts  ← spawn de agentes, quota rotation                 │  │
│  │  issues.ts     ← ciclo de vida de tasks                           │  │
│  │  agents.ts     ← CRUD de agentes                                  │  │
│  │  claude-accounts.ts  ← pool multi-conta com advisory lock         │  │
│  │  activity-log.ts     ← auditoria de eventos                       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  packages/adapters/claude-local/  (CLI spawn, session resume, MCP env)  │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │ server/execute.ts  ← injeta CLAUDE_CONFIG_DIR + env por run      │   │
│  │ server/parse.ts    ← detecta quota exhaustion (6 sub-tipos)      │   │
│  └───────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│  packages/db/  (Drizzle ORM + Postgres via Supavisor pooler)            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ schema/agents.ts          ← metadata JSONB (parallelismPolicy)    │  │
│  │ schema/issues.ts          ← executionState JSONB, executionPolicy │  │
│  │ schema/heartbeat_runs.ts  ← estado de cada execução               │  │
│  │ schema/claude_accounts.ts ← pool de contas (scope: company/shared)│  │
│  │ schema/activity_log.ts    ← auditoria                             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  Supabase (bxlczioxgizgvtznukwt) — Postgres gerenciado                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  80 tabelas em public.*  │  Supabase MCP disponível na sessão    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

Fora do sistema (consumidores externos):
  .claude/agents/*.md         ← instruções dos agentes (lidas pelo execute.ts)
  .claude/skills/paperclip/   ← skill compartilhada (Governance + Framework)
  scripts/sync-agents/        ← importação idempotente dos agentes no Supabase
  .claude/commands/publicar.md ← integração Notion MCP já operacional
```

### Org-Chart Atual (in100tiva, 18 agentes + CEO)

```
CEO (d64a9f21)
├── Planner — Head of Architecture (serial)
│   ├── Roadmapper
│   ├── Project Researcher
│   ├── Phase Researcher
│   ├── Advisor Researcher
│   ├── Assumptions Analyzer
│   ├── Codebase Mapper
│   ├── Plan Checker
│   └── Research Synthesizer
├── Executor — Head of Engineering (parallel)
│   ├── Debugger
│   ├── Integration Checker
│   └── UI Researcher
├── Verifier — Head of Quality (serial_gate)
│   ├── Nyquist Auditor
│   ├── UI Auditor
│   └── UI Checker
└── User Profiler — Head of Analytics (parallel)
```

---

## Novos Componentes v1.3

### 7 Novos Agentes — Localização no Codebase

Cada agente novo exige dois artefatos, zero migrations:

| Agente | Arquivo `.claude/agents/` | `mapping.ts` slug | Dept | Parallelism |
|--------|--------------------------|-------------------|------|-------------|
| Orchestrator-Maintenance | `orchestrator-maintenance.md` | `orchestrator-maintenance` | engineering | serial |
| Research-Doc | `research-doc.md` | `research-doc` | engineering | parallel |
| Code-Analyzer | `code-analyzer.md` | `code-analyzer` | engineering | parallel |
| Supabase-Executor | `supabase-executor.md` | `supabase-executor` | engineering | parallel |
| Supabase-Diagnostician | `supabase-diagnostician.md` | `supabase-diagnostician` | engineering | parallel |
| Doc-Before-After | `doc-before-after.md` | `doc-before-after` | quality | serial_gate |
| QA-Loop | `qa-loop.md` | `qa-loop` | quality | serial_gate |

**Nota sobre placement:** Os 7 novos agentes ficam sob `Executor` (Head of Engineering) ou `Verifier` (Head of Quality) conforme departamento — nenhum chega ao nível de Head. A contagem passa de 18 para 25 entradas em `AGENT_MAPPING`. O `validateMapping()` em `mapping.ts` precisará de atualização das invariantes (atualmente hardcoded em `18`/`4`/`14`).

### Hierarquia de Reporte v1.3

```
CEO
├── Planner (sem mudança)
├── Executor — Head of Engineering
│   ├── [3 especialistas existentes]
│   ├── Orchestrator-Maintenance  ← NOVO — orquestra o pipeline completo
│   ├── Research-Doc              ← NOVO — pesquisa docs oficiais / GitHub
│   ├── Code-Analyzer             ← NOVO — analisa codebase por falhas
│   ├── Supabase-Executor         ← NOVO — deploys via MCP + CLI
│   └── Supabase-Diagnostician    ← NOVO — monitora logs e versões
├── Verifier — Head of Quality
│   ├── [3 especialistas existentes]
│   ├── QA-Loop                   ← NOVO — testes, detecção de falhas, loop
│   └── Doc-Before-After          ← NOVO — documenta estado antes/depois
└── User Profiler (sem mudança)
```

---

## Componentes Modificados v1.3

### 1. `scripts/sync-agents/mapping.ts`

**O que muda:** Adicionar 7 entradas em `AGENT_MAPPING` e atualizar o `validateMapping()`.

**Mudança mínima necessária:**
```typescript
// Atualizar invariantes em validateMapping():
if (AGENT_MAPPING.length !== 25) { ... }  // era 18
if (specialistCount !== 21) { ... }         // era 14

// Adicionar 7 entradas — exemplo para Orchestrator-Maintenance:
{
  slug: 'orchestrator-maintenance',
  name: 'Orchestrator Maintenance',
  title: 'Maintenance Workflow Orchestrator',
  role: 'specialist',
  department: 'engineering',
  isHead: false,
  managerSlug: 'executor',
  parallelismPolicy: 'serial',     // orquestra — deve ser serial
  desiredSkillKeys: ['paperclip'],
},
```

**Impacto downstream:** `pnpm sync-agents` precisará ser re-executado para inserir/atualizar os 7 novos agentes no Supabase. O script é idempotente — existentes ficam intactos.

### 2. `scripts/sync-agents/validate-mapping.ts`

**O que muda:** Se existir um arquivo separado de validação, atualizar os valores esperados. Caso a validação esteja inline em `mapping.ts`, apenas o item 1 acima cobre.

### 3. Skill `paperclip` — `.claude/skills/paperclip/`

**O que muda:** Adicionar seção de "Handoff de Contexto Obrigatório" e "Gate de Produção 80%" nas regras do skill. Os novos agentes herdam automaticamente o skill via `desiredSkillKeys: ['paperclip']` em seus mappings.

**Conteúdo a adicionar em `rules/*.md` ou no `SKILL.md` principal:**
```markdown
## Handoff de Contexto Obrigatório

Todo agente que passa tarefa para o próximo DEVE emitir um handoff estruturado
em `issues.executionState.handoff` antes de encerrar. Schema mínimo:

{
  "fromAgent": "slug-do-agente-emitente",
  "toAgent": "slug-do-agente-receptor",
  "taskSummary": "O que foi feito em 2-3 frases",
  "artifacts": ["caminho/para/arquivo1", "..."],
  "blockers": [],
  "notionDebtUrl": null | "https://notion.so/..."
}

## Gate de Produção 80%

O QA-Loop só aprova se ≥ 80% dos testes passam. Abaixo de 80%:
1. Registrar débito técnico no Notion (via Notion MCP).
2. Incluir URL da página Notion em `handoff.notionDebtUrl`.
3. Prosseguir com merge APENAS SE o débito estiver documentado.
```

### 4. `ui/src/components/ParallelismBadge.tsx`

**O que muda:** Zero — o componente já suporta as 3 políticas existentes e renderiza `null` graciosamente para slugs desconhecidos. Nenhuma alteração necessária.

### 5. `ui/src/pages/AgentDetail.tsx`

**O que muda:** Zero para o milestone — a página já lê `agent.metadata.parallelismPolicy` e renderiza o badge. Os novos agentes aparecem automaticamente com o badge correto após `pnpm sync-agents`.

---

## Protocolo de Handoff de Contexto

### Schema JSONB em `issues.executionState`

O handoff não requer migration nova — usa o campo `executionState JSONB` existente na tabela `issues`. Convenção de chave:

```typescript
interface MaintenanceHandoff {
  handoff: {
    version: "1";
    fromAgent: string;           // frameworkSlug do agente emitente
    toAgent: string;             // frameworkSlug do agente receptor
    timestamp: string;           // ISO-8601
    taskSummary: string;         // 2-3 frases do que foi feito
    artifacts: string[];         // caminhos de arquivos criados/modificados
    findings: string[];          // problemas encontrados (para pesquisa → executor)
    testResults?: {
      passed: number;
      total: number;
      passRate: number;          // 0.0–1.0
    };
    blockers: string[];          // lista vazia se nenhum
    notionDebtUrl: string | null; // URL se débito técnico registrado
  };
}
```

### Fluxo de Pipeline

```
Orchestrator-Maintenance recebe issue
         │
         ├──(parallel spawn)──► Research-Doc
         │                        └── lê docs / GitHub
         └──(parallel spawn)──► Code-Analyzer
                                  └── analisa codebase por falhas
         │
         ◄── ambos emitem handoff para Orchestrator-Maintenance
         │
Orchestrator-Maintenance agrega findings
         │
         ├──(distribui por agente de execução)──► Executor / Debugger / etc.
         │                                         └── corrigem o que Research/Analyzer encontrou
         │
         ◄── executores emitem handoff
         │
QA-Loop recebe handoff dos executores
         │
         ├── cria/executa testes
         ├── se passRate ≥ 80%: emite handoff de aprovação
         └── se passRate < 80%: registra débito Notion → emite handoff com notionDebtUrl
         │
Doc-Before-After documenta estado antes/depois
         │
Supabase-Executor deploys (se necessário)
         │
Supabase-Diagnostician monitora logs pós-deploy
```

---

## Integração Supabase-Executor

### Artefatos Necessários

**Arquivo `.claude/agents/supabase-executor.md`:**
```yaml
---
name: supabase-executor
description: Executa deploys de schema e dados no Supabase via MCP + CLI.
             Solicita access token quando necessário. Invocado pelo Orchestrator-Maintenance.
tools: Read, Write, Bash, mcp__supabase__*, mcp__claude_ai_Notion__*
color: orange
---
```

**Ferramentas MCP disponíveis** (via sessão Claude Code do dev):
- `mcp__supabase__*` — executa queries, aplica migrations, verifica versões
- Supabase CLI via `Bash` — `supabase db push`, `supabase status`, etc.

**Protocolo de access token:** Quando o Supabase-Executor detecta que não está autenticado (`supabase login` não feito ou token expirado), ele emite um `checkpoint:human-action` solicitando ao dev que execute `supabase login` e forneça o token. Segue o padrão de `authentication_gates` já descrito no agente `executor.md`.

### Artefatos Necessários — Supabase-Diagnostician

**Arquivo `.claude/agents/supabase-diagnostician.md`:**
```yaml
---
name: supabase-diagnostician
description: Monitora logs do Supabase pós-deploy, verifica versões em produção
             e reporta anomalias. Invocado pelo Orchestrator-Maintenance após deploys.
tools: Read, Bash, mcp__supabase__*
color: cyan
---
```

**Responsabilidades:** Consultar `supabase logs`, verificar versão de schema aplicada, comparar com versão esperada, emitir handoff com status de saúde.

---

## Integração Notion — Débitos Técnicos

### MCP já disponível

O Notion MCP (`mcp__claude_ai_Notion__notion-create-pages`) está em uso em `/publicar` e `/setup-notion`. Os novos agentes (QA-Loop, Doc-Before-After) usam o mesmo MCP para criar páginas de débito técnico.

### Localização das páginas no Notion

```
notion-config.json (já existente em .claude/)
  └── notion.adr  ← débitos técnicos ficam aqui (ADR = Architecture Decision Record)
```

**Alternativa:** criar subchave `"tech_debt"` no `notion-config.json` apontando para uma página dedicada. Esta é a abordagem preferida — mantém `adr/` para decisões de arquitetura e separa débitos técnicos operacionais.

```json
{
  "notion": {
    "root": "...",
    "changelog": "...",
    "features": "...",
    "adr": "...",
    "runbooks": "...",
    "tech_debt": "ID_DA_PAGINA_TECH_DEBT"  ← NOVO
  }
}
```

**Template de página de débito técnico:**
```
Título: [DEBT] {data} — {título curto}
Conteúdo:
  - Issue/PR: link
  - Taxa de testes: XX%
  - O que passou: lista
  - O que falhou: lista
  - Risco: Low/Medium/High
  - Plano de quitação: milestone X
```

---

## Estrutura de Projeto — Arquivos Novos

```
.claude/agents/
├── [18 existentes — sem mudança]
├── orchestrator-maintenance.md   ← NOVO
├── research-doc.md               ← NOVO
├── code-analyzer.md              ← NOVO
├── supabase-executor.md          ← NOVO
├── supabase-diagnostician.md     ← NOVO
├── qa-loop.md                    ← NOVO
└── doc-before-after.md           ← NOVO

.claude/skills/paperclip/
└── rules/
    └── handoff-protocol.md       ← NOVO (ou integrado ao SKILL.md principal)

scripts/sync-agents/
├── mapping.ts                    ← MODIFICADO (+7 entradas, invariantes atualizadas)
├── types.ts                      ← sem mudança (tipos já cobrem o caso)
├── sync.ts                       ← sem mudança (lógica idempotente existente funciona)
└── sync-skills.ts                ← sem mudança

.claude/
└── notion-config.json            ← MODIFICADO (adicionar chave "tech_debt")
```

---

## Padrões Arquiteturais

### Padrão 1: Agente como Arquivo Markdown + Entrada em mapping.ts

**O que é:** Todo agente no Paperclip fork é definido por dois artefatos: (1) arquivo `.claude/agents/{slug}.md` com frontmatter YAML (name, description, tools, color) e corpo de instruções; (2) entrada em `scripts/sync-agents/mapping.ts` com hierarquia, departamento e parallelismPolicy.

**Quando usar:** Sempre que um novo papel de agente for necessário — nunca criar agentes diretamente via UI ou SQL sem o mapping correspondente.

**Exemplo para Research-Doc:**
```typescript
// mapping.ts
{
  slug: 'research-doc',
  name: 'Research Doc',
  title: 'Documentation Researcher',
  role: 'specialist',
  department: 'engineering',
  isHead: false,
  managerSlug: 'executor',
  parallelismPolicy: 'parallel',
  desiredSkillKeys: ['paperclip'],
},
```

```markdown
<!-- .claude/agents/research-doc.md -->
---
name: research-doc
description: Pesquisa documentação oficial e repositórios GitHub para identificar
             soluções para issues de manutenção. Invocado em paralelo com o Code-Analyzer
             pelo Orchestrator-Maintenance.
tools: Read, Bash, WebSearch, WebFetch, mcp__context7__*, mcp__exa__*
color: blue
---
```

### Padrão 2: Handoff via `issues.executionState` JSONB

**O que é:** O agente emitente escreve o handoff estruturado em `issues.executionState.handoff` via chamada à API do Paperclip (endpoint `/api/issues/{id}` PATCH) antes de encerrar. O agente receptor lê esse campo ao iniciar — recebido via `PAPERCLIP_WAKE_PAYLOAD_JSON` ou lendo diretamente via Supabase MCP.

**Quando usar:** Toda transição de agente dentro do pipeline de manutenção paralela.

**Trade-offs:** Usar JSONB existente evita migration nova. A desvantagem é falta de schema enforcement no banco — a validação é responsabilidade do agente receptor (verificar presença de campos esperados antes de prosseguir).

### Padrão 3: Gate de Qualidade como Política em `issues.executionPolicy`

**O que é:** O QA-Loop persiste o resultado dos testes em `issues.executionPolicy.qaResult`. O Orchestrator-Maintenance lê esse campo para decidir se prossegue para deploy ou para documentação de débito no Notion.

**Quando usar:** Qualquer decisão binária de aprovação/rejeição que precise ser auditável e persistente entre runs.

**Exemplo:**
```json
{
  "qaResult": {
    "passRate": 0.72,
    "passed": 18,
    "total": 25,
    "approved": false,
    "notionDebtUrl": "https://notion.so/DEBT-2026-04-28"
  }
}
```

### Padrão 4: MCP Tools no Frontmatter do Agente

**O que é:** Os MCPs disponíveis para um agente são declarados no frontmatter `tools:` do arquivo `.md`. Claude Code honra essa declaração ao spawnar o subagente. Os MCPs são herdados da sessão do dev — o agente não configura credenciais, apenas declara uso.

**Quando usar:** Todo agente que precisar de acesso a Supabase MCP ou Notion MCP deve declarar `mcp__supabase__*` ou `mcp__claude_ai_Notion__*` no frontmatter.

**Constraint importante:** O agente Supabase-Executor declara `mcp__supabase__*` mas o MCP só funciona se o dev tiver a sessão com o Supabase MCP configurado. Caso ausente, o agente deve emitir `checkpoint:human-action` pedindo que o dev configure o MCP antes de prosseguir.

---

## Fluxo de Dados

### Fluxo Principal — Pipeline de Manutenção

```
Dev cria issue de manutenção (UI ou API)
    │
    ▼
Orchestrator-Maintenance recebe wake
    │
    ├──► Research-Doc (parallel spawn)
    │        └── emite handoff com findings de docs
    │
    └──► Code-Analyzer (parallel spawn)
             └── emite handoff com análise de falhas no código
    │
    ◄── (ambos completam)
    │
Orchestrator-Maintenance agrega
    ├── persiste findings em issues.executionState.researchFindings
    └── distribui sub-issues para agentes de execução
    │
Executores (Executor / Debugger / etc.)
    └── corrigem, commitam, emitem handoff
    │
QA-Loop
    ├── cria/executa testes
    ├── ≥80%: handoff de aprovação
    └── <80%: cria página Notion → handoff com notionDebtUrl
    │
Doc-Before-After
    └── documenta estado antes/depois no SUMMARY
    │
Supabase-Executor (se houver deploy de schema)
    └── executa migrations via MCP + CLI
    │
Supabase-Diagnostician
    └── monitora logs, emite relatório de saúde
    │
Orchestrator-Maintenance fecha issue
    └── PR com link Notion se houver débito
```

### Gerenciamento de Estado

```
Supabase (PostgreSQL via Supavisor)
    issues.executionState JSONB
        ├── .handoff    ← handoff estruturado do último agente
        ├── .researchFindings  ← agregado pelo Orchestrator
        └── .qaResult   ← resultado do QA-Loop

    issues.executionPolicy JSONB
        └── .gateThreshold: 0.80

    agent_task_sessions
        └── session_params_json  ← session_id do Claude para resume
```

---

## Limites de Componente e Comunicação

### Pontos de Integração Internos

| Limite | Comunicação | Notas |
|--------|-------------|-------|
| Orchestrator-Maintenance ↔ Research-Doc | Sub-agente via `Task()` | Research-Doc invocado com contexto da issue; retorna handoff |
| Orchestrator-Maintenance ↔ Code-Analyzer | Sub-agente via `Task()` | Paralelo ao Research-Doc |
| Orchestrator-Maintenance ↔ Executores | Issues papelclip (assignee_agent_id) | Cria sub-issues com assignee dos executores |
| QA-Loop ↔ Notion MCP | `mcp__claude_ai_Notion__notion-create-pages` | Cria página só se passRate < 80% |
| Supabase-Executor ↔ Supabase MCP | `mcp__supabase__*` | Autenticado via sessão do dev |
| Supabase-Diagnostician ↔ Supabase MCP | `mcp__supabase__*` | Read-only para logs e versões |
| sync-agents ↔ Supabase | Drizzle direto via `DATABASE_URL` | Script idempotente upserta os 7 novos agentes |

### Pontos de Integração Externos

| Serviço | Padrão de Integração | Notas |
|---------|----------------------|-------|
| Supabase MCP | Declarado em `tools:` frontmatter do agente | Requer sessão Claude Code com MCP configurado |
| Notion MCP | `mcp__claude_ai_Notion__notion-create-pages` | Já em uso em `/publicar`; reutilizar padrão existente |
| GitHub (gh CLI) | `Bash(gh pr create ...)` | PR com link Notion na descrição quando há débito |

---

## Considerações de Escala

| Escala | Ajustes |
|--------|---------|
| Pipeline único (1 issue de manutenção por vez) | Arquitetura atual suporta — Orchestrator-Maintenance é `serial` |
| 2-3 pipelines simultâneos | Research-Doc e Code-Analyzer são `parallel` — suportam múltiplos sem mudança |
| 5+ pipelines simultâneos | Monitorar pool de conexões Supabase (já expandido para 15 em fix ab62690) |

---

## Anti-Padrões

### Anti-Padrão 1: Criar Agentes Sem mapping.ts

**O que as pessoas fazem:** Criar agentes diretamente na UI do Paperclip ou via SQL INSERT sem adicionar entrada em `mapping.ts`.

**Por que está errado:** O sync é idempotente — na próxima execução de `pnpm sync-agents`, agentes não mapeados ficam "órfãos" (sem `metadata.frameworkSlug`). O `validateMapping()` não detecta agentes extras, mas o drift entre banco e mapping.ts cria inconsistência no org-chart.

**Faça isto em vez disso:** Sempre adicionar entrada em `mapping.ts` + arquivo `.md` + re-executar `pnpm sync-agents`.

### Anti-Padrão 2: Handoff em Comentário de Issue

**O que as pessoas fazem:** Usar `issue_comments` para passar contexto entre agentes (escrever findings como comentários que o próximo agente lê).

**Por que está errado:** Comentários não têm schema, são difíceis de parsear programaticamente, e não são "consumíveis" pelo agente receptor de forma confiável. O campo `executionState JSONB` da issue é exatamente para isso.

**Faça isto em vez disso:** Usar `issues.executionState.handoff` com o schema estruturado definido neste documento.

### Anti-Padrão 3: Supabase-Executor com SUPABASE_SERVICE_ROLE_KEY Hardcoded

**O que as pessoas fazem:** Injetar `SUPABASE_SERVICE_ROLE_KEY` diretamente no arquivo `.md` do agente para evitar o fluxo de autenticação via MCP.

**Por que está errado:** O pre-commit hook do projeto já detecta `eyJ...` em arquivos client-side. Além disso, o Supabase MCP gerencia autenticação de forma segura — não é necessário expor a service-role key nas instruções do agente.

**Faça isto em vez disso:** Declarar `mcp__supabase__*` nas tools do agente e seguir o protocolo de `checkpoint:human-action` quando o MCP não estiver autenticado.

### Anti-Padrão 4: QA-Loop sem Gate Explícito

**O que as pessoas fazem:** O QA-Loop aprova tudo e documenta débitos "para depois", sem bloquear o pipeline.

**Por que está errado:** O propósito do gate 80% é exatamente criar pressão para documentação de débito — se o gate não bloqueia, débitos acumulam sem registro no Notion e o pipeline perde valor.

**Faça isto em vez disso:** O QA-Loop DEVE criar a página Notion antes de emitir handoff de aprovação quando passRate < 80%. Handoff de aprovação sem `notionDebtUrl` quando passRate < 80% é bug.

---

## Ordem de Build Recomendada

A ordem respeita dependências: infrastructure-first, depois business logic, depois integração externa.

### Fase 1 — Fundação dos Agentes (sem dependências externas)
1. Escrever os 7 arquivos `.md` de instruções em `.claude/agents/`
2. Atualizar `scripts/sync-agents/mapping.ts` (+7 entradas, invariantes)
3. Executar `pnpm sync-agents` para inserir no Supabase
4. Verificar que `ParallelismBadge` renderiza corretamente para novos agentes

**Dependência:** Nenhuma — pode iniciar imediatamente.

### Fase 2 — Protocolo de Handoff
5. Adicionar `rules/handoff-protocol.md` ao skill `paperclip`
6. Definir e documentar o schema JSON de handoff (este documento serve de referência)
7. Implementar leitura de handoff no `orchestrator-maintenance.md`

**Dependência:** Fase 1 (agentes precisam existir antes de escrever suas instruções de handoff).

### Fase 3 — Pipeline Research + QA
8. Instrumentar `research-doc.md` com ferramentas de busca (WebSearch, mcp__context7__, mcp__exa__)
9. Instrumentar `code-analyzer.md` com ferramentas de análise (Read, Bash, Grep)
10. Instrumentar `qa-loop.md` com lógica de teste + gate 80% + Notion MCP
11. Instrumentar `doc-before-after.md`

**Dependência:** Fase 2 (handoff protocol deve estar definido).

### Fase 4 — Supabase Agents
12. Instrumentar `supabase-executor.md` com MCP + CLI + protocolo de access token
13. Instrumentar `supabase-diagnostician.md` com leitura de logs via MCP

**Dependência:** Fase 2 (handoff). Supabase agents podem ser desenvolvidos em paralelo com Fase 3.

### Fase 5 — Integração Notion + Gate
14. Atualizar `.claude/notion-config.json` com chave `tech_debt`
15. Verificar criação de páginas de débito técnico pelo QA-Loop
16. Verificar que PR de fechamento do pipeline inclui link Notion quando há débito

**Dependência:** Fases 3 e 4 completas.

### Fase 6 — Smoke e Validação
17. Executar pipeline completo em issue de manutenção real (pequena)
18. Verificar handoffs persistidos em `issues.executionState`
19. Verificar gate 80% bloqueando e desbloqueando corretamente
20. Verificar criação de página Notion quando passRate < 80%

**Dependência:** Fases 1-5 completas.

---

## Fontes

- Análise direta do código-fonte: `scripts/sync-agents/mapping.ts`, `types.ts`, `sync.ts`
- Schema: `packages/db/src/schema/agents.ts`, `issues.ts`, `activity_log.ts`
- Adapter: `packages/adapters/claude-local/src/server/execute.ts`
- Componentes UI: `ui/src/components/ParallelismBadge.tsx`, `ui/src/pages/AgentDetail.tsx`
- Comandos existentes: `.claude/commands/publicar.md`, `.claude/commands/setup-notion.md`
- Agentes existentes: `.claude/agents/executor.md`, `.claude/agents/verifier.md`, `.claude/agents/phase-researcher.md`
- PROJECT.md: `.planning/PROJECT.md` (escopo e requisitos v1.3)

---

*Pesquisa de arquitetura para: workflow de manutenção paralela — in100tiva Paperclip fork v1.3*
*Pesquisado: 2026-04-28*
