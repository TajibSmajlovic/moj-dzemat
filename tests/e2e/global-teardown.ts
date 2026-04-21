import fs from "node:fs";
import path from "node:path";

export default function globalTeardown() {
  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
  const dbPath = path.join(projectRoot, "prisma", "e2e.db");
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }
}
