import { chromium, expect, type Browser, type Page } from "@playwright/test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../../tests/e2e/fixtures/admin-credentials";
import { loadOwnedManifest } from "./runtime";

const root = path.resolve(import.meta.dirname, "../..");
const artifacts = process.env.CI
  ? path.join(root, "test-results", "agent")
  : fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-smoke-"));
fs.mkdirSync(artifacts, { recursive: true });
type Command = { name: string; child: ChildProcess; logPath: string; error?: Error };
type Run = {
  command: Command;
  manifestPath: string;
  manifest: ReturnType<typeof loadOwnedManifest>["manifest"];
};
const starts: Command[] = [];
const commands: Command[] = [];
let browser: Browser | undefined;
let passed = false;
let cleaning = false;
const cancellation = new AbortController();
function cancel(signal: NodeJS.Signals): void {
  process.exitCode = signal === "SIGINT" ? 130 : 143;
  cancellation.abort(new Error(`Smoke check cancelled by ${signal}.`));
}
process.on("SIGINT", cancel);
process.on("SIGTERM", cancel);

async function main(): Promise<void> {
  console.log("[agent-smoke] starting two isolated runtimes");
  const firstStart = start("first");
  const secondStart = start("second");
  await Promise.all([completed(firstStart), completed(secondStart)]);
  const first = readRun(firstStart);
  const second = readRun(secondStart);
  for (const key of ["run_id", "url", "pid", "state_path", "log_path"] as const) {
    assert.notEqual(first.manifest[key], second.manifest[key], `${key} is shared`);
  }
  assert.equal(first.manifest.status, "ready");
  assert.equal(second.manifest.status, "ready");

  browser = await chromium.launch();
  console.log("[agent-smoke] cold public/admin interactions and WebSocket isolation");
  await inspectBrowser(first, false);
  await inspectBrowser(second, true);
  await checkLogs(first);
  console.log("[agent-smoke] stopping one runtime leaves the other healthy");
  await stop(first);
  await healthy(second);
  await stop(second);

  // Hold only the launcher's probe, leaving the app's real health endpoint
  // available to verify ownership before exercising cancellation and timeout.
  const shim = path.join(artifacts, "hold-readiness.mjs");
  fs.writeFileSync(
    shim,
    'globalThis.fetch = async () => new Response("Readiness held by smoke check", { status: 503 });\n',
  );
  console.log("[agent-smoke] interrupted startup cleanup");
  const interrupted = start("interrupted", [], shim);
  await until(() => Boolean(manifestPath(interrupted)), "startup manifest");
  const interruptedRun = readRun(interrupted);
  assert.equal(interruptedRun.manifest.status, "starting");
  await until(async () => {
    try {
      await healthy(interruptedRun);
      return true;
    } catch {
      return false;
    }
  }, "interrupted runtime identity");
  interrupted.child.kill("SIGINT");
  await completed(interrupted, 130);
  assertCleaned(interruptedRun);

  console.log("[agent-smoke] readiness failure cleanup");
  const failed = start("timeout", ["--timeout-ms", "3000"], shim);
  await until(() => Boolean(manifestPath(failed)), "failure manifest");
  const failedRun = readRun(failed);
  await completed(failed, 1);
  assertCleaned(failedRun);
  passed = true;
}

function launch(name: string, args: string[], preload?: string): Command {
  if (!cleaning) cancellation.signal.throwIfAborted();
  const logPath = path.join(artifacts, `${name}.log`);
  const log = fs.openSync(logPath, "w");
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      ...(preload ? ["--import", preload] : []),
      "scripts/agent/runtime.ts",
      ...args,
    ],
    {
      cwd: root,
      stdio: ["ignore", log, log],
    },
  );
  fs.closeSync(log);
  const command: Command = { name, child, logPath };
  child.once("error", (error) => {
    command.error = error;
  });
  commands.push(command);
  return command;
}

function start(name: string, args: string[] = [], preload?: string): Command {
  const command = launch(name, ["start", ...args], preload);
  starts.push(command);
  return command;
}

async function completed(command: Command, code = 0): Promise<void> {
  await until(
    () =>
      command.child.exitCode !== null ||
      command.child.signalCode !== null ||
      Boolean(command.error),
    `${command.name} exit`,
    150_000,
  );
  if (command.error) throw command.error;
  assert.equal(
    command.child.exitCode,
    code,
    `${command.name} exited unexpectedly; see ${command.logPath}`,
  );
}

function manifestPath(command: Command): string | undefined {
  return /^AGENT_RUNTIME_MANIFEST=(.+)$/mu.exec(fs.readFileSync(command.logPath, "utf8"))?.[1];
}

function readRun(command: Command): Run {
  const file = manifestPath(command);
  assert.ok(file, `Missing manifest in ${command.logPath}`);
  return { command, manifestPath: file, manifest: loadOwnedManifest(file).manifest };
}

