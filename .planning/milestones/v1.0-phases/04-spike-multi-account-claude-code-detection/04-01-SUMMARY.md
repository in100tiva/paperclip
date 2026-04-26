---
phase: 04-spike-multi-account-claude-code-detection
plan: 01
subsystem: spike-research
tags: [claude-code, rate-limiting, 429, taxonomy, audit, regex]

# Grafo de dependências
requires:
  - phase: 03-workflow-de-equipe-onboarding
    provides: precedente de roteamento HUMAN-UAT (não-automatizável → artefato + UAT pendente)
provides:
  - Taxonomia 429 completa com 6 tipos (rpm_transient, tpm_transient, daily_quota, weekly_quota, org_tier, session_5h) mapeada contra regex existente em parse.ts
  - Análise de cobertura explícita: 4 yes / 2 partial / 0 no
  - Lista de gaps específicos para Phase 5 MULTI-06 (discriminator RPM vs TPM via headers; mensagem canônica org_tier pendente HUMAN-UAT)
  - Tabela de referência dos 7 headers Anthropic relevantes
affects: [phase-04-02, phase-04-03, phase-04-05, phase-05-multi-account]

# Rastreamento de tecnologia
tech-stack:
  added: []
  patterns:
    - "Audit-only spike artifact: documento de pesquisa em pt-br que cita literal de regex+linha do audit target sem modificá-lo"
    - "Cobertura por veredicto explícito (yes/no/partial) com regex literal nomeada na coluna final"

key-files:
  created:
    - .planning/phases/04-spike-multi-account-claude-code-detection/CLAUDE_429_TAXONOMY.md
  modified: []

key-decisions:
  - "Reusar (não duplicar) CLAUDE_TRANSIENT_UPSTREAM_RE e CLAUDE_EXTRA_USAGE_RESET_RE em Phase 5; estender só onde gaps partial são fechados"
  - "Discriminator natural RPM vs TPM vem de headers (anthropic-ratelimit-{tokens,requests}-reset), não da string da mensagem — requer captura de headers no transport"
  - "Mensagem canônica de org_tier permanece especulativa até HUMAN-UAT-04-01; cai em fallback transient_upstream genérico no estado atual (funcional mas perde sub-tipo)"

patterns-established:
  - "Coverage verdict tabular: cada tipo recebe yes/no/partial com nome de regex e linha de parse.ts citados"
  - "Forward-link de fixtures stub → HUMAN-UAT real: documento aceita observações de docs públicos como placeholder, marca itens que UAT empírico substituirá"

requirements-completed: [SPIKE-01]

# Métricas
duration: 2min
completed: 2026-04-26
---

# Phase 4 Plan 01: Taxonomia 429 Summary

**Taxonomia 429 com 6 tipos auditados contra `CLAUDE_TRANSIENT_UPSTREAM_RE` e `CLAUDE_EXTRA_USAGE_RESET_RE` existentes em `parse.ts:13-15`, identificando 4 cobertos diretamente, 2 parciais (tpm_transient sem discriminator de dimensão; org_tier sem token canônico) e 0 ausentes — destrava Phase 5 MULTI-06 com gaps explícitos.**

## Performance

- **Duração:** 2min
- **Iniciado:** 2026-04-26T05:15:32Z
- **Concluído:** 2026-04-26T05:17:27Z
- **Tarefas:** 1
- **Arquivos criados:** 1

## Realizações

- `CLAUDE_429_TAXONOMY.md` (108 linhas) entregue em `.planning/phases/04-spike-multi-account-claude-code-detection/`
- Tabela markdown principal de 6 tipos com colunas: Trigger Canônico | Mensagem Canônica | Headers HTTP | Comportamento | Cobertura existente | Regex que cobre
- Citação literal das duas regex existentes (`CLAUDE_TRANSIENT_UPSTREAM_RE` parse.ts:13, `CLAUDE_EXTRA_USAGE_RESET_RE` parse.ts:14) com tokens-chave destacados
- Resumo de cobertura quantificado (4 yes, 2 partial, 0 no) com implicação direta para Phase 5 MULTI-06
- Tabela de referência dos 7 headers Anthropic (`anthropic-ratelimit-{requests,tokens}-{limit,remaining,reset}` + `retry-after`)
- Forward-link explícito a `04-HUMAN-UAT.md#uat-04-01` para itens que dependem de captura empírica (mensagem canônica org_tier; presença de headers no stream-JSON)

## Commits das Tarefas

1. **Tarefa 1: Criar CLAUDE_429_TAXONOMY.md com tabela de 6 tipos e análise de cobertura** — `7554d10` (docs)

## Arquivos Criados/Modificados

- `.planning/phases/04-spike-multi-account-claude-code-detection/CLAUDE_429_TAXONOMY.md` — taxonomia 429 com análise de cobertura por regex existente; artefato de pesquisa interno em pt-br conforme D-08

