# Fase 7: Foundation i18n + Toggle de Settings - Contexto

**Coletado:** 2026-04-26
**Status:** Pronto para planejamento
**Modo:** Discuss inteligente (autônomo) — 4 áreas cinzas resolvidas em "Aceitar todas"

<domain>
## Limite da Fase

Estabelecer a fundação técnica completa de internacionalização do paperclip team-shared:

- **Persistência:** preferência de idioma por usuário, persistida em `user.locale` (Better Auth schema, text-id, enum `pt-BR | en-US`).
- **API:** endpoint REST `PATCH /api/user/me { locale }` para atualizar.
- **UI mínima:** seção "Idioma" em `instance/settings` com radio pt-BR / en-US — atualização imediata na sessão (otimista) com sync servidor.
- **Biblioteca:** i18next + react-i18next integrada na UI (non-Suspense mode).
- **Dicionários:** `ui/src/i18n/locales/{pt-BR,en-US}/{namespace}.json`, dot-notation kebab-case, 8 namespaces base (common, inbox, projects, settings, auth, agents, errors, activity) — apenas chaves bootstrap nesta fase (chaves reais entram nas fases 8-10).
- **Fallback:** chaves ausentes em pt-BR caem para en-US sem placeholder cru visível.
- **Servidor-aware:** middleware lê `user.locale` da sessão Better Auth e expõe no contexto de request (`req.locale`) para uso futuro em SSR/API responses/templates.
- **Detector CI:** script `ui/scripts/check-i18n-keys.ts` rodando via vitest custom — warn em dev, error em CI; workflow GitHub Actions roda no PR.

**Fora desta fase:** tradução das telas (UI-01..09 ficam para Fase 8/9), mensagens de agentes (Fase 10), system prompts (Fase 11). Apenas a fundação + toggle funcional.

</domain>

<decisions>
## Decisões de Implementação

### Biblioteca i18n
- **i18next + react-i18next** — padrão de mercado, maturity, ecossistema completo
- **Static imports JSON** — bundle pequeno, sem fetch dinâmico, simples para hot-swap
- **Non-Suspense mode** — mais simples para troca hot, evita boundary boilerplate
- **Plurals/contexto simples v1.1** — ICU MessageFormat fica em v2 (L10N-03 já fora de escopo)

### Persistência da Preferência
- **Coluna `locale` em `user` (Better Auth schema)** — `text` com check constraint enum `pt-BR | en-US`, default `pt-BR`; junto com identidade
- **PATCH `/api/user/me { locale }`** — REST simples, alinhado com convenção paperclip
- **Aplicação imediata otimista** — UI muda na hora; sync servidor async; rollback se erro
- **Default pt-BR** para usuários sem preferência (SETTINGS-03); cliente pode ler `Accept-Language` como hint só pré-login

### Dicionários e Namespaces
- **JSON por namespace** — diff legível, ferramentas externas, padrão i18next
- **Localização: `ui/src/i18n/locales/{pt-BR,en-US}/{namespace}.json`** — co-located com UI, importável estaticamente
- **Convenção: dot-notation kebab-case** (`inbox.empty-state.title`) — i18next idiomatic
- **Namespaces iniciais:** common, inbox, projects, settings, auth, agents, errors, activity (8) — alinhados com fases UI 8-10

### Locale no Servidor + Detector CI
- **Servidor lê `user.locale` do DB via Better Auth session** — fonte de verdade; `Accept-Language` header como fallback antes do login
- **Activity log: emite `actionKey + paramsJson` no DB; client renderiza via `t()`** — log estável (não muda se tradução muda); flexível para troca de idioma do leitor
- **Detector CI: warn em dev, error em CI** — dev rápido, CI seguro contra regressões
- **Detector roda em `ui/scripts/check-i18n-keys.ts`** (script vitest custom) + GitHub Actions workflow no PR

### Discrição do Claude
- Estrutura interna do middleware servidor (Express/Fastify/etc.) e formato exato do `req.locale` ficam a critério da implementação respeitando convenções existentes do paperclip
- Schema da migration Drizzle (nome do arquivo, índice se necessário) a critério
- Detalhes exatos do detector (regex de extração de keys, exclusões) a critério
- UI exata do radio em settings (componentes existentes do paperclip, layout) a critério respeitando UI-04 (admin/company traduzido em fase 9)

</decisions>

<code_context>
## Insights do Código Existente

### Stack confirmada
- **UI:** `ui/` workspace (`@paperclipai/ui`) — React + TypeScript + Vite + Tailwind, `@tanstack/react-query` para data, `vitest` para testes
- **Server:** `server/` workspace (`@paperclipai/server`) — TypeScript + tsx, Better Auth contra Postgres do Supabase
- **Schema:** `packages/db/src/schema/` (Drizzle ORM) — convenção uuid para entidades novas, text para FK Better Auth user.id
- **Adapters:** `packages/adapters/` — claude-local, codex-local, etc.
- **Shared:** `packages/shared/` — types e validators compartilhados (Zod) entre UI e server

### Padrões estabelecidos relevantes
- API REST contracts via `packages/shared/src/validators/` (Zod schemas) compartilhados client+server
- Better Auth schema em `packages/db/src/schema/auth.ts` (text-id, schema-prefix `paperclip-team-shared`)
- Settings page existente em `ui/src/pages/` (procurar padrão `CompanySettings.tsx` que ganhou seção pool em fase 6)
- Activity log já usa pattern `action + detailsJson` em `server/src/services/activity-log.ts` (extensível para chave de tradução)
- Vitest configs múltiplos por workspace, `pnpm tsc --noEmit` é o gate de tipo do CI

### Pontos de integração
- **DB schema:** adicionar coluna em `user` table — migration drizzle-kit + apply via CI workflow `db-migrate.yml` (DB-03)
- **Server:** middleware de session já existe (Better Auth) — estender para popular `req.locale`
- **UI:** Provider i18next no top do `App.tsx`, hook `useTranslation()` nos componentes, hidratação inicial com `user.locale` ou Accept-Language
- **Settings page:** seção "Idioma" perto da seção de Claude Accounts (CompanySettings) ou em UserSettings dedicada (decidir no plano)
- **Activity log:** templates de tradução em `ui/src/i18n/locales/*/activity.json` referenciados por `action` value

</code_context>

<specifics>
## Ideias Específicas

- **pt-BR é o default** — usuário (operador deste projeto) tem dificuldade com inglês; default pt-BR é a UX correta (não en-US como paperclip vanilla).
- **Toggle vive em "instance/settings"** — usuário pediu literalmente; pode ser UserSettings ou seção em CompanySettings (decidido em planejamento; instance/settings sugere preferência por usuário, não company-wide).
- **Tradução cobre TODO o paperclip** — inbox, projects, agentes, skills inclusos; nas fases 8-11 cada uma cuida de seu escopo.

</specifics>

<deferred>
## Ideias Adiadas

- **Suporte a outros idiomas (es, fr)** — L10N-01 em v2; arquitetura i18next já é plugável, basta adicionar dicionário.
- **Formatação Intl avançada (datas, números, moeda) por locale** — L10N-02 em v2.
- **ICU MessageFormat (plural complexo, gênero)** — L10N-03 em v2.
- **Tradução de docs operacionais externos** (README, ROADMAP da raiz, docs paperclip upstream) — L10N-04 em v2; ONBOARDING/TROUBLESHOOTING/CONTRIBUTING já em pt-BR.

</deferred>
