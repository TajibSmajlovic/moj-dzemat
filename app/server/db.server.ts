import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { Prisma, PrismaClient } from "#generated/prisma/client";
import { resolveSqliteUrl } from "#prisma/sqlite-url";
import path from "node:path";

/**
   Shared Prisma client.

   We cache the client on `globalThis` in non-production so HMR/tsx --watch
   doesn't create a new connection pool on every reload.

   Prisma 7 requires an explicit driver adapter. `resolveSqliteUrl` preserves
   the repository's historical schema-relative paths, and `unixepoch-ms`
   keeps DateTime storage compatible with databases created by Prisma 6.
 */

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize Prisma");
  }

  const schemaDirectory = path.resolve(process.cwd(), "prisma");
  const adapter = new PrismaBetterSqlite3(
    { url: resolveSqliteUrl(databaseUrl, schemaDirectory) },
    { timestampFormat: "unixepoch-ms" },
  );

  return new PrismaClient({
    adapter,
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
