// Minimal vitest config for the standalone sync-agents mapping test suite.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/sync-agents/mapping.test.ts'],
    root: process.cwd(),
    environment: 'node',
    typecheck: {
      tsconfig: './scripts/sync-agents/tsconfig.json',
    },
  },
});
