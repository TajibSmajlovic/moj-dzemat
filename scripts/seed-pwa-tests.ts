import { prisma } from "#app/server/db.server";

import { PWA_TEST_POSTS } from "../tests/e2e/pwa/fixtures";

if (process.env.PWA_TEST_RUN !== "true") {
  throw new Error("Refusing to seed outside the isolated PWA test runner.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith("file:") || !databaseUrl.includes("moj-dzemat-pwa-tests-")) {
  throw new Error("The PWA test database must be an isolated temporary SQLite file.");
}

try {
  await prisma.post.createMany({
    data: PWA_TEST_POSTS.map((post) => ({
      ...post,
      status: "published",
    })),
  });
  await prisma.siteAnnouncement.create({
    data: {
      id: "pwa-test-announcement",
      message: "PWA testna obavijesna traka nije offline sadržaj.",
      isActive: true,
      createdAt: new Date("2026-07-20T13:00:00.000Z"),
    },
  });
  await prisma.question.create({
    data: {
      id: "pwa-test-question",
      question: "Da li je ovo PWA testno pitanje?",
      answer: "Jeste, ali se pitanje ne pohranjuje za offline korištenje.",
      answeredAt: new Date("2026-07-20T13:30:00.000Z"),
      createdAt: new Date("2026-07-20T13:15:00.000Z"),
    },
  });
} finally {
  await prisma.$disconnect();
}
