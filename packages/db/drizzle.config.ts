import { defineConfig } from "drizzle-kit";

// Drizzle-kit reads schema from compiled output; run `pnpm db:generate` to ensure
// `dist/schema/*.js` is up-to-date before running migrations.
//
// Connection string preference for `pnpm db:migrate`:
//   1. SUPABASE_DB_URL (session pooler 5432) — preferred for DDL (CREATE TYPE, CREATE FUNCTION,
//      cross-schema operations). Supavisor session mode keeps the connection across statements.
//   2. DATABASE_URL (transaction pooler 6543) — fallback. Most DDL works but some operations
//      (CREATE TYPE inside a transaction with prepared statements off) can be flaky.
//
// CI/GitHub Actions should always set SUPABASE_DB_URL.
const url =
  process.env.SUPABASE_DB_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!url) {
  throw new Error(
    "drizzle-kit requires SUPABASE_DB_URL or DATABASE_URL. " +
      "For local dev, ensure `.env.local` is loaded (e.g. `node --env-file=.env.local`). " +
      "See .env.example for the canonical template.",
  );
}

export default defineConfig({
  schema: "./dist/schema/*.js",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
