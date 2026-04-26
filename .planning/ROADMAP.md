# Roadmap: DDD — Paperclip da Equipe

## Milestones

- ✓ **v1.0 Fork + Multi-Account** — Fases 1-6 (entregue 2026-04-26, 45/45 requisitos, arquivado em `.planning/milestones/v1.0-*`)
- 🚧 **v1.1 Internacionalização pt-BR** — Fases 7-11 (em andamento)

## Visão Geral

Traduzir toda a experiência do paperclip para português do Brasil, com toggle de idioma em instance/settings (pt-BR / en-US) — UI completa, mensagens dos agentes ao usuário e skills/system prompts inclusos. Cinco fases, ordenadas por dependência técnica: foundation (settings persistence + infra i18n) antes de tradução de UI; UI antes de mensagens de agente; system prompts/skills por último porque dependem da preference de idioma já propagada do user até o spawn dos agentes.

## Fases

**Numeração de Fases:**
- Fases inteiras (1, 2, 3, ..., 7, 8, ...): Trabalho planejado do milestone
- Fases decimais (7.1, 7.2): Inserções urgentes (marcadas com INSERTED)

Fases 1-6 arquivadas em `.planning/milestones/v1.0-ROADMAP.md` como referência histórica do milestone v1.0.

- [x] **Phase 7: Foundation i18n + Toggle de Settings** — Schema de preferência de idioma, API de update, toggle UI em settings, biblioteca i18n integrada, dicionários pt-BR/en-US, fallback e detector de chaves ausentes (`complete-with-pending-UAT` — UAT-07-01/02 deferred)
- [ ] **Phase 8: Tradução UI Core** — Inbox, projects, settings, navegação/sidebar/header e activity log renderizados em pt-BR
- [ ] **Phase 9: Tradução UI Admin + Auth + Mensagens Sistêmicas** — Telas admin/company, auth (login/signup/reset/invite), formulários, erros, validações, tooltips, modais e toasts traduzidos
- [ ] **Phase 10: Mensagens dos Agentes ao Usuário** — Status messages, summaries/relatórios, prompts UI de painéis de agente, notificações e toasts de eventos de agente em pt-BR
- [ ] **Phase 11: Skills + System Prompts dos Agentes** — System prompts condicionais por locale, skills/templates traduzidos, propagação user → agent context → spawn e validação empírica de resposta em pt-BR

## Detalhes das Fases

### Phase 7: Foundation i18n + Toggle de Settings

**Goal**: Estabelecer a fundação técnica completa de internacionalização — preferência de idioma persistida por usuário, toggle funcional em instance/settings, biblioteca i18n integrada com namespaces, dicionários pt-BR/en-US versionados no repo, fallback en-US para chaves ausentes, locale disponível no servidor (SSR/API/templates) e detector de chaves não traduzidas em build/CI. Sem essa base, nenhuma tradução posterior tem onde renderizar nem por onde propagar.

**Depends on**: Nada (primeira fase do milestone v1.1; v1.0 entregue)

**Requirements**: SETTINGS-01, SETTINGS-02, SETTINGS-03, SETTINGS-04, I18N-01, I18N-02, I18N-03, I18N-04, I18N-05

**Success Criteria** (o que deve ser VERDADEIRO):
1. Usuário acessa `instance/settings`, vê radio com pt-BR / en-US, seleciona pt-BR e a página atualiza imediatamente sem reload completo (mudança aplicada na sessão atual).
2. Após logout/login, a preferência de idioma do usuário persiste — Supabase armazena a escolha por usuário e o app a hidrata na sessão.
3. Usuário novo (sem preferência explícita) recebe pt-BR como default; chave ausente em pt-BR cai para en-US sem mostrar `i18n.key.bruta` ao usuário.
4. Build/CI sinaliza (warn ou erro) quando o código usa uma chave de tradução que não existe nos dicionários — chaves órfãs detectáveis antes de ir para produção.
5. Locale do usuário está disponível no contexto do servidor (acessível em rotas API, SSR e templates de activity log) — não apenas no cliente.

**Plans**: 5 plans across 3 waves

