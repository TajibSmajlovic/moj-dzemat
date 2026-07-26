import { afterEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  NODE_ENV: "development",
  DATABASE_URL: "file:./unit.db",
  SESSION_SECRET: "test-session-secret-1234",
  PASSWORD_RESET_SECRET: "test-reset-secret-1234",
  HONEYPOT_SECRET: "test-honeypot-secret-1234",
  RESEND_API_KEY: "",
  EMAIL_FROM: "Moj Dzemat <noreply@example.com>",
  APP_URL: "http://localhost:3000",
  ENABLE_TEST_ROUTES: "false",
  HONEYPOT_SKIP_MIN_AGE: "false",
  DISABLE_RATE_LIMITING: "false",
} as const;

const MANAGED_KEYS = Object.keys(BASE_ENV);
const ORIGINAL_VALUES = new Map(MANAGED_KEYS.map((key) => [key, process.env[key]]));

function restoreEnv() {
  for (const key of MANAGED_KEYS) {
    const original = ORIGINAL_VALUES.get(key);
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
}

function setEnv(overrides: Partial<Record<keyof typeof BASE_ENV, string>> = {}) {
  Object.assign(process.env, BASE_ENV, overrides);
}

async function importEnvModule() {
  vi.resetModules();
  return import("#app/server/env.server");
}

afterEach(() => {
  restoreEnv();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("env.server", () => {
  it("allows local development without a Resend API key", async () => {
    setEnv();

    const { env } = await importEnvModule();

    expect(env().NODE_ENV).toBe("development");
    expect(env().RESEND_API_KEY).toBeUndefined();
  });

  it("requires Resend in production so email does not silently fall back to memory", async () => {
    setEnv({ NODE_ENV: "production", RESEND_API_KEY: "" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { env } = await importEnvModule();

    expect(() => env()).toThrow("Invalid environment variables");
  });

  it("rejects test-only flags in production", async () => {
    setEnv({
      NODE_ENV: "production",
      RESEND_API_KEY: "re_test_123",
      DISABLE_RATE_LIMITING: "true",
      ENABLE_TEST_ROUTES: "true",
      HONEYPOT_SKIP_MIN_AGE: "true",
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { env } = await importEnvModule();

    expect(() => env()).toThrow("Invalid environment variables");
  });

  it("accepts production env when email is configured and test bypasses are disabled", async () => {
    setEnv({ NODE_ENV: "production", RESEND_API_KEY: "re_test_123" });

    const { env } = await importEnvModule();

    expect(env().NODE_ENV).toBe("production");
    expect(env().RESEND_API_KEY).toBe("re_test_123");
    expect(env().ENABLE_TEST_ROUTES).toBe(false);
    expect(env().HONEYPOT_SKIP_MIN_AGE).toBe(false);
    expect(env().DISABLE_RATE_LIMITING).toBe(false);
  });
});
