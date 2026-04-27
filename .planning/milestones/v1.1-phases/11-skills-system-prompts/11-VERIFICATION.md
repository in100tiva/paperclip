---
phase: 11-skills-system-prompts
verified: 2026-04-27T00:11:00Z
status: human_needed
score: 4/4 must-haves verified at code-level (AGENT-SKILL-04 awaits HUMAN-UAT)
re_verification:
  is_re_verification: false
human_verification:
  - test: "UAT-11-01 — Agente responde em pt-BR após troca de idioma"
    expected: "Output do agente em português brasileiro após Settings → Idioma → pt-BR + wake on-demand"
    why_human: "Comportamento empírico de modelo LLM em browser real — não testável programaticamente"
  - test: "UAT-11-02 — Reverse-check: en-US devolve agente para inglês sem cache pollution"
    expected: "Output em inglês após troca para en-US; bundleKey no claude-prompt-cache difere do anterior (cache invalidação efetiva)"
    why_human: "Validação visual + comportamental de Pitfall 1 mitigation em runtime real"
  - test: "UAT-11-03 — Skill variant pt-BR é referenciada em chat com agente Claude"
    expected: "Termos do skill pt-BR ('procedimento de heartbeat', 'Endpoints Principais') aparecem na resposta; bundle dir contém SKILL.md em pt-BR (não symlink)"
    why_human: "Verificação empírica de que LLM lê o skill traduzido vs. inglês"
---

# Phase 11: Skills + System Prompts Verification Report

**Phase Goal:** Make agents respond in pt-BR when user.locale=pt-BR via system prompt directive injection + skill variants. Final phase of milestone v1.1.

**Verified:** 2026-04-27T00:11:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                          | Status      | Evidence                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Heartbeat resolve user.locale a partir de agent_wakeup_requests → authUsers leftJoin                           | ✓ VERIFIED  | `heartbeat-locale.ts:37-56` — leftJoin pattern correto; `heartbeat.ts:5360` chama `resolveRunOwnerLocale`; 5/5 unit tests GREEN                |
| 2   | Heartbeat sem wakeupRequestId cai em fallback pt-BR sem erro                                                   | ✓ VERIFIED  | `heartbeat-locale.ts:41` short-circuit; teste "null wakeupRequestId" GREEN                                                                     |
| 3   | runtimeLocale propagado via context.runtimeLocale antes de adapter.execute                                     | ✓ VERIFIED  | `heartbeat.ts:5364` `context.runtimeLocale = runtimeLocale`; consumido por `execute.ts:427-433`                                                |
| 4   | buildLanguageDirectiveBlock('pt-BR') emite bloco com "português brasileiro" + "## Idioma de Resposta"          | ✓ VERIFIED  | `agent-instructions-locale-directive.ts:19-29` contém literal exato; 4/4 unit tests GREEN                                                      |
| 5   | buildLanguageDirectiveBlock('en-US') retorna string vazia                                                      | ✓ VERIFIED  | `agent-instructions-locale-directive.ts:20` `if (locale !== "pt-BR") return ""`                                                                |
| 6   | agent-instructions.exportFiles({ locale: 'pt-BR' }) anexa directive ao entry file                              | ✓ VERIFIED  | `agent-instructions.ts:670` chama `buildLanguageDirectiveBlock`; 11/11 service tests GREEN incluindo 3 novos                                   |
| 7   | buildClaudePromptBundleKey hash inclui locale; bundles diferem entre pt-BR e en-US                             | ✓ VERIFIED  | `prompt-cache.ts:104-105` v2 prefix + `locale:${input.locale}`; 3/3 prompt-cache-locale tests GREEN                                            |
| 8   | Resume sessions claude-local: directive anexado ao prompt body via joinPromptSections                          | ✓ VERIFIED  | `execute.ts:537,544` `resumeLanguageDirective = sessionId ? buildLanguageDirectiveBlockForResume(...) : ""`                                    |
| 9   | 4 SKILL.pt-BR.md existem para skills paperclip                                                                 | ✓ VERIFIED  | 4 arquivos presentes em `skills/<name>/SKILL.pt-BR.md` (347/162/101/104 linhas; frontmatter byte-identical)                                    |
| 10  | prepareClaudePromptBundle materializa SKILL.pt-BR.md como SKILL.md no bundle quando locale=pt-BR e variante existe | ✓ VERIFIED  | `prompt-cache.ts:183-205` `materializeSkillForLocale`; 4/4 skill-variants tests GREEN incluindo "does not mutate source dir"                |
| 11  | Skills sem SKILL.pt-BR.md cain em fallback symlink sem erro                                                    | ✓ VERIFIED  | `prompt-cache.ts:188,196-198` fallback paths; teste "falls back to symlink when locale=pt-BR but variant absent" GREEN                         |
| 12  | 11-HUMAN-UAT.md existe com 3 procedimentos cobrindo AGENT-SKILL-04                                             | ✓ VERIFIED  | `11-HUMAN-UAT.md` 213 linhas; UAT-11-01..03 presentes; frontmatter `status: pending`                                                           |
| 13  | Modelo Claude responde em pt-BR após troca de idioma (empírico)                                                | ? UNCERTAIN | Requer HUMAN-UAT em browser real; código satisfaz pré-condições em todos os níveis                                                             |

