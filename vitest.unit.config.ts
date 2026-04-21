import { defineConfig } from "vitest/config";

// Unit tests: pure functions. Parallel by default, no DB access. We
// keep the happy-dom environment so a future component test can opt in
// without reconfiguring.
export default defineConfig({
  test: {
    name: "unit",
    include: ["app/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    environment: "happy-dom",
    globals: true,
  },
});
