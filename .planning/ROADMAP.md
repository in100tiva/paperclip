# Roadmap: DDD — Paperclip da Equipe

## Milestones

- ✅ **v1.0 Fork + Multi-Account** — Fases 1-6 (entregue 2026-04-26, 45/45 requisitos, arquivado em `.planning/milestones/v1.0-*`)
- ✅ **v1.1 Internacionalização pt-BR** — Fases 7-11 (entregue 2026-04-27, 26/26 requisitos, arquivado em `.planning/milestones/v1.1-*`)
- 🚧 **v1.2 in100tiva como Software House** — Fases 12-16 (em andamento, 17 requisitos)

## Visão Geral

Importar (one-shot) os 18 agentes do framework `.claude/agents/` e as 3 skills `.claude/skills/` para a empresa `in100tiva` no paperclip, organizados como software house real — Architecture (gate sequencial) → Engineering (parallel) → Quality (gate pós-eng) → Analytics — para visualização no organograma e atribuição de issues, mantendo o framework Claude Code rodando local como hoje (paperclip é vitrine/registro). CEO existente (`d64a9f21-3ad0-4ca5-b7e8-58dbefb55b75`) e issue INTA-1 preservados intactos.

## Fases

**Numeração de Fases:**
- Fases inteiras (12, 13, ...): Trabalho planejado do milestone v1.2 (continua de v1.1 que terminou em fase 11)
- Fases decimais (12.1, 12.2): Inserções urgentes (marcadas com INSERIDA)

- [ ] **Fase 12: Mapping & Schema Decisions** - Define mapeamento canônico frontmatter→agents, atribui role/dept/parallelism_policy a cada agente, decide schema (coluna vs metadata JSON) e quem são os 4 Heads
- [ ] **Fase 13: Import Script Core (Agentes + Hierarquia)** - CLI idempotente `pnpm sync-agents` que cria/atualiza os 17 agentes na in100tiva com manager_agent_id apontando para Heads
- [ ] **Fase 14: Skills Import & Attachment por Cargo** - Importa as 3 skills como CompanySkill local_path e anexa-as a agentes conforme mapeamento (paperclip→CEO+Heads+Architecture; company-creator→CEO; design-guide→UI roles)
- [ ] **Fase 15: UI Surfacing & Hierarchy Validation** - Badge `parallelism_policy` no perfil do agente e organograma renderizando os 18 funcionários sob hierarquia correta
- [ ] **Fase 16: Documentação & Idempotency UAT** - `AGENTS-IMPORT.md` operacional + procedimento HUMAN-UAT validando re-execução não duplica nem corrompe estado

## Detalhes das Fases

### Fase 12: Mapping & Schema Decisions
**Objetivo**: Produzir os artefatos declarativos e decisões de schema necessários para o script de importação rodar — sem decisões pendentes ao iniciar Fase 13.
**Depende de**: Nada (primeira fase do milestone)
**Requisitos**: MAP-01, MAP-02, MAP-03, MAP-04
**Critérios de Sucesso** (o que deve ser VERDADEIRO):
  1. Operador consegue abrir um arquivo (ex.: `.planning/phases/12-*/AGENT-MAPPING.md` ou `scripts/sync-agents/mapping.ts`) e ler, para cada um dos 18 cargos (CEO + 4 Heads + 13 specialists), os campos canônicos: `name`, `role`, `dept` (Architecture/Engineering/Quality/Analytics), `parallelism_policy` (`serial`/`parallel`/`serial-gate`), agente upstream `.md` (ou `synthetic` para Heads inventados), e skills atribuídas
  2. Decisão sobre persistência de `parallelism_policy` está registrada explicitamente (coluna nova em `agents` via migration vs campo em `runtime_config`/`adapter_config` JSON) com justificativa e plano de fallback se schema mudar mid-milestone
  3. Decisão sobre identidade dos 4 Heads está registrada (sintéticos novos vs reusar agentes existentes como `planner`/`executor`/`verifier`/`user-profiler`) com nomes/slugs definitivos
  4. Mapping skill→cargo está em arquivo versionado consultável pelo script (paperclip→CEO+4 Heads+todos Architecture; company-creator→apenas CEO; design-guide→ui-researcher+ui-checker+ui-auditor)
  5. Verificação confirmada de que `manager_agent_id` já existe na tabela `agents` (ou planejada migration se ausente)
