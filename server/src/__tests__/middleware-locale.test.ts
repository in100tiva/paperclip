import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { Db } from "@paperclipai/db";
import { actorMiddleware } from "../middleware/auth.js";

// I18N-05 — RED test for Wave 0.
// Will fail until Plan 04 populates req.locale in actorMiddleware
// (reading authUsers.locale for authenticated users; Accept-Language fallback
// for anonymous; final fallback 'pt-BR').

function buildApp(opts: {
  db: Db;
  deploymentMode: "authenticated" | "single" | "local_trusted";
  resolveSession?: Parameters<typeof actorMiddleware>[1]["resolveSession"];
}) {
  const app = express();
  app.use(actorMiddleware(opts.db, opts as any));
  app.get("/locale-echo", (req, res) => {
    res.json({ locale: (req as unknown as { locale?: string }).locale });
  });
  return app;
}

describe.sequential("actorMiddleware populates req.locale (I18N-05)", () => {
  it("authenticated user → req.locale = authUsers.locale", async () => {
    const fakeDb = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([{ locale: "en-US" }]),
        }),
      }),
    } as unknown as Db;
    const app = buildApp({
      db: fakeDb,
      deploymentMode: "authenticated",
      resolveSession: async () => ({
        user: { id: "u1", name: null, email: null },
      }) as any,
    });
    const res = await request(app).get("/locale-echo");
    expect(res.body.locale).toBe("en-US");
  });

  it("unauthenticated request with Accept-Language: pt-BR → req.locale = 'pt-BR'", async () => {
    const app = buildApp({
      db: {} as Db,
      deploymentMode: "single" as any,
    });
    const res = await request(app)
      .get("/locale-echo")
      .set("Accept-Language", "pt-BR,en;q=0.5");
    expect(res.body.locale).toBe("pt-BR");
  });

  it("unauthenticated request with no header → req.locale = 'pt-BR' (final fallback)", async () => {
    const app = buildApp({
      db: {} as Db,
      deploymentMode: "single" as any,
    });
    const res = await request(app).get("/locale-echo");
    expect(res.body.locale).toBe("pt-BR");
  });
});
