import bcrypt from "bcryptjs";

import { prisma } from "../../../app/server/db.server";

export const ADMIN_EMAIL = "admin@dzemat.ba";
export const ADMIN_PASSWORD = "#tajnaLozinkaZaE2ETestove2024";

/**
   Restores the admin every spec signs in with: the user exists and its
   password is the seeded one.

   Restore-safe, so a spec that changes the admin password (see the
   forgot-password flow in `auth.spec.ts`) can put it back from a
   `finally` block without re-driving the UI. Nothing caches users, so a
   direct write is visible to the running server immediately.

   Run before any fixture that references the admin: `ensurePosts` looks
   it up by email to set `authorId`.
 */
export async function ensureAdmin() {
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, name: "Admin" },
    update: {},
    select: { id: true },
  });

  // Cost 4 matches `tests/factories.ts`: still the real bcrypt path, but
  // cheap enough to run after every test that touches authentication.
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 4);

  await prisma.password.upsert({
    where: { userId: user.id },
    create: { userId: user.id, hash },
    update: { hash },
  });
}
