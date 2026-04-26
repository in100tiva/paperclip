# Fase 3: Workflow de Equipe + Onboarding - Contexto

**Coletado:** 2026-04-26
**Status:** Pronto para planejamento
**Modo:** Auto-gerado (Auto mode ativo — decisões fundamentadas em PROJECT.md, REQUIREMENTS.md TEAM-01..05, e CONTEXT da Fase 2)

<domain>
## Limite da Fase

Garantir que 5+ devs consigam onboardar no fork sem fricção, com convenções operacionais (env vars, schema migrations via CI, troubleshooting Windows) documentadas e validadas via setup script automatizado.

**Cobre os requisitos:** TEAM-01 (5+ devs cadastrados), TEAM-02 (README de setup), TEAM-03 (`pnpm setup` validador), TEAM-04 (smoke E2E cross-machine), TEAM-05 (TROUBLESHOOTING.md).

**Fora do escopo desta fase:**
- Multi-account Claude Code (Fase 4 spike + Fase 5 implementação)
- Multi-projeto / cost attribution (Fase 6)
- Migração para Supabase Auth (v2)
- RLS completa (v2)

</domain>

<decisions>
## Decisões de Implementação

### Setup Script (`pnpm setup`) — TEAM-03

- **D-01:** Script Node/TypeScript em `scripts/setup.ts`, executado via `pnpm setup` (adicionar entrada em `package.json`). Usar `tsx` (já dependência do projeto) — NÃO bash/PowerShell (cross-platform Windows é prioridade).
- **D-02:** Validações obrigatórias em ordem (fail-fast com mensagem acionável):
  1. Node version >= 20 (paperclip requer)
  2. pnpm presente e versão compatível
  3. `.env.local` existe (sugerir `cp .env.example .env.local` se ausente)
  4. Vars críticas presentes e não placeholder: `DATABASE_URL`, `SUPABASE_DB_URL`, `BETTER_AUTH_SECRET`, `PAPERCLIP_INSTANCE_ID=team-shared`
  5. `claude` CLI no PATH (`which claude` / `where claude`) — warning, não erro fatal (usuário pode não ter instalado ainda)
  6. Conexão Supabase: `SELECT 1` via pooler 6543 com `prepare: false`
  7. Schema check: `SELECT count(*) FROM "user"` (Better Auth schema aplicado) — se falhar, instruir `pnpm db:migrate`
  8. Better Auth signup smoke (opcional, atrás de `--full` flag): cria user temporário, deleta
- **D-03:** Output formatado com checks coloridos (✓/✗). Cada falha imprime: o que falhou, comando para corrigir, link para `TROUBLESHOOTING.md` quando aplicável.
- **D-04:** Exit code não-zero em qualquer falha de validação obrigatória (CI-friendly).

### Onboarding Doc (TEAM-02) — README de setup local

- **D-05:** Criar `ONBOARDING.md` na raiz (NÃO modificar `README.md` raiz — ele é o doc do paperclip público; o fork tem seu próprio onboarding doc separado, conforme política de fork hard).
- **D-06:** Estrutura do `ONBOARDING.md`:
  1. Pré-requisitos (Node 20+, pnpm, git, Windows/macOS/Linux suportado)
  2. Clonar o repo + `pnpm install`
  3. Copiar `.env.example` → `.env.local` e preencher (link para Vault/1Password compartilhado da equipe — referenciado mas não embutido)
  4. `pnpm setup` (valida tudo)
  5. `pnpm dev` (primeiro run)
  6. Aceitar invite/board-claim → primeiro login Better Auth → ver dashboard
  7. Link para `TROUBLESHOOTING.md`
