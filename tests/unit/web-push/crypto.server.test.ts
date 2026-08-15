import { afterEach, describe, expect, it, vi } from "vitest";

const MANAGED_KEYS = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "PASSWORD_RESET_SECRET",
  "HONEYPOT_SECRET",
  "EMAIL_FROM",
  "APP_URL",
  "WEB_PUSH_ENABLED",
  "WEB_PUSH_VAPID_PUBLIC_KEY",
  "WEB_PUSH_VAPID_PRIVATE_KEY",
  "WEB_PUSH_ENCRYPTION_KEYS",
] as const;
const ORIGINAL_VALUES = new Map(MANAGED_KEYS.map((key) => [key, process.env[key]]));

function setBaseEnv(key = Buffer.alloc(32, 7).toString("base64url")) {
  Object.assign(process.env, {
    DATABASE_URL: "file:./unit.db",
    SESSION_SECRET: "test-session-secret-1234",
    PASSWORD_RESET_SECRET: "test-reset-secret-1234",
    HONEYPOT_SECRET: "test-honeypot-secret-1234",
    EMAIL_FROM: "test@example.com",
    APP_URL: "http://localhost:3000",
    WEB_PUSH_ENABLED: "false",
    WEB_PUSH_ENCRYPTION_KEYS: key,
  });
}

async function importCrypto() {
  vi.resetModules();
  return import("#app/features/web-push/crypto.server");
}

afterEach(() => {
  for (const key of MANAGED_KEYS) {
    const original = ORIGINAL_VALUES.get(key);
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
  vi.resetModules();
});

describe("Web Push subscription encryption", () => {
  const subscription = {
    endpoint: "https://push.example.com/send/secret",
    p256dh: "public-key",
    auth: "auth-secret",
  };

  it("round-trips the complete subscription without exposing it in clear text", async () => {
    setBaseEnv();
    const { decryptSubscription, encryptSubscription } = await importCrypto();
    const encrypted = await encryptSubscription(subscription);

    expect(encrypted).not.toContain(subscription.endpoint);
    expect(encrypted).not.toContain(subscription.auth);
    expect(encrypted.split(".")).toHaveLength(5);
    await expect(decryptSubscription(encrypted)).resolves.toEqual({
      subscription,
      needsReencryption: false,
    });
  });

  it("uses a fresh AES-GCM nonce for every write", async () => {
    setBaseEnv();
    const { encryptSubscription } = await importCrypto();
    const first = await encryptSubscription(subscription);
    const second = await encryptSubscription(subscription);

    expect(first).not.toBe(second);
  });

  it("reads with an older key and requests re-encryption with the primary key", async () => {
    const oldKey = Buffer.alloc(32, 3).toString("base64url");
    const newKey = Buffer.alloc(32, 4).toString("base64url");
    setBaseEnv(oldKey);
    const oldCrypto = await importCrypto();
    const encrypted = await oldCrypto.encryptSubscription(subscription);

    process.env.WEB_PUSH_ENCRYPTION_KEYS = `${newKey},${oldKey}`;
    const rotatedCrypto = await importCrypto();
    await expect(rotatedCrypto.decryptSubscription(encrypted)).resolves.toEqual({
      subscription,
      needsReencryption: true,
    });
  });

  it("creates a stable versioned one-way endpoint hash", async () => {
    setBaseEnv();
    const { endpointHash } = await importCrypto();

    expect(endpointHash(subscription.endpoint)).toMatch(/^v1:[A-Za-z0-9_-]{43}$/);
    expect(endpointHash(subscription.endpoint)).toBe(endpointHash(subscription.endpoint));
    expect(endpointHash(subscription.endpoint)).not.toContain("push.example.com");
  });
});
