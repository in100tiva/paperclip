---
phase: 03-workflow-de-equipe-onboarding
type: human-uat
created: 2026-04-26
status: pending
---

# Phase 3 Human UAT — Workflow de Equipe + Onboarding

Itens que requerem execução humana real para fechar Phase 3. O executor automatizado (Claude) **não pode** validar sozinho:

- Comportamento entre duas máquinas físicas distintas com network real do Supabase
- Coordenação temporal entre dois devs reais ao mesmo tempo
- Verificação visual de UI (dashboard renderizando company corretamente em browsers reais)

Estes itens NÃO bloqueiam a entrega de artefatos da Phase 3 (docs + script existem), mas bloqueiam a marcação de **TEAM-04** como complete.

## UAT-03-01 — Smoke Cross-Machine (TEAM-04)

**Status:** `pending`

**Procedure:** Ver [CROSS-MACHINE-SMOKE.md](CROSS-MACHINE-SMOKE.md). Executar o "Procedimento Cross-Machine (canônico — D-13)".

**Acceptance:**
- Dois devs distintos em máquinas físicas distintas executam o procedimento.
- Resultado registrado no bloco "Execução 1" (ou seguinte) de CROSS-MACHINE-SMOKE.md com `PASS`.
- Cookie prefix `paperclip-team-shared` confirmado em ambos os browsers.
- Estado compartilhado: Dev B vê company/tasks criadas por Dev A sem refresh manual fora do browser.

**Fallback aceito:** Single-host (Procedimento "Fallback Single-Host" do CROSS-MACHINE-SMOKE.md), com a limitação documentada de que não prova literalmente cross-machine. Se usado fallback, marcar status como `pending-cross-machine` e re-rodar cross-machine real assim que possível.

**Quando aprovado:**
1. Atualizar `status: pending` → `status: approved`
2. Adicionar campo `approved_at: <data>` e `approved_by: <handle>`
3. Anotar ID/timestamp da execução em CROSS-MACHINE-SMOKE.md.

---

## UAT-03-02 — Cadastro de 5+ Devs Reais (TEAM-01)

**Status:** `pending`

**Procedure:** Ver [03-05-PLAN.md](03-05-PLAN.md) (plano que documenta o procedimento de bootstrap + cadastro coletivo).

**Acceptance:**
- Tabela `user` no Supabase compartilhado tem >= 5 rows.
- Todos os 5+ users são membros da mesma `company` (validável via SQL).
- Pelo menos um deles é o `bootstrap_ceo` original.
- Os demais entraram via fluxo `company_join` (não foram criados manualmente via SQL).

**SQL de validação** (executar via Supabase Studio SQL Editor):

```sql
-- Conta total de users
SELECT count(*)::int AS total_users FROM "user";

-- Membership por company
SELECT c.id AS company_id, c.name, count(cm.user_id)::int AS members
FROM company c
LEFT JOIN company_membership cm ON cm.company_id = c.id
GROUP BY c.id, c.name
ORDER BY members DESC;
```

Esperado: `total_users >= 5` e a company principal com `members >= 5`.

**Fallback parcial aceito:** Se < 5 devs reais disponíveis na janela atual, anotar contagem real (ex: "3/5 cadastrados em 2026-04-XX"), marcar status `pending-team-growth`, e re-checar quando atingir 5.

**Quando aprovado:**
1. Atualizar `status` → `approved`
2. Adicionar `approved_at: <data>` e contagem final de users
3. Capturar output da SQL acima inline aqui para histórico.

---

## Sumário

- **Total UAT items:** 2
- **Approved:** 0
- **Pending:** 2

A Phase 3 fecha como **complete-with-pending-UAT** se ambos os UATs estiverem `pending` mas todos os artefatos de Wave 1 (scripts/setup.ts, ONBOARDING.md, TROUBLESHOOTING.md) e Wave 2 (CROSS-MACHINE-SMOKE.md, este arquivo, 03-05-PLAN.md docs) estiverem entregues. Os UATs viram trabalho manual contínuo da equipe e podem ser fechados em sessões posteriores sem replanejar a fase.
