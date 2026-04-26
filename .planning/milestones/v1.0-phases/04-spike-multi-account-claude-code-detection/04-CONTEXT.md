# Fase 4: Spike — Multi-Account Claude Code Detection - Contexto

**Coletado:** 2026-04-26
**Status:** Pronto para planejamento
**Modo:** Auto-gerado (Auto mode ativo — decisões fundamentadas em PROJECT.md, REQUIREMENTS.md SPIKE-01..05, e descoberta de código existente)

<domain>
## Limite da Fase

Validar empiricamente o comportamento do Claude Code CLI em cenários de exhaustão e produzir os artefatos de decisão (taxonomia 429, classifier prototype, mecânica de retomada confirmada) que destravam a Phase 5. **Esta fase é puramente investigativa — não produz código de produção.** Entregáveis são documentação, fixtures e protótipo descartável.

**Cobre os requisitos:** SPIKE-01 (taxonomia 429), SPIKE-02 (classifier prototype + fixtures), SPIKE-03 (decisão pré-emptiva vs reativa), SPIKE-04 (validação empírica session_id + retomada), SPIKE-05 (smoke manual com 2 contas).

**Fora do escopo desta fase:**
- Implementação de produção do pool, schema, swap, UI (Fase 5)
- Multi-projeto / cost attribution (Fase 6)
- Pool multi-provider (Codex, Cursor) — v2

</domain>

<decisions>
## Decisões de Implementação

### Descoberta crítica do código existente (informa todo o spike)

- **D-01:** `packages/adapters/claude-local/src/server/parse.ts:13` JÁ TEM `CLAUDE_TRANSIENT_UPSTREAM_RE` cobrindo: rate-limit, rate_limit_error, 429, overloaded, 503, 529, throttled, "5h limit reached", "weekly limit reached", "usage limit reached", "out of extra usage". O spike NÃO começa do zero — começa AUDITANDO o que já existe.
- **D-02:** `packages/adapters/claude-local/src/server/parse.ts:14` JÁ TEM `CLAUDE_EXTRA_USAGE_RESET_RE` extraindo timestamp de "resets at X". O parsing de `retryAt` é existente.
- **D-03:** `packages/adapters/claude-local/src/server/execute.ts:253` JÁ TEM `CLAUDE_CONFIG_DIR` no `includeRuntimeKeys` — env passa para spawn do CLI. Multi-account via `CLAUDE_CONFIG_DIR=~/.paperclip/claude-accounts/{a,b}` é trivialmente possível.
- **D-04:** `packages/adapters/claude-local/src/server/execute.ts:631+` calcula `transientRetryNotBefore` e classifica `errorFamily: "transient_upstream"` — o framework de classificação JÁ EXISTE.

**Implicação:** O spike não escreve um classifier do zero. Spike AUDITA o classifier existente, identifica GAPS contra a taxonomia 429 completa do roadmap, e entrega:
- Taxonomia documentada com mapeamento "tipo de 429 → regex existente cobre? sim/não/parcial"
- Fixtures mostrando o comportamento atual contra cada tipo
- Recomendações específicas (gaps a fechar) para Fase 5
- Validação empírica de retomada multi-account

### SPIKE-01: Taxonomia 429 (`CLAUDE_429_TAXONOMY.md`)