**Score:** 12/12 truths VERIFIED at code-level; 1 truth UNCERTAIN (AGENT-SKILL-04 empirical UAT) — routed for human verification.

### Required Artifacts

| Artifact                                                                                  | Expected                                                                              | Status     | Details                                                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| `server/src/services/heartbeat-locale.ts`                                                 | resolveRunOwnerLocale + RuntimeLocale (≥30 lines)                                     | ✓ VERIFIED | 56 lines; exports `RuntimeLocale` + `resolveRunOwnerLocale`                        |
| `server/src/services/__tests__/heartbeat-locale.test.ts`                                  | 4+ scenarios: null, system actor, user pt-BR, user en-US                              | ✓ VERIFIED | 5 tests GREEN (added "null locale via JOIN miss" 5th case)                         |
| `server/src/services/heartbeat.ts`                                                        | Calls resolveRunOwnerLocale before adapter.execute                                    | ✓ VERIFIED | Line 5360 call; line 5364 `context.runtimeLocale = runtimeLocale`                  |
| `server/src/services/agent-instructions-locale-directive.ts`                              | buildLanguageDirectiveBlock pure function (≥25 lines)                                 | ✓ VERIFIED | 29 lines; exports `buildLanguageDirectiveBlock`                                    |
| `server/src/services/__tests__/agent-instructions-locale-directive.test.ts`               | 4 cases: pt-BR content, en-US empty, idempotent, leading/trailing newlines            | ✓ VERIFIED | 4 tests GREEN                                                                      |
| `server/src/services/agent-instructions.ts`                                               | exportFiles accepts options.locale; appends directive when pt-BR                      | ✓ VERIFIED | Imports buildLanguageDirectiveBlock; line 670 invocation                           |
| `packages/adapters/claude-local/src/server/prompt-cache.ts`                               | bundleKey v2 + locale; materializeSkillForLocale + copyDirRecursive                   | ✓ VERIFIED | 259 lines; v2 prefix line 104; materializer lines 183-205                          |
| `server/src/__tests__/claude-local-prompt-cache-locale.test.ts`                           | bundleKey differs between locales                                                     | ✓ VERIFIED | 3 tests GREEN (placement under server/__tests__ per established convention)        |
| `server/src/__tests__/claude-local-prompt-cache-skill-variants.test.ts`                   | materialization + symlink fallback                                                    | ✓ VERIFIED | 4 tests GREEN                                                                      |
| `packages/adapters/claude-local/src/server/execute.ts`                                    | Reads context.runtimeLocale; resume directive fallback                                | ✓ VERIFIED | Lines 427-433 read locale; lines 118, 537, 544 inline directive + joinPromptSections |
| `skills/paperclip/SKILL.pt-BR.md`                                                         | ≥300 lines pt-BR translation; frontmatter byte-identical                              | ✓ VERIFIED | 346 lines; frontmatter `name: paperclip` + English description preserved           |
| `skills/paperclip-create-agent/SKILL.pt-BR.md`                                            | ≥130 lines                                                                            | ✓ VERIFIED | 162 lines                                                                          |
| `skills/paperclip-create-plugin/SKILL.pt-BR.md`                                           | ≥80 lines                                                                             | ✓ VERIFIED | 101 lines                                                                          |
| `skills/para-memory-files/SKILL.pt-BR.md`                                                 | ≥80 lines                                                                             | ✓ VERIFIED | 104 lines                                                                          |
| `.planning/phases/11-skills-system-prompts/11-HUMAN-UAT.md`                               | 3 UATs + frontmatter status: pending                                                  | ✓ VERIFIED | 213 lines; UAT-11-01..03; frontmatter status pending                               |

