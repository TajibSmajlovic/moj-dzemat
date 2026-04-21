import "dotenv/config";

import { prisma } from "../app/utils/db.server";

/**
 * Idempotent seeder.
 *
 * Ensures the configured admin user(s) exist (NO password; activation
 * happens via the `/zaboravljena-lozinka` flow on first login).
 *
 * Admin emails come from `ADMIN_SEED_EMAILS` (comma-separated).
 */

function resolveAdminEmails(): string[] {
  const raw = process.env.ADMIN_SEED_EMAILS ?? "smajlovic.tajib@gmail.com";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function seedAdmins() {
  const emails = resolveAdminEmails();
  for (const email of emails) {
    const user = await prisma.user.upsert({
      where: { email },
      create: { email },
      update: {},
      select: { id: true, email: true, password: { select: { userId: true } } },
    });
    const status = user.password ? "exists (with password)" : "provisioned";
    console.log(`- ${user.email}: ${status}`);
  }
}

async function main() {
  await seedAdmins();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
