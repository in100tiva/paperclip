---
phase: 03-workflow-de-equipe-onboarding
plan: 02
subsystem: docs
tags: [onboarding, markdown, pt-br, fork-policy, better-auth, supabase, invite-flow]

requires:
  - phase: 02-migra-o-de-storage-para-supabase
    provides: ".env.example template, PAPERCLIP_INSTANCE_ID=team-shared cookie prefix, pooler 6543/5432 two-URL convention, BETTER_AUTH_SECRET requirement, authenticated mode for invite flow (02-06 finding)"
  - phase: 01-fork-hard-cerim-nia-de-corte
    provides: "Política de fork hard (CONTRIBUTING.md, UPSTREAM_REFERENCE.md), README.md paperclip preservado"
provides:
  - "ONBOARDING.md (pt-br, 7 seções, <30min path) na raiz do repo"
  - "Nota DDD no topo do README.md apontando para ONBOARDING.md (sem mutilar paperclip body)"
  - "Comandos canônicos de setup citados em um único lugar (cp .env.example .env.local, pnpm setup, pnpm dev, PAPERCLIP_DEPLOYMENT_MODE=authenticated)"
  - "Referências cruzadas para TROUBLESHOOTING.md (anchors em snake-case que o plano 03-03 deve honrar)"
affects: [03-03 (TROUBLESHOOTING.md anchors), 03-04 (cross-machine smoke deve seguir comandos do ONBOARDING), 03-05 (qualquer doc complementar), TEAM-02, TEAM-05]

tech-stack:
  added: []
  patterns:
    - "Docs voltados ao usuário interno em pt-br na raiz do repo (ONBOARDING.md, TROUBLESHOOTING.md)"
    - "README.md paperclip preservado byte-por-byte; nota de fork no topo apenas adiciona conteúdo, não substitui"
    - "Tabelas markdown para vars críticas (variável | valor | origem) — copy-paste friendly + escaneável"
    - "Cada problema documentado linka para TROUBLESHOOTING.md com anchor snake-case (#cookie-prefix-divergente, #windows-ntfs)"

key-files:
  created:
    - "ONBOARDING.md"
  modified:
    - "README.md"

key-decisions:
  - "Estrutura travada em 7 seções H2 numeradas (Pré-requisitos → Clone → .env.local → pnpm setup → pnpm dev → invite/login → Travou) seguindo D-06"
  - "Tempo-alvo <30 min declarado no topo do doc (D-07) — alinha com critério de sucesso #1 do ROADMAP"
  - "PAPERCLIP_INSTANCE_ID=team-shared destacado como literal obrigatório (não placeholder), com aviso explícito de divergência → cookie isolado"
  - "Modo `authenticated` documentado como pré-requisito para invite flow (finding da Fase 2 02-06: pnpm dev arranca em local_trusted, Better Auth handler não montado)"
  - "Bootstrap CEO vs dev #2..N split na seção 6 — só dev #1 roda create-auth-bootstrap-invite.ts; demais entram via /invite/<token> compartilhado em canal interno"
  - "Vault/1Password referenciado como origem dos secrets reais — doc não embute valores nem instrui devs a colarem secrets em arquivos públicos"
  - "README.md modificação minimalista: nota DDD prepended antes da linha de fork existente; corpo paperclip (439 linhas remanescentes) intocado"

patterns-established:
  - "Anchor convention: TROUBLESHOOTING.md anchors em snake-case (#windows-ntfs, #cookie-prefix-divergente) — o plano 03-03 deve criar headings que mapeiem para esses anchors"
  - "Comando exato de geração de BETTER_AUTH_SECRET inline no doc (`node -e \"...crypto.randomBytes(32).toString('base64')\"`) — não força dev a procurar"
  - "Bloco shell por comando (não comandos múltiplos por bloco) → copy-paste com um clique"

requirements-completed: [TEAM-02]

duration: 2min
completed: 2026-04-26
---

# Phase 03 Plan 02: ONBOARDING.md + README Note Summary

**Doc de onboarding em pt-br (124 linhas, 7 seções) cobrindo o caminho linear clone → setup → invite/login com tempo-alvo <30min, mais nota minimalista no topo do README.md preservando paperclip body byte-por-byte.**

## Performance

