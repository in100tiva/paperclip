// @vitest-environment jsdom
import { afterEach, describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import { ActivityRow } from "@/components/ActivityRow";
import type { ActivityEvent, Agent } from "@paperclipai/shared";

function makeEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: "evt-1",
    companyId: "comp-1",
    actorType: "user",
    actorId: "user-1",
    action: "issue.created",
    actionKey: null,
    paramsJson: null,
    entityType: "unknown",
    entityId: "ent-1",
    agentId: null,
    runId: null,
    details: { issueTitle: "Fixture issue" },
    createdAt: new Date(),
    ...overrides,
  };
}

function renderRow(event: ActivityEvent) {
  const agentMap = new Map<string, Agent>();
  const userProfileMap = new Map();
  const entityNameMap = new Map<string, string>();
  const entityTitleMap = new Map<string, string>();
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <ActivityRow
          event={event}
          agentMap={agentMap}
          userProfileMap={userProfileMap}
          entityNameMap={entityNameMap}
          entityTitleMap={entityTitleMap}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("ActivityRow — actionKey + fallback (UI-09)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });
  afterEach(() => {
    cleanup();
  });

  it("renders translated verb when actionKey present in pt-BR", () => {
    renderRow(
      makeEvent({
        actionKey: "issue.created",
        paramsJson: { title: "Test issue" },
      }),
    );
    // pt-BR/activity.json: "issue.created": "criou"
    expect(screen.getByText(/criou/i)).toBeInTheDocument();
    expect(screen.queryByText(/legado/i)).not.toBeInTheDocument();
  });

  it("renders fallback formatActivityVerb + '(legado)' label when actionKey absent", () => {
    renderRow(
      makeEvent({
        actionKey: null,
        action: "issue.created",
        details: { issueTitle: "Legacy issue" },
      }),
    );
    expect(screen.getByText(/legado/i)).toBeInTheDocument();
  });

  it("renders en-US verb when locale=en-US", async () => {
    await i18n.changeLanguage("en-US");
    renderRow(
      makeEvent({
        actionKey: "issue.created",
        paramsJson: { title: "Test" },
      }),
    );
    // en-US/activity.json: "issue.created": "created" (lower-case verb only)
    // Use getAllByText since fallback render may also match — assert at least one + no legado
    expect(screen.getAllByText(/created/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/legado/i)).not.toBeInTheDocument();
  });

  it("interpolates paramsJson into translated string for claude-account-rotated", () => {
    renderRow(
      makeEvent({
        actionKey: "claude-account-rotated",
        action: "claude_account_rotated",
        paramsJson: { reason: "exhausted" },
        entityType: "unknown",
        entityId: "agent-1",
      }),
    );
    // pt-BR: "trocou conta Claude (motivo: {{reason}})"
    expect(screen.getByText(/exhausted/)).toBeInTheDocument();
  });
});
