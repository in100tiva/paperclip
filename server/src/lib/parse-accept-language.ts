/**
 * Minimal Accept-Language parser for the 2 locales paperclip supports in v1.1.
 *
 * v1.1 supports only 'pt-BR' and 'en-US' — full RFC 7231 q-value parsing is
 * over-engineering (deferred to v2 as L10N-01 expands the locale set).
 * `startsWith('pt')` / `startsWith('en')` is sufficient for browsers sending
 * `pt-BR,pt;q=0.9,en;q=0.5`-style headers.
 */
export interface RequestLike {
  header(name: string): string | undefined;
}

export function parseAcceptLanguage(req: RequestLike): "pt-BR" | "en-US" | null {
  const header = req.header("accept-language");
  if (!header) return null;
  const lower = header.toLowerCase().trim();
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("en")) return "en-US";
  return null;
}
