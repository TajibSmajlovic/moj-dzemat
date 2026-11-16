import { spawn, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";

import { exitOnUnsupportedNode } from "../checks/node-version";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runtimePrefix = "moj-dzemat-agent-";
const runtimeParent = path.resolve(os.tmpdir());
const canonicalRuntimeParent = fs.realpathSync(runtimeParent);
const logLevels = new Map([
  [10, "trace"],
  [20, "debug"],
  [30, "info"],
  [40, "warn"],
  [50, "error"],
  [60, "fatal"],
]);

function secret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

const RuntimeManifestSchema = z.looseObject({
  state_path: z.string(),
  run_id: z.string(),
  url: z.string(),
  log_path: z.string(),
  process_log_path: z.string(),
  started_at: z.string(),
  pid: z.number().int().positive(),
});
type RuntimeManifest = z.infer<typeof RuntimeManifestSchema>;

type LogFilters = {
  level?: string;
  requestId?: string;
  component?: string;
  text?: string;
  follow?: boolean;
};

type RuntimeOptions = Record<string, string | boolean>;

export function isOwnedStatePath(candidate: string): boolean {
  const absolute = path.resolve(candidate);
  const parent = path.dirname(absolute);
  const basename = path.basename(absolute);

  try {
    return fs.realpathSync(parent) === canonicalRuntimeParent && basename.startsWith(runtimePrefix);
  } catch {
    return false;
  }
}

export function matchesLogFilters(
  entry: Record<string, unknown>,
  rawLine: string,
  filters: LogFilters,
): boolean {
  const values = {
    level: logLevel(entry.level),
    requestId: entry.requestId,
    component: entry.component,
  };
  const matchesFields = (["level", "requestId", "component"] as const).every((key) => {
    const expected = filters[key];
    return !expected || values[key] === expected;
  });
  return matchesFields && matchesLogText(rawLine, filters.text);
}

function logLevel(value: unknown): string | undefined {
  if (typeof value === "number") return logLevels.get(value);
  return typeof value === "string" ? value : undefined;
}

function matchesLogText(rawLine: string, text?: string): boolean {
  return !text || rawLine.toLocaleLowerCase().includes(text.toLocaleLowerCase());
}

export function loadOwnedManifest(manifestPath: string): {
  manifest: RuntimeManifest;
  manifestPath: string;
} {
  const absoluteManifest = path.resolve(manifestPath);
  const manifest: unknown = JSON.parse(fs.readFileSync(absoluteManifest, "utf8"));
  const statePath = ownedManifestDirectory(manifest, absoluteManifest);

  const checkedManifest = parseManifest(manifest);
  checkLogPaths(checkedManifest, statePath);

  return { manifest: checkedManifest, manifestPath: absoluteManifest };
}

function ownedManifestDirectory(manifest: unknown, absoluteManifest: string): string {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Runtime manifest must contain a JSON object.");
  }
  if (!("state_path" in manifest)) {
    throw new Error("Refusing runtime operation: state_path is outside the owned temp namespace.");
  }
  const statePath = ownedStateDirectory(manifest.state_path);
  if (absoluteManifest !== path.join(statePath, "manifest.json")) {
    throw new Error("Refusing runtime operation: manifest must be inside its declared state_path.");
  }
  return statePath;
}

function ownedStateDirectory(candidate: unknown): string {
  if (typeof candidate !== "string" || !isOwnedStatePath(candidate)) {
    throw new Error("Refusing runtime operation: state_path is outside the owned temp namespace.");
  }
  const statePath = path.resolve(candidate);
  const stateStat = fs.lstatSync(statePath);
  if (!stateStat.isDirectory() || stateStat.isSymbolicLink()) {
    throw new Error("Refusing runtime operation: state_path must be a real directory.");
  }

  return statePath;
}

function checkLogPaths(manifest: RuntimeManifest, statePath: string): void {
  for (const logPath of [manifest.log_path, manifest.process_log_path]) {
    const relative = path.relative(statePath, path.resolve(logPath));
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Refusing runtime operation: a log path is outside state_path.");
    }
  }
}

function parseManifest(value: unknown): RuntimeManifest {
  const result = RuntimeManifestSchema.safeParse(value);
  if (result.success) return result.data;
  const field = result.error.issues[0]?.path[0];
  if (field === "pid") throw new Error("Runtime manifest contains an invalid pid.");
  throw new TypeError(`Runtime manifest is missing ${String(field)}.`);
}

