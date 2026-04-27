import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { sql } from "drizzle-orm";
import { getInflightRequests, getInflightCount } from "../middleware/inflight-request-tracker.js";

/**
 * Diagnostic routes for dev-time pool / request-flight introspection.
 * Mounted under /api/_debug. Gated to non-production by app.ts.
 *
 * Designed to be called by hand (curl) when the UI starts hanging:
 *   curl -s http://127.0.0.1:3100/api/_debug/inflight | jq
 *
 * The inflight list reveals which routes hold pool slots without releasing
 * them — that's the leak source.
 */
export function debugRoutes(db: Db) {
  const router = Router();

  router.get("/inflight", (_req, res) => {
    const inflight = getInflightRequests();
    res.json({
      count: inflight.length,
      requests: inflight,
      collectedAt: new Date().toISOString(),
    });
  });

  router.get("/pool-probe", async (_req, res) => {
    const probeStart = Date.now();
    let probeOk = false;
    let probeError: string | null = null;
    try {
      // Bound the probe so this endpoint never itself wedges the pool.
      const probe = db.execute(sql`SELECT 1 as ok`);
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("probe_timeout_3000ms")), 3000),
      );
      await Promise.race([probe, timeout]);
      probeOk = true;
    } catch (err) {
      probeError = err instanceof Error ? err.message : String(err);
    }
    res.json({
      probeOk,
      probeError,
      probeDurationMs: Date.now() - probeStart,
      inflightCount: getInflightCount(),
      collectedAt: new Date().toISOString(),
    });
  });

  return router;
}
