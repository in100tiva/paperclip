---
phase: 11-skills-system-prompts
type: human-uat
status: pending
requirements: [AGENT-SKILL-04]
created: 2026-04-27
---

# Phase 11 — Human UAT (Skills + System Prompts dos Agentes)

> Validação empírica de AGENT-SKILL-04: agentes Claude respondem em pt-BR
> quando `user.locale=pt-BR`; respondem em inglês quando `user.locale=en-US`;
> cache invalida corretamente entre trocas (Pitfall 1 mitigado por bundleKey
> v2 incluindo locale — Plan 11-02); skill variant pt-BR é referenciada em
> chat (Plan 11-03 materializeSkillForLocale).

3 UATs cobrem AGENT-SKILL-04 (e validam ponta-a-ponta o trabalho code-level
de AGENT-SKILL-01/02/03). Verificação code-level já completa via vitest
suites (heartbeat-locale + agent-instructions-locale-directive +
prompt-cache-locale + prompt-cache-skill-variants). UATs validam a
superfície perceptual em browser real.

## Pré-condições

- Phase 11 plans 11-01 + 11-02 + 11-03 mergeados em master.
- Pelo menos um Claude account ativo no instance.
- User operador com permissão para alterar próprio locale e disparar wake
  on-demand de agentes.
- Browser real (UAT humana, não automação).
- Bundle cache atual será invalidado naturalmente no primeiro spawn pós-deploy
  (hash v2 inclui locale).

---

## UAT-11-01 — Agente responde em pt-BR após troca de idioma (AGENT-SKILL-01 + 02 + 03 end-to-end)

**Objetivo:** Confirmar que o language directive (Plan 11-02) + skill variant
(Plan 11-03) + locale propagation (Plan 11-01) chegam ao modelo e produzem
output em português brasileiro.

**Pré-condições específicas:**
- Login como user com locale qualquer (default da conta atual).

**Steps:**

1. Login → Settings → Idioma → trocar para "Português (Brasil)".
2. Confirmar UI agora em pt-BR (sanity check — Phases 7-10 já validadas).
3. Navegar até um agente Claude existente (ou criar um novo via "Novo agente"
   com adapter `claude_local`).
4. Disparar um wake on-demand com mensagem simples:
   - "Resuma o estado atual da sua inbox."
5. Aguardar primeiro heartbeat completar (ver run em `/agents/{ref}/runs`).
6. Abrir transcript do run e ler a saída textual do agente.

**Pass criteria:**
- Output do agente está em português brasileiro (não inglês cru).
- Mensagens de status ao usuário ("estou verificando…", "encontrei X tarefas…",
  "vou começar pela mais prioritária") em pt-BR.
- Termos técnicos idiomáticos podem permanecer em inglês — esperado e
  documentado no directive: `commit`, `merge`, `pull request`, `checkout`,
  `heartbeat`, `subtask`, `blocker`.
- Run completa sem erro de execução (não bloqueante para AGENT-SKILL-04
  mas sinaliza que o bundle materializou corretamente).

**Failure paths:**
- Output cru em inglês após troca para pt-BR → directive não chegou ao
  modelo; investigar se `agent-instructions.md` no bundle dir contém o
  bloco "## Idioma de Resposta" (`cat ~/.paperclip/instances/.../claude-prompt-cache/{bundleKey}/agent-instructions.md | tail -10`).
- Mistura aleatória sem padrão (drift entre idiomas no mesmo run) →
  modelo está vendo dois directives conflitantes; verificar se algum
  resume-fallback (Plan 11-02 prompt body fallback) está conflitando com
  o directive do system prompt.

---

## UAT-11-02 — Reverse-check: en-US devolve agente para inglês sem cache pollution (Pitfall 1)

**Objetivo:** Confirmar Pitfall 1 mitigado — bundleKey inclui locale (Plan
11-02), então troca de idioma força recompute do bundle e o agente NÃO fica
preso em pt-BR após o user voltar para en-US.

**Pré-condições específicas:**
- UAT-11-01 satisfeito (user operador agora em pt-BR).

**Steps:**

1. Continuando do UAT-11-01 com user em pt-BR.
2. (Opcional) Anotar `bundleKey` atual:
   - `ls ~/.paperclip/instances/<instance-id>/companies/<company-id>/claude-prompt-cache/`
   - Esperar 1 diretório `bundleKey` que foi criado/usado em UAT-11-01.
3. Settings → Idioma → trocar para "English (US)".
4. Confirmar UI agora em inglês.
5. Disparar novo wake on-demand no mesmo agente Claude:
   - "Summarize the current state of your inbox."
6. Aguardar heartbeat completar e abrir transcript.
7. (Opcional) Verificar bundle cache:
   - `ls ~/.paperclip/instances/<instance-id>/companies/<company-id>/claude-prompt-cache/`
   - Esperar 2 diretórios `bundleKey` agora (um pt-BR + um en-US).

**Pass criteria:**
- Output em inglês (não pt-BR cru).
- Bundle cache contém um diretório bundleKey diferente do anterior (cache
  recomputado por causa do locale incluso no hash v2).
- Sem warnings/errors de "stale bundle" no log do servidor.

