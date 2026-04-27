# Phase 11: Skills + System Prompts dos Agentes - Research

**Researched:** 2026-04-27
**Domain:** Locale propagation server→adapter→model + skill variant loading + system prompt language directive
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Single source of truth:** `user.locale` no DB Better Auth (`packages/db/src/schema/auth.ts:9`).
- **Heartbeat lê locale do owner** ao spawn; estende pattern Fase 10 (server-side, não cliente).
- **Injeção via prompt section, não env var** — universal entre LLMs, evita wiring por adapter.
- **Texto do directive:**
  - `pt-BR`: bloco "Responda ao usuário em português brasileiro (pt-BR). Use linguagem natural, técnica quando apropriado."
  - `en-US`: bloco ausente OU "Respond to the user in English (en-US)."
- **Skills strategy: Opção A** — preserva `SKILL.md` em inglês, adiciona `SKILL.{locale}.md` variantes carregadas condicionalmente. Loader escolhe baseado em locale.
- **Nomenclatura:** `SKILL.{locale}.md` (extensível para v2 L10N-01).
- **Skills meta** em `.agents/skills/` e `.claude/skills/` — fora de escopo.
- **3 planos:**
  - 11-01: Server propagation (AGENT-SKILL-03) — sequencial primeiro
  - 11-02: Language directive content (AGENT-SKILL-01) — paralelo Wave 2
  - 11-03: Skill pt-BR variants + loader + HUMAN-UAT (AGENT-SKILL-02 + 04) — paralelo Wave 2

### Claude's Discretion

- Texto exato do bloco "## Idioma de Resposta" — afinar via UAT
- Decisão sobre incluir bloco apenas para pt-BR (assumindo en-US default modelo) ou para ambos
- Loading mechanics em agent-instructions.ts (read file, fallback se ausente)

### Deferred Ideas (OUT OF SCOPE)

- Reescrita de skills inteiras em pt-BR (Opção B) — quebraria paridade upstream
- Tradução de meta-skills `.agents/skills/`, `.claude/skills/`
- Suporte a outros idiomas (es, fr) — v2 L10N-01
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGENT-SKILL-01 | System prompts incluem instrução condicional de idioma | Loader em `agent-instructions.ts` ou no adapter compõe bloco "## Idioma de Resposta" e o anexa ao conteúdo de instructions ANTES de gerar `instructionsContents` que vai para `prepareClaudePromptBundle`. Bloco condicional: append-only quando `locale==="pt-BR"`. Texto fica em `server/src/services/agent-instructions-locale-directive.ts` (novo) — função `buildLanguageDirectiveBlock(locale)` retorna `string`. Plano 11-02. |
| AGENT-SKILL-02 | Skills/templates traduzidos | Criar `skills/paperclip/SKILL.pt-BR.md`, `skills/paperclip-create-agent/SKILL.pt-BR.md`, `skills/paperclip-create-plugin/SKILL.pt-BR.md`, `skills/para-memory-files/SKILL.pt-BR.md`. Tamanhos atuais (linhas): paperclip 347, paperclip-create-agent 163, paperclip-create-plugin 102, para-memory-files 105 → ~717 linhas total para traduzir. **Loader change** em `packages/adapter-utils/src/server-utils.ts:1043-1061` (`readPaperclipRuntimeSkillEntries`) — atualmente apenas lista subdirs. Não precisa mudar; o `runtimeName` permanece `paperclip` etc. e o conteúdo `SKILL.md` é lido pelo Claude Code CLI a partir do symlink. **Decisão de design:** o symlink em `prompt-cache.ts:147-150` aponta para o diretório inteiro. Para servir variante, o symlink-path source deve ser o diretório + um arquivo `SKILL.md` materializado no destino com conteúdo da variante (em vez de symlink direto), OU substituir `SKILL.md` por `SKILL.pt-BR.md` no diretório destino quando locale=pt-BR. **Recomendação:** copiar diretório (não symlink) quando locale=pt-BR, e renomear `SKILL.pt-BR.md` → `SKILL.md` antes do bundle hash. Cache key inclui locale para invalidação correta. Plano 11-03. |
| AGENT-SKILL-03 | Locale propaga: user → agent context → spawn | **Caminho:** `agent_wakeup_requests.requestedByActorType="user"` + `requestedByActorId=<userId>` (já populado, ver `packages/db/src/schema/agent_wakeup_requests.ts:17-18`). Heartbeat resolve `userId → user.locale` via JOIN no spawn. Para timer-driven heartbeats (sem usuário), fallback `pt-BR` (default DB) ou último usuário que despertou o agente. Plano 11-01 implementa lookup, propaga via parâmetro novo `runtimeLocale` em `prepareClaudePromptBundle` → invalida bundleKey corretamente. |
| AGENT-SKILL-04 | Validação empírica HUMAN-UAT | Roteiro: usuário troca locale para pt-BR em settings, dispara wake on-demand de agente Claude, observa resposta em pt-BR no chat/transcript. Cobre Plano 11-03 (artifact 11-HUMAN-UAT.md). |
</phase_requirements>

