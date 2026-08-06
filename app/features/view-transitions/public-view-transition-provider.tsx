import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPath, useLocation, useNavigation, useViewTransitionState } from "react-router";

import {
  clearDocumentViewTransitionKind,
  setDocumentViewTransitionKind,
} from "#app/features/view-transitions/document-view-transition";
import {
  isMatchingPostSource,
  isPostTransitionOriginLocation,
  isPublicPathname,
  readPostTransitionOrigin,
  readRouterHistoryEntry,
  resolvePostDetailAnchor,
  type PostDetailTransitionMedia,
  type PostTransitionAnchor,
  type PostTransitionOrigin,
  type PublicRouteViewTransitionKind,
} from "#app/features/view-transitions/view-transition-model";

const INTENT_FALLBACK_TIMEOUT_MS = 30_000;

type IntentBase = {
  token: number;
  targetUrl: string;
  startedFromLocationKey: string;
};

type ActiveIntent = IntentBase &
  (
    | { kind: "section" }
    | {
        kind: Exclude<PublicRouteViewTransitionKind, "section">;
        origin: PostTransitionOrigin;
      }
  );

type BeginIntent =
  | { kind: "section"; targetUrl: string }
  | {
      kind: Exclude<PublicRouteViewTransitionKind, "section">;
      targetUrl: string;
      origin: PostTransitionOrigin;
    };

type PostSourceIdentity = Pick<
  PostTransitionOrigin,
  "slug" | "sourceKind" | "thumbnailId" | "originUrl" | "originLocationKey"
>;

type PublicViewTransitionContextValue = {
  routeTransitionActive: boolean;
  suppressRouteMotion: boolean;
  beginSection: (targetUrl: string) => void;
  beginPostForward: (origin: PostTransitionOrigin, targetUrl: string) => void;
  beginPostBack: (origin: PostTransitionOrigin) => void;
  activeAnchorForSource: (source: PostSourceIdentity) => PostTransitionAnchor | null;
  activeAnchorForDetail: (
    slug: string,
    firstMedia: PostDetailTransitionMedia,
  ) => PostTransitionAnchor | null;
};

const PublicViewTransitionContext = createContext<PublicViewTransitionContextValue | null>(null);

