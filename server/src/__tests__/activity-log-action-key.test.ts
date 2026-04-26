import { describe, it, expect, vi } from "vitest";

// UI-09 (Wave 0/1): activity-log accepts and persists actionKey + paramsJson.
// Mocks `live-events` and `instance-settings` so we can exercise logActivity()
// without a real DB or websocket bus, then assert the .values(...) payload
// passed to db.insert(activityLog).

vi.mock("../services/live-events.js", () => ({
  publishLiveEvent: vi.fn(),
}));

vi.mock("../services/instance-settings.js", () => ({
  instanceSettingsService: () => ({
    getGeneral: async () => ({ censorUsernameInLogs: false }),
  }),
}));

import { logActivity } from "../services/activity-log.js";
import { publishLiveEvent } from "../services/live-events.js";

type ValuesCall = Record<string, unknown>;

function createDbStub() {
  const calls: ValuesCall[] = [];
  const values = vi.fn(async (v: ValuesCall) => {
    calls.push(v);
    return undefined;
  });
  const insert = vi.fn(() => ({ values }));
  return { db: { insert } as unknown as Parameters<typeof logActivity>[0], calls, insert, values };
}

describe("activity-log: actionKey + paramsJson persistence (UI-09)", () => {
  it("persists actionKey + paramsJson when provided", async () => {
    const { db, calls } = createDbStub();

    await logActivity(db, {
      companyId: "comp-1",
      actorType: "user",
      actorId: "user-1",
      action: "issue.created",
      actionKey: "issue.created",
      paramsJson: { title: "Test issue" },
      entityType: "issue",
      entityId: "issue-1",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].action).toBe("issue.created");
    expect(calls[0].actionKey).toBe("issue.created");
    expect(calls[0].paramsJson).toEqual({ title: "Test issue" });
  });

  it("passes null for actionKey + paramsJson when omitted (legacy callsite retrocompat)", async () => {
    const { db, calls } = createDbStub();

    await logActivity(db, {
      companyId: "comp-1",
      actorType: "system",
      actorId: "system",
      action: "issue.legacy_action",
      entityType: "issue",
      entityId: "issue-1",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].actionKey).toBeNull();
    expect(calls[0].paramsJson).toBeNull();
    expect(calls[0].action).toBe("issue.legacy_action");
  });

  it("includes actionKey + paramsJson in live event payload broadcast", async () => {
    const { db } = createDbStub();
    const publishMock = vi.mocked(publishLiveEvent);
    publishMock.mockClear();

    await logActivity(db, {
      companyId: "comp-1",
      actorType: "user",
      actorId: "user-1",
      action: "claude_account_rotated",
      actionKey: "claude-account-rotated",
      paramsJson: { reason: "exhausted" },
      entityType: "agent",
      entityId: "agent-1",
    });

    expect(publishMock).toHaveBeenCalledTimes(1);
    const call = publishMock.mock.calls[0][0];
    expect(call.type).toBe("activity.logged");
    const payload = call.payload as Record<string, unknown>;
    expect(payload.actionKey).toBe("claude-account-rotated");
    expect(payload.paramsJson).toEqual({ reason: "exhausted" });
  });
});
