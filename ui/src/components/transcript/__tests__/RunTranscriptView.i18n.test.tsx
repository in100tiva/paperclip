// @vitest-environment jsdom
import { afterEach, describe, it, expect, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";

/**
 * AGENT-MSG-02 / Phase 10-02 — RunTranscriptView translation render probe.
 *
 * Probe-component approach (matches AgentDetail.i18n.test.tsx pattern):
 * lightweight consumer of agents:transcript.* + agents:run-ledger.* +
 * agents:live-runs.* sub-trees that asserts pt-BR ↔ en-US toggle.
 * Avoids mounting the heavy RunTranscriptView (1526 LOC) which requires
 * complex transcript-entry fixtures, react-markdown, and lucide icons.
 */

function TranscriptLabelsProbe() {
  const { t } = useTranslation(["agents"]);
  return (
    <div>
      <span data-testid="executing">{t("agents:transcript.executing-command")}</span>
      <span data-testid="executed">{t("agents:transcript.executed-command")}</span>
      <span data-testid="tool-failed">{t("agents:transcript.tool-failed")}</span>
      <span data-testid="waiting">{t("agents:transcript.waiting-result")}</span>
      <span data-testid="completed">{t("agents:transcript.completed")}</span>
      <span data-testid="running">{t("agents:transcript.running")}</span>
      <span data-testid="errored">{t("agents:transcript.errored")}</span>
      <span data-testid="run-failed">{t("agents:transcript.run-failed")}</span>
      <span data-testid="failed">{t("agents:transcript.failed")}</span>
      <span data-testid="failed-with-exit">
        {t("agents:transcript.failed-with-exit", { code: "127" })}
      </span>
      <span data-testid="input">{t("agents:transcript.input-label")}</span>
      <span data-testid="result">{t("agents:transcript.result-label")}</span>
      <span data-testid="empty">{t("agents:transcript.empty")}</span>
      <span data-testid="user">{t("agents:transcript.user")}</span>
    </div>
  );
}

function TranscriptAriaProbe() {
  const { t } = useTranslation(["agents"]);
  return (
    <div>
      <button aria-label={t("agents:transcript.aria.collapse-tool")} data-testid="aria-collapse-tool">
        x
      </button>
      <button aria-label={t("agents:transcript.aria.expand-tool")} data-testid="aria-expand-tool">
        x
      </button>
      <button aria-label={t("agents:transcript.aria.collapse-command")} data-testid="aria-collapse-cmd">
        x
      </button>
      <button aria-label={t("agents:transcript.aria.expand-command")} data-testid="aria-expand-cmd">
        x
      </button>
      <button aria-label={t("agents:transcript.aria.collapse-stdout")} data-testid="aria-collapse-stdout">
        x
      </button>
      <button aria-label={t("agents:transcript.aria.expand-stdout")} data-testid="aria-expand-stdout">
        x
      </button>
    </div>
  );
}

function RunLedgerProbe() {
  const { t } = useTranslation(["agents"]);
  return (
    <div>
      <span data-testid="ledger-title">{t("agents:run-ledger.title")}</span>
      <span data-testid="waiting-first">{t("agents:run-ledger.waiting-first-run")}</span>
      <span data-testid="no-linked">{t("agents:run-ledger.no-runs-linked")}</span>
      <span data-testid="latest-run">{t("agents:run-ledger.latest-run")}</span>
      <span data-testid="child-work">{t("agents:run-ledger.child-work")}</span>
      <span data-testid="child-active">
        {t("agents:run-ledger.child-summary-active", { active: 2, done: 3, cancelled: 1 })}
      </span>
      <span data-testid="child-terminal">
        {t("agents:run-ledger.child-summary-terminal", { total: 5, done: 4, cancelled: 1 })}
      </span>
      <span data-testid="more-children-1">
        {t("agents:run-ledger.more-children", { count: 1 })}
      </span>
      <span data-testid="more-children-many">
        {t("agents:run-ledger.more-children", { count: 5 })}
      </span>
    </div>
  );
}

function LiveRunsProbe() {
  const { t } = useTranslation(["agents"]);
  return (
    <div>
      <span data-testid="lr-title">{t("agents:live-runs.title")}</span>
      <span data-testid="lr-subtitle">{t("agents:live-runs.subtitle")}</span>
      <span data-testid="lr-stop">{t("agents:live-runs.stop")}</span>
      <span data-testid="lr-stopping">{t("agents:live-runs.stopping")}</span>
      <span data-testid="lr-open">{t("agents:live-runs.open-run")}</span>
      <span data-testid="lr-waiting">{t("agents:live-runs.waiting-output")}</span>
      <span data-testid="lr-no-output">{t("agents:live-runs.no-output")}</span>
    </div>
  );
}

function renderProbe(component: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>);
}