async function startRuntime(options: {
  keepStateOnFailure: boolean;
  signal: AbortSignal;
  timeoutMs: number;
}): Promise<void> {
  const statePath = fs.mkdtempSync(path.join(runtimeParent, runtimePrefix));
  const runId = `agent-${path.basename(statePath).slice(runtimePrefix.length)}`;
  const databasePath = path.join(statePath, "runtime.db");
  const logPath = path.join(statePath, "app.ndjson");
  const processLogPath = path.join(statePath, "process.log");
  const manifestPath = path.join(statePath, "manifest.json");
  const owned: { child: ChildProcess | null } = { child: null };

  try {
    fs.closeSync(fs.openSync(databasePath, "wx"));
    fs.closeSync(fs.openSync(logPath, "wx"));
    const port = await reserveLoopbackPort();
    const url = `http://127.0.0.1:${port}`;
    const environment = runtimeEnvironment({
      databasePath,
      logPath,
      port,
      runId,
      statePath,
      url,
    });

    await migrateAndSeed(environment, options.signal, owned);

    const processLog = fs.openSync(processLogPath, "wx");
    const child = (owned.child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
      cwd: projectRoot,
      env: environment,
      detached: process.platform !== "win32",
      stdio: ["ignore", processLog, processLog],
    }));
    fs.closeSync(processLog);
    await once(child, "spawn", { signal: options.signal });

    if (child.pid === undefined) {
      throw new Error("Agent runtime process started without a pid.");
    }

    const manifest = startingManifest({ statePath, runId, url, pid: child.pid });
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

    console.log(`AGENT_RUNTIME_MANIFEST=${manifestPath}`);
    await waitForRuntime({
      child,
      runId,
      url,
      timeoutMs: options.timeoutMs,
      signal: options.signal,
    });
    options.signal.throwIfAborted();
    manifest.status = "ready";
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    child.unref();

    console.log(`Agent runtime ready at ${url}`);
    console.log(`Logs: npm run agent:logs -- --manifest ${manifestPath}`);
    console.log(`Stop: ${manifest.stop_command}`);
  } catch (error) {
    await cleanupStartup({
      child: owned.child,
      statePath,
      processLogPath,
      logPath,
      keepStateOnFailure: options.keepStateOnFailure,
      error,
    });
    throw error;
  }
}

