import { Prisma, PrismaClient } from "@prisma/client";

/**
   Shared Prisma client.

   SQLite + Prisma share a single persistent connection in production, so
   the PRAGMAs below only need to be issued once per process. We cache the
   client on `globalThis` in non-production so HMR/tsx --watch doesn't
   create a new pool on every reload.

   The schema declares `url = env("DATABASE_URL")` so Prisma resolves
   relative `file:./data.db` against the schema directory (`prisma/`).
   No manual path resolution needed.
 */

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Tune SQLite for a single-writer web server backed by LiteFS:
  // - WAL = concurrent readers + one writer, far better than default rollback
  // - synchronous=NORMAL trades a tiny crash window for big write throughput
  // - foreign_keys=ON enforces the relations Prisma assumes exist
  // - busy_timeout waits up to 5 s for a write lock before surfacing an error
  const pragmas = [
    "journal_mode = WAL",
    "foreign_keys = ON",
    "synchronous = NORMAL",
    "busy_timeout = 5000",
  ];
  for (const pragma of pragmas) {
    void client.$executeRawUnsafe(`PRAGMA ${pragma};`);
  }

  return client;
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export function isPrismaKnownRequestError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export function isPrismaNotFoundError(error: unknown): boolean {
  return isPrismaKnownRequestError(error, "P2025");
}
