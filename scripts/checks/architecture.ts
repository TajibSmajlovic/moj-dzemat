import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

import { findRepositoryRoot } from "../repository-root";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const TEST_FILE_PATTERN = /(?:^|\/)(?:tests?|__tests__)(?:\/|$)|\.(?:test|spec)\.[cm]?tsx?$/;
const DOCS_PATH = "docs/architecture/boundaries.md";

type Owner =
  | { kind: "feature"; name: string }
  | { kind: "composition" }
  | { kind: "foundation" }
  | { kind: "platform" }
  | { kind: "other" };

type ImportEdge = {
  source: string;
  target: string;
  specifier: string;
  line: number;
  typeOnly: boolean;
};

export type ArchitectureViolation = ImportEdge & {
  rule: string;
  why: string;
  fix: string;
  docsAnchor: string;
};

const CROSS_FEATURE_CONTRACTS = new Map<string, Set<string>>([
  ["pwa", new Set(["app/features/posts/post-contract"])],
  ["posts", new Set(["app/features/web-push/post-publication.server"])],
]);

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function stripSourceExtension(value: string): string {
  return value.replace(/\.(?:[cm]?ts|tsx)$/, "");
}

function ownerOf(file: string): Owner {
  const feature = /^app\/features\/([^/]+)(?:\/|$)/.exec(file);
  if (feature?.[1]) return { kind: "feature", name: feature[1] };

  if (
    file === "app/root" ||
    file.startsWith("app/routes/") ||
    file.startsWith("server/") ||
    file.startsWith("app/components/layout/")
  ) {
    return { kind: "composition" };
  }

  if (file.startsWith("app/platform/")) return { kind: "platform" };
  if (
    file.startsWith("app/components/") ||
    file.startsWith("app/lib/") ||
    file.startsWith("app/server/")
  ) {
    return { kind: "foundation" };
  }

  return { kind: "other" };
}

function resolveInternalTarget(rootDir: string, source: string, specifier: string): string | null {
  let absoluteTarget: string;

  if (specifier.startsWith("#app/")) {
    absoluteTarget = path.join(rootDir, "app", specifier.slice("#app/".length));
  } else if (specifier.startsWith(".")) {
    absoluteTarget = path.resolve(rootDir, path.dirname(source), specifier);
  } else {
    return null;
  }

  const relative = path.relative(rootDir, absoluteTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

  return stripSourceExtension(toPosix(relative));
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  if (clause.name) return false;
  if (!clause.namedBindings) return false;
  if (ts.isNamespaceImport(clause.namedBindings)) return false;

  return (
    clause.namedBindings.elements.length > 0 &&
    clause.namedBindings.elements.every((element) => element.isTypeOnly)
  );
}

function collectEdges(rootDir: string, source: string, contents: string): ImportEdge[] {
  const sourceFile = ts.createSourceFile(
    source,
    contents,
    ts.ScriptTarget.Latest,
    true,
    source.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const edges: ImportEdge[] = [];

  function addEdge(specifier: string, node: ts.Node, typeOnly: boolean): void {
    const target = resolveInternalTarget(rootDir, source, specifier);
    if (!target) return;

    edges.push({
      source,
      target,
      specifier,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
      typeOnly,
    });
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      addEdge(node.moduleSpecifier.text, node, isTypeOnlyImport(node));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        addEdge(node.moduleSpecifier.text, node, node.isTypeOnly);
      }
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]!) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      addEdge(node.arguments[0].text, node, false);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return edges;
}

function violationFor(edge: ImportEdge): ArchitectureViolation | null {
  const sourceOwner = ownerOf(edge.source);
  const targetOwner = ownerOf(edge.target);

  if (
    sourceOwner.kind === "feature" &&
    targetOwner.kind === "feature" &&
    sourceOwner.name !== targetOwner.name
  ) {
    const allowedTargets = CROSS_FEATURE_CONTRACTS.get(sourceOwner.name);
    if (!allowedTargets?.has(edge.target)) {
      return {
        ...edge,
        rule: "feature-isolation",
        why: "Feature internals are owned by their feature and can change without downstream consumers.",
        fix: "Import the target feature's named public contract, move generic code to a shared foundation, or compose both features from a route.",
        docsAnchor: "feature-isolation",
      };
    }
  }

  if (
    !edge.typeOnly &&
    sourceOwner.kind === "foundation" &&
    (targetOwner.kind === "feature" || targetOwner.kind === "composition")
  ) {
    return {
      ...edge,
      rule: "foundation-direction",
      why: "Shared foundations must remain reusable and cannot own product feature or application composition behavior.",
      fix: "Invert the dependency, pass the value into the foundation, or move the source into the owning feature or composition layer.",
      docsAnchor: "foundation-direction",
    };
  }

  if (
    !edge.typeOnly &&
    sourceOwner.kind === "platform" &&
    (targetOwner.kind === "feature" || targetOwner.kind === "composition")
  ) {
    return {
      ...edge,
      rule: "platform-direction",
      why: "Cross-cutting platform capabilities cannot depend on product features or route composition.",
      fix: "Pass feature data through the platform API or move the orchestration to a route or layout.",
      docsAnchor: "platform-direction",
    };
  }

  const isBrowserOwned =
    edge.source.startsWith("app/components/") ||
    edge.source.startsWith("app/platform/") ||
    /^app\/features\/[^/]+\/components\//.test(edge.source);
  const isServerTarget =
    edge.target.startsWith("app/server/") || /\.server(?:\/|$)/.test(edge.target);
  if (!edge.typeOnly && isBrowserOwned && isServerTarget) {
    return {
      ...edge,
      rule: "client-server-boundary",
      why: "Browser-capable modules must not pull server code, secrets, filesystem access, or database clients into their runtime graph.",
      fix: "Load server data in a route, pass serializable values into the component, or change the import to an explicit type-only import.",
      docsAnchor: "client-server-boundary",
    };
  }

  if (
    !edge.typeOnly &&
    (edge.source.startsWith("app/") || edge.source.startsWith("server/")) &&
    (edge.target.startsWith("tests/") || edge.target.startsWith("scripts/"))
  ) {
    return {
      ...edge,
      rule: "production-dependency",
      why: "Production code cannot depend on test fixtures or repository maintenance scripts.",
      fix: "Move the reusable implementation into app/lib or app/server and keep test or script adapters outside production code.",
      docsAnchor: "production-dependency",
    };
  }

  return null;
}

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

  // The repository targets ES2022, so Array.prototype.toSorted is unavailable.
  // eslint-disable-next-line unicorn/no-array-sort
  return files.sort();
}

export function checkArchitecture(rootDir: string): ArchitectureViolation[] {
  return sourceFiles(rootDir).flatMap((source) => {
    const contents = fs.readFileSync(path.join(rootDir, source), "utf8");

    return collectEdges(rootDir, source, contents).flatMap((edge) => {
      const violation = violationFor(edge);
      return violation ? [violation] : [];
    });
  });
}

export function formatViolation(violation: ArchitectureViolation): string {
  return [
    `ARCHITECTURE ${violation.rule}: ${violation.source}:${violation.line} imports ${violation.target}`,
    `Why: ${violation.why}`,
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
