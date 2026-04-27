# Fase 11: Skills + System Prompts dos Agentes - Contexto

**Coletado:** 2026-04-27
**Status:** Pronto para planejamento
**Modo:** Decisões autônomas; última fase de v1.1

<domain>
## Limite da Fase

Fazer com que os próprios agentes (Claude Code, Codex, Cursor, OpenClaw, etc.) **respondam em pt-BR** quando o usuário tem `locale=pt-BR`:

- **AGENT-SKILL-01:** System prompts incluem instrução condicional de idioma
- **AGENT-SKILL-02:** Skills/templates traduzidos
- **AGENT-SKILL-03:** Locale propaga: `user.locale` (Supabase) → server context → spawn (env var ou prompt section)
- **AGENT-SKILL-04:** Validação empírica HUMAN-UAT — agente responde em pt-BR após troca

**Fora desta fase:**
- UI traduzida (já feito Fases 7-10)
- Mensagens dos agentes ao usuário (texto código nosso) — Fase 10
- Re-treinamento ou fine-tuning de modelos — fora de escopo declarado

</domain>

<decisions>
## Decisões de Implementação

### Estratégia de propagação locale → agente
- **Single source of truth:** `user.locale` no DB (Better Auth, Fase 7)
- **Heartbeat lê locale do owner do agente** ao spawn — Fase 10's tRef pattern já mostra que tRef vem de session.user.locale; agora estendemos para spawn server-side
- **Injeção via prompt section** (não env var):
  - Server compõe `agent-instructions.ts` com bloco condicional `## Idioma de Resposta` no início ou fim do prompt
  - Quando `user.locale === "pt-BR"`: bloco "Responda ao usuário em português brasileiro (pt-BR). Use linguagem natural, técnica quando apropriado."
  - Quando `user.locale === "en-US"`: bloco ausente OU "Respond to the user in English (en-US)."
- **Por que prompt e não env var:** prompt é universalmente respeitado por modelos LLM; env var requereria adapter-specific wiring para cada CLI (Claude/Codex/Cursor/etc.)

### Estratégia de tradução das skills
- **Skills em `skills/`** (paperclip, paperclip-create-agent, paperclip-create-plugin, para-memory-files) — escolher uma estratégia:
  - **Opção A (recomendada):** Manter SKILL.md original em inglês mas adicionar variantes pt-BR (`SKILL.pt-BR.md`) carregadas condicionalmente quando user.locale=pt-BR
  - **Opção B:** Reescrever SKILL.md inteiro em pt-BR e perder paridade com upstream paperclip
- **Decisão:** **Opção A** — preserva fork hard sem reescrever 100% das skills. Loader em `agent-instructions.ts` escolhe variante baseado em locale.
- **Skills em `.agents/skills/` e `.claude/skills/`** são meta (skills sobre o framework) — fora de escopo desta fase.

### Granularidade de plano
- **3 planos:**
  - 11-01: Server propagation (AGENT-SKILL-03) — heartbeat lê `user.locale`, agent-instructions.ts inclui language directive bloco condicional, testes integration
  - 11-02: System prompt language directive content (AGENT-SKILL-01) — texto exato do bloco, testes RED→GREEN, hooks em adapter-specific paths se necessário (Claude --append-system-prompt-file etc.)
  - 11-03: Skills pt-BR variants (AGENT-SKILL-02) — criar SKILL.pt-BR.md para 4 skills paperclip; loader em agent-instructions; HUMAN-UAT artifact (AGENT-SKILL-04)

### Wave structure
- Wave 1: 11-01 (server propagation foundation) — sequencial primeiro porque outros dependem
- Wave 2: 11-02 (language directive content) + 11-03 (skill variants) — paralelos, file sets disjuntos

### Discrição do Claude
- Texto exato do bloco "## Idioma de Resposta" — afinar via UAT
- Decisão sobre incluir o bloco apenas para pt-BR (assumindo en-US é default modelo) ou para ambos
- Nomenclatura exata `SKILL.pt-BR.md` vs `SKILL.{locale}.md` (decision: `SKILL.{locale}.md` para extensibilidade futura)
- Loading mecânica em agent-instructions.ts (read file, fallback se ausente)

</decisions>

<code_context>
## Insights do Código Existente

### Confirmado
- **`server/src/services/agent-instructions.ts`** — onde instruções de agente são compostas. Ponto de injeção do bloco language.
- **`packages/adapters/claude-local/src/server/execute.ts:539`** — `--append-system-prompt-file` aceita o caminho do arquivo de instruções; injeção está one-shot (resume sessions skip).
- **Skills em `skills/` no root do repo** — paperclip, paperclip-create-agent, paperclip-create-plugin, para-memory-files (4 skills)
- **`server/skills/` não existe** — as skills do `package.json files: ["dist", "ui-dist", "skills"]` são distribuídas na raiz (em `skills/`)
- **`user.locale`** já populado pelo middleware (Fase 9-04 do path); heartbeat tem acesso ao owner via agent.ownerUserId

### A investigar (pesquisa)
- Como `agent-instructions.ts` exatamente compõe o file que vai para `--append-system-prompt-file`
- Onde o heartbeat passa o owner ao adapter (necessário para resolver locale)
- Outros adapters (codex-local, cursor-local, openclaw-gateway, etc.) — qual mecanismo de system prompt cada um usa
- Tests existentes em agent-instructions

</code_context>

<specifics>
## Ideias Específicas

- O usuário (operador) tem dificuldade com inglês — o objetivo final desta fase é **agente responder em pt-BR durante uso real**
- AGENT-SKILL-04 é HUMAN-UAT: requer browser real + agente real respondendo em chat ou plano
- Phase 11 fecha milestone v1.1 — depois vem audit → complete-milestone → cleanup

</specifics>

<deferred>
## Ideias Adiadas

- Reescrita de skills em pt-BR (Opção B) — preserve upstream parity
- Tradução de meta-skills `.agents/skills/` e `.claude/skills/` — meta, não user-facing
- Suporte a outros idiomas (es, fr, etc.) — v2 (L10N-01)

</deferred>
