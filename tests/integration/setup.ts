import { config } from "dotenv";
import path from "node:path";
import { afterAll, afterEach } from "vitest";

import { PROJECT_ROOT, TEST_DB_URL } from "./db";
import { truncateAllTables } from "./truncate";

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
  const [{ invalidateActiveAnnouncement }, { invalidateCommunityInfo }] = await Promise.all([
    import("#app/features/announcements/site-announcement.server"),
    import("#app/features/contact/contact.server"),
  ]);

  await truncateAllTables();

  // Both singletons are memoised in module scope with a TTL, and only the
  // server's own write paths invalidate them. Empty tables are not enough:
  // a public or auth loader leaves a cache that would serve a row the next
  // test already deleted.
  invalidateActiveAnnouncement();
  invalidateCommunityInfo();
});

afterAll(async () => {
  const { prisma } = await import("#app/server/db.server");
  await prisma.$disconnect();
});
