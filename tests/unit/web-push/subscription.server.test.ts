// @vitest-environment node

import { createECDH } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

beforeEach(() => {
  process.env.DATABASE_URL = "file:./unit.db";
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL_DATABASE_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
  vi.resetModules();
});

describe("Web Push subscription validation", () => {
  it("accepts public addresses and rejects private, local, and documentation ranges", async () => {
    const { isPublicIpAddress } = await import("#app/features/web-push/subscription.server");

    expect(isPublicIpAddress("8.8.8.8")).toBe(true);
    expect(isPublicIpAddress("2606:4700:4700::1111")).toBe(true);
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "169.254.1.1",
      "192.168.1.1",
      "192.0.2.1",
      "192.52.193.1",
      "192.175.48.1",
      "::1",
      "fc00::1",
      "fe80::1",
      "2001:db8::1",
      "64:ff9b::808:808",
      "2001::1",
      "2002:0808:0808::1",
      "::ffff:192.168.1.1",
    ]) {
      expect(isPublicIpAddress(address), address).toBe(false);
    }
  });

  it("rejects mixed public and private DNS answers", async () => {
    const { validateAndResolveEndpoint } =
      await import("#app/features/web-push/subscription.server");

    await expect(
      validateAndResolveEndpoint("https://push.example.com/send/id", () =>
        Promise.resolve([
          { address: "8.8.8.8", family: 4 },
          { address: "127.0.0.1", family: 4 },
        ]),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("requires HTTPS port 443 without credentials or fragments", async () => {
    const { validateAndResolveEndpoint } =
      await import("#app/features/web-push/subscription.server");
    await expect(
      validateAndResolveEndpoint("http://push.example.com", resolvePublicAddress),
    ).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      validateAndResolveEndpoint("https://user@push.example.com", resolvePublicAddress),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateAndResolveEndpoint("https://push.example.com:8443/send", resolvePublicAddress),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("validates browser key lengths and expiration", async () => {
    const { parseBrowserSubscription } = await import("#app/features/web-push/subscription.server");
    const now = new Date("2026-08-09T12:00:00.000Z");
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.alloc(32, 1));
    const valid = {
      endpoint: "https://push.example.com/send/id",
      expirationTime: now.getTime() + 60_000,
      keys: {
        p256dh: ecdh.getPublicKey().toString("base64url"),
        auth: Buffer.alloc(16).toString("base64url"),
      },
    };

    expect(parseBrowserSubscription(valid, now)).toMatchObject({ endpoint: valid.endpoint });
    expect(() =>
      parseBrowserSubscription(
        { ...valid, keys: { ...valid.keys, auth: Buffer.alloc(15).toString("base64url") } },
        now,
      ),
    ).toThrow();
    expect(() =>
      parseBrowserSubscription({ ...valid, expirationTime: now.getTime() }, now),
    ).toThrow();
    expect(() =>
      parseBrowserSubscription(
        {
          ...valid,
          keys: {
            ...valid.keys,
            p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"),
          },
        },
        now,
      ),
    ).toThrow();
  });

  it("enforces exact origin and the streamed 16 KiB limit", async () => {
    const { readLimitedJson, requireExactOrigin } =
      await import("#app/features/web-push/subscription.server");
    const validRequest = new Request("https://dzemat.example/resources/web-push/subscription", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Origin: "https://dzemat.example" },
      body: JSON.stringify({ ok: true }),
    });

    expect(() => requireExactOrigin(validRequest)).not.toThrow();
    await expect(readLimitedJson(validRequest)).resolves.toEqual({ ok: true });

    const oversized = new Request("https://dzemat.example/resources/web-push/subscription", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(17 * 1024) }),
    });
    await expect(readLimitedJson(oversized)).rejects.toMatchObject({ status: 413 });
  });
});

function resolvePublicAddress() {
  return Promise.resolve([{ address: "8.8.8.8", family: 4 as const }]);
}
