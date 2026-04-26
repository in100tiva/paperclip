// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";

// Phase 8-02 — UI-02 (Projects translation).
// Mirrors the probe-component pattern established by Phase 8-01's
// `InboxList.translation.test.tsx`: render a tiny consumer component that
// imports `useTranslation(["projects", "common"])` exactly the way the real
// surfaces (Projects.tsx, ProjectDetail.tsx, NewProjectDialog.tsx) do, then
// assert each representative key resolves correctly under both locales.
// This validates the full round-trip:
//   (1) projects.json key exists in both pt-BR and en-US
//   (2) i18n.changeLanguage('pt-BR' | 'en-US') triggers re-render
//   (3) typed `t()` accepts the key path
//   (4) interpolation params (e.g. {{ name }}, {{ count }}) round-trip
// without depending on Radix Popover / dialog portals which flake in jsdom.

function ProjectsStringsProbe() {
  const { t } = useTranslation(["projects", "common"]);
  return (
    <div>
      <span data-testid="title">{t("projects:title")}</span>
      <span data-testid="actions-add">{t("projects:actions.add")}</span>
      <span data-testid="actions-create">{t("projects:actions.create")}</span>
      <span data-testid="actions-creating">{t("projects:actions.creating")}</span>
      <span data-testid="actions-create-failed">{t("projects:actions.create-failed")}</span>
      <span data-testid="status-backlog">{t("projects:status.backlog")}</span>
      <span data-testid="status-in-progress">{t("projects:status.in-progress")}</span>
      <span data-testid="status-cancelled">{t("projects:status.cancelled")}</span>
      <span data-testid="tabs-issues">{t("projects:tabs.issues")}</span>
      <span data-testid="tabs-overview">{t("projects:tabs.overview")}</span>
      <span data-testid="tabs-configuration">{t("projects:tabs.configuration")}</span>
      <span data-testid="tabs-budget">{t("projects:tabs.budget")}</span>
      <span data-testid="new-project-title">{t("projects:new-project.title")}</span>
      <span data-testid="new-project-name-placeholder">{t("projects:new-project.name-placeholder")}</span>
      <span data-testid="new-project-tooltip-repo">{t("projects:new-project.tooltip-repo")}</span>
      <span data-testid="new-project-goal-add">{t("projects:new-project.goal-add")}</span>
      <span data-testid="empty-no-projects">{t("projects:empty-state.no-projects")}</span>
      <span data-testid="empty-select-company">{t("projects:empty-state.select-company")}</span>
      <span data-testid="loading-workspaces">{t("projects:loading.workspaces")}</span>
      <span data-testid="paused-by-budget">{t("projects:paused-by-budget")}</span>
      {/* Pitfall 3 — toast interpolation round-trip */}
      <span data-testid="toast-archived">{t("projects:toast.archived", { name: "Acme" })}</span>
      <span data-testid="toast-unarchived">{t("projects:toast.unarchived", { name: "Acme" })}</span>
      <span data-testid="toast-archive-failed">{t("projects:toast.archive-failed")}</span>
      <span data-testid="labels-status">{t("projects:labels.status")}</span>
      <span data-testid="labels-target-date">{t("projects:labels.target-date")}</span>
      <span data-testid="labels-codebase">{t("projects:labels.codebase")}</span>
    </div>
  );
}

function renderProbe() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ProjectsStringsProbe />
    </I18nextProvider>,
  );
}

