// @vitest-environment jsdom
import { afterEach, describe, it, expect, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";

/**
 * UI-03 / Phase 8-03 — Settings translation render probe.
 *
 * Mirrors Phase 8-01 (Inbox.translation.test.tsx) and Phase 8-02 (Projects.translation.test.tsx)
 * probe-component approach: instead of mounting the heavy real Settings pages (which require
 * Company/Breadcrumb/Toast contexts + heavy mocks), we render a lightweight component that
 * consumes the same translation keys via useTranslation. This asserts that:
 *   - The keys exist in both locales (already covered by missing-keys.test.ts)
 *   - The rendered values differ between locales (proves the dictionary is not stub)
 *   - Plural interpolation round-trips correctly (i18next built-in plurals)
 */

function SettingsProbe() {
  const { t } = useTranslation(["settings", "common"]);
  return (
    <div>
      <h1 data-testid="general-title">{t("settings:general.title")}</h1>
      <p data-testid="general-description">{t("settings:general.description")}</p>
      <h2 data-testid="deployment-title">{t("settings:general.deployment.title")}</h2>
      <h2 data-testid="censor-title">{t("settings:general.censor-username.title")}</h2>
      <h2 data-testid="keyboard-title">{t("settings:general.keyboard-shortcuts.title")}</h2>
      <h2 data-testid="backup-title">{t("settings:general.backup-retention.title")}</h2>
      <h2 data-testid="feedback-title">{t("settings:general.ai-feedback.title")}</h2>
      <h2 data-testid="sign-out-title">{t("settings:general.sign-out.title")}</h2>
      <h2 data-testid="heartbeats-title">{t("settings:heartbeats.title")}</h2>
      <h2 data-testid="experimental-title">{t("settings:experimental.title")}</h2>
      <h2 data-testid="profile-title">{t("settings:profile.title")}</h2>
      <h2 data-testid="claude-title">{t("settings:claude-accounts.title")}</h2>
      <h2 data-testid="instance-title">{t("settings:instance-settings.title")}</h2>

      <span data-testid="profile-save">{t("settings:profile.save")}</span>
      <span data-testid="profile-name-label">{t("settings:profile.name-label")}</span>
      <span data-testid="profile-upload">{t("settings:profile.upload-photo")}</span>

      <span data-testid="heartbeats-actions-disable-all">
        {t("settings:heartbeats.actions.disable-all")}
      </span>
      <span data-testid="heartbeats-confirm-disable-all">
        {t("settings:heartbeats.actions.confirm-disable-all", { count: 3 })}
      </span>

      <span data-testid="backup-days-1">{t("settings:general.backup-retention.days", { count: 1 })}</span>
      <span data-testid="backup-days-7">{t("settings:general.backup-retention.days", { count: 7 })}</span>
      <span data-testid="backup-weeks-1">{t("settings:general.backup-retention.weeks", { count: 1 })}</span>
      <span data-testid="backup-months-1">{t("settings:general.backup-retention.months", { count: 1 })}</span>

      <span data-testid="claude-register">{t("settings:claude-accounts.register.submit")}</span>
      <span data-testid="claude-status-live">{t("settings:claude-accounts.status.live")}</span>

      <span data-testid="profile-upload-hint">
        {t("settings:profile.upload-hint-with-company", { company: "Acme" })}
      </span>

      <span data-testid="language-title">{t("settings:language.title")}</span>
    </div>
  );
}

function renderProbe() {
  return render(
    <I18nextProvider i18n={i18n}>
      <SettingsProbe />
    </I18nextProvider>,
  );
}

describe("Settings translation render (UI-03)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Settings keys in pt-BR", async () => {
    renderProbe();

    expect(screen.getByTestId("general-title").textContent).toBe("Geral");
    expect(screen.getByTestId("deployment-title").textContent).toBe(
      "Implantação e autenticação",
    );
    expect(screen.getByTestId("censor-title").textContent).toBe("Censurar usuário em logs");
    expect(screen.getByTestId("keyboard-title").textContent).toBe("Atalhos de teclado");
    expect(screen.getByTestId("backup-title").textContent).toBe("Retenção de backups");
    expect(screen.getByTestId("feedback-title").textContent).toBe(
      "Compartilhamento de feedback de IA",
    );
    expect(screen.getByTestId("sign-out-title").textContent).toBe("Sair");
    expect(screen.getByTestId("heartbeats-title").textContent).toBe("Heartbeats do agendador");
    expect(screen.getByTestId("experimental-title").textContent).toBe("Experimental");
    expect(screen.getByTestId("profile-title").textContent).toBe("Perfil");
    expect(screen.getByTestId("claude-title").textContent).toBe("Contas Claude");
    expect(screen.getByTestId("instance-title").textContent).toBe("Configurações da instância");

    expect(screen.getByTestId("profile-save").textContent).toBe("Salvar perfil");
    expect(screen.getByTestId("profile-name-label").textContent).toBe("Nome de exibição");
    expect(screen.getByTestId("profile-upload").textContent).toBe("Enviar foto");

    expect(screen.getByTestId("heartbeats-actions-disable-all").textContent).toBe("Desativar todos");

    // Plural resolution (i18next built-in): count=3 → _other in pt-BR
    expect(screen.getByTestId("heartbeats-confirm-disable-all").textContent).toBe(
      "Desativar timer heartbeats para os 3 agentes habilitados?",
    );

    // Plurals — count=1 → _one; count=7 → _other
    expect(screen.getByTestId("backup-days-1").textContent).toBe("1 dia");
    expect(screen.getByTestId("backup-days-7").textContent).toBe("7 dias");
    expect(screen.getByTestId("backup-weeks-1").textContent).toBe("1 semana");
    expect(screen.getByTestId("backup-months-1").textContent).toBe("1 mês");

    expect(screen.getByTestId("claude-register").textContent).toBe("Registrar");
    expect(screen.getByTestId("claude-status-live").textContent).toBe("Ativa");

    // Interpolation round-trip: { company } resolves into the template
    expect(screen.getByTestId("profile-upload-hint").textContent).toBe(
      "Armazenado no storage de arquivos do Paperclip para Acme.",
    );

    // Phase 7 preserved sub-tree
    expect(screen.getByTestId("language-title").textContent).toBe("Idioma");
  });

  it("renders Settings keys in en-US", async () => {
    await i18n.changeLanguage("en-US");
    renderProbe();

    expect(screen.getByTestId("general-title").textContent).toBe("General");
    expect(screen.getByTestId("deployment-title").textContent).toBe("Deployment and auth");
    expect(screen.getByTestId("censor-title").textContent).toBe("Censor username in logs");
    expect(screen.getByTestId("keyboard-title").textContent).toBe("Keyboard shortcuts");
    expect(screen.getByTestId("backup-title").textContent).toBe("Backup retention");
    expect(screen.getByTestId("feedback-title").textContent).toBe("AI feedback sharing");
    expect(screen.getByTestId("sign-out-title").textContent).toBe("Sign out");
    expect(screen.getByTestId("heartbeats-title").textContent).toBe("Scheduler Heartbeats");
    expect(screen.getByTestId("experimental-title").textContent).toBe("Experimental");
    expect(screen.getByTestId("profile-title").textContent).toBe("Profile");
    expect(screen.getByTestId("claude-title").textContent).toBe("Claude Accounts");
    expect(screen.getByTestId("instance-title").textContent).toBe("Instance Settings");

    expect(screen.getByTestId("profile-save").textContent).toBe("Save profile");
    expect(screen.getByTestId("profile-name-label").textContent).toBe("Display name");
    expect(screen.getByTestId("profile-upload").textContent).toBe("Upload photo");

    expect(screen.getByTestId("heartbeats-actions-disable-all").textContent).toBe("Disable All");

    // Plurals: en-US count=3 → _other
    expect(screen.getByTestId("heartbeats-confirm-disable-all").textContent).toBe(
      "Disable timer heartbeats for all 3 enabled agents?",
    );
    expect(screen.getByTestId("backup-days-1").textContent).toBe("1 day");
    expect(screen.getByTestId("backup-days-7").textContent).toBe("7 days");
    expect(screen.getByTestId("backup-weeks-1").textContent).toBe("1 week");
    expect(screen.getByTestId("backup-months-1").textContent).toBe("1 month");

    expect(screen.getByTestId("claude-register").textContent).toBe("Register");
    expect(screen.getByTestId("claude-status-live").textContent).toBe("Live");

    expect(screen.getByTestId("profile-upload-hint").textContent).toBe(
      "Stored in Paperclip file storage for Acme.",
    );

    expect(screen.getByTestId("language-title").textContent).toBe("Language");
  });
});