- **D-05:** Tipos a documentar (do ROADMAP success criterion #1): RPM transient, TPM transient, daily quota, weekly quota, organization tier, "5h limit reached".
- **D-06:** Para cada tipo, documentar: (a) mensagem canônica observada/documentada, (b) headers HTTP relevantes (`retry-after`, `anthropic-ratelimit-*`), (c) comportamento esperado (transient vs hard quota), (d) regex existente cobre? — análise contra `CLAUDE_TRANSIENT_UPSTREAM_RE` e `CLAUDE_EXTRA_USAGE_RESET_RE`.
- **D-07:** Fontes: docs públicos da Anthropic (`docs.anthropic.com/en/api/rate-limits`, `docs.anthropic.com/en/api/errors`), código atual de parse.ts, observações empíricas (HUMAN-UAT — capturadas pelo usuário).
- **D-08:** Localização: `.planning/phases/04-spike-multi-account-claude-code-detection/CLAUDE_429_TAXONOMY.md`. Linguagem: pt-br (artefato interno de pesquisa).

### SPIKE-02: Protótipo `detectClaudeQuotaExhausted` + fixtures

- **D-09:** Protótipo descartável em `.planning/phases/04-spike-multi-account-claude-code-detection/prototype/detect-quota-exhausted.ts` — NÃO em `packages/adapters/claude-local/src/server/`. Spike é descartável; produção é Fase 5.
- **D-10:** O protótipo classifica entrada (stream-JSON line ou stderr blob) → `{ type: "rpm_transient" | "tpm_transient" | "daily_quota" | "weekly_quota" | "session_5h" | "org_tier" | "unknown", confidence: number, retryAt: Date | null, source: "regex" | "header" | "stream_event" }`.
- **D-11:** Fixtures em `.planning/phases/04-spike-multi-account-claude-code-detection/fixtures/`: 1 arquivo `.txt` ou `.json` por tipo de 429. Inicialmente populado com **fixtures stub** baseados em docs Anthropic + observações de erros conhecidos (suficiente para destravar Fase 5 com classifier funcional). HUMAN-UAT substitui com fixtures reais quando o usuário tiver capturas próprias.
- **D-12:** Tests do protótipo em `prototype/detect-quota-exhausted.test.ts` rodando contra os fixtures via vitest. Não precisa estar integrado ao test runner principal — pode rodar via `npx vitest .planning/phases/04-spike-multi-account-claude-code-detection/prototype/`.

### SPIKE-03: Pré-emptivo vs reativo + cooldown + retry-after

- **D-13:** Decisão a registrar em `DECISION-DETECTION-STRATEGY.md` (no diretório da fase). Recomendação default a documentar (Claude pode ajustar com base em pesquisa):
  - **Reativo (parse de stream/erro)** como primary detection — é o que paperclip já faz, robusto, funciona com qualquer transport.
  - **Pré-emptivo via headers `anthropic-ratelimit-*`** como enhancement opcional — só dispara se headers estão expostos pelo CLI (não é garantido); usar como early warning para começar warm-up de conta backup.
  - **Cooldown entre swaps:** mínimo 30s para evitar thrashing. Configurável.
  - **Honrar `retry-after`:** sim — se headers ou regex extraem `retryAt`, conta marcada `exhaustedUntil` até esse timestamp.
- **D-14:** Justificativa: roadmap diz "decisão registrada com justificativa". Recomendação acima é defensável (reativo é battle-tested no paperclip; pré-emptivo é incremento se factível). Documento descreve trade-offs e armadilhas (ex: pré-emptivo via headers pode falsamente otimizar quando token-bucket reseta, levando a swap desnecessário).

### SPIKE-04 + SPIKE-05: Validação empírica multi-account

- **D-15:** **Esta parte é genuinamente HUMAN-UAT** — exige 2 contas Claude Code reais com `~/.paperclip/claude-accounts/a/` e `~/.paperclip/claude-accounts/b/` populados, e idealmente uma conta exhausted ou simulação de exhaustão.
- **D-16:** Spike entrega um **harness de captura/validação** (`scripts/spike/capture-fixture.sh` + `scripts/spike/test-multi-account-resume.sh`) que o usuário pode rodar quando tiver as 2 contas. O harness:
  - Spawna `claude` com `CLAUDE_CONFIG_DIR=$ACCOUNT_A` e captura o stream-JSON em `fixtures/account-a-baseline.jsonl`
  - Idem para account_b
  - Tenta resumir uma session da conta A com `CLAUDE_CONFIG_DIR=$ACCOUNT_B` para validar empiricamente: session_id é per-account?
  - Captura output, exit codes, e gera `fixtures/multi-account-empirical.md` com observações
- **D-17:** Itens HUMAN-UAT a registrar em `04-HUMAN-UAT.md`:
  - UAT-04-01: Capturar fixtures reais de 429 (rodar agente até atingir limit em conta de teste, salvar stream)
  - UAT-04-02: Confirmar empiricamente que `session_id` é per-account (executar harness com 2 contas)
  - UAT-04-03: Smoke manual: agente em conta A → exhaustão simulada (ou real) → swap manual para conta B via `CLAUDE_CONFIG_DIR` → continuação via `issue_continuation_summary`
- **D-18:** O harness é descartável (vive no diretório da fase, não em `scripts/` raiz). Fase 5 implementa a versão de produção em `services/claude-accounts.ts`.

### Achados que afetam Fase 5 (success criterion #5)

- **D-19:** Documento `FINDINGS-FOR-PHASE-5.md` (no diretório da fase) explicitamente lista cada surpresa/decisão que muda design da Fase 5. Inicialmente populado com:
  - Detecção: classifier de Fase 5 deve REUSAR `CLAUDE_TRANSIENT_UPSTREAM_RE` existente em vez de duplicar — apenas estender se gaps forem identificados.
  - Schema: `claude_accounts.lastQuotaWindowsJson` deve refletir tipos da taxonomia (rpm/tpm/daily/weekly/5h) em vez de campo opaco.
  - UI: status de conta deve incluir tempo até reset (do `retryAt`) — paperclip já parseia isso, expor no UI da Fase 5.
  - `CLAUDE_CONFIG_DIR` passthrough já existe em execute.ts:253 — Fase 5 MULTI-05 ("patch claude-local/src/server/execute.ts aceita config.claudeConfigDir") torna-se "verificar se já está configurado adequadamente; só patchar se não".
  - Itens descobertos durante o spike serão acrescentados.

### Discrição do Claude

- Estrutura interna exata da taxonomia (tabela markdown vs YAML interno — preferência markdown legível humano)
- Linguagem do protótipo (TypeScript com `tsx` é default; alternativas: Node.js + JS puro)
- Quantidade exata de fixtures stub iniciais (mínimo 1 por tipo; aceitável até 2 variantes por tipo se a heurística é não-trivial)
- Se incluir um `BACKLOG-FOR-PHASE-5.md` separado ou consolidar em `FINDINGS-FOR-PHASE-5.md` — escolha do planejador
- Nomenclatura exata dos types do classifier output (`session_5h` vs `session_hourly` vs `claude_5h_limit` — escolha consistente com paperclip se houver convenção, ex: `session_5h` por brevidade)
- Se o harness é shell script ou TS — preferência shell para reduzir setup, mas TS aceitável se simplifica parsing JSON

</decisions>

<canonical_refs>
## Referências Canônicas

**Agentes downstream DEVEM ler estas antes de planejar ou implementar.**

### Código existente (audit target — NÃO modificar nesta fase)
- `packages/adapters/claude-local/src/server/parse.ts` — `CLAUDE_TRANSIENT_UPSTREAM_RE` (linha 13), `CLAUDE_EXTRA_USAGE_RESET_RE` (linha 14), parsing de retryAt
- `packages/adapters/claude-local/src/server/execute.ts` — `includeRuntimeKeys: ["HOME", "CLAUDE_CONFIG_DIR"]` (linha 253), classificação `transientUpstream` + `transientRetryNotBefore` + `errorFamily` (linhas 631-748)
- `server/src/__tests__/claude-local-adapter*.test.ts` — testes existentes do adapter; ler para entender padrões de mock/fixture e não duplicar

### Documentação Anthropic (para taxonomia)
- `https://docs.anthropic.com/en/api/rate-limits` — limites oficiais por tier, headers `anthropic-ratelimit-*`, comportamento de 429
- `https://docs.anthropic.com/en/api/errors` — taxonomia de erros oficial
- Mensagens canônicas observadas em paperclip (presentes nos regexes existentes) — fonte secundária

### Fase 5 (target downstream)
- `.planning/REQUIREMENTS.md` §"Multi-Conta" — MULTI-01..11 detalhes (especialmente MULTI-04, MULTI-05, MULTI-06, MULTI-08 que dependem dos achados desta fase)
- `.planning/ROADMAP.md` §"Phase 5" — objetivo, success criteria que precisam dos achados deste spike

### Roadmap e estado
- `.planning/ROADMAP.md` §"Phase 4" — objetivo + success criteria
- `.planning/REQUIREMENTS.md` §"Spike" — SPIKE-01..05 detalhes
- `.planning/PROJECT.md` — visão geral, restrições

### Fases anteriores
- `.planning/phases/03-workflow-de-equipe-onboarding/03-CONTEXT.md` — padrão de roteamento HUMAN-UAT para itens não-automatizáveis (precedente direto para esta fase)
- `.planning/phases/02-migra-o-de-storage-para-supabase/MIGRATION_AUDIT.md` — padrão de doc de auditoria/findings (precedente para `FINDINGS-FOR-PHASE-5.md`)

</canonical_refs>

<code_context>
## Insights do Código Existente

### Ativos Reutilizáveis
- **Detecção 429 já robusta** — `CLAUDE_TRANSIENT_UPSTREAM_RE` cobre maioria dos casos. Spike foca em VALIDAR cobertura, não criar do zero.
- **Parsing de retry timestamp** — `CLAUDE_EXTRA_USAGE_RESET_RE` + `parseUpstreamRetryAt` extraem "resets at X" de mensagens de erro.
- **Classificação `errorFamily`** — `errorFamily: "transient_upstream"` já é populado e propagado. Fase 5 reusa.
- **`CLAUDE_CONFIG_DIR` env passthrough** — multi-account é tecnicamente trivial; `CLAUDE_CONFIG_DIR=$path` no spawn já funciona.
- **Vitest setup** — projeto usa vitest; protótipo do spike pode rodar standalone via `npx vitest`.

### Padrões Estabelecidos
- Adapters em `packages/adapters/<name>/src/server/`. Spike NÃO modifica produção.
- Fixtures de teste seguem padrão `*.test.ts` ao lado do código testado (ver `server/src/__tests__/`). Spike usa fixture FILES separados em `prototype/fixtures/` por brevidade.
- Stream-JSON é o transport canônico do Claude CLI — fixtures são linhas JSON.
- TypeScript estrito; `tsx` para execução de scripts.

### Pontos de Integração
- Spike NÃO se integra com produção. Vive em `.planning/phases/04-*/` e `prototype/` interno.
- Fase 5 é a integração real — spike apenas produz docs + protótipo + fixtures que Fase 5 importa/referencia.

</code_context>

<specifics>
## Ideias Específicas

- **Fixtures stub iniciais** baseados em mensagens conhecidas do paperclip (presentes nos regexes existentes) — um arquivo por tipo, com 1-2 linhas de stream JSON cada. Suficiente para destravar Fase 5; HUMAN-UAT substitui com captura real.
- **Anthropic rate-limit headers** (`anthropic-ratelimit-requests-remaining`, `anthropic-ratelimit-tokens-remaining`, `anthropic-ratelimit-requests-reset`) — investigar se Claude Code CLI propaga estes em algum lugar do stream. Se sim, abre porta para detecção pré-emptiva.
- **Cooldown 30s** — número escolhido por defesa: tempo o suficiente para conta nova "respirar" sem perceber thrash; configurável.
- **Disposable code** — todo `prototype/` e `fixtures/` da Fase 4 ficam no diretório da fase, NÃO em `scripts/` ou `packages/`. Quando Fase 5 implementa produção, código aqui pode ser arquivado/deletado se não for útil.
- **Fallback estratégia** — se HUMAN-UAT atrasar (usuário não captura fixtures reais), Fase 5 ainda pode iniciar com fixtures stub + classifier reusando regex existente. Risco aceitável: classifier converge na produção via uso real.

</specifics>

<deferred>
## Ideias Adiadas

- **Implementação de produção do pool, schema `claude_accounts`, swap atômico** — Fase 5 (MULTI-01..11)
- **UI de gerenciamento de contas (`ClaudeAccounts.tsx`)** — Fase 5 (MULTI-09)
- **Heartbeat-aware account selection** — v2 (POOL-01)
- **Pool multi-provider (Codex, Cursor)** — v2
- **Cost attribution per-account** — Fase 5 (MULTI-03), refinamento Fase 6 (PROJ-03)
- **Reconciliação periódica vs Anthropic dashboard** — v2 (OBS-02)

</deferred>

---

*Fase: 04-spike-multi-account-claude-code-detection*
*Contexto coletado: 2026-04-26*
