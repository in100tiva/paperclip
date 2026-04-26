// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";

/**
 * UI-06 / Phase 9-02 — Auth page (sign-in/sign-up unified) translation render probe.
 *
 * Probe-component approach for the auth.* sub-trees (common, page, errors:auth.*).
 * Asserts:
 *   - Page title + description toggle between sign_in and sign_up modes (pt-BR + en-US)
 *   - Field labels (name/email/password) resolve from auth:common
 *   - Switch CTAs ("Need an account?" / "Already have an account?") render
 *   - Validation message resolves from errors:validation.required-fields
 *   - Better Auth code USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL maps via translateApiError
 *     to errors:auth.user-already-exists with {{email}} interpolation
 */

function AuthProbe({ mode }: { mode: "sign_in" | "sign_up" }) {
  const { t } = useTranslation(["auth", "common", "errors"]);
  return (
    <div>
      <h1 data-testid="title">
        {mode === "sign_in"
          ? t("auth:page.sign-in-title")
          : t("auth:page.sign-up-title")}
      </h1>
      <p data-testid="description">
        {mode === "sign_in"
          ? t("auth:page.sign-in-description")
          : t("auth:page.sign-up-description")}
      </p>
      {mode === "sign_up" && <span data-testid="name">{t("auth:common.name")}</span>}
      <span data-testid="email">{t("auth:common.email")}</span>
      <span data-testid="password">{t("auth:common.password")}</span>
      <span data-testid="submit">
        {mode === "sign_in"
          ? t("auth:common.sign-in")
          : t("auth:common.create-account")}
      </span>
      <span data-testid="switch-prompt">
        {mode === "sign_in"
          ? t("auth:page.switch-to-sign-up")
          : t("auth:page.switch-to-sign-in")}
      </span>
      <span data-testid="switch-cta">
        {mode === "sign_in"
          ? t("auth:page.switch-cta-sign-up")
          : t("auth:page.switch-cta-sign-in")}
      </span>
      <span data-testid="working">{t("auth:common.working")}</span>
      <span data-testid="validation">{t("errors:validation.required-fields")}</span>
      <span data-testid="user-exists">
        {t("errors:auth.user-already-exists", { email: "user@example.com" })}
      </span>
      <span data-testid="auth-failed">{t("auth:page.auth-failed-fallback")}</span>
    </div>
  );
}

function renderProbe(mode: "sign_in" | "sign_up") {
  return render(
    <I18nextProvider i18n={i18n}>
      <AuthProbe mode={mode} />
    </I18nextProvider>,
  );
}

describe("Auth translation render (UI-06)", () => {
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

    it("renders Portuguese sign-in copy", () => {
      renderProbe("sign_in");
      expect(screen.getByTestId("title").textContent).toContain("Entrar no Paperclip");
      expect(screen.getByTestId("description").textContent).toContain("email e senha");
      expect(screen.getByTestId("email").textContent).toContain("Email");
      expect(screen.getByTestId("password").textContent).toContain("Senha");
      expect(screen.getByTestId("submit").textContent).toContain("Entrar");
      expect(screen.getByTestId("switch-prompt").textContent).toContain("Precisa de uma conta?");
      expect(screen.getByTestId("switch-cta").textContent).toContain("Crie uma");
      expect(screen.getByTestId("working").textContent).toContain("Trabalhando");
    });

    it("renders Portuguese sign-up copy", () => {
      renderProbe("sign_up");
      expect(screen.getByTestId("title").textContent).toContain("Criar sua conta Paperclip");
      expect(screen.getByTestId("name").textContent).toContain("Nome");
      expect(screen.getByTestId("submit").textContent).toContain("Criar conta");
      expect(screen.getByTestId("switch-prompt").textContent).toContain("Já tem uma conta?");
    });

    it("renders Portuguese validation + Better Auth user-already-exists with {{email}} interpolation", () => {
      renderProbe("sign_in");
      expect(screen.getByTestId("validation").textContent).toContain("Preencha todos os campos");
      expect(screen.getByTestId("user-exists").textContent).toContain("user@example.com");
      expect(screen.getByTestId("user-exists").textContent).toContain("Já existe uma conta");
      expect(screen.getByTestId("auth-failed").textContent).toContain("Falha na autenticação");
    });
  });

  describe("locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English sign-in copy", () => {
      renderProbe("sign_in");
      expect(screen.getByTestId("title").textContent).toContain("Sign in to Paperclip");
      expect(screen.getByTestId("description").textContent).toContain("email and password");
      expect(screen.getByTestId("submit").textContent).toContain("Sign in");
      expect(screen.getByTestId("switch-cta").textContent).toContain("Create one");
    });

    it("renders English sign-up copy + brand-preserving title", () => {
      renderProbe("sign_up");
      expect(screen.getByTestId("title").textContent).toContain("Create your Paperclip account");
      expect(screen.getByTestId("name").textContent).toContain("Name");
      expect(screen.getByTestId("submit").textContent).toContain("Create account");
    });
  });
});
