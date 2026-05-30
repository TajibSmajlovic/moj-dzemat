import { prisma } from "#app/server/db.server";

export async function getAuthPage() {
  const announcement = await prisma.siteAnnouncement.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { message: true },
  });

  return {
    announcement,
  };
}
