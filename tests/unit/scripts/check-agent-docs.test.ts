import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

type DocsModule = {
  checkAgentDocs: (
    rootDir: string,
    documentPaths?: string[],
  ) => { file: string; kind: string; detail: string }[];
  findAgentDocumentPaths: (rootDir: string) => string[];
};

let docs: DocsModule;
const fixtureRoots: string[] = [];

beforeAll(async () => {
  docs = (await import(pathToFileURL(path.resolve("scripts/checks/docs.ts")).href)) as DocsModule;
});

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-docs-"));
  fixtureRoots.push(root);
  for (const [file, contents] of Object.entries(files)) {
    const absolute = path.join(root, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, contents);
  }
  return root;
}

describe("agent documentation checker", () => {
  it("accepts valid local links, anchors, and npm commands", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: { check: "echo ok" } }),
      "README.md":
        "# Read me\n\nSee [this section](#read-me) and [architecture](docs/architecture.md#boundaries). Run `npm run check`.\n",
      "docs/architecture.md": "# Architecture\n\n## Boundaries\n",
    });

    expect(docs.checkAgentDocs(root, ["README.md"])).toEqual([]);
  });

  it("reports a broken local link", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "README.md": "See [missing](docs/missing.md).\n",
    });

    expect(docs.checkAgentDocs(root, ["README.md"])).toEqual([
      expect.objectContaining({ kind: "broken-link" }),
    ]);
  });

  it("reports a documented npm command missing from package.json", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "README.md": "Run `npm run agent:verify`.\n",
    });

    const [finding] = docs.checkAgentDocs(root, ["README.md"]);

    expect(finding?.kind).toBe("missing-script");
    expect(finding?.detail).toContain("agent:verify");
  });

  it("discovers Markdown documents nested under docs", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "docs/nested/new-guide.md": "# New guide\n",
    });

    expect(docs.findAgentDocumentPaths(root)).toContain("docs/nested/new-guide.md");
  });

  it("reports a checked document that is not linked from another document", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "README.md": "See [linked](docs/linked.md).\n",
      "docs/linked.md": "# Linked\n",
      "docs/orphan.md": "# Orphan\n",
    });

    const findings = docs.checkAgentDocs(root, ["README.md", "docs/linked.md", "docs/orphan.md"]);

    expect(findings).toContainEqual(
      expect.objectContaining({ file: "docs/orphan.md", kind: "orphan-document" }),
    );
    expect(findings).not.toContainEqual(
      expect.objectContaining({ file: "docs/linked.md", kind: "orphan-document" }),
    );
  });
});
