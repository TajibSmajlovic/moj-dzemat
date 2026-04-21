import { describe, expect, it } from "vitest";

import { prisma } from "#app/utils/db.server";

import { createPost, createUser } from "../factories";

/**
 * Basic smoke against the Prisma singleton. The singleton applies SQLite
 * PRAGMAs on first connection so these tests also implicitly verify the
 * migration + pragma wiring didn't regress.
 */
describe("db.server", () => {
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
