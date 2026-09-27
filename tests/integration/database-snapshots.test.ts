import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "#app/server/db.server";

import { createSnapshot, restoreSnapshot } from "../../scripts/database/snapshots";
import { createPost, createUser } from "../factories";

const directories: string[] = [];

afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

async function paths() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "moj-snapshot-test-"));
  directories.push(directory);
  return {
    directory,
    snapshot: path.join(directory, "snapshot"),
    restored: path.join(directory, "restored.db"),
  };
}

function sourceDatabase() {
  return process.env.DATABASE_URL!.replace(/^file:/, "");
}

describe("database snapshots", () => {
  it("restores committed content, credentials, and blobs independently of later writes", async () => {
    const { user } = await createUser();
    const post = await createPost({ authorId: user.id, title: "Snapshot rehearsal" });
    const source = new DatabaseSync(sourceDatabase());
    source.exec("PRAGMA journal_mode = WAL; CREATE TABLE RehearsalBlob (value BLOB)");
    const blob = Buffer.from([0, 255, 128, 42]);
    source.prepare("INSERT INTO RehearsalBlob VALUES (?)").run(blob);
    try {
      const { snapshot, restored } = await paths();
      const before = await prisma.password.findUniqueOrThrow({ where: { userId: user.id } });
      await createSnapshot(sourceDatabase(), snapshot);
      await prisma.post.update({ where: { id: post.id }, data: { title: "Changed after backup" } });
      await restoreSnapshot(snapshot, restored);
      const database = new DatabaseSync(restored, { readOnly: true });
      try {
        expect(database.prepare("SELECT title FROM Post WHERE id = ?").get(post.id)?.title).toBe(
          "Snapshot rehearsal",
        );
        expect(
          database.prepare("SELECT hash FROM Password WHERE userId = ?").get(user.id)?.hash,
        ).toBe(before.hash);
        expect(
          Buffer.from(
            database.prepare("SELECT value FROM RehearsalBlob").get()!.value as Uint8Array,
          ),
        ).toEqual(blob);
        expect(
          database.prepare("SELECT count(*) AS count FROM _prisma_migrations").get()?.count,
        ).toBeGreaterThan(0);
      } finally {
        database.close();
      }
      const restoredStat = await stat(restored);
      const snapshotStat = await stat(snapshot);
      expect(restoredStat.mode & 0o777).toBe(0o600);
      expect(snapshotStat.mode & 0o777).toBe(0o700);
      const currentPost = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
      expect(currentPost.title).toBe("Changed after backup");
    } finally {
      source.exec("DROP TABLE RehearsalBlob");
      source.close();
    }
  });

  it("refuses to overwrite a backup directory, restored file, or stale WAL", async () => {
    const { snapshot, restored } = await paths();
    await createSnapshot(sourceDatabase(), snapshot);
    const original = await readFile(path.join(snapshot, "manifest.json"));
    await expect(createSnapshot(sourceDatabase(), snapshot)).rejects.toThrow();
    expect(await readFile(path.join(snapshot, "manifest.json"))).toEqual(original);
    await writeFile(restored + "-wal", "existing WAL");
    await expect(restoreSnapshot(snapshot, restored)).rejects.toThrow("new destination");
    await rm(restored + "-wal");
    await restoreSnapshot(snapshot, restored);
    const database = await readFile(restored);
    await expect(restoreSnapshot(snapshot, restored)).rejects.toThrow("new destination");
    expect(await readFile(restored)).toEqual(database);
  });

  it("rejects corruption before publishing a restored file", async () => {
    const { directory, snapshot, restored } = await paths();
    await createSnapshot(sourceDatabase(), snapshot);
    await writeFile(path.join(snapshot, "database.sqlite"), "corrupt");
    await expect(restoreSnapshot(snapshot, restored)).rejects.toThrow("checksum mismatch");
    expect(await readdir(directory)).toEqual(["snapshot"]);
  });

  it("cleans a failed backup and refuses databases without application tables", async () => {
    const { directory, snapshot } = await paths();
    const empty = path.join(directory, "empty.db");
    new DatabaseSync(empty).close();
    await expect(createSnapshot(empty, snapshot)).rejects.toThrow("required application tables");
    expect(await readdir(directory)).toEqual(["empty.db"]);
  });
});
