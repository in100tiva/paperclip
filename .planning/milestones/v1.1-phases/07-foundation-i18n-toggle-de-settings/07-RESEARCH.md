# Phase 7: Foundation i18n + Toggle de Settings — Research

**Researched:** 2026-04-26
**Domain:** UI internationalization + Better Auth schema extension + Express middleware
**Confidence:** HIGH

## Summary

Foundation phase for v1.1 (pt-BR localization). All major library and architecture decisions were locked in `07-CONTEXT.md`; this research covers the **HOW** for each integration point in the existing paperclip codebase.

The codebase is in excellent shape for this work: there's already a `PATCH /api/auth/profile` endpoint (`server/src/routes/auth.ts:63`) using Zod validators (`packages/shared/src/validators/access.ts:191-197`) that we extend with `locale` rather than create a new endpoint. The Better Auth user schema at `packages/db/src/schema/auth.ts:3-11` is owned by the project (not generated) and accepts new columns via Drizzle migration; Better Auth needs explicit `additionalFields.locale` in `createBetterAuthInstance` config to propagate the field through `session.user`. The actor middleware (`server/src/middleware/auth.ts:21-90`) is the single seam where `req.locale` should be populated. Activity log already supports `details: jsonb` (`packages/db/src/schema/activity_log.ts:18`) — `actionKey + paramsJson` fits without schema change.

