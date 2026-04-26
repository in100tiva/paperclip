#!/usr/bin/env tsx
/**
 * pnpm setup — Validação de ambiente para devs novos da equipe DDD.
 *
 * Satisfaz TEAM-03 (Phase 3). Ver
 * .planning/phases/03-workflow-de-equipe-onboarding/03-CONTEXT.md (D-01..D-04)
 * e .planning/phases/03-workflow-de-equipe-onboarding/03-01-PLAN.md.
 *
 * Ordem dos checks (fail-fast):
 *   1. Node >= 20
 *   2. pnpm >= 9.15.4
 *   3. .env.local existe
 *   4. Vars críticas: DATABASE_URL, SUPABASE_DB_URL, BETTER_AUTH_SECRET,
 *      PAPERCLIP_INSTANCE_ID=team-shared (literal)
 *   5. claude CLI no PATH (warning, não fatal)
 *   6. Supabase ping (SELECT 1) via pooler 6543 com prepare:false (createDb)
 *   7. Schema Better Auth (SELECT count(*) FROM "user")
 *
 * Exit codes:
 *   0 — todos os checks obrigatórios passaram (warnings opcionais OK)
 *   1 — qualquer check obrigatório falhou
 *   2 — erro inesperado (uncaught)
 *
 * Uso: `pnpm setup`
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
// Path-relative import: scripts/ não está em workspace; @paperclipai/db
// não resolve do root node_modules. Reusar a factory via path relativo
// preserva o prepare:false auto em pooler 6543 (D-02 ponto 6).
import { createDb } from "../packages/db/src/index.js";

// ANSI colors (sem dependência externa como chalk)
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const REQUIRED_NODE_MAJOR = 20;
const REQUIRED_PNPM_VERSION = "9.15.4";
const REQUIRED_INSTANCE_ID = "team-shared";
const PLACEHOLDER = "TODO_FILL_ME";
const ENV_LOCAL_PATH = resolve(process.cwd(), ".env.local");

const CRITICAL_VARS = [
  "DATABASE_URL",
  "SUPABASE_DB_URL",
  "BETTER_AUTH_SECRET",
  "PAPERCLIP_INSTANCE_ID",
] as const;

type CheckResult = { ok: boolean; fatal: boolean; message: string };

function ok(msg: string): CheckResult {
  return { ok: true, fatal: false, message: msg };
}
function fail(msg: string): CheckResult {
  return { ok: false, fatal: true, message: msg };
}
function warn(msg: string): CheckResult {
  return { ok: false, fatal: false, message: msg };
}

function printCheck(name: string, result: CheckResult): void {
  if (result.ok) {
    process.stdout.write(`${GREEN}✓${RESET} ${name}: ${result.message}\n`);
  } else if (result.fatal) {
    process.stdout.write(`${RED}✗${RESET} ${name}\n  ${result.message}\n`);
  } else {
    process.stdout.write(`${YELLOW}⚠${RESET} ${name}\n  ${result.message}\n`);
  }
}

function checkNodeVersion(): CheckResult {
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= REQUIRED_NODE_MAJOR) {
    return ok(`Node v${process.versions.node}`);
  }
  return fail(
    `Node ${REQUIRED_NODE_MAJOR}+ requerido (atual: v${process.versions.node}). Atualize: https://nodejs.org`,
  );
}

function checkPnpm(): CheckResult {
  try {
    const version = execSync("pnpm --version", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const [maj, min, patch] = version.split(".").map(Number);
    const [rmaj, rmin, rpatch] = REQUIRED_PNPM_VERSION.split(".").map(Number);
    const compatible =
      maj > rmaj ||
      (maj === rmaj && (min > rmin || (min === rmin && patch >= rpatch)));
    if (compatible) {
      return ok(`pnpm ${version}`);
    }
    return fail(
      `pnpm ${REQUIRED_PNPM_VERSION}+ requerido (atual: ${version}). Instale: corepack enable && corepack prepare pnpm@${REQUIRED_PNPM_VERSION} --activate`,
    );
  } catch {
    return fail(
      `pnpm ausente. Instale: corepack enable && corepack prepare pnpm@${REQUIRED_PNPM_VERSION} --activate`,
    );
  }
}

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip aspas opcionais
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function checkEnvLocal(): {
  result: CheckResult;
  env: Record<string, string>;
} {
  if (!existsSync(ENV_LOCAL_PATH)) {
    return {
      result: fail(`.env.local ausente. Rode: cp .env.example .env.local`),
      env: {},
    };
  }
  const env = parseEnvFile(readFileSync(ENV_LOCAL_PATH, "utf8"));
  return { result: ok(".env.local presente"), env };
}

function checkCriticalEnvVars(env: Record<string, string>): CheckResult[] {
  const results: CheckResult[] = [];
  for (const name of CRITICAL_VARS) {
    const value = env[name];
    if (!value) {
      results.push(
        fail(
          `${name} ausente em .env.local. Veja .env.example. Peça os valores no canal interno do time.`,
        ),
      );
      continue;
    }
    if (value.includes(PLACEHOLDER)) {
      results.push(
        fail(
          `${name} contém "${PLACEHOLDER}" (não preenchida). Peça os valores no canal interno do time. Veja .env.example.`,
        ),
      );
      continue;
    }
    if (name === "PAPERCLIP_INSTANCE_ID" && value !== REQUIRED_INSTANCE_ID) {
      results.push(
        fail(
          `PAPERCLIP_INSTANCE_ID deve ser exatamente "${REQUIRED_INSTANCE_ID}" (atual: "${value}"). Sessões não interoperam entre devs com prefixos diferentes. Veja TROUBLESHOOTING.md "Cookie prefix divergente".`,
        ),
      );
      continue;
    }
    results.push(ok(`${name} preenchida`));
  }
  return results;
}

function checkClaudeCli(): CheckResult {
  const cmd = process.platform === "win32" ? "where claude" : "which claude";
  try {
    execSync(cmd, { stdio: ["ignore", "ignore", "ignore"] });
    return ok("claude CLI presente no PATH");
  } catch {
    return warn(
      `claude CLI não encontrado no PATH. Instale: https://docs.claude.com/en/docs/claude-code/setup (aviso, não fatal — você pode continuar sem multi-account na Fase 3).`,
    );
  }
}

type PostgresClient = {
  unsafe: (query: string) => Promise<unknown[]>;
  end: (opts?: { timeout?: number }) => Promise<void>;
};
type ClosableDb = ReturnType<typeof createDb> & {
  $client?: PostgresClient;
};

async function safeEnd(db: ClosableDb): Promise<void> {
  try {
    await db.$client?.end({ timeout: 5 });
  } catch {
    // best-effort — não polui setup com erros de teardown
  }
}

async function pingViaClient(db: ClosableDb, query: string): Promise<void> {
  // Postgres-js client tagged template via .unsafe — evita dependência
  // direta de drizzle-orm/sql no contexto do script (resolução de módulos
  // do scripts/ não inclui drizzle-orm; a factory createDb traz tudo).
  if (!db.$client) {
    throw new Error("createDb não expôs $client (postgres-js handle)");
  }
  await db.$client.unsafe(query);
}

async function checkSupabaseConnection(
  env: Record<string, string>,
): Promise<CheckResult> {
  const url = env.DATABASE_URL;
  if (!url) {
    return fail(
      `DATABASE_URL ausente em .env.local — não é possível pingar Supabase.`,
    );
  }
  // Injetar para createDb se algum código interno checar process.env
  process.env.DATABASE_URL = url;
  let db: ClosableDb | null = null;
  try {
    db = createDb(url) as ClosableDb;
    await pingViaClient(db, "SELECT 1 AS ping");
    await safeEnd(db);
    return ok("Supabase ping OK (pooler 6543, prepare:false)");
  } catch (err) {
    if (db) await safeEnd(db);
    const msg = err instanceof Error ? err.message : String(err);
    return fail(
      `Conexão Supabase falhou: ${msg}. Veja TROUBLESHOOTING.md "Supabase no limite de conexões".`,
    );
  }
}

async function checkBetterAuthSchema(
  env: Record<string, string>,
): Promise<CheckResult> {
  const url = env.DATABASE_URL;
  if (!url) {
    return fail(
      `DATABASE_URL ausente em .env.local — não é possível verificar schema.`,
    );
  }
  let db: ClosableDb | null = null;
  try {
    db = createDb(url) as ClosableDb;
    await pingViaClient(db, 'SELECT count(*)::int AS count FROM "user"');
    await safeEnd(db);
    return ok("Schema Better Auth aplicado (tabela `user` presente)");
  } catch (err) {
    if (db) await safeEnd(db);
    const msg = err instanceof Error ? err.message : String(err);
    return fail(
      `Schema Better Auth não aplicado (${msg}). CI normalmente aplica em merge para main; se você acabou de clonar, aguarde ou peça pull do main no time. Veja TROUBLESHOOTING.md "Schema desatualizado".`,
    );
  }
}

function abort(): never {
  process.stdout.write(
    `\n${RED}Setup interrompido. Corrija os erros acima antes de continuar.${RESET}\n`,
  );
  process.stdout.write(
    `Veja TROUBLESHOOTING.md para guias passo-a-passo.\n\n`,
  );
  process.exit(1);
}

async function main(): Promise<void> {
  process.stdout.write(
    `\n${BOLD}🔧 DDD setup — validando ambiente local...${RESET}\n\n`,
  );

  // 1. Node version
  const nodeResult = checkNodeVersion();
  printCheck("Node version", nodeResult);
  if (!nodeResult.ok && nodeResult.fatal) abort();

  // 2. pnpm version
  const pnpmResult = checkPnpm();
  printCheck("pnpm version", pnpmResult);
  if (!pnpmResult.ok && pnpmResult.fatal) abort();

  // 3. .env.local presence
  const envCheck = checkEnvLocal();
  printCheck(".env.local", envCheck.result);
  if (!envCheck.result.ok) abort();

  // 4. Critical env vars
  let hasFatalVar = false;
  const varResults = checkCriticalEnvVars(envCheck.env);
  for (const r of varResults) {
    printCheck("env var", r);
    if (!r.ok && r.fatal) hasFatalVar = true;
  }
  if (hasFatalVar) abort();

  // 5. claude CLI (warning, não fatal)
  const claudeResult = checkClaudeCli();
  printCheck("claude CLI", claudeResult);

  // 6. Supabase ping
  const supabaseResult = await checkSupabaseConnection(envCheck.env);
  printCheck("Supabase ping", supabaseResult);
  if (!supabaseResult.ok && supabaseResult.fatal) abort();

  // 7. Better Auth schema
  const schemaResult = await checkBetterAuthSchema(envCheck.env);
  printCheck("Better Auth schema", schemaResult);
  if (!schemaResult.ok && schemaResult.fatal) abort();

  process.stdout.write(
    `\n${GREEN}${BOLD}✅ Ambiente OK.${RESET} Próximo passo: ${BOLD}pnpm dev${RESET}\n\n`,
  );
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(
    `\n${RED}Erro inesperado em pnpm setup:${RESET}\n${
      err instanceof Error ? err.stack : String(err)
    }\n`,
  );
  process.exit(2);
});
