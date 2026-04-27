# Requisitos: DDD — Paperclip da Equipe (Milestone v1.2)

**Definidos:** 2026-04-27
**Valor Central:** Equipe inteira opera sobre estado compartilhado (Supabase remoto) e agentes nunca param por exhaustão de token — basta trocar conta e continuar.
**Foco do Milestone:** Importar (one-shot) os 18 agentes do framework `.claude/agents/` e as 3 skills `.claude/skills/` para a empresa `in100tiva` no paperclip, organizados como software house (Architecture serial → Engineering parallel → Quality gate → Analytics), mantendo o framework Claude Code rodando local como hoje.

## Requisitos v1.2

### Mapping (modelagem dados framework → paperclip)

- [ ] **MAP-01**: Definir mapeamento canônico de `frontmatter` dos `.claude/agents/*.md` (name, description, tools, color) → campos paperclip `agents` (name, role, description, adapterConfig, runtimeConfig)
- [ ] **MAP-02**: Definir role canônica para cada um dos 17 agentes não-CEO (head/specialist + departamento — Architecture/Engineering/Quality/Analytics)
- [ ] **MAP-03**: Definir `parallelism_policy` (`serial` / `parallel` / `serial-gate`) por agente, persistido em coluna ou metadata JSON do agente
- [ ] **MAP-04**: Definir mapping declarativo skill→cargo (paperclip→CEO+Heads+Architecture; company-creator→CEO; design-guide→UI roles) versionado em arquivo do repo

### Import (script idempotente)

- [ ] **IMPORT-01**: Comando CLI/pnpm script (`pnpm sync-agents` ou similar) que importa os 17 agentes para a in100tiva (companyId resolvido por env/flag)
- [ ] **IMPORT-02**: Script é idempotente — re-execução não duplica agentes, atualiza campos drifted, preserva IDs e issues atribuídas
- [ ] **IMPORT-03**: Script importa as 3 skills como CompanySkill com `sourceType: local_path` apontando para `.claude/skills/{slug}/`
- [ ] **IMPORT-04**: Script anexa skills aos agentes conforme MAP-04 (skill-agent attachment via `adapterConfig.desiredSkillKeys` ou tabela equivalente)
- [ ] **IMPORT-05**: Script falha cedo (fail-fast) com mensagem acionável quando company não existe, prompt do agente está malformado, ou env vars ausentes
- [ ] **IMPORT-06**: Script gera relatório de execução (criados / atualizados / inalterados / pulados) com motivo

### Hierarchy (org chart + parallelism UI)

- [ ] **HIER-01**: Cada agente importado tem `manager_agent_id` apontando para o Head correspondente (Architecture/Engineering/Quality/Analytics) e Heads apontam para CEO
- [ ] **HIER-02**: `parallelism_policy` exibido como badge no perfil do agente na UI do paperclip (Serial / Parallel / Gate)
- [ ] **HIER-03**: Organograma da in100tiva renderiza a árvore com os 18 funcionários (CEO + 4 Heads + 13 specialists) sob hierarquia correta

### Skills (mapeamento por cargo)

- [ ] **SKILL-01**: Skill `paperclip` aparece anexada ao CEO + 4 Heads + todos os agentes do dept Architecture
- [ ] **SKILL-02**: Skill `company-creator` aparece anexada apenas ao CEO
- [ ] **SKILL-03**: Skill `design-guide` aparece anexada a `ui-researcher` + `ui-checker` + `ui-auditor`

### Docs

- [ ] **DOCS-01**: `AGENTS-IMPORT.md` na raiz documentando: pré-requisitos, comando, comportamento idempotente, como editar `.claude/agents/*.md` e re-sincronizar, troubleshooting

## Requisitos v2 (diferidos)

### Sync automático

- **SYNC-01**: Hook/watcher que re-sincroniza automaticamente quando arquivos `.claude/agents/*.md` ou `.claude/skills/*` mudam
- **SYNC-02**: Bidirectional sync com resolução de conflitos
- **SYNC-03**: CI check que valida coerência entre arquivos do framework e estado da in100tiva

### Execução

- **EXEC-01**: Comandos do framework (`/planejar-fase`, `/executar-fase`) invocam agentes via paperclip heartbeat em vez de subagentes locais
- **EXEC-02**: Workspaces por agente paralelo (cada `executor` em sua própria worktree git)

### Métricas

- **OBS-01**: Dashboard "minha software house" — quantos issues por departamento, throughput dos agentes parallel
- **OBS-02**: Custo agregado por departamento (não só por agente individual)

## Fora do Escopo

| Funcionalidade | Motivo |
|----------------|--------|
| Sync automático em background | Escolhido one-shot (manual) — menos magic, mais previsível |
| Migrar comandos `/planejar-fase` etc. para rodar via paperclip | Mudança de motor de execução; outro milestone (EXEC-01) |
| Bidirectional sync (paperclip → arquivos) | Conflitos não-triviais; arquivos `.md` continuam fonte da verdade |
| Tocar/migrar agente CEO existente ou issue INTA-1 | Preservar trabalho já feito na sessão anterior |
| Corrigir bug de connection leak do heartbeat (agente vaza Postgres tx) | Bug v1.1 herdado; corrigir em milestone dedicado de estabilidade |
| Criar agentes em outras companies | Escopo é a in100tiva especificamente |
| UI nova para gerenciar parallelism_policy (criar/editar) | Importação suficiente; edição manual via SQL/UI existente se necessário |

## Rastreabilidade

| Requisito | Fase | Status |
|-----------|------|--------|
| MAP-01 | Fase 12 | Pending |
| MAP-02 | Fase 12 | Pending |
| MAP-03 | Fase 12 | Pending |
| MAP-04 | Fase 12 | Pending |
| IMPORT-01 | Fase 13 | Pending |
| IMPORT-02 | Fase 13 | Pending |
| IMPORT-03 | Fase 14 | Pending |
| IMPORT-04 | Fase 14 | Pending |
| IMPORT-05 | Fase 13 | Pending |
| IMPORT-06 | Fase 13 | Pending |
| HIER-01 | Fase 13 | Pending |
| HIER-02 | Fase 15 | Pending |
| HIER-03 | Fase 15 | Pending |
| SKILL-01 | Fase 14 | Pending |
| SKILL-02 | Fase 14 | Pending |
| SKILL-03 | Fase 14 | Pending |
| DOCS-01 | Fase 16 | Pending |

**Cobertura:**
- Requisitos v1.2: 17 total
- Mapeados para fases: 17 (Fase 12: 4 · Fase 13: 5 · Fase 14: 5 · Fase 15: 2 · Fase 16: 1)
- Não mapeados: 0 ✓

---
*Requisitos definidos: 2026-04-27*
*Última atualização: 2026-04-27 após criação do roadmap v1.2 (5 fases, 17/17 requisitos mapeados)*
