# Setup em Nova Máquina — DDD Paperclip da Equipe

> **Quando usar este doc:** você já configurou DDD numa máquina e quer levar a configuração para outra (notebook novo, troca de PC, segundo computador). O estado da empresa `in100tiva` (agentes, skills, issues, hierarquia) vive no Supabase compartilhado — você não precisa recriar nada lá. Só precisa que a nova máquina rode o app e fale com o mesmo Supabase.
>
> **Tempo estimado:** 15-30 minutos.
>
> **Cenário base deste doc:** você vai levar os dois arquivos `.env` num pendrive da máquina antiga.

## 1. O que pegar no pendrive antes de sair da máquina antiga

Copia **dois arquivos** pro pendrive:

| Arquivo no pendrive | Origem na máquina antiga |
|---------------------|--------------------------|
| `env-local.txt` | `D:\projetos\ddd\.env.local` |
| `paperclip-env.txt` | `D:\projetos\ddd\.paperclip\.env` |

> Renomeei pra `.txt` no pendrive porque o Windows às vezes esconde/protege arquivos `.env`. Você renomeia de volta na máquina nova.

**Comandos na máquina antiga** (PowerShell):

```powershell
# Plug o pendrive primeiro. Suponha que aparece como E:\
Copy-Item D:\projetos\ddd\.env.local           E:\env-local.txt
Copy-Item D:\projetos\ddd\.paperclip\.env      E:\paperclip-env.txt
```

Esses arquivos contêm `DATABASE_URL`, `BETTER_AUTH_SECRET`, e outras chaves. **Não compartilhe o pendrive com terceiros**, apague os arquivos depois que copiou pra máquina nova.

## 2. Pré-requisitos na máquina nova

Instale, na ordem:

1. **Git** — [git-scm.com](https://git-scm.com/download)
2. **Node.js 20+** — [nodejs.org](https://nodejs.org) (LTS atual)
3. **pnpm 9.15.4+** — via corepack (já vem com o Node):
   ```bash
   corepack enable
   corepack prepare pnpm@9.15.4 --activate
   ```
4. **Claude Code CLI** — [docs.claude.com/en/docs/claude-code/setup](https://docs.claude.com/en/docs/claude-code/setup)
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude --version    # deve responder
   claude /login       # autentica sua conta
   ```

Verificação rápida (todos devem responder com versão):

```bash
git --version
node --version    # >= 20
pnpm --version    # >= 9.15.4
claude --version
```

## 3. Clonar o repositório

```bash
# Linux/macOS — clone num diretório raso (caminhos longos do Windows não dão problema)
git clone <url-do-repo-ddd> ddd
cd ddd

# Windows — recomendado clonar em D:\ ou C:\projetos\ pra evitar limite de path
git clone <url-do-repo-ddd> D:\projetos\ddd
cd D:\projetos\ddd
```

> **Url do repo:** se ainda não tiver, peça pro time. Tipicamente algo como `https://github.com/in100tiva/ddd.git`.

## 4. Levar os `.env` do pendrive

Plug o pendrive (suponha que aparece como `E:\` no Windows ou `/Volumes/PEN` no macOS):

**Windows (PowerShell):**

```powershell
Copy-Item E:\env-local.txt       D:\projetos\ddd\.env.local
New-Item -ItemType Directory -Force D:\projetos\ddd\.paperclip | Out-Null
Copy-Item E:\paperclip-env.txt   D:\projetos\ddd\.paperclip\.env
```

**Linux/macOS:**

```bash
cp /media/$USER/PENDRIVE/env-local.txt        ./.env.local
mkdir -p .paperclip
cp /media/$USER/PENDRIVE/paperclip-env.txt    ./.paperclip/.env
```

Verifica que os dois arquivos estão lá:

```bash
ls -la .env.local .paperclip/.env
```

> Os dois estão no `.gitignore` — git não vai commitar.

## 5. Instalar dependências

```bash
pnpm install
```

Isso baixa ~500MB de packages e demora 3-7 minutos na primeira vez. Reusa cache em runs seguintes.

> Se travar com erros de file lock no Windows: feche VSCode/Cursor/qualquer editor que esteja com a pasta aberta, mata `node.exe` zumbis no Gerenciador de Tarefas, tenta de novo. Mais detalhes em [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## 6. Validar o ambiente com `pnpm setup`

```bash
pnpm setup
```

O script checa em ordem (fail-fast):

| # | Check | Se falhar |
|---|-------|-----------|
| 1 | Node ≥ 20 | Instala Node 20+ |
| 2 | pnpm ≥ 9.15.4 | `corepack prepare pnpm@9.15.4 --activate` |
| 3 | `.env.local` existe | Volta no passo 4 |
| 4 | Vars críticas preenchidas | Confere que copiou direito do pendrive |
| 5 | `claude` CLI no PATH | Warning, não fatal — instala se quiser |
| 6 | Ping Supabase via `DATABASE_URL` | Verifica `DATABASE_URL` no `.env.local` |
| 7 | Schema Better Auth aplicado | DB existe — esse passo deve passar (já está aplicado no Supabase compartilhado) |

Se tudo passou, segue. Se algo falhou, o output mostra exatamente o que corrigir.

## 7. Re-sincronizar skills (atualizar paths absolutos)

A tabela `company_skills` no Supabase guarda paths absolutos para os SKILL.md no FS local. Como você mudou de máquina, esses paths apontam pra `D:\projetos\ddd\...` da máquina antiga, que não existe na nova.

Roda uma vez:

```bash
# Linux/macOS
export $(grep -E "^DATABASE_URL=" .paperclip/.env | xargs)
pnpm sync-skills

# Windows (PowerShell) — duas linhas
Get-Content .paperclip\.env | Where-Object { $_ -match "^DATABASE_URL=" } | ForEach-Object { $env:DATABASE_URL = $_.Split('=',2)[1] }
pnpm sync-skills
```

Output esperado: `Updated: 3` (paperclip, company-creator, design-guide com path novo) + `Unchanged: 17` (attachments dos agentes não mudam — só os paths das skills).

> **Não precisa rodar `pnpm sync-agents` de novo** — agentes não têm path local; o sync deles é puramente metadado.

## 8. Subir o servidor

```bash
pnpm dev
```

Espera o banner de boot do paperclip:

```
██████╗  █████╗ ██████╗ ███████╗██████╗  ██████╗██╗     ██╗██████╗
██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔════╝██║     ██║██╔══██╗
...
Server     3100
API        http://127.0.0.1:3100/api
UI         http://127.0.0.1:3100
Database   postgresql://postgres.bxlczioxgizgvtznukwt:***@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
Migrations already applied
```

Abre `http://127.0.0.1:3100` no Chrome. Você verá a tela de login.

## 9. Login

Se você já tinha um user na máquina antiga, **use o mesmo email/senha**. A autenticação roda contra o Supabase compartilhado, então sua conta já existe.

Se quiser criar user novo: clica em "Sign up", preenche, e o paperclip te associa automaticamente à empresa ativa (in100tiva) se você for admin.

## 10. Verificação final — você deve ver:

Na sidebar:

- **Empresa selecionada:** `in100tiva` (logo esquerdo superior)
- **Agentes** (sub-seção): 18 framework agents importados (Planner, Executor, Verifier, User Profiler, Roadmapper, etc.) + CEO + CTO pré-existentes
- **Organização** (sub-seção): clique → vê árvore CEO → 4 Heads (Planner/Executor/Verifier/User Profiler) → 14 specialists abaixo
- **Skills** (sub-seção): 7 skills (3 framework_local + 4 paperclip-bundled)
- **Tarefas** → INTA-1 (issue inicial criada na primeira sessão)

Em qualquer perfil de agente importado: badge **Serial** (amarelo) / **Parallel** (verde) / **Gate** (roxo) próximo ao nome.

## Arquivos NÃO precisam de pendrive (já estão no git)

Estão versionados no repositório, vão clonados:

- `.claude/agents/*.md` — 18 prompts dos agentes do framework
- `.claude/skills/{paperclip,company-creator,design-guide}` — pointers e diretórios de skills
- `skills/paperclip/`, `.agents/skills/company-creator/` — conteúdo das skills
- `scripts/sync-agents/` — scripts `pnpm sync-agents` e `pnpm sync-skills`
- `AGENTS-IMPORT.md` — doc operacional de import
- `package.json`, código fonte, etc.

## Atalho — script de bootstrap completo

Cola tudo num único bloco se quiser ir rápido (Linux/macOS):

```bash
# Pré-req: pendrive montado em /media/$USER/PENDRIVE; node 20+, pnpm 9.15.4+ instalados
git clone <url-repo> ddd && cd ddd
cp /media/$USER/PENDRIVE/env-local.txt .env.local
mkdir -p .paperclip
cp /media/$USER/PENDRIVE/paperclip-env.txt .paperclip/.env
pnpm install
pnpm setup
export $(grep -E "^DATABASE_URL=" .paperclip/.env | xargs)
pnpm sync-skills
pnpm dev
```

Windows PowerShell equivalente:

```powershell
git clone <url-repo> D:\projetos\ddd
cd D:\projetos\ddd
Copy-Item E:\env-local.txt .env.local
New-Item -ItemType Directory -Force .paperclip | Out-Null
Copy-Item E:\paperclip-env.txt .paperclip\.env
pnpm install
pnpm setup
Get-Content .paperclip\.env | Where-Object { $_ -match "^DATABASE_URL=" } | ForEach-Object { $env:DATABASE_URL = $_.Split('=',2)[1] }
pnpm sync-skills
pnpm dev
```

## Troubleshooting comum

### "DATABASE_URL not set" no `pnpm setup`

`.env.local` não foi copiado direito do pendrive ou está com nome errado. Verifica:

```bash
cat .env.local | grep -E "^DATABASE_URL="
```

Deve printar a linha. Se vazio, recopia do pendrive.

### `pnpm dev` boot crash com `canceling statement due to statement timeout`

Conexão fria com o Supavisor pooler do Supabase às vezes estoura `statement_timeout` (120s) na primeira tentativa. **Solução:** roda `pnpm dev` de novo. Quase sempre boota na segunda tentativa.

### `pnpm dev` sobe mas browser fica em "Loading..."

Pool de conexão Postgres exhausted. Possíveis causas:
- Sessão Postgres zumbi presa em `ClientRead` (bug arquitetural do paperclip ao spawnar agentes Claude Code).
- Múltiplos `pnpm dev` rodando em paralelo.

Mata todos os `node.exe` (Gerenciador de Tarefas → finalizar processos), espera 5s, roda `pnpm dev` de novo.

Mais cenários em [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

### Agentes aparecem mas o claude CLI não acha o prompt quando você manda uma issue

Confere que `.claude/agents/*.md` existe no repo clonado:

```bash
ls .claude/agents/ | wc -l    # deve ser 18
```

Se for 0, o clone do git está incompleto. Re-clone.

### Organograma vazio mas `pnpm sync-agents` reportou success na máquina antiga

O sync na máquina antiga modificou o Supabase compartilhado. A nova máquina só precisa LER. Se o organograma vazio:
1. Verifica que você está logado na empresa certa (in100tiva no seletor superior).
2. Refresh com Ctrl+Shift+R.
3. Confere via SQL no Supabase:
   ```sql
   SELECT count(*) FROM agents
   WHERE company_id = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6';
   -- esperado: 20 (1 CEO + 1 CTO + 4 Heads + 14 specialists)
   ```

## Referência — arquivos de doc relacionados

- [ONBOARDING.md](ONBOARDING.md) — onboarding original do dev novo (caso primeira instalação na vida)
- [AGENTS-IMPORT.md](AGENTS-IMPORT.md) — como editar agentes/skills do framework e re-sincronizar
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — problemas conhecidos (Windows NTFS, claude CLI ausente, schema desatualizado, etc.)
- [CONTRIBUTING.md](CONTRIBUTING.md) — política do hard fork
- [CROSS-MACHINE-SMOKE.md](CROSS-MACHINE-SMOKE.md) — smoke E2E cross-máquina (caso queira validar que dois devs em máquinas diferentes veem o mesmo estado)

---

**Dúvida que sobrou? Cola no canal interno do time. Se for um problema novo, abre issue documentando pra próxima pessoa.**