**Failure paths:**
- Agente continua respondendo em pt-BR após troca para en-US → bundle stale
  servido; confirmar via `cat .../claude-prompt-cache/{bundleKey}/agent-instructions.md`
  que o bloco pt-BR está presente. Se sim, hash não está incluindo locale —
  verificar `prompt-cache.ts:104-105` (Plan 11-02 deveria ter bumped v1→v2 com
  `hash.update(\`locale:${input.locale}\\n\`)`).
- Bundle key idêntico antes e depois da troca → buildClaudePromptBundleKey
  não recebeu locale; verificar callsite em `execute.ts` (Plan 11-02 deveria
  passar `context.runtimeLocale`).

---

## UAT-11-03 — Skill variant pt-BR é referenciada em chat com agente Claude (AGENT-SKILL-02)

**Objetivo:** Confirmar que o modelo Claude lê o skill traduzido (`SKILL.pt-BR.md`)
materializado pelo Plan 11-03, em vez do `SKILL.md` em inglês quando user.locale=pt-BR.
Específico para claude_local — outros adapters (codex/cursor/etc.) dependem
apenas do directive (Plan 11-02), não da skill variant.

**Pré-condições específicas:**
- User operador em pt-BR (refazer UAT-11-01 step 1 se vier de UAT-11-02).
- Agente Claude (adapter `claude_local`) com skill `paperclip` ativada.

**Steps:**

1. User em pt-BR (Settings → Idioma → "Português (Brasil)").
2. Disparar wake on-demand com mensagem que provoca o agente a citar
   literais do skill paperclip:
   - "Explique brevemente o procedimento de heartbeat seguido pelo paperclip."
3. Aguardar heartbeat completar.
4. Ler resposta do agente no transcript.
5. (Opcional) Verificar materialização da skill no bundle:
   - `cat ~/.paperclip/instances/<instance-id>/.../claude-prompt-cache/{bundleKey}/.claude/skills/paperclip/SKILL.md | head -30`
   - Esperar conteúdo em português ("# Skill Paperclip", "## Autenticação",
     "## O Procedimento de Heartbeat").

**Pass criteria:**
- Termos do skill aparecem em pt-BR refletindo a variante traduzida:
  - "procedimento de heartbeat" (não "heartbeat procedure")
  - "checkout" (preservado, idiomático)
  - "atualização de status" (não "status update")
  - "comentários" (não "comments")
- Resposta cita seções do skill em pt-BR — ex: "Procedimento de Heartbeat",
  "Estilo de Comentário", "Endpoints Principais" (e não "The Heartbeat
  Procedure", "Comment Style", "Hot Routes").
- Bundle dir contém `SKILL.md` com conteúdo pt-BR (não fallback simbólico).

**Failure paths:**
- Resposta usa terminologia exclusivamente em inglês mesmo com user pt-BR
  → variante não materializada; verificar
  `~/.paperclip/instances/.../claude-prompt-cache/{bundleKey}/.claude/skills/paperclip/`
  — esperado diretório real (não symlink) com `SKILL.md` em português. Se
  é symlink → `materializeSkillForLocale` caiu no fallback path (locale=en-US
  ou variante não detectada); investigar `prompt-cache.ts:185+` e o valor
  efetivo de `locale` passado.
- Bundle dir não existe → bundle cache não foi criado; provavelmente erro
  upstream em `prepareClaudePromptBundle`; ver server logs por
  "[paperclip] Failed to materialize Claude skill".
- Skill aparece em inglês no bundle mesmo sendo pt-BR locale → arquivo
  `SKILL.pt-BR.md` ausente no source dir do skill; verificar
  `ls skills/paperclip/SKILL*.md` no repo (esperado 2 arquivos:
  `SKILL.md` + `SKILL.pt-BR.md`).

---

## Resultado e Sign-off

**Status:** pending

Quando o operador executar os 3 UATs e todos passarem:

1. Atualizar frontmatter deste arquivo: `status: passed`.
2. Adicionar seção `## Sign-off` abaixo com:
   - Data ISO da validação (`YYYY-MM-DD`).
   - Nome do operador (ou identificador interno).
   - Nota breve do que foi observado (modelo testado, qualquer drift,
     adequação do directive).
3. Marcar AGENT-SKILL-04 como Complete em REQUIREMENTS.md:
   - `node "./.claude/framework/bin/tools.cjs" requirements mark-complete AGENT-SKILL-04`

Se algum UAT falhar:

- Anotar o cenário exato (`UAT-11-XX step Y`) e o comportamento observado.
- Criar plano de fechamento de lacunas via
  `/planejar-fase 11 --gaps` apontando para o UAT que falhou.
- Manter `status: pending` até o gap ser fechado.

---

## Routing notes

- Para fechamento `complete-with-pending-UAT`, as 3 UATs ficam pending até
  que operador valide visualmente em browser real (precedente Phases 3-10).
- AGENT-SKILL-01/02/03 já estão code-level completos (Plans 11-01..03 +
  vitest suites GREEN); este UAT valida que o efeito ponta-a-ponta funciona
  como esperado.
- UATs idealmente rodam em sequência (UAT-11-01 → UAT-11-02 → UAT-11-03)
  durante uma única sessão de validação (~20-30min total).
- Pitfall 2 (resume session ignora directive — Plan 11-02 mitigation via
  prompt body fallback) é validado implicitamente em UAT-11-01 se o
  agente já tiver session anterior; criar UAT-11-04 explícito apenas se
  drift for observado em runs subsequentes.

---

*Phase: 11-skills-system-prompts*
*Created: 2026-04-27*