### Key Link Verification

| From                                  | To                                                          | Via                                              | Status   | Details                                                                      |
| ------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ | -------- | ---------------------------------------------------------------------------- |
| `heartbeat.ts`                        | `heartbeat-locale.ts`                                       | `import { resolveRunOwnerLocale }`               | ✓ WIRED  | Line 37 import; line 5360 call before adapter.execute                        |
| `heartbeat-locale.ts`                 | `agent_wakeup_requests + authUsers`                         | Drizzle leftJoin                                 | ✓ WIRED  | Lines 48-49 leftJoin via `eq(authUsers.id, agentWakeupRequests.requestedByActorId)` |
| `agent-instructions.ts`               | `agent-instructions-locale-directive.ts`                    | `buildLanguageDirectiveBlock(options.locale)`    | ✓ WIRED  | Line 5 import; line 670 conditional concat                                   |
| `prompt-cache.ts`                     | bundleKey hash                                              | `hash.update(locale:${input.locale}\n)`          | ✓ WIRED  | Line 105; bundle prefix bumped v1→v2 line 104                                |
| `execute.ts`                          | wakePrompt/taskContextNote (resume fallback)                | `resumeLanguageDirective` last in joinPromptSections | ✓ WIRED  | Line 537 conditional on sessionId; line 544 emitted via joinPromptSections   |
| `prompt-cache.ts` materializer        | `skills/<name>/SKILL.{locale}.md → bundle dir SKILL.md`     | copy+rename when pt-BR variant exists, else symlink | ✓ WIRED  | `materializeSkillForLocale` lines 183-205; called from `prepareClaudePromptBundle` line 228 |

### Data-Flow Trace (Level 4)

| Artifact                       | Data Variable        | Source                                                    | Produces Real Data | Status     |
| ------------------------------ | -------------------- | --------------------------------------------------------- | ------------------ | ---------- |
| `heartbeat.ts:5360`            | `runtimeLocale`      | `resolveRunOwnerLocale(db, run.wakeupRequestId)` — DB query | ✓ Yes              | ✓ FLOWING  |
| `agent-instructions.ts:670`    | `directive`          | `buildLanguageDirectiveBlock(options.locale)` — pure fn   | ✓ Yes (pt-BR text or "") | ✓ FLOWING |
| `prompt-cache.ts:228`          | bundle dir contents  | `materializeSkillForLocale` writes via copyDirRecursive + rename | ✓ Yes (real files) | ✓ FLOWING |
| `execute.ts:544`               | `resumeLanguageDirective` in prompt | `buildLanguageDirectiveBlockForResume(runtimeLocale)` reading from `context.runtimeLocale` | ✓ Yes              | ✓ FLOWING  |

### Behavioral Spot-Checks

