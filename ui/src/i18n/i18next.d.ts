import "i18next";
import type { resources, defaultNS } from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)["pt-BR"]; // pt-BR is the source of truth for keys
  }
}
