import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Playwright global setup. Wipes `prisma/e2e.db`, runs `migrate
 * deploy`, then seeds a deterministic admin + a couple of posts + one
 * active site announcement. Runs before Playwright starts its `webServer`, which
 * points at the same database via `DATABASE_URL=file:./e2e.db`.
 */

const ADMIN_EMAIL = "admin@dzemat.ba";
const ADMIN_PASSWORD = "#tajnaLozinkaZaE2ETestove2024";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
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
      data: [
        {
          authorId: admin.id,
          slug: "dobrodosli-u-dzemat",
          title: "Dobrodošli u džemat",
          type: "obavijest",
          body: "Primjer obavijesti za e2e testove.",
        },
        {
          authorId: admin.id,
          slug: "petak-hutba",
          title: "Hutba za petak",
          type: "hutba",
          body: "Tekst hutbe.\n\nDrugi pasus hutbe.",
        },
      ],
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
