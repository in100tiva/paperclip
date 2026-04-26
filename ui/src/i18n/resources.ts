// Static imports of all 16 dictionary JSON files.
// Vite handles JSON imports natively (no plugin needed).
import commonPt from "./locales/pt-BR/common.json";
import inboxPt from "./locales/pt-BR/inbox.json";
import projectsPt from "./locales/pt-BR/projects.json";
import settingsPt from "./locales/pt-BR/settings.json";
import authPt from "./locales/pt-BR/auth.json";
import agentsPt from "./locales/pt-BR/agents.json";
import errorsPt from "./locales/pt-BR/errors.json";
import activityPt from "./locales/pt-BR/activity.json";

import commonEn from "./locales/en-US/common.json";
import inboxEn from "./locales/en-US/inbox.json";
import projectsEn from "./locales/en-US/projects.json";
import settingsEn from "./locales/en-US/settings.json";
import authEn from "./locales/en-US/auth.json";
import agentsEn from "./locales/en-US/agents.json";
import errorsEn from "./locales/en-US/errors.json";
import activityEn from "./locales/en-US/activity.json";

export const defaultNS = "common" as const;

export const resources = {
  "pt-BR": {
    common: commonPt,
    inbox: inboxPt,
    projects: projectsPt,
    settings: settingsPt,
    auth: authPt,
    agents: agentsPt,
    errors: errorsPt,
    activity: activityPt,
  },
  "en-US": {
    common: commonEn,
    inbox: inboxEn,
    projects: projectsEn,
    settings: settingsEn,
    auth: authEn,
    agents: agentsEn,
    errors: errorsEn,
    activity: activityEn,
  },
} as const;

export type SupportedLocale = keyof typeof resources;
export type Namespace = keyof (typeof resources)["pt-BR"];