**Planos**: A definir

### Fase 13: Import Script Core (Agentes + Hierarquia)
**Objetivo**: Operador roda um único comando e os 17 agentes não-CEO aparecem na in100tiva com hierarquia correta (4 Heads → CEO; 13 specialists → respectivos Heads), sem tocar no CEO existente nem na issue INTA-1.
**Depende de**: Fase 12
**Requisitos**: IMPORT-01, IMPORT-02, IMPORT-05, IMPORT-06, HIER-01
**Critérios de Sucesso** (o que deve ser VERDADEIRO):
  1. Operador roda `pnpm sync-agents` (ou comando equivalente) com companyId resolvido por env/flag e o script termina exit 0 com relatório textual listando criados/atualizados/inalterados/pulados
  2. Após primeira execução, query SQL `SELECT count(*) FROM agents WHERE company_id = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6'` retorna 18 (1 CEO preexistente + 4 Heads + 13 specialists)
  3. Query SQL confirma `manager_agent_id` populado: cada specialist aponta para seu Head, cada Head aponta para o CEO existente (`d64a9f21-3ad0-4ca5-b7e8-58dbefb55b75`); CEO em si tem `manager_agent_id IS NULL`
  4. Issue INTA-1 e o agente CEO existente permanecem intactos (campos byte-for-byte iguais ao pré-execução; verificável via diff SQL)
  5. Re-execução imediata do script (sem mudanças em `.claude/agents/*.md`) reporta 0 created, 0 updated, 18 unchanged — idempotência preservada
  6. Script falha cedo com mensagem acionável quando company não existe, prompt do agente está malformado, ou env vars críticas estão ausentes (validável via dry-run com input quebrado)
**Planos**: A definir

### Fase 14: Skills Import & Attachment por Cargo
**Objetivo**: As 3 skills do framework aparecem como CompanySkill na in100tiva com `sourceType: local_path`, e cada agente tem anexada apenas a(s) skill(s) que correspondem ao seu cargo.
**Depende de**: Fase 13
**Requisitos**: IMPORT-03, IMPORT-04, SKILL-01, SKILL-02, SKILL-03
**Critérios de Sucesso** (o que deve ser VERDADEIRO):
  1. Após executar o script estendido, query na tabela `company_skills` (ou equivalente) retorna 3 entries para a in100tiva: `paperclip`, `company-creator`, `design-guide` — cada uma com `sourceType: local_path` apontando para `.claude/skills/{slug}/`
  2. Skill `paperclip` aparece anexada ao CEO + 4 Heads + todos os agentes do dept Architecture (verificável via query JOIN agents↔skill-attachments)
  3. Skill `company-creator` aparece anexada **apenas** ao CEO (zero attachments para outros 17 agentes)
  4. Skill `design-guide` aparece anexada **apenas** a `ui-researcher`, `ui-checker`, `ui-auditor` (zero attachments para outros 15 agentes)
  5. Re-execução do script é idempotente sobre skills+attachments (não duplica entries, não cria attachment órfão, não remove attachment válido)
**Planos**: A definir
**UI hint**: yes

