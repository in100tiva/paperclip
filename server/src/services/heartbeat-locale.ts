import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agentWakeupRequests, authUsers } from "@paperclipai/db";

/**
 * Locale string narrowed to the two values currently supported across the
 * runtime — pt-BR (DB default) and en-US. Consumed by Plans 11-02
 * (language directive composition) and 11-03 (skill variant materialization
 * + bundleKey extension).
 */
export type RuntimeLocale = "pt-BR" | "en-US";

/**
 * Narrows an arbitrary value to RuntimeLocale. Anything that is not the
 * literal string "en-US" collapses to the safe pt-BR default — this keeps the
 * caller free of surprise locales (legacy rows, schema drift, race-with-delete
 * leftJoin nulls, etc.).
 */
function narrowLocale(value: unknown): RuntimeLocale {
  return value === "en-US" ? "en-US" : "pt-BR";
}

/**
 * Resolve the runtime locale for a given heartbeat run by following the
 * `agent_wakeup_requests → authUsers` actor chain.
 *
 * Resolution rules (mirrors the chain in middleware/auth.ts:73-90):
 * 1. No wakeup request (timer-driven wake or in-process synthesis) → "pt-BR".
 * 2. Wakeup request `requestedByActorType !== "user"` (system, agent, etc.)
 *    → "pt-BR" — non-human actors do not own a locale preference.
 * 3. User actor with locale resolved via leftJoin → narrow to RuntimeLocale.
 * 4. JOIN miss / null locale (race between user delete and wake) → "pt-BR".
 *
 * The helper performs a single Drizzle query (one round-trip) so the
 * heartbeat hot path stays cheap.
 */
export async function resolveRunOwnerLocale(
  db: Db,
  wakeupRequestId: string | null,
): Promise<RuntimeLocale> {
  if (!wakeupRequestId) return "pt-BR";

  const rows = await db
    .select({
      actorType: agentWakeupRequests.requestedByActorType,
      locale: authUsers.locale,
    })
    .from(agentWakeupRequests)
    .leftJoin(authUsers, eq(authUsers.id, agentWakeupRequests.requestedByActorId))
    .where(eq(agentWakeupRequests.id, wakeupRequestId))
    .limit(1);

  const row = rows[0];
  if (!row || row.actorType !== "user") return "pt-BR";
  return narrowLocale(row.locale);
}
