import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { checkArchitecture, formatViolation } from "../../../scripts/checks/architecture";
import { findRepositoryRoot } from "../../../scripts/repository-root";

const fixtureRoots: string[] = [];
const violationCases: { rule: string; files: Record<string, string> }[] = [
  {
    rule: "feature-isolation",
    files: {
      "app/features/qa/view.ts": "import { value } from '#app/features/posts/internal';\n",
    },
  },
  {
    rule: "foundation-direction",
    files: {
      "app/lib/branding.ts": "import { value } from '#app/features/posts/internal';\n",
    },
  },
  {
    rule: "platform-direction",
    files: {
      "app/platform/browser.ts": "const module = import('#app/features/posts/internal');\n",
    },
  },
  {
    rule: "client-server-boundary",
    files: {
      "app/components/card.tsx": "import { db } from '#app/server/db.server';\n",
    },
  },
];

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-architecture-"));
  fixtureRoots.push(root);
  fs.writeFileSync(path.join(root, "package.json"), "{}\n");

  for (const [file, contents] of Object.entries(files)) {
    const absolute = path.join(root, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, contents);
  }

  return root;
}

describe("architecture checker", () => {
  it("accepts shared foundations, platform imports, and named feature contracts", () => {
    const root = fixture({
      "app/lib/date.ts": "export const date = 'today';\n",
      "app/platform/view-transitions/index.ts": "import { date } from '#app/lib/date';\n",
      "app/features/posts/post-contract.ts": "export type Post = { id: string };\n",
      "app/features/pwa/cache.ts":
        "import type { Post } from '#app/features/posts/post-contract';\n",
      "app/features/web-push/post-publication.server.ts": "export const publish = () => {};\n",
      "app/features/posts/save.server.ts":
        "import { publish } from '#app/features/web-push/post-publication.server';\n",
    });

    expect(checkArchitecture(root)).toEqual([]);
  });

  it.each(violationCases)(
    "rejects $rule violations with actionable diagnostics",
    ({ rule, files }) => {
      const root = fixture(files);
      const [violation] = checkArchitecture(root);

      expect(violation?.rule).toBe(rule);
      expect(formatViolation(violation!)).toContain("Why:");
      expect(formatViolation(violation!)).toContain("Fix:");
      expect(formatViolation(violation!)).toContain(`docs/architecture/boundaries.md#${rule}`);
    },
  );

  it("allows type-only server imports but rejects runtime imports in the same module", () => {
    const root = fixture({
      "app/features/posts/post.server.ts":
        "export type Post = { id: string }; export const db = {};\n",
      "app/features/posts/components/card.tsx": [
        "import type { Post } from '../post.server';",
        "const load = () => import('../post.server');",
      ].join("\n"),
    });

    const violations = checkArchitecture(root);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("client-server-boundary");
    expect(violations[0]?.line).toBe(2);
  });

  it("resolves the repository root from a nested directory", () => {
    const root = fixture({ "app/lib/value.ts": "export const value = true;\n" });
    const nested = path.join(root, "app", "lib");

    expect(findRepositoryRoot(nested)).toBe(root);
  });
});
