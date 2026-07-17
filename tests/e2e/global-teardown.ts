import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default function globalTeardown() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const dbPath = path.join(projectRoot, "prisma", "e2e.db");
  if (fs.existsSync(dbPath)) {
    try {
      fs.rmSync(dbPath);
    } catch (error: unknown) {
      // Windows does not allow deleting an open SQLite file. The next
      // global setup run deletes/refreshes it before migrations anyway.
      if (!(
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "EBUSY" || error.code === "EPERM" || error.code === "ENOENT")
      )) {
        throw error;
      }
    }
  }
}
