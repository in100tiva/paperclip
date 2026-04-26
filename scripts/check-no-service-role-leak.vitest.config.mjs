// Minimal vitest config for the standalone check-no-service-role-leak test suite.
// Bypasses the root workspace projects (which would otherwise spawn vitest in
// every workspace package) and runs only this single test file.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/check-no-service-role-leak.test.mjs"],
    root: process.cwd(),
  },
});
