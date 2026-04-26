# Deferred Items — Phase 5 Multi-Account

Out-of-scope findings discovered during plan execution; tracked here for downstream visibility, not fixed inline.

## From 05-02 (Quota Classifier)

- **Uncommitted parallel work in `server/src/__tests__/claude-local-execute.test.ts` (+196 lines) failing 11/14 tests** — observed in shared working tree at execution time. Likely 05-05 (MULTI-05 wiring) work-in-progress. NOT introduced by 05-02 commit `78f8371`. 05-02 explicitly verified parse-related suites (`claude-local-adapter.test.ts`, `claude-local-adapter-environment.test.ts`, `claude-local-adapter-quota-detection.test.ts`) all pass: 21/21. Owner: 05-05 author to resolve before final commit of that plan.
