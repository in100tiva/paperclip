// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, Trans, useTranslation } from "react-i18next";
import i18n from "@/i18n";

/**
 * UI-06 / Phase 9-02 — InviteLanding page translation render probe.
 *
 * Probe-component approach for the auth:invite.* sub-tree (largest auth surface).
 * Asserts:
 *   - Header eyebrow + bootstrap/join titles ({{companyName}} interpolation)
 *   - Agent form (title, description with {{companyName}}, fields, coming-soon suffix)
 *   - Inline human auth form (titles, mode toggle CTAs, submit CTAs, tail copy)
 *   - Awaiting approval panel ({{companyName}} title, {{approver}} description, Trans <link>)
 *   - Bootstrap-complete + joined-now success states
 *   - Better Auth USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL feedback (auth:invite.auth.user-already-exists-info)
 *   - signed-in-as Trans component with <strong> interpolation
 */

function InviteLandingProbe({ companyName = "Acme Robotics" }: { companyName?: string }) {
  const { t } = useTranslation(["auth", "common", "errors"]);
  return (
    <div>
      <span data-testid="invalid-token">{t("auth:invite.invalid-token")}</span>
      <span data-testid="loading">{t("auth:invite.loading")}</span>
      <span data-testid="checking-access">{t("auth:invite.checking-access")}</span>

      <h1 data-testid="not-available-title">{t("auth:invite.not-available-title")}</h1>
      <p data-testid="not-available-description">{t("auth:invite.not-available-description")}</p>
      <p data-testid="rejected">{t("auth:invite.rejected-description")}</p>
      <p data-testid="already-used">{t("auth:invite.already-used-description")}</p>

      <h1 data-testid="bootstrap-complete">{t("auth:invite.bootstrap-complete-title")}</h1>
      <h1 data-testid="joined">{t("auth:invite.joined-title")}</h1>
      <span data-testid="open-board">{t("auth:common.open-board")}</span>

      <p data-testid="header-eyebrow">{t("auth:invite.header-eyebrow")}</p>
      <h1 data-testid="header-bootstrap">{t("auth:invite.header-bootstrap")}</h1>
      <h1 data-testid="header-join">{t("auth:invite.header-join", { companyName })}</h1>
      <span data-testid="company-fallback">{t("auth:invite.company-fallback")}</span>

      <p data-testid="description-agent">{t("auth:invite.description-agent")}</p>
      <p data-testid="description-human-needs-account">
        {t("auth:invite.description-human-needs-account")}
      </p>
      <p data-testid="description-ready">{t("auth:invite.description-ready")}</p>

      <span data-testid="field-company">{t("auth:invite.field.company")}</span>
      <span data-testid="field-invited-by">{t("auth:invite.field.invited-by")}</span>
      <span data-testid="field-requested-access">{t("auth:invite.field.requested-access")}</span>
      <span data-testid="field-expires">{t("auth:invite.field.expires")}</span>
      <span data-testid="field-message">{t("auth:invite.field.message")}</span>

      <div data-testid="signed-in-as">
        <Trans
          i18nKey={"auth:invite.field.signed-in-as" as never}
          values={{ name: "Alice" }}
          components={{ strong: <strong /> }}
        />
      </div>

      <h2 data-testid="agent-form-title">{t("auth:invite.agent-form-title")}</h2>
      <p data-testid="agent-form-description">
        {t("auth:invite.agent-form-description", { companyName })}
      </p>
      <span data-testid="field-agent-name">{t("auth:invite.field.agent-name")}</span>
      <span data-testid="field-adapter-type">{t("auth:invite.field.adapter-type")}</span>
      <span data-testid="field-capabilities">{t("auth:invite.field.capabilities")}</span>
      <span data-testid="coming-soon-suffix">{t("auth:invite.coming-soon-suffix")}</span>

      <span data-testid="submit-cta">{t("auth:invite.submit-cta")}</span>
      <span data-testid="accept-cta">{t("auth:invite.accept-cta")}</span>
      <span data-testid="continue-cta">{t("auth:invite.continue-cta")}</span>

      <h2 data-testid="create-account-title">{t("auth:invite.create-account-title")}</h2>
      <h2 data-testid="sign-in-title">{t("auth:invite.sign-in-title")}</h2>
      <p data-testid="create-account-description">
        {t("auth:invite.create-account-description", { companyName })}
      </p>
      <span data-testid="mode-create-account">{t("auth:invite.mode-create-account")}</span>
      <span data-testid="mode-have-account">{t("auth:invite.mode-have-account")}</span>
      <span data-testid="submit-create">{t("auth:invite.submit-create")}</span>
      <span data-testid="submit-sign-in">{t("auth:invite.submit-sign-in")}</span>
      <p data-testid="tail-copy-create">{t("auth:invite.tail-copy-create")}</p>
      <p data-testid="tail-copy-sign-in">{t("auth:invite.tail-copy-sign-in")}</p>

      <h2 data-testid="auto-accept-title">{t("auth:invite.auto-accept-title")}</h2>
      <p data-testid="auto-accept-description">
        {t("auth:invite.auto-accept-description", { companyName })}
      </p>
      <h2 data-testid="accept-bootstrap-title">{t("auth:invite.accept-bootstrap-title")}</h2>
      <h2 data-testid="accept-company-title">{t("auth:invite.accept-company-title")}</h2>
      <p data-testid="already-member">
        {t("auth:invite.already-member", { companyName })}
      </p>
      <span data-testid="this-will-bootstrap">{t("auth:invite.this-will-bootstrap")}</span>
      <span data-testid="this-will-join">
        {t("auth:invite.this-will-join", { companyName })}
      </span>
      <span data-testid="submitting-request">{t("auth:invite.submitting-request")}</span>
      <span data-testid="finishing-signin">{t("auth:invite.finishing-signin")}</span>

      <span data-testid="invited-by-fallback">{t("auth:invite.invited-by-fallback")}</span>
      <span data-testid="access-agent">{t("auth:invite.access-agent")}</span>
      <span data-testid="access-company">{t("auth:invite.access-company")}</span>
      <span data-testid="opening-company">{t("auth:invite.opening-company")}</span>

      {/* Awaiting-approval sub-sub-tree */}
      <h1 data-testid="awaiting-title">
        {t("auth:invite.awaiting-approval.title", { companyName })}
      </h1>
      <p data-testid="awaiting-description">
        {t("auth:invite.awaiting-approval.description", { approver: "Alice" })}
      </p>
      <span data-testid="awaiting-approver-fallback">
        {t("auth:invite.awaiting-approval.approver-fallback")}
      </span>
      <span data-testid="awaiting-approval-page-label">
        {t("auth:invite.awaiting-approval.approval-page-label")}
      </span>
      <span data-testid="awaiting-approval-page-link">
        {t("auth:invite.awaiting-approval.approval-page-link")}
      </span>
      <p data-testid="awaiting-ask">
        <Trans
          i18nKey={"auth:invite.awaiting-approval.ask-them-to-visit" as never}
          components={{ linkTo: <a href="#" /> }}
        />
      </p>
      <p data-testid="awaiting-refresh">{t("auth:invite.awaiting-approval.refresh-hint")}</p>
      <span data-testid="awaiting-claim-secret-label">
        {t("auth:invite.awaiting-approval.claim-secret-label")}
      </span>
      <span data-testid="awaiting-onboarding-label">
        {t("auth:invite.awaiting-approval.onboarding-label")}
      </span>

      {/* Better Auth code mapping via auth:invite.auth.* */}
      <p data-testid="user-already-exists-info">
        {t("auth:invite.auth.user-already-exists-info", { email: "user@example.com" })}
      </p>
      <p data-testid="invalid-email-or-password">
        {t("auth:invite.auth.invalid-email-or-password")}
      </p>
      <p data-testid="request-failed-401">{t("auth:invite.auth.request-failed-401")}</p>
      <p data-testid="request-failed-422">
        {t("auth:invite.auth.request-failed-422", { email: "user@example.com" })}
      </p>
      <p data-testid="auth-fallback">{t("auth:invite.auth.fallback")}</p>
    </div>
  );
}

