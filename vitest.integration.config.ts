import { defineConfig } from "vitest/config";

// Integration tests: real Prisma queries against SQLite. SQLite is a
// single writer so we cap workers at 1 and disable file parallelism.
// `globalSetup` migrates the database once per run; `setupFiles` runs per
// test file and truncates every table between tests.
export default defineConfig({
  test: {
    name: "integration",
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    environment: "node",
    globals: true,
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
  },
});
