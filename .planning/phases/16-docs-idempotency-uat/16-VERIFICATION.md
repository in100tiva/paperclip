---
status: complete-with-pending-UAT
phase: 16
phase_name: Documentação & Idempotency UAT
verified_at: 2026-04-27
must_haves_total: 4
must_haves_verified: 1
human_verification_pending: 5
---

# Phase 16 Verification

## Success Criteria

1. ✓ `AGENTS-IMPORT.md` na raiz com pré-requisitos, comandos, comportamento idempotente, edição+sync, troubleshooting (3+ cenários: DATABASE_URL, company missing, mapping mismatch, zombie sessions). Documentação em pt-BR alinhada com convenção do projeto desde Phase 3.
2. ⏳ UAT manual procedure persistido em `16-HUMAN-UAT.md` com 5 cenários cobrindo idempotency, drift detection (agente + skill), CEO/INTA-1 invariants, visual UI (combinado com Phase 15).
3. ⏳ UAT cobre cenário de skill: `UAT-16-03` documentado.
4. ⏳ UAT routed para HUMAN-UAT validation com `status: pending` no frontmatter — phase fecha como `complete-with-pending-UAT` (precedente Phases 3-11 + Phase 15 v1.2).

## Files

- `AGENTS-IMPORT.md` (raiz, 130 LOC)
- `.planning/phases/16-docs-idempotency-uat/16-HUMAN-UAT.md` (5 UATs)
- `.planning/phases/16-docs-idempotency-uat/16-VERIFICATION.md` (este arquivo)

## Requirements coverage

| REQ-ID | Status |
|--------|--------|
| DOCS-01 | Complete (`AGENTS-IMPORT.md` cobre todas seções esperadas); UAT empírico routed |

## HUMAN-UAT pendentes

- UAT-16-01: Re-execução idempotente
- UAT-16-02: Drift detection em agente
- UAT-16-03: Drift detection em skill (preserva attachments)
- UAT-16-04: CEO/INTA-1 invariantes
- UAT-16-05: Visual no paperclip (badge + organograma) — combinado com UAT-15-01..02

## Verdict

**status: complete-with-pending-UAT** — documentação entregue; 5 UATs documentados em arquivo dedicado para validação humana; phase fecha seguindo precedente do milestone v1.1.