## Decisões Tomadas

- **Reuso vs duplicação (Phase 5):** classifier de produção MULTI-06 deve reusar `CLAUDE_TRANSIENT_UPSTREAM_RE` e `CLAUDE_EXTRA_USAGE_RESET_RE` em vez de criar regex novo. Justificativa: 4/6 tipos já cobertos diretamente; gaps partial são candidatos a extensão pontual, não rewrite.
- **Discriminator RPM vs TPM via headers (não mensagem):** análise concluiu que as mensagens textuais de RPM e TPM transient não são confiavelmente distintas no nível de string — discriminator natural vem de qual header `*-reset` está zerado (`requests-reset` vs `tokens-reset`). Implica que Phase 5 precisa capturar headers do transport (HUMAN-UAT-04-01 confirma se Claude Code CLI expõe).
- **org_tier canônica fica pendente HUMAN-UAT:** sem captura empírica, mensagem canônica é especulativa. Documento marca como `partial` cobertura (cai em fallback transient_upstream genérico) e aponta para UAT-04-01 como caminho de resolução. Não tentou-se inventar mensagem; melhor cobertura partial honesta que false `yes`.
- **Sub-tipo discriminator no output do classifier (Phase 5):** mesmo que regex de detecção compartilhe match entre tipos, o classifier de produção deve emitir `type: "rpm_transient" | "tpm_transient" | "daily_quota" | "weekly_quota" | "session_5h" | "org_tier" | "unknown"` para que UI/schema possam diferenciar políticas.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. O plano fornecia conteúdo prescritivo bastante detalhado (6 linhas de tabela com colunas exatas e veredictos pré-determinados); execução foi tradução fiel sem mudanças estruturais. Nenhum bug, nenhuma feature crítica ausente, nenhum bloqueador encontrado.

**Total de desvios:** 0
**Impacto no plano:** zero — execução verificada por automated check (file exists, tabela ≥7 pipe-lines, 6 tokens de tipo presentes, ambas regex citadas, veredictos yes/no/partial presentes).

## Problemas Encontrados

Nenhum. Audit target (`parse.ts`) lido sem modificação, regex literal copiado fielmente, frontmatter do plano (`requirements: [SPIKE-01]`) preservado no SUMMARY.

## Configuração Manual Necessária

Nenhuma — sem configuração de serviço externo. Único item pendente é HUMAN-UAT (`04-HUMAN-UAT.md#uat-04-01`) que será criado pelo plano 04-05; não bloqueia conclusão deste plano.

## Prontidão para Próxima Fase

Pronto para os planos 04-02..04-05 desta fase:

- **04-02 (DECISION-DETECTION-STRATEGY.md):** taxonomia disponível como input para decidir reativo vs pré-emptivo. Recomendação default já fundamentada (reativo via regex existente é battle-tested; pré-emptivo via headers depende de HUMAN-UAT-04-01 confirmar exposição).
- **04-03 (Protótipo classifier + fixtures):** os 6 tipos canônicos da tabela são exatamente os labels esperados no output do classifier (`type` field do D-10). Fixtures stub iniciais podem ser derivados das mensagens canônicas listadas na coluna 3 da tabela.
- **04-04 (Harness HUMAN-UAT):** UAT-04-01 herda lista explícita de itens que substituirão observações de docs (mensagem canônica org_tier; presença de headers; mapeamento RPM vs TPM textual).
- **04-05 (FINDINGS-FOR-PHASE-5.md):** os 2 gaps `partial` são entries diretos no findings doc; ponteiros para regex+linha já estão prontos para citação.

**Bloqueios:** nenhum.

## Self-Check: PASSED

Verificações executadas:
- `test -f .planning/phases/04-spike-multi-account-claude-code-detection/CLAUDE_429_TAXONOMY.md` → FOUND
- `git log --oneline -5 | grep 7554d10` → FOUND (`7554d10 docs(04-01): add CLAUDE_429_TAXONOMY.md mapping 6 quota types vs existing regex`)
- Tabela: 15 linhas com pipe (header + separator + 6 tipos + 7 linhas da tabela de headers Anthropic) — atende ≥7 do verify automated
- 13 hits dos 6 tokens de tipo (rpm_transient, tpm_transient, daily_quota, weekly_quota, org_tier, session_5h) — atende ≥6 do verify automated
- `CLAUDE_TRANSIENT_UPSTREAM_RE` presente — OK
- `CLAUDE_EXTRA_USAGE_RESET_RE` presente — OK
- Veredictos `yes`/`no`/`partial` presentes — OK
- Audit target `packages/adapters/claude-local/src/server/parse.ts` NÃO modificado — OK (verificado por `git status` limpo no audit target)

---
*Fase: 04-spike-multi-account-claude-code-detection*
*Concluída: 2026-04-26*
