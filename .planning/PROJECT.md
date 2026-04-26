# DDD — Paperclip da Equipe

## O Que É

Fork hard do [Paperclip](https://github.com/paperclipai/paperclip) — plataforma de orquestração de agentes de IA — adaptado para nossa equipe de devs. Substitui o PostgreSQL embedded por um Supabase compartilhado, permitindo que múltiplos desenvolvedores rodem o app localmente apontando para o mesmo backend, com suporte a troca entre múltiplas contas Claude Code quando tokens se esgotam.

## Valor Central

A equipe inteira opera sobre um único estado compartilhado (Supabase remoto), e o trabalho dos agentes nunca é interrompido por limites de token de uma conta — basta trocar a conta e continuar de onde parou.

## Requisitos

### Validados

- ✓ Paperclip clonado e convertido em fork hard (sem upstream) — Fase 1 (SHA `40782f7`)
- ✓ Identidade reescrita como `ddd`, política de fork documentada (`UPSTREAM_REFERENCE.md`, `CONTRIBUTING.md`) — Fase 1
- ✓ Smoke test baseline: `pnpm install` + `pnpm dev` rodam em Windows com embedded Postgres — Fase 1

### Ativos

- [ ] Substituir PostgreSQL embedded por Supabase remoto compartilhado (projeto `bxlczioxgizgvtznukwt`)
- [ ] Estruturar schema, migrations e RLS no Supabase para o domínio do paperclip
- [ ] Manter Better Auth (auth atual do paperclip) rodando contra o Supabase Postgres — não trocar para Supabase Auth no v1
- [ ] Permitir que cada dev rode o app localmente apontando para o mesmo Supabase
- [ ] Investigar e documentar o suporte atual do paperclip a múltiplos provedores/contas de agentes
- [ ] Implementar troca de conta Claude Code com retomada do trabalho dos agentes de onde pararam
- [ ] Persistir estado dos agentes no Supabase de forma que a troca de conta não perca progresso
- [ ] Suportar múltiplos projetos rodando em paralelo no fluxo da equipe
- [ ] Documentar setup local para qualquer dev clonar o repo e começar a usar sem fricção

### Fora do Escopo

- Manter sincronização com o upstream do paperclip — escolhemos fork hard, modificamos livremente
- Hospedar uma única instância web pública do paperclip — cada dev roda local
- Supabase isolado por dev — todos compartilham o mesmo backend
- Migrar para Supabase Auth no v1 — Better Auth do paperclip funciona perfeitamente contra Postgres do Supabase, migração pode vir em milestone futuro
- OAuth (Google/GitHub) no v1 — Better Auth email/senha herdado do paperclip é suficiente para começar
- Mobile app — paperclip é web, mantemos web

## Contexto

- **Origem:** Paperclip é um projeto open-source (Node.js + React + TypeScript, 97.8% TS) que orquestra agentes de IA (Claude Code, Codex, Cursor, OpenClaw) como se fossem funcionários de uma empresa — gerencia org chart, tarefas, orçamento, governança.
- **Storage atual do paperclip:** PostgreSQL com instância embedded auto-criada para dev local. Precisamos substituir por Supabase remoto.
- **Supabase target:** projeto `bxlczioxgizgvtznukwt` (já criado pelo usuário antes do início).
- **Equipe:** 5+ devs trabalhando em múltiplos projetos paralelos. Cada dev pode ter mais de uma conta Claude Code para contornar limites de token.
- **Diretório atual:** `d:\projetos\ddd` — vazio (greenfield no FS), git recém-inicializado. O fork será clonado para dentro deste repo.

## Restrições

- **Stack de tecnologia**: Manter Node.js + React + TypeScript do paperclip — não reescrever em outra linguagem
- **Banco de dados**: Supabase (Postgres gerenciado) — único backend de estado para a equipe
- **Auth**: Better Auth (mantido do paperclip) — schema persiste no Supabase Postgres, sem trocar para Supabase Auth
- **Deploy**: Cada dev roda local, sem servidor central web
- **Compartilhamento de estado**: Todos os devs compartilham o mesmo projeto Supabase (`bxlczioxgizgvtznukwt`)

## Decisões Chave

| Decisão | Justificativa | Resultado |
|---------|---------------|-----------|
| Fork hard (sem upstream) | Liberdade para customizar profundamente sem custo de merge contínuo | ✓ Boa — Fase 1 confirmou `pnpm dev` funcional pós-corte |
| Supabase remoto compartilhado | Estado único da equipe, qualquer dev em qualquer máquina vê o mesmo | — Pendente |
| Local-first + Supabase remoto | Evita custo/complexidade de hospedar instância única; cada dev tem ambiente próprio mas estado central | — Pendente |
| Manter Better Auth, Supabase só como Postgres | Schemas Better Auth (text id) incompatíveis com `auth.users` (uuid); migração HIGH effort sem ganho v1 | — Pendente |
| RLS opcional no v1 | Sem `auth.uid()` resolúvel (Better Auth ≠ Supabase Auth); autorização aplicacional via membership por company_id; service-role key no servidor | — Pendente |

## Evolução

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-26 after Phase 1 completion*
