import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runTasks } from "../checks/runner";
import { copyWorkspace } from "../checks/workspace";

const root = path.resolve(import.meta.dirname, "../..");
// Keep signals from exiting during synchronous copying or removal. runTasks stops active groups.
function cancel(signal: NodeJS.Signals): void {
  process.exitCode = signal === "SIGINT" ? 130 : 143;
}
process.on("SIGINT", cancel);
process.on("SIGTERM", cancel);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-verify-"));
const started = performance.now();
const suites = [
  { name: "test:e2e", directory: "e2e", args: ["--import", "tsx", "scripts/run-e2e-tests.ts"] },
  { name: "test:pwa", directory: "pwa", args: ["--import", "tsx", "scripts/pwa/run-tests.ts"] },
  {
    name: "check:push",
    directory: "checks",
    args: ["--import", "tsx", "scripts/verify.ts", "push"],
  },
];

try {
  const tasks = suites.map(({ name, directory, args }) => {
    const cwd = path.join(temporaryDirectory, directory);
    copyWorkspace(root, cwd);
    return { name, command: process.execPath, args, cwd, graceful: true };
  });
  console.log(
    `[verify] Isolated workspaces prepared in ${((performance.now() - started) / 1000).toFixed(1)}s`,
  );
  await runTasks(
    [
      ...tasks,
      // Both dev-browser tools need real dependency paths inside the checkout. Storybook does not
      // generate route types; smoke can replace them because typed checks use their own copy.
      {
        name: "test:storybook",
        command: process.execPath,
        args: ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.storybook.config.ts"],
        cwd: root,
        graceful: true,
      },
      {
        name: "agent:smoke",
        command: process.execPath,
        args: ["--import", "tsx", "scripts/agent/smoke.ts"],
        cwd: root,
        graceful: true,
      },
    ],
    tasks.length + 2,
  );
  console.log(
    `[verify] All checks passed in ${((performance.now() - started) / 1000).toFixed(1)}s`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode ??= 1;
  // CI reporters write inside their workspace; preserve those reports before removing the copies.
  for (const { directory } of suites) {
    for (const name of ["test-results", "playwright-report", "playwright-pwa-report"]) {
      const source = path.join(temporaryDirectory, directory, name);
      if (fs.existsSync(source)) {
        const destination = path.join(
          root,
          "test-results",
          "verify",
          path.basename(temporaryDirectory),
          directory,
          name,
        );
        fs.cpSync(source, destination, { recursive: true });
        console.error(`[verify] Evidence retained at ${destination}`);
      }
    }
  }
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  process.off("SIGINT", cancel);
  process.off("SIGTERM", cancel);
}
