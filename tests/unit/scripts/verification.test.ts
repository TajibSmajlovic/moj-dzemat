import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type Task = { name: string; command: string; args: string[]; graceful?: boolean };
let runTasks: (tasks: Task[], concurrency?: number) => Promise<void>;
let checkStaged: (root: string) => Promise<boolean>;
let copyWorkspace: (root: string, destination: string) => void;
const directories: string[] = [];
const runnerUrl = pathToFileURL(path.resolve("scripts/checks/runner.ts")).href;

beforeEach(() => {
  // Git hooks export repository paths; temporary fixture repositories must not inherit them.
  for (const name of Object.keys(process.env)) {
    if (name.startsWith("GIT_")) vi.stubEnv(name, undefined);
  }
});

beforeAll(async () => {
  ({ runTasks } = (await import(runnerUrl)) as { runTasks: typeof runTasks });
  ({ checkStaged } = (await import(
    pathToFileURL(path.resolve("scripts/checks/staged.ts")).href
  )) as {
    checkStaged: typeof checkStaged;
  });
  ({ copyWorkspace } = (await import(
    pathToFileURL(path.resolve("scripts/checks/workspace.ts")).href
  )) as { copyWorkspace: typeof copyWorkspace });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-verification-test-"));
  directories.push(directory);
  return directory;
}

function nodeTask(name: string, code: string): Task {
  return { name, command: process.execPath, args: ["--input-type=module", "-e", code] };
}

function heldTask(directory: string, name: string): Task {
  return nodeTask(
    name,
    `
    import fs from 'node:fs';
    import { setTimeout } from 'node:timers/promises';
    const base = ${JSON.stringify(path.join(directory, name))};
    fs.writeFileSync(base + '.started', '');
    while (!fs.existsSync(base + '.release')) await setTimeout(10);
    fs.writeFileSync(base + '.finished', '');
  `,
  );
}

describe("verification process queue", () => {
  it("bounds concurrency and drains active work before rejecting a failure", async () => {
    const errors = vi.spyOn(console, "error");
    const directory = temporaryDirectory();
    const first = heldTask(directory, "first");
    first.args[2] += "process.exit(7);";
    const result = runTasks(
      [first, heldTask(directory, "second"), heldTask(directory, "queued")],
      2,
    ).then(
      () => undefined,
      (error: unknown) => error,
    );
    try {
      await expect.poll(() => fs.existsSync(path.join(directory, "second.started"))).toBe(true);
      expect(fs.existsSync(path.join(directory, "queued.started"))).toBe(false);
      fs.writeFileSync(path.join(directory, "first.release"), "");
      await expect
        .poll(() => errors.mock.calls.some(([line]) => line === "[verify] first failed"))
        .toBe(true);
      fs.writeFileSync(path.join(directory, "second.release"), "");
      expect(await result).toBeInstanceOf(Error);
      expect(fs.existsSync(path.join(directory, "second.finished"))).toBe(true);
      expect(fs.existsSync(path.join(directory, "queued.started"))).toBe(false);
    } finally {
      for (const name of ["first", "second", "queued"]) {
        fs.writeFileSync(path.join(directory, `${name}.release`), "");
      }
      await result;
    }
  });

  it("runs every queued check on success and reports spawn errors", async () => {
    await expect(
      runTasks([nodeTask("one", ""), nodeTask("two", ""), nodeTask("three", "")], 2),
    ).resolves.toBeUndefined();
    await expect(
      runTasks([{ name: "missing", command: "moj-dzemat-no-such-command", args: [] }]),
    ).rejects.toThrow();
    await expect(runTasks([], 0)).rejects.toThrow("positive integer");
  });

  it.skipIf(process.platform === "win32")(
    "waits for a cooperative check to clean up its detached server on cancellation",
    async () => {
      const directory = temporaryDirectory();
      const pidFile = path.join(directory, "server.pid");
      const cleaned = path.join(directory, "cleaned");
      const task = nodeTask(
        "cooperative",
        `
        import fs from 'node:fs';
        import { spawn } from 'node:child_process';
        const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { detached: true, stdio: 'ignore' });
        process.on('SIGINT', () => {
          child.once('exit', () => {
            fs.writeFileSync(${JSON.stringify(cleaned)}, '');
            process.exit(130);
          });
          child.kill('SIGTERM');
        });
        fs.writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
      `,
      );
      task.graceful = true;
      const runner = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "-e",
          `
        import { runTasks } from ${JSON.stringify(runnerUrl)};
        try { await runTasks(${JSON.stringify([task])}); }
        catch { process.exitCode ??= 1; }
      `,
        ],
        { stdio: "ignore" },
      );
      const closed = new Promise<number | null>((resolve) => runner.once("close", resolve));
      try {
        await expect.poll(() => fs.existsSync(pidFile)).toBe(true);
        const pid = Number(fs.readFileSync(pidFile, "utf8"));
        runner.kill("SIGTERM");
        expect(await closed).toBe(143);
        expect(fs.existsSync(cleaned)).toBe(true);
        expect(alive(pid)).toBe(false);
      } finally {
        await stopFixture(runner);
        if (fs.existsSync(pidFile)) {
          const pid = Number(fs.readFileSync(pidFile, "utf8"));
          if (alive(pid)) process.kill(pid, "SIGKILL");
        }
      }
    },
  );

  it.skipIf(process.platform === "win32")(
    "cancels owned descendants without stopping an unrelated process",
    async () => {
      const directory = temporaryDirectory();
      const pidFile = path.join(directory, "grandchild.pid");
      const task = nodeTask(
        "tree",
        `
      import { spawn } from 'node:child_process';
      const code = ${JSON.stringify(`
        const fs = require('node:fs');
        process.on('SIGTERM', () => {});
        fs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
        setInterval(() => {}, 1000);
      `)};
      spawn(process.execPath, ['-e', code], { stdio: 'ignore' });
      setInterval(() => {}, 1000);
    `,
      );
      const unrelated = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
        stdio: "ignore",
      });
      const runner = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "-e",
          `
      import { runTasks } from ${JSON.stringify(runnerUrl)};
      try { await runTasks(${JSON.stringify([task])}); }
      catch { process.exitCode ??= 1; }
    `,
        ],
        { stdio: "ignore" },
      );
      const closed = new Promise<number | null>((resolve) => runner.once("close", resolve));
      try {
        await expect.poll(() => fs.existsSync(pidFile)).toBe(true);
        const grandchild = Number(fs.readFileSync(pidFile, "utf8"));
        runner.kill("SIGINT");
        expect(await closed).toBe(130);
        await expect.poll(() => alive(grandchild)).toBe(false);
        expect(alive(unrelated.pid!)).toBe(true);
      } finally {
        await stopFixture(runner);
        await stopFixture(unrelated);
        if (fs.existsSync(pidFile)) {
          const pid = Number(fs.readFileSync(pidFile, "utf8"));
          if (alive(pid)) process.kill(pid, "SIGKILL");
        }
      }
    },
  );
});

