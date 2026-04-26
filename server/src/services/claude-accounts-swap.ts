import type { Db } from "@paperclipai/db";
import {
  claudeAccountsService,
  type ClaudeAccount,
  type ClaudeQuotaSubType,
} from "./claude-accounts.js";
import { NoAccountsAvailableError } from "../errors.js";
import { detectClaudeQuotaExhausted } from "@paperclipai/adapter-claude-local/server";

/**
 * MULTI-08 (Phase 5): Claude account swap orchestration.
 * See: server/src/services/claude-accounts-swap.md for design rationale.
 *
 * Flow:
 *   1. Classify exhaustion via detectClaudeQuotaExhausted (MULTI-06).
 *   2. Rotate via claudeAccountsService.rotateOnQuotaExhausted (DB updates only)
 *      → returns { rotationId, newAccount } — NO activity log emit yet (W1).
 *   3. Resolve credential dir for new account.
 *   4. Return retry plan for Strategy A (--resume on new account).
 *   5. Caller (heartbeat) executes the retry; if Strategy A fails (D-22), it
 *      calls orchestrateFallbackFullContext for Strategy B.
 *   6. AFTER Strategy A or B settles, caller invokes
 *      claudeAccountsService.recordSwapOutcome(rotationId, effectiveStrategy, status)
 *      to finalize observability (D-32). This module NEVER emits activity log.
 *
 * **W1 (revision r2):** activity log emission is DEFERRED to the caller. This
 * module returns rotationId so the heartbeat can call recordSwapOutcome with
 * the EFFECTIVE swapStrategy ('resume' or 'fallback_full_context') after the
 * retry finishes. D-32 observability matches reality.
 *
 * **D-19 (max 1 rotation per step):** caller passes alreadyRotatedThisStep
 * flag; if true, this function returns reason='rotation_cap_reached' without
 * invoking the service. Heartbeat tracks the flag locally per step.
 */

export type SwapReason =
  | "swapped"
  | "no_detection"
  | "pool_empty"
  | "rotation_cap_reached"
  | "missing_credentials";

export type SwapStrategy = "resume" | "fallback_full_context";

export interface OrchestrateClaudeSwapInput {
  db: Db;
  agentId: string;
  companyId: string;
  runId: string;
  stepId: string;
  fromAccountId: string;
  previousSessionId: string | null;
  adapterStdout: string;
  adapterStderr: string;
  continuationSummary: string | null;
  alreadyRotatedThisStep: boolean;
  actorId: string;
}

export interface OrchestrateClaudeSwapResult {
  swapped: boolean;
  reason: SwapReason;
  rotationId: string | null;
  newAccount: ClaudeAccount | null;
  newCredentialDir: string | null;
  strategy: SwapStrategy | null;
  retryPrompt: string | null;
  retrySessionId: string | null;
  detectedType: ClaudeQuotaSubType | null;
}

