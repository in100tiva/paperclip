import { describe, it, expect } from "vitest";
import { ApiError } from "../client";

describe("ApiError.code parsing (Plan 09-03b Task 1)", () => {
  it("parses body.code when body is an object with a string code field", () => {
    const err = new ApiError("Company not found", 404, {
      error: "Company not found",
      code: "company.not-found",
    });
    expect(err.code).toBe("company.not-found");
    expect(err.message).toBe("Company not found");
    expect(err.status).toBe(404);
    expect(err.name).toBe("ApiError");
  });

  it("leaves code undefined when body is an object without a code field", () => {
    const err = new ApiError("Not found", 404, { error: "Not found" });
    expect(err.code).toBeUndefined();
    expect(err.body).toEqual({ error: "Not found" });
  });

  it("leaves code undefined when body is null without throwing", () => {
    const err = new ApiError("Server error", 500, null);
    expect(err.code).toBeUndefined();
    expect(err.body).toBeNull();
  });

  it("leaves code undefined when body is a non-object (string) without throwing", () => {
    const err = new ApiError("Bad request", 400, "raw string body");
    expect(err.code).toBeUndefined();
    expect(err.body).toBe("raw string body");
  });
});
