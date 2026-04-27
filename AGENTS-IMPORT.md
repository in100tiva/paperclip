# AGENTS-IMPORT — Importando os agentes do framework como funcionários da in100tiva

**Última atualização:** 2026-04-27 (Milestone v1.2)

Este doc explica como o repositório mantém os 18 agentes em [.claude/agents/](.claude/agents/) e as 3 skills em [.claude/skills/](.claude/skills/) refletidos como funcionários reais da empresa `in100tiva` no paperclip — com hierarquia software-house, política de paralelismo (`serial` / `parallel` / `serial_gate`) e skills atribuídas por cargo.

## Resumo do que foi modelado

| Departamento | Head (slug do framework) | Specialists | Política |
|--------------|--------------------------|-------------|----------|
| Architecture | `planner` | roadmapper, project-researcher, phase-researcher, advisor-researcher, assumptions-analyzer, codebase-mapper, plan-checker, research-synthesizer (8) | `serial` |
| Engineering | `executor` | debugger, integration-checker, ui-researcher (3) | `parallel` |
| Quality | `verifier` | nyquist-auditor, ui-auditor, ui-checker (3) | `serial_gate` |
| Analytics | `user-profiler` | (solo) | `parallel` |

**Total:** 1 CEO existente + 4 Heads + 14 specialists = **19 funcionários** modelados via mapping.

**Skills atribuídas por cargo:**

| Skill | Anexada a |
|-------|-----------|
| `paperclip` | CEO + 4 Heads + 8 Architecture specialists (13 agentes) |
| `company-creator` | CEO apenas (1 agente) |
| `design-guide` | ui-researcher + ui-auditor + ui-checker (3 agentes) |

## Pré-requisitos

1. `.paperclip/.env` com `DATABASE_URL` (Supavisor pooler 6543) — gerado por `pnpm setup`.
2. Empresa `in100tiva` existe no banco e o CEO original está intacto. Constantes em [scripts/sync-agents/types.ts](scripts/sync-agents/types.ts):
   - `TARGET_COMPANY_ID = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6'`
   - `CEO_AGENT_ID = 'd64a9f21-3ad0-4ca5-b7e8-58dbefb55b75'`
3. `pnpm install` rodado.

## Comandos

```bash
# Importa/atualiza os 18 agentes (idempotente)
pnpm sync-agents

# Importa as 3 skills + anexa por cargo (idempotente)
pnpm sync-skills

# Dry-run mostra o que mudaria sem escrever no banco
pnpm sync-agents --dry-run
pnpm sync-skills --dry-run

# Override da company alvo (para testes)
pnpm sync-agents --company-id <uuid>
pnpm sync-skills --company-id <uuid>
```

**Ordem importa:** `sync-agents` deve rodar antes de `sync-skills` — skills referenciam agentes por slug do framework e dependem da coluna `metadata.frameworkSlug` populada pelo sync-agents.

## Editando agentes ou skills e re-sincronizando

A fonte da verdade são os arquivos `.md` no FS:

- Agentes: [.claude/agents/{slug}.md](.claude/agents) — frontmatter (`name`, `description`) + body markdown
- Skills:
  - `paperclip` → resolvido via pointer em `.claude/skills/paperclip` apontando para `skills/paperclip/`
  - `company-creator` → resolvido via pointer em `.claude/skills/company-creator` apontando para `.agents/skills/company-creator/`
  - `design-guide` → diretório direto em `.claude/skills/design-guide/`

Fluxo de edição:

1. Edite o arquivo `.md` localmente.
2. Rode `pnpm sync-agents` (ou `pnpm sync-skills` se mudou skill).
3. O script detecta drift e atualiza só o que mudou. Re-execução sem mudanças reporta 0 updated.

## Idempotência (invariantes)

O sync detecta agente existente via `(companyId, metadata.frameworkSlug)`. Para skills, via `(companyId, key)`. Re-execuções:

