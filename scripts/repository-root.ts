import { existsSync } from "node:fs";
import path from "node:path";

export function findRepositoryRoot(startDirectory: string): string {
  let current = path.resolve(startDirectory);

  while (true) {
    if (existsSync(path.join(current, "package.json")) && existsSync(path.join(current, "app"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not find the repository root from ${startDirectory}`);
    }
    current = parent;
  }
}
