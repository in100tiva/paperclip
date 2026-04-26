# Fase 1: Fork Hard + Cerimônia de Corte - Contexto

**Coletado:** 2026-04-25
**Status:** Pronto para planejamento
**Modo:** Auto-gerado (fase de infraestrutura pura — discuss pulado)

<domain>
## Limite da Fase

Repo do paperclip clonado para `d:\projetos\ddd`, identidade reescrita como `ddd`, upstream removido, política de fork hard documentada e smoke test baseline (`pnpm dev` com embedded Postgres) passando em Windows antes de qualquer mudança técnica.

Cobre os requisitos: FORK-01, FORK-02, FORK-03, FORK-04, FORK-05.

</domain>

<decisions>
## Decisões de Implementação

### Discrição do Claude

Todas as escolhas de implementação são de discrição do Claude — fase de infraestrutura pura. Use o objetivo da fase no ROADMAP, critérios de sucesso e convenções do paperclip para guiar decisões.

### Decisões já fixadas no PROJECT.md / pesquisa

- **Estratégia de fork:** Hard fork — sem manter upstream para merge contínuo
- **Diretório alvo:** `d:\projetos\ddd` (já existe com `.git` inicializado e `.planning/` em uso)
- **Identidade do package raiz:** `ddd` (não preservar `paperclip`)
- **Estratégia de clone:** Como o diretório já tem `.git` e `.planning/`, clonar para temp e copiar arquivos, OU adicionar paperclip como remote temporário, fazer fetch + checkout, depois remover remote — escolha do planejador

</decisions>

<code_context>
## Insights do Código Existente

Diretório atual `d:\projetos\ddd` está vazio exceto por:
- `.git/` (recém-inicializado)
- `.planning/` (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, config.json, research/, phases/)
- `.claude/` (framework instalado)

Paperclip a ser clonado de `https://github.com/paperclipai/paperclip` (ler `master`):
- Monorepo pnpm com workspaces `server`, `ui`, `cli`, `packages/db`, `packages/shared`, `packages/adapters/*`
- Node 20+, TypeScript 5.7, ESM puro
- Ferramentas: pnpm 9.15.4 obrigatório, Drizzle ORM, Express 5, React 19 + Vite 6
- AGENTS.md documenta convenções de mudança em pacotes acoplados
- ROADMAP.md upstream do paperclip pode ser mantido como referência ou removido (escolha do planejador — manter como `paperclip-ROADMAP.md` é razoável)

</code_context>

<specifics>
## Ideias Específicas

- `UPSTREAM_REFERENCE.md` deve registrar SHA exato do commit clonado para futura porta manual de mudanças upstream
- `CONTRIBUTING.md` deve declarar política de fork hard explicitamente (sem PRs upstream, port manual quando útil)
- `package.json` raiz: campo `name` vai para `ddd`; preservar resto da estrutura do paperclip
- Smoke test deve confirmar `pnpm install` + `pnpm dev` rodando com embedded Postgres em Windows antes de qualquer mudança em Fase 2
- Pre-commit hook básico contra `eyJ...` (JWT) em arquivos client-side deve ser instalado já na Fase 1 para preparar terreno para Fase 2 (que adiciona service-role key)

</specifics>

<deferred>
## Ideias Adiadas

- Setup de CI/CD (GitHub Actions) — Fase 2 (DB-03)
- Configuração Supabase — Fase 2
- Setup de 1Password ou outro secret manager — Fase 2 ou 3
- Documentação de onboarding completa — Fase 3 (TEAM-02)

</deferred>