### Fase 15: UI Surfacing & Hierarchy Validation
**Objetivo**: Operador abre a UI do paperclip e vê a in100tiva renderizada como software house — organograma com 18 funcionários sob hierarquia correta + badge `parallelism_policy` em cada perfil.
**Depende de**: Fase 14
**Requisitos**: HIER-02, HIER-03
**Critérios de Sucesso** (o que deve ser VERDADEIRO):
  1. Operador navega ao perfil de qualquer agente importado e vê badge textual com a política (ex.: "Serial", "Parallel", "Gate") com cor/estilo consistente
  2. Operador abre a página de organograma da in100tiva e vê árvore hierárquica com 4 níveis: CEO no topo → 4 Heads (Architecture/Engineering/Quality/Analytics) no segundo nível → 13 specialists distribuídos sob seus respectivos Heads
  3. Total de 18 nós renderizados (CEO + 4 + 13); zero nós órfãos (sem manager_agent_id resolvido) ou duplicados
  4. RTL test cobre que o badge renderiza valor correto baseado em prop/data field do agente (probe-component pt-BR + en-US dada as variants do milestone v1.1)
**Planos**: A definir
**UI hint**: yes

### Fase 16: Documentação & Idempotency UAT
**Objetivo**: Equipe consegue editar `.claude/agents/*.md` ou `.claude/skills/*` no FS e re-sincronizar com confiança — `AGENTS-IMPORT.md` cobre o ciclo completo e UAT empírico valida a invariante de idempotência sob mutação.
**Depende de**: Fase 15
**Requisitos**: DOCS-01
**Critérios de Sucesso** (o que deve ser VERDADEIRO):
  1. `AGENTS-IMPORT.md` existe na raiz do repo (pt-BR, alinhado com convenção de docs do projeto desde Phase 3) e cobre: pré-requisitos, comando exato, comportamento idempotente, como editar arquivos do framework e re-sincronizar, troubleshooting (ao menos 3 cenários: company missing, prompt malformado, skill path quebrado)
  2. UAT manual procedure documentado (ex.: `16-HUMAN-UAT.md`): operador edita um campo (ex.: description) em `.claude/agents/planner.md`, roda script, observa report mostrando 1 updated; depois roda novamente sem editar e observa 0 updated
  3. UAT cobre cenário de skill: operador edita SKILL.md content, roda script, observa skill atualizada (drift resolvido) sem perder attachments existentes
  4. Documentação roteada para HUMAN-UAT validation (precedente Phases 3-11) com `status: pending` no frontmatter; phase fecha como `complete-with-pending-UAT` se UAT não executado pelo executor Claude
**Planos**: A definir

## Progresso

**Ordem de Execução:**
As fases executam em ordem numérica: 12 → 13 → 14 → 15 → 16

| Fase | Milestone | Planos Completos | Status | Concluída |
|------|-----------|------------------|--------|-----------|
| 12. Mapping & Schema Decisions | v1.2 | 0/TBD | Not started | - |
| 13. Import Script Core (Agentes + Hierarquia) | v1.2 | 0/TBD | Not started | - |
| 14. Skills Import & Attachment por Cargo | v1.2 | 0/TBD | Not started | - |
| 15. UI Surfacing & Hierarchy Validation | v1.2 | 0/TBD | Not started | - |
| 16. Documentação & Idempotency UAT | v1.2 | 0/TBD | Not started | - |

## Histórico

<details>
<summary>✅ v1.0 Fork + Multi-Account (Fases 1-6) — ENTREGUE 2026-04-26</summary>

Fork hard do paperclip + Supabase compartilhado + multi-account Claude Code com swap automático em exhaustão de tokens. 6 fases, 32 planos. Detalhes em `.planning/milestones/v1.0-ROADMAP.md`.

</details>

<details>
<summary>✅ v1.1 Internacionalização pt-BR (Fases 7-11) — ENTREGUE 2026-04-27</summary>

Tradução completa do paperclip para pt-BR — toggle de idioma persistido por usuário, UI inteira (~1700 chaves), mensagens de agentes (tRef pattern para evitar reconexão WS) e system prompts dos modelos LLM (directive injection + 4 SKILL.pt-BR.md variants). 5 fases, 19 planos. 16 UATs empíricos rastreados em `*-HUMAN-UAT.md`. Detalhes em `.planning/milestones/v1.1-ROADMAP.md`.

</details>