- **Duração:** ~2 min
- **Iniciado:** 2026-04-26T04:38:37Z
- **Concluído:** 2026-04-26T04:40:00Z
- **Tarefas:** 2/2
- **Arquivos modificados:** 2 (1 criado, 1 modificado)

## Realizações

- `ONBOARDING.md` na raiz com 7 seções H2 pt-br seguindo D-06: Pré-requisitos, Clone, `.env.local`, `pnpm setup`, `pnpm dev`, invite/primeiro login, troubleshooting
- Tabela de vars críticas (DATABASE_URL, SUPABASE_DB_URL, BETTER_AUTH_SECRET, PAPERCLIP_INSTANCE_ID=team-shared) com origem e instrução de geração local
- Caveat documentado: `pnpm dev` arranca em `local_trusted`; invite flow exige `PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm --filter @paperclipai/server dev` (finding 02-06)
- Split bootstrap CEO vs dev #2..N na seção 6 — captura o flow de invite real (paperclipai/db scripts + canal interno)
- README.md ganhou nota DDD curta no topo apontando para ONBOARDING.md (decisão D-08); paperclip body permanece intocado (439 linhas após edit, 1 linha adicionada)

## Commits das Tarefas

1. **Tarefa 1: Criar ONBOARDING.md com 7 seções (D-06)** — `064477e` (docs)
2. **Tarefa 2: Adicionar nota no topo do README.md apontando para ONBOARDING.md** — `7a648a2` (docs)

## Arquivos Criados/Modificados

- `ONBOARDING.md` (criado, 124 linhas) — Guia pt-br de onboarding linear; entrada operacional principal para devs novos do fork DDD
- `README.md` (modificado, +1 linha → 440 linhas) — Nota DDD prepended ao topo apontando para ONBOARDING.md e TROUBLESHOOTING.md; resto do README paperclip preservado

## Decisões Tomadas

Ver `key-decisions` no frontmatter. Resumo executivo:

- 7 seções fixas (D-06) com tempo-alvo <30min no topo (D-07)
- Vars críticas em tabela markdown + alerta literal sobre `team-shared`
- Modo `authenticated` para invite flow documentado como override explícito (não é o default)
- README.md modificação minimalista (1 linha de nota), paperclip body intacto (D-05/D-08)
- Vault/1Password referenciado para secrets reais — doc não embute valores

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. Acceptance criteria de ambas as tarefas verificadas via node script + grep + wc. ONBOARDING.md final: 124 linhas (>80 mínimo), 7 H2 sections (=7 esperado). README.md final: 440 linhas (>=430 esperado), linha 1 contém `[ONBOARDING.md](ONBOARDING.md)`, paperclip body verificado por presença literal de `## What is Paperclip?` e `## Quickstart`.

## Problemas Encontrados

Nenhum.

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo necessária. Os comandos referenciados (`pnpm setup`, `pnpm db:migrate`, etc.) já existem ou serão criados pelos planos paralelos desta fase (03-01 cria `pnpm setup`, 03-03 cria TROUBLESHOOTING.md).

**Dependência cruzada:** os anchors `#windows-ntfs`, `#cookie-prefix-divergente`, etc. citados em ONBOARDING.md devem ser criados como headings em `TROUBLESHOOTING.md` pelo plano 03-03. Se os headings divergirem, links quebram silenciosamente — o plano 03-03 deve honrar essas anchors.

## Self-Check: PASSED

- FOUND: ONBOARDING.md (124 linhas, 7 H2 sections)
- FOUND: README.md (440 linhas, linha 1 com link ONBOARDING.md, paperclip body preservado)
- FOUND commit: 064477e (Task 1)
- FOUND commit: 7a648a2 (Task 2)

## Prontidão para Próxima Fase

- TEAM-02 satisfeito (critério #1 do ROADMAP: caminho <30min do clone à primeira sessão logada)
- Plano 03-03 (TROUBLESHOOTING.md) tem entrada definida: deve seguir os anchors snake-case já referenciados pelo ONBOARDING.md
- Plano 03-04 (cross-machine smoke) pode reusar a sequência de comandos canônica documentada aqui
- Sem bloqueios

---
*Fase: 03-workflow-de-equipe-onboarding*
*Concluída: 2026-04-26*
