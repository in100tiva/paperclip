# Phase 14: Skills Import & Attachment - Contexto

**Coletado:** 2026-04-27
**Status:** Pronto para planejamento
**Modo:** Auto-gerado (infra mecânica — discuss pulado)

<domain>
## Limite da Fase

3 CompanySkill na in100tiva (paperclip, company-creator, design-guide) com `sourceType: local_path` apontando para os diretórios reais do FS. `adapter_config.desiredSkillKeys` populado nos agentes conforme SKILL_MAPPING (Phase 12). Re-execução idempotente.

</domain>

<decisions>
## Decisões de Implementação

### Discrição do Claude

- **Path resolution:** `.claude/skills/paperclip` e `.claude/skills/company-creator` são **arquivos pointer** com path relativo (descoberta empírica). Resolver lendo o conteúdo, esperando 1 linha com path. `.claude/skills/design-guide/` é diretório direto com SKILL.md.
- **CompanySkill key:** usar slug do mapping (`paperclip`, `company-creator`, `design-guide`) — mesmo valor para `key` e `slug`.
- **Markdown:** ler o SKILL.md do path resolvido. Para skills sem SKILL.md (caso de canto), usar markdown stub.
- **Attachment:** atualizar `agents.adapterConfig.desiredSkillKeys: string[]` somando o skill key. Manter outros valores se existentes.
- **CEO attachment:** sentinel `'ceo'` em SKILL_MAPPING resolve via lookup `agents.role = 'ceo' AND companyId = TARGET`.
- **Idempotência:** lookup CompanySkill por `(companyId, key)` (unique index existe). Update só se markdown mudou ou metadados drifted.
- **Script:** novo `scripts/sync-agents/sync-skills.ts` (separado de sync.ts). Registrar `pnpm sync-skills` no root package.json.
- **Path canonical no sourceLocator:** path absoluto resolvido (`D:\projetos\ddd\skills\paperclip` etc).

</decisions>

<code_context>
## Código Existente

- `packages/db/src/schema/company_skills.ts` — tabela com unique index `(companyId, key)`.
- `agents.adapterConfig` é jsonb — pode armazenar `desiredSkillKeys: string[]`.
- Phase 13 sync.ts pattern (two-pass + idempotent + report) reutilizável.

</code_context>

<specifics>
## Específicos

- 3 skills: `paperclip` (governance), `company-creator` (CEO only), `design-guide` (UI roles).
- Total attachments after Phase 14: paperclip→13, company-creator→1, design-guide→3 = 17 attachments espalhados em 14 agentes únicos (CEO tem paperclip+company-creator; UI roles têm paperclip+design-guide para alguns; etc).

Wait — recalculando attachments por agente:
- CEO: paperclip + company-creator = 2 skills
- planner (Head Architecture): paperclip
- executor (Head Engineering): paperclip
- verifier (Head Quality): paperclip
- user-profiler (Head Analytics): paperclip
- 8 Architecture specialists: paperclip cada
- ui-researcher (Engineering): design-guide (NÃO paperclip — só specialists Architecture têm paperclip)
- ui-auditor (Quality): design-guide
- ui-checker (Quality): design-guide
- debugger, integration-checker, nyquist-auditor: zero skills (vazio)

Total agentes com skills: 1 CEO + 4 Heads + 8 Arch + 3 UI = 16. Total agentes sem skills: debugger + integration-checker + nyquist-auditor = 3.

Wait, mapping.ts diz `paperclip` attachedToSlugs inclui CEO + 4 Heads + 8 Arch specialists = 13. design-guide inclui 3 UI roles. company-creator inclui só CEO. Que dá 13+1+3 = 17 attachments em 14 agentes únicos (CEO conta 2x).

</specifics>

<deferred>
## Adiadas

- UI badge para parallelism_policy → Phase 15
- Documentação operacional → Phase 16

</deferred>
