// @vitest-environment jsdom
import { afterEach, beforeAll, describe, it, expect } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { ToastProvider, useToastActions, useToastState } from "@/context/ToastContext";

/**
 * UI-08 / Phase 9-04 — Toast translation RTL probe.
 *
 * Asserts that pushToast({ title: t(...) }) renders translated strings under both
 * locales, and that i18next plurals (_one/_other) resolve correctly via the
 * common:toast.* sub-tree introduced in Plan 09-04.
 */

function ToastTrigger({
  event,
  params,
}: {
  event: string;
  params?: Record<string, unknown>;
}) {
  const { pushToast } = useToastActions();
  const { t } = useTranslation(["common"]);
  return (
    <button
      data-testid="trigger"
      onClick={() =>
        pushToast({
          title: t(`common:toast.${event}` as never, params as never) as string,
          tone: "success",
        })
      }
    >
      trigger
    </button>
  );
}

function ToastList() {
  const toasts = useToastState();
  return (
    <ul data-testid="toast-list">
      {toasts.map((toast) => (
        <li key={toast.id} data-testid="toast-item">
          {toast.title}
        </li>
      ))}
    </ul>
  );
}

function renderHarness(child: React.ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        {child}
        <ToastList />
      </ToastProvider>
    </I18nextProvider>,
  );
}

describe("UI-08 — Toast translation", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders simple toast title (saved) in pt-BR", () => {
    renderHarness(<ToastTrigger event="saved" />);
    act(() => {
      (screen.getByTestId("trigger") as HTMLButtonElement).click();
    });
    expect(screen.getByTestId("toast-item").textContent).toBe("Salvo");
  });

  it("renders i18next plural _one in pt-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    renderHarness(
      <ToastTrigger event="member-removed-with-reassignment" params={{ count: 1 }} />,
    );
    act(() => {
      (screen.getByTestId("trigger") as HTMLButtonElement).click();
    });
    expect(screen.getByTestId("toast-item").textContent).toBe("1 tarefa reatribuída.");
  });

  it("renders i18next plural _other in pt-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    renderHarness(
      <ToastTrigger event="member-removed-with-reassignment" params={{ count: 3 }} />,
    );
    act(() => {
      (screen.getByTestId("trigger") as HTMLButtonElement).click();
    });
    expect(screen.getByTestId("toast-item").textContent).toBe("3 tarefas reatribuídas.");
  });

  it("renders mirror plural _one in en-US after locale toggle", async () => {
    await i18n.changeLanguage("en-US");
    renderHarness(
      <ToastTrigger event="member-removed-with-reassignment" params={{ count: 1 }} />,
    );
    act(() => {
      (screen.getByTestId("trigger") as HTMLButtonElement).click();
    });
    expect(screen.getByTestId("toast-item").textContent).toBe("1 task reassigned.");
    await i18n.changeLanguage("pt-BR");
  });
});
