import { defineConfig } from "vitest/config";

// Standalone vitest config para o protótipo descartável da Spike Phase 4.
// Necessário porque o vitest.config.ts da raiz declara workspace projects e
// exclui qualquer test fora de packages/server/ui/cli. Conforme D-12: protótipo
// roda standalone via `npx vitest run --config <este arquivo>`, sem integração
// ao runner principal do monorepo.
//
// `esbuild.tsconfigRaw` desativa o tsconfck walk-up (que falha por causa de
// uma referência stale em ./tsconfig.json para `packages/adapters/droid-local`,
// pasta que não existe — pre-existing repo issue, fora do escopo do spike).
export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    root: __dirname,
  },
  esbuild: {
    tsconfigRaw: '{"compilerOptions":{"target":"es2022","module":"esnext","moduleResolution":"bundler"}}',
  },
});
