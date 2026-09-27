import path from "node:path";
import { parseArgs } from "node:util";

import { createSnapshot, restoreSnapshot } from "./snapshots";

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { source: { type: "string" }, destination: { type: "string" } },
  });
  const [operation] = positionals;
  if (
    positionals.length !== 1 ||
    (operation !== "backup" && operation !== "restore") ||
    !values.source ||
    !values.destination
  ) {
    throw new Error("Use backup|restore --source <path> --destination <new-path>");
  }
  const source = path.resolve(values.source);
  const destination = path.resolve(values.destination);
  await (operation === "backup"
    ? createSnapshot(source, destination)
    : restoreSnapshot(source, destination));
  console.log(`${operation} completed; checksum and SQLite checks passed: ${destination}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database snapshot failed");
  process.exitCode = 1;
}
