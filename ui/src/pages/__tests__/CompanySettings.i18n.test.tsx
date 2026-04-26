// @vitest-environment jsdom
import { afterEach, describe, it, expect, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";

/**
 * UI-04 / Phase 9-01 — CompanySettings translation render probe.
 *
 * Probe-component approach: lightweight consumer of the company.* sub-tree
 * (avoids mounting the heavy CompanySettings page which requires Company/
 * Breadcrumb/Toast/QueryClient contexts). Asserts:
 *   - Keys exist in both locales
 *   - Values differ between locales
 *   - Section headers, action buttons, danger-zone confirm interpolation
 */

function CompanySettingsProbe() {
  const { t } = useTranslation(["settings", "common"]);
  return (
    <div>
      <h1 data-testid="company-title">{t("settings:company.title")}</h1>
      <h2 data-testid="general-section">{t("settings:company.general.section")}</h2>
      <h2 data-testid="appearance-section">{t("settings:company.appearance.section")}</h2>
      <h2 data-testid="environments-section">{t("settings:company.environments.section")}</h2>
      <h2 data-testid="hiring-section">{t("settings:company.hiring.section")}</h2>
      <h2 data-testid="claude-pool-section">{t("settings:company.claude-pool.section")}</h2>
      <h2 data-testid="invites-section">{t("settings:company.invites.section")}</h2>
      <h2 data-testid="packages-section">{t("settings:company.packages.section")}</h2>
      <h2 data-testid="danger-zone-section">{t("settings:company.danger-zone.section")}</h2>

      <span data-testid="save-changes">{t("settings:company.actions.save-changes")}</span>
      <span data-testid="archive-cta">{t("settings:company.danger-zone.archive-cta")}</span>
      <span data-testid="archive-confirm">
        {t("settings:company.danger-zone.archive-confirm", { name: "Acme" })}
      </span>
      <span data-testid="invites-cta">{t("settings:company.invites.generate-cta")}</span>
      <span data-testid="logo-label">{t("settings:company.appearance.logo-label")}</span>
      <span data-testid="brand-color-clear">{t("settings:company.appearance.brand-color-clear")}</span>
    </div>
  );
}

function renderProbe() {
  return render(
    <I18nextProvider i18n={i18n}>
      <CompanySettingsProbe />
    </I18nextProvider>,
  );
}

describe("CompanySettings translation render (UI-04)", () => {
  afterEach(() => {
    cleanup();
  });

  describe("locale=pt-BR", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    it("renders Portuguese values for all section headers and key actions", () => {
      renderProbe();
      expect(screen.getByTestId("company-title").textContent).toContain("Configurações da empresa");
      expect(screen.getByTestId("general-section").textContent).toContain("Geral");
      expect(screen.getByTestId("appearance-section").textContent).toContain("Aparência");
      expect(screen.getByTestId("environments-section").textContent).toContain("Ambientes");
      expect(screen.getByTestId("hiring-section").textContent).toContain("Contratação");
      expect(screen.getByTestId("claude-pool-section").textContent).toContain("Pool de contas Claude");
      expect(screen.getByTestId("invites-section").textContent).toContain("Convites");
      expect(screen.getByTestId("packages-section").textContent).toContain("Pacotes da empresa");
      expect(screen.getByTestId("danger-zone-section").textContent).toContain("Zona de perigo");
      expect(screen.getByTestId("save-changes").textContent).toContain("Salvar alterações");
      expect(screen.getByTestId("archive-cta").textContent).toContain("Arquivar empresa");
      expect(screen.getByTestId("archive-confirm").textContent).toContain("Acme");
      expect(screen.getByTestId("archive-confirm").textContent).toContain("Arquivar");
      expect(screen.getByTestId("logo-label").textContent).toContain("Logo");
      expect(screen.getByTestId("brand-color-clear").textContent).toContain("Limpar");
    });
  });

  describe("locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English values for all section headers and key actions", () => {
      renderProbe();
      expect(screen.getByTestId("company-title").textContent).toContain("Company Settings");
      expect(screen.getByTestId("general-section").textContent).toContain("General");
      expect(screen.getByTestId("appearance-section").textContent).toContain("Appearance");
      expect(screen.getByTestId("environments-section").textContent).toContain("Environments");
      expect(screen.getByTestId("hiring-section").textContent).toContain("Hiring");
      expect(screen.getByTestId("claude-pool-section").textContent).toContain("Claude Account Pool");
      expect(screen.getByTestId("invites-section").textContent).toContain("Invites");
      expect(screen.getByTestId("packages-section").textContent).toContain("Company Packages");
      expect(screen.getByTestId("danger-zone-section").textContent).toContain("Danger Zone");
      expect(screen.getByTestId("save-changes").textContent).toContain("Save changes");
      expect(screen.getByTestId("archive-cta").textContent).toContain("Archive company");
      expect(screen.getByTestId("archive-confirm").textContent).toContain("Acme");
      expect(screen.getByTestId("archive-confirm").textContent).toContain("Archive");
      expect(screen.getByTestId("logo-label").textContent).toContain("Logo");
      expect(screen.getByTestId("brand-color-clear").textContent).toContain("Clear");
    });
  });
});
