import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const ACTIVE_PLAN_MAX_AGE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

type PlanFinding = {
  kind: string;
  file: string;
  impact: string;
  fix: string;
};

export function checkActivePlans(rootDir: string, now = new Date()): PlanFinding[] {
  const activeDir = path.join(rootDir, "docs", "exec-plans", "active");
  if (!fs.existsSync(activeDir)) return [];

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const findings: PlanFinding[] = [];

  for (const entry of fs.readdirSync(activeDir, { withFileTypes: true })) {
    if (!entry.isFile() || path.extname(entry.name) !== ".md") continue;

    const absolutePath = path.join(activeDir, entry.name);
    const relativePath = path.relative(rootDir, absolutePath);
    const contents = fs.readFileSync(absolutePath, "utf8");

    if (!/^Status:\s*active\s*$/mu.test(contents)) {
      findings.push({
        kind: "invalid-active-plan-status",
        file: relativePath,
        impact: "Active-plan ownership and completion state are ambiguous.",
        fix: "Add an exact `Status: active` line or move a completed plan to completed/.",
      });
    }

    const updated = /^Updated:\s*(\d{4}-\d{2}-\d{2})\s*$/mu.exec(contents)?.[1];
    if (!updated) {
      findings.push({
        kind: "missing-active-plan-date",
        file: relativePath,
        impact: "Plan freshness cannot be determined.",
        fix: "Add `Updated: YYYY-MM-DD` and refresh it after meaningful work sessions.",
      });
      continue;
    }

    const updatedAt = new Date(`${updated}T00:00:00.000Z`);
    if (Number.isNaN(updatedAt.getTime()) || updatedAt.toISOString().slice(0, 10) !== updated) {
      findings.push({
        kind: "invalid-active-plan-date",
        file: relativePath,
        impact: `The Updated date is not a real calendar date: ${updated}.`,
        fix: "Use a real UTC calendar date in YYYY-MM-DD form.",
      });
      continue;
    }

    const ageDays = Math.floor((today - updatedAt.getTime()) / DAY_MS);
    if (ageDays < 0) {
      findings.push({
        kind: "future-active-plan-date",
        file: relativePath,
        impact: `The Updated date is ${Math.abs(ageDays)} day(s) in the future.`,
        fix: "Set Updated to the date of the latest completed work session.",
      });
    } else if (ageDays > ACTIVE_PLAN_MAX_AGE_DAYS) {
      findings.push({
        kind: "stale-active-plan",
        file: relativePath,
        impact: `The plan has not been updated for ${ageDays} days.`,
        fix: "Verify the work state, update the plan, or complete and move it to completed/.",
      });
    }
  }

  return findings;
}

function runMaintenance(): void {
  const checks: readonly (readonly [string, string, readonly string[]])[] = [
    ["agent documentation", process.execPath, ["--import", "tsx", "scripts/checks/docs.ts"]],
    ["architecture", process.execPath, ["--import", "tsx", "scripts/checks/architecture.ts"]],
    ["unused code", "npm", ["run", "knip"]],
  ];
  let findings = 0;

  for (const [name, command, args] of checks) {
    console.log(`[agent-maintenance] ${name}`);
    const result = spawnSync(command, args, { cwd: projectRoot, stdio: "inherit" });
    if (result.error) {
      console.error(result.error.message);
      findings += 1;
    } else if (result.status !== 0) {
      findings += 1;
    }
  }

  console.log("[agent-maintenance] active execution plans");
  for (const finding of checkActivePlans(projectRoot)) {
    console.error(
      `MAINTENANCE ${finding.kind}: ${finding.file}\nImpact: ${finding.impact}\nFix: ${finding.fix}`,
    );
    findings += 1;
  }

  for (const entry of fs.readdirSync(os.tmpdir(), { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("moj-dzemat-agent-")) continue;
    const statePath = path.join(os.tmpdir(), entry.name);
    const manifestPath = path.join(statePath, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      console.error(
        `MAINTENANCE incomplete-runtime: ${statePath}\nImpact: temporary state has no ownership manifest.\nFix: inspect it manually, then remove it only after confirming no process owns it.`,
      );
      findings += 1;
      continue;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { pid?: unknown };
      if (
        typeof manifest.pid === "number" &&
        Number.isSafeInteger(manifest.pid) &&
        !processIsAlive(manifest.pid)
      ) {
        console.error(
          `MAINTENANCE stopped-runtime: ${statePath}\nImpact: a completed runtime left temporary state behind.\nFix: npm run agent:stop -- --manifest ${manifestPath}`,
        );
        findings += 1;
      }
    } catch (error) {
      console.error(
        `MAINTENANCE invalid-runtime: ${manifestPath}\nImpact: runtime ownership cannot be established.\nFix: inspect the manifest and state manually.\n${error instanceof Error ? error.message : String(error)}`,
      );
      findings += 1;
    }
  }

  if (findings > 0) {
    console.error(`\n${findings} maintenance finding(s). No files were changed.`);
    process.exitCode = 1;
  } else {
    console.log("Agent maintenance check passed. No files were changed.");
  }
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ESRCH") {
      return false;
    }
    throw error;
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entrypoint === import.meta.url) runMaintenance();
