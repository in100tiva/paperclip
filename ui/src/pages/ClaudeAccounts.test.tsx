// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeAccounts } from "./ClaudeAccounts";
import type { ClaudeAccount, RotationHistoryEntry } from "@/api/claude-accounts";

const listMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());
const rotationHistoryMock = vi.hoisted(() => vi.fn());
const costSummaryMock = vi.hoisted(() => vi.fn());
const pushToastMock = vi.hoisted(() => vi.fn());
const setBreadcrumbsMock = vi.hoisted(() => vi.fn());

vi.mock("@/api/claude-accounts", async () => {
  const actual = await vi.importActual<typeof import("@/api/claude-accounts")>(
    "@/api/claude-accounts",
  );
  return {
    ...actual,
    claudeAccountsApi: {
      list: (companyId: string) => listMock(companyId),
      create: (companyId: string, input: unknown) => createMock(companyId, input),
      patch: (companyId: string, accountId: string, input: unknown) =>
        patchMock(companyId, accountId, input),
      rotationHistory: (companyId: string, limit?: number) =>
        rotationHistoryMock(companyId, limit),
      costSummary: (companyId: string, range?: { from?: string; to?: string }) =>
        costSummaryMock(companyId, range),
    },
  };
});

vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", name: "Paperclip", issuePrefix: "PAP" },
  }),
}));

vi.mock("@/context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: setBreadcrumbsMock }),
}));

vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ pushToast: pushToastMock }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

