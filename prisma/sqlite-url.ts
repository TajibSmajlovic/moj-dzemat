import fs from "node:fs";
import path from "node:path";

/**
   Preserve Prisma 6's schema-relative SQLite URL behavior.

   Prisma 7 resolves relative URLs from the project working directory, while
   this repository has historically treated `file:./data.db` as relative to
   the Prisma schema directory. Absolute URLs (including LiteFS) are not
   rebased.
 */
export function resolveSqliteUrl(databaseUrl: string, schemaDirectory: string): string {
  const filePath = databaseUrl.replace(/^file:/, "");

  if (filePath === databaseUrl || filePath === ":memory:") {
    return databaseUrl;
  }

  // Recognize drive-letter and UNC schema paths when this code is tested on POSIX.
  const pathImplementation =
    path.win32.isAbsolute(schemaDirectory) && !path.posix.isAbsolute(schemaDirectory)
      ? path.win32
      : path;

  if (pathImplementation.isAbsolute(filePath) || path.win32.isAbsolute(filePath)) {
    return `file:${filePath.replaceAll("\\", "/")}`;
  }

  if (!pathImplementation.isAbsolute(schemaDirectory)) {
    throw new Error("The Prisma schema directory must be an absolute path");
  }

  const schemaPath = pathImplementation.join(schemaDirectory, "schema.prisma");
  if (!fs.existsSync(schemaPath)) {
    throw new Error(
      `Cannot resolve relative DATABASE_URL: expected Prisma schema at ${schemaPath}. ` +
        "Start the application from the project root or use an absolute SQLite URL.",
    );
  }

  const resolvedPath = pathImplementation.resolve(schemaDirectory, filePath.replaceAll("\\", "/"));

  return `file:${resolvedPath.replaceAll("\\", "/")}`;
}
