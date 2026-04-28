# Fase 20: Agentes Supabase - Contexto

**Coletado:** 2026-04-28
**Status:** Pronto para execução direta

<domain>
Substituir corpos mínimos (Fase 17) de `supabase-executor.md` e `supabase-diagnostician.md` por instruções operacionais completas. Criar skill `supabase-mcp` compartilhada entre os dois.
</domain>

<decisions>
### supabase-executor (SUPA-01..04)
- Caminho preferencial: `mcp__supabase__apply_migration`, `mcp__supabase__execute_sql`, `mcp__supabase__deploy_edge_function`
- Fallback CLI: `supabase functions deploy`, `supabase db push` (apenas quando MCP não cobre)
- `SUPABASE_ACCESS_TOKEN` exclusivamente via `company_secrets` ou env injetada — NUNCA via comentário (segurança)
- `checkpoint:human-action` obrigatório antes de cada deploy (PATCH com status=blocked + razão; aguarda humano)

### supabase-diagnostician (SUPA-05, SUPA-06)
- Read-only via `mcp__supabase__list_migrations`, `get_logs`, `list_tables`, `get_advisors`
- Compara schema version atual vs esperada (do handoff do supabase-executor)
- Reporta divergência ao orquestrador no handoff (artifacts_produced[type=diagnostic])
- intervalSec ≥ 300 (rate limit ~600 req/min)

### supabase-mcp skill (SUPA-07)
- `.claude/skills/supabase-mcp/SKILL.md` — referência compartilhada
- Lista das tools MCP usadas, política de access token, antipadrões
- Anexada via `desiredSkillKeys` no mapping.ts dos 2 agentes
</decisions>

<code_context>
- `.claude/skills/paperclip/SKILL.md` (formato de referência)
- `mcp__supabase__*` tools disponíveis na sessão Claude Code
- `company_secrets` em packages/db/schema/companies.ts
</code_context>

<deferred>
Notion + tech debt → Fase 21
E2E smoke → Fase 22
</deferred>
