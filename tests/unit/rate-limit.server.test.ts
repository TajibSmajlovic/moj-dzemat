import { afterEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  DATABASE_URL: "file:./unit.db",
  SESSION_SECRET: "test-session-secret-1234",
  PASSWORD_RESET_SECRET: "test-reset-secret-1234",
  HONEYPOT_SECRET: "test-honeypot-secret-1234",
  EMAIL_FROM: "test@dzemat.ba",
  APP_URL: "http://localhost:3000",
} as const;

async function importRateLimitModule() {
  vi.resetModules();
  return import("#app/server/rate-limit.server");
}

afterEach(() => {
  for (const [key, value] of Object.entries(BASE_ENV)) {
    if (process.env[key] === value) {
      delete process.env[key];
    }
  }
  delete process.env.DISABLE_RATE_LIMITING;
  vi.resetModules();
});

describe("rate-limit.server", () => {
  it("blocks once the limiter exceeds its configured max", async () => {
    Object.assign(process.env, BASE_ENV);
    process.env.DISABLE_RATE_LIMITING = "false";

    const { loginLimiter } = await importRateLimitModule();
    const ip = "203.0.113.10";

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const result = loginLimiter.check(ip);
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(10 - attempt);
    }

    const blocked = loginLimiter.check(ip);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetInMs).toBeGreaterThan(0);
  });

  it("allows requests unconditionally when the test-only bypass is enabled", async () => {
    Object.assign(process.env, BASE_ENV);
    process.env.DISABLE_RATE_LIMITING = "true";

    const { loginLimiter } = await importRateLimitModule();
    const ip = "203.0.113.11";

    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const result = loginLimiter.check(ip);
      expect(result.ok).toBe(true);
      expect(result.resetInMs).toBe(0);
      expect(result.remaining).toBe(Number.POSITIVE_INFINITY);
    }
  });
});
