import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigation, useViewTransitionState } from "react-router";

import {
  clearDocumentViewTransitionKind,
  setDocumentViewTransitionKind,
} from "#app/features/view-transitions/document-view-transition";
import { isPublicPathname } from "#app/features/view-transitions/view-transition-model";

const INTENT_FALLBACK_TIMEOUT_MS = 30_000;

type IntentBase = {
  token: number;
  targetUrl: string;
  startedFromLocationKey: string;
};

type ActiveIntent = IntentBase & { kind: "section" };

type PublicViewTransitionContextValue = {
  suppressRouteMotion: boolean;
  beginSection: (targetUrl: string) => void;
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

  const replaceIntent = useCallback((nextIntent: ActiveIntent | null) => {
    intentRef.current = nextIntent;
    navigationStartedForToken.current = null;
    routerTransitionSeenForToken.current = null;
    setIntent(nextIntent);
  }, []);

  const beginIntent = useCallback(
    (targetUrl: string) => {
      const token = ++nextToken.current;
      setDocumentViewTransitionKind("section");
      replaceIntent({
        kind: "section",
        targetUrl,
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
      beginIntent(targetUrl);
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
    const handlePopState = () => {
      const targetUrl = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;
      if (intentRef.current?.targetUrl === targetUrl) return;

      if (
        location.pathname !== globalThis.location.pathname &&
        isPublicPathname(location.pathname) &&
        isPublicPathname(globalThis.location.pathname)
      ) {
        beginIntent(targetUrl);
      }
    };

    // Capture runs before React Router's bubble listener so the section marker
    // is set before Router captures the outgoing snapshot.
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

  const value = useMemo<PublicViewTransitionContextValue>(
    () => ({
      suppressRouteMotion: intent !== null,
      beginSection,
    }),
    [beginSection, intent],
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
