import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MIN_PASSWORD_LENGTH_MESSAGE } from "#app/features/auth/auth-policy";

vi.mock("#app/features/auth/session.server", () => ({
  commitSession: vi.fn(),
  destroySession: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("#app/server/db.server", () => ({
  prisma: {},
}));

const loggerWarn = vi.fn();
vi.mock("#app/server/logger.server", () => ({
  logger: {
    info: vi.fn(),
    warn: loggerWarn,
  },
}));

function sha1Parts(password: string) {
  const digest = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();

  return {
    prefix: digest.slice(0, 5),
    suffix: digest.slice(5),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  loggerWarn.mockReset();
});

describe("validateNewPassword", () => {
  it("rejects passwords shorter than the shared minimum length", async () => {
    const { validateNewPassword } = await import("#app/features/auth/auth.server");

    await expect(validateNewPassword("short")).resolves.toEqual({ kind: "too-short" });
    expect(MIN_PASSWORD_LENGTH_MESSAGE).toContain("10");
  });

  it("flags a password when HIBP returns the matching SHA-1 suffix", async () => {
    const { validateNewPassword } = await import("#app/features/auth/auth.server");
    const password = "long-enough-password";
    const { prefix, suffix } = sha1Parts(password);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(`ABCDEF:1\r\n${suffix}:42\r\n`, {
        status: 200,
      }),
    );

    await expect(validateNewPassword(password)).resolves.toEqual({ kind: "breached" });
    expect(fetchMock).toHaveBeenCalledWith(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
  });

  it("accepts a long password when HIBP does not return its suffix", async () => {
    const { validateNewPassword } = await import("#app/features/auth/auth.server");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ABCDEF:1\n123456:2\n", {
        status: 200,
      }),
    );

    await expect(validateNewPassword("long-enough-password")).resolves.toBeNull();
  });

  it("fails open when HIBP returns a non-OK response", async () => {
    const { validateNewPassword } = await import("#app/features/auth/auth.server");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));

    await expect(validateNewPassword("long-enough-password")).resolves.toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith({ status: 503 }, "HIBP lookup failed");
  });

  it("fails open when the HIBP lookup throws", async () => {
    const { validateNewPassword } = await import("#app/features/auth/auth.server");
    const error = new Error("network down");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(error);

    await expect(validateNewPassword("long-enough-password")).resolves.toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith({ err: error }, "HIBP lookup threw");
  });
});
