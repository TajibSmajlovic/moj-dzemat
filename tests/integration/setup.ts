import { config } from "dotenv";
import path from "node:path";
import { afterAll, afterEach } from "vitest";

import { PROJECT_ROOT, TEST_DB_URL } from "./db";

// Load environment variables from .env file before any other code runs.
// This ensures secrets and configuration are available for all modules.
config({ path: path.join(PROJECT_ROOT, ".env") });

/**
 * Per-file integration setup. SQLite only supports a single writer, so the
 * vitest config already pins us to one worker + no file parallelism. On
 * top of that, we:
 *
 *   1. point every test at `prisma/integration.db`,
 *   2. delete rows from every table between tests so each case starts clean,
 *   3. clear the in-process caches that outlive those rows.
 *
 * The schema itself is migrated once per run in `global-setup.ts`, because
 * Vitest re-evaluates this file for every test file.
 *
 * We avoid a per-test `prisma.$transaction` rollback because Prisma's
 * interactive transactions clash with queries outside the callback
 * (our server utilities talk to the shared singleton).
 */

if (!process.env.DATABASE_URL_OVERRIDDEN) {
  process.env.DATABASE_URL = TEST_DB_URL;
  process.env.DATABASE_URL_OVERRIDDEN = "1";
}

afterEach(async () => {
  const [{ invalidateActiveAnnouncement }, { invalidateCommunityInfo }, { prisma }] =
    await Promise.all([
      import("#app/features/announcements/site-announcement.server"),
      import("#app/features/contact/contact.server"),
      import("#app/server/db.server"),
    ]);

  // Order matters: children first so FK cascades don't surprise us.
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

  // Both singletons are memoised in module scope with a TTL, and only the
  // server's own write paths invalidate them. Truncating the tables above
  // is not enough: any test that rendered a public or auth loader leaves a
  // populated cache behind, and the next test would read a row that no
  // longer exists.
  invalidateActiveAnnouncement();
  invalidateCommunityInfo();
});

afterAll(async () => {
  const { prisma } = await import("#app/server/db.server");
  await prisma.$disconnect();
});