describe("RunTranscriptView translation render (AGENT-MSG-02)", () => {
  afterEach(() => {
    cleanup();
  });

  describe("transcript labels — locale=pt-BR", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    it("renders Portuguese transcript labels with interpolation", () => {
      renderProbe(<TranscriptLabelsProbe />);
      expect(screen.getByTestId("executing").textContent).toBe("Executando comando");
      expect(screen.getByTestId("executed").textContent).toBe("Comando executado");
      expect(screen.getByTestId("tool-failed").textContent).toBe("Ferramenta falhou");
      expect(screen.getByTestId("waiting").textContent).toBe("Aguardando resultado");
      expect(screen.getByTestId("completed").textContent).toBe("Concluído");
      expect(screen.getByTestId("running").textContent).toBe("Em execução");
      expect(screen.getByTestId("errored").textContent).toBe("Com erro");
      expect(screen.getByTestId("run-failed").textContent).toBe("Execução falhou");
      expect(screen.getByTestId("failed").textContent).toBe("Falhou");
      expect(screen.getByTestId("failed-with-exit").textContent).toBe(
        "Falhou com código de saída 127",
      );
      expect(screen.getByTestId("input").textContent).toBe("Entrada");
      expect(screen.getByTestId("result").textContent).toBe("Resultado");
      expect(screen.getByTestId("empty").textContent).toBe("Ainda sem transcrição.");
      expect(screen.getByTestId("user").textContent).toBe("Usuário");
    });
  });

  describe("transcript labels — locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English transcript labels with interpolation", () => {
      renderProbe(<TranscriptLabelsProbe />);
      expect(screen.getByTestId("executing").textContent).toBe("Executing command");
      expect(screen.getByTestId("completed").textContent).toBe("Completed");
      expect(screen.getByTestId("errored").textContent).toBe("Errored");
      expect(screen.getByTestId("failed-with-exit").textContent).toBe(
        "Failed with exit code 127",
      );
      expect(screen.getByTestId("input").textContent).toBe("Input");
      expect(screen.getByTestId("result").textContent).toBe("Result");
      expect(screen.getByTestId("empty").textContent).toBe("No transcript yet.");
      expect(screen.getByTestId("user").textContent).toBe("User");
    });
  });

  describe("aria labels — locale=pt-BR", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    it("renders Portuguese aria labels for collapse/expand buttons", () => {
      renderProbe(<TranscriptAriaProbe />);
      expect(screen.getByLabelText("Recolher detalhes da ferramenta")).toBeTruthy();
      expect(screen.getByLabelText("Expandir detalhes da ferramenta")).toBeTruthy();
      expect(screen.getByLabelText("Recolher detalhes do comando")).toBeTruthy();
      expect(screen.getByLabelText("Expandir detalhes do comando")).toBeTruthy();
      expect(screen.getByLabelText("Recolher saída padrão")).toBeTruthy();
      expect(screen.getByLabelText("Expandir saída padrão")).toBeTruthy();
    });
  });

  describe("aria labels — locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English aria labels", () => {
      renderProbe(<TranscriptAriaProbe />);
      expect(screen.getByLabelText("Collapse tool details")).toBeTruthy();
      expect(screen.getByLabelText("Expand tool details")).toBeTruthy();
      expect(screen.getByLabelText("Collapse command details")).toBeTruthy();
      expect(screen.getByLabelText("Expand command details")).toBeTruthy();
      expect(screen.getByLabelText("Collapse stdout")).toBeTruthy();
      expect(screen.getByLabelText("Expand stdout")).toBeTruthy();
    });
  });

  describe("run ledger — locale=pt-BR", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    it("renders Portuguese ledger labels with active/terminal interpolation and plurals", () => {
      renderProbe(<RunLedgerProbe />);
      expect(screen.getByTestId("ledger-title").textContent).toBe("Registro de execuções");
      expect(screen.getByTestId("waiting-first").textContent).toBe(
        "Aguardando o primeiro registro de execução.",
      );
      expect(screen.getByTestId("no-linked").textContent).toBe("Ainda não há execuções vinculadas.");
      expect(screen.getByTestId("latest-run").textContent).toBe("Execução mais recente");
      expect(screen.getByTestId("child-work").textContent).toBe("Trabalho derivado");
      expect(screen.getByTestId("child-active").textContent).toBe(
        "2 ativos, 3 concluídos, 1 cancelados",
      );
      expect(screen.getByTestId("child-terminal").textContent).toBe(
        "todos 5 terminais (4 concluídos, 1 cancelados)",
      );
      expect(screen.getByTestId("more-children-1").textContent).toBe("+1 a mais");
      expect(screen.getByTestId("more-children-many").textContent).toBe("+5 a mais");
    });
  });

  describe("run ledger — locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English ledger labels", () => {
      renderProbe(<RunLedgerProbe />);
      expect(screen.getByTestId("ledger-title").textContent).toBe("Run ledger");
      expect(screen.getByTestId("child-work").textContent).toBe("Child work");
      expect(screen.getByTestId("child-active").textContent).toBe("2 active, 3 done, 1 cancelled");
      expect(screen.getByTestId("more-children-1").textContent).toBe("+1 more");
    });
  });

  describe("live runs — locale=pt-BR", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    it("renders Portuguese live-runs widget labels", () => {
      renderProbe(<LiveRunsProbe />);
      expect(screen.getByTestId("lr-title").textContent).toBe("Execuções ao vivo");
      expect(screen.getByTestId("lr-subtitle").textContent).toBe(
        "Usa a superfície de chat compartilhada da atividade da tarefa.",
      );
      expect(screen.getByTestId("lr-stop").textContent).toBe("Parar");
      expect(screen.getByTestId("lr-stopping").textContent).toBe("Parando…");
      expect(screen.getByTestId("lr-open").textContent).toBe("Abrir execução");
      expect(screen.getByTestId("lr-waiting").textContent).toBe("Aguardando saída da execução…");
      expect(screen.getByTestId("lr-no-output").textContent).toBe(
        "Nenhuma saída de execução capturada.",
      );
    });
  });

  describe("live runs — locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English live-runs widget labels", () => {
      renderProbe(<LiveRunsProbe />);
      expect(screen.getByTestId("lr-title").textContent).toBe("Live Runs");
      expect(screen.getByTestId("lr-stop").textContent).toBe("Stop");
      expect(screen.getByTestId("lr-stopping").textContent).toBe("Stopping…");
      expect(screen.getByTestId("lr-open").textContent).toBe("Open run");
      expect(screen.getByTestId("lr-waiting").textContent).toBe("Waiting for run output...");
      expect(screen.getByTestId("lr-no-output").textContent).toBe("No run output captured.");
    });
  });
});
