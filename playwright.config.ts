import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.INTERNAL_PORT ?? "3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  webServer: {
    // Boot the dev server so the session cookie stays non-secure on
    // http://localhost. The app reads base secrets from `.env`; the
    // overrides below redirect to the dedicated e2e DB and turn on the
    // /dev/* helpers.
    command: "npm run dev",
    url: `http://localhost:${PORT}/resources/healthcheck`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ENABLE_TEST_ROUTES: "true",
      HONEYPOT_SKIP_MIN_AGE: "true",
      DATABASE_URL: "file:./e2e.db",
      DZEMAT_NAME: "Donje Mostre",
      PORT,
    },
  },
});
