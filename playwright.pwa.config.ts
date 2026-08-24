/// <reference types="node" />

import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

import { requiredEnvironment } from "./tests/e2e/utils/environment";

const port = requiredEnvironment("PWA_TEST_PORT");
const temporaryDirectory = requiredEnvironment("PWA_TEST_TEMP_DIR");
const baseURL = `http://127.0.0.1:${port}`;

if (process.env.NODE_ENV !== "production") {
  throw new Error("The focused PWA suite must run against NODE_ENV=production.");
}

if (process.env.APP_URL !== baseURL) {
  throw new Error("APP_URL must match the isolated PWA test server origin.");
}

for (const flag of [
  "ENABLE_TEST_ROUTES",
  "HONEYPOT_SKIP_MIN_AGE",
  "DISABLE_RATE_LIMITING",
] as const) {
  if (process.env[flag] !== "false") {
    throw new Error(`${flag} must be false in the focused PWA suite.`);
  }
}

const serverEnvironment = Object.fromEntries(
  [
    "NODE_ENV",
    "DATABASE_URL",
    "SESSION_SECRET",
    "PASSWORD_RESET_SECRET",
    "HONEYPOT_SECRET",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "DZEMAT_NAME",
    "DZEMAT_ADDRESS",
    "DZEMAT_MAP_QUERY",
    "FACEBOOK_PAGE_URL",
    "YOUTUBE_CHANNEL_URL",
    "CLOUDFLARE_WEB_ANALYTICS_TOKEN",
    "APP_URL",
    "PORT",
    "ENABLE_TEST_ROUTES",
    "HONEYPOT_SKIP_MIN_AGE",
    "DISABLE_RATE_LIMITING",
  ].map((name) => [name, requiredEnvironment(name)]),
);

export default defineConfig({
  testDir: "./tests/e2e/pwa",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-pwa-report" }]]
    : "list",
  outputDir: process.env.CI
    ? path.resolve("test-results/pwa")
    : path.join(temporaryDirectory, "test-results"),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-pwa-production",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm start",
    url: `${baseURL}/resources/healthcheck`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: serverEnvironment,
  },
});