Plans:
- [x] 07-01-PLAN.md — Wave 0 (RED): 16 bootstrap JSON dicts + 5 failing test files anchoring SETTINGS-01..04 + I18N-01..05
- [x] 07-02-PLAN.md — Wave 1: DB migration 0073_add_user_locale.sql + Better Auth additionalFields.locale + Zod localeSchema/refine
- [x] 07-03-PLAN.md — Wave 1: i18next + react-i18next install; ui/src/i18n/{index,resources,i18next.d}.ts; init+missing-keys tests GREEN
- [x] 07-04-PLAN.md — Wave 2: server actorMiddleware sets req.locale (3-tier fallback); PATCH /api/auth/profile accepts locale; server tests GREEN
- [x] 07-05-PLAN.md — Wave 2: I18nextProvider in main.tsx + ProfileSettings Language toggle (optimistic, await changeLanguage before setQueryData) + UAT-07-01/02 checkpoint

### Phase 8: Tradução UI Core

**Goal**: Traduzir as telas e elementos de navegação que o usuário toca em todo uso típico do paperclip — inbox (lista, filtros, ações em massa, estados vazios), projects (lista, criação, detalhes, edição), settings (incluindo a própria seção de idioma), sidebar/header/menus/breadcrumbs e templates do activity log. São as superfícies de maior tráfego; traduzi-las primeiro entrega valor visível para o usuário antes de cobrir áreas administrativas.

**Depends on**: Phase 7 (precisa de infra i18n + toggle funcional para hidratar locale e renderizar via t())

**Requirements**: UI-01, UI-02, UI-03, UI-05, UI-09

**Success Criteria** (o que deve ser VERDADEIRO):
1. Usuário com locale=pt-BR navega em inbox e projects sem ver nenhuma string em inglês — listas, filtros, formulários, estados vazios e ações em massa todos em pt-BR.
2. Tela de settings (inclusive a seção de idioma e settings de Claude accounts) está completamente em pt-BR quando locale=pt-BR ativo.
3. Sidebar, header, menus, breadcrumbs e navegação global aparecem em pt-BR — usuário não vê texto bilíngue misturado em torno do conteúdo.
4. Entradas do activity log (incluindo eventos como `claude_account_rotated`) renderizam em pt-BR no idioma do leitor — template é resolvido server-side ou client-side respeitando locale.
5. Mesmo usuário troca para en-US no toggle e todas as superfícies de Phase 8 voltam para inglês imediatamente — paridade de cobertura entre os dois idiomas.

**Plans**: TBD

**UI hint**: yes

### Phase 9: Tradução UI Admin + Auth + Mensagens Sistêmicas

**Goal**: Cobrir as superfícies UI restantes — telas administrativas (membros, roles, claude accounts pool, cost summary, rotation history), formulários de auth (login/signup/reset password/invite/board-claim), mensagens de erro/validação/API, tooltips, empty states, modais de confirmação e toasts. São fluxos de menor frequência mas críticos (onboarding, recuperação de erro, configuração); fechar essa fase elimina superfícies UI bilíngues do app.

**Depends on**: Phase 8 (mantém continuidade visual de tradução; reusa namespaces e padrões estabelecidos)

**Requirements**: UI-04, UI-06, UI-07, UI-08

**Success Criteria** (o que deve ser VERDADEIRO):
1. Telas admin/company (membros, roles, Claude accounts pool, cost summary, rotation history) renderizam todos os labels, headers e ações em pt-BR.
2. Fluxos de auth — login, signup, reset password, invite/board-claim — apresentam formulários, instruções e CTAs em pt-BR para usuários com locale=pt-BR (e em inglês para en-US).
3. Mensagens de erro, validação de formulários e respostas de erro de API exibem texto traduzido — usuário vê "Email inválido" em vez de `validation.email.invalid` ou string em inglês.
4. Tooltips, empty states, modais de confirmação e toasts respeitam locale ativo — sem mistura de idiomas em hovers ou prompts modais.
5. Após fechar Phase 9, varredura manual ou automatizada não encontra strings em inglês na UI quando locale=pt-BR — cobertura de UI declarada completa.

**Plans**: TBD

**UI hint**: yes

### Phase 10: Mensagens dos Agentes ao Usuário

