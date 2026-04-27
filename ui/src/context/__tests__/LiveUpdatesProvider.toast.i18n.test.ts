// @vitest-environment jsdom

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { TFunction } from "i18next";
import i18n from "../../i18n";
import { __liveUpdatesTestUtils } from "../LiveUpdatesProvider";

// Phase 10-03 — LiveUpdatesProvider toast i18n probe (AGENT-MSG-04).
//
// Validates:
//   1. buildAgentStatusToast pt-BR
//   2. buildRunStatusToast pt-BR
//   3. buildActivityToast pt-BR
//   4. buildJoinRequestToast pt-BR
//   5. language change does not trigger socket reconnect (Pitfall 2 — tRef pattern)

beforeAll(async () => {
  await i18n.changeLanguage("pt-BR");
});

afterAll(async () => {
  await i18n.changeLanguage("pt-BR");
});

function makeT(): TFunction {
  return i18n.t.bind(i18n) as TFunction;
}

describe("LiveUpdatesProvider toast i18n (AGENT-MSG-04)", () => {
  it("buildAgentStatusToast returns 'X com erro' in pt-BR", () => {
    const queryClient = {
      getQueryData: () => [
        { id: "agent-1", title: "Software Engineer" },
      ],
    };

    const toast = __liveUpdatesTestUtils.buildAgentStatusToast(
      { agentId: "agent-1", status: "error" },
      () => "Bot",
      queryClient as never,
      "company-1",
      makeT(),
    );

    expect(toast).not.toBeNull();
    expect(toast!.title).toBe("Bot com erro");
    expect(toast!.action?.label).toBe("Ver agente");
  });

  it("buildRunStatusToast returns 'Execução de Bot falhou' with trigger prefix body", () => {
    const toast = __liveUpdatesTestUtils.buildRunStatusToast(
      {
        runId: "run-1",
        agentId: "agent-1",
        status: "failed",
        triggerDetail: "manual",
      },
      () => "Bot",
      makeT(),
    );

    expect(toast).not.toBeNull();
    expect(toast!.title).toBe("Execução de Bot falhou");
    expect(toast!.body).toBe("Gatilho: manual");
    expect(toast!.action?.label).toBe("Ver execução");
  });

  it("buildActivityToast returns '{actor} criou {ref}' in pt-BR", () => {
    const queryClient = { getQueryData: () => undefined };

    const toast = __liveUpdatesTestUtils.buildActivityToast(
      queryClient as never,
      "company-1",
      {
        entityType: "issue",
        entityId: "issue-1",
        action: "issue.created",
        actorId: "user-1",
        actorType: "user",
        details: { identifier: "TASK-123" },
      },
      { userId: null, agentId: null },
      makeT(),
    );

    expect(toast).not.toBeNull();
    // resolveActorLabel falls back to "Board" for user actors when directory
    // entry is absent (queryClient returns undefined).
    expect(toast!.title).toBe("Board criou TASK-123");
    expect(toast!.action?.label).toBe("Ver TASK-123");
  });

  it("buildJoinRequestToast returns 'Um agente quer entrar' in pt-BR", () => {
    const toast = __liveUpdatesTestUtils.buildJoinRequestToast(
      {
        entityType: "join_request",
        entityId: "jr-1",
        action: "join.requested",
        details: { requestType: "agent" },
      },
      makeT(),
    );

    expect(toast).not.toBeNull();
    expect(toast!.title).toBe("Um agente quer entrar");
    expect(toast!.body).toBe(
      "Uma nova solicitação de entrada aguarda aprovação.",
    );
    expect(toast!.action?.label).toBe("Ver inbox");
  });
});

// Case 5 — Pitfall 2 verification.
//
// Mock all heavy deps so we can mount LiveUpdatesProvider in jsdom.
// The point of the test is: changing i18n language must NOT close + reopen
// the WebSocket. With tRef pattern, the socket-mounting useEffect's deps
// array does not include `t`, so re-render from changeLanguage doesn't
// trigger cleanup + re-mount.
vi.mock("../CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1" },
  }),
  CompanyProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock("../../api/auth", () => ({
  authApi: {
    getSession: () =>
      Promise.resolve({
        user: { id: "user-1" },
        session: { id: "session-1", userId: "user-1" },
      }),
  },
}));

vi.mock("../../lib/router", () => ({
  useLocation: () => ({ pathname: "/" }),
}));

describe("LiveUpdatesProvider language change (Pitfall 2 — tRef no-reconnect)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("language change does not trigger socket reconnect (closeSocketQuietly NOT called)", async () => {
    const wsInstances: Array<{
      close: ReturnType<typeof vi.fn>;
      readyState: number;
    }> = [];
    const OriginalWebSocket = globalThis.WebSocket;

    class FakeWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 0;
      onopen: ((ev: Event) => unknown) | null = null;
      onmessage: ((ev: MessageEvent) => unknown) | null = null;
      onerror: ((ev: Event) => unknown) | null = null;
      onclose: ((ev: CloseEvent) => unknown) | null = null;
      close = vi.fn(() => {
        this.readyState = 3;
      });
      constructor(_url: string) {
        wsInstances.push({ close: this.close, readyState: this.readyState });
        setTimeout(() => {
          this.readyState = 1;
          this.onopen?.(new Event("open"));
        }, 0);
      }
    }

    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
      FakeWebSocket as unknown as typeof WebSocket;

    try {
      const React = await import("react");
      const { render, act } = await import("@testing-library/react");
      const { I18nextProvider } = await import("react-i18next");
      const { QueryClient, QueryClientProvider } = await import(
        "@tanstack/react-query"
      );
      const { LiveUpdatesProvider } = await import("../LiveUpdatesProvider");
      const { ToastProvider } = await import("../ToastContext");

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const ui = React.createElement(
        I18nextProvider,
        { i18n },
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(
            ToastProvider,
            null,
            React.createElement(
              LiveUpdatesProvider,
              null,
              React.createElement("div", null, "child"),
            ),
          ),
        ),
      );

      const { unmount } = render(ui);

      // Allow auth query (setTimeout 0) + connect (setTimeout 0) to settle.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      const socketsBefore = wsInstances.length;
      const closeCallsBefore = wsInstances.reduce(
        (sum, ws) => sum + ws.close.mock.calls.length,
        0,
      );
      // Sanity: at least one socket should have been constructed.
      expect(socketsBefore).toBeGreaterThanOrEqual(1);

      // Toggle language. With tRef pattern, the socket-mounting useEffect
      // does NOT re-run, so no new sockets and no close calls.
      await act(async () => {
        await i18n.changeLanguage("en-US");
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(wsInstances.length).toBe(socketsBefore);
      const closeCallsAfter = wsInstances.reduce(
        (sum, ws) => sum + ws.close.mock.calls.length,
        0,
      );
      expect(closeCallsAfter).toBe(closeCallsBefore);

      unmount();
    } finally {
      (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
        OriginalWebSocket;
      await i18n.changeLanguage("pt-BR");
    }
  });
});
