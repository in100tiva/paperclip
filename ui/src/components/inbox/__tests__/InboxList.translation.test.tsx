// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/i18n";

// We assert on the translation engine output via a tiny consumer component
// that mirrors the actual Inbox.tsx / IssuesList.tsx / IssueFiltersPopover.tsx
// usage of `useTranslation(["inbox", "common"])` and `t("inbox:...")`. This
// approach avoids the Radix Popover portal rendering edge cases in jsdom,
// while still validating the round-trip:
//   (1) inbox.json key → t() lookup
//   (2) i18n.changeLanguage triggers re-render
//   (3) pt-BR and en-US dictionaries both resolve

function InboxStringsProbe() {
  const { t } = useTranslation(["inbox", "common"]);
  return (
    <div>
      <span data-testid="title">{t("inbox:title")}</span>
      <span data-testid="tabs-mine">{t("inbox:tabs.mine")}</span>
      <span data-testid="filters-title">{t("inbox:filters.title")}</span>
      <span data-testid="filters-quick">{t("inbox:filters.quick-filters")}</span>
      <span data-testid="filters-priority">{t("inbox:filters.priority")}</span>
      <span data-testid="filters-assignee">{t("inbox:filters.assignee")}</span>
      <span data-testid="filters-no-assignee">{t("inbox:filters.no-assignee")}</span>
      <span data-testid="filters-live">{t("inbox:filters.live-runs-only")}</span>
      <span data-testid="search-placeholder">{t("inbox:search.placeholder")}</span>
      <span data-testid="empty-select-company">{t("inbox:empty-state.select-company")}</span>
      <span data-testid="confirm-title">{t("inbox:actions.mark-all-as-read-confirm-title")}</span>
      <span data-testid="common-cancel">{t("common:cancel")}</span>
    </div>
  );
}

function renderProbe() {
  return render(
    <I18nextProvider i18n={i18n}>
      <InboxStringsProbe />
    </I18nextProvider>,
  );
}

describe("Inbox surface translation render (UI-01)", () => {
  beforeEach(async () => {
    // Reset to default pt-BR before each test
    await i18n.changeLanguage("pt-BR");
  });

  afterEach(() => {
    // RTL cleanup is normally automatic via the global setup, but our project
    // does not import @testing-library/jest-dom/vitest globally for this
    // test file — call cleanup explicitly to avoid leaking DOM nodes.
    cleanup();
  });

  it("renders Inbox keys in pt-BR when locale=pt-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    renderProbe();

    expect(screen.getByTestId("title")).toHaveTextContent("Inbox");
    expect(screen.getByTestId("tabs-mine")).toHaveTextContent("Meus");
    expect(screen.getByTestId("filters-title")).toHaveTextContent("Filtros");
    expect(screen.getByTestId("filters-quick")).toHaveTextContent("Filtros rápidos");
    expect(screen.getByTestId("filters-priority")).toHaveTextContent("Prioridade");
    expect(screen.getByTestId("filters-assignee")).toHaveTextContent("Responsável");
    expect(screen.getByTestId("filters-no-assignee")).toHaveTextContent("Sem responsável");
    expect(screen.getByTestId("filters-live")).toHaveTextContent("Apenas execuções ao vivo");
    expect(screen.getByTestId("search-placeholder")).toHaveTextContent("Buscar inbox");
    expect(screen.getByTestId("empty-select-company")).toHaveTextContent("Selecione uma empresa");
    expect(screen.getByTestId("confirm-title")).toHaveTextContent("Marcar tudo como lido?");
    expect(screen.getByTestId("common-cancel")).toHaveTextContent("Cancelar");
  });

  it("renders Inbox keys in en-US after changeLanguage('en-US')", async () => {
    await i18n.changeLanguage("en-US");
    renderProbe();

    expect(screen.getByTestId("title")).toHaveTextContent("Inbox");
    expect(screen.getByTestId("tabs-mine")).toHaveTextContent("Mine");
    expect(screen.getByTestId("filters-title")).toHaveTextContent("Filters");
    expect(screen.getByTestId("filters-quick")).toHaveTextContent("Quick filters");
    expect(screen.getByTestId("filters-priority")).toHaveTextContent("Priority");
    expect(screen.getByTestId("filters-assignee")).toHaveTextContent("Assignee");
    expect(screen.getByTestId("filters-no-assignee")).toHaveTextContent("No assignee");
    expect(screen.getByTestId("filters-live")).toHaveTextContent("Live runs only");
    expect(screen.getByTestId("search-placeholder")).toHaveTextContent("Search inbox");
    expect(screen.getByTestId("empty-select-company")).toHaveTextContent("Select a company");
    expect(screen.getByTestId("confirm-title")).toHaveTextContent("Mark all as read?");
    expect(screen.getByTestId("common-cancel")).toHaveTextContent("Cancel");
  });
});