function renderProbe(companyName?: string) {
  return render(
    <I18nextProvider i18n={i18n}>
      <InviteLandingProbe companyName={companyName} />
    </I18nextProvider>,
  );
}

describe("InviteLanding translation render (UI-06)", () => {
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

    it("renders Portuguese header + bootstrap/join titles with {{companyName}}", () => {
      renderProbe("Acme Robotics");
      expect(screen.getByTestId("header-eyebrow").textContent).toContain(
        "Você foi convidado para entrar no Paperclip",
      );
      expect(screen.getByTestId("header-bootstrap").textContent).toContain("Configurar Paperclip");
      expect(screen.getByTestId("header-join").textContent).toContain("Entrar em Acme Robotics");
      expect(screen.getByTestId("company-fallback").textContent).toContain("esta empresa Paperclip");
    });

    it("renders Portuguese agent form + inline human auth + signed-in-as Trans", () => {
      renderProbe("Acme Robotics");
      expect(screen.getByTestId("agent-form-title").textContent).toContain("Enviar detalhes do agente");
      expect(screen.getByTestId("agent-form-description").textContent).toContain(
        "Acme Robotics",
      );
      expect(screen.getByTestId("field-agent-name").textContent).toContain("Nome do agente");
      expect(screen.getByTestId("field-adapter-type").textContent).toContain("Tipo de adaptador");
      expect(screen.getByTestId("field-capabilities").textContent).toContain("Capacidades");
      expect(screen.getByTestId("coming-soon-suffix").textContent).toContain("(em breve)");

      expect(screen.getByTestId("create-account-title").textContent).toContain("Criar sua conta");
      expect(screen.getByTestId("sign-in-title").textContent).toContain("Entrar para continuar");
      expect(screen.getByTestId("submit-create").textContent).toContain("Criar conta e continuar");
      expect(screen.getByTestId("submit-sign-in").textContent).toContain("Entrar e continuar");

      // Trans signed-in-as renders <strong>name</strong>
      const signedIn = screen.getByTestId("signed-in-as");
      expect(signedIn.textContent).toContain("Conectado como Alice");
      expect(signedIn.querySelector("strong")?.textContent).toBe("Alice");
    });

    it("renders Portuguese awaiting-approval panel with {{companyName}} + Trans <link>", () => {
      renderProbe("Acme Robotics");
      expect(screen.getByTestId("awaiting-title").textContent).toContain(
        "Solicitação para entrar em Acme Robotics",
      );
      expect(screen.getByTestId("awaiting-description").textContent).toContain(
        "Sua solicitação ainda aguarda aprovação. Alice deve aprovar",
      );
      expect(screen.getByTestId("awaiting-approver-fallback").textContent).toContain(
        "Um admin da empresa",
      );
      expect(screen.getByTestId("awaiting-approval-page-link").textContent).toContain(
        "Configurações da empresa → Acesso",
      );
      const ask = screen.getByTestId("awaiting-ask");
      expect(ask.textContent).toContain("Peça para visitarem");
      expect(ask.textContent).toContain("Configurações da empresa → Acesso");
      expect(ask.querySelector("a")).not.toBeNull();
    });

    it("renders Portuguese Better Auth code feedback with {{email}} interpolation", () => {
      renderProbe();
      expect(screen.getByTestId("user-already-exists-info").textContent).toContain(
        "Já existe uma conta para user@example.com",
      );
      expect(screen.getByTestId("user-already-exists-info").textContent).toContain(
        "Entre abaixo para continuar",
      );
      expect(screen.getByTestId("invalid-email-or-password").textContent).toContain(
        "O email e a senha não correspondem",
      );
      expect(screen.getByTestId("request-failed-422").textContent).toContain("user@example.com");
    });

    it("renders Portuguese success/loading state strings", () => {
      renderProbe("Acme Robotics");
      expect(screen.getByTestId("bootstrap-complete").textContent).toContain("Bootstrap concluído");
      expect(screen.getByTestId("joined").textContent).toContain("Você entrou na empresa");
      expect(screen.getByTestId("open-board").textContent).toContain("Abrir board");
      expect(screen.getByTestId("auto-accept-title").textContent).toContain(
        "Enviando solicitação de entrada",
      );
      expect(screen.getByTestId("auto-accept-description").textContent).toContain(
        "Acme Robotics",
      );
      expect(screen.getByTestId("submitting-request").textContent).toContain("Enviando solicitação");
      expect(screen.getByTestId("finishing-signin").textContent).toContain("Finalizando login");
    });
  });

  describe("locale=en-US", () => {
    beforeEach(async () => {
      await i18n.changeLanguage("en-US");
    });

    it("renders English header + brand-preserving 'Paperclip' literal", () => {
      renderProbe("Acme Robotics");
      expect(screen.getByTestId("header-eyebrow").textContent).toContain(
        "You've been invited to join Paperclip",
      );
      expect(screen.getByTestId("header-bootstrap").textContent).toContain("Set up Paperclip");
      expect(screen.getByTestId("header-join").textContent).toContain("Join Acme Robotics");
      expect(screen.getByTestId("company-fallback").textContent).toContain("this Paperclip company");
    });

    it("renders English bootstrap-complete + joined + Better Auth feedback", () => {
      renderProbe("Acme Robotics");
      expect(screen.getByTestId("bootstrap-complete").textContent).toContain("Bootstrap complete");
      expect(screen.getByTestId("joined").textContent).toContain("You joined the company");
      expect(screen.getByTestId("user-already-exists-info").textContent).toContain(
        "An account already exists for user@example.com",
      );
      expect(screen.getByTestId("awaiting-title").textContent).toContain(
        "Request to join Acme Robotics",
      );
    });
  });
});
