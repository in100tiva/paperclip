import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, defaultNS } from "./resources";

const isDev = import.meta.env.DEV;

void i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  ns: [
    "common",
    "inbox",
    "projects",
    "settings",
    "auth",
    "agents",
    "errors",
    "activity",
    "onboarding",
  ],
  fallbackLng: "en-US",
  lng: "pt-BR", // overridden by session.user.locale on hydration (Plan 05)
  interpolation: { escapeValue: false }, // React already escapes
  returnEmptyString: false,
  react: { useSuspense: false }, // CONTEXT decision: hot-swap without boundary boilerplate
  saveMissing: isDev,
  missingKeyHandler: (lngs, ns, key) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn(
        `[i18n missing] ${ns}:${key} for ${(lngs ?? []).join(",")}`,
      );
    }
  },
});

export default i18n;