| Behavior                                                              | Command                                                                                                  | Result                          | Status |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------- | ------ |
| heartbeat-locale + agent-instructions-locale-directive suite GREEN    | `pnpm --filter @paperclipai/server exec vitest run heartbeat-locale agent-instructions-locale-directive` | 9 tests passed (2 files)        | ✓ PASS |
| claude-local prompt-cache (locale + skill-variants) GREEN             | `pnpm --filter @paperclipai/server exec vitest run claude-local-prompt-cache`                            | 7 tests passed (2 files)        | ✓ PASS |
| agent-instructions-service GREEN (3 new locale cases + 8 existing)    | `pnpm --filter @paperclipai/server exec vitest run agent-instructions-service`                           | 11 tests passed                 | ✓ PASS |
| All 4 SKILL.pt-BR.md files exist with correct frontmatter `name:`      | `head -5` of each file                                                                                   | All 4 start with `---\nname: <skill>\ndescription: >` | ✓ PASS |

**Total automated tests passing for phase 11 code:** 27/27 GREEN.

### Requirements Coverage

| Requirement     | Source Plan        | Description                                                                                              | Status            | Evidence                                                                                              |
| --------------- | ------------------ | -------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| AGENT-SKILL-01  | 11-02              | System prompts incluem instrução condicional de idioma                                                   | ✓ SATISFIED       | `buildLanguageDirectiveBlock` + `agent-instructions.exportFiles` integration; 4+11 tests GREEN        |
| AGENT-SKILL-02  | 11-03              | Skills/templates traduzidos para pt-BR                                                                   | ✓ SATISFIED       | 4 SKILL.pt-BR.md (713 lines total) + materializeSkillForLocale; 4 tests GREEN                         |
| AGENT-SKILL-03  | 11-01              | Locale propaga user → agent context → spawn (não acoplado a UI cliente)                                  | ✓ SATISFIED       | `resolveRunOwnerLocale` + `context.runtimeLocale` injection in heartbeat.ts:5360; 5 tests GREEN       |
| AGENT-SKILL-04  | 11-03 (HUMAN-UAT)  | Comportamento empiricamente validado — agente realmente responde em pt-BR                                | ? NEEDS HUMAN     | 11-HUMAN-UAT.md persisted with UAT-11-01..03 status pending; routed for browser-real validation       |

**Note on REQUIREMENTS.md state:** REQUIREMENTS.md já marca AGENT-SKILL-04 como `[x] Complete`, mas `11-HUMAN-UAT.md` frontmatter ainda está `status: pending`. Esta é uma incoerência de estado — código nível satisfaz pré-condições, mas UAT empírico não foi executado pelo operador. Recomenda-se manter este status `human_needed` até que o operador rode UAT-11-01..03 e atualize ambos os artefatos coerentemente (HUMAN-UAT.md frontmatter `status: passed` + sign-off section).

### Anti-Patterns Found

Nenhum bloqueador identificado. Verificações realizadas:

- **Stubs/placeholders em código novo:** Nenhum. `resolveRunOwnerLocale`, `buildLanguageDirectiveBlock`, `materializeSkillForLocale`, `copyDirRecursive` todos têm implementações substantivas com paths reais de DB/filesystem/string composition.
- **TODO/FIXME em arquivos modificados:** Nenhum encontrado em arquivos novos ou nas regiões editadas dos arquivos existentes.
- **Empty returns:** `buildLanguageDirectiveBlock("en-US")` retorna `""` deliberadamente — não é stub, é decisão de design documentada (en-US é default do modelo, não vale gastar tokens).
- **Hard-coded empty data:** Nenhum. SKILL.pt-BR.md files contêm 713 linhas totais de conteúdo traduzido real.
- **Anti-pattern "mutate source dir":** Evitado por design — `materializeSkillForLocale` opera sempre no `target` (bundle dir), nunca toca `source` (skills/<name>/). Teste "does not mutate source directory" GREEN confirma.

