---
type: human-uat
phase: 07-foundation-i18n-toggle-de-settings
status: pending
created: 2026-04-26
requirements:
  - SETTINGS-01
  - SETTINGS-03
  - SETTINGS-04
references:
  - .planning/phases/07-foundation-i18n-toggle-de-settings/07-CONTEXT.md
  - .planning/phases/07-foundation-i18n-toggle-de-settings/07-RESEARCH.md
  - .planning/phases/07-foundation-i18n-toggle-de-settings/07-VALIDATION.md
  - .planning/milestones/v1.0-phases/06-multi-projeto-polish/06-HUMAN-UAT.md
---

# Phase 7 — HUMAN-UAT (Foundation i18n + Toggle de Settings)

**Status:** pending — execução depende de operador humano em browser real com app rodando.
**Cobre requirements:** SETTINGS-01 (toggle radio render + clique muda idioma), SETTINGS-03 (default pt-BR para novo usuário), SETTINGS-04 (aplicação imediata sem reload + persistência).
**Modo:** validação visual + comportamental no browser; complementa Wave 0 automatizada (`ProfileSettings.locale-toggle.test.tsx` 2/2 GREEN, `auth-routes-locale.test.ts` 3/3 GREEN, `middleware-locale.test.ts` 3/3 GREEN, `init.test.ts` 3/3 GREEN, `missing-keys.test.ts` 1/1 GREEN).
**Decisão fonte:** Plano 07-05 Task 3 (`.planning/phases/07-foundation-i18n-toggle-de-settings/07-05-PLAN.md`).
**Precedente:** Phase 3 plan 03-04 (TEAM-04), Phase 4 plan 04-05 (SPIKE-04/05), Phase 5 plan 05-08 (UAT-05-01), Phase 6 plan 06-05 (UAT-06-01) — `complete-with-pending-UAT`.

## Visão geral

Este arquivo registra UATs (User Acceptance Tests) que requerem operador humano em browser. A automação Wave 0 cobre as invariantes técnicas (render dos radios, ordering Pitfall 3 do `await i18n.changeLanguage` antes do `setQueryData`, persistência via PATCH `/api/auth/profile`, fallback de locale no servidor). O que NÃO é automatizável e fica para o operador:

- **UAT-07-01:** Hot-swap visível ao olho — header, sidebar, todos os labels driven por `t()` mudam INSTANTÂNEAMENTE sem reload, sem flicker das chaves cruas. Persistência cross-reload e cross-logout/login.
- **UAT-07-02:** Default pt-BR percebido por novo usuário — primeira tela após signup já vem em português (não precisa abrir o toggle).

Status `pending` significa que a Phase 7 fecha como `complete-with-pending-UAT` — artefatos entregues, validação humana pendente.

## Status

| UAT | Requisitos cobertos | Status | Verificado em | Notas |
|-----|---------------------|--------|---------------|-------|
| UAT-07-01 | SETTINGS-01, SETTINGS-04, SETTINGS-02 (side-effect) | pending | — | Hot-swap + persistência cross-reload + cross-logout/login |
| UAT-07-02 | SETTINGS-03 | pending | — | Default pt-BR para novo usuário |

## UAT-07-01 — Hot-swap + persistência

**Cobre:** SETTINGS-01 (toggle render), SETTINGS-04 (aplicação imediata), SETTINGS-02 (persistência cross-session — side-effect de Plan 02 + Plan 04 já validado por automação, mas confirmamos perceptualmente aqui).

### Pré-requisitos

1. App rodando localmente: `pnpm dev` (ou comando equivalente que sobe servidor + UI Vite).
2. Conta Better Auth existente com sessão ativa (operador já logado ou pode logar com credenciais conhecidas).
3. Browser Chromium-based (Chrome / Edge / Brave) ou Firefox em modo desktop.

### Passos

1. Abra o browser e navegue para a URL do app local (tipicamente `http://localhost:5173` ou similar).
2. Faça login com um usuário existente.
3. Navegue para `/instance/settings/profile`.
4. Localize a seção **Language / Idioma** (abaixo do form de Profile).
5. Confirme que ambos os radios estão visíveis:
   - "Português (Brasil)"
   - "Inglês (Estados Unidos)"
