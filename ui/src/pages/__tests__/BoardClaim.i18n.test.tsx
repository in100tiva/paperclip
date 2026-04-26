// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";

/**
 * UI-06 / Phase 9-02 — BoardClaim page translation render probe.
 *
 * Probe-component approach for the auth:board-claim.* sub-tree.
 * Asserts: invalid URL, loading, claim challenge unavailable, claimed-success,
 * sign-in-required, claim-CTA — for both pt-BR and en-US.
 */

function BoardClaimProbe() {
  const { t } = useTranslation(["auth", "common"]);
  return (
    <div>
      <span data-testid="invalid-url">{t("auth:board-claim.invalid-url")}</span>
      <span data-testid="loading">{t("auth:board-claim.loading")}</span>
      <h1 data-testid="unavailable-title">
        {t("auth:board-claim.challenge-unavailable-title")}
      </h1>
      <h1 data-testid="claimed-title">{t("auth:board-claim.claimed-title")}</h1>
      <p data-testid="claimed-description">
        {t("auth:board-claim.claimed-description")}
      </p>
      <span data-testid="open-board">{t("auth:common.open-board")}</span>
      <h1 data-testid="signin-title">{t("auth:board-claim.sign-in-required-title")}</h1>
      <p data-testid="signin-description">
        {t("auth:board-claim.sign-in-required-description")}
      </p>
      <span data-testid="signin-cta">{t("auth:board-claim.sign-in-cta")}</span>
      <h1 data-testid="claim-title">{t("auth:board-claim.claim-title")}</h1>
      <p data-testid="claim-description">{t("auth:board-claim.claim-description")}</p>
      <span data-testid="claim-cta">{t("auth:board-claim.claim-cta")}</span>
      <span data-testid="claim-pending">{t("auth:board-claim.claim-cta-pending")}</span>
    </div>
  );
}

function renderProbe() {
  return render(
    <I18nextProvider i18n={i18n}>
      <BoardClaimProbe />
    </I18nextProvider>,
  );
}

describe("BoardClaim translation render (UI-06)", () => {
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

    it("renders Portuguese board-claim sub-tree", () => {
      renderProbe();
      expect(screen.getByTestId("invalid-url").textContent).toContain("URL de reivindicação");
      expect(screen.getByTestId("loading").textContent).toContain("Carregando desafio");
      expect(screen.getByTestId("claimed-title").textContent).toContain("Propriedade do board reivindicada");
      expect(screen.getByTestId("open-board").textContent).toContain("Abrir board");
      expect(screen.getByTestId("signin-title").textContent).toContain("Login necessário");
      expect(screen.getByTestId("signin-cta").textContent).toContain("Entrar / Criar conta");
      expect(screen.getByTestId("claim-title").textContent).toContain("Reivindicar propriedade");
      expect(screen.getByTestId("claim-cta").textContent).toContain("Reivindicar propriedade");
      expect(screen.getByTestId("claim-pending").textContent).toContain("Reivindicando");
    });
  });

  describe("locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English board-claim sub-tree", () => {
      renderProbe();
      expect(screen.getByTestId("invalid-url").textContent).toContain("Invalid board claim URL");
      expect(screen.getByTestId("loading").textContent).toContain("Loading claim challenge");
      expect(screen.getByTestId("claimed-title").textContent).toContain("Board ownership claimed");
      expect(screen.getByTestId("open-board").textContent).toContain("Open board");
      expect(screen.getByTestId("signin-title").textContent).toContain("Sign in required");
      expect(screen.getByTestId("claim-title").textContent).toContain("Claim Board ownership");
      expect(screen.getByTestId("claim-pending").textContent).toContain("Claiming");
    });
  });
});
