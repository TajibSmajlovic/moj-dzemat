import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import { runTasks } from "../checks/runner";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-pwa-tests-"));
let succeeded = false;

try {
  const port = await reserveLoopbackPort();
  const appUrl = `http://127.0.0.1:${port}`;
  const databasePath = path.join(temporaryDirectory, "pwa-tests.db");
  // Prisma's SQLite migration engine expects the target file to exist. The
  // directory is unique to this run, so exclusive creation also protects the
  // isolation guarantee from an accidental path reuse.
  fs.closeSync(fs.openSync(databasePath, "wx"));
  const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
  const testEnvironment = {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: "pwa-test-session-secret-at-least-32-characters",
    PASSWORD_RESET_SECRET: "pwa-test-reset-secret-at-least-32-characters",
    HONEYPOT_SECRET: "pwa-test-honeypot-secret-at-least-32-characters",
    RESEND_API_KEY: "pwa-test-resend-key-never-used",
    EMAIL_FROM: "Moj Džemat PWA test <noreply@example.com>",
    DZEMAT_NAME: "PWA test",
    DZEMAT_ADDRESS: "Testna adresa 1, Sarajevo",
    DZEMAT_MAP_QUERY: "Testna adresa 1, Sarajevo",
    FACEBOOK_PAGE_URL: "",
    YOUTUBE_CHANNEL_URL: "",
    CLOUDFLARE_WEB_ANALYTICS_TOKEN: "",
    APP_URL: appUrl,
    PORT: String(port),
    PWA_TEST_PORT: String(port),
    PWA_TEST_RUN: "true",
    PWA_TEST_TEMP_DIR: temporaryDirectory,
    ENABLE_TEST_ROUTES: "false",
    HONEYPOT_SKIP_MIN_AGE: "false",
    DISABLE_RATE_LIMITING: "false",
  };

  await run("production build", "npm", ["run", "build"], testEnvironment);
  await run(
    "temporary database migrations",
    "npx",
    ["prisma", "migrate", "deploy"],
    testEnvironment,
  );
  await run(
    "deterministic temporary database seed",
    process.execPath,
    ["--import", "tsx", "scripts/pwa/seed-tests.ts"],
    testEnvironment,
  );
  await run(
    "focused production PWA browser suite",
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.pwa.config.ts"],
    testEnvironment,
    true,
  );
  succeeded = true;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode ??= 1;
} finally {
  if (succeeded || process.env.CI) {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  } else {
    console.error(`PWA failure state retained at ${temporaryDirectory}`);
  }
}

async function run(
  stepName: string,
  command: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
  graceful = false,
): Promise<void> {
  console.log(`[pwa-test] ${stepName}`);

  await runTasks([
    { name: stepName, command, args: [...args], cwd: projectRoot, env: environment, graceful },
  ]);
}

function reserveLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.addListener("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a loopback port for the PWA test server."));
        return;
      }

      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}
