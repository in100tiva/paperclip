# Phase 13: Import Script Core (Agentes + Hierarquia) - Contexto

**Coletado:** 2026-04-27
**Status:** Pronto para planejamento
**Modo:** Auto-gerado (infra pura — discuss pulado)

<domain>
## Limite da Fase

Operador roda `pnpm sync-agents` e os 18 agentes não-CEO aparecem na in100tiva com `reports_to` populado (4 Heads → CEO; 14 specialists → respective Head), `metadata.department` + `metadata.parallelismPolicy` + `role` setados, sem tocar no CEO existente nem na issue INTA-1. Re-execução é idempotente. Skill attachment e import de skills ficam para Phase 14.

</domain>

<decisions>
## Decisões de Implementação

### Discrição do Claude

Fase de infra. Decisões pequenas tomadas durante implementação:

- **Lookup de agente existente:** por `(companyId, metadata.frameworkSlug)`. Slug é o filename sem .md (ex: "planner"). Se ausente, fallback para `(companyId, name)` mas com `metadata.frameworkSlug` populado no insert.
- **Identificação do CEO:** hardcoded `CEO_AGENT_ID` constante em `types.ts` (Phase 12).
- **Two-pass insert:** Pass 1 cria/atualiza todos os agentes sem `reports_to` (id ainda desconhecido). Pass 2 popula `reports_to` mapeando managerSlug → agent.id.
- **Frontmatter parsing:** usar `gray-matter` (já em devDeps do paperclip via company-skills.ts).
- **Description field:** `frontmatter.description` (curta) → `agents.description` (text). Body do .md (longo) NÃO entra no agente — system prompt do Claude vem dos `.claude/agents/*.md` no FS, paperclip só registra os metadados.
- **adapterType:** `claude_local` para todos (consistente com CEO existente).
- **adapterConfig:** `{ model: 'claude-sonnet-4-6', desiredSkillKeys: [] }` (skills vão na Phase 14, vazio aqui).
- **runtimeConfig:** `{}` por ora.
- **Report format:** texto plano com tabela final (created/updated/unchanged/skipped por slug).
- **Fail-fast:** company não existe → exit 1. Slug duplicado → exit 1. .md malformado → exit 1.
- **Connection:** reusar `createDb()` do `@paperclipai/db` package, que já lê `DATABASE_URL` do `.paperclip/.env`.

</decisions>

<code_context>
## Insights do Código Existente

- `packages/db/src/client.ts` — `createDb(url, opts)` retorna `Db` (Drizzle wrapper).
- `packages/db/src/schema/agents.ts` — `agents` table com 18 columns; FK `reports_to` self-ref.
- `server/src/services/agents.ts` — service layer; pode ser usado se conveniente, mas script é one-shot então usar Drizzle direto é mais simples.
- `gray-matter` — usado em `server/src/services/company-skills.ts` (`parseFrontmatterMarkdown`).
- `.paperclip/.env` carrega `DATABASE_URL` Supavisor 6543.

</code_context>

<specifics>
## Ideias Específicas

- Comando: `pnpm sync-agents` registrado no `package.json` raiz como `"sync-agents": "tsx scripts/sync-agents/sync.ts"`.
- Flag opcional `--dry-run` para mostrar relatório sem escrever no banco.
- Flag opcional `--company-id <uuid>` para override de TARGET_COMPANY_ID (útil para testes).

</specifics>

<deferred>
## Ideias Adiadas

- Skills import + attachment → Phase 14.
- UI badge → Phase 15.
- Docs operacionais → Phase 16.

</deferred>
