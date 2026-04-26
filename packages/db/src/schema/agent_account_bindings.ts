import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { claudeAccounts } from "./claude_accounts.js";

/**
 * `agent_account_bindings` — qual conta Claude está atribuída a cada agente
 * agora + cooldown gating (D-04 / MULTI-02).
 *
 * Uma linha por agente (`agentId` é PK). `activeAccountId` aponta para a conta
 * em uso; nullable porque a primeira atribuição pode acontecer lazy no primeiro
 * `selectActiveAccount`. `lastRotatedAt` participa do filtro de cooldown
 * (`lastRotatedAt < now - CLAUDE_ACCOUNT_COOLDOWN_SECONDS`) — primeira
 * atribuição não é rotação, então fica null.
 *
 * `rotationPolicy`:
 * - `'auto'` (default): service escolhe próxima conta live via round-robin em
 *   exhaustão.
 * - `'sticky'`: re-usa `activeAccountId` enquanto estiver live; pula round-robin.
 * - `'manual'`: nunca rotaciona automaticamente — operador escolhe via UI.
 */
export const agentAccountBindings = pgTable("agent_account_bindings", {
  agentId: uuid("agent_id")
    .primaryKey()
    .references(() => agents.id),
  activeAccountId: uuid("active_account_id").references(() => claudeAccounts.id),
  rotationPolicy: text("rotation_policy").notNull().default("auto"),
  lastRotatedAt: timestamp("last_rotated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
