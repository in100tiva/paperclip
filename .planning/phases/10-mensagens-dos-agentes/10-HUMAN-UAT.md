---
phase: 10-mensagens-dos-agentes
type: human-uat
status: pending
requirements: [AGENT-MSG-01, AGENT-MSG-02, AGENT-MSG-03, AGENT-MSG-04]
created: 2026-04-27
---

# Phase 10 — Human UAT (Mensagens dos Agentes ao Usuário)

Visual UI verification artifacts for Phase 10. All UATs are non-blocking
validation routed to operator post-merge (precedent: Phases 3-9
`complete-with-pending-UAT` closure mode).

3 UATs cover the 4 phase requirements (AGENT-MSG-01..04). Code-level
verification already complete via vitest probes + missing-keys detector +
typecheck baseline. UATs validate the perceptual UI surface end-to-end.

---

## UAT-10-01 — Painéis de agente 100% pt-BR (AGENT-MSG-01 + AGENT-MSG-03)

**Pre-conditions:**
- pt-BR ativo (settings → idioma → Português Brasil → reload).
- Pelo menos 1 empresa registrada com 1+ agente(s) configurados.

**Steps:**
1. Login → settings → garantir idioma = pt-BR.
2. Abrir `/agents` (listagem).
3. Varredura visual: breadcrumb "Agentes", filtros tabs "Todos / Ativo /
   Pausado / Erro", botão "Novo agente", contagem de agentes em pt-BR
   ("3 agentes ativos / 1 pausado").
4. Abrir um agente em `/agents/{ref}/dashboard`.
5. Header: nome do agente, role traduzida (Engenheiro / Designer /
   Pesquisador / Geral conforme caso; CEO/CTO/PM/QA/DevOps siglas idênticas),
   status badge (Ativo / Pausado / Em execução / Com erro / Aguardando
   aprovação / Terminado), action buttons (Atribuir tarefa, Executar
   heartbeat / agora, Pausar, Retomar), Live badge "ao vivo".
6. Tabs: Painel / Instruções / Configuração / Execuções / Orçamento.
7. Properties panel: Status / Função / Cargo / Adaptador / Sessão /
   Último erro / Último heartbeat / Reporta a / Criado em.
8. More menu: Copiar ID do agente / Reiniciar sessões / Excluir agente.
9. Abrir tab Configuração — form labels e tooltips em pt-BR (32 chaves
   de help dictionary cobertas).
10. Voltar para `/agents` → clicar "Novo agente" → dialog "Adicionar novo
    agente" + recomendação CEO + advanced flow.

**Pass criteria:**
- Zero string em inglês visível em qualquer tela acima.
- Toggle pt-BR ↔ en-US devolve UI imediatamente para inglês (sem reload).
- Plurais funcionam (singular vs plural de "execução"/"agente"/etc.).

**Failure paths:**
- String inglesa hardcoded → criar issue label `i18n-gap` com print + caminho
  do componente. Fix em fase futura ou Phase 11 cleanup.
- Plural quebrado → verificar i18next `_one`/`_other` chaves no JSON.

---

## UAT-10-02 — Run summaries 100% pt-BR (AGENT-MSG-02)

**Pre-conditions:**
- pt-BR ativo.
- Empresa com agentes que produziram pelo menos 1 run (sucesso, falha
  e/ou cancelamento).

**Steps:**
1. pt-BR ativo.
2. Abrir agente com runs em `/agents/{ref}/runs`.
3. Abrir um run específico:
   - Transcript labels: "Em execução / Concluído / Com erro / Falhou /
     Falhou com código de saída {N} / Aguardando resultado /
     Entrada / Resultado / Recolher detalhes / Expandir detalhes".
   - Plurais: "X linhas de log", "Y mensagens do sistema",
     "Z comandos executados".
   - Aria-labels (testar via screen reader ou inspector): "Recolher /
     Expandir detalhes da ferramenta / comando / saída padrão".
4. Abrir uma issue com `IssueRunLedger` ativo:
   - "Registro de execuções", "Trabalho derivado", "Execução mais recente".
   - Sumários: "X ativos, Y concluídos, Z cancelados" / "todos N terminais
     ({{done}} concluídos, {{cancelled}} cancelados)".
   - "+N a mais" plural funciona.
5. Abrir issue com live run ativo — `LiveRunWidget`:
   - Título "Execuções ao vivo".
   - Subtítulo "Usa a superfície de chat compartilhada da atividade da tarefa.".
   - Botões "Parar / Parando…", "Abrir execução".
6. RunChatSurface emptyMessage: "Aguardando saída da execução…" /
   "Nenhuma saída de execução capturada.".

**Pass criteria:**
- Zero string em inglês nas superfícies acima.
- Interpolação `{{code}}` em "Falhou com código de saída 127" funciona
  end-to-end com payload real.