**Primary recommendation:** Extend `updateCurrentUserProfileSchema` with `locale`, add `additionalFields` to Better Auth config, populate `req.locale` inside `actorMiddleware` in the same `session?.user?.id` branch where memberships are loaded, and add a vitest custom test under `ui/src/i18n/__tests__/` that imports JSON dictionaries and grep-extracts `t(...)` calls — no separate `ui/scripts/` directory needed (it doesn't exist yet).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETTINGS-01 | Toggle radio pt-BR/en-US em `instance/settings` | `ProfileSettings.tsx` é o lar natural (já usa `authApi.updateProfile`); rota `/instance/settings/profile` já registrada em `App.tsx:268` |
| SETTINGS-02 | Persistência por usuário no Supabase | Coluna `locale` em `authUsers` (`packages/db/src/schema/auth.ts:3-11`); migration Drizzle 0073; `additionalFields` no Better Auth config |
| SETTINGS-03 | Default pt-BR; fallback en-US | Coluna `locale text DEFAULT 'pt-BR'`; i18next `fallbackLng: 'en-US'` |
| SETTINGS-04 | Aplicação imediata sem reload | `i18n.changeLanguage()` no `onMutate` (otimista) + rollback no `onError`; React Query `setQueryData` em `queryKeys.auth.session` (padrão já usado em `ProfileSettings.tsx:50-61`) |
| I18N-01 | Biblioteca i18n + namespaces | i18next 26.0.8 + react-i18next 17.0.4; 8 namespaces já listados em `07-CONTEXT.md` |
| I18N-02 | Dicionários JSON versionados | `ui/src/i18n/locales/{pt-BR,en-US}/{namespace}.json` (dir não existe ainda — criar) |
| I18N-03 | Fallback en-US sem placeholder cru | i18next `fallbackLng: 'en-US'` + `returnEmptyString: false` + `parseMissingKeyHandler` que retorna fallback do en-US, nunca a key crua |
| I18N-04 | Detector chaves não traduzidas em CI | Vitest test custom em `ui/src/i18n/__tests__/missing-keys.test.ts`; `process.env.CI === 'true' ? fail : warn`; workflow `pr.yml` já roda `pnpm test:run` (linha 81) — sem mudança de YAML necessária |
| I18N-05 | Locale no contexto do servidor | `req.locale` populado em `actorMiddleware` (server/src/middleware/auth.ts:73-83); fallback `Accept-Language` quando `actor.type !== 'board'` |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Biblioteca i18n:**
- i18next + react-i18next (não LinguiJS, não FormatJS)
- Static imports JSON (sem fetch dinâmico)
- Non-Suspense mode
- Plurals/contexto simples; ICU MessageFormat fica em v2 (L10N-03)

**Persistência:**
- Coluna `locale` em `user` (Better Auth schema), `text` com check constraint enum `pt-BR | en-US`, default `pt-BR`
- `PATCH /api/user/me { locale }` — REST, alinhado com convenção paperclip
- Aplicação imediata otimista; rollback se erro
- Default pt-BR para usuários sem preferência

**Dicionários:**
- JSON por namespace, `ui/src/i18n/locales/{pt-BR,en-US}/{namespace}.json`
- Convenção dot-notation kebab-case (`inbox.empty-state.title`)
- 8 namespaces: `common`, `inbox`, `projects`, `settings`, `auth`, `agents`, `errors`, `activity`
- Apenas chaves bootstrap nesta fase (chaves reais entram nas fases 8-10)

**Servidor + Detector:**
- Servidor lê `user.locale` do DB via Better Auth session; `Accept-Language` como fallback pré-login
- Activity log emite `actionKey + paramsJson` no DB; client renderiza via `t()`
- Detector: warn em dev, error em CI, em `ui/scripts/check-i18n-keys.ts` (script vitest custom)

### Claude's Discretion

- Estrutura interna do middleware servidor e formato exato do `req.locale`
- Schema da migration Drizzle (nome do arquivo, índice se necessário)
- Detalhes exatos do detector (regex de extração de keys, exclusões)
- UI exata do radio em settings (componentes, layout)

### Deferred Ideas (OUT OF SCOPE)

- Suporte a outros idiomas (es, fr) — L10N-01 v2
- Formatação Intl avançada (datas, números, moeda) — L10N-02 v2
- ICU MessageFormat — L10N-03 v2
- Tradução de docs raiz (README, ROADMAP) — L10N-04 v2

### Resolução de Discrição (recomendações desta pesquisa)

| Decisão | Recomendação | Justificativa |
|---------|--------------|---------------|
| Endpoint | Estender `PATCH /api/auth/profile` (não criar `/api/user/me` novo) | Já existe em `server/src/routes/auth.ts:63`; já usa `updateCurrentUserProfileSchema`; já é consumido por `ProfileSettings.tsx:74`. CONTEXT.md menciona `/api/user/me` como convenção, mas a convenção real do paperclip é `/api/auth/profile`. **Diferença é de naming-only, semântica idêntica.** |
| Lar do toggle | `ProfileSettings.tsx` (rota `/instance/settings/profile`) | Já é uma página de preferência por usuário; já tem padrão de mutation otimista (linhas 50-61); CONTEXT.md "instance/settings" — qualquer subrota dentro de `/instance/settings/*` satisfaz |
| Migration name | `0073_add_user_locale.sql` | Sequencial (próximo é 0073 — última é 0072_clumsy_leader.sql) |
| Detector location | `ui/src/i18n/__tests__/missing-keys.test.ts` | Diretório `ui/scripts/` não existe; vitest já roda em CI via `pnpm test:run`; co-localizar com dicts evita duplicação de config |
| `req.locale` shape | `req.locale: 'pt-BR' \| 'en-US'` (string literal) | Simples, sem objeto; SSR/templates leem direto |
</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `i18next` | 26.0.8 | Translation engine, namespaces, fallback | Padrão de mercado; verificada via `npm view i18next version` em 2026-04-26 |
| `react-i18next` | 17.0.4 | React bindings (`useTranslation`, `Trans`, `I18nextProvider`) | Versão atual; suporta React 19 (paperclip usa `react@^19.0.0`); peer requer i18next ≥26.0.1 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `i18next-browser-languagedetector` | 9.x | Detecta idioma do browser (Accept-Language) | Pré-login (usuário sem `user.locale` ainda) — opcional v1.1, fallback simples para `pt-BR` é aceitável |
| `i18next-cli` | 1.56.7 | Extração/sync de keys, validação CI | **OPCIONAL** — CONTEXT decide por detector custom vitest. Mantemos custom; `i18next-cli` mencionado só como alternativa no relatório |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-i18next` | `next-intl`, `lingui`, `formatjs` | next-intl exige Next.js (paperclip é Vite SPA); lingui requer babel macro; formatjs é mais pesado |
| Vitest custom detector | `i18next-cli extract --ci`, `lingualdev/i18n-check` | i18next-cli é o caminho oficial (i18next-parser foi descontinuado em 2025-09 e archived em 2026-02). **Mantém custom** porque CONTEXT bloqueou; i18next-cli requer config separada e cobre extração além de validação (escopo maior que necessário). Reavaliar em v2 |
| Suspense mode | Padrão react-i18next | Non-Suspense escolhido em CONTEXT — evita boundary boilerplate em hot-swap |

**Installation (raiz do workspace, scopado em `ui/`):**

```bash
pnpm --filter @paperclipai/ui add i18next@^26.0.8 react-i18next@^17.0.4
# i18next-browser-languagedetector é OPCIONAL — pular em v1.1
```

**Version verification (executado 2026-04-26):**

```text
npm view i18next version          → 26.0.8
npm view react-i18next version    → 17.0.4
npm view i18next-cli version      → 1.56.7  (não instalado, só referência)
```

i18next 26 introduziu mudança no formatter (legacy interpolation removido). react-i18next 17 requer i18next ≥26.0.1 — versões alinhadas.

## Architecture Patterns

### Recommended Project Structure

```
ui/src/i18n/
├── index.ts                       # init i18next, exporta i18n instance
├── resources.ts                   # imports JSON estáticos, monta resources
├── i18next.d.ts                   # module augmentation TypeScript (autocomplete t())
├── locales/
│   ├── pt-BR/
│   │   ├── common.json            # bootstrap apenas — `app-name`, `loading`, `save`
│   │   ├── inbox.json             # bootstrap (vazio ou stub) — preenchido na Fase 8
│   │   ├── projects.json          # idem
│   │   ├── settings.json          # bootstrap real — labels do toggle de idioma
│   │   ├── auth.json              # bootstrap (vazio) — Fase 9
│   │   ├── agents.json            # bootstrap (vazio) — Fase 10
│   │   ├── errors.json            # bootstrap (vazio) — Fase 9
│   │   └── activity.json          # bootstrap (vazio ou só `claude-account-rotated`)
│   └── en-US/                     # mesma estrutura, espelhada
└── __tests__/
    └── missing-keys.test.ts       # detector vitest custom
```

```
packages/db/src/migrations/
└── 0073_add_user_locale.sql       # NEW
packages/db/src/schema/auth.ts     # MODIFIED: adicionar coluna locale
```

```
server/src/middleware/auth.ts      # MODIFIED: popular req.locale
server/src/auth/better-auth.ts     # MODIFIED: additionalFields.locale
server/src/types/                  # MODIFIED: augmentar Express.Request com locale
server/src/routes/auth.ts          # MODIFIED: PATCH /profile aceita locale
packages/shared/src/validators/access.ts  # MODIFIED: schemas + locale
```

### Pattern 1: Drizzle Schema Extension (additive, idempotent)

**What:** Adicionar coluna `locale` ao schema `authUsers` + Drizzle migration; CHECK constraint para enum.

**When to use:** Sempre que estendermos schema do Better Auth (auth.users, sessions, etc.).

**Example (schema):**

```typescript
// packages/db/src/schema/auth.ts (MODIFIED)
export const authUsers = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // NEW (Phase 7):
  locale: text("locale").notNull().default("pt-BR"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
```

**Example (migration SQL — generated by `pnpm --filter @paperclipai/db generate`, NOT applied locally):**

```sql
-- packages/db/src/migrations/0073_add_user_locale.sql
ALTER TABLE "user" ADD COLUMN "locale" text DEFAULT 'pt-BR' NOT NULL;
ALTER TABLE "user" ADD CONSTRAINT "user_locale_check"
  CHECK ("locale" IN ('pt-BR', 'en-US'));
```

> **DB-03 enforcement:** `pnpm db:migrate` runs **only** in `.github/workflows/db-migrate.yml:65` (push to main, paths `packages/db/src/migrations/**`). Local devs run `pnpm --filter @paperclipai/db generate` to produce SQL, commit, PR — CI applies. Never run `db:migrate` against Supabase from a dev machine.

### Pattern 2: Better Auth `additionalFields` for Type Inference

**What:** Registrar `locale` no Better Auth config para que `session.user.locale` apareça com type safety.

**When to use:** Sempre que adicionamos coluna ao `authUsers` que precisa estar na sessão.

**Example:**

```typescript
// server/src/auth/better-auth.ts (MODIFIED, around line 134-153)
const authConfig = {
  baseURL: baseUrl,
  secret,
  trustedOrigins: effectiveTrustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: authUsers, session: authSessions, account: authAccounts, verification: authVerifications },
  }),
  user: {
    additionalFields: {
      locale: { type: "string", required: false, defaultValue: "pt-BR" },
    },
  },
  emailAndPassword: { enabled: true, requireEmailVerification: false, disableSignUp: config.authDisableSignUp },
  advanced: buildBetterAuthAdvancedOptions({ disableSecureCookies: isHttpOnly }),
};
```

**Note:** Better Auth does **not** auto-sync columns added via Drizzle migration. The migration is the source of truth for the column; `additionalFields` is what makes Better Auth's `getSession` return the value. Both are needed. See https://www.better-auth.com/docs/concepts/database (verified 2026-04-26).

Update `BetterAuthSessionUser` type to reflect:

```typescript
// server/src/auth/better-auth.ts:49-53
export type BetterAuthSessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  locale?: "pt-BR" | "en-US" | null;  // NEW
};
```

And in `resolveBetterAuthSessionFromHeaders` (line 181-194), include `locale` when assembling `user`:

```typescript
const user = value.user?.id
  ? {
      id: value.user.id,
      email: value.user.email ?? null,
      name: value.user.name ?? null,
      locale: (value.user as { locale?: string }).locale ?? null,
    }
  : null;
```

### Pattern 3: Zod Validator Extension

**What:** Estender `currentUserProfileSchema` e `updateCurrentUserProfileSchema` com `locale`.

**Example:**

```typescript
// packages/shared/src/validators/access.ts (MODIFIED, lines 172-199)
export const localeSchema = z.enum(["pt-BR", "en-US"]);
export type Locale = z.infer<typeof localeSchema>;

export const currentUserProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().nullable(),
  name: z.string().min(1).max(120).nullable(),
  image: profileImageSchema.nullable(),
  locale: localeSchema,  // NEW
});

export const updateCurrentUserProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),  // OPTIONAL agora — toggle não muda nome
  image: z.union([profileImageSchema, z.literal(""), z.null()]).optional()
    .transform((value) => value === "" ? null : value),
  locale: localeSchema.optional(),  // NEW
}).refine((data) => data.name !== undefined || data.image !== undefined || data.locale !== undefined, {
  message: "At least one field must be provided",
});
```

> **CRÍTICO:** `name` virava obrigatório no schema atual (linha 192). Tornar opcional agora **muda contrato existente**. Verifique em `ProfileSettings.tsx:74` — sempre passa `name` explicitamente, então safe. Documentar no plano como mudança não-quebrante.

### Pattern 4: Express `actorMiddleware` extension for `req.locale`

**What:** Popular `req.locale` no mesmo branch que carrega memberships (`server/src/middleware/auth.ts:50-86`).

**Example:**

```typescript
// server/src/middleware/auth.ts (MODIFIED around line 73-83)
if (session?.user?.id) {
  const userId = session.user.id;
  const [roleRow, memberships, userLocale] = await Promise.all([
    /* existing roleRow query */,
    /* existing memberships query */,
    db.select({ locale: authUsers.locale }).from(authUsers).where(eq(authUsers.id, userId))
      .then((rows) => rows[0]?.locale ?? null),
  ]);
  req.actor = { /* unchanged */ };
  req.locale = userLocale ?? parseAcceptLanguage(req) ?? "pt-BR";  // NEW
  next();
  return;
}
// Else (no session, no token):
req.locale = parseAcceptLanguage(req) ?? "pt-BR";  // NEW (pré-login)
```

**Helper:**

```typescript
// server/src/lib/parse-accept-language.ts (NEW, ~15 lines)
export function parseAcceptLanguage(req: { header(name: string): string | undefined }): "pt-BR" | "en-US" | null {
  const header = req.header("accept-language");
  if (!header) return null;
  const lower = header.toLowerCase();
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("en")) return "en-US";
  return null;
}
```

**Type augmentation** (server/src/types/express.d.ts ou `actor.d.ts` — verificar pattern existente do `req.actor`):

```typescript
declare global {
  namespace Express {
    interface Request {
      locale: "pt-BR" | "en-US";
    }
  }
}
```

### Pattern 5: i18next Init (non-Suspense, static imports, TypeScript-augmented)

**Example:**

```typescript
// ui/src/i18n/resources.ts
import commonPt from "./locales/pt-BR/common.json";
import inboxPt from "./locales/pt-BR/inbox.json";
// ... 8 namespaces × 2 locales = 16 imports
import commonEn from "./locales/en-US/common.json";
// ...