6. Confirme que o radio atualmente marcado corresponde ao seu locale salvo (default `pt-BR` para usuários sem escolha explícita).
7. **Clique no radio en-US.**
8. **Verifique:** o título da seção (`"Language"`), a descrição da seção, e qualquer outra string driven por `t()` mudam INSTANTÂNEAMENTE para inglês — SEM full page reload, SEM flicker mostrando chaves cruas (`settings:language.title` aparecendo brevemente).
9. **Recarregue a página (F5 ou Ctrl+R).**
10. **Verifique:** en-US persiste — labels permanecem em inglês após reload (prova que PATCH foi persistido no DB e que session hydration via Plan 05 useEffect sincronizou `i18n.language` com `session.user.locale`).
11. Volte o radio para pt-BR (clique no radio pt-BR).
12. Faça logout.
13. Faça login novamente com o mesmo usuário.
14. **Verifique:** pt-BR está selecionado e labels renderizam em português (prova persistência + hydration end-to-end).

### Critérios pass/fail

| Dimensão | Pass | Fail |
|----------|------|------|
| Radios renderizam | 2 radios visíveis com nomes corretos | Apenas 1 radio, ou nomes errados, ou seção ausente |
| Marcação inicial | Radio do locale salvo está marcado | Nenhum marcado, ou marcado errado |
| Hot-swap em-US | Strings mudam instantaneamente sem reload | Reload necessário, ou flicker, ou strings cruas (`ns:key`) visíveis |
| Persistência cross-reload | en-US permanece após F5 | Volta para pt-BR após reload |
| Persistência cross-session | pt-BR permanece após logout/login | Volta para algum default ou perde escolha |
| Sem console errors | DevTools console limpo durante toggle | Erros tipo "no i18n instance found", network 4xx/5xx no PATCH |

### Como reportar

- **Aprovado:** edite este arquivo, marque `status: passed` na linha correspondente da tabela em #Status, anote `Verificado em: YYYY-MM-DD por <quem>` e qualquer comportamento notável (ex: latência percebida do hot-swap).
- **Falha:** anote o sintoma exato, browser, console errors. Cole screenshot se possível. Roteie para `/planejar-fase --gaps` com referência a este UAT.

## UAT-07-02 — Default pt-BR para novo usuário

**Cobre:** SETTINGS-03 (default `pt-BR` em novos usuários a nível de DB e i18next).

### Pré-requisitos

1. App rodando localmente.
2. Capacidade de criar uma conta nova (signup habilitado, ou credencial de admin para criar via flow alternativo).

### Passos

1. Abra o app em uma aba anônima/incognito (sem session prévia).
2. Faça signup de um usuário NOVO (email único, nunca usado antes neste DB).
3. Após o signup, **observe a primeira tela autenticada** (dashboard, inbox, ou qualquer tela inicial).
4. **Verifique:** strings driven por `t()` renderizam em pt-BR (NÃO en-US) — ex: navegação, breadcrumbs, mensagens vazias.
5. Navegue para `/instance/settings/profile`.
6. Confirme que o radio **pt-BR** está selecionado por padrão (não en-US).
7. **(Sanity opcional)** Abra DevTools → Network → reproduza um request `/api/auth/get-session` ou recarregue. Confirme que o response inclui `locale: "pt-BR"`.

### Critérios pass/fail

| Dimensão | Pass | Fail |
|----------|------|------|
| Primeira tela renderiza | pt-BR | en-US (ou misturado) |
| Radio default em /profile | pt-BR marcado | en-US marcado, ou nenhum |
| Session payload | `locale: "pt-BR"` | `null`/`undefined`/`"en-US"` |

### Como reportar

Mesmas regras de UAT-07-01.

## Sinal de retomada

Quando ambos os UATs forem executados pelo operador:

- **Ambos pass:** edite os campos `status:` em #Status para `passed`; o orquestrador pode então fechar a fase como `complete` (ou manter `complete-with-pending-UAT` se algum outro UAT do milestone permanecer aberto). Tipicamente o operador escreve "aprovado" no chat para destravar `/transition`.
- **Algum fail:** mantenha `status: pending` no UAT que falhou, anote o symptom, e roteie para `/planejar-fase 07 --gaps` (ou abra issue com label `phase-7-uat-fail`).

## Por que este formato

Segue precedente das Phases 3-6 (Modo HUMAN-UAT é o vocabulário canônico do projeto para validações que SQL/CI/automação não cobrem). Frontmatter consistente com `06-HUMAN-UAT.md` para que ferramentas de roadmap possam parsear. Os critérios pass/fail são tabulados para que o reporting seja objetivo (não "funcionou ok" subjetivo).

---
*Phase: 07-foundation-i18n-toggle-de-settings*
*Created: 2026-04-26 (Plan 07-05 Task 3)*
