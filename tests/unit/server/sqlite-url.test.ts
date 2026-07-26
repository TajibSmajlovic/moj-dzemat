import { resolveSqliteUrl } from "#prisma/sqlite-url";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const schemaDirectory = path.resolve("prisma");

describe("resolveSqliteUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves relative SQLite files from the Prisma schema directory", () => {
    expect(resolveSqliteUrl("file:./data.db", schemaDirectory)).toBe(
      `file:${path.join(schemaDirectory, "data.db").replaceAll("\\", "/")}`,
    );
  });

  it("fails before resolving a relative URL from the wrong project directory", () => {
    const missingSchemaDirectory = path.join(schemaDirectory, "missing");

    expect(() => resolveSqliteUrl("file:./data.db", missingSchemaDirectory)).toThrow(
      `expected Prisma schema at ${path.join(missingSchemaDirectory, "schema.prisma")}`,
    );
  });

  it("preserves absolute SQLite paths used by LiteFS", () => {
    expect(resolveSqliteUrl("file:/litefs/data.db", schemaDirectory)).toBe("file:/litefs/data.db");
  });

  it("uses forward slashes when resolving a relative Windows SQLite path", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);

    expect(resolveSqliteUrl("file:./data.db", String.raw`C:\project\prisma`)).toBe(
      "file:C:/project/prisma/data.db",
    );
  });

  it("normalizes an absolute Windows SQLite path", () => {
    expect(resolveSqliteUrl(String.raw`file:C:\litefs\data.db`, schemaDirectory)).toBe(
      "file:C:/litefs/data.db",
    );
  });

  it("preserves in-memory and non-file URLs", () => {
    expect(resolveSqliteUrl("file::memory:", schemaDirectory)).toBe("file::memory:");
    expect(resolveSqliteUrl("https://example.com/database", schemaDirectory)).toBe(
      "https://example.com/database",
    );
  });
});
