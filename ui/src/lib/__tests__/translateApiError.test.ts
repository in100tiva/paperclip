import { describe, it, expect } from "vitest";
import type { TFunction } from "i18next";
import { translateApiError } from "../translateApiError";
import { ApiError } from "@/api/client";

// Crude mock of i18next's t() — supports {{param}} interpolation and
// returns null when the key is unmapped and defaultValue is null
// (mirrors i18next behaviour used by translateApiError fallback path).
const tMock = ((key: string, options?: Record<string, unknown>) => {
  const dict: Record<string, string> = {
    "errors:company.not-found": "Empresa não encontrada.",
    "errors:generic.unknown": "Algo deu errado.",
    "errors:auth.user-already-exists":
      "Já existe uma conta para {{email}}. Entre abaixo para continuar.",
  };
  const raw = dict[key];
  if (raw === undefined && options && options.defaultValue === null) {
    return null;
  }
  if (raw === undefined) return key;
  if (options) {
    return raw.replace(/\{\{(\w+)\}\}/g, (_, name) =>
      String(
        (options as Record<string, unknown>)[name] !== undefined
          ? (options as Record<string, unknown>)[name]
          : `{{${name}}}`,
      ),
    );
  }
  return raw;
}) as unknown as TFunction;

describe("translateApiError (Plan 09-03b Task 2)", () => {
  it("returns translated title when ApiError.code maps to an errors.json key", () => {
    const err = new ApiError("Not found", 404, {
      error: "Not found",
      code: "company.not-found",
    });
    const result = translateApiError(err, tMock);
    expect(result).toEqual({ title: "Empresa não encontrada." });
  });

  it("falls back to generic.unknown + raw message body when code is unmapped", () => {
    const err = new ApiError("Whatever", 400, {
      error: "Whatever",
      code: "unmapped.code",
    });
    const result = translateApiError(err, tMock);
    expect(result).toEqual({
      title: "Algo deu errado.",
      body: "Whatever",
    });
  });

  it("falls back to generic.unknown + raw message body for non-ApiError Error", () => {
    const err = new Error("Network failure");
    const result = translateApiError(err, tMock);
    expect(result).toEqual({
      title: "Algo deu errado.",
      body: "Network failure",
    });
  });

  it("falls back to generic.unknown + stringified value for non-Error inputs", () => {
    const result = translateApiError("string error", tMock);
    expect(result).toEqual({
      title: "Algo deu errado.",
      body: "string error",
    });
  });

  it("interpolates params from body.params when present", () => {
    const err = new ApiError("Conflict", 409, {
      error: "Conflict",
      code: "auth.user-already-exists",
      params: { email: "a@b.com" },
    });
    const result = translateApiError(err, tMock);
    expect(result).toEqual({
      title: "Já existe uma conta para a@b.com. Entre abaixo para continuar.",
    });
  });
});
