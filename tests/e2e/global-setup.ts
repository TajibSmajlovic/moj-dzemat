import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
/**
 * Playwright global setup. Wipes `prisma/e2e.db`, runs `migrate
 * deploy`, then seeds a deterministic admin + post set (including a
 * second posts page for pagination coverage) + one active site
 * announcement. Runs before Playwright starts its `webServer`, which
 * points at the same database via `DATABASE_URL=file:./e2e.db`.
 */

const ADMIN_EMAIL = "admin@dzemat.ba";
const ADMIN_PASSWORD = "#tajnaLozinkaZaE2ETestove2024";
const BASE_TIME = Date.parse("2026-04-22T12:00:00Z");
const SEEDED_POST_COUNT = 35;

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
  const { prisma } = await import("../../app/utils/db.server");
  const bcryptModule = await import("bcryptjs");
  const bcrypt = bcryptModule.default;

  try {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 4);
    const admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: "Admin",
        password: { create: { hash } },
      },
    });

    await prisma.post.createMany({
      data: POSTS_TITLES.map((title, index) => ({
        title,
        slug: `e2e-objava-${index + 1}`,
        body: "Tijelo objave.\n\nDrugi paragraf.",
        type: "obavijest",
        authorId: admin.id,
        publishedAt: new Date(BASE_TIME - index * 60_000),
        createdAt: new Date(BASE_TIME - index * 60_000),
      })),
    });

    await prisma.siteAnnouncement.create({
      data: { message: "Džuma namaz u 13:00", isActive: true },
    });
  } finally {
    await prisma.$disconnect();
  }

  process.env.E2E_ADMIN_EMAIL = ADMIN_EMAIL;
  process.env.E2E_ADMIN_PASSWORD = ADMIN_PASSWORD;
}

export const POSTS_TITLES = Array.from(
  { length: SEEDED_POST_COUNT },
  (_, index) => `E2E objava ${String(index + 1).padStart(2, "0")}`,
) as [string, ...string[]];
