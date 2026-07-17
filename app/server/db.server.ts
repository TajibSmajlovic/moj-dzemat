import { Prisma, PrismaClient } from "@prisma/client";

/**
   Shared Prisma client.

   We cache the client on `globalThis` in non-production so HMR/tsx --watch
   doesn't create a new connection pool on every reload.

   The schema declares `url = env("DATABASE_URL")` so Prisma resolves
   relative `file:./data.db` against the schema directory (`prisma/`).
   No manual path resolution needed.
 */

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
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
