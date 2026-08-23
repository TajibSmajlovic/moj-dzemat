import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-e2e-tests-"));
let succeeded = false;

try {
  const port = await reserveLoopbackPort();
  const appUrl = `http://127.0.0.1:${port}`;
  const databasePath = path.join(temporaryDirectory, "e2e.db");
  fs.closeSync(fs.openSync(databasePath, "wx"));

  const environment = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: `file:${databasePath.replaceAll("\\", "/")}`,
    APP_URL: appUrl,
    PORT: String(port),
    E2E_TEST_PORT: String(port),
    E2E_TEST_TEMP_DIR: temporaryDirectory,
    E2E_TEST_DATABASE_PATH: databasePath,
    ENABLE_TEST_ROUTES: "true",
    HONEYPOT_SKIP_MIN_AGE: "true",
    DISABLE_RATE_LIMITING: "true",
    TZ: "Europe/Sarajevo",
  };

  run("e2e production build", "npm", ["run", "build:e2e"], environment);
  run(
    "isolated browser suite",
    "npx",
    ["playwright", "test", ...process.argv.slice(2)],
    environment,
  );
  succeeded = true;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (succeeded || process.env.CI) {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  } else {
    console.error(`E2E failure state retained at ${temporaryDirectory}`);
  }
}

function run(
  stepName: string,
  command: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
): void {
  console.log(`[e2e] ${stepName}`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${stepName} failed${result.signal ? ` with signal ${result.signal}` : ""}.`);
  }
}

function reserveLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.addListener("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a loopback port for the E2E server."));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}
