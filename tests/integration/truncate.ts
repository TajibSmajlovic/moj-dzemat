/**
   Empty every table in the integration database.

   Shared by the once-per-run reset in `global-setup.ts` and the per-test
   reset in `setup.ts`, so the table list lives in one place.

   Prisma is imported inside the function: the client reads `DATABASE_URL`
   on first load, and global-setup is what points it at the test database.
 */
export async function truncateAllTables() {
  const { prisma } = await import("#app/server/db.server");

  // Order matters: children first so FK cascades don't surprise us.
  await prisma.pushDelivery.deleteMany();
  await prisma.postNotification.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.postImage.deleteMany();
  await prisma.postVideo.deleteMany();
  await prisma.post.deleteMany();
  await prisma.session.deleteMany();
  await prisma.password.deleteMany();
  await prisma.user.deleteMany();
  await prisma.siteAnnouncement.deleteMany();
  await prisma.question.deleteMany();
  await prisma.importantDate.deleteMany();
  await prisma.communityInfo.deleteMany();
}
