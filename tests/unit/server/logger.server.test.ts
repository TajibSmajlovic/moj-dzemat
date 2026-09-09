// @vitest-environment node

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Logger } from "pino";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let directory: string;
let logPath: string;
let logger: Logger;

vi.mock("#app/server/env.server", () => ({
  env: () => ({ NODE_ENV: "test", AGENT_LOG_PATH: logPath }),
}));

beforeAll(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-log-test-"));
  logPath = path.join(directory, "requests.ndjson");
  ({ logger } = await import("#app/server/logger.server"));
  logger.level = "info";
});

afterAll(() => {
  fs.rmSync(directory, { recursive: true, force: true });
});

async function readEntry(requestId: string) {
  await new Promise<void>((resolve, reject) => {
    logger.flush((error) => (error ? reject(error) : resolve()));
  });
  return vi.waitFor(() => {
    const entry = fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((entry) => entry.requestId === requestId);
    if (!entry) throw new Error("Request log has not been written yet.");
    return entry;
  });
}

describe("emitted request logs", () => {
  it.each([
    "/nova-lozinka/SYNTHETIC_RESET_TOKEN",
    "/nova-lozinka/SYNTHETIC_RESET_TOKEN.data",
    "/nova-lozinka/SYNTHETIC_RESET_TOKEN/",
    "/NOVA-LOZINKA/SYNTHETIC_RESET_TOKEN",
    "/%6eova-lozinka/SYNTHETIC_RESET_TOKEN",
    "/nova-lozinka/SYNTHETIC_RESET_TOKEN%invalid",
  ])("removes the reset token from child logger bindings for %s", async (requestPath) => {
    const requestId = randomUUID();
    logger
      .child({ requestId, method: "GET", path: requestPath })
      .info({ statusCode: 200 }, "request completed");

    const entry = await readEntry(requestId);
    expect(entry).toMatchObject({ path: "/nova-lozinka/:token", statusCode: 200 });
    expect(JSON.stringify(entry)).not.toContain("SYNTHETIC_RESET_TOKEN");
  });

  it("also sanitizes paths supplied by redirect and error log calls", async () => {
    const requestId = randomUUID();
    logger
      .child({ requestId })
      .warn(
        { path: "/nova-lozinka/SYNTHETIC_RESET_TOKEN?token=SYNTHETIC_QUERY" },
        "redirect to canonical host",
      );

    const entry = await readEntry(requestId);
    expect(entry?.path).toBe("/nova-lozinka/:token");
    expect(JSON.stringify(entry)).not.toContain("SYNTHETIC_");
  });

  it("keeps useful public paths and existing credential redaction", async () => {
    const requestId = randomUUID();
    logger.child({ requestId, path: "/objave/dzuma?search=SYNTHETIC_QUERY" }).info({
      token: "SYNTHETIC_TOKEN",
      password: "SYNTHETIC_PASSWORD",
      email: "synthetic@example.com",
      headers: { cookie: "SYNTHETIC_COOKIE", authorization: "SYNTHETIC_AUTH" },
    });

    const entry = await readEntry(requestId);
    expect(entry).toMatchObject({
      path: "/objave/dzuma",
      token: "[REDACTED]",
      password: "[REDACTED]",
      email: "[REDACTED]",
      headers: { cookie: "[REDACTED]", authorization: "[REDACTED]" },
    });
    expect(JSON.stringify(entry)).not.toContain("SYNTHETIC_");
  });
});