## Summary

Esta fase faz **agentes responderem em pt-BR** em chat/transcript quando o usuário operador tem `locale=pt-BR`. Fase 10 traduziu o texto do nosso código (UI, status, summaries que renderizamos). Fase 11 traduz **a saída do modelo** via dois mecanismos:

1. **Language directive injection** em system prompt — bloco condicional "Responda em pt-BR" composto server-side e anexado ao `instructionsContents` antes do bundle.
2. **Skill content variants** — `SKILL.pt-BR.md` lado-a-lado com `SKILL.md`; loader escolhe baseado em locale do owner.

**Bloqueador conceitual descoberto:** O schema atual NÃO tem `agents.ownerUserId`. Em vez disso, o caminho de propagação passa por `agent_wakeup_requests.requestedByActorId` (quando wake é user-triggered). Para timer/system-triggered wakes não há owner direto — fallback `pt-BR` (default DB) é seguro.

**Primary recommendation:** Plano 11-01 implementa lookup `wakeupRequest → user.locale` em `heartbeat.ts:5230-5354` antes do `adapter.execute`, propaga via novo campo `runtimeLocale` no contexto do adapter. Plano 11-02 cria builder do directive. Plano 11-03 adiciona variantes de skill + loader que swap `SKILL.md` por `SKILL.{locale}.md` durante bundle preparation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | already in repo | Query `user.locale` JOIN via `wakeupRequest` | Existing pattern em `middleware/auth.ts:73-77` |
| node:fs/promises | builtin | Read `SKILL.{locale}.md` variants no loader | Mesmo pattern usado em `prompt-cache.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto.createHash | builtin | Estender bundleKey para incluir `locale` | Cache invalidation correto entre locales |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prompt section injection | Env var `PAPERCLIP_USER_LOCALE` lido pelo skill | Skill teria que ler env e injetar texto auto — complexidade no skill, e Claude/Codex/Cursor cada um lê env var diferente |
| Copiar diretório de skill com swap | Symlink + flag de locale lido pelo Claude CLI | CLI não tem feature nativa de variantes; precisaríamos PR upstream |
| Sempre injetar directive (en-US explícito) | Apenas pt-BR | Decisão Claude's Discretion — testar empiricamente em UAT-04 se en-US default produz resposta inglês limpa |

**Installation:** Sem novas dependencies. Tudo é I/O de filesystem + DB.

## Architecture Patterns

### Recommended Project Structure

```
server/src/services/
├── agent-instructions.ts                     # existente — adicionar locale-aware loading
├── agent-instructions-locale-directive.ts    # NOVO — buildLanguageDirectiveBlock(locale)
└── heartbeat.ts                              # existente — adicionar resolveOwnerLocale(run, db)

packages/adapter-utils/src/
└── server-utils.ts                           # existente — estender PaperclipSkillEntry com localeVariants