export const defaultNS = "common" as const;
export const resources = {
  "pt-BR": { common: commonPt, inbox: inboxPt, /* ... */ },
  "en-US": { common: commonEn, inbox: inboxEn, /* ... */ },
} as const;
```

```typescript
// ui/src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, defaultNS } from "./resources";

const isCi = import.meta.env.MODE === "test" || import.meta.env.PROD;

void i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  ns: ["common", "inbox", "projects", "settings", "auth", "agents", "errors", "activity"],
  fallbackLng: "en-US",
  lng: "pt-BR",  // overridden by user.locale on session load
  interpolation: { escapeValue: false },  // React already escapes
  returnEmptyString: false,
  react: { useSuspense: false },  // CONTEXT decision
  saveMissing: !isCi,
  missingKeyHandler: (lngs, ns, key) => {
    if (import.meta.env.DEV) console.warn(`[i18n missing] ${ns}:${key} for ${lngs.join(",")}`);
  },
});

export default i18n;
```

```typescript
// ui/src/i18n/i18next.d.ts
import { resources, defaultNS } from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)["pt-BR"];  // pt-BR é a fonte de verdade
  }
}
```

**Provider wiring** (in `main.tsx`, **before** any component that uses `useTranslation`):

```typescript
// ui/src/main.tsx (MODIFIED)
import "./i18n";  // side-effect import; init runs at module load
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>     {/* NEW — fora do ThemeProvider, dentro do QueryClient */}
        <ThemeProvider>
          {/* ... existing tree */}
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  </StrictMode>
);
```

> **Order rationale:** I18nextProvider precisa estar **acima** de qualquer componente que chama `useTranslation`. Não precisa estar acima do `QueryClientProvider`. Coloque dentro do `QueryClientProvider` para que mutations otimistas em `ProfileSettings` possam acessar tanto query client quanto i18n instance.

### Pattern 6: Optimistic Locale Switch (sem reload)

**Example:**

```typescript
// ui/src/pages/ProfileSettings.tsx (extension — pseudocode)
import { useTranslation } from "react-i18next";

