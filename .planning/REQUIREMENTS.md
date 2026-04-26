# Requisitos: DDD — Paperclip da Equipe (v1.1)

**Definidos:** 2026-04-26
**Milestone:** v1.1 — Internacionalização pt-BR
**Valor Central:** Equipe inteira opera sobre estado compartilhado e agentes nunca param por exhaustão de token. **v1.1 adiciona:** experiência completa em português do Brasil — toggle de idioma, UI traduzida, mensagens de agentes e skills/system prompts em pt-BR.

## Requisitos v1.1

Requisitos para o milestone v1.1. Cada um mapeia para fases do roadmap.

### Settings — Toggle de Idioma e Persistência

- [ ] **SETTINGS-01**: Usuário pode alternar idioma em `instance/settings` via radio (pt-BR / en-US)
- [x] **SETTINGS-02**: Preferência de idioma persiste por usuário no Supabase (coluna em `user` ou tabela de preferências)
- [x] **SETTINGS-03**: Default pt-BR para usuários sem preferência explícita; fallback en-US para chaves ausentes
- [ ] **SETTINGS-04**: Mudança de idioma aplica imediatamente na sessão atual sem reload completo da página

### I18n — Infraestrutura

- [ ] **I18N-01**: Biblioteca i18n integrada (i18next + react-i18next ou equivalente) com namespaces por área funcional
- [ ] **I18N-02**: Dicionários `pt-BR` e `en-US` versionados no repo em JSON (ou TS) com convenção de chaves estável
- [ ] **I18N-03**: Fallback en-US para chaves pt-BR ausentes (e vice-versa) — sem placeholder cru visível ao usuário
- [ ] **I18N-04**: Detector de chaves não traduzidas em CI ou dev (warn/erro durante build quando chave usada não existe no dicionário)
- [x] **I18N-05**: Locale do usuário disponível no context do servidor (para SSR, responses de API e templates de activity log)

### UI — Tradução Completa da Interface

- [ ] **UI-01**: Tela inbox traduzida (lista de items, filtros, ações em massa, estados vazios)
- [ ] **UI-02**: Tela projects traduzida (lista, criação, detalhes, edição)
- [ ] **UI-03**: Tela settings traduzida — incluindo a própria seção de idioma e settings de Claude accounts
- [ ] **UI-04**: Telas admin/company traduzidas (membros, roles, claude accounts pool, cost summary, rotation history)
- [ ] **UI-05**: Navegação, sidebar, header, menus e breadcrumbs traduzidos
- [ ] **UI-06**: Formulários de auth (login, signup, reset password, invite/board-claim) traduzidos
- [ ] **UI-07**: Mensagens de erro, validação de formulários e mensagens de API traduzidas
- [ ] **UI-08**: Tooltips, empty states, modais de confirmação e toasts traduzidos
- [ ] **UI-09**: Templates de entrada do activity log renderizados em pt-BR (incluindo eventos `claude_account_rotated` etc.)

### Agent Messages — Comunicação dos Agentes ao Usuário

- [ ] **AGENT-MSG-01**: Status messages dos agentes ("em execução", "swap de conta", "aguardando aprovação", "step concluído") em pt-BR
- [ ] **AGENT-MSG-02**: Summaries e relatórios gerados por agentes apresentados em pt-BR quando idioma ativo
- [ ] **AGENT-MSG-03**: Prompts UI dos agentes (botões, headers, labels de painéis de agente) traduzidos
- [ ] **AGENT-MSG-04**: Notificações e toasts de eventos de agente em pt-BR

### Agent Skills — System Prompts e Comportamento do Modelo

- [ ] **AGENT-SKILL-01**: System prompts dos agentes incluem instrução condicional de idioma ("responda em pt-BR quando user locale = pt-BR")
- [ ] **AGENT-SKILL-02**: Skills/templates de prompt do paperclip que falam com o usuário traduzidos para pt-BR
- [ ] **AGENT-SKILL-03**: Configuração de idioma propaga do user → agent context → spawn (env var ou prompt section, não acoplado a UI cliente)
- [ ] **AGENT-SKILL-04**: Comportamento empiricamente validado — agente realmente responde em pt-BR após troca de idioma (HUMAN-UAT)

## Requisitos v2

Diferidos para milestone futuro.

### Localização Estendida