packages/adapters/claude-local/src/server/
└── prompt-cache.ts                           # existente — estender bundleKey + symlink → directory copy quando há variant

skills/paperclip/SKILL.md                     # existente, inglês
skills/paperclip/SKILL.pt-BR.md               # NOVO — tradução
skills/paperclip-create-agent/SKILL.pt-BR.md  # NOVO
skills/paperclip-create-plugin/SKILL.pt-BR.md # NOVO
skills/para-memory-files/SKILL.pt-BR.md       # NOVO
```

### Pattern 1: Locale Resolution Chain

**What:** Resolver `userLocale` para um heartbeat run.
**When:** Antes de `adapter.execute()` em `heartbeat.ts`.

```typescript
// Source: este pattern + middleware/auth.ts:73-77
async function resolveRunOwnerLocale(
  db: Database,
  run: { wakeupRequestId: string | null }
): Promise<"pt-BR" | "en-US"> {
  if (!run.wakeupRequestId) return "pt-BR"; // default
  const [row] = await db
    .select({ actorType: agentWakeupRequests.requestedByActorType, actorId: agentWakeupRequests.requestedByActorId })
    .from(agentWakeupRequests)
    .where(eq(agentWakeupRequests.id, run.wakeupRequestId));
  if (row?.actorType !== "user" || !row.actorId) return "pt-BR";
  const [userRow] = await db
    .select({ locale: authUsers.locale })
    .from(authUsers)
    .where(eq(authUsers.id, row.actorId));
  return (userRow?.locale as "pt-BR" | "en-US") ?? "pt-BR";
}
```

### Pattern 2: Language Directive Composition

```typescript
// Source: novo, criado em Plano 11-02
export function buildLanguageDirectiveBlock(locale: "pt-BR" | "en-US"): string {
  if (locale === "pt-BR") {
    return `\n\n## Idioma de Resposta\n\nResponda ao usuário em português brasileiro (pt-BR). Use linguagem natural, técnica quando apropriado. Mantenha termos técnicos em inglês quando idiomáticos (ex: "commit", "merge", "pull request").\n`;
  }
  return ""; // en-US é default do modelo; bloco vazio (Decisão: validar em UAT)
}
```

### Pattern 3: Skill Variant Loading

**Estratégia:** Modificar `prepareClaudePromptBundle` em `prompt-cache.ts:132-172` para receber `locale` e:
1. Estender `bundleKey` para incluir `locale`.
2. Em vez de `ensurePaperclipSkillSymlink` (symlink), quando `locale === "pt-BR"` e existe `SKILL.pt-BR.md` no source, **copiar o diretório** ao bundle e renomear `SKILL.pt-BR.md` → `SKILL.md` (overwriting english).
3. Quando locale=en-US ou variante ausente, manter symlink (comportamento atual).

```typescript
// Em prompt-cache.ts (modificado)
async function materializeSkillForLocale(source: string, target: string, locale: string) {
  const variantPath = path.join(source, `SKILL.${locale}.md`);
  const hasVariant = await fs.access(variantPath).then(() => true).catch(() => false);
  if (!hasVariant || locale === "en-US") {
    return ensurePaperclipSkillSymlink(source, target);
  }
  // copy + rename for pt-BR variant
  await copyDirRecursive(source, target);
  await fs.rename(path.join(target, `SKILL.${locale}.md`), path.join(target, "SKILL.md"));
}
```

### Anti-Patterns to Avoid

- **Env var per-adapter wiring:** cada adapter (codex/cursor/gemini/openclaw/opencode/pi) tem mecanismo de prompt diferente — passar locale via env var requer 7 patches; via prompt section requer 1.
- **Mutate skills source dir:** copiar SKILL.pt-BR.md para SKILL.md na origem corromperia repo. Toda mutação ocorre no bundle cache (`~/.paperclip/instances/.../claude-prompt-cache/{bundleKey}/`).
- **Sem invalidação de cache em locale change:** se usuário muda locale e bundleKey não inclui locale, agente recebe bundle stale. SOLUÇÃO: incluir `locale` no input de `buildClaudePromptBundleKey`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale resolution from session | Re-derivação client-side via tRef | DB JOIN server-side em heartbeat | Phase 10 já estabeleceu pattern; agentes spawn server-side, não têm contexto de cliente |
| Skill variant lookup | Filename glob runtime no Claude CLI | Pre-materialize variant antes de `--add-dir` | CLI não suporta; e cache key precisa refletir variante |
| Bundle invalidation | TTL ou polling | Content-addressed hash incluindo locale | `prompt-cache.ts:86-107` já é content-addressed; estender |
| Adapter-specific wiring | Patch em cada adapter execute.ts | Composer único em `agent-instructions.ts` ou contexto do adapter | 7 adapters, 1 composer; prompt-section approach é universal |

**Key insight:** A injeção do directive deve acontecer em UM lugar (composer central) e o resultado fluir naturalmente para o `instructionsContents` que cada adapter já lê. Skill variant precisa ser per-adapter porque cada adapter materializa skills diferente — mas só claude_local atualmente symlinks skills, então 11-03 foca em claude.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — locale já em `user` table (default `pt-BR`); sem caches DB de prompt content | Nenhuma migration de dados |
| Live service config | **claude-prompt-cache em disco** (`~/.paperclip/instances/.../claude-prompt-cache/{bundleKey}/`) — bundles com hash atual NÃO incluem locale; após upgrade usuários verão miss + recompute primeiro spawn (não-bloqueante) | Cache será naturalmente invalidado pelo bundleKey novo; documentar comportamento |
| OS-registered state | None — não há registry, no Task Scheduler, no launchd com refs a skills | Nenhuma |
| Secrets/env vars | None — nenhum env var atual carrega texto de prompt ou skill content | Nenhuma |
| Build artifacts | Skills `skills/*/` distribuídos via `package.json files: ["dist", "ui-dist", "skills"]` — `SKILL.pt-BR.md` deve estar incluído na publicação | Verificar que pattern `skills` em `files` cobre `*.md` (sim — copia recursivo); nenhuma mudança em `package.json` |

## Adapters Survey

| Adapter | System prompt mechanism | LOC | Notes |
|---------|-------------------------|-----|-------|
| **claude-local** | `--append-system-prompt-file <path>` (line 539) | 803 | One-shot — não usado em resume sessions; bundle cached por hash |
| **codex-local** | `instructionsPrefix` prepended to stdin prompt (line 522-525) | 806 | Lê `instructionsFilePath` do config, prepara como prefix |
| **cursor-local** | Same: prepend instructions to prompt (line 414-419) | 659 | Pattern idêntico ao codex |
| **gemini-local** | Same: prepend instructions to `--prompt` arg (line 360-365) | 587 | Mesmo pattern |
| **opencode-local** | Same: prepend to stdin prompt (linha ~358) | 545 | Mesmo pattern |
| **openclaw-gateway** | NO system prompt file mechanism — no `promptTemplate`, no `instructionsFilePath` | 1496 | Gateway/router-style adapter; usa REST API. **Fora desta fase para directive injection** |
| **pi-local** | `--append-system-prompt <inline-string>` (line 467-468) | 658 | Argumento string, não arquivo |

**Conclusão:** 6/7 adapters têm mecanismo de instruções → directive flowa naturalmente se for injetado no `instructionsContents` (claude) ou `promptTemplate`/`instructionsFilePath` content (outros). **openclaw-gateway é exceção** — fora desta fase. Skills variants só aplicam a claude_local (único que symlinks `skills/` directory para `--add-dir`); outros usam `promptTemplate` content puro.

**Decisão de escopo Plano 11-02:** Directive injection deve acontecer em **`agent-instructions.ts` getBundle/exportFiles**, antes do conteúdo chegar a qualquer adapter. Adapter-utils `joinPromptSections` (já usado por todos) preserva sections — directive pode ser uma section adicional. Mas o caminho mais limpo: **append directive ao `instructionsContents` retornado por `agentInstructionsService.exportFiles`** OU criar wrapper que cada adapter chama.

## Common Pitfalls

### Pitfall 1: Cache pollution sem locale no bundleKey
**What goes wrong:** User troca locale, próximo spawn reutiliza bundleKey antigo, skill em inglês ainda servida.
**Why it happens:** `buildClaudePromptBundleKey` em `prompt-cache.ts:86-107` hashing inputs não inclui locale.
**How to avoid:** Adicionar `hash.update("locale:" + locale + "\n")` em `buildClaudePromptBundleKey`. Plano 11-03.
**Warning signs:** Mesmo agente, mesma skill source, mas modelo responde em idioma diferente após troca → bundle não foi rehidratado.

### Pitfall 2: Resume session ignora directive (claude-local)
**What goes wrong:** `execute.ts:538` deliberadamente NÃO passa `--append-system-prompt-file` em resume sessions ("instructions are already in the session cache"). Se directive estiver apenas no prompt-file, resumo não tem o directive.
**Why it happens:** Otimização de token cost.
**How to avoid:** Para resume sessions, anexar directive ao **prompt content** (via `wakePrompt` ou `taskContextNote` — `execute.ts:498-509`) em vez de `instructionsContents`. Verificar empiricamente em UAT se modelo segue directive vinda do user message.
**Warning signs:** Primeiro heartbeat respeita pt-BR, sessions seguintes voltam a inglês.

### Pitfall 3: Timer-driven heartbeats sem owner
**What goes wrong:** Wake originado por timer/automation não tem `requestedByActorType="user"` — `resolveRunOwnerLocale` retorna fallback. Se fallback = `en-US` mas time tem só usuários `pt-BR`, agente fala inglês em ações automatizadas.
**Why it happens:** Não há "owner do agente" — apenas requester do wake atual.
**How to avoid:** Fallback `pt-BR` (default DB) é seguro para nossa equipe (todos pt-BR). Para v2 multi-locale, derivar locale "majoritário" da company ou último user requester.
**Warning signs:** Agente fala inglês em routines (cron-driven) mesmo com user pt-BR.

### Pitfall 4: SKILL.pt-BR.md não materialized para outros adapters
**What goes wrong:** Codex/Cursor/etc. não usam `--add-dir skills/`; eles renderizam `promptTemplate` content. Skill variant não chega ao modelo.
**Why it happens:** Skills mechanism é claude_local-specific.
**How to avoid:** Plano 11-03 fica explicito: skill variants beneficiam apenas claude_local. Outros adapters dependem do directive section do system prompt (Plano 11-02) para forçar pt-BR.
**Warning signs:** Codex agent ainda em inglês mesmo com skill pt-BR criada.

## Code Examples

### Resolving owner locale from heartbeat run
```typescript
// Source: novo (Plano 11-01) — resolveRunOwnerLocale
import { agentWakeupRequests } from "@paperclipai/db/schema/agent_wakeup_requests";
import { authUsers } from "@paperclipai/db/schema/auth";
import { eq } from "drizzle-orm";

async function resolveRunOwnerLocale(
  db: Database,
  wakeupRequestId: string | null
): Promise<"pt-BR" | "en-US"> {
  if (!wakeupRequestId) return "pt-BR";
  const rows = await db
    .select({
      locale: authUsers.locale,
      actorType: agentWakeupRequests.requestedByActorType,
    })
    .from(agentWakeupRequests)
    .leftJoin(authUsers, eq(authUsers.id, agentWakeupRequests.requestedByActorId))
    .where(eq(agentWakeupRequests.id, wakeupRequestId))
    .limit(1);
  const row = rows[0];
  if (row?.actorType !== "user") return "pt-BR";
  return (row.locale as "pt-BR" | "en-US") ?? "pt-BR";
}
```

### Bundle key with locale
```typescript
// Source: extensão de prompt-cache.ts:86-107 (Plano 11-03)
async function buildClaudePromptBundleKey(input: {
  skills: SkillEntry[];
  instructionsContents: string | null;
  locale: "pt-BR" | "en-US";    // NEW
}): Promise<string> {
  const hash = createHash("sha256");
  hash.update("paperclip-claude-prompt-bundle:v2\n");  // bump version
  hash.update(`locale:${input.locale}\n`);              // NEW
  // ...resto inalterado
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Skills sempre em inglês | SKILL.{locale}.md variants | Phase 11 | claude_local agents respondem em pt-BR |
| System prompt sem language directive | Bloco condicional "## Idioma de Resposta" | Phase 11 | Funciona em 6/7 adapters |
| Bundle hash sem locale | bundleKey inclui locale | Phase 11 | Cache invalidação correta |

**Deprecated/outdated:** N/A — fase aditiva, sem deprecation.

## Open Questions

1. **Directive em resume sessions claude-local**
   - What we know: `execute.ts:538` skip `--append-system-prompt-file` em resume; directive não chega via prompt-file.
   - What's unclear: Se anexar directive no `wakePrompt`/`taskContextNote` (`execute.ts:498-509`) é suficiente para o modelo respeitar idioma.
   - Recommendation: HUMAN-UAT (AGENT-SKILL-04) cobre cenário "primeiro heartbeat" + "heartbeat após resume" — se resume falhar, Plano 11-02 acrescenta directive no prompt body como fallback.

2. **Bloco vazio para en-US ou explícito?**
   - What we know: Modelos Claude/GPT têm default inglês; bloco vazio assume default funciona.
   - What's unclear: Se algum modelo (Codex/Gemini) tende a "drift" para outros idiomas sem directive explícito.
   - Recommendation: Iniciar com bloco vazio para en-US; se UAT mostrar drift, adicionar bloco explícito.

3. **Timer-driven wakes — fallback locale**
   - What we know: Sem owner direto; default `pt-BR` (DB default).
   - What's unclear: Se equipe terá usuários en-US no futuro próximo (multi-tenant?).
   - Recommendation: Manter `pt-BR` fallback — único cenário misto seria company export/import (raro). Ticket v2 derivar locale "majoritário" da company.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Better Auth `user.locale` column | Resolução server-side | ✓ | applied via Phase 7 | — |
| `agent_wakeup_requests.requestedByActorId` | User identification | ✓ | already populated | Default `pt-BR` for non-user wakes |
| Claude Code CLI | claude_local skill bundle | ✓ (assumed dev env) | n/a | Other adapters (codex/cursor/etc.) sem skill mechanism |
| node:fs/promises | Skill file copy/rename | ✓ | builtin | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — all paths covered.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (server + adapters) |
| Config file | `server/vitest.config.ts`, `packages/adapters/claude-local/vitest.config.ts` |
| Quick run command | `pnpm --filter @paperclipai/server test` |
| Full suite command | `pnpm test` (root) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGENT-SKILL-01 | `buildLanguageDirectiveBlock("pt-BR")` retorna bloco com "português brasileiro"; `("en-US")` retorna `""` | unit | `pnpm --filter @paperclipai/server test agent-instructions-locale-directive` | ❌ Wave 0 |
| AGENT-SKILL-01 | `agent-instructions.exportFiles` anexa directive quando locale=pt-BR; não anexa quando locale=en-US | integration | `pnpm --filter @paperclipai/server test agent-instructions-service` | ✅ existing — extend |
| AGENT-SKILL-03 | `resolveRunOwnerLocale(db, runWithUserWakeup)` retorna locale do user; `(db, runWithoutWakeup)` retorna `"pt-BR"`; `(db, systemWakeup)` retorna `"pt-BR"` | unit | `pnpm --filter @paperclipai/server test heartbeat-locale` | ❌ Wave 0 |
| AGENT-SKILL-03 | Heartbeat propaga locale para `prepareClaudePromptBundle.locale` argument | integration | `pnpm --filter @paperclipai/server test claude-local-execute` | ✅ existing — extend (test 6 use locale env override) |
| AGENT-SKILL-02 | `prepareClaudePromptBundle({locale:"pt-BR", skills:[paperclip]})` materializa `SKILL.pt-BR.md` como `SKILL.md` no bundle dir | integration | `pnpm --filter @paperclipai/adapter-claude-local test prompt-cache` | ❌ Wave 0 |
| AGENT-SKILL-02 | `bundleKey` difere entre locale=pt-BR e locale=en-US para mesmas skills | unit | mesma suíte acima | ❌ Wave 0 |
| AGENT-SKILL-04 | HUMAN-UAT: troca de idioma → wake on-demand → agente Claude responde em pt-BR no chat/transcript | manual | n/a | ❌ Wave 0 — `11-HUMAN-UAT.md` artifact |

### Sampling Rate
- **Per task commit:** `pnpm --filter @paperclipai/server test agent-instructions-locale-directive heartbeat-locale agent-instructions-service`
- **Per wave merge:** `pnpm --filter @paperclipai/server test && pnpm --filter @paperclipai/adapter-claude-local test`
- **Phase gate:** Full suite green + HUMAN-UAT 11-01 PASS antes de `/verificar-trabalho`

### Wave 0 Gaps

- [ ] `server/src/__tests__/agent-instructions-locale-directive.test.ts` — covers AGENT-SKILL-01 unit
- [ ] `server/src/__tests__/heartbeat-locale.test.ts` — covers AGENT-SKILL-03 unit (resolveRunOwnerLocale)
- [ ] `packages/adapters/claude-local/src/server/__tests__/prompt-cache-locale.test.ts` — covers AGENT-SKILL-02 (bundle key + variant materialization)
- [ ] `.planning/phases/11-skills-system-prompts/11-HUMAN-UAT.md` — covers AGENT-SKILL-04
- [ ] Extend `agent-instructions-service.test.ts` — locale-conditional directive integration

## Sources

### Primary (HIGH confidence)
- `server/src/services/agent-instructions.ts:1-735` — composition flow, exportFiles entry point at 656-683
- `server/src/services/heartbeat.ts:5230-5377` — adapter.execute call site; runtimeConfig + augmentedConfig assembly
- `packages/adapters/claude-local/src/server/execute.ts:380-580` — `--append-system-prompt-file` mechanism, resume session skip at 538
- `packages/adapters/claude-local/src/server/prompt-cache.ts:86-172` — bundle key + symlink + materialization
- `packages/adapter-utils/src/server-utils.ts:1043-1061` — `readPaperclipRuntimeSkillEntries` — skill discovery
- `packages/db/src/schema/auth.ts:9` — `user.locale` column (default `pt-BR`)
- `packages/db/src/schema/agent_wakeup_requests.ts:17-18` — `requestedByActorType` + `requestedByActorId`
- `packages/db/src/schema/agents.ts:14-45` — confirmed: NO `ownerUserId` column on agents
- `server/src/middleware/auth.ts:53-90` — existing pattern of resolving `user.locale` via `authUsers` JOIN

### Secondary (MEDIUM confidence)
- `server/src/__tests__/claude-local-execute.test.ts:1-80` — fake claude command captures `--append-system-prompt-file` argv (test pattern reusable)
- `server/src/__tests__/agent-instructions-service.test.ts:1-80` — existing test harness for service (extend, don't replace)
- Phase 10 RESEARCH.md — established server-side `tRef` pattern (precedent for not-translating server-side, but emitting structured refs)

### Tertiary (LOW confidence)
- N/A — todas as descobertas verificadas em código.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todas as libraries em uso, sem novas
- Architecture: HIGH — patterns observados em código + decisão CONTEXT.md
- Pitfalls: MEDIUM — pitfall #2 (resume session sem directive) requer empirical UAT confirm
- Adapter survey: HIGH — verificado linha-a-linha cada execute.ts

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (30 dias — stack estável)
