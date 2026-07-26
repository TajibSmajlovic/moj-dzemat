import { afterEach, describe, expect, it, vi } from "vitest";

import { HOUR_MS } from "#app/lib/time";

const BASE_ENV = {
  DATABASE_URL: "file:./unit.db",
  SESSION_SECRET: "test-session-secret-1234",
  PASSWORD_RESET_SECRET: "test-reset-secret-1234",
  HONEYPOT_SECRET: "test-honeypot-secret-1234",
  EMAIL_FROM: "test@dzemat.ba",
  APP_URL: "http://localhost:3000",
} as const;

const MANAGED_KEYS = [...Object.keys(BASE_ENV), "DISABLE_RATE_LIMITING"];
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

function setEnv(overrides: Record<string, string> = {}) {
  Object.assign(process.env, BASE_ENV, overrides);
}

async function importRateLimitModule(overrides: Record<string, string> = {}) {
  vi.resetModules();
  setEnv(overrides);

  return import("#app/server/rate-limit.server");
}

afterEach(() => {
  restoreEnv();
  vi.useRealTimers();
  vi.resetModules();
});

describe("rate-limit.server", () => {
  it("blocks once the limiter exceeds its configured max", async () => {
    const { loginLimiter } = await importRateLimitModule({ DISABLE_RATE_LIMITING: "false" });
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
    const { loginLimiter } = await importRateLimitModule({ DISABLE_RATE_LIMITING: "true" });
    const ip = "203.0.113.11";

    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const result = loginLimiter.check(ip);
      expect(result.ok).toBe(true);
      expect(result.resetInMs).toBe(0);
      expect(result.remaining).toBe(Number.POSITIVE_INFINITY);
    }
  });

  it("uses a separate lower threshold for forgot-password requests", async () => {
    const { forgotPasswordLimiter } = await importRateLimitModule({
      DISABLE_RATE_LIMITING: "false",
    });
    const ip = "203.0.113.12";

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = forgotPasswordLimiter.check(ip);
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(5 - attempt);
    }

    expect(forgotPasswordLimiter.check(ip)).toMatchObject({
      ok: false,
      remaining: 0,
    });
  });

  it("keeps counters isolated by client IP", async () => {
    const { loginLimiter } = await importRateLimitModule({ DISABLE_RATE_LIMITING: "false" });

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      expect(loginLimiter.check("203.0.113.13").ok).toBe(true);
    }

    expect(loginLimiter.check("203.0.113.13").ok).toBe(false);
    expect(loginLimiter.check("203.0.113.14")).toMatchObject({
      ok: true,
      remaining: 9,
    });
  });

  it("opens a fresh window after the limiter reset time passes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T10:00:00.000Z"));
    const { loginLimiter } = await importRateLimitModule({ DISABLE_RATE_LIMITING: "false" });
    const ip = "203.0.113.15";

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      expect(loginLimiter.check(ip).ok).toBe(true);
    }

    expect(loginLimiter.check(ip).ok).toBe(false);

    vi.setSystemTime(new Date("2026-05-22T10:00:00.000Z").getTime() + HOUR_MS + 1);

    expect(loginLimiter.check(ip)).toMatchObject({
      ok: true,
      remaining: 9,
      resetInMs: HOUR_MS,
    });
  });

  it("can reset an individual IP bucket", async () => {
    const { loginLimiter } = await importRateLimitModule({ DISABLE_RATE_LIMITING: "false" });
    const ip = "203.0.113.16";

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      expect(loginLimiter.check(ip).ok).toBe(true);
    }

    expect(loginLimiter.check(ip).ok).toBe(false);

    loginLimiter.reset(ip);

    expect(loginLimiter.check(ip)).toMatchObject({
      ok: true,
      remaining: 9,
    });
  });

  it("extracts the client IP using the same proxy-header precedence everywhere", async () => {
    const { clientIpFromHeaders, getClientIp } = await importRateLimitModule();
    const headers = new Map([
      ["fly-client-ip", "198.51.100.10"],
      ["x-forwarded-for", "198.51.100.20, 198.51.100.21"],
      ["x-real-ip", "198.51.100.30"],
    ]);

    expect(clientIpFromHeaders((name) => headers.get(name))).toBe("198.51.100.10");

    headers.delete("fly-client-ip");
    expect(clientIpFromHeaders((name) => headers.get(name))).toBe("198.51.100.20");

    headers.delete("x-forwarded-for");
    expect(clientIpFromHeaders((name) => headers.get(name))).toBe("198.51.100.30");

    headers.delete("x-real-ip");
    expect(clientIpFromHeaders((name) => headers.get(name))).toBe("unknown");

    expect(
      getClientIp(
        new Request("http://localhost", {
          headers: {
            "fly-client-ip": "203.0.113.100",
          },
        }),
      ),
    ).toBe("203.0.113.100");
  });
});
