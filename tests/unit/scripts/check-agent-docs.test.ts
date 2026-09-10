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

  it("discovers Markdown documents at the root and under docs and .github", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "NOTES.md": "# Notes\n",
      "docs/nested/new-guide.md": "# New guide\n",
      ".github/ISSUE_TEMPLATE/bug_report.md": "# Bug report\n",
    });

    expect(docs.findAgentDocumentPaths(root)).toEqual(
      expect.arrayContaining([
        "NOTES.md",
        "docs/nested/new-guide.md",
        ".github/ISSUE_TEMPLATE/bug_report.md",
      ]),
    );
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
  it("rejects a disconnected document cycle even when both files have incoming links", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "AGENTS.md": "# Guide",
      "docs/a.md": "[B](b.md)",
      "docs/b.md": "[A](a.md)",
    });
    expect(
      docs
        .checkAgentDocs(root, ["AGENTS.md", "docs/a.md", "docs/b.md"])
        .filter((f) => f.kind === "orphan-document")
        .map((f) => f.file),
    ).toEqual(["docs/a.md", "docs/b.md"]);
  });

  it("does not count example links in a fenced code block as navigation", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "AGENTS.md": "# Guide\n```md\n[Example](docs/a.md)\n```",
      "docs/a.md": "# A",
    });
    expect(docs.checkAgentDocs(root, ["AGENTS.md", "docs/a.md"])).toContainEqual(
      expect.objectContaining({ kind: "orphan-document" }),
    );
  });

  it.each([
    ["docs/PLANS.md", "docs/exec-plans/active/task.md"],
    ["docs/design-docs/index.md", "docs/design-docs/decision.md"],
    ["docs/product-specs/index.md", "docs/product-specs/feature.md"],
  ])("requires durable documents to be linked from %s", (index, document) => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "AGENTS.md": `[Index](${index})\n[Document](${document})`,
      [index]: "# Index",
      [document]: "# Document\nStatus: active\nUpdated: 2026-09-09\nOwner: maintainer",
    });
    expect(docs.checkAgentDocs(root, ["AGENTS.md", index, document])).toEqual([
      expect.objectContaining({ kind: "unindexed-document", file: document }),
    ]);
  });

  it("checks active-plan structure without turning age into a CI failure", () => {
    const document = "docs/exec-plans/active/task.md";
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "AGENTS.md": "[Plans](docs/PLANS.md)",
      "docs/PLANS.md": "[Task](exec-plans/active/task.md)",
      [document]: "# Task\nStatus: active\nUpdated: 2000-01-01\nOwner: maintainer",
    });
    const paths = ["AGENTS.md", "docs/PLANS.md", document];
    expect(docs.checkAgentDocs(root, paths)).toEqual([]);
    fs.writeFileSync(
      path.join(root, document),
      "# Task\nStatus: completed\nUpdated: 2026-02-30\nOwner: maintainer",
    );
    expect(docs.checkAgentDocs(root, paths).map((f) => f.kind)).toEqual([
      "invalid-active-plan-status",
      "invalid-active-plan-date",
    ]);
  });

  it("does not use the next line or a later section as a blank metadata value", () => {
    const document = "docs/exec-plans/active/task.md";
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "AGENTS.md": "[Plans](docs/PLANS.md)",
      "docs/PLANS.md": "[Task](exec-plans/active/task.md)",
      [document]: "# Task\nOwner: \nStatus: active\n## Example\nUpdated: 2026-09-09",
    });
    expect(
      docs.checkAgentDocs(root, ["AGENTS.md", "docs/PLANS.md", document]).map((f) => f.kind),
    ).toEqual(["missing-active-plan-owner", "missing-active-plan-date"]);
  });
});
