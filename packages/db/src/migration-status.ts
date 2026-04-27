import { inspectMigrations } from "./client.js";
import { resolveMigrationConnection } from "./migration-runtime.js";

const jsonMode = process.argv.includes("--json");

function toError(error: unknown, context = "Migration status check failed"): Error {
  if (error instanceof Error) return error;
  if (error === undefined) return new Error(context);
  if (typeof error === "string") return new Error(`${context}: ${error}`);

  try {
    return new Error(`${context}: ${JSON.stringify(error)}`);
  } catch {
    return new Error(`${context}: ${String(error)}`);
  }
}

async function main(): Promise<void> {
  const connection = await resolveMigrationConnection();

  try {
    const state = await inspectMigrations(connection.connectionString);
    const payload =
      state.status === "upToDate"
        ? {
            source: connection.source,
            status: "upToDate" as const,
            tableCount: state.tableCount,
            pendingMigrations: [] as string[],
          }
        : {
            source: connection.source,
            status: "needsMigrations" as const,
            tableCount: state.tableCount,
            pendingMigrations: state.pendingMigrations,
            reason: state.reason,
          };

    if (jsonMode) {
      console.log(JSON.stringify(payload));
      return;
    }

    if (payload.status === "upToDate") {
      console.log(`Database is up to date via ${payload.source}`);
      return;
    }

    console.log(
      `Pending migrations via ${payload.source}: ${payload.pendingMigrations.join(", ")}`,
    );
  } finally {
    await connection.stop();
  }
}

// postgres-js can emit a late ErrorResponse on a socket *after* main() has
// already settled (e.g., a query was awaited successfully but the server then
// reports a deferred statement_timeout cancellation, or pool teardown races
// the socket). Without this guard the late rejection escapes and crashes the
// process with `node:internal/process/promises:394 triggerUncaughtException`,
// which the dev-runner surfaces as a fatal startup failure.
let mainSettled = false;
process.on("unhandledRejection", (reason) => {
  if (!mainSettled) {
    const err = toError(reason, "Migration status check failed");
    process.stderr.write(`${err.stack ?? err.message}\n`);
    process.exit(1);
  }
  // After main settled, swallow late socket errors — they are not actionable.
});

main()
  .catch((error) => {
    mainSettled = true;
    const err = toError(error, "Migration status check failed");
    process.stderr.write(`${err.stack ?? err.message}\n`);
    process.exit(1);
  })
  .finally(() => {
    mainSettled = true;
  });