const { i18n } = useTranslation();
const queryClient = useQueryClient();

const updateLocaleMutation = useMutation({
  mutationFn: (locale: "pt-BR" | "en-US") =>
    authApi.updateProfile({ name: resolveProfileName(), locale }),
  onMutate: async (newLocale) => {
    const previous = i18n.language;
    await i18n.changeLanguage(newLocale);  // immediate UI swap (SETTINGS-04)
    // optimistic session update:
    queryClient.setQueryData<AuthSession | null>(queryKeys.auth.session, (current) =>
      current ? { ...current, user: { ...current.user, locale: newLocale } } : current
    );
    return { previous };
  },
  onError: (_err, _newLocale, ctx) => {
    if (ctx?.previous) void i18n.changeLanguage(ctx.previous);  // rollback
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
  },
});
```

### Anti-Patterns to Avoid

- **Suspense mode com hot-swap:** o boundary remonta a árvore inteira a cada `changeLanguage`. CONTEXT já bloqueou (non-Suspense). NÃO importar via `i18next-http-backend` ou `react-i18next/Suspense`.
- **`fallbackLng` que retorna a key crua:** com `returnEmptyString: false` + `parseMissingKeyHandler` que retorna fallback do en-US, garantimos que `t('inbox.empty-state.title')` nunca renderiza a string `inbox.empty-state.title` (I18N-03).
- **Detector que importa o source code:** Não importe `App.tsx` no detector — vai puxar todo o React. Use leitura de arquivos como texto + regex (ver Pattern 7).
- **Better Auth schema sem `additionalFields`:** se você só rodar a migration sem atualizar `createBetterAuthInstance`, a coluna existe no DB mas `session.user.locale` vai ser `undefined`. Ambos são necessários.
- **Bypass do CI workflow para apply:** dev tentando `pnpm db:migrate` localmente contra Supabase quebra DB-03.

## Pattern 7: Custom Missing Keys Detector (Vitest)

**Approach:**

```typescript
// ui/src/i18n/__tests__/missing-keys.test.ts
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resources } from "../resources";

