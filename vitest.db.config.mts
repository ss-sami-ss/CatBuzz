import path from "node:path";
import { defineConfig } from "vitest/config";

/** Integration tests against the local test database (npm run test:db). Needs npm run infra:up. */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
