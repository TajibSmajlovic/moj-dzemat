import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

type RuntimeManifest = {
  run_id: string;
  url: string;
  pid: number;
  state_path: string;
  log_path: string;
  process_log_path: string;
  started_at: string;
};

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
  const level =
    typeof entry.level === "number"
      ? logLevels.get(entry.level)
      : typeof entry.level === "string"
        ? entry.level
        : undefined;
  if (filters.level && level !== filters.level) return false;
  if (filters.requestId && entry.requestId !== filters.requestId) return false;
  if (filters.component && entry.component !== filters.component) return false;
  if (filters.text && !rawLine.toLocaleLowerCase().includes(filters.text.toLocaleLowerCase())) {
    return false;
  }

  return true;
}

export function loadOwnedManifest(manifestPath: string): {
  manifest: RuntimeManifest;
  manifestPath: string;
} {
  const absoluteManifest = path.resolve(manifestPath);
  const manifest = JSON.parse(fs.readFileSync(absoluteManifest, "utf8")) as Record<string, unknown>;

  if (!manifest || typeof manifest !== "object") {
    throw new Error("Runtime manifest must contain a JSON object.");
  }
  if (typeof manifest.state_path !== "string" || !isOwnedStatePath(manifest.state_path)) {
    throw new Error("Refusing runtime operation: state_path is outside the owned temp namespace.");
  }

  const statePath = path.resolve(manifest.state_path);
  const stateStat = fs.lstatSync(statePath);
  if (!stateStat.isDirectory() || stateStat.isSymbolicLink()) {
    throw new Error("Refusing runtime operation: state_path must be a real directory.");
  }
  if (absoluteManifest !== path.join(statePath, "manifest.json")) {
    throw new Error("Refusing runtime operation: manifest must be inside its declared state_path.");
  }

  for (const key of ["run_id", "url", "log_path", "process_log_path", "started_at"]) {
    if (typeof manifest[key] !== "string") {
      throw new TypeError(`Runtime manifest is missing ${key}.`);
    }
  }
  if (
    typeof manifest.pid !== "number" ||
    !Number.isSafeInteger(manifest.pid) ||
    manifest.pid <= 0
  ) {
    throw new Error("Runtime manifest contains an invalid pid.");
  }
  const checkedManifest = manifest as RuntimeManifest;
  for (const logPath of [checkedManifest.log_path, checkedManifest.process_log_path]) {
    const relative = path.relative(statePath, path.resolve(logPath));
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Refusing runtime operation: a log path is outside state_path.");
    }
  }

  return { manifest: checkedManifest, manifestPath: absoluteManifest };
}

async function startRuntime(options: { keepStateOnFailure: boolean }): Promise<void> {
  const statePath = fs.mkdtempSync(path.join(runtimeParent, runtimePrefix));
  const runId = `agent-${path.basename(statePath).slice(runtimePrefix.length)}`;
  const databasePath = path.join(statePath, "runtime.db");
  const logPath = path.join(statePath, "app.ndjson");
  const processLogPath = path.join(statePath, "process.log");
  const manifestPath = path.join(statePath, "manifest.json");
  let child: ChildProcess | null = null;

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

    runStep(
      "database migrations",
      process.execPath,
      [path.join(projectRoot, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
      environment,
    );
    runStep(
      "deterministic seed",
      process.execPath,
      ["--import", "tsx", path.join(projectRoot, "scripts", "agent", "seed.ts")],
      environment,
    );

    const processLog = fs.openSync(processLogPath, "wx");
    child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
      cwd: projectRoot,
      env: environment,
      detached: process.platform !== "win32",
      stdio: ["ignore", processLog, processLog],
    });
    fs.closeSync(processLog);
    child.unref();

    if (child.pid === undefined) {
      throw new Error("Agent runtime process started without a pid.");
    }

    await waitForRuntime({ child, runId, url, timeoutMs: 120_000 });

    const manifest = {
      version: 1,
      run_id: runId,
      url,
      pid: child.pid,
      state_path: statePath,
      log_path: logPath,
      process_log_path: processLogPath,
      database: databasePath,
      started_at: new Date().toISOString(),
      stop_command: `npm run agent:stop -- --manifest ${manifestPath}`,
    };
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

    console.log(`Agent runtime ready at ${url}`);
    console.log(`AGENT_RUNTIME_MANIFEST=${manifestPath}`);
    console.log(`Logs: npm run agent:logs -- --manifest ${manifestPath}`);
    console.log(`Stop: ${manifest.stop_command}`);
  } catch (error) {
    if (child?.pid) terminateKnownChild(child.pid);
    printStartupFailureLogs(processLogPath, logPath);
    if (options.keepStateOnFailure) {
      console.error(`Startup state retained at ${statePath}`);
    } else {
      fs.rmSync(statePath, { recursive: true, force: true });
    }
    throw error;
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
    DZEMAT_NAME: "Agent runtime",
    DZEMAT_ADDRESS: "Testna adresa 1, Sarajevo",
    DZEMAT_MAP_QUERY: "Testna adresa 1, Sarajevo",
    FACEBOOK_PAGE_URL: "",
    YOUTUBE_CHANNEL_URL: "",
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

function runStep(
  name: string,
  command: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
): void {
  console.log(`[agent-runtime] ${name}`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${name} failed${result.signal ? ` with signal ${result.signal}` : ""}.`);
  }
}

async function waitForRuntime({
  child,
  runId,
  url,
  timeoutMs,
}: {
  child: ChildProcess;
  runId: string;
  url: string;
  timeoutMs: number;
}): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastProblem = "server has not responded";

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited before readiness with code ${child.exitCode}.`);
    }

    try {
      for (const endpoint of ["/resources/healthcheck", "/resources/readiness"]) {
        const response = await fetch(`${url}${endpoint}`, { signal: AbortSignal.timeout(2000) });
        if (!response.ok) throw new Error(`${endpoint} returned ${response.status}`);
        if (response.headers.get("x-agent-run-id") !== runId) {
          throw new Error(`${endpoint} returned the wrong runtime identity`);
        }
      }
      return;
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : String(error);
      await delay(250);
    }
  }

  throw new Error(`Server did not become ready within ${timeoutMs}ms: ${lastProblem}`);
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

    terminateKnownChild(manifest.pid);
    await waitForExit(manifest.pid, 10_000);
    if (processIsAlive(manifest.pid)) {
      terminateKnownChild(manifest.pid, "SIGKILL");
      await waitForExit(manifest.pid, 2000);
    }
    if (processIsAlive(manifest.pid)) {
      throw new Error(`Owned runtime pid ${manifest.pid} did not stop.`);
    }
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
    try {
      const entry = JSON.parse(rawLine) as Record<string, unknown>;
      if (matchesLogFilters(entry, rawLine, filters)) console.log(rawLine);
    } catch {
      if (filters.level || filters.requestId || filters.component) continue;
      if (!filters.text || rawLine.toLocaleLowerCase().includes(filters.text.toLocaleLowerCase())) {
        console.log(rawLine);
      }
    }
  }

  return contents.length;
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
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
    options[name] = value;
    index += 1;
  }

  return { command, options };
}

function textOption(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function main(): Promise<void> {
  const { command, options } = parseArguments(process.argv.slice(2));

  if (command === "start") {
    await startRuntime({ keepStateOnFailure: Boolean(options.keep_state_on_failure) });
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
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
