import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../middleware/index.js";
import { authRoutes } from "../routes/auth.js";

// SETTINGS-02 / SETTINGS-03 (server side) — RED tests for Wave 0.
// These will fail until:
//   - Plan 02 adds `locale` column to authUsers schema (default 'pt-BR') and
//     extends updateCurrentUserProfileSchema / currentUserProfileSchema with locale.
//   - Plan 04 wires the PATCH /api/auth/profile handler to accept locale.

function createSelectChain(rows: unknown[]) {
  return {
    from() {
      return {
        where() {
          return Promise.resolve(rows);
        },
      };
    },
  };
}

function createUpdateChain(row: Record<string, unknown>) {
  return {
    set(values: unknown) {
      return {
        where() {
          return {
            returning() {
              return Promise.resolve([
                { ...row, ...(values as Record<string, unknown>) },
              ]);
            },
          };
        },
      };
    },
  };
}

function createDb(row: Record<string, unknown>) {
  return {
    select: () => createSelectChain([row]),
    update: () => createUpdateChain(row),
  } as unknown as Parameters<typeof authRoutes>[0];
}

function createApp(actor: Express.Request["actor"], row: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.actor = actor;
    next();
  });
  app.use("/api/auth", authRoutes(createDb(row)));
  app.use(errorHandler);
  return app;
}

describe.sequential("PATCH /api/auth/profile { locale } persistence", () => {
  const baseUser = {
    id: "user-1",
    name: "Jane Example",
    email: "jane@example.com",
    image: null,
    locale: "pt-BR",
  };

  const actor = {
    type: "board" as const,
    userId: "user-1",
    source: "session" as const,
  };

  it("SETTINGS-03: new user defaults to locale='pt-BR'", async () => {
    const app = createApp(actor, baseUser);
    const res = await request(app).get("/api/auth/profile");
    expect(res.status).toBe(200);
    expect(res.body.locale).toBe("pt-BR");
  });

  it("SETTINGS-02: PATCH { locale: 'en-US' } persists and returns en-US", async () => {
    const app = createApp(actor, baseUser);
    const res = await request(app)
      .patch("/api/auth/profile")
      .send({ locale: "en-US" });
    expect(res.status).toBe(200);
    expect(res.body.locale).toBe("en-US");
  });

  it("rejects unknown locale 'fr-FR' with 400", async () => {
    const app = createApp(actor, baseUser);
    const res = await request(app)
      .patch("/api/auth/profile")
      .send({ locale: "fr-FR" });
    expect(res.status).toBe(400);
  });
});
