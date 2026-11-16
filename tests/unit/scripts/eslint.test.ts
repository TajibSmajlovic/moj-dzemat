// @vitest-environment node
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
import { z } from "zod";

const cases = [
  {
    rule: "@eslint-react/dom-no-unknown-property",
    invalid: '<button type="button" on-click={() => undefined}>Test</button>',
    valid: '<button type="button" onClick={() => undefined}>Test</button>',
  },
  {
    rule: "@eslint-react/dom-no-unsafe-target-blank",
    invalid: '<a href="https://example.com" target="_blank">Test</a>',
    valid: '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Test</a>',
  },
  {
    rule: "jsx-a11y-x/alt-text",
    invalid: '<img src="/logo.png" />',
    valid: '<img src="/logo.png" alt="Džemat" />',
  },
  {
    rule: "@eslint-react/no-missing-key",
    invalid: '{["Prvi", "Drugi"].map((item) => <span>{item}</span>)}',
    valid: '{["Prvi", "Drugi"].map((item) => <span key={item}>{item}</span>)}',
  },
];

const lintResultsSchema = z.array(
  z.object({
    fatalErrorCount: z.number(),
    messages: z.array(z.object({ ruleId: z.string().nullable() })),
  }),
);
it("rejects unsafe JSX and accepts each corrected example using the repository config", () => {
  // Use the CLI's native ESM loader; tsx's CommonJS hook conflicts with Unicorn.
  const output = execFileSync(process.execPath, ["--input-type=module"], {
    cwd: process.cwd(),
    encoding: "utf8",
    // With `CI=true`, typescript-eslint parses the file on disk instead of the
    // text passed to `lintText`, so the fixtures below would never be linted.
    env: { ...process.env, TSESTREE_SINGLE_RUN: "false" },
    input: `
      import { ESLint } from "eslint";
      const eslint = new ESLint();
      const inputs = ${JSON.stringify(cases.flatMap(({ invalid, valid }) => [invalid, valid]))};
      const results = [];
      for (const input of inputs) {
        results.push(...await eslint.lintText(
          "export function LintFixture() { return <>" + input + "</>; }",
          { filePath: "app/components/admin/icon-action-button.tsx" },
        ));
      }
      process.stdout.write(JSON.stringify(results));
    `,
  });
  const results = lintResultsSchema.parse(JSON.parse(output));
  for (const [caseIndex, { rule }] of cases.entries()) {
    const index = caseIndex * 2;
    expect(results[index]?.fatalErrorCount).toBe(0);
    expect(results[index]?.messages.map((message) => message.ruleId)).toContain(rule);
    expect(results[index + 1]).toEqual({ fatalErrorCount: 0, messages: [] });
  }
}, 30_000);
