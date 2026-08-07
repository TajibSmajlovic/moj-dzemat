import type { MouseEvent } from "react";
import { createPath, useLocation } from "react-router";

import { shouldHandleTransitionClick } from "#app/features/view-transitions/public-transition-link";
import { useOptionalPublicViewTransition } from "#app/features/view-transitions/public-view-transition-provider";
import {
  resolvePostSourceAnchor,
  type PostTransitionOrigin,
  type PostTransitionMediaKind,
  type PostTransitionSourceKind,
  type PublicNavigationState,
} from "#app/features/view-transitions/view-transition-model";

export function usePostTransitionSource({
  slug,
  sourceKind,
  thumbnailId,
  firstMediaKind,
  targetUrl,
}: {
  slug: string;
  sourceKind: PostTransitionSourceKind;
  thumbnailId: string | null;
  firstMediaKind: PostTransitionMediaKind | null;
  targetUrl: string;
}) {
  const location = useLocation();
  const transition = useOptionalPublicViewTransition();
  const originUrl = createPath(location);
  const anchor = resolvePostSourceAnchor({ sourceKind, thumbnailId, firstMediaKind });
  const origin: PostTransitionOrigin = {
    version: 1,
    slug,
    sourceKind,
    anchor,
    thumbnailId,
    originUrl,
    originLocationKey: location.key,
  };
  const state: PublicNavigationState = { fromList: true, postTransition: origin };

  const activeAnchor = transition?.activeAnchorForSource(origin) ?? null;
  const routeTransitionActive = transition?.routeTransitionActive ?? false;

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!shouldHandleTransitionClick(event)) return;
    transition?.beginPostForward(origin, targetUrl);
  };

  return {
    activeAnchor,
    onClick,
    routeTransitionActive,
    state,
    viewTransition: true as const,
  };
}
