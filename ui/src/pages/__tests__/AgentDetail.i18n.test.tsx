// @vitest-environment jsdom
import { afterEach, describe, it, expect, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { AGENT_STATUS_KEY, AGENT_ROLE_KEY } from "@/lib/agent-keys";

/**
 * AGENT-MSG-01 / Phase 10-01 — AgentDetail translation render probe.
 *
 * Probe-component approach (matches CompanySettings.i18n.test.tsx pattern):
 * lightweight consumer of the agents.* sub-tree that asserts pt-BR ↔ en-US
 * toggle for header/tabs/actions surfaces. Avoids mounting the heavy
 * AgentDetail page which requires Company/Breadcrumb/Toast/QueryClient/Panel
 * contexts plus React Query data fetching.
 */

function AgentDetailHeaderProbe() {
  const { t } = useTranslation(["agents", "common"]);
  return (
    <div>
      <span data-testid="status-running">{t(AGENT_STATUS_KEY.running as never)}</span>
      <span data-testid="status-pending">{t(AGENT_STATUS_KEY.pending_approval as never)}</span>
      <span data-testid="role-engineer">{t(AGENT_ROLE_KEY.engineer as never)}</span>
      <span data-testid="role-researcher">{t(AGENT_ROLE_KEY.researcher as never)}</span>
      <span data-testid="title">{t("agents:title")}</span>
    </div>
  );
}

function AgentDetailTabsProbe() {
  const { t } = useTranslation(["agents"]);
  return (
    <div>
      <span data-testid="tab-dashboard">{t("agents:detail.tabs.dashboard")}</span>
      <span data-testid="tab-instructions">{t("agents:detail.tabs.instructions")}</span>
      <span data-testid="tab-configuration">{t("agents:detail.tabs.configuration")}</span>
      <span data-testid="tab-runs">{t("agents:detail.tabs.runs")}</span>
      <span data-testid="tab-budget">{t("agents:detail.tabs.budget")}</span>
    </div>
  );
}

function AgentDetailActionsProbe() {
  const { t } = useTranslation(["agents"]);
  return (
    <div>
      <span data-testid="assign-task">{t("agents:actions.assign-task")}</span>
      <span data-testid="run-heartbeat">{t("agents:actions.run-heartbeat")}</span>
      <span data-testid="pause">{t("agents:actions.pause")}</span>
      <span data-testid="resume">{t("agents:actions.resume")}</span>
      <span data-testid="copy-id">{t("agents:actions.copy-agent-id")}</span>
      <span data-testid="reset-sessions">{t("agents:actions.reset-sessions")}</span>
      <span data-testid="delete-agent">{t("agents:actions.delete-agent")}</span>
    </div>
  );
}

function renderProbe(component: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>);
}

describe("AgentDetail translation render (AGENT-MSG-01)", () => {
  afterEach(() => {
    cleanup();
  });

  describe("header — locale=pt-BR", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    it("renders Portuguese values for status badge, role label, page title", () => {
      renderProbe(<AgentDetailHeaderProbe />);
      expect(screen.getByTestId("status-running").textContent).toBe("em execução");
      expect(screen.getByTestId("status-pending").textContent).toBe("aguardando aprovação");
      expect(screen.getByTestId("role-engineer").textContent).toBe("Engenheiro");
      expect(screen.getByTestId("role-researcher").textContent).toBe("Pesquisador");
      expect(screen.getByTestId("title").textContent).toBe("Agentes");
    });
  });

  describe("header — locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English values for status badge, role label, page title", () => {
      renderProbe(<AgentDetailHeaderProbe />);
      expect(screen.getByTestId("status-running").textContent).toBe("running");
      expect(screen.getByTestId("status-pending").textContent).toBe("pending approval");
      expect(screen.getByTestId("role-engineer").textContent).toBe("Engineer");
      expect(screen.getByTestId("role-researcher").textContent).toBe("Researcher");
      expect(screen.getByTestId("title").textContent).toBe("Agents");
    });
  });

  describe("tabs — locale=pt-BR", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    it("renders Portuguese tab labels (Painel/Instruções/Configuração/Execuções/Orçamento)", () => {
      renderProbe(<AgentDetailTabsProbe />);
      expect(screen.getByTestId("tab-dashboard").textContent).toBe("Painel");
      expect(screen.getByTestId("tab-instructions").textContent).toBe("Instruções");
      expect(screen.getByTestId("tab-configuration").textContent).toBe("Configuração");
      expect(screen.getByTestId("tab-runs").textContent).toBe("Execuções");
      expect(screen.getByTestId("tab-budget").textContent).toBe("Orçamento");
    });
  });

  describe("tabs — locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English tab labels (Dashboard/Instructions/Configuration/Runs/Budget)", () => {
      renderProbe(<AgentDetailTabsProbe />);
      expect(screen.getByTestId("tab-dashboard").textContent).toBe("Dashboard");
      expect(screen.getByTestId("tab-instructions").textContent).toBe("Instructions");
      expect(screen.getByTestId("tab-configuration").textContent).toBe("Configuration");
      expect(screen.getByTestId("tab-runs").textContent).toBe("Runs");
      expect(screen.getByTestId("tab-budget").textContent).toBe("Budget");
    });
  });

  describe("actions — locale=pt-BR", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    it("renders Portuguese action button labels", () => {
      renderProbe(<AgentDetailActionsProbe />);
      expect(screen.getByTestId("assign-task").textContent).toBe("Atribuir tarefa");
      expect(screen.getByTestId("run-heartbeat").textContent).toBe("Executar heartbeat");
      expect(screen.getByTestId("pause").textContent).toBe("Pausar");
      expect(screen.getByTestId("resume").textContent).toBe("Retomar");
      expect(screen.getByTestId("copy-id").textContent).toBe("Copiar ID do agente");
      expect(screen.getByTestId("reset-sessions").textContent).toBe("Reiniciar sessões");
      expect(screen.getByTestId("delete-agent").textContent).toBe("Excluir agente");
    });
  });

  describe("actions — locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English action button labels", () => {
      renderProbe(<AgentDetailActionsProbe />);
      expect(screen.getByTestId("assign-task").textContent).toBe("Assign Task");
      expect(screen.getByTestId("run-heartbeat").textContent).toBe("Run Heartbeat");
      expect(screen.getByTestId("pause").textContent).toBe("Pause");
      expect(screen.getByTestId("resume").textContent).toBe("Resume");
      expect(screen.getByTestId("copy-id").textContent).toBe("Copy Agent ID");
      expect(screen.getByTestId("reset-sessions").textContent).toBe("Reset Sessions");
      expect(screen.getByTestId("delete-agent").textContent).toBe("Terminate");
    });
  });
});
