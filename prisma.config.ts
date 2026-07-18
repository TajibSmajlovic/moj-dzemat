import "dotenv/config";
import { resolveSqliteUrl } from "#prisma/sqlite-url";
import path from "node:path";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;
const schemaDirectory = path.resolve(process.cwd(), "prisma");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  ...(databaseUrl && {
    datasource: {
      url: resolveSqliteUrl(databaseUrl, schemaDirectory),
    },
  }),
});