- **D-07:** Tempo-alvo: <30 minutos do clone à primeira sessão logada (critério de sucesso #1 do ROADMAP).
- **D-08:** README raiz recebe nota curta no topo apontando para `ONBOARDING.md` (já existe nota de fork; expandir para incluir link de onboarding).

### Invite/Cadastro de Devs (TEAM-01)

- **D-09:** Reutilizar fluxo de invite existente do paperclip — `server/src/services/invite-grants.ts`, `server/src/board-claim.ts`, `ui/src/pages/CompanyInvites.tsx` já implementados. NÃO reescrever.
- **D-10:** Bootstrap inicial: dev #1 (CEO) executa `packages/db/scripts/create-auth-bootstrap-invite.ts` para gerar invite de bootstrap_ceo. Demais devs entram via fluxo `company_join` normal a partir da company criada pelo dev #1.
- **D-11:** Documentar em `ONBOARDING.md` o passo "como conseguir seu invite" — link para canal interno (Discord/Slack do time) onde o CEO publica invites; não embutir secrets nem URLs em docs públicos.
- **D-12:** Sucesso = 5+ entries na tabela `user` do Supabase, todos pertencendo à mesma company. Validável via SQL simples no Supabase dashboard.

### Smoke Test E2E Cross-Machine (TEAM-04)

- **D-13:** Procedimento manual documentado em `.planning/phases/03-workflow-de-equipe-onboarding/CROSS-MACHINE-SMOKE.md` (similar ao SMOKE-TEST-LOG da Fase 2):
  1. Dev A em máquina X: `pnpm dev` → signup → criar company "Test Co"
  2. Dev B em máquina Y (com mesmo Supabase, mesmo `PAPERCLIP_INSTANCE_ID=team-shared`): aceitar invite de A → login → confirmar visualização de "Test Co"
  3. Dev B cria task em "Test Co"; Dev A faz refresh → vê a task (estado compartilhado funcional, sem sincronização manual)
- **D-14:** Aceita-se smoke single-host se segundo dev real não estiver disponível: usar dois browsers/perfis isolados na mesma máquina mas com cookies/sessions distintos. Documentar limitação.
- **D-15:** Resultado registrado em arquivo de log com timestamps, screenshots opcionais, e marcador PASS/FAIL — paralelo ao padrão da Fase 2.

### TROUBLESHOOTING.md (TEAM-05)

- **D-16:** Localização: raiz do repo (`TROUBLESHOOTING.md`), descobrível via link no `ONBOARDING.md` e em mensagens de erro do `pnpm setup`.
- **D-17:** Cobertura mínima (uma seção por problema, com sintoma → causa → solução):
  - Windows NTFS: file locks em `node_modules`, paths longos, line endings (CRLF vs LF)
  - Stale service registry em `~/.paperclip/instances/default/runtime-services/` (wart documentado da Fase 1; usar `scripts/kill-dev.sh` ou equivalente)
  - Supabase no limite de conexões (free tier ~60): sintoma "too many connections", solução é reduzir `max` no pool ou parar instâncias não usadas
  - Better Auth cookie prefix divergente: se um dev tem `PAPERCLIP_INSTANCE_ID` diferente, sessões não interoperam — resetar para `team-shared`
  - Schema desatualizado: erro Drizzle ao logar → `git pull && pnpm db:migrate` (lembrando que migrações reais rodam apenas em CI; localmente só leitura)
  - `claude` CLI ausente: link para instalação oficial
  - `prepare:false` ausente em código novo: se um PR introduzir prepared statements, eles falham em runtime contra pooler 6543 — checar com erro "prepared statement does not exist"
- **D-18:** Cada entrada cita arquivo/linha relevante quando aplicável (ex: `packages/db/src/client.ts:NN` para `prepare:false`).

### Discrição do Claude

- Tooling exato do TROUBLESHOOTING.md (markdown puro, sem MDX — apenas legibilidade)
- Ordenação interna das seções no `ONBOARDING.md` desde que o fluxo lógico (clone → setup → run → login) seja preservado
- Decisão de adicionar checks opcionais ao `pnpm setup` além do mínimo D-02 (ex: validar que git remote está correto)
- Estrutura interna de `scripts/setup.ts` — pode ser monolítico ou modular por check, à escolha do planejador
- Se incluir um `pnpm setup --fix` que tenta auto-corrigir alguns checks (ex: copiar `.env.example`) ou apenas validar — escolha do planejador, default validar-only

</decisions>

<canonical_refs>
## Referências Canônicas

**Agentes downstream DEVEM ler estas antes de planejar ou implementar.**

### Setup e config existentes
- `.env.example` — template canônico de env vars com instruções inline
- `package.json` — scripts npm disponíveis; `pnpm setup` deve ser adicionado aqui
- `scripts/clean-onboard-git.sh`, `scripts/clean-onboard-npm.sh`, `scripts/clean-onboard-ref.sh` — scripts de onboarding existentes do paperclip (avaliar se reutilizáveis ou substituir)

### Auth e invite (existentes — reutilizar, não reescrever)
- `server/src/auth/better-auth.ts` — Better Auth config; cookie prefix derivado de `PAPERCLIP_INSTANCE_ID` (linha 31-33)
- `doc/spec/invite-flow.md` — Mapa completo do fluxo de invite (states, transitions, edge cases)
- `server/src/services/invite-grants.ts` — Lógica de grants
- `server/src/board-claim.ts` — Board-claim flow para agentes
- `packages/db/scripts/create-auth-bootstrap-invite.ts` — Script de bootstrap CEO invite
- `ui/src/pages/CompanyInvites.tsx`, `ui/src/pages/CompanySettings.tsx`, `ui/src/pages/InviteLanding.tsx` — UI do fluxo

### DB / Supabase
- `packages/db/src/client.ts` — connection factory com `prepare: false` em pooler 6543
- `packages/db/src/runtime-config.ts` — resolução de `DATABASE_URL` Supabase vs embedded fallback
- `.planning/phases/02-migra-o-de-storage-para-supabase/MIGRATION_AUDIT.md` — auditoria com pooler hostname descoberto e wart de stale registry
- `.planning/phases/02-migra-o-de-storage-para-supabase/02-CONTEXT.md` — decisões da Fase 2 que constrangem esta fase (cookie prefix, pool size, fluxo de migrations)

### Política de fork
- `CONTRIBUTING.md` — política de fork hard (sem PRs upstream)
- `UPSTREAM_REFERENCE.md` — SHA original e política de port manual
- `README.md` — README do paperclip preservado; modificações do fork ficam em arquivos separados (`ONBOARDING.md`, `TROUBLESHOOTING.md`)

### Roadmap e requisitos
- `.planning/ROADMAP.md` §"Phase 3" — objetivo, depends-on, success criteria
- `.planning/REQUIREMENTS.md` §"Equipe" — TEAM-01..05 detalhes
- `.planning/PROJECT.md` — visão geral, restrições, decisões-chave (ex: free tier ~60 conexões)

</canonical_refs>

<code_context>
## Insights do Código Existente

### Ativos Reutilizáveis
- **Fluxo de invite/company_join completo** já implementado (server + UI) — bootstrap_ceo + company_join com aprovação. Cobre TEAM-01 sem código novo, apenas documentação.
- **`tsx`** disponível no monorepo (`cli/node_modules/tsx`) — usar para `scripts/setup.ts`.
- **`packages/db/src/client.ts`** já lida com pooler/embedded fallback — `pnpm setup` reusa essa factory para o ping de DB.
- **`scripts/check-no-service-role-leak.mjs`** + pre-commit hook (Fase 2) — exemplo de padrão de script de validação a seguir.
- **`docker-onboard-smoke.sh`** existente — referência de smoke automation, embora seja para Docker.

### Padrões Estabelecidos
- Scripts em `scripts/` na raiz do repo, executáveis via `pnpm run X`.
- Output convencionado: emoji ✓/✗ + mensagens curtas (ver outputs do paperclip CLI).
- Husky em `.husky/` para hooks (já configurado na Fase 2).
- Documentação de Fase fica em `.planning/phases/XX-*/`, mas docs voltadas ao usuário final (devs operando o repo) ficam na raiz (`ONBOARDING.md`, `TROUBLESHOOTING.md`).
- Estilo de prosa: pt-br para artefatos do framework (`.planning/`), en para docs públicos (raiz) — manter convenção do paperclip onde possível, mas internal team docs podem ser pt-br conforme preferência da equipe.

### Pontos de Integração
- `package.json` raiz — adicionar entrada `"setup": "tsx scripts/setup.ts"`.
- `ONBOARDING.md` (novo) — referenciado por `README.md` (uma linha no topo), por output de erros do `pnpm setup`, e linkado em mensagens de boas-vindas (se houver).
- `TROUBLESHOOTING.md` (novo) — referenciado por `ONBOARDING.md`, por mensagens de erro de `pnpm setup`, e por entradas no `.husky/pre-commit` ao bloquear commits.
- Better Auth signup flow já exposto em UI — TEAM-01 não precisa de código de servidor novo, apenas devs aceitarem invites.

</code_context>

<specifics>
## Ideias Específicas

- **Linguagem de docs:** `ONBOARDING.md` e `TROUBLESHOOTING.md` em pt-br (equipe brasileira, conforme preferência observada em `.planning/`). Adicionar nota no topo de cada um declarando idioma.
- **Free tier Supabase ~60 conexões:** Com 5 devs × pool max 5 = 25 conexões. Documentar em TROUBLESHOOTING como "se você ver 'too many connections', verifique quantos `pnpm dev` estão rodando simultâneos no time — peça no chat".
- **Cookie prefix `paperclip-team-shared`:** Validado empiricamente na Fase 2. Se algum dev mudar `PAPERCLIP_INSTANCE_ID`, sessões dele não interoperam — TROUBLESHOOTING deve cobrir.
- **Stale service registry (`~/.paperclip/instances/default/runtime-services/`):** Wart conhecido da Fase 1, deferred para esta fase. Documentar uso de `scripts/kill-dev.sh` (verificar se script existe, ou criar um wrapper de `taskkill /T /F` + cleanup do diretório).
- **Smoke E2E single-host fallback:** Se time não conseguir coordenar dois devs em máquinas diferentes simultaneamente, aceitar two-browser-profiles na mesma máquina como prova de "estado compartilhado" — limitação documentada explicitamente.

</specifics>

<deferred>
## Ideias Adiadas

- **Pool de Claude Code accounts** — Fase 4 (spike) + Fase 5 (implementação). Esta fase não precisa lidar com `claude` CLI além de validar presença binária.
- **RLS opcional / defensivo** — v2 (`RLS-01`, `RLS-02`).
- **OAuth Google/GitHub via Supabase Auth** — v2 (`AUTH2-03`).
- **Onboarding doc em formato MDX/site dedicado** — overkill para 5+ devs internos; markdown puro é suficiente. Reavaliar quando time crescer >15.
- **Migração de uploads para Supabase Storage** — v2 (`STOR-01`).
- **Setup automatizado via Docker compose dev** — fora do escopo; cada dev roda local nativo.

</deferred>

---

*Fase: 03-workflow-de-equipe-onboarding*
*Contexto coletado: 2026-04-26*
