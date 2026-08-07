import path from "node:path";
import { fileURLToPath } from "node:url";

/**
   Location of the integration database, shared by the one-time global
   setup and the per-file setup that points Prisma at it.

   Everything resolves relative to this file rather than `cwd`, because
   Vitest sometimes launches workers with a working directory deep inside
   the matched test directory and the Prisma CLI needs to find
   `prisma/schema.prisma`.
 */

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const TEST_DB_PATH = path.join(PROJECT_ROOT, "prisma", "integration.db");

/** Prisma on Windows expects `file:C:/...` style for absolute SQLite paths. */
export const TEST_DB_URL = `file:${TEST_DB_PATH.replaceAll("\\", "/")}`;
