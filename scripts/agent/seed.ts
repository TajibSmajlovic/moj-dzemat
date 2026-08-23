import { prisma } from "../../app/server/db.server";
import {
  ensureAdmin,
  ensureImportantDates,
  ensurePosts,
  ensureQA,
  seedAnnouncements,
} from "../../tests/e2e/fixtures";

async function seedAgentRuntime(): Promise<void> {
  try {
    await ensureAdmin();
    await ensurePosts();
    await ensureQA();
    await ensureImportantDates();
    await seedAnnouncements();
  } finally {
    await prisma.$disconnect();
  }
}

seedAgentRuntime().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
