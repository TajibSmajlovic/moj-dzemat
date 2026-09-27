import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, link, lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import { z } from "zod";

const Manifest = z.object({
  format: z.literal(1),
  createdAt: z.iso.datetime(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function createSnapshot(source: string, destination: string): Promise<void> {
  await mkdir(destination, { mode: 0o700 });
  try {
    const filename = path.join(destination, "database.sqlite");
    await copyDatabase(source, filename);
    await writeFile(
      path.join(destination, "manifest.json"),
      JSON.stringify({
        format: 1,
        createdAt: new Date().toISOString(),
        sha256: await digest(filename),
      }) + "\n",
      { mode: 0o600, flag: "wx" },
    );
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
}

export async function restoreSnapshot(source: string, destination: string): Promise<void> {
  const manifest = Manifest.parse(
    JSON.parse(await readFile(path.join(source, "manifest.json"), "utf8")),
  );
  const filename = path.join(source, "database.sqlite");
  if ((await digest(filename)) !== manifest.sha256) throw new Error("Snapshot checksum mismatch");
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    try {
      await lstat(destination + suffix);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    throw new Error("Restore requires a new destination without SQLite sidecars");
  }
  const temporary = await mkdtemp(path.join(path.dirname(destination), ".restore-"));
  try {
    const restored = path.join(temporary, "database.sqlite");
    await copyDatabase(filename, restored);
    // Publish only a verified database; link fails atomically if the target exists.
    await link(restored, destination);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function copyDatabase(source: string, destination: string): Promise<void> {
  const database = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(database, destination);
  } finally {
    database.close();
  }
  await chmod(destination, 0o600);
  const snapshot = new DatabaseSync(destination);
  try {
    // A restored file must stand alone without a WAL from the staging directory.
    snapshot.exec("PRAGMA journal_mode = DELETE");
    const integrity = snapshot.prepare("PRAGMA integrity_check").all();
    if (integrity.length !== 1 || integrity[0]?.integrity_check !== "ok") {
      throw new Error("Snapshot failed SQLite integrity validation");
    }
    if (snapshot.prepare("PRAGMA foreign_key_check").all().length !== 0) {
      throw new Error("Snapshot contains broken foreign keys");
    }
    for (const table of ["User", "Password", "Session", "Post", "_prisma_migrations"]) {
      const exists = snapshot
        .prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?")
        .get(table);
      if (!exists) throw new Error("Snapshot is missing required application tables");
    }
  } finally {
    snapshot.close();
  }
}

async function digest(filename: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}
