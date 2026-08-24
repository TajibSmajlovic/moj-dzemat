import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const requiredDocuments = [
  ".github/SECURITY.md",
  ".github/pull_request_template.md",
  "AGENTS.md",
  "ARCHITECTURE.md",
  "CODE_OF_CONDUCT.md",
  "README.md",
  "CONTRIBUTING.md",
  "docs/DESIGN.md",
  "docs/FRONTEND.md",
  "docs/PLANS.md",
  "docs/PRODUCT_SENSE.md",
  "docs/RELIABILITY.md",
  "docs/SECURITY.md",
  "docs/architecture/boundaries.md",
  "docs/design-docs/core-beliefs.md",
  "docs/design-docs/index.md",
  "docs/exec-plans/tech-debt-tracker.md",
  "docs/product-specs/administration.md",
  "docs/product-specs/index.md",
  "docs/product-specs/posts.md",
  "docs/product-specs/questions-and-answers.md",
  "docs/design-docs/pwa-runtime-and-recovery.md",
  "docs/design-docs/web-push.md",
];

type DocsFinding = {
  file: string;
  line: number;
  kind: string;
  detail: string;
};

type Link = { target: string; index: number };
type NpmCommand = { name: string; index: number };

export function findAgentDocumentPaths(rootDir: string): string[] {
  const documents = new Set(requiredDocuments);

  function walk(directory: string): void {
    if (!fs.existsSync(directory)) return;

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile() && path.extname(entry.name).toLocaleLowerCase() === ".md") {
        documents.add(toPosix(path.relative(rootDir, absolute)));
      }
    }
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (entry.isFile() && path.extname(entry.name).toLocaleLowerCase() === ".md") {
      documents.add(entry.name);
    }
  }
  walk(path.join(rootDir, "docs"));
  walk(path.join(rootDir, ".github"));

  return [...documents];
}

export function checkAgentDocs(
  rootDir: string,
  documentPaths: readonly string[] = findAgentDocumentPaths(rootDir),
): DocsFinding[] {
  const findings: DocsFinding[] = [];
  const incomingDocuments = new Set<string>();
  const checkedDocuments = new Set(documentPaths.map((documentPath) => toPosix(documentPath)));
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = new Set(Object.keys(packageJson.scripts ?? {}));

  for (const documentPath of documentPaths) {
    const absoluteDocument = path.join(rootDir, documentPath);
    if (!fs.existsSync(absoluteDocument)) {
      findings.push({
        file: documentPath,
        line: 1,
        kind: "missing-document",
        detail: "File is missing.",
      });
      continue;
    }

    const contents = fs.readFileSync(absoluteDocument, "utf8");
    const links = markdownLinks(contents);

    for (const link of links) {
      if (isExternalLink(link.target)) continue;
      const [rawFile, rawAnchor] = link.target.split("#", 2);
      const decodedFile = decodeURIComponent(rawFile ?? "");
      const targetFile = decodedFile
        ? path.resolve(path.dirname(absoluteDocument), decodedFile)
        : absoluteDocument;
      const relativeTarget = path.relative(rootDir, targetFile);

      if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
        findings.push({
          file: documentPath,
          line: lineAt(contents, link.index),
          kind: "outside-repository",
          detail: `Local link points outside the repository: ${link.target}`,
        });
        continue;
      }
      if (!fs.existsSync(targetFile)) {
        findings.push({
          file: documentPath,
          line: lineAt(contents, link.index),
          kind: "broken-link",
          detail: `Local link target does not exist: ${link.target}`,
        });
        continue;
      }
      const normalizedTarget = toPosix(relativeTarget);
      if (normalizedTarget !== toPosix(documentPath) && checkedDocuments.has(normalizedTarget)) {
        incomingDocuments.add(normalizedTarget);
      }
      if (rawAnchor && fs.statSync(targetFile).isFile()) {
        const anchors = markdownAnchors(fs.readFileSync(targetFile, "utf8"));
        if (!anchors.has(rawAnchor.toLocaleLowerCase())) {
          findings.push({
            file: documentPath,
            line: lineAt(contents, link.index),
            kind: "broken-anchor",
            detail: `Heading anchor does not exist: ${link.target}`,
          });
        }
      }
    }

    for (const command of documentedNpmCommands(contents)) {
      if (!scripts.has(command.name)) {
        findings.push({
          file: documentPath,
          line: lineAt(contents, command.index),
          kind: "missing-script",
          detail: `Documented npm script is missing from package.json: ${command.name}`,
        });
      }
    }
  }

  for (const documentPath of documentPaths) {
    const normalizedDocument = toPosix(documentPath);
    if (!normalizedDocument.startsWith("docs/") || incomingDocuments.has(normalizedDocument))
      continue;
    if (!fs.existsSync(path.join(rootDir, documentPath))) continue;

    findings.push({
      file: normalizedDocument,
      line: 1,
      kind: "orphan-document",
      detail: "Document is not linked from another checked document.",
    });
  }

  return findings;
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function markdownLinks(contents: string): Link[] {
  const links: Link[] = [];
  const pattern = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of contents.matchAll(pattern)) {
    const rawTarget = match[1]?.trim() ?? "";
    const target = rawTarget.startsWith("<")
      ? rawTarget.slice(1, rawTarget.indexOf(">"))
      : (rawTarget.split(/\s+["']/u, 1)[0] ?? "");
    links.push({ target, index: match.index ?? 0 });
  }
  return links;
}

function isExternalLink(target: string): boolean {
  return /^[a-z][a-z\d+.-]*:/iu.test(target);
}

function markdownAnchors(contents: string): Set<string> {
  const anchors = new Set<string>();
  const counts = new Map<string, number>();

  for (const line of contents.split("\n")) {
    const heading = /^#{1,6}\s+(.+?)\s*#*$/u.exec(line)?.[1];
    if (!heading) continue;
    const base = heading
      .toLocaleLowerCase()
      .replaceAll(/[`*_~]/gu, "")
      .replaceAll(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replaceAll(/\s+/gu, "-");
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}

function documentedNpmCommands(contents: string): NpmCommand[] {
  const commands: NpmCommand[] = [];
  const pattern = /npm run ([a-z\d:_-]+)/giu;
  for (const match of contents.matchAll(pattern)) {
    if (match[1]) commands.push({ name: match[1], index: match.index ?? 0 });
  }
  return commands;
}

function lineAt(contents: string, index: number): number {
  return contents.slice(0, index).split("\n").length;
}

export function findRepositoryRoot(startDirectory: string): string {
  let current = path.resolve(startDirectory);
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`Could not find package.json from ${startDirectory}`);
    current = parent;
  }
}

function runCli(): void {
  const rootDir = findRepositoryRoot(process.cwd());
  const findings = checkAgentDocs(rootDir);
  if (findings.length === 0) {
    console.log("Agent documentation check passed.");
    return;
  }

  for (const finding of findings) {
    console.error(`DOCS ${finding.kind}: ${finding.file}:${finding.line} ${finding.detail}`);
  }
  console.error(`\n${findings.length} documentation finding(s).`);
  process.exitCode = 1;
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entrypoint === import.meta.url) runCli();
