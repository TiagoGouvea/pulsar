import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/fixture-app/**", "node_modules/**"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    env: { HARNESS_QUIET: "1" },
  },
});
