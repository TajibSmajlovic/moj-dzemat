import { afterEach, describe, expect, it, vi } from "vitest";

import { HONEYPOT_FIELD, HONEYPOT_TIMESTAMP_FIELD } from "#app/lib/honeypot";

const BASE_ENV = {
  NODE_ENV: "test",
  DATABASE_URL: "file:./unit.db",
  SESSION_SECRET: "test-session-secret-1234",
  PASSWORD_RESET_SECRET: "test-reset-secret-1234",
  HONEYPOT_SECRET: "test-honeypot-secret-1234",
  EMAIL_FROM: "test@dzemat.ba",
  APP_URL: "http://localhost:3000",
  ENABLE_TEST_ROUTES: "false",
  HONEYPOT_SKIP_MIN_AGE: "false",
  DISABLE_RATE_LIMITING: "false",
} as const;

const MANAGED_KEYS = Object.keys(BASE_ENV);
const ORIGINAL_VALUES = new Map(MANAGED_KEYS.map((key) => [key, process.env[key]]));
const NOW = new Date("2026-05-22T10:00:00.000Z");

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

async function importHoneypotModule(
  overrides: Partial<Record<keyof typeof BASE_ENV, string>> = {},
) {
  vi.resetModules();
  setEnv(overrides);

  return import("#app/server/honeypot.server");
}

function formDataFromToken(token: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(token)) {
    formData.set(key, value);
  }

  return formData;
}

function expectInvalidSubmission(fn: VoidFunction) {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(Response);
  expect((thrown as Response).status).toBe(400);
}

afterEach(() => {
  vi.useRealTimers();
  restoreEnv();
  vi.resetModules();
});

describe("honeypot.server", () => {
  it("accepts an empty honeypot field with a valid aged timestamp token", async () => {
    const { assertHoneypot, honeypotToken } = await importHoneypotModule();

    vi.useFakeTimers();
    vi.setSystemTime(NOW.getTime() - 600);
    const token = honeypotToken();
    vi.setSystemTime(NOW);

    expect(() => assertHoneypot(formDataFromToken(token))).not.toThrow();
  });

  it("rejects a filled honeypot field", async () => {
    const { assertHoneypot, honeypotToken } = await importHoneypotModule();

    vi.useFakeTimers();
    vi.setSystemTime(NOW.getTime() - 600);
    const token = honeypotToken();
    vi.setSystemTime(NOW);

    const formData = formDataFromToken(token);
    formData.set(HONEYPOT_FIELD, "https://spam.example");

    expectInvalidSubmission(() => assertHoneypot(formData));
  });

  it("rejects a missing timestamp token", async () => {
    const { assertHoneypot } = await importHoneypotModule();
    const formData = new FormData();
    formData.set(HONEYPOT_FIELD, "");

    expectInvalidSubmission(() => assertHoneypot(formData));
  });

  it("rejects a tampered timestamp signature", async () => {
    const { assertHoneypot, honeypotToken } = await importHoneypotModule();

    vi.useFakeTimers();
    vi.setSystemTime(NOW.getTime() - 600);
    const token = honeypotToken();
    vi.setSystemTime(NOW);

    const formData = formDataFromToken(token);
    const original = formData.get(HONEYPOT_TIMESTAMP_FIELD);
    if (typeof original !== "string") {
      throw new TypeError("expected honeypot timestamp token");
    }
    formData.set(HONEYPOT_TIMESTAMP_FIELD, `${original}tampered`);

    expectInvalidSubmission(() => assertHoneypot(formData));
  });

  it("rejects a signature with the wrong length without crashing", async () => {
    const { assertHoneypot, honeypotToken } = await importHoneypotModule();

    vi.useFakeTimers();
    vi.setSystemTime(NOW.getTime() - 600);
    const token = honeypotToken();
    vi.setSystemTime(NOW);

    const formData = formDataFromToken(token);
    const timestampToken = formData.get(HONEYPOT_TIMESTAMP_FIELD);
    if (typeof timestampToken !== "string") {
      throw new TypeError("expected honeypot timestamp token");
    }
    const timestamp = timestampToken.split(".")[0] ?? "";
    formData.set(HONEYPOT_TIMESTAMP_FIELD, `${timestamp}.short`);

    expectInvalidSubmission(() => assertHoneypot(formData));
  });

  it("rejects tokens submitted too quickly", async () => {
    const { assertHoneypot, honeypotToken } = await importHoneypotModule();

    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const token = honeypotToken();

    expectInvalidSubmission(() => assertHoneypot(formDataFromToken(token)));
  });

  it("allows too-fast submissions when the test-only min-age bypass is enabled", async () => {
    const { assertHoneypot, honeypotToken } = await importHoneypotModule({
      HONEYPOT_SKIP_MIN_AGE: "true",
    });

    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const token = honeypotToken();

    expect(() => assertHoneypot(formDataFromToken(token))).not.toThrow();
  });

  it("rejects tokens older than the maximum age", async () => {
    const { assertHoneypot, honeypotToken } = await importHoneypotModule();

    vi.useFakeTimers();
    vi.setSystemTime(NOW.getTime() - 16 * 60 * 1000);
    const token = honeypotToken();
    vi.setSystemTime(NOW);

    expectInvalidSubmission(() => assertHoneypot(formDataFromToken(token)));
  });
});