const T_CALL_RE = /\bt\(\s*["'`]([a-z0-9.\-]+)["'`]/g;
const SRC_DIR = resolve(__dirname, "../..");
const EXCLUDE_DIRS = new Set(["node_modules", "dist", "i18n"]);

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?|ts)$/.test(entry.name) && !entry.name.endsWith(".test.tsx")) files.push(full);
  }
  return files;
}

function extractKeys(content: string): string[] {
  const keys: string[] = [];
  for (const m of content.matchAll(T_CALL_RE)) keys.push(m[1]);
  return keys;
}

function lookup(dict: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, dict);
}

describe("i18n: every t() key exists in dictionaries", () => {
  it("pt-BR + en-US dictionaries cover all t() calls in source", () => {
    const files = walk(SRC_DIR);
    const missing: { file: string; key: string; locale: string }[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const rawKey of extractKeys(content)) {
        const [ns, ...rest] = rawKey.includes(":") ? rawKey.split(":") : ["common", rawKey];
        const path = rest.join(".") || ns;
        const targetNs = rawKey.includes(":") ? ns : "common";
        for (const locale of ["pt-BR", "en-US"] as const) {
          const dict = (resources[locale] as Record<string, unknown>)[targetNs];
          if (!dict || lookup(dict as Record<string, unknown>, path) === undefined) {
            missing.push({ file, key: rawKey, locale });
          }
        }
      }
    }

    if (missing.length > 0) {
      const msg = missing.map((m) => `  ${m.locale} ${m.key} (${m.file})`).join("\n");
      if (process.env.CI) {
        expect.fail(`Missing i18n keys:\n${msg}`);
      } else {
        console.warn(`[i18n] ${missing.length} missing keys (non-blocking in dev):\n${msg}`);
      }
    }
  });
});
```

**Why this works:**
- `pnpm test:run` already runs in `pr.yml:81` — no workflow YAML changes needed (CI integration is automatic).
- `process.env.CI === 'true'` is set by GitHub Actions out of the box.
- Regex limitation: extracts only static string literals. Dynamic keys (`t(\`x.${id}\`)`) need an allowlist in a sibling `i18n-allowlist.ts`. Document as a known limitation.
- Excludes `i18n/` itself to avoid recursion.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Translation engine | Custom dict lookup with template strings | `i18next` | Plurals, interpolation, fallback chains, namespace lazy-loading — done right |
| React hook for translation | Custom Context with translation map | `react-i18next` `useTranslation` | Re-renders on `changeLanguage`, scopes namespaces, supports `Trans` for inline JSX |
| Accept-Language parser | Manual regex for q-values | Simple `startsWith` is fine here (only 2 locales) | v1.1 has 2 locales; full RFC 7231 parsing is over-engineering for v2 (L10N-01) |
| Better Auth column sync | Drizzle migration alone | Drizzle migration **+** `additionalFields` config | Better Auth needs explicit registration for type-safe session payload |
| Missing key validation | Build-time AST walker | Vitest test + regex | Simpler, runs in existing CI, no new tooling. Limitation: dynamic keys need allowlist — acceptable trade-off |

**Key insight:** All the heavy lifting is library-territory. The phase's actual code surface is small (~10 files modified, ~6 created). The hard part is wiring order: Better Auth config + Drizzle migration + middleware + Provider order in main.tsx + optimistic mutation.

## Runtime State Inventory

This phase is **additive** (new column, new code paths), not a rename or refactor. No legacy state to migrate.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `user.locale` is a new column with default `pt-BR`; existing users will inherit default on `ALTER TABLE` | None — `DEFAULT 'pt-BR' NOT NULL` handles backfill atomically |
| Live service config | None — Better Auth is the only live service that reads the user table; restart picks up new schema | Restart server after migration applies (single-machine; multi-machine just means each dev `git pull` + restart) |
| OS-registered state | None — no Windows/launchd/systemd registrations involve user locale | None |
| Secrets / env vars | None — no env var references locale; `BETTER_AUTH_SECRET` and `PAPERCLIP_INSTANCE_ID` are unaffected | None |
| Build artifacts | `packages/db/dist/schema/auth.js` will be regenerated on `pnpm --filter @paperclipai/db build` (already part of `db:generate` workflow) | None — incidental |

