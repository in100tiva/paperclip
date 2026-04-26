// @vitest-environment jsdom
import { afterEach, describe, it, expect, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";

/**
 * UI-04 / Phase 9-01 — CompanyAccess translation render probe.
 *
 * Probe-component approach for the company.access.* sub-tree. Asserts:
 *   - ROLE_KEY / STATUS_KEY / PERMISSION_KEY lookup keys resolve in both locales
 *   - Edit / Remove dialog copy renders
 *   - Plural _one/_other resolves for open-issues and pending-count
 *   - Interpolation works for description ({{name}}) and submitted-at ({{date}})
 */

function CompanyAccessProbe() {
  const { t } = useTranslation(["settings", "common"]);
  return (
    <div>
      <h1 data-testid="access-title">{t("settings:company.access.title")}</h1>
      <h2 data-testid="humans-section">{t("settings:company.access.humans-section")}</h2>
      <span data-testid="description">
        {t("settings:company.access.description", { name: "Acme" })}
      </span>

      <span data-testid="table-role">{t("settings:company.access.table.role")}</span>
      <span data-testid="table-status">{t("settings:company.access.table.status")}</span>
      <span data-testid="table-grants">{t("settings:company.access.table.grants")}</span>
      <span data-testid="table-edit">{t("settings:company.access.table.edit")}</span>
      <span data-testid="table-remove">{t("settings:company.access.table.remove")}</span>

      <span data-testid="role-owner">{t("settings:company.access.role.owner")}</span>
      <span data-testid="role-admin">{t("settings:company.access.role.admin")}</span>
      <span data-testid="status-active">{t("settings:company.access.status.active")}</span>
      <span data-testid="status-pending">{t("settings:company.access.status.pending")}</span>
      <span data-testid="permission-agents-create">
        {t("settings:company.access.permission.agents-create")}
      </span>
      <span data-testid="permission-users-invite">
        {t("settings:company.access.permission.users-invite")}
      </span>

      <h3 data-testid="edit-title">{t("settings:company.access.edit-dialog.title")}</h3>
      <span data-testid="edit-save">{t("settings:company.access.edit-dialog.save")}</span>
      <h3 data-testid="remove-title">{t("settings:company.access.remove-dialog.title")}</h3>
      <span data-testid="remove-cta">{t("settings:company.access.remove-dialog.remove-cta")}</span>

      <span data-testid="open-issues-1">
        {t("settings:company.access.remove-dialog.open-issues", { count: 1 })}
      </span>
      <span data-testid="open-issues-3">
        {t("settings:company.access.remove-dialog.open-issues", { count: 3 })}
      </span>
      <span data-testid="pending-1">
        {t("settings:company.access.pending-count", { count: 1 })}
      </span>
      <span data-testid="pending-3">
        {t("settings:company.access.pending-count", { count: 3 })}
      </span>

      <span data-testid="approve-human">
        {t("settings:company.access.join-request.approve-human")}
      </span>
      <span data-testid="reject-human">
        {t("settings:company.access.join-request.reject-human")}
      </span>
      <span data-testid="submitted-at">
        {t("settings:company.access.join-request.submitted-at", { date: "2026-04-26" })}
      </span>
    </div>
  );
}

function renderProbe() {
  return render(
    <I18nextProvider i18n={i18n}>
      <CompanyAccessProbe />
    </I18nextProvider>,
  );
}

describe("CompanyAccess translation render (UI-04)", () => {
  afterEach(() => {
    cleanup();
  });

  describe("locale=pt-BR", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    it("renders Portuguese values for table headers, role/status/permission, dialogs, plurals", () => {
      renderProbe();
      expect(screen.getByTestId("access-title").textContent).toContain("Acesso da empresa");
      expect(screen.getByTestId("humans-section").textContent).toContain("Humanos");
      expect(screen.getByTestId("description").textContent).toContain("Acme");

      expect(screen.getByTestId("table-role").textContent).toContain("Função");
      expect(screen.getByTestId("table-status").textContent).toContain("Status");
      expect(screen.getByTestId("table-grants").textContent).toContain("Permissões");
      expect(screen.getByTestId("table-edit").textContent).toContain("Editar");
      expect(screen.getByTestId("table-remove").textContent).toContain("Remover");

      expect(screen.getByTestId("role-owner").textContent).toContain("Proprietário");
      expect(screen.getByTestId("role-admin").textContent).toContain("Admin");
      expect(screen.getByTestId("status-active").textContent).toContain("ativo");
      expect(screen.getByTestId("status-pending").textContent).toContain("pendente");
      expect(screen.getByTestId("permission-agents-create").textContent).toContain("Criar agentes");
      expect(screen.getByTestId("permission-users-invite").textContent).toContain("Convidar");

      expect(screen.getByTestId("edit-title").textContent).toContain("Editar membro");
      expect(screen.getByTestId("edit-save").textContent).toContain("Salvar acesso");
      expect(screen.getByTestId("remove-title").textContent).toContain("Remover membro");
      expect(screen.getByTestId("remove-cta").textContent).toContain("Remover membro");

      // Plural resolution
      expect(screen.getByTestId("open-issues-1").textContent).toContain("1 tarefa atribuída em aberto");
      expect(screen.getByTestId("open-issues-3").textContent).toContain("3 tarefas atribuídas em aberto");
      expect(screen.getByTestId("pending-1").textContent).toContain("1 pendente");
      expect(screen.getByTestId("pending-3").textContent).toContain("3 pendentes");

      expect(screen.getByTestId("approve-human").textContent).toContain("Aprovar humano");
      expect(screen.getByTestId("reject-human").textContent).toContain("Rejeitar humano");
      expect(screen.getByTestId("submitted-at").textContent).toContain("2026-04-26");
    });
  });

  describe("locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English values for table headers, role/status/permission, dialogs, plurals", () => {
      renderProbe();
      expect(screen.getByTestId("access-title").textContent).toContain("Company Access");
      expect(screen.getByTestId("humans-section").textContent).toContain("Humans");
      expect(screen.getByTestId("description").textContent).toContain("Acme");

      expect(screen.getByTestId("table-role").textContent).toContain("Role");
      expect(screen.getByTestId("table-status").textContent).toContain("Status");
      expect(screen.getByTestId("table-grants").textContent).toContain("Grants");
      expect(screen.getByTestId("table-edit").textContent).toContain("Edit");
      expect(screen.getByTestId("table-remove").textContent).toContain("Remove");

      expect(screen.getByTestId("role-owner").textContent).toContain("Owner");
      expect(screen.getByTestId("role-admin").textContent).toContain("Admin");
      expect(screen.getByTestId("status-active").textContent).toContain("active");
      expect(screen.getByTestId("status-pending").textContent).toContain("pending");
      expect(screen.getByTestId("permission-agents-create").textContent).toContain("Create agents");
      expect(screen.getByTestId("permission-users-invite").textContent).toContain("Invite");

      expect(screen.getByTestId("edit-title").textContent).toContain("Edit member");
      expect(screen.getByTestId("edit-save").textContent).toContain("Save access");
      expect(screen.getByTestId("remove-title").textContent).toContain("Remove member");
      expect(screen.getByTestId("remove-cta").textContent).toContain("Remove member");

      // Plural resolution
      expect(screen.getByTestId("open-issues-1").textContent).toContain("1 open assigned issue");
      expect(screen.getByTestId("open-issues-3").textContent).toContain("3 open assigned issues");

      expect(screen.getByTestId("approve-human").textContent).toContain("Approve human");
      expect(screen.getByTestId("reject-human").textContent).toContain("Reject human");
      expect(screen.getByTestId("submitted-at").textContent).toContain("2026-04-26");
    });
  });
});
