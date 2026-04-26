import { describe, expect, it } from "vitest";
import {
  HttpError,
  badRequest,
  badRequestWithCode,
  conflict,
  conflictWithCode,
  forbidden,
  forbiddenWithCode,
  notFound,
  notFoundWithCode,
  unauthorized,
  unauthorizedWithCode,
  unprocessable,
  unprocessableWithCode,
} from "../errors.js";

// UI-07 (Phase 9 / Plan 09-03a) — server-side error code emission foundation.
// HttpError is extended with optional `code?: string`; six new *WithCode() helpers
// run in parallel to the legacy six helpers (zero regression on 130+ legacy callsites).

describe("HttpError class", () => {
  it("constructor without details preserves legacy 2-arg form", () => {
    const err = new HttpError(404, "Not found");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.details).toBeUndefined();
    expect(err.code).toBeUndefined();
  });

  it("constructor with details preserves legacy 3-arg positional form", () => {
    const err = new HttpError(400, "Bad", { field: "x" });
    expect(err.status).toBe(400);
    expect(err.message).toBe("Bad");
    expect(err.details).toEqual({ field: "x" });
    expect(err.code).toBeUndefined();
  });

  it("supports optional `code` property assignable post-construction", () => {
    const err = new HttpError(409, "Boom");
    err.code = "company.archive-failed";
    expect(err.code).toBe("company.archive-failed");
  });
});

describe("*WithCode helpers", () => {
  it("badRequestWithCode returns HttpError with status=400 + code", () => {
    const err = badRequestWithCode("Validation failed", "validation.email.invalid");
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("Validation failed");
    expect(err.code).toBe("validation.email.invalid");
    expect(err.details).toBeUndefined();
  });

  it("badRequestWithCode passes through details", () => {
    const err = badRequestWithCode("Bad email", "validation.email.invalid", {
      field: "email",
    });
    expect(err.code).toBe("validation.email.invalid");
    expect(err.details).toEqual({ field: "email" });
  });

  it("notFoundWithCode returns HttpError with status=404 + code", () => {
    const err = notFoundWithCode("Company X not found", "company.not-found");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Company X not found");
    expect(err.code).toBe("company.not-found");
  });

  it("forbiddenWithCode returns HttpError with status=403 + code", () => {
    const err = forbiddenWithCode("Access denied", "auth.forbidden");
    expect(err.status).toBe(403);
    expect(err.code).toBe("auth.forbidden");
  });

  it("unauthorizedWithCode returns HttpError with status=401 + code", () => {
    const err = unauthorizedWithCode("Session expired", "auth.session.expired");
    expect(err.status).toBe(401);
    expect(err.code).toBe("auth.session.expired");
  });

  it("conflictWithCode returns HttpError with status=409 + code + details", () => {
    const err = conflictWithCode("Already used", "invite.already-used", {
      inviteId: "abc",
    });
    expect(err.status).toBe(409);
    expect(err.code).toBe("invite.already-used");
    expect(err.details).toEqual({ inviteId: "abc" });
  });

  it("unprocessableWithCode returns HttpError with status=422 + code", () => {
    const err = unprocessableWithCode("Invite expired", "invite.expired");
    expect(err.status).toBe(422);
    expect(err.code).toBe("invite.expired");
  });
});

describe("backward compat — legacy helpers untouched", () => {
  it("badRequest legacy returns HttpError without `code`", () => {
    const err = badRequest("Bad", { x: 1 });
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("Bad");
    expect(err.details).toEqual({ x: 1 });
    expect(err.code).toBeUndefined();
  });

  it("notFound legacy returns HttpError without `code`", () => {
    const err = notFound();
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.code).toBeUndefined();
  });

  it("forbidden legacy returns HttpError without `code`", () => {
    const err = forbidden();
    expect(err.status).toBe(403);
    expect(err.code).toBeUndefined();
  });

  it("unauthorized legacy returns HttpError without `code`", () => {
    const err = unauthorized();
    expect(err.status).toBe(401);
    expect(err.code).toBeUndefined();
  });

  it("conflict legacy returns HttpError without `code`", () => {
    const err = conflict("Boom");
    expect(err.status).toBe(409);
    expect(err.code).toBeUndefined();
  });

  it("unprocessable legacy returns HttpError without `code`", () => {
    const err = unprocessable("Nope");
    expect(err.status).toBe(422);
    expect(err.code).toBeUndefined();
  });
});
