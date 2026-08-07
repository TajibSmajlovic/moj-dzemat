export const VIEW_TRANSITION_KIND_ATTRIBUTE = "data-view-transition-kind";

const POST_TITLE_TRANSITION_NAME = "post-title";
const POST_MEDIA_TRANSITION_NAME = "post-media";

export const PUBLIC_VIEW_TRANSITION_KINDS = [
  "section",
  "post-forward",
  "post-back",
  "theme",
] as const;

export type PublicViewTransitionKind = (typeof PUBLIC_VIEW_TRANSITION_KINDS)[number];
export type PublicRouteViewTransitionKind = Exclude<PublicViewTransitionKind, "theme">;
export type PostTransitionSourceKind = "card" | "hero";
export type PostTransitionAnchor = "title" | "media";
export type PostTransitionMediaKind = "image" | "video";
export type PostDetailTransitionMedia = { kind: "image"; id: string } | { kind: "video" } | null;

export type PostTransitionOrigin = {
  version: 1;
  slug: string;
  sourceKind: PostTransitionSourceKind;
  anchor: PostTransitionAnchor;
  thumbnailId: string | null;
  originUrl: string;
  originLocationKey: string;
};

export type PublicNavigationState = {
  fromList: true;
  postTransition: PostTransitionOrigin;
};

type PostSourceAnchorInput = {
  sourceKind: PostTransitionSourceKind;
  thumbnailId: string | null;
  firstMediaKind: PostTransitionMediaKind | null;
};

export function resolvePostSourceAnchor({
  sourceKind,
  thumbnailId,
  firstMediaKind,
}: PostSourceAnchorInput): PostTransitionAnchor {
  if (sourceKind === "hero") return "title";
  if (thumbnailId && firstMediaKind === "image") return "media";

  return "title";
}

export function resolvePostDetailAnchor({
  origin,
  slug,
  firstMedia,
}: {
  origin: PostTransitionOrigin | null;
  slug: string;
  firstMedia: PostDetailTransitionMedia;
}): PostTransitionAnchor | null {
  if (origin?.slug !== slug) return null;
  if (origin.anchor === "title") return "title";

  return firstMedia?.kind === "image" && firstMedia.id === origin.thumbnailId ? "media" : null;
}

export function transitionNameForAnchor(
  activeAnchor: PostTransitionAnchor | null,
  elementAnchor: PostTransitionAnchor,
): string | undefined {
  if (activeAnchor !== elementAnchor) return;

  return elementAnchor === "media" ? POST_MEDIA_TRANSITION_NAME : POST_TITLE_TRANSITION_NAME;
}

export function isMatchingPostSource(
  origin: PostTransitionOrigin | null,
  source: Pick<
    PostTransitionOrigin,
    "slug" | "sourceKind" | "thumbnailId" | "originUrl" | "originLocationKey"
  >,
): boolean {
  return (
    origin?.slug === source.slug &&
    origin.sourceKind === source.sourceKind &&
    origin.thumbnailId === source.thumbnailId &&
    origin.originUrl === source.originUrl &&
    origin.originLocationKey === source.originLocationKey
  );
}

export function readPostTransitionOrigin(state: unknown): PostTransitionOrigin | null {
  if (!isRecord(state)) return null;

  const candidate = state.postTransition;
  if (!isRecord(candidate)) return null;

  if (
    candidate.version !== 1 ||
    typeof candidate.slug !== "string" ||
    (candidate.sourceKind !== "card" && candidate.sourceKind !== "hero") ||
    (candidate.anchor !== "title" && candidate.anchor !== "media") ||
    (candidate.thumbnailId !== null && typeof candidate.thumbnailId !== "string") ||
    typeof candidate.originUrl !== "string" ||
    typeof candidate.originLocationKey !== "string"
  ) {
    return null;
  }

  return candidate as PostTransitionOrigin;
}

export function hasNavigationStateFlag(state: unknown, key: string): boolean {
  return isRecord(state) && Boolean(state[key]);
}

export function readRouterHistoryEntry(
  state: unknown,
): { locationKey: string; navigationState: unknown } | null {
  // React Router stores the public Location fields as `key` and `usr` in the
  // browser history entry. Validate that boundary before reading either value.
  if (!isRecord(state) || typeof state.key !== "string") return null;

  return { locationKey: state.key, navigationState: state.usr };
}

export function isPostTransitionOriginLocation(
  origin: PostTransitionOrigin,
  location: { key: string; url: string },
): boolean {
  return origin.originLocationKey === location.key && origin.originUrl === location.url;
}

export function isPublicPathname(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/objave" ||
    pathname.startsWith("/objave/") ||
    pathname === "/kontakt" ||
    pathname === "/pitanja-i-odgovori" ||
    pathname.startsWith("/pitanja-i-odgovori/")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
