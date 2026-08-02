import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-pwa-tests-"));

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

  run("production build", "npm", ["run", "build"], testEnvironment);
  run("temporary database migrations", "npx", ["prisma", "migrate", "deploy"], testEnvironment);
  run(
    "deterministic temporary database seed",
    "npx",
    ["tsx", "scripts/seed-pwa-tests.ts"],
    testEnvironment,
  );
  run(
    "focused production PWA browser suite",
    "npx",
    ["playwright", "test", "--config=playwright.pwa.config.ts"],
    testEnvironment,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
}

function run(stepName, command, args, environment) {
  console.log(`[pwa-test] ${stepName}`);

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

function reserveLoopbackPort() {
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
