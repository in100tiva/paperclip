# Claude Accounts Swap Strategy

**Status:** Active (Phase 5 — MULTI-08)
**Audience:** developers maintaining `claude-accounts.ts` service and `heartbeat.ts` integration.
**Source decisions:** D-20, D-21, D-22, D-23, D-24 in `.planning/phases/05-multi-account-claude-code-swap-implementacao/05-CONTEXT.md`.

## Problem

When the Claude Code CLI account currently bound to an agent hits a quota limit (rpm_transient, tpm_transient, daily_quota, weekly_quota, session_5h, or org_tier — see `CLAUDE_429_TAXONOMY.md`), the agent step fails with `errorFamily: "transient_upstream"`. Without rotation, the agent stalls until the quota resets — defeating the entire point of running a pool of accounts.

## Strategy Overview

On detection of quota exhaustion mid-step, the system:

1. **Detects** via `detectClaudeQuotaExhausted` (parse.ts, MULTI-06).
2. **Drains** the current step (lets it fail cleanly with the transient_upstream classification).
3. **Captures** the continuation summary using the existing `issue-continuation-summary.ts` service (paperclip primitive).
4. **Rotates** the agent's `agent_account_bindings.activeAccountId` to the next eligible account via `claudeAccountsService.rotateOnQuotaExhausted()`.
5. **Resumes** work using one of two strategies (primary or fallback).

## Strategy A: Cross-Account Resume (Primary, Optimistic)

**Attempt:** spawn the next step in the new account with `--resume <session_id>` where `session_id` is the one captured before exhaustion.

**Expected outcome based on Phase 4 findings:** likely fails. Finding 7 (FINDINGS-FOR-PHASE-5.md) states that `~/.paperclip/claude-accounts/<slug>/` isolates session storage per account; a `session_id` registered in account A does not exist in account B. The `claude` CLI returns "session not found" or similar.

**Detection of failure (D-22):** before the first `system:init` event of the new spawn, watch stderr/stdout for:
- `session not found`
- `invalid session id`
- exit code != 0 with no successful event emitted

**If failure detected within ~5s:** abandon Strategy A, switch to Strategy B for the same step.

**Why try anyway:** UAT-04-03 (human-validated) may eventually confirm that some Claude CLI version supports cross-account resume (perhaps via shared org-level session metadata). Trying Strategy A first costs ~5s and zero tokens; success would skip Strategy B's overhead entirely.

## Strategy B: Full-Context Re-Prompt (Fallback, Plan B)

**When triggered:** Strategy A fails OR is skipped (e.g., `swapStrategy === 'fallback_full_context'` chosen explicitly).

**Mechanism:** spawn a new session in the new account with the `issue_continuation_summary` content embedded as the initial prompt:

```
Continuation of prior work (account swap due to quota exhaustion).

Previous progress summary:
<continuation_summary captured before swap>

Resume from: <last instruction or step description>
```

**Cost:** the first message in the new session re-pays the context tokens (the summary, plus whatever skill/agent-instruction priming the agent normally loads). For long-running agents this can be significant; for short agents it's negligible.

**Gain:** continuity is preserved. The agent does not lose its place. This is the contract the user expects.

**Limitation:** if `issue_continuation_summary` itself is empty or insufficient (rare but possible early in an agent's life), the fallback degrades to "start over with original instructions." The activity log entry records this so operators can audit.

## Activity Log Entry

Every swap (success or failure) emits one `claude_account_rotated` activity log entry (MULTI-10, D-30). The `swapStrategy` field records which path was taken:

- `'resume'` — Strategy A succeeded
- `'fallback_full_context'` — Strategy B was used (either after Strategy A failed or skipped)
- `null` — swap not yet completed (rare; e.g., manual rotation by operator before agent next runs)

Operators can filter the activity log by `action = 'claude_account_rotated' AND details->>'swapStrategy' = 'fallback_full_context'` to find swaps that incurred the token cost — useful for tuning per-tier behavior.

## Guard: One Rotation Per Step (D-19)

To prevent thrashing in scenarios where multiple accounts are simultaneously near exhaustion, **a single agent step is allowed at most one automatic rotation**. If the new account also returns `transient_upstream` on the same step, the step fails permanently with an activity log entry capturing both account IDs and the cascading failure. Operators can manually retry after cooldown.

## Refinement Path

UAT-04-03 (`.planning/phases/04-spike-multi-account-claude-code-detection/04-HUMAN-UAT.md`) is the empirical validator for Strategy A. Until it returns:
- Strategy B is the default (Plan B confirmed by user during phase planning).
- Strategy A is attempted but not relied on.

Once UAT-04-03 returns:
- **If Strategy A works:** keep current code; document in summary; metrics will reflect the success rate of `swapStrategy = 'resume'`.
- **If Strategy A fails consistently:** consider removing the attempt and going straight to Strategy B, saving the ~5s detection latency.

## References

- `.planning/phases/04-spike-multi-account-claude-code-detection/FINDINGS-FOR-PHASE-5.md` (Findings 6, 7)
- `.planning/phases/05-multi-account-claude-code-swap-implementacao/05-CONTEXT.md` (D-20, D-21, D-22, D-23, D-24)
- `server/src/services/issue-continuation-summary.ts` (existing primitive consumed)
- `packages/adapters/claude-local/src/server/parse.ts` (detection — MULTI-06)
- `server/src/services/claude-accounts.ts` (rotation orchestration — MULTI-04, MULTI-08)
