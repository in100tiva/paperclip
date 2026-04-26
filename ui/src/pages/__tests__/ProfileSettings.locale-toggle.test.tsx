// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import { ProfileSettings } from "../ProfileSettings";
import { authApi } from "@/api/auth";

vi.mock("@/api/auth", () => ({
  authApi: {
    getSession: vi.fn(async () => ({
      session: { id: "s1", userId: "u1" },
      user: { id: "u1", name: "U", email: "u@x", image: null, locale: "pt-BR" },
    })),
    updateProfile: vi.fn(async (input: { name?: string; locale?: string; image?: string | null }) => ({
      id: "u1",
      name: input.name ?? "U",
      email: "u@x",
      image: null,
      locale: input.locale ?? "pt-BR",
    })),
  },
}));

function renderProfile() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <ProfileSettings />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("ProfileSettings locale toggle (SETTINGS-01, SETTINGS-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SETTINGS-01: renders pt-BR and en-US radios", async () => {
    renderProfile();
    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: /pt-?br|portugu/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: /en-?us|english|inglês/i }),
      ).toBeInTheDocument();
    });
  });

  it("SETTINGS-04: clicking en-US radio calls i18n.changeLanguage('en-US') and PATCHes { locale: 'en-US' }", async () => {
    const changeSpy = vi.spyOn(i18n, "changeLanguage");
    renderProfile();
    const radio = await screen.findByRole("radio", {
      name: /en-?us|english|inglês/i,
    });
    await userEvent.click(radio);
    await waitFor(() => {
      expect(changeSpy).toHaveBeenCalledWith("en-US");
      expect(authApi.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ locale: "en-US" }),
      );
    });
  });
});
