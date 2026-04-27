import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export interface InflightRequestRecord {
  requestId: string;
  method: string;
  originalUrl: string;
  routePath: string | null;
  startedAt: number;
  startedAtIso: string;
  actorType: string | null;
  actorId: string | null;
}

const inflight = new Map<string, InflightRequestRecord>();

export function inflightRequestTracker() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const record: InflightRequestRecord = {
      requestId,
      method: req.method,
      originalUrl: req.originalUrl,
      routePath: null,
      startedAt: Date.now(),
      startedAtIso: new Date().toISOString(),
      actorType: null,
      actorId: null,
    };
    inflight.set(requestId, record);

    const finalize = () => {
      // Capture late-bound metadata (route + actor are only known after Express
      // has matched the handler).
      record.routePath = req.route?.path ?? null;
      const actor = (req as Request & { actor?: { type?: string; userId?: string; agentId?: string } }).actor;
      if (actor) {
        record.actorType = actor.type ?? null;
        record.actorId = actor.userId ?? actor.agentId ?? null;
      }
      inflight.delete(requestId);
    };
    res.on("finish", finalize);
    res.on("close", finalize);

    next();
  };
}

export function getInflightRequests(): InflightRequestRecord[] {
  const now = Date.now();
  return Array.from(inflight.values())
    .map((record) => ({ ...record, durationMs: now - record.startedAt }))
    .sort((a, b) => b.durationMs - a.durationMs);
}

export function getInflightCount(): number {
  return inflight.size;
}