describe("browser workspaces", () => {
  it("copies working changes and isolates generated files and caches while reusing dependencies", () => {
    const { root, git } = repository();
    fs.writeFileSync(
      path.join(root, ".gitignore"),
      "node_modules/\ngenerated/\n.env\n*.db\nbuild/\n",
    );
    fs.writeFileSync(path.join(root, "tracked.js"), "staged\n");
    fs.writeFileSync(path.join(root, "deleted.js"), "deleted\n");
    git("add", ".");
    const index = fs.readFileSync(path.join(root, ".git/index"));
    fs.writeFileSync(path.join(root, "tracked.js"), "working\n");
    fs.rmSync(path.join(root, "deleted.js"));
    fs.writeFileSync(path.join(root, "new.js"), "untracked\n");
    fs.writeFileSync(path.join(root, "local.db"), "local database");
    fs.writeFileSync(path.join(root, ".env"), "SYNTHETIC_FIXTURE=true\n");
    for (const name of ["generated", "build", "node_modules/example", "node_modules/.cache"]) {
      fs.mkdirSync(path.join(root, name), { recursive: true });
      fs.writeFileSync(path.join(root, name, "value"), name);
    }
    const first = path.join(temporaryDirectory(), "first");
    const second = path.join(temporaryDirectory(), "second");
    copyWorkspace(root, first);
    copyWorkspace(root, second);
    expect(fs.readFileSync(path.join(first, "tracked.js"), "utf8")).toBe("working\n");
    expect(fs.readFileSync(path.join(first, "new.js"), "utf8")).toBe("untracked\n");
    expect(fs.existsSync(path.join(first, ".env"))).toBe(true);
    for (const name of ["deleted.js", "local.db", "build", ".git", "node_modules/.cache"]) {
      expect(fs.existsSync(path.join(first, name))).toBe(false);
    }
    expect(fs.realpathSync(path.join(first, "node_modules/example"))).toBe(
      fs.realpathSync(path.join(root, "node_modules/example")),
    );
    for (const name of ["generated/value", "tracked.js"]) {
      fs.writeFileSync(path.join(first, name), "changed");
      expect(fs.readFileSync(path.join(second, name), "utf8")).not.toBe("changed");
      expect(fs.readFileSync(path.join(root, name), "utf8")).not.toBe("changed");
    }
    fs.mkdirSync(path.join(first, "node_modules/.cache"));
    fs.writeFileSync(path.join(first, "node_modules/.cache/value"), "isolated");
    expect(fs.existsSync(path.join(second, "node_modules/.cache"))).toBe(false);
    expect(fs.readFileSync(path.join(root, "node_modules/.cache/value"), "utf8")).toBe(
      "node_modules/.cache",
    );
    expect(fs.readFileSync(path.join(root, ".git/index"))).toEqual(index);
  });
});

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function stopFixture(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));
  child.kill("SIGKILL");
  await closed;
}

