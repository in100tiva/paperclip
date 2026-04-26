// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";

/**
 * UI-06 / Phase 9-02 — CliAuth page translation render probe.
 *
 * Probe-component approach for the auth:cli-auth.* sub-tree.
 * Asserts: approve view (title, fields, access enum), expired/cancelled, sign-in-required,
 * approve/cancel CTAs — for both pt-BR and en-US.
 */

function CliAuthProbe() {
  const { t } = useTranslation(["auth", "common"]);
  return (
    <div>
      <span data-testid="invalid-url">{t("auth:cli-auth.invalid-url")}</span>
      <span data-testid="loading">{t("auth:cli-auth.loading")}</span>
      <h1 data-testid="approve-title">{t("auth:cli-auth.approve-title")}</h1>
      <p data-testid="approve-description">{t("auth:cli-auth.approve-description")}</p>
      <span data-testid="field-command">{t("auth:cli-auth.field.command")}</span>
      <span data-testid="field-client">{t("auth:cli-auth.field.client")}</span>
      <span data-testid="field-requested-access">
        {t("auth:cli-auth.field.requested-access")}
      </span>
      <span data-testid="field-requested-company">
        {t("auth:cli-auth.field.requested-company")}
      </span>
      <span data-testid="access-instance-admin">
        {t("auth:cli-auth.access.instance-admin")}
      </span>
      <span data-testid="access-board">{t("auth:cli-auth.access.board")}</span>
      <span data-testid="client-fallback">{t("auth:cli-auth.client-fallback")}</span>
      <span data-testid="approve-cta">{t("auth:cli-auth.approve-cta")}</span>
      <span data-testid="approving">{t("auth:cli-auth.approving")}</span>
      <span data-testid="cancel-cta">{t("auth:cli-auth.cancel-cta")}</span>
      <span data-testid="cancelling">{t("auth:cli-auth.cancelling")}</span>
      <h1 data-testid="approved-title">{t("auth:cli-auth.approved-title")}</h1>
      <h1 data-testid="expired-title">{t("auth:cli-auth.expired-title")}</h1>
      <h1 data-testid="cancelled-title">{t("auth:cli-auth.cancelled-title")}</h1>
      <span data-testid="requires-admin">{t("auth:cli-auth.requires-instance-admin")}</span>
    </div>
  );
}

function renderProbe() {
  return render(
    <I18nextProvider i18n={i18n}>
      <CliAuthProbe />
    </I18nextProvider>,
  );
}

describe("CliAuth translation render (UI-06)", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en-US");
  });

  afterEach(() => {
    cleanup();
  });

  describe("locale=pt-BR", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    it("renders Portuguese cli-auth approve view + fields + access enum", () => {
      renderProbe();
      expect(screen.getByTestId("approve-title").textContent).toContain(
        "Aprovar acesso do CLI Paperclip",
      );
      expect(screen.getByTestId("field-command").textContent).toContain("Comando");
      expect(screen.getByTestId("field-client").textContent).toContain("Cliente");
      expect(screen.getByTestId("field-requested-access").textContent).toContain(
        "Acesso solicitado",
      );
      expect(screen.getByTestId("access-instance-admin").textContent).toContain(
        "Admin da instância",
      );
      expect(screen.getByTestId("access-board").textContent).toContain("Board");
      expect(screen.getByTestId("client-fallback").textContent).toContain("paperclipai cli");
      expect(screen.getByTestId("approve-cta").textContent).toContain("Aprovar acesso CLI");
      expect(screen.getByTestId("approving").textContent).toContain("Aprovando");
      expect(screen.getByTestId("cancel-cta").textContent).toContain("Cancelar");
    });

    it("renders Portuguese state titles (approved/expired/cancelled)", () => {
      renderProbe();
      expect(screen.getByTestId("approved-title").textContent).toContain("Acesso CLI aprovado");
      expect(screen.getByTestId("expired-title").textContent).toContain(
        "Desafio de autenticação CLI expirado",
      );
      expect(screen.getByTestId("cancelled-title").textContent).toContain(
        "Desafio de autenticação CLI cancelado",
      );
    });
  });

  describe("locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English cli-auth approve + state titles", () => {
      renderProbe();
      expect(screen.getByTestId("approve-title").textContent).toContain(
        "Approve Paperclip CLI access",
      );
      expect(screen.getByTestId("expired-title").textContent).toContain("expired");
      expect(screen.getByTestId("cancelled-title").textContent).toContain("cancelled");
      expect(screen.getByTestId("client-fallback").textContent).toContain("paperclipai cli");
    });
  });
});