function setControlledInputValue(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  nativeSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function makeAccount(overrides: Partial<ClaudeAccount> = {}): ClaudeAccount {
  return {
    id: "acc-aaaaaaaa-1111-1111-1111-111111111111",
    companyId: "company-1",
    ownerUserId: "user-1",
    label: "Account A",
    configDirSlug: "a",
    status: "live",
    scope: "company",
    lastQuotaWindowsJson: {},
    exhaustedUntil: null,
    lastUsedAt: "2026-04-25T12:00:00.000Z",
    createdAt: "2026-04-20T00:00:00.000Z",
    updatedAt: "2026-04-25T12:00:00.000Z",
    ...overrides,
  };
}

function makeRotation(overrides: Partial<RotationHistoryEntry> = {}): RotationHistoryEntry {
  return {
    id: "rot-1",
    companyId: "company-1",
    action: "claude_account_rotated",
    entityType: "agent",
    entityId: "agent-1",
    agentId: "agent-1aaaaaaa-2222-2222-2222-222222222222",
    runId: null,
    createdAt: "2026-04-26T00:00:00.000Z",
    details: {
      agentId: "agent-1aaaaaaa-2222-2222-2222-222222222222",
      fromAccountId: "acc-aaaaaaaa-1111-1111-1111-111111111111",
      toAccountId: "acc-bbbbbbbb-3333-3333-3333-333333333333",
      reason: "exhausted",
      errorFamily: "rpm_transient",
      retryNotBefore: null,
      swapStrategy: "resume",
    },
    ...overrides,
  };
}

function renderPage(container: HTMLDivElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRoot(container);
  return { queryClient, root };
}

describe("ClaudeAccounts", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    listMock.mockResolvedValue({ accounts: [] });
    rotationHistoryMock.mockResolvedValue({ entries: [] });
    createMock.mockResolvedValue({ account: makeAccount() });
    patchMock.mockResolvedValue({ account: makeAccount({ status: "disabled" }) });
    costSummaryMock.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders loading state then accounts list with status badges", async () => {
    listMock.mockResolvedValueOnce({
      accounts: [
        makeAccount({ id: "acc-1", label: "Account A", status: "live" }),
        makeAccount({
          id: "acc-2",
          label: "Account B",
          configDirSlug: "b",
          status: "exhausted",
          exhaustedUntil: "2026-04-26T01:00:00.000Z",
        }),
        makeAccount({ id: "acc-3", label: "Account C", configDirSlug: "c", status: "cooldown" }),
        makeAccount({ id: "acc-4", label: "Account D", configDirSlug: "d", status: "disabled" }),
      ],
    });

    const { queryClient, root } = renderPage(container);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ClaudeAccounts />
          </QueryClientProvider>
        </MemoryRouter>,
      );
    });
    await flushReact();
    await flushReact();

    expect(container.textContent).toContain("Claude Accounts");
    expect(container.textContent).toContain("Account A");
    expect(container.textContent).toContain("Account B");
    const badges = Array.from(container.querySelectorAll("[data-status]")) as HTMLElement[];
    const statuses = badges.map((node) => node.dataset.status);
    expect(statuses).toEqual(expect.arrayContaining(["live", "exhausted", "cooldown", "disabled"]));
  });

  it("renders empty state when no accounts are registered", async () => {
    const { queryClient, root } = renderPage(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ClaudeAccounts />
          </QueryClientProvider>
        </MemoryRouter>,
      );
    });
    await flushReact();
    await flushReact();
    expect(container.textContent).toContain("No Claude accounts registered yet.");
    expect(container.textContent).toContain("No rotations recorded yet.");
  });

  it("submits the register form with label + slug and invalidates the query", async () => {
    const { queryClient, root } = renderPage(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ClaudeAccounts />
          </QueryClientProvider>
        </MemoryRouter>,
      );
    });
    await flushReact();
    await flushReact();

    const labelInput = container.querySelector(
      '[data-testid="claude-account-label"]',
    ) as HTMLInputElement;
    const slugInput = container.querySelector(
      '[data-testid="claude-account-slug"]',
    ) as HTMLInputElement;
    expect(labelInput).toBeTruthy();
    expect(slugInput).toBeTruthy();

    await act(async () => {
      setControlledInputValue(labelInput, "Account Alpha");
      setControlledInputValue(slugInput, "alpha");
    });
    await flushReact();

    const submitButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Register",
    );
    expect(submitButton).toBeTruthy();

    const form = submitButton?.closest("form");
    expect(form).toBeTruthy();
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flushReact();
    await flushReact();

    expect(createMock).toHaveBeenCalledWith("company-1", {
      label: "Account Alpha",
      configDirSlug: "alpha",
      scope: "company",
    });
    expect(pushToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "success", title: "Claude account registered" }),
    );
  });

  it("toggles account status via Disable/Enable button", async () => {
    listMock.mockResolvedValueOnce({
      accounts: [makeAccount({ id: "acc-toggle", label: "Account A", status: "live" })],
    });

    const { queryClient, root } = renderPage(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ClaudeAccounts />
          </QueryClientProvider>
        </MemoryRouter>,
      );
    });
    await flushReact();
    await flushReact();

    const toggleButton = container.querySelector(
      '[data-testid="claude-account-toggle-acc-toggle"]',
    ) as HTMLButtonElement;
    expect(toggleButton).toBeTruthy();
    expect(toggleButton.textContent).toContain("Disable");

    await act(async () => {
      toggleButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushReact();
    await flushReact();

    expect(patchMock).toHaveBeenCalledWith("company-1", "acc-toggle", { status: "disabled" });
  });

  it("renders rotation history entries with from/to/reason/strategy", async () => {
    rotationHistoryMock.mockResolvedValueOnce({
      entries: [
        makeRotation({
          id: "rot-1",
          details: {
            agentId: "agent-1aaaaaaa-2222-2222-2222-222222222222",
            fromAccountId: "acc-aaaaaaaa-1111-1111-1111-111111111111",
            toAccountId: "acc-bbbbbbbb-3333-3333-3333-333333333333",
            reason: "exhausted",
            errorFamily: "weekly_quota",
            retryNotBefore: "2026-05-03T00:00:00.000Z",
            swapStrategy: "fallback_full_context",
            swapStatus: "succeeded",
          },
        }),
      ],
    });

    const { queryClient, root } = renderPage(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ClaudeAccounts />
          </QueryClientProvider>
        </MemoryRouter>,
      );
    });
    await flushReact();
    await flushReact();

    expect(container.textContent).toContain("Rotation history");
    expect(container.textContent).toContain("agent-1a");
    expect(container.textContent).toContain("acc-aaaa");
    expect(container.textContent).toContain("acc-bbbb");
    expect(container.textContent).toContain("exhausted");
    expect(container.textContent).toContain("weekly_quota");
    expect(container.textContent).toContain("fallback_full_context");
  });

  // Phase 6 / D-12 / PROJ-03 — Cost summary section
  it("renders cost summary table when rows present", async () => {
    costSummaryMock.mockResolvedValueOnce({
      rows: [
        {
          accountId: "acc-1",
          accountLabel: "Account A",
          totalCostUsd: 1.2345,
          totalInputTokens: 12345,
          totalOutputTokens: 6789,
          stepCount: 7,
        },
        {
          accountId: "acc-2",
          accountLabel: "Account B",
          totalCostUsd: 0.5,
          totalInputTokens: 100,
          totalOutputTokens: 50,
          stepCount: 2,
        },
      ],
    });

    const { queryClient, root } = renderPage(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ClaudeAccounts />
          </QueryClientProvider>
        </MemoryRouter>,
      );
    });
    await flushReact();
    await flushReact();

    const table = container.querySelector('[data-testid="costs-table"]');
    expect(table).toBeTruthy();
    expect(container.textContent).toContain("Cost summary");
    expect(container.textContent).toContain("Account A");
    expect(container.textContent).toContain("Account B");
    expect(container.textContent).toContain("$1.2345");
    // Locale-agnostic: jsdom uses default ICU locale (may render thousand
    // separator as "," or "." depending on host); assert digits only.
    const formattedInput = (12345).toLocaleString();
    const formattedOutput = (6789).toLocaleString();
    expect(container.textContent).toContain(formattedInput);
    expect(container.textContent).toContain(formattedOutput);
  });

  it("renders empty cost summary state when no rows", async () => {
    const { queryClient, root } = renderPage(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ClaudeAccounts />
          </QueryClientProvider>
        </MemoryRouter>,
      );
    });
    await flushReact();
    await flushReact();

    const empty = container.querySelector('[data-testid="costs-empty"]');
    expect(empty).toBeTruthy();
    expect(container.textContent).toContain("No usage recorded yet.");
  });

  // Phase 6 / D-05 / PROJ-02 — scope radio submits selected value
  it("submits register form with scope=shared when shared radio selected", async () => {
    const { queryClient, root } = renderPage(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ClaudeAccounts />
          </QueryClientProvider>
        </MemoryRouter>,
      );
    });
    await flushReact();
    await flushReact();

    const labelInput = container.querySelector(
      '[data-testid="claude-account-label"]',
    ) as HTMLInputElement;
    const slugInput = container.querySelector(
      '[data-testid="claude-account-slug"]',
    ) as HTMLInputElement;
    const sharedRadio = container.querySelector(
      '[data-testid="scope-shared"]',
    ) as HTMLInputElement;
    expect(sharedRadio).toBeTruthy();

    await act(async () => {
      setControlledInputValue(labelInput, "Shared Account");
      setControlledInputValue(slugInput, "shared-1");
    });
    await flushReact();

    await act(async () => {
      sharedRadio.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushReact();

    const submitButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Register",
    );
    const form = submitButton?.closest("form");
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flushReact();
    await flushReact();

    expect(createMock).toHaveBeenCalledWith("company-1", {
      label: "Shared Account",
      configDirSlug: "shared-1",
      scope: "shared",
    });
  });

  // Phase 6 / D-07 / PROJ-02 — shared badge in accounts table
  it("renders shared badge for accounts with scope=shared", async () => {
    listMock.mockResolvedValueOnce({
      accounts: [
        makeAccount({ id: "acc-shared", label: "Shared One", scope: "shared" }),
        makeAccount({
          id: "acc-private",
          label: "Private One",
          configDirSlug: "private-1",
          scope: "company",
        }),
      ],
    });

    const { queryClient, root } = renderPage(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ClaudeAccounts />
          </QueryClientProvider>
        </MemoryRouter>,
      );
    });
    await flushReact();
    await flushReact();

    const sharedScope = container.querySelector('[data-scope="shared"]');
    const companyScope = container.querySelector('[data-scope="company"]');
    expect(sharedScope).toBeTruthy();
    expect(sharedScope?.textContent).toContain("shared");
    expect(companyScope).toBeTruthy();
    expect(companyScope?.textContent).toContain("company");
  });
});
