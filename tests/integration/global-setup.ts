import { execSync } from "node:child_process";
import fs from "node:fs";

import { PROJECT_ROOT, TEST_DB_PATH, TEST_DB_URL } from "./db";

/**
   One-time setup for the integration project: bring `prisma/integration.db`
   up to date with the current schema before any worker starts.

   This deliberately lives in `globalSetup` rather than a `beforeAll` in
   `setup.ts`. Vitest evaluates setup files once per *test file*, so a
   migration there spawns the Prisma CLI once for every integration file
   even though the schema only changes between commits.

   `migrate deploy` is idempotent, so an existing database from a previous
   run is reused and only new migrations are applied.
 */
export default function globalSetup() {
  // Prisma's SQLite migration engine expects the target file to exist.
  if (!fs.existsSync(TEST_DB_PATH)) {
    fs.closeSync(fs.openSync(TEST_DB_PATH, "w"));
  }

  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    cwd: PROJECT_ROOT,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  });
}
