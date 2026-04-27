import type { RuntimeLocale } from "./heartbeat-locale.js";

/**
 * Builds the language directive markdown block injected into agent system
 * prompts so the underlying LLM responds in the operator's preferred language.
 *
 * Returns an empty string for `en-US` because en-US is the model default —
 * emitting an explicit block would only burn tokens without changing behavior
 * (decision documented in 11-CONTEXT.md "decisions" + 11-RESEARCH.md
 * §"Open Questions" Q2; revisit in UAT if drift is observed).
 *
 * Pure: no I/O, no DB access, no global state. Idempotent — repeated calls
 * with the same locale return byte-identical strings.
 *
 * Output format always emits leading and trailing newlines so callers can
 * concatenate the block to existing instructions content without worrying
 * about adjacent-section spacing.
 */
export function buildLanguageDirectiveBlock(locale: RuntimeLocale): string {
  if (locale !== "pt-BR") return "";
  return [
    "",
    "",
    "## Idioma de Resposta",
    "",
    "Responda ao usuário em português brasileiro (pt-BR). Use linguagem natural, técnica quando apropriado. Mantenha termos técnicos em inglês quando idiomáticos (ex: \"commit\", \"merge\", \"pull request\").",
    "",
  ].join("\n");
}
