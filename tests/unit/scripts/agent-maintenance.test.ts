import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

type MaintenanceModule = {
  checkActivePlans: (
    rootDir: string,
    now?: Date,
  ) => { kind: string; file: string; impact: string; fix: string }[];
};

let maintenance: MaintenanceModule;
const fixtureRoots: string[] = [];

beforeAll(async () => {
  maintenance = (await import(
    pathToFileURL(path.resolve("scripts/agent/maintenance.ts")).href
  )) as MaintenanceModule;
});

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixturePlan(contents?: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-plans-"));
  fixtureRoots.push(root);

  if (contents !== undefined) {
    const activeDir = path.join(root, "docs", "exec-plans", "active");
    fs.mkdirSync(activeDir, { recursive: true });
    fs.writeFileSync(path.join(activeDir, "plan.md"), contents);
  }

  return root;
}

describe("active execution plan maintenance", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");

  it("accepts a fresh active plan", () => {
    const root = fixturePlan("# Plan\n\nStatus: active\nUpdated: 2026-08-16\n");

    expect(maintenance.checkActivePlans(root, now)).toEqual([]);
  });

  it("accepts a repository without active plans", () => {
    expect(maintenance.checkActivePlans(fixturePlan(), now)).toEqual([]);
  });

  it("reports stale active plans", () => {
    const root = fixturePlan("# Plan\n\nStatus: active\nUpdated: 2026-07-31\n");
    const [finding] = maintenance.checkActivePlans(root, now);

    expect(finding?.kind).toBe("stale-active-plan");
    expect(finding?.file).toMatch(/plan\.md$/);
  });

  it("reports missing plan metadata", () => {
    const findings = maintenance.checkActivePlans(fixturePlan("# Plan\n"), now);

    expect(findings.map((finding) => finding.kind)).toEqual([
      "invalid-active-plan-status",
      "missing-active-plan-date",
    ]);
  });
});
