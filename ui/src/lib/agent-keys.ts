import type { AgentStatus, AgentRole } from "@paperclipai/shared";

/**
 * Lookup canonical client-side mapping from AgentStatus enum to i18n key.
 * Mirrors the STATUS_KEY pattern from Phase 8-03 (ClaudeAccounts).
 *
 * Server constants (`AGENT_STATUSES` in @paperclipai/shared) remain English for
 * logs/exports; UI translation happens client-side via this lookup.
 */
export const AGENT_STATUS_KEY: Record<AgentStatus, `agents:status.${string}`> = {
  active: "agents:status.active",
  paused: "agents:status.paused",
  idle: "agents:status.idle",
  running: "agents:status.running",
  error: "agents:status.error",
  pending_approval: "agents:status.pending-approval",
  terminated: "agents:status.terminated",
};

/**
 * Lookup canonical client-side mapping from AgentRole enum to i18n key.
 * Server `AGENT_ROLE_LABELS` remains English for logs/exports.
 *
 * Note: CEO/CTO/CMO/CFO/PM/QA/DevOps are international acronyms — pt-BR
 * translations are identical to en-US for those keys.
 */
export const AGENT_ROLE_KEY: Record<AgentRole, `agents:role.${string}`> = {
  ceo: "agents:role.ceo",
  cto: "agents:role.cto",
  cmo: "agents:role.cmo",
  cfo: "agents:role.cfo",
  engineer: "agents:role.engineer",
  designer: "agents:role.designer",
  pm: "agents:role.pm",
  qa: "agents:role.qa",
  devops: "agents:role.devops",
  researcher: "agents:role.researcher",
  general: "agents:role.general",
};
