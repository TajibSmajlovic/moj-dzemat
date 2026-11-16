import { isBuiltin } from "node:module";
import path from "node:path";
import ts from "typescript";

import type { ImportEdge } from "./architecture-rules";

export function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

export function stripSourceExtension(value: string): string {
  return value.replace(/\.(?:[cm]?ts|tsx)$/, "");
}

type SourceModule = {
  rootDir: string;
  source: string;
  contents: string;
  compilerOptions: ts.CompilerOptions;
};

function resolveInternalTarget(module: SourceModule, imported: ImportedModule): string | null {
  const { rootDir, source, compilerOptions } = module;
  const { specifier } = imported;
  if (isBuiltin(specifier)) return specifier;
  const resolved = ts.resolveModuleName(
    specifier,
    path.join(rootDir, source),
    compilerOptions,
    ts.sys,
  ).resolvedModule;
  if (resolved && !resolved.isExternalLibraryImport) {
    return stripSourceExtension(toPosix(path.relative(rootDir, resolved.resolvedFileName)));
  }
  const absoluteTarget = unresolvedTarget(module, imported);
  if (!absoluteTarget) return null;

  const relative = path.relative(rootDir, absoluteTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

  return stripSourceExtension(toPosix(relative));
}

function unresolvedTarget(
  { rootDir, source }: SourceModule,
  { specifier }: ImportedModule,
): string | null {
  const aliases = [
    ["#app/", "app"],
    ["#generated/", "generated"],
    ["#prisma/", "prisma"],
  ] as const;
  const alias = aliases.find(([prefix]) => specifier.startsWith(prefix));
  if (alias) return path.join(rootDir, alias[1], specifier.slice(alias[0].length));
  return specifier.startsWith(".") ? path.resolve(rootDir, path.dirname(source), specifier) : null;
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.phaseModifier === ts.SyntaxKind.TypeKeyword) return true;
  if (clause.name) return false;
  if (!clause.namedBindings) return false;
  if (ts.isNamespaceImport(clause.namedBindings)) return false;

  return (
    clause.namedBindings.elements.length > 0 &&
    clause.namedBindings.elements.every((element) => element.isTypeOnly)
  );
}

export function collectEdges(module: SourceModule): ImportEdge[] {
  const { source, contents } = module;
  const sourceFile = ts.createSourceFile(
    source,
    contents,
    ts.ScriptTarget.Latest,
    true,
    source.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const edges: ImportEdge[] = [];

  function addEdge(imported: ImportedModule, node: ts.Node): void {
    const target = resolveInternalTarget(module, imported);
    if (!target) return;

    edges.push({
      source,
      target,
      specifier: imported.specifier,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
      typeOnly: imported.typeOnly,
    });
  }

  function visit(node: ts.Node): void {
    const imported = readImport(node);
    if (imported) addEdge(imported, node);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return edges;
}

type ImportedModule = { specifier: string; typeOnly: boolean };

function readImport(node: ts.Node): ImportedModule | null {
  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
    return { specifier: node.moduleSpecifier.text, typeOnly: isTypeOnlyImport(node) };
  }
  if (ts.isExportDeclaration(node)) return readExport(node);
  if (ts.isCallExpression(node)) return readImportCall(node);
  if (ts.isImportEqualsDeclaration(node)) return readImportEquals(node);
  return null;
}

function readExport(node: ts.ExportDeclaration): ImportedModule | null {
  if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) return null;
  const clause = node.exportClause;
  const allTypes =
    clause &&
    ts.isNamedExports(clause) &&
    clause.elements.length > 0 &&
    clause.elements.every((element) => element.isTypeOnly);
  return { specifier: node.moduleSpecifier.text, typeOnly: node.isTypeOnly || Boolean(allTypes) };
}

function readImportCall(node: ts.CallExpression): ImportedModule | null {
  const first = node.arguments[0];
  if (!first) return null;
  if (!ts.isStringLiteral(first) && !ts.isNoSubstitutionTemplateLiteral(first)) return null;
  const isImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
  const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
  return isImport || isRequire ? { specifier: first.text, typeOnly: false } : null;
}

function readImportEquals(node: ts.ImportEqualsDeclaration): ImportedModule | null {
  if (!ts.isExternalModuleReference(node.moduleReference)) return null;
  const expression = node.moduleReference.expression;
  if (!expression || !ts.isStringLiteral(expression)) return null;
  return { specifier: expression.text, typeOnly: node.isTypeOnly };
}
