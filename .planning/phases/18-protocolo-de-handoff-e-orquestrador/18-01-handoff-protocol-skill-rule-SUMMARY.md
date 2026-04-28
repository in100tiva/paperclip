---
plan: 18-01-handoff-protocol-skill-rule
phase: 18-protocolo-de-handoff-e-orquestrador
status: complete
wave: 1
autonomous: true
completed: 2026-04-28
---

# Plano 18-01 — Summary

## O Que Foi Construído

`skills/paperclip/rules/handoff-protocol.md` (canonical) + extensão do `skills/paperclip/SKILL.md` com seção H2 "Pipeline Handoff Protocol" referenciando a regra.

A regra define o schema canônico do `pipeline-handoff` (5 campos: `pipeline_stage`, `upstream_findings`, `decisions_made`, `artifacts_produced`, `qa_gate_status`), o endpoint de persistência (`PUT /api/issues/{issueId}/documents/pipeline-handoff`), exemplos YAML completos copiáveis e seção de anti-padrões.

## Commit

`ac7c9d3` — feat(18-01): add pipeline-handoff canonical rule + extend SKILL.md

## Requisitos
- HAND-01 (schema canônico) ✓
- HAND-02 (regra universal — emissão será aplicada em 18-03) ✓
- HAND-03 (persistência via issue_documents) ✓

## Self-Check: PASSED
