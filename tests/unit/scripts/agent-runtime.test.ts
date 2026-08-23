import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

type RuntimeModule = {
  isOwnedStatePath: (candidate: string) => boolean;
  loadOwnedManifest: (manifestPath: string) => { manifest: Record<string, unknown> };
  matchesLogFilters: (
    entry: Record<string, unknown>,
    rawLine: string,
    filters: Record<string, string | undefined>,
  ) => boolean;
};

let runtime: RuntimeModule;
const temporaryPaths: string[] = [];

beforeAll(async () => {
  const runtimeUrl = pathToFileURL(path.resolve("scripts/agent/runtime.ts")).href;
  runtime = (await import(runtimeUrl)) as RuntimeModule;
});

afterEach(() => {
  for (const temporaryPath of temporaryPaths.splice(0)) {
    fs.rmSync(temporaryPath, { recursive: true, force: true });
  }
});

describe("agent runtime ownership", () => {
  it("accepts only a direct child of the OS temp directory with the runtime prefix", () => {
    expect(runtime.isOwnedStatePath(path.join(os.tmpdir(), "moj-dzemat-agent-safe"))).toBe(true);
    expect(runtime.isOwnedStatePath(path.join(os.tmpdir(), "other-agent-safe"))).toBe(false);
    expect(
      runtime.isOwnedStatePath(path.join(os.tmpdir(), "nested", "moj-dzemat-agent-safe")),
    ).toBe(false);
  });

  it("rejects manifests whose state path is a symlink", () => {
    const actual = fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-agent-real-"));
    const symlink = path.join(os.tmpdir(), `moj-dzemat-agent-link-${process.pid}-${Date.now()}`);
    temporaryPaths.push(symlink, actual);
    fs.symlinkSync(actual, symlink, "dir");
    const manifestPath = path.join(symlink, "manifest.json");
    fs.writeFileSync(
      path.join(actual, "manifest.json"),
      JSON.stringify({ state_path: symlink, pid: process.pid }),
    );

    expect(() => runtime.loadOwnedManifest(manifestPath)).toThrow(/real directory|symlink/);
  });
});

describe("agent log filters", () => {
  const entry = { level: 50, requestId: "request-1", component: "web", msg: "failed" };
  const raw = JSON.stringify(entry);

  it("matches level, request, component, and text filters", () => {
    expect(
      runtime.matchesLogFilters(entry, raw, {
        level: "error",
        requestId: "request-1",
        component: "web",
        text: "FAILED",
      }),
    ).toBe(true);
  });

  it("rejects a non-matching request id", () => {
    expect(runtime.matchesLogFilters(entry, raw, { requestId: "request-2" })).toBe(false);
  });
});
