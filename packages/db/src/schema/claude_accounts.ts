import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { authUsers } from "./auth.js";

/**
 * `claude_accounts` — pool de contas Claude Code per-company (D-02 / MULTI-01).
 *
 * Cada linha representa uma instalação isolada do CLI Claude em
 * `~/.paperclip/claude-accounts/<configDirSlug>/`, com seu próprio token de
 * autenticação. O pool é exercitado pelo `claudeAccountsService`
 * (server/src/services/claude-accounts.ts — MULTI-04) que faz round-robin sobre
 * contas live para isolar agentes de exhaustões 429.
 *
 * - `status`: 'live' | 'exhausted' | 'cooldown' | 'disabled'. Default 'live'
 *   (registro novo é elegível por padrão).
 * - `lastQuotaWindowsJson` (D-03 / Finding 3): mapa por sub-tipo da taxonomia
 *   429 (rpm_transient | tpm_transient | daily_quota | weekly_quota |
 *   session_5h | org_tier) — cada chave guarda `{ exhaustedUntil,
 *   lastTriggeredAt, count }`. Schema não enforça as chaves (jsonb livre); o
 *   service em TypeScript valida.
 * - `exhaustedUntil`: cache top-level = MAX dos windows. Permite query rápida
 *   `WHERE exhaustedUntil < now` em `selectActiveAccount` sem JSONB scan.
 * - `configDirSlug`: UNIQUE global. Operador escolhe slug; harness cria o
 *   diretório isolado.
 *
 * FKs: `companyId` → uuid `companies.id`; `ownerUserId` → text `user.id` (Better
 * Auth usa text PK, o resto da codebase usa uuid — ver decisão D-02 ajustada
 * para alinhar com convenção real de `cost_events`/`heartbeat_runs`).
 */
export const claudeAccounts = pgTable(
  "claude_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => authUsers.id),
    label: text("label").notNull(),
    configDirSlug: text("config_dir_slug").notNull(),
    status: text("status").notNull().default("live"),
    lastQuotaWindowsJson: jsonb("last_quota_windows_json")
      .$type<
        Record<
          string,
          {
            exhaustedUntil: string;
            lastTriggeredAt: string;
            count: number;
          }
        >
      >()
      .notNull()
      .default({}),
    exhaustedUntil: timestamp("exhausted_until", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyStatusIdx: index("claude_accounts_company_status_idx").on(
      table.companyId,
      table.status,
    ),
    companyExhaustedIdx: index("claude_accounts_company_exhausted_idx").on(
      table.companyId,
      table.exhaustedUntil,
    ),
    configDirSlugUnq: uniqueIndex("claude_accounts_config_dir_slug_unq").on(
      table.configDirSlug,
    ),
  }),
);
