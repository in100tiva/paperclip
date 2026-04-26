import type { TFunction } from "i18next";
import { ApiError } from "@/api/client";

/**
 * Result shape consumed by toast/banner components.
 *
 * - `title` is always a translated, user-facing string. Components should
 *   render it as the primary message.
 * - `body` is optional raw message context (typically the server-emitted
 *   English message or a non-ApiError exception message). Components should
 *   render it secondary/italics for diagnostic context when present.
 */
export interface TranslatedError {
  title: string;
  body?: string;
}

/**
 * Translate any error thrown by the API client (or any other thrown value)
 * into a localized title + optional raw-context body.
 *
 * Resolution strategy:
 *   1. If `error` is an `ApiError` with `.code`, attempt
 *      `t("errors:${code}", params)`. The `params` come from
 *      `error.body.params` when the server provides interpolation values
 *      (optional — server may emit just `{ error, code }`).
 *      i18next `defaultValue: null` returns null when the key is missing,
 *      so the helper can detect a miss without false-positive matches.
 *   2. Fallback: `{ title: t("errors:generic.unknown"), body: rawMessage }`
 *      where `rawMessage` is `error.message` for `Error` instances or
 *      `String(error)` otherwise. Surfaces the raw English text to operators
 *      while keeping the headline localized.
 */
export function translateApiError(
  error: unknown,
  t: TFunction,
): TranslatedError {
  // Cast t to a permissive signature so we can pass dynamic, dot-segmented
  // namespaced keys (`errors:${runtime-code}`) that the strict typed-t()
  // augmentation cannot statically prove. Type safety for static callsites
  // in components is preserved by the original `t: TFunction` parameter.
  const tt = t as unknown as (
    key: string,
    options?: Record<string, unknown>,
  ) => string | null;

  if (error instanceof ApiError && error.code) {
    const params =
      error.body && typeof error.body === "object" && "params" in error.body
        ? ((error.body as { params?: Record<string, unknown> }).params ?? {})
        : {};
    const translated = tt(`errors:${error.code}`, {
      ...params,
      defaultValue: null,
    });
    if (
      translated !== null &&
      translated !== undefined &&
      translated !== `errors:${error.code}`
    ) {
      return { title: translated };
    }
  }

  const rawMessage =
    error instanceof Error ? error.message : String(error);
  const fallbackTitle = tt("errors:generic.unknown") ?? "Something went wrong.";
  return {
    title: fallbackTitle,
    body: rawMessage,
  };
}
