import { Router, type Request } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, claudeAccounts } from "@paperclipai/db";
import { claudeAccountsService } from "../services/claude-accounts.js";
import { ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED } from "../services/activity-log.js";
import { validate } from "../middleware/validate.js";
import { assertCompanyAccess } from "./authz.js";
import { conflict, forbidden, notFound } from "../errors.js";

/**
 * MULTI-09 (Phase 5) — Claude Accounts management routes.
 *
 * Endpoints (all under `/api`):
 *   GET    /companies/:companyId/claude-accounts                   — list
 *   POST   /companies/:companyId/claude-accounts                   — register (owner/admin)
 *   PATCH  /companies/:companyId/claude-accounts/:accountId        — toggle status / rename (owner/admin)
 *   GET    /companies/:companyId/claude-accounts/rotation-history  — activity_log filtered
 *
 * Permissions (D-29 in 05-CONTEXT.md):
 *   - Read (GET): any authenticated company member (assertCompanyAccess covers this).
 *   - Write (POST/PATCH): only company `owner` or `admin` membership roles. Viewer
 *     is already filtered out by assertCompanyAccess for unsafe methods; this
 *     additional check rejects `operator` as well.
 */

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,62}$/;

const createAccountSchema = z.object({
  label: z.string().trim().min(1).max(100),
  configDirSlug: z
    .string()
    .trim()
    .regex(SLUG_REGEX, "Slug must be lowercase letters/digits/dashes, 1-63 chars, must start with [a-z0-9]"),
});

const patchAccountSchema = z.object({
  status: z.enum(["live", "disabled"]).optional(),
  label: z.string().trim().min(1).max(100).optional(),
});

/**
 * D-29: only owner/admin can mutate the pool. assertCompanyAccess already
 * rejects viewers for non-safe methods, so we additionally reject operators here.
 *
 * `local_implicit` board (single-host dev mode) bypasses — no membership rows.
 * Instance admins also bypass.
 */
function assertCompanyOwnerOrAdmin(req: Request, companyId: string) {
  if (req.actor.type !== "board") {
    throw forbidden("Only authenticated users can manage Claude accounts");
  }
  if (req.actor.source === "local_implicit") return;
  if (req.actor.isInstanceAdmin) return;

  const memberships = Array.isArray(req.actor.memberships) ? req.actor.memberships : [];
  const membership = memberships.find((m) => m.companyId === companyId && m.status === "active");
  if (!membership) {
    throw forbidden("User does not have active company access");
  }
  if (membership.membershipRole !== "owner" && membership.membershipRole !== "admin") {
    throw forbidden("Only owner or admin can manage Claude accounts");
  }
}

function getActorUserId(req: Request): string | null {
  if (req.actor.type !== "board") return null;
  return req.actor.userId ?? null;
}

export function claudeAccountsRoutes(db: Db) {
  const router = Router();
  const svc = claudeAccountsService(db);

  // GET list — D-26
  router.get("/companies/:companyId/claude-accounts", async (req, res) => {
    assertCompanyAccess(req, String(req.params.companyId));
    const accounts = await svc.listAccounts(String(req.params.companyId));
    res.json({ accounts });
  });

  // GET rotation history — D-26 / D-32 (activity_log query)
  // NOTE: more specific path declared BEFORE the generic /:accountId PATCH/GET
  // to avoid Express matching `rotation-history` as an accountId.
  router.get("/companies/:companyId/claude-accounts/rotation-history", async (req, res) => {
    assertCompanyAccess(req, String(req.params.companyId));
    const rawLimit = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
    const rows = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.companyId, String(req.params.companyId)),
          eq(activityLog.action, ACTIVITY_ACTION_CLAUDE_ACCOUNT_ROTATED),
        ),
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
    res.json({ entries: rows });
  });

  // POST create — D-26 / D-29 (owner|admin only)
  router.post(
    "/companies/:companyId/claude-accounts",
    validate(createAccountSchema),
    async (req, res) => {
      assertCompanyAccess(req, String(req.params.companyId));
      assertCompanyOwnerOrAdmin(req, String(req.params.companyId));
      const userId = getActorUserId(req);
      if (!userId) {
        throw forbidden("User authentication required to register a Claude account");
      }
      const body = req.body as z.infer<typeof createAccountSchema>;
      try {
        const [created] = await db
          .insert(claudeAccounts)
          .values({
            companyId: String(req.params.companyId),
            ownerUserId: userId,
            label: body.label,
            configDirSlug: body.configDirSlug,
            status: "live",
          })
          .returning();
        res.status(201).json({ account: created });
      } catch (err) {
        // D-02: configDirSlug has UNIQUE constraint. Postgres unique_violation = 23505.
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code?: string }).code === "23505"
        ) {
          throw conflict(`Config dir slug "${body.configDirSlug}" is already registered`);
        }
        throw err;
      }
    },
  );

  // PATCH (toggle status / rename) — D-26 / D-29
  router.patch(
    "/companies/:companyId/claude-accounts/:accountId",
    validate(patchAccountSchema),
    async (req, res) => {
      assertCompanyAccess(req, String(req.params.companyId));
      assertCompanyOwnerOrAdmin(req, String(req.params.companyId));
      const body = req.body as z.infer<typeof patchAccountSchema>;
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.status !== undefined) updates.status = body.status;
      if (body.label !== undefined) updates.label = body.label;

      const [updated] = await db
        .update(claudeAccounts)
        .set(updates)
        .where(
          and(
            eq(claudeAccounts.id, String(req.params.accountId)),
            eq(claudeAccounts.companyId, String(req.params.companyId)),
          ),
        )
        .returning();
      if (!updated) throw notFound("Claude account not found");
      res.json({ account: updated });
    },
  );

  return router;
}