async function migrateAndSeed(
  environment: NodeJS.ProcessEnv,
  signal: AbortSignal,
  owned: { child: ChildProcess | null },
): Promise<void> {
  const steps = [
    [
      "database migrations",
      [path.join(projectRoot, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
    ],
    [
      "deterministic seed",
      ["--import", "tsx", path.join(projectRoot, "scripts", "agent", "seed.ts")],
    ],
  ] as const;
  for (const [name, args] of steps) {
    signal.throwIfAborted();
    console.log(`[agent-runtime] ${name}`);
    owned.child = spawn(process.execPath, args, {
      cwd: projectRoot,
      env: environment,
      stdio: "inherit",
      detached: process.platform !== "win32",
    });
    await once(owned.child, "spawn", { signal });
    await once(owned.child, "exit", { signal });
    const code = owned.child.exitCode;
    if (code !== 0) throw new Error(`${name} failed with code ${String(code)}.`);
    owned.child = null;
  }
  signal.throwIfAborted();
}

function startingManifest({
  statePath,
  runId,
  url,
  pid,
}: {
  statePath: string;
  runId: string;
  url: string;
  pid: number;
}) {
  const databasePath = path.join(statePath, "runtime.db");
  const logPath = path.join(statePath, "app.ndjson");
  const processLogPath = path.join(statePath, "process.log");
  const manifestPath = path.join(statePath, "manifest.json");
  return {
    version: 1,
    status: "starting",
    run_id: runId,
    url,
    pid,
    state_path: statePath,
    log_path: logPath,
    process_log_path: processLogPath,
    database: databasePath,
    started_at: new Date().toISOString(),
    stop_command: `npm run agent:stop -- --manifest ${manifestPath}`,
  };
}

async function cleanupStartup({
  child,
  statePath,
  processLogPath,
  logPath,
  keepStateOnFailure,
  error,
}: {
  child: ChildProcess | null;
  statePath: string;
  processLogPath: string;
  logPath: string;
  keepStateOnFailure: boolean;
  error: unknown;
}): Promise<void> {
  if (child?.pid && child.exitCode === null && child.signalCode === null) {
    try {
      await stopProcess(child.pid);
    } catch (cleanupError) {
      console.error(`Startup cleanup failed. State retained at ${statePath}`);
      throw new AggregateError([error, cleanupError], "Runtime startup and cleanup failed.", {
        cause: cleanupError,
      });
    }
  }
  printStartupFailureLogs(processLogPath, logPath);
  if (keepStateOnFailure) {
    console.error(`Startup state retained at ${statePath}`);
  } else {
    fs.rmSync(statePath, { recursive: true, force: true });
  }
}

function runtimeEnvironment({
  databasePath,
  logPath,
  port,
  runId,
  statePath,
  url,
}: {
  databasePath: string;
  logPath: string;
  port: number;
  runId: string;
  statePath: string;
  url: string;
}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: `file:${databasePath.replaceAll("\\", "/")}`,
    SESSION_SECRET: secret(),
    PASSWORD_RESET_SECRET: secret(),
    HONEYPOT_SECRET: secret(),
    EMAIL_FROM: "Moj Džemat agent runtime <noreply@example.com>",
    CLOUDFLARE_WEB_ANALYTICS_TOKEN: "",
    WEB_PUSH_ENABLED: "false",
    APP_URL: url,
    PORT: String(port),
    ENABLE_TEST_ROUTES: "true",
    HONEYPOT_SKIP_MIN_AGE: "true",
    DISABLE_RATE_LIMITING: "true",
    AGENT_RUN_ID: runId,
    AGENT_LOG_PATH: logPath,
    AGENT_STATE_DIR: statePath,
    TZ: "Europe/Sarajevo",
  };
}

async function waitForRuntime({
  child,
  runId,
  url,
  timeoutMs,
  signal,
}: {
  child: ChildProcess;
  runId: string;
  url: string;
  timeoutMs: number;
  signal: AbortSignal;
}): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastProblem = "server has not responded";

  while (Date.now() < deadline) {
    signal.throwIfAborted();
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Server exited before readiness: ${child.signalCode ?? child.exitCode}.`);
    }

    try {
      await checkReadiness(url, runId, signal);
      return;
    } catch (error) {
      signal.throwIfAborted();
      lastProblem = error instanceof Error ? error.message : String(error);
      await delay(250);
    }
  }

  throw new Error(`Server did not become ready within ${timeoutMs}ms: ${lastProblem}`);
}

async function checkReadiness(url: string, runId: string, signal: AbortSignal): Promise<void> {
  for (const endpoint of ["/resources/healthcheck", "/resources/readiness"]) {
    const response = await fetch(`${url}${endpoint}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(2000)]),
    });
    if (!response.ok) throw new Error(`${endpoint} returned ${response.status}`);
    if (response.headers.get("x-agent-run-id") !== runId) {
      throw new Error(`${endpoint} returned the wrong runtime identity`);
    }
  }
}

async function stopRuntime(manifestPath: string, keepState: boolean): Promise<void> {
  const { manifest } = loadOwnedManifest(manifestPath);
  const alive = processIsAlive(manifest.pid);

  if (alive) {
    const identity = await runtimeIdentity(manifest.url);
    if (identity !== manifest.run_id) {
      throw new Error(
        `Refusing to stop pid ${manifest.pid}: endpoint identity does not match ${manifest.run_id}.`,
      );
    }

    await stopProcess(manifest.pid);
  }

  if (keepState) {
    console.log(`Agent runtime stopped. State retained at ${manifest.state_path}`);
  } else {
    fs.rmSync(manifest.state_path, { recursive: true, force: true });
    console.log(`Agent runtime ${manifest.run_id} stopped and cleaned.`);
  }
}

async function runtimeIdentity(url: string): Promise<string | null> {
  try {
    const response = await fetch(`${url}/resources/healthcheck`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.headers.get("x-agent-run-id");
  } catch {
    return null;
  }
}

async function stopProcess(pid: number): Promise<void> {
  terminateKnownChild(pid);
  await waitForExit(pid, 10_000);
  if (processIsAlive(pid)) {
    terminateKnownChild(pid, "SIGKILL");
    await waitForExit(pid, 2000);
  }
  if (processIsAlive(pid)) throw new Error(`Owned runtime pid ${pid} did not stop.`);
}

function terminateKnownChild(pid: number, signal: NodeJS.Signals = "SIGTERM"): void {
  try {
    process.kill(process.platform === "win32" ? pid : -pid, signal);
  } catch (error) {
    if (!isMissingProcessError(error)) throw error;
  }
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (isMissingProcessError(error)) return false;
    throw error;
  }
}

