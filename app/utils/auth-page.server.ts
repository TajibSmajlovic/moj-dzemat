import { getCurrentUser } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";

export async function getAuthPage(request: Request) {
  const [announcement, currentUser] = await Promise.all([
    prisma.siteAnnouncement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: { message: true },
    }),
    getCurrentUser(request),
  ]);

  return {
    announcement,
    isAdminLoggedIn: currentUser !== null,
  };
}
