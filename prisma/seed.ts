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
  const raw = process.env.ADMIN_SEED_EMAILS?.trim();
  if (!raw) return [];

  return [
    ...new Set(
      raw
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

async function seedAdmins() {
  const emails = resolveAdminEmails();
  if (emails.length === 0) {
    console.log("[seed] ADMIN_SEED_EMAILS is empty, skipping admin bootstrap");
    return;
  }

  console.log(`[seed] ensuring ${emails.length} admin account(s) exist`);

  for (const email of emails) {
    const user = await prisma.user.upsert({
      where: { email },
      create: { email },
      update: {},
      select: { email: true, password: { select: { userId: true } } },
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