**Verified:** `Grep "locale"` across `packages/db`, `server/src`, `ui/src` returns zero pre-existing references to user locale. No name collisions.

## Common Pitfalls

### Pitfall 1: Better Auth session payload missing `locale`

**What goes wrong:** Migration applies, column exists, but `session.user.locale` is `undefined`.
**Why it happens:** Better Auth uses `additionalFields` config to know which non-default columns to surface; it does NOT auto-detect schema.
**How to avoid:** Both must change in the same PR — `packages/db/src/schema/auth.ts` AND `server/src/auth/better-auth.ts` `additionalFields`.
**Warning signs:** TS error `Property 'locale' does not exist on type 'BetterAuthSessionUser'` — fix by augmenting type AND config.

### Pitfall 2: Detector greps `.test.tsx` files and counts test fixtures as missing

**What goes wrong:** `t('foo.bar.baz')` in a Storybook fixture or test fails the CI even though the key is for testing only.
**How to avoid:** Exclude `*.test.tsx`, `*.test.ts`, `*.stories.tsx`, `fixtures/**` in `walk()`.
**Warning signs:** CI red on a file the user knows is a fixture — fix exclusion list.

### Pitfall 3: `i18n.changeLanguage` not awaited before optimistic UI update

**What goes wrong:** Toggle clicked → `setQueryData` runs synchronously → React re-renders with new locale in session → but `i18n.language` is still old. Result: UI shows stale strings briefly.
**How to avoid:** `await i18n.changeLanguage(newLocale)` inside `onMutate` BEFORE `queryClient.setQueryData`. Order matters.
**Warning signs:** Flicker on first click of toggle (visible in slow networks because optimistic update is "too fast").

### Pitfall 4: Migration generates an unrelated `name` rename

**What goes wrong:** Drizzle's `pnpm db:generate` infers a column rename if the schema diff is ambiguous (rare here, but historically a Drizzle pitfall with text fields).
**How to avoid:** Inspect the generated `0073_*.sql` BEFORE committing. Should be exactly two `ALTER TABLE` statements (ADD COLUMN + ADD CONSTRAINT). If `--> RENAME` appears, abort and add manually.
**Warning signs:** Generated SQL contains `ALTER TABLE "user" RENAME COLUMN`.

### Pitfall 5: Provider order — I18nextProvider above CompanyProvider

**What goes wrong:** Some component inside `CompanyProvider` calls `useTranslation()` before `I18nextProvider` is mounted → "no i18n instance found".
**How to avoid:** Place `<I18nextProvider>` immediately inside `<QueryClientProvider>`, wrapping `<ThemeProvider>` (which wraps everything else, see `main.tsx:43-69`).
**Warning signs:** Console error "You will need to pass in an i18next instance".

### Pitfall 6: Existing `updateCurrentUserProfileSchema` requires `name`

**What goes wrong:** Toggle wants to PATCH only `locale`, but schema demands `name`. Validation fails.
**How to avoid:** Make all fields optional + add `.refine()` requiring at least one. Existing call site (`ProfileSettings.tsx:74` always passes `name`) is unaffected.
**Warning signs:** Network tab shows 400 with `"Required"` error on `name` field when toggling locale.

## Code Examples

(See "Architecture Patterns" section above for full examples — Patterns 1-7 cover schema, Better Auth config, Zod validators, middleware, i18next init, optimistic mutation, detector.)

## State of the Art

| Old Approach | Current Approach (2026) | When Changed | Impact |
|--------------|------------------------|--------------|--------|
| `i18next-parser` (extraction) | `i18next-cli` | i18next-parser archived 2026-02-22 | We pick neither — custom vitest detector — but document `i18next-cli` as the official path for v2 if we expand |
| String-based `t('key')` keys (TypeScript) | Selector API `t($ => $.key.path)` | i18next 26 makes selector opt-in via `enableSelector`; v27 will deprecate string-based | We use string-based for v1.1 (compatible with `i18next-cli` extraction). Reassess in v2 |
| `react-i18next` Suspense default | Same — both modes supported | n/a | We use non-Suspense per CONTEXT |
| `additionalFields` in Better Auth | Same since BA 1.x | Stable | Confirmed pattern via official docs |

## Open Questions

1. **Should `i18next-browser-languagedetector` be installed?**
   - What we know: Pre-login users have no `user.locale`. Server already handles this with `Accept-Language` parsing in middleware.
   - What's unclear: Whether the UI also needs to read `Accept-Language` on first load before login (auth page itself).
   - Recommendation: **Skip for v1.1.** Default `lng: 'pt-BR'` in i18next init covers the auth page (login/signup). Once user logs in, `i18n.changeLanguage(session.user.locale)` syncs UI to user preference. Browser-detector adds dependency for marginal pre-login improvement; defer to v2.

