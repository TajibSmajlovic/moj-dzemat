import { describe, expect, it, vi } from "vitest";

import { hashPassword } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { signResetToken, verifyResetToken } from "#app/utils/reset-token.server";

import { createUser } from "../factories";

describe("reset-token.server", () => {
  it("verifies a fresh token", async () => {
    const { user } = await createUser();
    const row = await prisma.password.findUnique({
      where: { userId: user.id },
    });
    const token = await signResetToken({
      userId: user.id,
      passwordHash: row?.hash ?? null,
    });

    const result = await verifyResetToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.userId).toBe(user.id);
  });

  it("rejects when the password hash has changed (supersession)", async () => {
    const { user } = await createUser();
    const row = await prisma.password.findUnique({
      where: { userId: user.id },
    });
    const token = await signResetToken({
      userId: user.id,
      passwordHash: row?.hash ?? null,
    });

    await prisma.password.update({
      where: { userId: user.id },
      data: { hash: await hashPassword("brand-new-password") },
    });

    const result = await verifyResetToken(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("superseded");
  });

  it("rejects a gibberish token", async () => {
    const result = await verifyResetToken("not.a.jwt");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("rejects an expired token", async () => {
    const { user } = await createUser();
    const row = await prisma.password.findUnique({
      where: { userId: user.id },
    });

    vi.useFakeTimers();
    try {
      const issuedAt = new Date("2026-01-01T00:00:00.000Z");
      vi.setSystemTime(issuedAt);
      const token = await signResetToken({
        userId: user.id,
        passwordHash: row?.hash ?? null,
      });

      vi.setSystemTime(new Date(issuedAt.getTime() + 60 * 60 * 1000 + 1000));
      const result = await verifyResetToken(token);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("expired");
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a token for a deleted user", async () => {
    const { user } = await createUser();
    const token = await signResetToken({
      userId: user.id,
      passwordHash: null,
    });
    await prisma.user.delete({ where: { id: user.id } });

    const result = await verifyResetToken(token);
    expect(result.ok).toBe(false);
  });
});