export async function orchestrateClaudeSwap(
  input: OrchestrateClaudeSwapInput,
): Promise<OrchestrateClaudeSwapResult> {
  // D-19: hard cap — at most one rotation per step.
  if (input.alreadyRotatedThisStep) {
    return emptyResult("rotation_cap_reached");
  }

  // Step 1: classify exhaustion. If detection misses, no swap.
  const detection = detectClaudeQuotaExhausted({
    stdout: input.adapterStdout,
    stderr: input.adapterStderr,
  });
  if (!detection.detected || detection.type === null) {
    return emptyResult("no_detection");
  }

  const svc = claudeAccountsService(input.db);

  // Step 2: rotate (DB updates only). W1 invariant: do NOT pass swapStrategy here.
  // recordSwapOutcome is the caller's responsibility once the retry resolves.
  let rotation: { rotationId: string; newAccount: ClaudeAccount };
  try {
    rotation = await svc.rotateOnQuotaExhausted({
      agentId: input.agentId,
      companyId: input.companyId,
      fromAccountId: input.fromAccountId,
      errorFamily: detection.type,
      retryNotBefore: detection.retryAt,
      actorId: input.actorId,
    });
  } catch (err) {
    if (err instanceof NoAccountsAvailableError) {
      return emptyResult("pool_empty");
    }
    throw err;
  }

  // Step 3: resolve credential dir for the new account. If the operator never
  // provisioned `~/.paperclip/claude-accounts/<slug>/`, the rotation persists
  // but the spawn cannot proceed. Caller will record the failure outcome.
  let newCredentialDir: string;
  try {
    newCredentialDir = await svc.resolveCredentialDir(rotation.newAccount);
  } catch {
    return {
      swapped: true,
      reason: "missing_credentials",
      rotationId: rotation.rotationId,
      newAccount: rotation.newAccount,
      newCredentialDir: null,
      strategy: null,
      retryPrompt: null,
      retrySessionId: null,
      detectedType: detection.type,
    };
  }

  // Step 4: build retry plan — Strategy A (resume) is the default first attempt.
  // Caller invokes adapter.execute with retrySessionId; if detectResumeFailed
  // returns true, caller pivots to Strategy B via orchestrateFallbackFullContext.
  return {
    swapped: true,
    reason: "swapped",
    rotationId: rotation.rotationId,
    newAccount: rotation.newAccount,
    newCredentialDir,
    strategy: "resume",
    retryPrompt: null,
    retrySessionId: input.previousSessionId,
    detectedType: detection.type,
  };
}

/**
 * Strategy B (D-21): full-context re-prompt fallback.
 *
 * Called by the heartbeat when Strategy A is detected to have failed (D-22 —
 * see detectResumeFailed). Builds the retry prompt with the continuation
 * summary embedded so the new account can pick up where the old one left off.
 *
 * **W1 invariant:** does NOT emit activity log. Caller calls
 * claudeAccountsService.recordSwapOutcome(rotationId, 'fallback_full_context', status)
 * AFTER the Strategy B spawn settles.
 */
export async function orchestrateFallbackFullContext(input: {
  db: Db;
  agentId: string;
  companyId: string;
  newAccount: ClaudeAccount;
  newCredentialDir: string;
  continuationSummary: string | null;
  lastInstruction: string | null;
  actorId: string;
}): Promise<{ retryPrompt: string; strategy: SwapStrategy }> {
  const summary =
    input.continuationSummary?.trim() ??
    "(no continuation summary captured before swap)";
  const lastInstr =
    input.lastInstruction?.trim() ??
    "(no recorded last instruction; agent should re-read the issue)";

  const retryPrompt = [
    "Continuation of prior work (account swap due to Claude quota exhaustion).",
    "",
    "Previous progress summary:",
    summary,
    "",
    "Resume from:",
    lastInstr,
  ].join("\n");

  return { retryPrompt, strategy: "fallback_full_context" };
}

/**
 * D-22: pattern detector for Strategy A (cross-account --resume) failure.
 *
 * Returns true when stdout/stderr indicates the resume target session does
 * not exist on the new account. Heartbeat reads this to pivot to Strategy B.
 */
export function detectResumeFailed(input: {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}): boolean {
  const blob = `${input.stdout}\n${input.stderr}`;
  if (
    /session\s+not\s+found|invalid\s+session\s+id|unknown\s+session|no\s+conversation\s+found\s+with\s+session\s+id/i.test(
      blob,
    )
  ) {
    return true;
  }
  // Exit code != 0 BEFORE any system:init event in the stream-JSON stdout.
  if (input.exitCode !== null && input.exitCode !== 0) {
    const hasInit = /"type"\s*:\s*"system"[\s\S]*?"subtype"\s*:\s*"init"/.test(
      input.stdout,
    );
    if (!hasInit) return true;
  }
  return false;
}

function emptyResult(reason: SwapReason): OrchestrateClaudeSwapResult {
  return {
    swapped: false,
    reason,
    rotationId: null,
    newAccount: null,
    newCredentialDir: null,
    strategy: null,
    retryPrompt: null,
    retrySessionId: null,
    detectedType: null,
  };
}
