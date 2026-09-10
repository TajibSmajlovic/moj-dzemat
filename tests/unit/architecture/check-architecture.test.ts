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
  {
    rule: "client-server-boundary",
    files: {
      "app/features/posts/admin/components/form.tsx":
        "import { db } from '#app/server/db.server';\n",
    },
  },
  {
    rule: "client-server-boundary",
    files: {
      "app/lib/browser-helper.ts": "import { db } from '#app/server/db.server';\n",
    },
  },
  {
    rule: "client-server-boundary",
    files: {
      "app/components/card.tsx": "import { PrismaClient } from '#generated/prisma/client';\n",
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
  it("checks browser preview imports without treating Node build configuration as browser code", () => {
    const root = fixture({
      ".storybook/preview.tsx": "import { db } from '../app/server/data.server';",
      ".storybook/main.ts": "import path from 'node:path';",
      "app/server/data.server.ts": "export const db = {};",
    });
    expect(checkArchitecture(root)).toEqual([
      expect.objectContaining({ source: ".storybook/preview.tsx", rule: "client-server-boundary" }),
    ]);
  });

  it("keeps stories browser-safe and outside production imports", () => {
    const root = fixture({
      "app/lib/example.ts": "import '../../stories/fixtures';",
      "stories/fixtures.ts": "export const value = 1;",
      "stories/card.stories.tsx": "import './helper';",
      "stories/helper.ts": "import '#app/server/db.server';",
    });
    expect(checkArchitecture(root).map((entry) => entry.rule)).toEqual(
      expect.arrayContaining(["production-dependency", "client-server-boundary"]),
    );
  });

  it("allows stories to compose public UI with erased server types", () => {
    const root = fixture({
      "stories/card.stories.tsx":
        "import '#app/components/card'; import type { Post } from '#app/features/posts/post.server';",
      "app/components/card.tsx": "export const Card = () => null;",
      "app/features/posts/post.server.ts": "export type Post = { id: string };",
    });
    expect(checkArchitecture(root)).toEqual([]);
  });
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

  it("allows type-only imports from generated server code", () => {
    const root = fixture({
      "app/lib/post.ts": "import type { Post } from '#generated/prisma/client';\n",
    });

    expect(checkArchitecture(root)).toEqual([]);
  });

  it("resolves the repository root from a nested directory", () => {
    const root = fixture({ "app/lib/value.ts": "export const value = true;\n" });
    const nested = path.join(root, "app", "lib");

    expect(findRepositoryRoot(nested)).toBe(root);
  });
  it("follows browser imports through helpers and re-export cycles", () => {
    const root = fixture({
      "app/features/posts/components/card.tsx": "import { db } from '../helper.js';",
      "app/features/posts/helper.ts": "export { db } from './barrel';",
      "app/features/posts/barrel.ts":
        "export * from './helper'; export { db } from './data.server';",
      "app/features/posts/data.server.ts": "export const db = {};",
    });
    const violations = checkArchitecture(root);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: "client-server-boundary",
      source: "app/features/posts/barrel.ts",
    });
    expect(formatViolation(violations[0]!)).toContain("app/features/posts/components/card.tsx");
  });

  it.each([
    "import fs from 'node:fs';",
    "const fs = require('fs');",
    "const fs = import(`node:fs`);",
  ])("rejects browser Node imports: %s", (contents) => {
    expect(checkArchitecture(fixture({ "app/components/card.tsx": contents }))).toEqual([
      expect.objectContaining({ rule: "client-server-boundary" }),
    ]);
  });

  it("resolves configured aliases before checking boundaries", () => {
    const root = fixture({
      "tsconfig.base.json": JSON.stringify({
        compilerOptions: { paths: { "@internal/*": ["./app/server/*"] } },
      }),
      "app/components/card.tsx": "import { db } from '@internal/data';",
      "app/server/data.ts": "export const db = {};",
    });
    expect(checkArchitecture(root)).toEqual([
      expect.objectContaining({ rule: "client-server-boundary" }),
    ]);
  });

  it("erases type re-exports but retains mixed exports", () => {
    const root = fixture({
      "app/lib/types.ts": "export { type Value } from '#app/server/data.server';",
      "app/lib/mixed.ts": "export { type Value, db } from '#app/server/data.server';",
      "app/server/data.server.ts": "export type Value = string; export const db = {};",
    });
    expect(checkArchitecture(root)).toEqual([
      expect.objectContaining({ source: "app/lib/mixed.ts", rule: "client-server-boundary" }),
    ]);
  });

  it("leaves server-only helper graphs available to routes", () => {
    const root = fixture({
      "app/routes/posts.tsx": "import { db } from '../features/posts/helper';",
      "app/features/posts/helper.ts": "export { db } from './data.server';",
      "app/features/posts/data.server.ts": "import fs from 'node:fs'; export const db = {};",
    });
    expect(checkArchitecture(root)).toEqual([]);
  });

  it("rejects production dependencies on test fixtures", () => {
    const root = fixture({ "app/routes/posts.tsx": "import { db } from '../../tests/fixtures';" });
    expect(checkArchitecture(root)).toEqual([
      expect.objectContaining({ rule: "production-dependency" }),
    ]);
  });
});