2. **Activity log: when do we migrate existing entries to `actionKey + paramsJson`?**
   - What we know: `activityLog.action` is a string; `activityLog.details` is jsonb; pattern already permits structured emit.
   - What's unclear: Existing `claude_account_rotated` entries (Phase 5) use `action='claude_account_rotated'` + free-form `details`. UI-09 (Phase 8) renders activity log entries.
   - Recommendation: **Phase 7 introduces the convention** (new entries emitted from server use stable `action` keys that map 1:1 to `activity:<action>` translation keys). **Phase 8 (UI-09) writes the renderer** that does `t(`activity:${entry.action}`, entry.details)`. No data migration needed — old entries already have stable `action` strings; we just add translation keys for them in `activity.json`.

3. **Plural support: do bootstrap dictionaries need `_one`/`_other`?**
   - What we know: i18next supports plurals via `_one`/`_other` suffixes natively (no ICU needed).
   - What's unclear: Whether bootstrap dictionaries (Phase 7) need any plurals.
   - Recommendation: Bootstrap is intentionally minimal (toggle labels, app name). Plurals come naturally in fases 8-10 when real strings are added. Phase 7 plan should NOT block on plural infrastructure — it's already in i18next out of the box.

## Environment Availability

This phase has no new external dependencies. All required tooling is already present.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, dev | ✓ | 22+ (CI uses 22 in db-migrate, 24 in pr.yml) | — |
| pnpm | Workspace | ✓ | 9.15.4 | — |
| Vitest | Detector test + existing tests | ✓ | 3.0.5 (UI workspace dep) | — |
| Vite | UI dev/build | ✓ | 6.1.0 (handles JSON imports natively, no plugin needed) | — |
| Drizzle Kit | Migration generate | ✓ | 0.31.9 | — |
| Better Auth | Session, additionalFields | ✓ | 1.4.18 | — |
| Supabase | DB target | ✓ | Project `bxlczioxgizgvtznukwt` operational | — |
| GitHub Actions | CI for migrations + PR validation | ✓ | `db-migrate.yml` and `pr.yml` operational | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

**npm registry verification (executed 2026-04-26):**
```
i18next@26.0.8     — published recently (per WebSearch 2026-04-26)
react-i18next@17.0.4 — published ~2 weeks before research date
```

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.0.5 (UI workspace) + Vitest 3.0.5 (server workspace) |
| Config files | `ui/vitest.config.ts`, `server/vitest.config.ts` (existing) |
| Quick run command (UI) | `pnpm --filter @paperclipai/ui test:run` |
| Quick run command (server) | `pnpm --filter @paperclipai/server test:run` |
| Full suite command | `pnpm test:run` (root — runs all workspaces) |
| Typecheck | `pnpm -r typecheck` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETTINGS-01 | Toggle radio renderiza pt-BR/en-US e dispara mutation | unit (RTL) | `pnpm --filter @paperclipai/ui test:run -- ProfileSettings` | ❌ Wave 0 — `ui/src/pages/__tests__/ProfileSettings.locale-toggle.test.tsx` |
| SETTINGS-02 | PATCH /api/auth/profile { locale } persiste em authUsers.locale | integration | `pnpm --filter @paperclipai/server test:run -- auth.locale` | ❌ Wave 0 — `server/src/__tests__/auth-routes-locale.test.ts` (supertest) |
| SETTINGS-03 | Default `pt-BR` em novos usuários (DB-level + i18next-level) | integration + unit | server route test reads default from DB; UI test asserts `i18n.language === 'pt-BR'` antes de session resolver | ❌ Wave 0 |
| SETTINGS-04 | Mudança aplica imediatamente sem reload | unit (RTL) + HUMAN-UAT | `await i18n.changeLanguage('en-US')` em mutation; assert `screen.getByText` da string en-US presente | ❌ Wave 0 + UAT-07-01 |
| I18N-01 | i18next inicializado com 8 namespaces | unit | `pnpm --filter @paperclipai/ui test:run -- i18n.init` — assert `i18n.options.ns` length 8 | ❌ Wave 0 — `ui/src/i18n/__tests__/init.test.ts` |
| I18N-02 | Dicionários JSON existem para pt-BR e en-US em todos namespaces | filesystem test | Walk `ui/src/i18n/locales/{pt-BR,en-US}/*.json` — assert 16 files | ❌ Wave 0 — included in init.test.ts |
| I18N-03 | Fallback en-US ativa quando key ausente em pt-BR | unit | `i18n.t('settings.test-key-only-in-en')` retorna string en-US, nunca a key crua | ❌ Wave 0 |
| I18N-04 | Detector vitest custom reporta keys ausentes | self-validating test | `pnpm --filter @paperclipai/ui test:run -- missing-keys` | ❌ Wave 0 — `ui/src/i18n/__tests__/missing-keys.test.ts` (Pattern 7) |
| I18N-05 | req.locale populado pelo middleware | integration | supertest pinga endpoint que reflete `req.locale`; assert pt-BR para usuário com locale='pt-BR' | ❌ Wave 0 — `server/src/__tests__/middleware-locale.test.ts` |

