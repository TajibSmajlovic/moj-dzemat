import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.INTERNAL_PORT ?? "3000";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "**/pwa/**",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // This suite runs against a production build, which registers the service
    // worker. Blocking it keeps the extra fetch-interception layer out of these
    // tests; the focused suite in `tests/e2e/pwa` owns that behaviour.
    serviceWorkers: "block",
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
    // Start the app for e2e with test env overrides (.env base, e2e DB, test
    // routes). `NODE_ENV=test` serves the `npm run build:e2e` artifact rather
    // than the Vite dev server, so no test pays for on-demand dependency
    // optimisation. It cannot be `production`, because the environment schema
    // rejects the test-only flags below in that environment.
    command: "npx tsx --env-file=.env server/index.ts",
    url: `http://localhost:${PORT}/resources/healthcheck`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: "test",
      ENABLE_TEST_ROUTES: "true",
      HONEYPOT_SKIP_MIN_AGE: "true",
      DISABLE_RATE_LIMITING: "true",
      DATABASE_URL: "file:./e2e.db",
      DZEMAT_NAME: "Donje Mostre",
      DZEMAT_ADDRESS: "Džamija Donje Moštre, R445, Donje Moštre, Visoko, Bosna i Hercegovina",
      DZEMAT_MAP_QUERY: "Džamija Donje Moštre, R445, Visoko, Bosna i Hercegovina",
      FACEBOOK_PAGE_URL: "https://www.facebook.com/profile.php?id=100085095166223",
      YOUTUBE_CHANNEL_URL: "https://www.youtube.com/@DzematDonjeMostre",
      PORT,
    },
  },
});
