// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";

// Probe component mirrors how Sidebar.tsx / InstanceSidebar.tsx /
// SidebarAccountMenu.tsx / BreadcrumbBar.tsx / MobileBottomNav.tsx /
// Layout.tsx / CompanyRail.tsx / CompanySwitcher.tsx consume
// `useTranslation(["common"])` and `t("common:nav.*")`. Avoids router /
// CompanyContext / DialogContext / Popover portal complexity while still
// validating the round-trip:
//   (1) common.json nav.* sub-tree key → t() lookup
//   (2) i18n.changeLanguage triggers re-render
//   (3) pt-BR and en-US dictionaries both resolve, including interpolation
//       (Paperclip brand preserved inside {{version}} template).

function NavStringsProbe() {
  const { t } = useTranslation(["common"]);
  return (
    <div>
      <span data-testid="new-issue">{t("common:nav.new-issue")}</span>
      <span data-testid="section-work">{t("common:nav.sections.work")}</span>
      <span data-testid="section-company">{t("common:nav.sections.company")}</span>
      <span data-testid="item-inbox">{t("common:nav.items.inbox")}</span>
      <span data-testid="item-issues">{t("common:nav.items.issues")}</span>
      <span data-testid="item-settings">{t("common:nav.items.settings")}</span>
      <span data-testid="item-activity">{t("common:nav.items.activity")}</span>
      <span data-testid="instance-title">{t("common:nav.instance-settings.title")}</span>
      <span data-testid="instance-profile">{t("common:nav.instance-settings.items.profile")}</span>
      <span data-testid="instance-heartbeats">{t("common:nav.instance-settings.items.heartbeats")}</span>
      <span data-testid="account-open">{t("common:nav.account-menu.open")}</span>
      <span data-testid="account-view-profile">{t("common:nav.account-menu.view-profile")}</span>
      <span data-testid="account-edit-profile">{t("common:nav.account-menu.edit-profile")}</span>
      <span data-testid="account-sign-out">{t("common:nav.account-menu.sign-out")}</span>
      <span data-testid="account-version">
        {t("common:nav.account-menu.version", { version: "1.2.3" })}
      </span>
      <span data-testid="breadcrumb-open">{t("common:nav.breadcrumb.open-sidebar")}</span>
      <span data-testid="breadcrumb-close">{t("common:nav.breadcrumb.close-sidebar")}</span>
      <span data-testid="layout-skip">{t("common:nav.layout.skip-to-main")}</span>
      <span data-testid="agents-title">{t("common:nav.agents-section.title")}</span>
      <span data-testid="projects-title">{t("common:nav.projects-section.title")}</span>
      <span data-testid="rail-add-company">{t("common:nav.company-rail.add-company")}</span>
      <span data-testid="company-menu-open">{t("common:nav.company-menu.open")}</span>
    </div>
  );
}

function renderProbe() {
  return render(
    <I18nextProvider i18n={i18n}>
      <NavStringsProbe />
    </I18nextProvider>,
  );
}

describe("Nav surface translation render (UI-05)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nav keys in pt-BR when locale=pt-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    renderProbe();

    expect(screen.getByTestId("new-issue").textContent).toBe("Nova tarefa");
    expect(screen.getByTestId("section-work").textContent).toBe("Trabalho");
    expect(screen.getByTestId("section-company").textContent).toBe("Empresa");
    expect(screen.getByTestId("item-inbox").textContent).toBe("Inbox");
    expect(screen.getByTestId("item-issues").textContent).toBe("Tarefas");
    expect(screen.getByTestId("item-settings").textContent).toBe("Configurações");
    expect(screen.getByTestId("item-activity").textContent).toBe("Atividade");
    expect(screen.getByTestId("instance-title").textContent).toBe("Configurações da instância");
    expect(screen.getByTestId("instance-profile").textContent).toBe("Perfil");
    expect(screen.getByTestId("instance-heartbeats").textContent).toBe("Heartbeats");
    expect(screen.getByTestId("account-open").textContent).toBe("Abrir menu da conta");
    expect(screen.getByTestId("account-view-profile").textContent).toBe("Ver perfil");
    expect(screen.getByTestId("account-edit-profile").textContent).toBe("Editar perfil");
    expect(screen.getByTestId("account-sign-out").textContent).toBe("Sair");
    // Brand "Paperclip" preserved inside interpolation:
    expect(screen.getByTestId("account-version").textContent).toBe("Paperclip v1.2.3");
    expect(screen.getByTestId("breadcrumb-open").textContent).toBe("Abrir barra lateral");
    expect(screen.getByTestId("breadcrumb-close").textContent).toBe("Fechar barra lateral");
    expect(screen.getByTestId("layout-skip").textContent).toBe("Ir para o conteúdo principal");
    expect(screen.getByTestId("agents-title").textContent).toBe("Agentes");
    expect(screen.getByTestId("projects-title").textContent).toBe("Projetos");
    expect(screen.getByTestId("rail-add-company").textContent).toBe("Adicionar empresa");
    expect(screen.getByTestId("company-menu-open").textContent).toBe("Abrir menu da empresa");
  });

  it("renders nav keys in en-US when locale=en-US", async () => {
    await i18n.changeLanguage("en-US");
    renderProbe();

    expect(screen.getByTestId("new-issue").textContent).toBe("New Issue");
    expect(screen.getByTestId("section-work").textContent).toBe("Work");
    expect(screen.getByTestId("section-company").textContent).toBe("Company");
    expect(screen.getByTestId("item-inbox").textContent).toBe("Inbox");
    expect(screen.getByTestId("item-issues").textContent).toBe("Issues");
    expect(screen.getByTestId("item-settings").textContent).toBe("Settings");
    expect(screen.getByTestId("item-activity").textContent).toBe("Activity");
    expect(screen.getByTestId("instance-title").textContent).toBe("Instance Settings");
    expect(screen.getByTestId("instance-profile").textContent).toBe("Profile");
    expect(screen.getByTestId("instance-heartbeats").textContent).toBe("Heartbeats");
    expect(screen.getByTestId("account-open").textContent).toBe("Open account menu");
    expect(screen.getByTestId("account-view-profile").textContent).toBe("View profile");
    expect(screen.getByTestId("account-edit-profile").textContent).toBe("Edit profile");
    expect(screen.getByTestId("account-sign-out").textContent).toBe("Sign out");
    // Brand "Paperclip" preserved inside interpolation:
    expect(screen.getByTestId("account-version").textContent).toBe("Paperclip v1.2.3");
    expect(screen.getByTestId("breadcrumb-open").textContent).toBe("Open sidebar");
    expect(screen.getByTestId("breadcrumb-close").textContent).toBe("Close sidebar");
    expect(screen.getByTestId("layout-skip").textContent).toBe("Skip to Main Content");
    expect(screen.getByTestId("agents-title").textContent).toBe("Agents");
    expect(screen.getByTestId("projects-title").textContent).toBe("Projects");
    expect(screen.getByTestId("rail-add-company").textContent).toBe("Add company");
    expect(screen.getByTestId("company-menu-open").textContent).toBe("Open company menu");
  });
});
