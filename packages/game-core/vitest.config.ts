import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * `@game/data` é consumido como TypeScript-fonte (o `main` do pacote aponta para
 * `src/index.ts`). O alias abaixo garante que o Vitest resolva direto a fonte,
 * sem depender de build.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@game/data": fileURLToPath(
        new URL("../game-data/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
