import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { PWA_CACHE_PREFIX, PWA_DATABASE_NAME } from "#app/features/pwa/pwa-config";

import {
  buildPwaArtifacts,
  getOfflineShellRevision,
  parsePwaWorkerMode,
  type BuildPwaArtifactOptions,
} from "../../../scripts/build-pwa-artifacts";

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "moj-dzemat-pwa-build-"));
  temporaryDirectories.push(directory);

  return directory;
}

function options(
  directory: string,
  offlineTemplatePath: string,
  serviceWorkerFilename = "service-worker.ts",
): BuildPwaArtifactOptions {
  const projectRoot = process.cwd();

  return {
    offlineTemplatePath,
    offlineEntryPath: path.resolve(projectRoot, "app/features/pwa/offline-shell-entry.client.ts"),
    serviceWorkerEntryPath: path.resolve(projectRoot, "app/features/pwa", serviceWorkerFilename),
    offlineOutputPath: path.join(directory, "offline.html"),
    serviceWorkerOutputPath: path.join(directory, "sw.js"),
    workerTsconfigPath: path.resolve(projectRoot, "tsconfig.worker.json"),
    logoPath: path.resolve(projectRoot, "public/logo.svg"),
    loraLatinFontPath: path.resolve(
      projectRoot,
      "node_modules/@fontsource-variable/lora/files/lora-latin-wght-normal.woff2",
    ),
    loraLatinExtendedFontPath: path.resolve(
      projectRoot,
      "node_modules/@fontsource-variable/lora/files/lora-latin-ext-wght-normal.woff2",
    ),
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe("PWA artifact build", () => {
  it("accepts only the normal and recovery build modes", () => {
    expect(parsePwaWorkerMode([])).toBe("normal");
    expect(parsePwaWorkerMode(["--worker-mode=normal"])).toBe("normal");
    expect(parsePwaWorkerMode(["--worker-mode=recovery"])).toBe("recovery");
    expect(() => parsePwaWorkerMode(["--worker-mode=unexpected"])).toThrow(
      "Unsupported PWA worker mode",
    );
  });

  it("deterministically couples the worker revision to the exact offline shell", async () => {
    const projectRoot = process.cwd();
    const sourceTemplate = fs.readFileSync(
      path.resolve(projectRoot, "app/features/pwa/offline.html"),
      "utf8",
    );
    const firstDirectory = temporaryDirectory();
    const repeatedDirectory = temporaryDirectory();
    const changedDirectory = temporaryDirectory();
    const firstTemplate = path.join(firstDirectory, "offline-source.html");
    const repeatedTemplate = path.join(repeatedDirectory, "offline-source.html");
    const changedTemplate = path.join(changedDirectory, "offline-source.html");

    fs.writeFileSync(firstTemplate, sourceTemplate);
    fs.writeFileSync(repeatedTemplate, sourceTemplate);
    fs.writeFileSync(
      changedTemplate,
      sourceTemplate.replace('aria-label="Status veze"', 'aria-label="Status internetske veze"'),
    );

    const first = await buildPwaArtifacts(options(firstDirectory, firstTemplate));
    const repeated = await buildPwaArtifacts(options(repeatedDirectory, repeatedTemplate));
    const changed = await buildPwaArtifacts(options(changedDirectory, changedTemplate));

    const firstShell = fs.readFileSync(path.join(firstDirectory, "offline.html"));
    const firstWorker = fs.readFileSync(path.join(firstDirectory, "sw.js"), "utf8");
    const repeatedWorker = fs.readFileSync(path.join(repeatedDirectory, "sw.js"), "utf8");
    const changedWorker = fs.readFileSync(path.join(changedDirectory, "sw.js"), "utf8");

    expect(first.offlineShellRevision).toBe(getOfflineShellRevision(firstShell));
    expect(repeated.offlineShellRevision).toBe(first.offlineShellRevision);
    expect(repeatedWorker).toBe(firstWorker);
    expect(changed.offlineShellRevision).not.toBe(first.offlineShellRevision);
    expect(changedWorker).not.toBe(firstWorker);
    expect(firstWorker).toContain(first.offlineShellRevision);
    expect(changedWorker).toContain(changed.offlineShellRevision);
    expect(firstShell.toString("utf8")).toContain("data:font/woff2;base64,");
    expect(firstShell.toString("utf8")).toContain("<svg");
    expect(firstShell.toString("utf8")).not.toContain("__MOJ_DZEMAT_");
  });

  it("builds a cleanup-only recovery worker for the stable worker URL", async () => {
    const directory = temporaryDirectory();
    const templatePath = path.resolve(process.cwd(), "app/features/pwa/offline.html");

    await buildPwaArtifacts(options(directory, templatePath, "recovery-worker.ts"));

    const recoveryWorker = fs.readFileSync(path.join(directory, "sw.js"), "utf8");

    expect(recoveryWorker).toContain("skipWaiting");
    expect(recoveryWorker).toContain("unregister");
    expect(recoveryWorker).toContain(PWA_CACHE_PREFIX);
    expect(recoveryWorker).toContain(PWA_DATABASE_NAME);
    expect(recoveryWorker).not.toContain('addEventListener("fetch"');
  });
});
