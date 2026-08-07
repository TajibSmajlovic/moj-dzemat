import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
   Playwright global setup. Wipes `prisma/e2e.db`, runs `migrate deploy`,
   then applies every fixture in `./fixtures`. Runs before Playwright
   starts its `webServer`, which points at the same database via
   `DATABASE_URL=file:./e2e.db`.

   Nothing here may import the fixtures or the Prisma client at the top of
   the file: the client reads `DATABASE_URL` when its module is first
   evaluated, and this function is what sets it.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dbPath = path.join(projectRoot, "prisma", "e2e.db");
const databaseUrl = "file:./e2e.db";

export default async function globalSetup() {
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
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
