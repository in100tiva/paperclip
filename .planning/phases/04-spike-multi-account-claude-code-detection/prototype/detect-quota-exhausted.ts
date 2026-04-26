/**
 * Spike Phase 4 — protótipo descartável de detecção de exhaustão Claude Code.
 *
 * NÃO IMPORTAR DESTA LOCALIZAÇÃO em código de produção.
 * Phase 5 MULTI-06 implementa a versão de produção em packages/adapters/claude-local/src/server/.
 *
 * Conforme D-09 (04-CONTEXT.md): protótipo standalone, sem dependências do monorepo.
 * Reusa as regex de parse.ts:12-15 como ponto de partida; estende apenas onde a taxonomia
 * (CLAUDE_429_TAXONOMY.md) identifica gap específico.
 */

export type QuotaType =
  | "rpm_transient"
  | "tpm_transient"
  | "daily_quota"
  | "weekly_quota"
  | "session_5h"
  | "org_tier"
  | "unknown";

export type DetectionSource = "regex" | "header" | "stream_event";

export interface QuotaDetectionResult {
  type: QuotaType;
  confidence: number; // 0..1
  retryAt: Date | null;
  source: DetectionSource;
}

// Regex top-level (cobertura ampla — espelho de CLAUDE_TRANSIENT_UPSTREAM_RE em parse.ts:13)
const TRANSIENT_UPSTREAM_RE =
  /(?:rate[-\s]?limit(?:ed)?|rate_limit_error|too\s+many\s+requests|\b429\b|overloaded(?:_error)?|server\s+overloaded|service\s+unavailable|\b503\b|\b529\b|high\s+demand|try\s+again\s+later|temporarily\s+unavailable|throttl(?:ed|ing)|throttlingexception|servicequotaexceededexception|out\s+of\s+extra\s+usage|extra\s+usage\b|claude\s+usage\s+limit\s+reached|5[-\s]?hour\s+limit\s+reached|weekly\s+limit\s+reached|usage\s+limit\s+reached|usage\s+cap\s+reached)/i;

const RESET_RE =
  /(?:out\s+of\s+extra\s+usage|extra\s+usage|usage\s+limit\s+reached|usage\s+cap\s+reached|5[-\s]?hour\s+limit\s+reached|weekly\s+limit\s+reached|claude\s+usage\s+limit\s+reached)[\s\S]{0,80}?\bresets?\s+(?:at\s+)?([^\n()]+?)(?:\s*\(([^)]+)\))?(?:[.!]|\n|$)/i;

// Sub-tipo discriminators (refinamento sobre o regex top-level — cobertura partial flagada na taxonomy)
//
// Nota sobre ambiguidade "claude usage limit reached": esta string aparece em ambos
// daily_quota e session_5h. O discriminator strict para session_5h exige o token
// específico "5-hour limit reached"; "claude usage limit reached" só conta como
// session_5h se aparecer JUNTO com o token 5-hour. Caso contrário, cai em daily_quota
// (mais conservador — daily reset é menos disruptivo que session_5h).
const SESSION_5H_RE = /5[-\s]?hour\s+limit\s+reached/i;
const WEEKLY_RE = /weekly\s+limit\s+reached/i;
const DAILY_RE = /(?:out\s+of\s+extra\s+usage|extra\s+usage\b|usage\s+limit\s+reached|usage\s+cap\s+reached|claude\s+usage\s+limit\s+reached)/i;
const TPM_RE = /token(?:s)?[-\s]?(?:per[-\s]?minute|\/minute|\/min)|tokens?\s+per\s+minute|input\s+tokens\s+per\s+minute/i;
const RPM_RE = /rate_limit_error|too\s+many\s+requests|\b429\b|request[-\s]?per[-\s]?minute|requests?\s+per\s+minute/i;
const ORG_TIER_RE = /overloaded(?:_error)?|server\s+overloaded|service\s+unavailable|\b503\b|\b529\b|high\s+demand/i;

function parseRetryAt(input: string): Date | null {
  const match = input.match(RESET_RE);
  if (!match) return null;
  const candidate = (match[1] || "").trim();
  if (!candidate) return null;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function detectClaudeQuotaExhausted(input: string): QuotaDetectionResult {
  if (!input || !TRANSIENT_UPSTREAM_RE.test(input)) {
    return { type: "unknown", confidence: 0, retryAt: null, source: "regex" };
  }

  const retryAt = parseRetryAt(input);

  // Ordem de discriminação: mais específico → mais genérico
  if (SESSION_5H_RE.test(input)) {
    return { type: "session_5h", confidence: 0.9, retryAt, source: "regex" };
  }
  if (WEEKLY_RE.test(input)) {
    return { type: "weekly_quota", confidence: 0.9, retryAt, source: "regex" };
  }
  if (DAILY_RE.test(input) && retryAt && !SESSION_5H_RE.test(input) && !WEEKLY_RE.test(input)) {
    return { type: "daily_quota", confidence: 0.8, retryAt, source: "regex" };
  }
  if (TPM_RE.test(input)) {
    return { type: "tpm_transient", confidence: 0.7, retryAt, source: "regex" };
  }
  if (ORG_TIER_RE.test(input) && !RPM_RE.test(input)) {
    return { type: "org_tier", confidence: 0.6, retryAt, source: "regex" };
  }
  if (RPM_RE.test(input)) {
    return { type: "rpm_transient", confidence: 0.7, retryAt, source: "regex" };
  }

  // Match no top-level mas nenhum discriminator — flag como unknown low-confidence
  return { type: "unknown", confidence: 0.3, retryAt, source: "regex" };
}