function isMissingProcessError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ESRCH");
}

async function waitForExit(pid: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && processIsAlive(pid)) await delay(100);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function reserveLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.addListener("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a loopback port."));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

function printStartupFailureLogs(processLogPath: string, logPath: string): void {
  for (const candidate of [processLogPath, logPath]) {
    if (!fs.existsSync(candidate)) continue;
    const lines = fs.readFileSync(candidate, "utf8").trim().split("\n").slice(-40).join("\n");
    if (lines) console.error(`\nLast lines from ${candidate}:\n${lines}`);
  }
}

function printLogs(manifestPath: string, filters: LogFilters): void {
  const { manifest } = loadOwnedManifest(manifestPath);
  let offset = printLogRange(manifest.log_path, 0, filters);
  if (!filters.follow) return;

  fs.watchFile(manifest.log_path, { interval: 250 }, () => {
    offset = printLogRange(manifest.log_path, offset, filters);
  });
  process.once("SIGINT", () => {
    fs.unwatchFile(manifest.log_path);
    process.exitCode = 130;
  });
}

function printLogRange(logPath: string, offset: number, filters: LogFilters): number {
  const contents = fs.readFileSync(logPath, "utf8");
  const next = contents.slice(offset);

  for (const rawLine of next.split("\n")) {
    if (!rawLine) continue;
    printLogLine(rawLine, filters);
  }

  return contents.length;
}

function printLogLine(rawLine: string, filters: LogFilters): void {
  try {
    const entry = JSON.parse(rawLine) as Record<string, unknown>;
    if (matchesLogFilters(entry, rawLine, filters)) console.log(rawLine);
  } catch {
    if ([filters.level, filters.requestId, filters.component].some(Boolean)) return;
    if (matchesLogText(rawLine, filters.text)) {
      console.log(rawLine);
    }
  }
}

function parseArguments(argv: readonly string[]): { command: string; options: RuntimeOptions } {
  const [command = "start", ...rest] = argv;
  const options: RuntimeOptions = {};

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (!argument?.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const name = argument.slice(2).replaceAll("-", "_");
    if (["follow", "keep_state", "keep_state_on_failure"].includes(name)) {
      options[name] = true;
      continue;
    }
    const value = rest[index + 1];
    options[name] = argumentValue(argument, value);
    index += 1;
  }

  return { command, options };
}

function argumentValue(argument: string, value: string | undefined): string {
  if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
  return value;
}

function textOption(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function startCommand(options: RuntimeOptions): Promise<void> {
  const timeoutMs = Number(textOption(options.timeout_ms) ?? 120_000);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1)
    throw new Error("--timeout-ms must be a positive integer.");
  const controller = new AbortController();
  const cancel = (signal: NodeJS.Signals) => {
    process.exitCode = signal === "SIGINT" ? 130 : 143;
    controller.abort(new Error(`Runtime startup cancelled by ${signal}.`));
  };
  process.on("SIGINT", cancel);
  process.on("SIGTERM", cancel);
  try {
    await startRuntime({
      keepStateOnFailure: Boolean(options.keep_state_on_failure),
      signal: controller.signal,
      timeoutMs,
    });
  } finally {
    process.off("SIGINT", cancel);
    process.off("SIGTERM", cancel);
  }
}

async function main(): Promise<void> {
  const { command, options } = parseArguments(process.argv.slice(2));

  if (command === "start") {
    await startCommand(options);
    return;
  }
  const manifestPath = textOption(options.manifest);
  if (!manifestPath) throw new Error(`${command} requires --manifest <path>.`);
  if (command === "stop") {
    await stopRuntime(manifestPath, Boolean(options.keep_state));
    return;
  }
  if (command === "logs") {
    printLogs(manifestPath, {
      level: textOption(options.level),
      requestId: textOption(options.request_id),
      component: textOption(options.component),
      text: textOption(options.text),
      follow: Boolean(options.follow),
    });
    return;
  }

  throw new Error(`Unknown agent runtime command: ${command}`);
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entrypoint === import.meta.url) {
  exitOnUnsupportedNode();
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode ??= 1;
  });
}