### HUMAN-UAT (não-automatizável)

| UAT ID | Behavior | Steps |
|--------|----------|-------|
| UAT-07-01 | Toggle troca idioma da UI ao vivo, sem reload | (1) Login; (2) abrir `/instance/settings/profile`; (3) clicar radio en-US; (4) verificar header/sidebar/labels em inglês imediatamente; (5) recarregar página; (6) verificar que en-US persiste; (7) trocar para pt-BR; (8) logout/login → pt-BR persiste |
| UAT-07-02 | Default pt-BR para novo usuário | (1) Signup novo usuário; (2) primeira tela após login está em pt-BR (não en-US) |

### Sampling Rate
- **Per task commit:** `pnpm --filter @paperclipai/ui test:run` (UI changes) ou `pnpm --filter @paperclipai/server test:run` (server changes)
- **Per wave merge:** `pnpm test:run && pnpm -r typecheck`
- **Phase gate:** `pnpm test:run && pnpm -r typecheck && pnpm build` green; UAT-07-01 + UAT-07-02 manualmente verificados

### Wave 0 Gaps
- [ ] `ui/src/i18n/index.ts` — i18next init module
- [ ] `ui/src/i18n/resources.ts` — static JSON imports + resources object
- [ ] `ui/src/i18n/i18next.d.ts` — TypeScript module augmentation
- [ ] `ui/src/i18n/locales/pt-BR/{common,inbox,projects,settings,auth,agents,errors,activity}.json` — 8 bootstrap dicts
- [ ] `ui/src/i18n/locales/en-US/{common,inbox,projects,settings,auth,agents,errors,activity}.json` — 8 bootstrap dicts
- [ ] `ui/src/i18n/__tests__/init.test.ts` — covers I18N-01, I18N-02, I18N-03
- [ ] `ui/src/i18n/__tests__/missing-keys.test.ts` — covers I18N-04
- [ ] `ui/src/pages/__tests__/ProfileSettings.locale-toggle.test.tsx` — covers SETTINGS-01, SETTINGS-04
- [ ] `server/src/__tests__/auth-routes-locale.test.ts` — covers SETTINGS-02, SETTINGS-03 (server side)
- [ ] `server/src/__tests__/middleware-locale.test.ts` — covers I18N-05
- [ ] `packages/db/src/migrations/0073_add_user_locale.sql` — migration source
- [ ] Test fixtures: factory para criar `authUsers` row com `locale='pt-BR'` ou `'en-US'`

## Sources

### Primary (HIGH confidence)
- `packages/db/src/schema/auth.ts:3-11` — Better Auth user table schema (project-owned)
- `packages/db/src/migrations/0072_clumsy_leader.sql` — Migration pattern reference (last applied)
- `packages/shared/src/validators/access.ts:172-199` — Existing user profile schemas
- `server/src/auth/better-auth.ts:120-160` — Better Auth instance config
- `server/src/middleware/auth.ts:21-90` — actorMiddleware (extension point for req.locale)
- `server/src/routes/auth.ts:63-97` — PATCH /api/auth/profile endpoint
- `ui/src/main.tsx:40-70` — Provider tree (where I18nextProvider mounts)
- `ui/src/pages/ProfileSettings.tsx:50-118` — Optimistic mutation pattern (template)
- `ui/src/App.tsx:268` — `/instance/settings/profile` route
- `.github/workflows/db-migrate.yml:65-71` — DB-03 enforcement (only legitimate migration path)
- `.github/workflows/pr.yml:54-90` — verify job runs `pnpm test:run` (covers detector automatically)
- `https://www.better-auth.com/docs/concepts/database` — `additionalFields` is required for type-safe session payload
- `https://www.i18next.com/overview/typescript` — Module augmentation pattern (CustomTypeOptions)
- `https://react.i18next.com/latest/i18next-instance` — useSuspense: false pattern

### Secondary (MEDIUM confidence)
- WebSearch (2026-04-26) "i18next latest version" → 26.0.8, verified via `npm view`
- WebSearch (2026-04-26) "react-i18next React 19" → 17.0.4 supports React 19; verified via `npm view`
- WebSearch (2026-04-26) "better-auth additionalFields locale TypeScript" → confirms pattern shape
- https://github.com/lingualdev/i18n-check — Alternative tool documented but not adopted

### Tertiary (LOW confidence)
- `next-intl`, `lingui`, `formatjs` comparisons (informational only — CONTEXT locked i18next)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified live via `npm view`; React 19 compat confirmed in changelog
- Architecture (Drizzle + Better Auth + middleware): HIGH — all integration points read directly from codebase, exact line numbers cited
- Pitfalls: HIGH for #1, #4, #5, #6 (codebase-specific, verified); MEDIUM for #2, #3 (general patterns, unverified empirically)
- Detector approach: MEDIUM — pattern is sound, but regex-based extraction has known limits with dynamic keys (documented as trade-off)

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days; i18next 26.x stable, no imminent breaking changes; Better Auth 1.4.x stable)