describe("Projects surface translation render (UI-02)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Projects keys in pt-BR when locale=pt-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    renderProbe();

    expect(screen.getByTestId("title")).toHaveTextContent("Projetos");
    expect(screen.getByTestId("actions-add")).toHaveTextContent("Adicionar projeto");
    expect(screen.getByTestId("actions-create")).toHaveTextContent("Criar projeto");
    expect(screen.getByTestId("actions-creating")).toHaveTextContent("Criando");
    expect(screen.getByTestId("actions-create-failed")).toHaveTextContent("Falha ao criar projeto");
    expect(screen.getByTestId("status-backlog")).toHaveTextContent("Backlog");
    expect(screen.getByTestId("status-in-progress")).toHaveTextContent("Em andamento");
    expect(screen.getByTestId("status-cancelled")).toHaveTextContent("Cancelado");
    expect(screen.getByTestId("tabs-issues")).toHaveTextContent("Tarefas");
    expect(screen.getByTestId("tabs-overview")).toHaveTextContent("Visão geral");
    expect(screen.getByTestId("tabs-configuration")).toHaveTextContent("Configuração");
    expect(screen.getByTestId("tabs-budget")).toHaveTextContent("Orçamento");
    expect(screen.getByTestId("new-project-title")).toHaveTextContent("Novo projeto");
    expect(screen.getByTestId("new-project-name-placeholder")).toHaveTextContent("Nome do projeto");
    expect(screen.getByTestId("new-project-tooltip-repo")).toHaveTextContent("Vincule um repositório GitHub");
    expect(screen.getByTestId("new-project-goal-add")).toHaveTextContent("Meta");
    expect(screen.getByTestId("empty-no-projects")).toHaveTextContent("Nenhum projeto ainda");
    expect(screen.getByTestId("empty-select-company")).toHaveTextContent("Selecione uma empresa");
    expect(screen.getByTestId("loading-workspaces")).toHaveTextContent("Carregando workspaces");
    expect(screen.getByTestId("paused-by-budget")).toHaveTextContent("Pausado por limite de orçamento");
    // Pitfall 3 — interpolation round-trip
    expect(screen.getByTestId("toast-archived")).toHaveTextContent('"Acme" foi arquivado');
    expect(screen.getByTestId("toast-unarchived")).toHaveTextContent('"Acme" foi desarquivado');
    expect(screen.getByTestId("toast-archive-failed")).toHaveTextContent("Falha ao arquivar projeto");
    expect(screen.getByTestId("labels-status")).toHaveTextContent("Status");
    expect(screen.getByTestId("labels-target-date")).toHaveTextContent("Data alvo");
    expect(screen.getByTestId("labels-codebase")).toHaveTextContent("Código-fonte");
  });

  it("renders Projects keys in en-US after changeLanguage('en-US')", async () => {
    await i18n.changeLanguage("en-US");
    renderProbe();

    expect(screen.getByTestId("title")).toHaveTextContent("Projects");
    expect(screen.getByTestId("actions-add")).toHaveTextContent("Add project");
    expect(screen.getByTestId("actions-create")).toHaveTextContent("Create project");
    expect(screen.getByTestId("actions-creating")).toHaveTextContent("Creating");
    expect(screen.getByTestId("actions-create-failed")).toHaveTextContent("Failed to create project");
    expect(screen.getByTestId("status-backlog")).toHaveTextContent("Backlog");
    expect(screen.getByTestId("status-in-progress")).toHaveTextContent("In Progress");
    expect(screen.getByTestId("status-cancelled")).toHaveTextContent("Cancelled");
    expect(screen.getByTestId("tabs-issues")).toHaveTextContent("Issues");
    expect(screen.getByTestId("tabs-overview")).toHaveTextContent("Overview");
    expect(screen.getByTestId("tabs-configuration")).toHaveTextContent("Configuration");
    expect(screen.getByTestId("tabs-budget")).toHaveTextContent("Budget");
    expect(screen.getByTestId("new-project-title")).toHaveTextContent("New project");
    expect(screen.getByTestId("new-project-name-placeholder")).toHaveTextContent("Project name");
    expect(screen.getByTestId("new-project-tooltip-repo")).toHaveTextContent("Link a GitHub repository");
    expect(screen.getByTestId("new-project-goal-add")).toHaveTextContent("Goal");
    expect(screen.getByTestId("empty-no-projects")).toHaveTextContent("No projects yet");
    expect(screen.getByTestId("empty-select-company")).toHaveTextContent("Select a company");
    expect(screen.getByTestId("loading-workspaces")).toHaveTextContent("Loading workspaces");
    expect(screen.getByTestId("paused-by-budget")).toHaveTextContent("Paused by budget hard stop");
    // Pitfall 3 — interpolation round-trip
    expect(screen.getByTestId("toast-archived")).toHaveTextContent('"Acme" has been archived');
    expect(screen.getByTestId("toast-unarchived")).toHaveTextContent('"Acme" has been unarchived');
    expect(screen.getByTestId("toast-archive-failed")).toHaveTextContent("Failed to archive project");
    expect(screen.getByTestId("labels-status")).toHaveTextContent("Status");
    expect(screen.getByTestId("labels-target-date")).toHaveTextContent("Target Date");
    expect(screen.getByTestId("labels-codebase")).toHaveTextContent("Codebase");
  });
});
