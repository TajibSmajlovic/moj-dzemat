import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { prisma } from "#app/server/db.server";

import { createPost, createUser } from "../factories";

/** Basic smoke tests for the Prisma singleton and migrated SQLite schema. */
describe("db.server", () => {
  it("preserves Prisma 6 integer-millisecond DateTime storage", async () => {
    const legacyDate = new Date("2000-01-01T00:00:00.000Z");
    const legacyUserId = randomUUID();

    // Prisma 6 stored SQLite DateTime values as integer Unix milliseconds.
    // Insert that representation directly so this read assertion protects
    // existing production data from adapter-format regressions.
    await prisma.$executeRaw`
      INSERT INTO "User" ("id", "email", "createdAt", "updatedAt")
      VALUES (
        ${legacyUserId},
        ${`${legacyUserId}@example.com`},
        ${legacyDate.getTime()},
        ${legacyDate.getTime()}
      )
    `;

    const legacyUser = await prisma.user.findUniqueOrThrow({
      where: { id: legacyUserId },
    });
    expect(legacyUser.createdAt).toEqual(legacyDate);
    expect(legacyUser.updatedAt).toEqual(legacyDate);

    const writtenDate = new Date("2030-06-15T12:34:56.789Z");
    const writtenUser = await prisma.user.create({
      data: {
        email: `${randomUUID()}@example.com`,
        createdAt: writtenDate,
      },
    });

    const storedRows = await prisma.$queryRaw<
      { createdAt: bigint | number; storageType: string }[]
    >`
      SELECT "createdAt", typeof("createdAt") AS "storageType"
      FROM "User"
      WHERE "id" = ${writtenUser.id}
    `;
    const storedTimestamp = storedRows.at(0);

    expect(storedTimestamp?.storageType).toBe("integer");
    expect(Number(storedTimestamp?.createdAt)).toBe(writtenDate.getTime());
  });

  it("creates and reads a user", async () => {
    const { user } = await createUser();
    const fetched = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fetched?.email).toBe(user.email);
  });

  it("enforces the unique email constraint", async () => {
    const { user } = await createUser();
    await expect(prisma.user.create({ data: { email: user.email } })).rejects.toThrow();
  });

  it("cascades post images when the post is deleted", async () => {
    const { user } = await createUser();
    const post = await createPost({ authorId: user.id });
    await prisma.postImage.create({
      data: {
        postId: post.id,
        contentType: "image/webp",
        data: new Uint8Array([1, 2, 3]),
        byteSize: 3,
      },
    });

    await prisma.post.delete({ where: { id: post.id } });
    const remaining = await prisma.postImage.count({
      where: { postId: post.id },
    });
    expect(remaining).toBe(0);
  });

  it("nullifies authorId when the author is deleted", async () => {
    const { user } = await createUser();
    const post = await createPost({ authorId: user.id });
    await prisma.user.delete({ where: { id: user.id } });

    const after = await prisma.post.findUnique({ where: { id: post.id } });
    expect(after?.authorId).toBeNull();
  });
});
