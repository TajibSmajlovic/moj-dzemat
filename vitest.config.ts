import { defineConfig } from "vitest/config";

/**
 * Root Vitest config. Declares the two projects via absolute
 * config-file paths so Vitest 4 doesn't resolve them relative to the
 * currently-matched spec file's directory (which breaks when only one
 * project is selected via `--project`).
 */
export default defineConfig({
  test: {
    projects: [
      `${import.meta.dirname}/vitest.unit.config.ts`,
      `${import.meta.dirname}/vitest.integration.config.ts`,
    ],
  },
});
