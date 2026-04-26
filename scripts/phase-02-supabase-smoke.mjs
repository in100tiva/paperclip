#!/usr/bin/env node
// Phase 2 (Migração Supabase) E2E smoke test.
// Prerequisites:
//   - .env.local must be loaded (run with `node --env-file=.env.local scripts/phase-02-supabase-smoke.mjs`)
//   - `pnpm dev` (or `pnpm dev:once`) must be running in a separate terminal — THIS script does NOT start the server
//   - Server should be at http://localhost:3100 (or PORT from env)
//
// Flow:
//   1. GET /api/health — confirm server is up and reachable
//   2. POST /api/auth/sign-up/email — create user A
//   3. GET /api/auth/get-session — confirm cookie session works
//   4. GET /api/companies — confirm authenticated request returns data
//   5. Verify user row exists in Supabase (direct SQL query)
//   6. POST /api/auth/sign-up/email — create user B (different email)
//   7. Verify both users in Supabase
//
// Outputs structured JSON to stdout for the SMOKE-TEST-LOG.md to consume.

import { writeFileSync } from "node:fs";

const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:3100";
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!SUPABASE_DB_URL) {
  console.error("ERROR: SUPABASE_DB_URL not set in env. Load .env.local first.");
  process.exit(1);
}

const log = (step, status, data) => {
  const entry = { ts: new Date().toISOString(), step, status, data };
  console.log(JSON.stringify(entry));
  return entry;
};

const TIMESTAMP = Date.now();
const USER_A = { email: `smoke-a-${TIMESTAMP}@ddd.test`, password: "TestPass123!@#", name: `Smoke A ${TIMESTAMP}` };
const USER_B = { email: `smoke-b-${TIMESTAMP}@ddd.test`, password: "TestPass123!@#", name: `Smoke B ${TIMESTAMP}` };

const results = [];

async function main() {
  // Step 1: Health check
  try {
    const r = await fetch(`${SERVER_URL}/api/health`);
    const body = await r.text();
    results.push(log("health", r.ok ? "pass" : "fail", { status: r.status, body: body.slice(0, 200) }));
    if (!r.ok) throw new Error(`Health check failed: ${r.status}`);
  } catch (e) {
    results.push(log("health", "fail", { error: String(e) }));
    process.exit(2);
  }

  // Step 2: Signup user A
  let cookieA = null;
  try {
    const r = await fetch(`${SERVER_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(USER_A),
    });
    const body = await r.json().catch(() => ({}));
    cookieA = r.headers.get("set-cookie");
    results.push(log("signup-a", r.ok ? "pass" : "fail", {
      status: r.status,
      cookie_set: !!cookieA,
      cookie_prefix_match: cookieA?.includes("paperclip-team-shared") ?? false,
      body: body,
    }));
    if (!r.ok || !cookieA) throw new Error(`Signup A failed: ${r.status}`);
  } catch (e) {
    results.push(log("signup-a", "fail", { error: String(e) }));
    process.exit(3);
  }

  // Step 3: Get session with cookie
  try {
    const r = await fetch(`${SERVER_URL}/api/auth/get-session`, { headers: { cookie: cookieA } });
    const body = await r.json().catch(() => ({}));
    results.push(log("get-session", r.ok && body?.user?.email === USER_A.email ? "pass" : "fail", {
      status: r.status,
      user_email_matches: body?.user?.email === USER_A.email,
      body: body,
    }));
  } catch (e) {
    results.push(log("get-session", "fail", { error: String(e) }));
  }

  // Step 4: Authenticated GET /api/companies
  try {
    const r = await fetch(`${SERVER_URL}/api/companies`, { headers: { cookie: cookieA } });
    const body = await r.json().catch(() => null);
    results.push(log("get-companies", r.ok ? "pass" : "fail", {
      status: r.status,
      count: Array.isArray(body) ? body.length : null,
      first_company_id: Array.isArray(body) && body[0] ? body[0].id : null,
    }));
  } catch (e) {
    results.push(log("get-companies", "fail", { error: String(e) }));
  }

  // Step 5: Verify user row in Supabase
  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(SUPABASE_DB_URL, { max: 1, prepare: false });
    const rows = await sql`SELECT email, name FROM "user" WHERE email = ${USER_A.email}`;
    await sql.end();
    results.push(log("supabase-user-a", rows.length === 1 ? "pass" : "fail", {
      found_count: rows.length,
      row: rows[0] ?? null,
    }));
  } catch (e) {
    results.push(log("supabase-user-a", "fail", { error: String(e) }));
  }

  // Step 6: Signup user B
  let cookieB = null;
  try {
    const r = await fetch(`${SERVER_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(USER_B),
    });
    cookieB = r.headers.get("set-cookie");
    results.push(log("signup-b", r.ok ? "pass" : "fail", { status: r.status, cookie_set: !!cookieB }));
  } catch (e) {
    results.push(log("signup-b", "fail", { error: String(e) }));
  }

  // Step 7: Both users present in Supabase
  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(SUPABASE_DB_URL, { max: 1, prepare: false });
    const rows = await sql`SELECT email FROM "user" WHERE email IN (${USER_A.email}, ${USER_B.email})`;
    await sql.end();
    results.push(log("supabase-both-users", rows.length === 2 ? "pass" : "fail", {
      found_count: rows.length,
      emails: rows.map(r => r.email),
    }));
  } catch (e) {
    results.push(log("supabase-both-users", "fail", { error: String(e) }));
  }

  // Final summary
  const passes = results.filter(r => r.status === "pass").length;
  const fails = results.filter(r => r.status === "fail").length;
  const summary = {
    total_steps: results.length,
    passes,
    fails,
    overall: fails === 0 ? "PASS" : "FAIL",
    user_a_email: USER_A.email,
    user_b_email: USER_B.email,
    timestamp: new Date().toISOString(),
  };

  // Write JSON output for SMOKE-TEST-LOG.md to consume
  const outPath = ".planning/phases/02-migra-o-de-storage-para-supabase/smoke-test-results.json";
  writeFileSync(outPath, JSON.stringify({ summary, results }, null, 2));
  console.log("\n=== SMOKE TEST RESULT ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nFull results: ${outPath}`);

  process.exit(fails === 0 ? 0 : 1);
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(99);
});
