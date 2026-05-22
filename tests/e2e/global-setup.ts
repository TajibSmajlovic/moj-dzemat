import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ADMIN_EMAIL, ADMIN_PASSWORD, BASE_TIME, SEEDED_POSTS } from "./fixtures/seed-data";

/**
   Playwright global setup. Wipes `prisma/e2e.db`, runs `migrate
   deploy`, then seeds a deterministic admin + post set (including a
   second posts page for pagination coverage) + one active site
   announcement. Runs before Playwright starts its `webServer`, which
   points at the same database via `DATABASE_URL=file:./e2e.db`.
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

  // Set DATABASE_URL before importing the shared client (adapter reads it at init).
  process.env.DATABASE_URL = databaseUrl;
  const [{ prisma }, { createPost, createSiteAnnouncement, createUser }] = await Promise.all([
    import("../../app/server/db.server"),
    import("../factories"),
  ]);

  try {
    const { user: admin } = await createUser({
      email: ADMIN_EMAIL,
      name: "Admin",
      password: ADMIN_PASSWORD,
    });

    for (const post of SEEDED_POSTS) {
      const timestamp = new Date(BASE_TIME - post.index * 60_000);
      await createPost({
        authorId: admin.id,
        title: post.title,
        slug: post.slug,
        body: `${post.title} je testna objava tipa ${post.type}.\n\nDrugi paragraf.`,
        type: post.type,
        publishedAt: timestamp,
        createdAt: timestamp,
      });
    }

    await createSiteAnnouncement({
      message: "Džuma namaz u 13:00",
      isActive: true,
    });
  } finally {
    await prisma.$disconnect();
  }

  process.env.E2E_ADMIN_EMAIL = ADMIN_EMAIL;
  process.env.E2E_ADMIN_PASSWORD = ADMIN_PASSWORD;
}
