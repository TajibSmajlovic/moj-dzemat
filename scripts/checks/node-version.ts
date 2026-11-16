import { readFileSync } from "node:fs";
import semver from "semver";

/** Explains why `version` cannot run this repository, or returns null when it can. */
export function describeUnsupportedNode(version: string, range: string): string | null {
  if (semver.satisfies(version, range)) return null;

  return `This repository requires Node ${range} (package.json engines), but Node ${version} is running. Run \`nvm use\` in the repository root, then retry.`;
}

/**
   Stops a repository script before it does any work under an unsupported Node.
   Native dependencies are built for the supported version, so a mismatch
   otherwise fails much later as an obscure module-version error.
 */
export function exitOnUnsupportedNode(): void {
  const problem = describeUnsupportedNode(process.versions.node, readNodeEngineRange());
  if (!problem) return;

  console.error(problem);
  process.exit(1);
}

function readNodeEngineRange(): string {
  const manifest: unknown = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  );
  const range =
    isRecord(manifest) && isRecord(manifest.engines) ? manifest.engines.node : undefined;
  if (typeof range !== "string" || semver.validRange(range) === null) {
    throw new Error("package.json must declare a valid engines.node range.");
  }

  return range;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