**Goal**: Traduzir a camada de comunicação dos agentes para o usuário — status messages emitidos durante execução ("em execução", "swap de conta", "aguardando aprovação", "step concluído"), summaries e relatórios apresentados em UI, prompts UI dos painéis de agente (botões, headers, labels) e notificações/toasts de eventos. É a camada entre o app e o trabalho do agente; tradução desses textos requer Phase 7 (locale propagado) mas é independente de Phase 11 (system prompts) — esses textos são código nosso, não output do modelo.

**Depends on**: Phase 7 (locale do usuário disponível no servidor para resolver templates de status/summary)

**Requirements**: AGENT-MSG-01, AGENT-MSG-02, AGENT-MSG-03, AGENT-MSG-04

**Success Criteria** (o que deve ser VERDADEIRO):
1. Usuário com locale=pt-BR vê status messages dos agentes em português ("em execução", "trocando conta Claude", "aguardando aprovação", "step concluído") — não inglês cru no painel de agente.
2. Summaries e relatórios gerados pelo paperclip (sumários de step, relatório de execução) apresentados em pt-BR no idioma do leitor.
3. Painéis de agente — botões, headers, labels, abas — renderizam em pt-BR; usuário não vê "Run", "Pause", "Logs" misturados com texto em português.
4. Notificações e toasts disparados por eventos de agente (sucesso, falha, swap, aprovação requerida) chegam em pt-BR ao usuário com locale=pt-BR.
5. Toggle para en-US devolve toda a camada de mensagens de agente para inglês imediatamente — paridade verificável.

**Plans**: TBD

**UI hint**: yes

### Phase 11: Skills + System Prompts dos Agentes

**Goal**: Fazer com que os próprios agentes (Claude Code, Codex, Cursor, OpenClaw) respondam em pt-BR quando o usuário tem locale=pt-BR — incluir instrução condicional de idioma nos system prompts, traduzir skills/templates que o paperclip injeta no agente, propagar a preferência de idioma do user → agent context → spawn (env var, prompt section, ou ambos) e validar empiricamente que o agente realmente responde em pt-BR após troca de idioma. Última fase porque depende de toda a propagação anterior; o output do modelo só pode mudar após a preferência do usuário chegar até o spawn.

**Depends on**: Phase 7 (locale propagado até o servidor) e Phase 10 (agent message layer estabilizada — system prompts complementam, não substituem, mensagens nossas)

**Requirements**: AGENT-SKILL-01, AGENT-SKILL-02, AGENT-SKILL-03, AGENT-SKILL-04

**Success Criteria** (o que deve ser VERDADEIRO):
1. System prompts dos agentes contêm instrução condicional de idioma — quando user locale = pt-BR, prompt inclui "responda em pt-BR" (ou equivalente); quando en-US, instrução ausente ou em inglês.
2. Skills/templates de prompt do paperclip que falam diretamente com o usuário (nome de skill, descrição, output template) traduzidos para pt-BR e selecionados conforme locale.
3. Configuração de idioma propaga do user (Supabase preference) → agent context (server) → spawn (env var ou seção de prompt) — não acoplada a estado do cliente UI; agente spawnado em background herda preferência correta.
4. Validação empírica HUMAN-UAT: usuário troca para pt-BR, dispara um agente em uma tarefa nova, agente responde em português brasileiro nas mensagens de output (registrado em UAT artifact).
5. Reverse-check: usuário em en-US dispara o mesmo agente e recebe resposta em inglês — comportamento condicional comprovado, não tradução acidental por um modelo "que sempre responde em pt-BR".

**Plans**: TBD

## Tabela de Progresso

| Fase | Planos Completos | Status | Concluída em |
|------|------------------|--------|--------------|
| 7. Foundation i18n + Toggle de Settings | 5/5 | Complete-with-pending-UAT | 2026-04-26 |
| 8. Tradução UI Core | 0/0 | Não iniciada | - |
| 9. Tradução UI Admin + Auth + Mensagens Sistêmicas | 0/0 | Não iniciada | - |
| 10. Mensagens dos Agentes ao Usuário | 0/0 | Não iniciada | - |
| 11. Skills + System Prompts dos Agentes | 0/0 | Não iniciada | - |

## Cobertura

- Requisitos v1.1: 26 total
- Mapeados para fases: 26 ✓
- Não mapeados: 0
- Sem órfãos, sem duplicatas

---
*Roadmap criado: 2026-04-26 (milestone v1.1, continuação de numeração da fase 6 → fase 7)*