function repository(): { root: string; git: (...args: string[]) => string } {
  const root = temporaryDirectory();
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git("init", "--quiet");
  fs.writeFileSync(
    path.join(root, "eslint.config.mjs"),
    "export default [{ rules: { 'no-debugger': 'error' } }];\n",
  );
  fs.writeFileSync(path.join(root, ".prettierrc"), '{"semi":true}\n');
  return { root, git };
}

describe("staged file checks", () => {
  it("checks staged text when working text differs, preserving both versions", async () => {
    const { root, git } = repository();
    const file = "file with $dollar [brackets].js";
    fs.writeFileSync(path.join(root, file), "debugger;\n");
    git("add", "--", file);
    fs.writeFileSync(path.join(root, file), "const value = 1;\n");
    const index = git("show", `:${file}`);
    expect(await checkStaged(root)).toBe(false);
    expect(git("show", `:${file}`)).toBe(index);
    expect(fs.readFileSync(path.join(root, file), "utf8")).toBe("const value = 1;\n");

    git("add", "--", file);
    fs.writeFileSync(path.join(root, file), "debugger;\n");
    expect(await checkStaged(root)).toBe(true);
    expect(git("show", `:${file}`)).toBe("const value = 1;\n");
    expect(fs.readFileSync(path.join(root, file), "utf8")).toBe("debugger;\n");
  });

  it("reports staged formatting and skips ignored, binary, and symlink contents", async () => {
    const { root, git } = repository();
    fs.writeFileSync(path.join(root, "bad.json"), '{"value":1}');
    git("add", "bad.json");
    expect(await checkStaged(root)).toBe(false);
    git("rm", "--cached", "bad.json");
    fs.writeFileSync(path.join(root, ".prettierignore"), "ignored.json\n");
    fs.writeFileSync(path.join(root, "ignored.json"), '{"value":1}');
    fs.writeFileSync(path.join(root, "image.png"), Buffer.from([0, 1, 2, 255]));
    fs.symlinkSync("bad.json", path.join(root, "link.json"));
    git("add", "ignored.json", "image.png", "link.json");
    expect(await checkStaged(root)).toBe(true);
  });
});