export function PublicViewTransitionProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigation = useNavigation();
  const nextToken = useRef(0);
  const navigationStartedForToken = useRef<number | null>(null);
  const routerTransitionSeenForToken = useRef<number | null>(null);
  const [intent, setIntent] = useState<ActiveIntent | null>(null);
  const intentRef = useRef<ActiveIntent | null>(intent);
  const transitionTarget = intent?.targetUrl ?? location.pathname;
  const routerTransitionActive = useViewTransitionState(transitionTarget);
  const routeTransitionActive = intent !== null && routerTransitionActive;

  const replaceIntent = useCallback((nextIntent: ActiveIntent | null) => {
    intentRef.current = nextIntent;
    navigationStartedForToken.current = null;
    routerTransitionSeenForToken.current = null;
    setIntent(nextIntent);
  }, []);

  const beginIntent = useCallback(
    (nextIntent: BeginIntent) => {
      const token = ++nextToken.current;
      setDocumentViewTransitionKind(nextIntent.kind);
      replaceIntent({
        ...nextIntent,
        token,
        startedFromLocationKey: location.key,
      });
    },
    [location.key, replaceIntent],
  );

  const finishIntent = useCallback(
    (token: number) => {
      const current = intentRef.current;
      if (current?.token !== token) return;

      clearDocumentViewTransitionKind(current.kind);
      replaceIntent(null);
    },
    [replaceIntent],
  );

  const beginSection = useCallback(
    (targetUrl: string) => {
      beginIntent({ kind: "section", targetUrl });
    },
    [beginIntent],
  );

  const beginPostForward = useCallback(
    (origin: PostTransitionOrigin, targetUrl: string) => {
      beginIntent({ kind: "post-forward", targetUrl, origin });
    },
    [beginIntent],
  );

  const beginPostBack = useCallback(
    (origin: PostTransitionOrigin) => {
      beginIntent({ kind: "post-back", targetUrl: origin.originUrl, origin });
    },
    [beginIntent],
  );

  useEffect(() => {
    if (!intent) return;

    if (navigation.state !== "idle") {
      navigationStartedForToken.current = intent.token;
    }

    if (routerTransitionActive) {
      routerTransitionSeenForToken.current = intent.token;
      return;
    }

    if (routerTransitionSeenForToken.current === intent.token) {
      finishIntent(intent.token);
      return;
    }

    if (navigationStartedForToken.current === intent.token && navigation.state === "idle") {
      finishIntent(intent.token);
      return;
    }

    if (location.key !== intent.startedFromLocationKey && navigation.state === "idle") {
      finishIntent(intent.token);
    }
  }, [finishIntent, intent, location.key, navigation.state, routerTransitionActive]);

  useEffect(() => {
    if (!intent) return;

    // A blocked navigation may never change either Router signal. Keep the
    // document marker bounded so it cannot affect later interactions forever.
    const token = intent.token;
    const timeout = globalThis.setTimeout(() => finishIntent(token), INTENT_FALLBACK_TIMEOUT_MS);

    return () => globalThis.clearTimeout(timeout);
  }, [finishIntent, intent]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const targetEntry = readRouterHistoryEntry(event.state);
      if (!targetEntry) return;

      const currentUrl = createPath(location);
      const targetUrl = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;
      if (intentRef.current?.targetUrl === targetUrl) return;

      const currentOrigin = readPostTransitionOrigin(location.state);

      if (
        currentOrigin &&
        isPostTransitionOriginLocation(currentOrigin, {
          key: targetEntry.locationKey,
          url: targetUrl,
        })
      ) {
        beginIntent({ kind: "post-back", targetUrl, origin: currentOrigin });
        return;
      }

      const targetOrigin = readPostTransitionOrigin(targetEntry.navigationState);
      if (
        targetOrigin &&
        isPostTransitionOriginLocation(targetOrigin, {
          key: location.key,
          url: currentUrl,
        })
      ) {
        beginIntent({ kind: "post-forward", targetUrl, origin: targetOrigin });
        return;
      }

      if (
        location.pathname !== globalThis.location.pathname &&
        isPublicPathname(location.pathname) &&
        isPublicPathname(globalThis.location.pathname)
      ) {
        beginIntent({ kind: "section", targetUrl });
      }
    };

    // Capture runs before React Router's bubble listener. This gives React time
    // to assign shared names before Router captures the outgoing snapshot.
    globalThis.addEventListener("popstate", handlePopState, true);

    return () => globalThis.removeEventListener("popstate", handlePopState, true);
  }, [beginIntent, location]);

  useEffect(
    () => () => {
      const current = intentRef.current;
      if (current) clearDocumentViewTransitionKind(current.kind);
    },
    [],
  );

  const activeAnchorForSource = useCallback(
    (source: PostSourceIdentity): PostTransitionAnchor | null => {
      if (!intent || intent.kind === "section") return null;
      if (!isMatchingPostSource(intent.origin, source)) return null;

      return intent.origin.anchor;
    },
    [intent],
  );

  const activeAnchorForDetail = useCallback(
    (slug: string, firstMedia: PostDetailTransitionMedia): PostTransitionAnchor | null => {
      if (!intent || intent.kind === "section") return null;

      return resolvePostDetailAnchor({ origin: intent.origin, slug, firstMedia });
    },
    [intent],
  );

  const value = useMemo<PublicViewTransitionContextValue>(
    () => ({
      routeTransitionActive,
      suppressRouteMotion: intent !== null,
      beginSection,
      beginPostForward,
      beginPostBack,
      activeAnchorForSource,
      activeAnchorForDetail,
    }),
    [
      activeAnchorForDetail,
      activeAnchorForSource,
      beginPostBack,
      beginPostForward,
      beginSection,
      intent,
      routeTransitionActive,
    ],
  );

  return (
    <PublicViewTransitionContext.Provider value={value}>
      {children}
    </PublicViewTransitionContext.Provider>
  );
}

export function useOptionalPublicViewTransition() {
  return useContext(PublicViewTransitionContext);
}

export function useSuppressPublicRouteMotion(): boolean {
  const transition = useOptionalPublicViewTransition();

  return transition?.suppressRouteMotion ?? false;
}