**Pre-existing baselines (out-of-scope, documentados em SUMMARYs):**
- `server/src/services/recovery/service.ts:459` TS2339 — pre-existente desde Phase 7-04, confirmado em master.
- `claude-local-execute.test.ts` 11/14 fail with Windows shebang spawn errors — pre-existente desde Phase 06-03 deferred-items, reproduzível em master sem mudanças deste phase.

### Human Verification Required

3 itens de UAT em browser real para AGENT-SKILL-04 (todos documentados em `.planning/phases/11-skills-system-prompts/11-HUMAN-UAT.md`):

#### 1. UAT-11-01 — Agente responde em pt-BR após troca de idioma

**Test:** Login como user → Settings → Idioma → "Português (Brasil)" → criar/abrir agente Claude → wake on-demand com "Resuma o estado atual da sua inbox." → ler transcript do run.
**Expected:** Output do agente em português brasileiro; mensagens de status em pt-BR; termos técnicos idiomáticos (commit/merge/checkout) podem permanecer em inglês.
**Why human:** Comportamento empírico de modelo LLM — não testável programaticamente sem rodar agente real contra Claude API.

#### 2. UAT-11-02 — Reverse-check: en-US devolve agente para inglês sem cache pollution

**Test:** Continuar do UAT-11-01 → Settings → Idioma → "English (US)" → wake on-demand com "Summarize the current state of your inbox." → ler transcript + verificar `~/.paperclip/instances/.../claude-prompt-cache/` agora tem 2 bundleKey dirs distintos.
**Expected:** Output em inglês; bundle dir distinto do anterior (cache invalidação efetiva por causa de `bundleKey:v2 + locale:${input.locale}` no hash).
**Why human:** Validação de Pitfall 1 mitigation requer execução real do heartbeat + inspeção visual do filesystem cache.

#### 3. UAT-11-03 — Skill variant pt-BR é referenciada em chat com agente Claude

**Test:** User em pt-BR → wake on-demand com "Explique brevemente o procedimento de heartbeat seguido pelo paperclip." → ler resposta + (opcional) `cat .../claude-prompt-cache/{bundleKey}/.claude/skills/paperclip/SKILL.md | head -30` espera-se conteúdo pt-BR.
**Expected:** Resposta cita "procedimento de heartbeat", "Endpoints Principais", "Estilo de Comentário" (não "heartbeat procedure", "Hot Routes", "Comment Style"); bundle dir contém `SKILL.md` em pt-BR (não symlink).
**Why human:** Verificação de que LLM efetivamente lê o skill traduzido vs. inglês requer execução real do agente.

### Gaps Summary

**Nenhuma lacuna de código.** Todos os 12 truths code-level estão VERIFIED. Todos os 15 artefatos esperados existem com tamanho ≥ mínimo e conteúdo substantivo. Todos os 6 key links estão WIRED. Os 4 níveis de fluxo de dados rastreáveis programaticamente (heartbeat → context.runtimeLocale → exportFiles directive concat → bundleKey hash → materializer → execute resume fallback) confirmados FLOWING.

**Bloqueador para `passed`:** AGENT-SKILL-04 é por definição um requisito empírico que exige HUMAN-UAT em browser real. O código está pronto e os artefatos para UAT estão persistidos (`11-HUMAN-UAT.md`), mas a validação visual ainda não foi executada.

**Decisão de status:** `human_needed` (não `gaps_found`) — code-level está completo; aguarda apenas execução do UAT pelo operador. Quando UAT-11-01..03 forem executados e passarem:
1. Operador atualiza `11-HUMAN-UAT.md` frontmatter para `status: passed` + adiciona seção `## Sign-off`.
2. Status fica coerente com REQUIREMENTS.md (que já marca AGENT-SKILL-04 `[x]`).

Se algum UAT falhar, aí sim cria-se gap-closure plan via `/planejar-fase 11 --gaps` direcionado ao UAT específico que falhou.

---

_Verified: 2026-04-27T00:11:00Z_
_Verifier: Claude (verifier)_
