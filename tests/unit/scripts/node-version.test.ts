import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { describeUnsupportedNode } from "../../../scripts/checks/node-version";

const engineRange = (
  JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8")) as {
    engines: { node: string };
  }
).engines.node;

describe("repository Node version", () => {
  it.each(["24.0.0", "24.18.0"])("accepts Node %s", (version) => {
    expect(describeUnsupportedNode(version, engineRange)).toBeNull();
  });

  it.each(["22.22.3", "25.0.0"])("rejects Node %s with the fix", (version) => {
    const problem = describeUnsupportedNode(version, engineRange);

    expect(problem).toContain(`Node ${engineRange}`);
    expect(problem).toContain(`Node ${version} is running`);
    expect(problem).toContain("nvm use");
  });
});
