import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

import { findRepositoryRoot } from "../repository-root";
import { collectEdges, stripSourceExtension, toPosix } from "./architecture-imports";
import { violationFor, type ImportEdge, type ArchitectureViolation } from "./architecture-rules";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const TEST_FILE_PATTERN = /(?:^|\/)(?:tests?|__tests__)(?:\/|$)|\.(?:test|spec)\.[cm]?tsx?$/;
const DOCS_PATH = "docs/architecture/boundaries.md";

function sourceFiles(rootDir: string): string[] {
  const files: string[] = [];

  function walk(directory: string): void {
    if (!fs.existsSync(directory)) return;

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;

      const relative = toPosix(path.relative(rootDir, absolute));
      if (!TEST_FILE_PATTERN.test(relative)) files.push(relative);
    }
  }

  walk(path.join(rootDir, "app"));
  walk(path.join(rootDir, "server"));
  walk(path.join(rootDir, "stories"));
  walk(path.join(rootDir, ".storybook"));

  // The repository targets ES2022, so Array.prototype.toSorted is unavailable.
  // The comparator keeps the default code-unit order.
  // eslint-disable-next-line unicorn/no-array-sort
  return files.sort((left, right) => Number(left > right) - Number(left < right));
}

export function checkArchitecture(rootDir: string): ArchitectureViolation[] {
  const compilerOptions = readCompilerOptions(rootDir);
  const graph = new Map<string, ImportEdge[]>();
  const browserPaths = new Map<string, string[]>();

  for (const source of sourceFiles(rootDir)) {
    const key = stripSourceExtension(source);
    graph.set(
      key,
      collectEdges({
        rootDir,
        source,
        contents: fs.readFileSync(path.join(rootDir, source), "utf8"),
        compilerOptions,
      }),
    );
    if (isBrowserEntry(source)) browserPaths.set(key, [source]);
  }

  followBrowserPaths(graph, browserPaths);

  return [...graph].flatMap(([source, edges]) =>
    edges.flatMap((edge) => {
      const violation = violationFor(edge, browserPaths.get(source));
      return violation ? [violation] : [];
    }),
  );
}

function readCompilerOptions(rootDir: string): ts.CompilerOptions {
  const configPath = path.join(rootDir, "tsconfig.base.json");
  const config: unknown = fs.existsSync(configPath)
    ? ts.readConfigFile(configPath, (file) => ts.sys.readFile(file)).config
    : {};
  const configuredOptions = compilerOptionsObject(config);
  return ts.parseJsonConfigFileContent(
    {
      compilerOptions: {
        moduleResolution: "bundler",
        module: "esnext",
        ...configuredOptions,
      },
      files: [],
      include: [],
    },
    ts.sys,
    rootDir,
    undefined,
    configPath,
  ).options;
}

function compilerOptionsObject(config: unknown): object {
  if (!config || typeof config !== "object") return {};
  if (!("compilerOptions" in config)) return {};

  const options = config.compilerOptions;

  return options && typeof options === "object" ? options : {};
}

function followBrowserPaths(
  graph: Map<string, ImportEdge[]>,
  browserPaths: Map<string, string[]>,
): void {
  // Follow runtime edges through helpers and barrels; a directory name alone
  // cannot establish that a module stays on the server.
  // Entries added inside the loop are visited later in the same loop, which makes
  // this a breadth-first worklist.
  for (const [source, trail] of browserPaths) {
    for (const edge of graph.get(source) ?? []) {
      if (edge.typeOnly || !graph.has(edge.target) || browserPaths.has(edge.target)) continue;
      if (edge.target.startsWith("app/server/") || /\.server(?:\/|$)/.test(edge.target)) continue;
      // eslint-disable-next-line unicorn/no-loop-iterable-mutation -- intentional worklist
      browserPaths.set(edge.target, [...trail, edge.target]);
    }
  }
}

function isBrowserEntry(source: string): boolean {
  return (
    source.startsWith("stories/") ||
    /^\.storybook\/(?:preview|manager)\.[cm]?tsx?$/.test(source) ||
    source.startsWith("app/components/") ||
    source.startsWith("app/lib/") ||
    source.startsWith("app/platform/") ||
    /\.client\.[cm]?tsx?$/.test(source) ||
    /^app\/features\/[^/]+\/(?:[^/]+\/)*components\//.test(source)
  );
}

export function formatViolation(violation: ArchitectureViolation): string {
  return [
    `ARCHITECTURE ${violation.rule}: ${violation.source}:${violation.line} imports ${violation.target}`,
    `Why: ${violation.why}${violation.browserPath ? ` Browser path: ${violation.browserPath.join(" -> ")}.` : ""}`,
    `Fix: ${violation.fix}`,
    `Docs: ${DOCS_PATH}#${violation.docsAnchor}`,
  ].join("\n");
}

function runCli(): void {
  const rootDir = findRepositoryRoot(process.cwd());
  const violations = checkArchitecture(rootDir);

  if (violations.length === 0) {
    console.log("Architecture check passed.");
    return;
  }

  console.error(violations.map((violation) => formatViolation(violation)).join("\n\n"));
  console.error(`\n${violations.length} architecture violation(s) found.`);
  process.exitCode = 1;
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entrypoint === import.meta.url) runCli();