- **L10N-01**: Suporte a outros idiomas (en-US é default; novos idiomas plugáveis via convenção de dicionário)
- **L10N-02**: Formatação de datas/números/moeda por locale (Intl API)
- **L10N-03**: Pluralização e gênero gramatical via ICU MessageFormat
- **L10N-04**: Tradução de docs operacionais externos (ONBOARDING.md, TROUBLESHOOTING.md, CONTRIBUTING.md já em pt-BR; demais arquivos da raiz em inglês — diferir)

### Backlog v1.0 Carry-over (não-bloqueante)

Ver `.planning/milestones/v1.0-REQUIREMENTS.md §"Requisitos v2"` para POOL, OBS, AUTH2, RLS, STOR.

## Fora do Escopo

Explicitamente excluídos deste milestone.

| Funcionalidade | Motivo |
|----------------|--------|
| Tradução para outros idiomas (es, fr, etc.) | Foco v1.1 é pt-BR; arquitetura plugável fica em v2 (L10N-01) |
| Formatação Intl avançada (plural ICU, gênero) | Strings simples e plurais básicos cobrem v1.1; ICU em v2 (L10N-03) |
| Tradução do código-fonte (comentários, identifiers) | Mantém compatibilidade com upstream conceptual; fork hard não obriga |
| Tradução de logs internos do servidor (não-user-facing) | Operadores leem inglês; logs de debug ficam intactos |
| Tradução de mensagens de erro do banco/Postgres | Camada de infra; usuário vê mensagens traduzidas no app, não erros raw |
| Re-treinar/fine-tunar modelos para pt-BR | Confiamos na competência multi-língue do Claude/Codex; instrução via system prompt suficiente |
| Tradução automática via LLM em runtime | Custo + variabilidade; dicionários estáticos versionados são determinísticos |

## Rastreabilidade

Quais fases cobrem quais requisitos. Atualizado durante a criação do roadmap.

| Requisito | Fase | Status |
|-----------|------|--------|
| SETTINGS-01 | Fase 7 | Pending |
| SETTINGS-02 | Fase 7 | Complete |
| SETTINGS-03 | Fase 7 | Complete |
| SETTINGS-04 | Fase 7 | Pending |
| I18N-01 | Fase 7 | Pending |
| I18N-02 | Fase 7 | Pending |
| I18N-03 | Fase 7 | Pending |
| I18N-04 | Fase 7 | Pending |
| I18N-05 | Fase 7 | Complete |
| UI-01 | Fase 8 | Pending |
| UI-02 | Fase 8 | Pending |
| UI-03 | Fase 8 | Pending |
| UI-04 | Fase 9 | Pending |
| UI-05 | Fase 8 | Pending |
| UI-06 | Fase 9 | Pending |
| UI-07 | Fase 9 | Pending |
| UI-08 | Fase 9 | Pending |
| UI-09 | Fase 8 | Pending |
| AGENT-MSG-01 | Fase 10 | Pending |
| AGENT-MSG-02 | Fase 10 | Pending |
| AGENT-MSG-03 | Fase 10 | Pending |
| AGENT-MSG-04 | Fase 10 | Pending |
| AGENT-SKILL-01 | Fase 11 | Pending |
| AGENT-SKILL-02 | Fase 11 | Pending |
| AGENT-SKILL-03 | Fase 11 | Pending |
| AGENT-SKILL-04 | Fase 11 | Pending |

**Cobertura:**
- Requisitos v1.1: 26 total
- Mapeados para fases: 26 ✓
- Não mapeados: 0

**Distribuição por fase:**
- Fase 7 (Foundation i18n + Toggle): 9 requisitos (SETTINGS-01..04, I18N-01..05)
- Fase 8 (Tradução UI Core): 5 requisitos (UI-01, UI-02, UI-03, UI-05, UI-09)
- Fase 9 (Tradução UI Admin + Auth + Sistêmicas): 4 requisitos (UI-04, UI-06, UI-07, UI-08)
- Fase 10 (Mensagens dos Agentes): 4 requisitos (AGENT-MSG-01..04)
- Fase 11 (Skills + System Prompts): 4 requisitos (AGENT-SKILL-01..04)

---
*Requisitos definidos: 2026-04-26*
*Última atualização: 2026-04-26 após criação do roadmap v1.1 (fases 7-11 mapeadas)*
