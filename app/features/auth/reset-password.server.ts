import { Prisma } from "#generated/prisma/client";

import { prisma } from "#app/server/db.server";

/** A losing reset must not overwrite the winner's password or revoke its session. */
export async function resetPassword({
  userId,
  passwordUpdatedAt,
  hash,
}: {
  userId: string;
  passwordUpdatedAt: Date | null;
  hash: string;
}): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      if (passwordUpdatedAt === null) {
        await tx.password.create({ data: { userId, hash } });
      } else {
        const changed = await tx.password.updateMany({
          where: { userId, updatedAt: passwordUpdatedAt },
          data: {
            hash,
            // Even two writes in one clock tick must have different reset versions.
            updatedAt: new Date(Math.max(Date.now(), passwordUpdatedAt.getTime() + 1)),
          },
        });
        if (changed.count === 0) return false;
      }
      await tx.session.deleteMany({ where: { userId } });
      return true;
    });
  } catch (error) {
    if (
      passwordUpdatedAt === null &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false;
    }
    throw error;
  }
}
