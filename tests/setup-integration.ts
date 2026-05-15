import { config } from "dotenv";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll } from "vitest";

// Resolve relative to this file so tests don't depend on `cwd`. Vitest
// sometimes launches workers with a cwd deep inside the matched test
// directory, and prisma CLI needs to find `prisma/schema.prisma`.
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Load environment variables from .env file before any other code runs.
// This ensures secrets and configuration are available for all modules.
const envPath = path.join(PROJECT_ROOT, ".env");
config({ path: envPath });

const TEST_DB_PATH = path.join(PROJECT_ROOT, "prisma", "integration.db");
/** Prisma on Windows expects `file:C:/...` style for absolute SQLite paths. */
const TEST_DB_URL = `file:${TEST_DB_PATH.replaceAll("\\", "/")}`;

/**
 * Integration setup. SQLite only supports a single writer, so the
 * vitest config already pins us to one worker + no file parallelism.
 * On top of that, we:
 *
 *   1. point every test at `prisma/integration.db`,
 *   2. drop + `migrate deploy` it once before the suite,
 *   3. delete rows from every table between tests so each case starts clean.
 *
 * We avoid a per-test `prisma.$transaction` rollback because Prisma's
 * interactive transactions clash with queries outside the callback
 * (our server utilities talk to the shared singleton).
 */

if (!process.env.DATABASE_URL_OVERRIDDEN) {
  process.env.DATABASE_URL = TEST_DB_URL;
  process.env.DATABASE_URL_OVERRIDDEN = "1";
}

beforeAll(() => {
  // Migrate once per process. Re-running deploy is cheap and keeps the
  // integration DB aligned with the latest schema even when the file
  // already exists from a previous run.
  if (!fs.existsSync(TEST_DB_PATH)) {
    fs.closeSync(fs.openSync(TEST_DB_PATH, "w"));
  }
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    cwd: PROJECT_ROOT,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  });
});

afterEach(async () => {
  const { prisma } = await import("#app/server/db.server");
  // Order matters: children first so FK cascades don't surprise us.
  await prisma.postImage.deleteMany();
  await prisma.post.deleteMany();
  await prisma.session.deleteMany();
  await prisma.password.deleteMany();
  await prisma.user.deleteMany();
  await prisma.siteAnnouncement.deleteMany();
});

afterAll(async () => {
  const { prisma } = await import("#app/server/db.server");
  await prisma.$disconnect();
});
