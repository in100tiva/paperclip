import type { Request, RequestHandler } from "express";
import type { IncomingHttpHeaders } from "node:http";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { toNodeHandler } from "better-auth/node";
import type { Db } from "@paperclipai/db";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
} from "@paperclipai/db";
import type { Config } from "../config.js";
import { resolvePaperclipInstanceId } from "../home-paths.js";

/**
 * Better Auth wiring — Phase 2 (AUTH-01..04).
 *
 * Architecture decisions (per .planning/research/ARCHITECTURE.md):
 *   - Better Auth is preserved in v1 (NOT migrated to Supabase Auth — text-id schema
 *     incompatible with auth.users uuid; migration is HIGH effort with no v1 gain).
 *   - Better Auth runs against the SAME Postgres as the rest of the app (Supabase via
 *     drizzleAdapter). The `db` argument to `createBetterAuthInstance` is created
 *     by `@paperclipai/db`'s `createDb(SUPABASE_URL)` which auto-applies pool config
 *     (`prepare: false` for port 6543, `max: 5`, `idle_timeout: 20`) — see Plan 02-03.
 *
 * Requirement mapping:
 *   AUTH-01: Better Auth functional against Supabase Postgres
 *     → drizzleAdapter(db, { provider: "pg", schema: { user/session/account/verification } })
 *       at line ~105. The `db` injection makes this Supabase-backed transparently.
 *   AUTH-02: Cookie prefix from PAPERCLIP_INSTANCE_ID for shared session across team
 *     → deriveAuthCookiePrefix(instanceId) returns `paperclip-${sanitized(instanceId)}`.
 *       With PAPERCLIP_INSTANCE_ID=team-shared in .env, prefix is `paperclip-team-shared`.
 *   AUTH-03: Mode `authenticated` enforces login on all routes except signup/login
 *     → config.deploymentMode='authenticated' is honored by middleware/auth.ts (NOT this file).
 *   AUTH-04: Email/password signup available
 *     → emailAndPassword: { enabled: true, requireEmailVerification: false } at line ~115.
 *       Disabled by config.authDisableSignUp; off by default.
 *
 * Anti-pattern guards:
 *   - BETTER_AUTH_SECRET MUST be set (line ~91 throws otherwise).
 *   - In dev (HTTP), useSecureCookies is auto-disabled to prevent cookie write failures.
 *   - PAPERCLIP_AGENT_JWT_SECRET is an alias fallback for BETTER_AUTH_SECRET; both refer
 *     to the same signing key.
 *
 * Tests covering this wiring: server/src/__tests__/better-auth-supabase-readiness.test.ts
 */

export type BetterAuthSessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  locale?: "pt-BR" | "en-US" | null;
};

export type BetterAuthSessionResult = {
  session: { id: string; userId: string } | null;
  user: BetterAuthSessionUser | null;
};

type BetterAuthInstance = ReturnType<typeof betterAuth>;

const AUTH_COOKIE_PREFIX_FALLBACK = "default";
const AUTH_COOKIE_PREFIX_INVALID_SEGMENTS_RE = /[^a-zA-Z0-9_-]+/g;

export function deriveAuthCookiePrefix(instanceId = resolvePaperclipInstanceId()): string {
  const scopedInstanceId = instanceId
    .trim()
    .replace(AUTH_COOKIE_PREFIX_INVALID_SEGMENTS_RE, "-")
    .replace(/^-+|-+$/g, "") || AUTH_COOKIE_PREFIX_FALLBACK;
  return `paperclip-${scopedInstanceId}`;
}

export function buildBetterAuthAdvancedOptions(input: { disableSecureCookies: boolean }) {
  return {
    cookiePrefix: deriveAuthCookiePrefix(),
    ...(input.disableSecureCookies ? { useSecureCookies: false } : {}),
  };
}