- Toggle pt-BR ↔ en-US devolve para inglês imediatamente.

**Failure paths:**
- String inglesa → criar issue `i18n-gap` com componente exato.
- Interpolação não substitui `{{code}}` → verificar se o callsite passa
  `t(key, { code })` corretamente.

---

## UAT-10-03 — Toasts de eventos de agente em pt-BR (AGENT-MSG-04)

**Pre-conditions:**
- pt-BR ativo.
- Board com 1+ agentes ativos capazes de produzir eventos.

**Steps:**

### Setup
1. Login → settings → idioma pt-BR.
2. Garantir agente em estado `running` ou `idle` (capaz de spawnar run).

### Provoking toasts

3. **Run failed toast:** Provocar uma falha — terminar agente durante
   run, ou esperar timeout, ou usar agente com config inválida.
   - Esperado: toast "Execução de {nome} falhou" com body opcional
     "Gatilho: {detalhe}" ou erro do servidor; action label "Ver execução".

4. **Run timed out toast:** Aguardar timeout (config curta para teste).
   - Esperado: toast "Execução de {nome} expirou".

5. **Run cancelled toast:** Cancelar run em andamento via UI.
   - Esperado: toast "Execução de {nome} cancelada".

6. **Agent error toast:** Provocar erro no agente (ex: credencial inválida).
   - Esperado: toast "{nome} com erro" com body do agent.title; action
     label "Ver agente".

7. **Activity issue.created toast:** Outro usuário/agente cria issue na
   mesma company.
   - Esperado: toast "{actor} criou {ref}"; action label "Ver {ref}".

8. **Activity issue.updated toast:** Outro usuário/agente atualiza issue.
   - Esperado: toast "{actor} atualizou {ref}".

9. **Activity issue.comment_added toast:** Outro usuário/agente comenta
   em uma issue.
   - Esperado: toast "{actor} comentou em {ref}".

10. **Join request toast:** Convidar agente externo OU human para entrar.
    - Esperado: toast "Um agente quer entrar" OU "Alguém quer entrar"
      + body "Uma nova solicitação de entrada aguarda aprovação."
      + action "Ver inbox".

### Activity log (entries de agente)

11. Abrir activity log de agente / company.
    - Verb traduzido: "criou / atualizou / pausou / retomou / terminou /
      trocou conta Claude / orçamento atualizado / sessão de runtime
      reiniciada / heartbeat invocado / heartbeat cancelado".

### Watchdog + Save (tarefa 2 isolated toasts)

12. **AgentDetail Save failed toast:** Editar configuração do agente com
    valor inválido + Salvar → erro do server.
    - Esperado: toast "Falha ao salvar" + body do erro do server.

13. **IssueRunLedger Watchdog toast:** Em uma issue com run ativo, tentar
    aprovar/rejeitar uma decisão do watchdog que falha.
    - Esperado: toast "Decisão do watchdog não registrada" + body do erro.

### Pitfall 2 — language no-reconnect

14. Em uma sessão com socket WebSocket conectado (board com live updates):
    - Trocar idioma pt-BR → en-US via settings.
    - Verificar que NÃO aparece banner "Reconectando…" ou warning de
      desconexão.
    - Próximo evento live (ex: outra pessoa criando issue) chega como toast
      em inglês imediatamente — ou seja, `t` mudou MAS o socket continuou.

**Pass criteria:**
- Todos os 13 cenários renderizam toast em pt-BR sem string inglesa
  visível no title ou action.label.
- Body preserva mensagens dinâmicas (`agent.title`, `error message do
  servidor`, `triggerDetail`) — não traduzidas, conforme contrato
  (Pitfall RESEARCH §Anti-Patterns).
- Step 14 demonstra que a troca de idioma NÃO desconecta o socket.
- Toggle pt-BR ↔ en-US devolve toasts de novos eventos para inglês
  imediatamente.

**Failure paths:**
- Toast renderiza title em inglês (`X errored` em vez de `X com erro`)
  → bug no builder; rebuild + check t() callsite.
- Body tenta traduzir `agent.title` — não deveria; preservar valor original.
- Banner "Reconectando" aparece após language change → bug Pitfall 2;
  verificar que useEffect do socket NÃO inclui `t` ou `tRef` em deps.

---

## Routing notes

- Para fechamento `complete-with-pending-UAT`, todas as 3 UATs ficam
  pending até que operador valide visualmente em browser real
  (precedente Phases 3-9).
- Se uma UAT falhar parcialmente, criar issues granulares com label
  `i18n-gap` ou `phase-10-followup` e referenciar cenário específico
  (UAT-10-XX step Y).
- UATs idealmente rodam em sequência durante uma única sessão de
  validação (~30-45min total).

---

*Phase: 10-mensagens-dos-agentes*
*Created: 2026-04-27*