async function healthy(run: Run): Promise<void> {
  const response = await fetch(`${run.manifest.url}/resources/readiness`, {
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-agent-run-id"), run.manifest.run_id);
}

async function stop(run: Run): Promise<void> {
  await completed(launch(`${run.command.name}-stop`, ["stop", "--manifest", run.manifestPath]));
  assertCleaned(run);
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ESRCH")
      return false;
    throw error;
  }
}

function assertCleaned(run: Run): void {
  assert.equal(alive(run.manifest.pid), false, `Runtime ${run.manifest.run_id} is still alive`);
  assert.equal(
    fs.existsSync(run.manifest.state_path),
    false,
    `State remains at ${run.manifest.state_path}`,
  );
}

async function inspectBrowser(run: Run, mobile: boolean): Promise<void> {
  assert.ok(browser);
  const context = await browser.newContext({
    baseURL: run.manifest.url,
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const errors: string[] = [];
  const sockets: string[] = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    await (url.origin === run.manifest.url
      ? route.continue()
      : route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<!doctype html><title>External content omitted in local check</title>",
        }));
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  page.on("requestfailed", (request) =>
    errors.push(`${new URL(request.url()).pathname}: ${request.failure()?.errorText}`),
  );
  page.on("websocket", (socket) => sockets.push(new URL(socket.url()).host));
  const documents: string[] = [];
  page.on("request", (request) => {
    // Router history updates also emit frame navigation events. Count actual
    // document requests to detect dependency-triggered browser reloads.
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documents.push(request.url());
  });

  async function visit(route: string): Promise<void> {
    documents.length = 0;
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.locator("vite-error-overlay")).toHaveCount(0);
    await toggleTheme(page);
    assert.equal(documents.length, 1, `Unexpected reload while opening ${route}`);
  }

  try {
    await visit("/");
    assert.match(await page.title(), /Moj Džemat/);
    await visit("/pitanja-i-odgovori");
    const disclosure = page.locator("details").first();
    await disclosure.locator("summary").click();
    await expect(disclosure).toHaveAttribute("open", "");
    await page.goto("/prijava", { waitUntil: "networkidle" });
    await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
    await page.getByLabel("Lozinka", { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Prijavi se" }).click();
    await page.waitForURL("**/admin/objave");
    await visit("/admin/objave/nova");
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.fill("Provjera izolovanog uređivača.");
    await expect(editor).toContainText("Provjera izolovanog uređivača.");
    assert.ok(sockets.length > 0, "No Vite browser connection observed");
    assert.ok(
      sockets.every((host) => host === new URL(run.manifest.url).host),
      "Vite connected outside this runtime's port",
    );
    assert.deepEqual(errors, [], "Browser errors; inspect retained browser evidence");
  } finally {
    fs.writeFileSync(
      path.join(artifacts, `${run.command.name}-browser.json`),
      JSON.stringify({ errors, sockets, documents, url: page.url() }, null, 2).replaceAll(
        /token=[a-zA-Z0-9_-]+/gu,
        "token=[REDACTED]",
      ),
    );
    try {
      await page.screenshot({
        path: path.join(artifacts, `${run.command.name}-browser.png`),
        caret: "initial",
      });
    } finally {
      await context.close();
    }
  }
}

async function toggleTheme(page: Page): Promise<void> {
  const dark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
  await page
    .getByRole("button", { name: /Uključi (tamnu|svijetlu) temu/ })
    .first()
    .click();
  await expect(page.locator("html")).toHaveClass(dark ? /^(?!.*\bdark\b)/u : /\bdark\b/u);
}

async function checkLogs(run: Run): Promise<void> {
  console.log("[agent-smoke] request correlation and redacted logs");
  const requestId = `${run.manifest.run_id}-correlation`;
  const marker = "SYNTHETIC_SMOKE_TOKEN";
  const response = await fetch(`${run.manifest.url}/nova-lozinka/${marker}?token=${marker}`, {
    headers: { "x-request-id": requestId },
  });
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("x-request-id"), requestId);
  await until(
    () => fs.readFileSync(run.manifest.log_path, "utf8").includes(requestId),
    "request log",
  );
  const query = launch("query-logs", [
    "logs",
    "--manifest",
    run.manifestPath,
    "--request-id",
    requestId,
  ]);
  await completed(query);
  const entries = fs
    .readFileSync(query.logPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    assert.equal(entry.requestId, requestId);
    assert.equal(entry.runId, run.manifest.run_id);
    assert.equal(entry.path, "/nova-lozinka/:token");
  }
  assert.equal(fs.readFileSync(run.manifest.log_path, "utf8").includes(marker), false);
}

async function until(
  check: () => boolean | Promise<boolean>,
  description: string,
  timeout = 30_000,
): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!cleaning) cancellation.signal.throwIfAborted();
    if (await check()) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

try {
  await main();
  cancellation.signal.throwIfAborted();
} catch (error) {
  passed = false;
  console.error(error instanceof Error ? error.message : error);
  process.exitCode ??= 1;
} finally {
  cleaning = true;
  await browser?.close().catch((error: unknown) => {
    passed = false;
    console.error(error instanceof Error ? error.message : error);
  });
  for (const command of commands) {
    if (command.child.exitCode === null && command.child.signalCode === null && !command.error) {
      command.child.kill("SIGTERM");
      await until(
        () => command.child.exitCode !== null || command.child.signalCode !== null,
        `${command.name} cancellation`,
        20_000,
      ).catch(() => {
        passed = false;
      });
    }
  }
  for (const command of starts) {
    const file = manifestPath(command);
    if (!file || !fs.existsSync(file)) continue;
    try {
      const run = readRun(command);
      for (const log of [run.manifest.log_path, run.manifest.process_log_path]) {
        if (fs.existsSync(log))
          fs.copyFileSync(log, path.join(artifacts, `${command.name}-${path.basename(log)}`));
      }
      await stop(run);
    } catch (error) {
      passed = false;
      console.error(
        `Cleanup failed for ${file}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (passed) {
    fs.rmSync(artifacts, { recursive: true });
    console.log("[agent-smoke] passed; all owned runtime state cleaned");
  } else {
    process.exitCode ??= 1;
    console.error(`[agent-smoke] evidence retained at ${artifacts}`);
  }
  process.off("SIGINT", cancel);
  process.off("SIGTERM", cancel);
}
