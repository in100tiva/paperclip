import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  HttpError,
  badRequestWithCode,
  notFoundWithCode,
} from "../../errors.js";
import { errorHandler } from "../error-handler.js";
import { validate } from "../validate.js";

// UI-07 (Phase 9 / Plan 09-03a) — error-handler integration tests.
// Asserts response body shape includes `code?` when present (legacy preserved
// when absent), and that ZodError emits `code: "validation.error"` plus
// per-issue codes derived from issue.code.

function makeApp(register: (app: express.Express) => void) {
  const app = express();
  app.use(express.json());
  register(app);
  app.use(errorHandler);
  return app;
}

describe("errorHandler — code emission", () => {
  it("legacy HttpError without code emits { error } (no `code` key)", async () => {
    const app = makeApp((a) => {
      a.get("/test", (_req, _res, next) => {
        next(new HttpError(404, "Not found"));
      });
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
    expect(res.body).not.toHaveProperty("code");
  });

  it("notFoundWithCode emits { error, code }", async () => {
    const app = makeApp((a) => {
      a.get("/test", (_req, _res, next) => {
        next(notFoundWithCode("Company X not found", "company.not-found"));
      });
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Company X not found",
      code: "company.not-found",
    });
  });

  it("badRequestWithCode emits { error, code, details }", async () => {
    const app = makeApp((a) => {
      a.get("/test", (_req, _res, next) => {
        next(
          badRequestWithCode("Validation failed", "validation.email.invalid", {
            field: "email",
          }),
        );
      });
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Validation failed",
      code: "validation.email.invalid",
      details: { field: "email" },
    });
  });

  it("ZodError emits code: 'validation.error' + per-issue codes", async () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });
    const app = makeApp((a) => {
      a.post("/test", validate(schema), (_req, res) => {
        res.json({ ok: true });
      });
    });
    const res = await request(app)
      .post("/test")
      .send({ email: "not-an-email", age: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
    expect(res.body.code).toBe("validation.error");
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThanOrEqual(2);
    for (const issue of res.body.details) {
      expect(issue).toHaveProperty("path");
      expect(issue).toHaveProperty("code");
      expect(issue).toHaveProperty("message");
      expect(typeof issue.code).toBe("string");
      expect(issue.code.startsWith("validation.")).toBe(true);
    }
    // Verify specific issue codes from email + age
    const emailIssue = res.body.details.find((d: { path: string }) => d.path === "email");
    const ageIssue = res.body.details.find((d: { path: string }) => d.path === "age");
    expect(emailIssue).toBeDefined();
    expect(ageIssue).toBeDefined();
    // zod email issue.code is "invalid_string"; min issue.code is "too_small"
    expect(emailIssue.code).toBe("validation.invalid_string");
    expect(ageIssue.code).toBe("validation.too_small");
  });

  it("generic non-HttpError emits { error: 'Internal server error' } at status 500", async () => {
    const app = makeApp((a) => {
      a.get("/test", (_req, _res, next) => {
        next(new Error("Boom"));
      });
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
