import { build } from "esbuild";
import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildOfflineShellDocument,
  OFFLINE_SHELL_BACKGROUND_COLOR_MARKER,
  OFFLINE_SHELL_LOGO_MARKER,
  OFFLINE_SHELL_LORA_LATIN_EXT_FONT_MARKER,
  OFFLINE_SHELL_LORA_LATIN_FONT_MARKER,
  OFFLINE_SHELL_SCRIPT_MARKER,
  OFFLINE_SHELL_THEME_COLOR_MARKER,
} from "#app/features/pwa/offline-shell-document";
import { PWA_BACKGROUND_COLOR, PWA_THEME_COLOR } from "#app/features/pwa/pwa-config";

import { findRepositoryRoot } from "../repository-root";

const projectRoot = findRepositoryRoot(import.meta.dirname);

export type PwaWorkerMode = "normal" | "recovery";

export type BuildPwaArtifactOptions = {
  offlineTemplatePath: string;
  offlineEntryPath: string;
  serviceWorkerEntryPath: string;
  offlineOutputPath: string;
  serviceWorkerOutputPath: string;
  workerTsconfigPath: string;
  logoPath: string;
  loraLatinFontPath: string;
  loraLatinExtendedFontPath: string;
};

export function getOfflineShellRevision(contents: Uint8Array): string {
  return crypto.createHash("sha256").update(contents).digest("hex");
}

export function parsePwaWorkerMode(args: readonly string[]): PwaWorkerMode {
  const workerModeArgument = args.find((argument) => argument.startsWith("--worker-mode="));
  if (!workerModeArgument) return "normal";

  const workerMode = workerModeArgument.slice("--worker-mode=".length);
  if (workerMode === "normal" || workerMode === "recovery") return workerMode;

  throw new Error(`Unsupported PWA worker mode: ${workerMode || "<empty>"}.`);
}

export async function buildPwaArtifacts(
  options: BuildPwaArtifactOptions = defaultOptions("normal"),
): Promise<{ offlineShellRevision: string }> {
  const buildResult = await build({
    entryPoints: [options.offlineEntryPath],
    bundle: true,
    charset: "utf8",
    format: "iife",
    legalComments: "none",
    minify: true,
    platform: "browser",
    target: "es2022",
    treeShaking: true,
    write: false,
  });
  const javascriptOutput = buildResult.outputFiles[0];

  if (!javascriptOutput) {
    throw new Error("The offline shell JavaScript bundle was not generated.");
  }

  const [template, logoSvg, loraLatinFont, loraLatinExtendedFont] = await Promise.all([
    readFile(options.offlineTemplatePath, "utf8"),
    readFile(options.logoPath, "utf8"),
    readFile(options.loraLatinFontPath),
    readFile(options.loraLatinExtendedFontPath),
  ]);
  const document = buildOfflineShellDocument(template, javascriptOutput.text, {
    themeColor: PWA_THEME_COLOR,
    backgroundColor: PWA_BACKGROUND_COLOR,
    logoSvg,
    loraLatinFontBase64: loraLatinFont.toString("base64"),
    loraLatinExtendedFontBase64: loraLatinExtendedFont.toString("base64"),
  });

  for (const marker of [
    OFFLINE_SHELL_SCRIPT_MARKER,
    OFFLINE_SHELL_THEME_COLOR_MARKER,
    OFFLINE_SHELL_BACKGROUND_COLOR_MARKER,
    OFFLINE_SHELL_LOGO_MARKER,
    OFFLINE_SHELL_LORA_LATIN_FONT_MARKER,
    OFFLINE_SHELL_LORA_LATIN_EXT_FONT_MARKER,
  ]) {
    if (document.includes(marker)) {
      throw new Error(`The generated offline shell still contains the ${marker} marker.`);
    }
  }

  await mkdir(path.dirname(options.offlineOutputPath), { recursive: true });
  await writeFile(options.offlineOutputPath, document);

  const offlineShellRevision = getOfflineShellRevision(Buffer.from(document));

  await mkdir(path.dirname(options.serviceWorkerOutputPath), { recursive: true });
  await build({
    entryPoints: [options.serviceWorkerEntryPath],
    bundle: true,
    define: {
      __PWA_OFFLINE_SHELL_REVISION__: JSON.stringify(offlineShellRevision),
    },
    format: "iife",
    legalComments: "none",
    minify: true,
    outfile: options.serviceWorkerOutputPath,
    platform: "browser",
    target: "es2022",
    tsconfig: options.workerTsconfigPath,
  });

  return { offlineShellRevision };
}

function defaultOptions(workerMode: PwaWorkerMode): BuildPwaArtifactOptions {
  const serviceWorkerFilename =
    workerMode === "recovery" ? "recovery-worker.ts" : "service-worker.ts";

  return {
    offlineTemplatePath: path.resolve(projectRoot, "app/features/pwa/offline.html"),
    offlineEntryPath: path.resolve(projectRoot, "app/features/pwa/offline-shell-entry.client.ts"),
    serviceWorkerEntryPath: path.resolve(projectRoot, "app/features/pwa", serviceWorkerFilename),
    offlineOutputPath: path.resolve(projectRoot, "build/client/offline.html"),
    serviceWorkerOutputPath: path.resolve(projectRoot, "build/client/sw.js"),
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

const invokedPath = process.argv[1];

if (invokedPath && import.meta.url === pathToFileURL(path.resolve(invokedPath)).href) {
  await buildPwaArtifacts(defaultOptions(parsePwaWorkerMode(process.argv.slice(2))));
}
