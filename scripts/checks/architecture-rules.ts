import { isBuiltin } from "node:module";

type Owner =
  | { kind: "feature"; name: string }
  | { kind: "composition" }
  | { kind: "foundation" }
  | { kind: "platform" }
  | { kind: "other" };

export type ImportEdge = {
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
  browserPath?: string[];
};

const CROSS_FEATURE_CONTRACTS = new Map<string, Set<string>>([
  ["pwa", new Set(["app/features/posts/post-contract"])],
  ["posts", new Set(["app/features/web-push/post-publication.server"])],
]);

function ownerOf(file: string): Owner {
  const feature = /^app\/features\/([^/]+)(?:\/|$)/.exec(file);
  if (feature?.[1]) return { kind: "feature", name: feature[1] };

  if (file === "app/root") return { kind: "composition" };
  const groups = [
    { kind: "composition", prefixes: ["app/routes/", "server/", "app/components/layout/"] },
    { kind: "platform", prefixes: ["app/platform/"] },
    { kind: "foundation", prefixes: ["app/components/", "app/lib/", "app/server/"] },
  ] as const;
  const owner = groups.find(({ prefixes }) => prefixes.some((prefix) => file.startsWith(prefix)));
  return { kind: owner?.kind ?? "other" };
}

type RuleContext = {
  edge: ImportEdge;
  sourceOwner: Owner;
  targetOwner: Owner;
  browserPath?: string[];
};
const RULES = [
  {
    rule: "feature-isolation",
    why: "Feature internals are owned by their feature and can change without downstream consumers.",
    fix: "Import the target feature's named public contract, move generic code to a shared foundation, or compose both features from a route.",
    matches: breaksFeatureIsolation,
  },
  {
    rule: "foundation-direction",
    why: "Shared foundations must remain reusable and cannot own product feature or application composition behavior.",
    fix: "Invert the dependency, pass the value into the foundation, or move the source into the owning feature or composition layer.",
    matches: breaksFoundationDirection,
  },
  {
    rule: "platform-direction",
    why: "Cross-cutting platform capabilities cannot depend on product features or route composition.",
    fix: "Pass feature data through the platform API or move the orchestration to a route or layout.",
    matches: breaksPlatformDirection,
  },
  {
    rule: "client-server-boundary",
    why: "Browser-capable modules must not pull server code, secrets, filesystem access, or database clients into their runtime graph.",
    fix: "Load server data in a route, pass serializable values into the component, or change the import to an explicit type-only import.",
    matches: breaksBrowserBoundary,
  },
  {
    rule: "production-dependency",
    why: "Production code cannot depend on tests, stories, or repository tooling.",
    fix: "Move reusable code into its owning app module and keep test, story, or script adapters outside production code.",
    matches: breaksProductionDependency,
  },
];

export function violationFor(
  edge: ImportEdge,
  browserPath?: string[],
): ArchitectureViolation | null {
  const context = {
    edge,
    browserPath,
    sourceOwner: ownerOf(edge.source),
    targetOwner: ownerOf(edge.target),
  };
  const rule = RULES.find((candidate) => candidate.matches(context));
  if (!rule) return null;
  return {
    ...edge,
    rule: rule.rule,
    why: rule.why,
    fix: rule.fix,
    docsAnchor: rule.rule,
    ...(rule.rule === "client-server-boundary" && { browserPath }),
  };
}

function breaksFeatureIsolation({ edge, sourceOwner, targetOwner }: RuleContext): boolean {
  if (sourceOwner.kind !== "feature" || targetOwner.kind !== "feature") return false;
  if (sourceOwner.name === targetOwner.name) return false;
  return !CROSS_FEATURE_CONTRACTS.get(sourceOwner.name)?.has(edge.target);
}

function isProductOwner(owner: Owner): boolean {
  return owner.kind === "feature" || owner.kind === "composition";
}

function breaksFoundationDirection({ edge, sourceOwner, targetOwner }: RuleContext): boolean {
  return !edge.typeOnly && sourceOwner.kind === "foundation" && isProductOwner(targetOwner);
}

function breaksPlatformDirection({ edge, sourceOwner, targetOwner }: RuleContext): boolean {
  return !edge.typeOnly && sourceOwner.kind === "platform" && isProductOwner(targetOwner);
}

function isServerTarget(target: string): boolean {
  const prefixes = ["app/server/", "generated/", "prisma/"];
  return (
    isBuiltin(target) ||
    prefixes.some((prefix) => target.startsWith(prefix)) ||
    /\.server(?:\/|$)/.test(target)
  );
}

function breaksBrowserBoundary({ edge, browserPath }: RuleContext): boolean {
  return Boolean(browserPath) && isServerTarget(edge.target) && !edge.typeOnly;
}

function breaksProductionDependency({ edge }: RuleContext): boolean {
  const production = ["app/", "server/"].some((prefix) => edge.source.startsWith(prefix));
  const tooling = ["tests/", "scripts/", "stories/", ".storybook/"].some((prefix) =>
    edge.target.startsWith(prefix),
  );
  return !edge.typeOnly && production && tooling;
}
