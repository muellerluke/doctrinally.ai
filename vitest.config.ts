import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["./tests/setup.unit.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["./tests/setup.integration.ts"],
          globalSetup: ["./tests/global-setup.ts"],
          // All integration tests share one Postgres container. Serializing
          // within a file avoids TRUNCATE races between tests; workers are
          // still serialized via the single file.
          sequence: { concurrent: false },
          // One worker: we have a single shared DB. Parallel workers would
          // collide on TRUNCATE.
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/lib/actions/**",
        "src/lib/plans.ts",
        "src/lib/usage.ts",
        "src/lib/retrieval.ts",
        "src/app/api/webhooks/stripe/route.ts",
        "src/trigger/jobs/**",
        "src/trigger/utils/chunking.ts",
        "src/trigger/utils/youtube.ts",
        "src/trigger/utils/extract-video-id.ts",
        "src/lib/validations/**",
      ],
      exclude: ["node_modules/**", "tests/**", "**/*.d.ts", ".next/**"],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75,
      },
    },
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
