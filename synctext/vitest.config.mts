import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": root } },
  server: {
    fs: {
      allow: [root],
    },
  },
  test: {
    include: ["tests/auth/**/*.test.ts"],
    environment: "node",
  },
});
