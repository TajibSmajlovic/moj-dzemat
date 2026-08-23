import { execSync } from "node:child_process";
import fs from "node:fs";

import { requiredEnvironment } from "./utils/environment";

/**
   Playwright global setup. Migrates the isolated database created by the
   E2E runner, then applies every fixture in `./fixtures` before the server
   starts.

   Nothing here may import the fixtures or the Prisma client at the top of
   the file: the client reads `DATABASE_URL` when its module is first
   evaluated, and this function is what sets it.
 */

const projectRoot = process.cwd();
const dbPath = requiredEnvironment("E2E_TEST_DATABASE_PATH");
const databaseUrl = requiredEnvironment("DATABASE_URL");

export default async function globalSetup() {
  if (!fs.existsSync(dbPath)) {
    throw new Error("The isolated E2E database was not created by the runner.");
  }

  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  process.env.DATABASE_URL = databaseUrl;
  const [
    { prisma },
    {
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      ensureAdmin,
      ensureImportantDates,
      ensurePosts,
      ensureQA,
      seedAnnouncements,
    },
  ] = await Promise.all([import("../../app/server/db.server"), import("./fixtures")]);

  try {
    // Admin first: the post fixture resolves `authorId` by looking it up.
    await ensureAdmin();
    await ensurePosts();
    await ensureQA();
    await ensureImportantDates();
    await seedAnnouncements();
  } finally {
    await prisma.$disconnect();
  }

  // `tests/e2e/utils/admin.ts` reads these from the environment so worker
  // processes get the credentials without importing the Prisma client.
  process.env.E2E_ADMIN_EMAIL = ADMIN_EMAIL;
  process.env.E2E_ADMIN_PASSWORD = ADMIN_PASSWORD;
}