- **Sem mudanças:** 0 created, 0 updated, N unchanged.
- **Frontmatter mudou** (ex: description): 0 created, 1 updated, N-1 unchanged.
- **Mudança no SKILL.md:** 0 created (do skill), 1 updated, N-1 unchanged.
- **CEO existente:** sempre `unchanged` — não está em AGENT_MAPPING, não é tocado.
- **CTO ou outros agentes pré-existentes:** ignorados pelo sync — não estão no mapping.

## Schema modelagem

| Campo `agents` | Origem |
|----------------|--------|
| `name` | `AGENT_MAPPING.name` |
| `role` | `'ceo' \| 'head' \| 'specialist'` (CEO existente preservado) |
| `title` | `AGENT_MAPPING.title` (e.g. "Head of Architecture") |
| `capabilities` | `frontmatter.description` do .md |
| `adapter_type` | `claude_local` |
| `adapter_config.desiredSkillKeys` | populado pelo `sync-skills` |
| `metadata.frameworkSlug` | `AGENT_MAPPING.slug` (lookup key) |
| `metadata.department` | `AGENT_MAPPING.department` |
| `metadata.parallelismPolicy` | `AGENT_MAPPING.parallelismPolicy` |
| `metadata.isHead` | boolean |
| `reports_to` | id do Head (specialists) ou CEO (Heads) |

## Troubleshooting

### "DATABASE_URL not set"

Garanta que `.paperclip/.env` existe e tem `DATABASE_URL=postgresql://...`. Source antes de rodar:

```bash
export $(grep -E "^DATABASE_URL=" .paperclip/.env | xargs)
pnpm sync-agents
```

### "company {id} not found"

A empresa alvo (`TARGET_COMPANY_ID` em [types.ts](scripts/sync-agents/types.ts)) não existe no banco apontado por `DATABASE_URL`. Confirme via:

```sql
SELECT id, name FROM companies WHERE id = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6';
```

Se faltar, crie via UI do paperclip (`/onboarding`) ou ajuste `TARGET_COMPANY_ID`.

### "AGENT_MAPPING entry "X" has no .claude/agents/X.md"

Inconsistência entre `mapping.ts` e o FS. Adicione o `.md` correspondente em `.claude/agents/` ou remova a entry do mapping.

### Script reporta erro mas DB está bem

Verifique `pg_stat_activity` no Supabase para sessões em estado `ClientRead` perdidas:

```sql
SELECT pid, state, wait_event, EXTRACT(EPOCH FROM (now() - query_start))::int AS sec
FROM pg_stat_activity WHERE datname = 'postgres' AND state = 'active';
```

Sessões zumbis (>60s em `ClientRead`) bloqueiam o pool. Mate-as via `pg_cancel_backend(pid)`.

## Arquivos relacionados

- [scripts/sync-agents/mapping.ts](scripts/sync-agents/mapping.ts) — fonte canônica do mapeamento
- [scripts/sync-agents/types.ts](scripts/sync-agents/types.ts) — tipos compartilhados + constantes
- [scripts/sync-agents/sync.ts](scripts/sync-agents/sync.ts) — script de import de agentes
- [scripts/sync-agents/sync-skills.ts](scripts/sync-agents/sync-skills.ts) — script de import de skills
- [scripts/sync-agents/validate-mapping.ts](scripts/sync-agents/validate-mapping.ts) — validador runtime das invariantes
- [.planning/phases/12-mapping-schema-decisions/12-DECISIONS.md](.planning/phases/12-mapping-schema-decisions/12-DECISIONS.md) — 9 decisões de schema lockadas

## Roadmap futuro (v2 backlog)

- **SYNC-01:** hook automático que re-sincroniza ao editar arquivos do framework
- **SYNC-02:** bidirectional sync (paperclip → arquivos)
- **EXEC-01:** comandos `/planejar-fase` etc. invocam agentes via paperclip heartbeat ao invés de subagentes locais
- **EXEC-02:** workspaces dedicados por agente parallel