function headersFromNodeHeaders(rawHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, raw] of Object.entries(rawHeaders)) {
    if (!raw) continue;
    if (Array.isArray(raw)) {
      for (const value of raw) headers.append(key, value);
      continue;
    }
    headers.set(key, raw);
  }
  return headers;
}

function headersFromExpressRequest(req: Request): Headers {
  return headersFromNodeHeaders(req.headers);
}

export function deriveAuthTrustedOrigins(config: Config): string[] {
  const baseUrl = config.authBaseUrlMode === "explicit" ? config.authPublicBaseUrl : undefined;
  const trustedOrigins = new Set<string>();

  if (baseUrl) {
    try {
      trustedOrigins.add(new URL(baseUrl).origin);
    } catch {
      // Better Auth will surface invalid base URL separately.
    }
  }
  if (config.deploymentMode === "authenticated") {
    for (const hostname of config.allowedHostnames) {
      const trimmed = hostname.trim().toLowerCase();
      if (!trimmed) continue;
      trustedOrigins.add(`https://${trimmed}`);
      trustedOrigins.add(`http://${trimmed}`);
    }
  }

  return Array.from(trustedOrigins);
}

export function createBetterAuthInstance(db: Db, config: Config, trustedOrigins?: string[]): BetterAuthInstance {
  const baseUrl = config.authBaseUrlMode === "explicit" ? config.authPublicBaseUrl : undefined;
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.PAPERCLIP_AGENT_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET (or PAPERCLIP_AGENT_JWT_SECRET) must be set. " +
      "For local development, set BETTER_AUTH_SECRET=paperclip-dev-secret in your .env file.",
    );
  }
  const effectiveTrustedOrigins = trustedOrigins ?? deriveAuthTrustedOrigins(config);

  const publicUrl = process.env.PAPERCLIP_PUBLIC_URL ?? baseUrl;
  const isHttpOnly = publicUrl ? publicUrl.startsWith("http://") : false;

  const authConfig = {
    baseURL: baseUrl,
    secret,
    trustedOrigins: effectiveTrustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
      },
    }),
    user: {
      additionalFields: {
        locale: { type: "string" as const, required: false, defaultValue: "pt-BR" },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      disableSignUp: config.authDisableSignUp,
    },
    advanced: buildBetterAuthAdvancedOptions({ disableSecureCookies: isHttpOnly }),
  };

  if (!baseUrl) {
    delete (authConfig as { baseURL?: string }).baseURL;
  }

  return betterAuth(authConfig);
}

export function createBetterAuthHandler(auth: BetterAuthInstance): RequestHandler {
  const handler = toNodeHandler(auth);
  return (req, res, next) => {
    void Promise.resolve(handler(req, res)).catch(next);
  };
}

export async function resolveBetterAuthSessionFromHeaders(
  auth: BetterAuthInstance,
  headers: Headers,
): Promise<BetterAuthSessionResult | null> {
  const api = (auth as unknown as { api?: { getSession?: (input: unknown) => Promise<unknown> } }).api;
  if (!api?.getSession) return null;

  const sessionValue = await api.getSession({
    headers,
  });
  if (!sessionValue || typeof sessionValue !== "object") return null;

  const value = sessionValue as {
    session?: { id?: string; userId?: string } | null;
    user?: { id?: string; email?: string | null; name?: string | null; locale?: string | null } | null;
  };
  const session = value.session?.id && value.session.userId
    ? { id: value.session.id, userId: value.session.userId }
    : null;
  const user = value.user?.id
    ? {
        id: value.user.id,
        email: value.user.email ?? null,
        name: value.user.name ?? null,
        locale: ((value.user as { locale?: string }).locale as "pt-BR" | "en-US" | null) ?? null,
      }
    : null;

  if (!session || !user) return null;
  return { session, user };
}

export async function resolveBetterAuthSession(
  auth: BetterAuthInstance,
  req: Request,
): Promise<BetterAuthSessionResult | null> {
  return resolveBetterAuthSessionFromHeaders(auth, headersFromExpressRequest(req));
}
