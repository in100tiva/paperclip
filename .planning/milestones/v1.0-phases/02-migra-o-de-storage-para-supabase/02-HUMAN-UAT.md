---
status: partial
phase: 02-migra-o-de-storage-para-supabase
source: [02-VERIFICATION.md]
started: 2026-04-25
updated: 2026-04-25
---

## Teste Atual

[aguardando teste humano cross-machine — deferido para Phase 3 TEAM-04 conforme 02-06-SUMMARY]

## Testes

### 1. Cross-machine multi-dev sign-in (Success Criterion #1)
expected: Dev A em máquina A faz signup e cria/aceita uma company; Dev B em máquina B distinta (OS install diferente, rede diferente) loga no mesmo backend Supabase e vê a mesma company sem sincronização manual. Cookie `paperclip-team-shared.session_token` deve isolar sessões por máquina mas o estado da company persiste compartilhado em `bxlczioxgizgvtznukwt`.
result: [pendente — single-machine smoke 7/7 PASS prova infra; flow cross-machine roda em Phase 3 TEAM-04 quando 5+ devs onboarding for validado]

## Resumo

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Lacunas

(nenhuma — infra está pronta; este item é validação humana adiada por decisão registrada em 02-06-SUMMARY.md)
