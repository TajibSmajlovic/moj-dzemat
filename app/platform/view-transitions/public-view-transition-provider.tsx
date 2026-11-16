import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  ViewTransition,
} from "react";
import { useLocation, useNavigation } from "react-router";

import {
  isPublicPathname,
  PUBLIC_SECTION_TRANSITION_CLASS,
} from "#app/platform/view-transitions/view-transition-model";

const INTENT_FALLBACK_TIMEOUT_MS = 30_000;

type SectionIntent = {
  token: number;
  targetUrl: string;
  startedFromLocationKey: string;
};

type PublicViewTransitionContextValue = {
  sectionKey: string;
  sectionPending: boolean;
  beginSection: (targetUrl: string) => void;
};

const PublicViewTransitionContext = createContext<PublicViewTransitionContextValue | null>(null);

export function PublicViewTransitionProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigation = useNavigation();
  const nextTokenRef = useRef(0);
  const navigationStartedForTokenRef = useRef<number | null>(null);
  const [intent, setIntent] = useState<SectionIntent | null>(null);
  const intentRef = useRef<SectionIntent | null>(intent);
  const [sectionKey, setSectionKey] = useState(location.key);

  // A new key in the destination render makes the outgoing and incoming pages
  // separate exit and enter snapshots. Only section navigations change it, so
  // filters, pagination, and revalidation keep their route state.
  if (intent && location.key !== intent.startedFromLocationKey && sectionKey !== location.key) {
    setSectionKey(location.key);
  }

  const replaceIntent = useCallback((nextIntent: SectionIntent | null) => {
    intentRef.current = nextIntent;
    navigationStartedForTokenRef.current = null;
    setIntent(nextIntent);
  }, []);

  const beginSection = useCallback(
    (targetUrl: string) => {
      replaceIntent({
        targetUrl,
        token: ++nextTokenRef.current,
        startedFromLocationKey: location.key,
      });
    },
    [location.key, replaceIntent],
  );

  const finishIntent = useCallback(
    (token: number) => {
      if (intentRef.current?.token !== token) return;

      replaceIntent(null);
    },
    [replaceIntent],
  );

  // The intent must outlive the commit that renders the destination, because
  // that commit reads the section class to start React's View Transition.
  useEffect(() => {
    if (!intent) return;

    if (navigation.state !== "idle") {
      navigationStartedForTokenRef.current = intent.token;
      return;
    }

    if (
      navigationStartedForTokenRef.current === intent.token ||
      location.key !== intent.startedFromLocationKey
    ) {
      finishIntent(intent.token);
    }
  }, [finishIntent, intent, location.key, navigation.state]);

  useEffect(() => {
    if (!intent) return;

    // A blocked navigation may never change either Router signal. Keep the
    // intent bounded so it cannot animate a later, unrelated update.
    const token = intent.token;
    const timeout = setTimeout(() => finishIntent(token), INTENT_FALLBACK_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [finishIntent, intent]);

  const handlePopState = useEffectEvent(() => {
    const targetUrl = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;
    if (intentRef.current?.targetUrl === targetUrl) return;

    if (
      location.pathname !== globalThis.location.pathname &&
      isPublicPathname(location.pathname) &&
      isPublicPathname(globalThis.location.pathname)
    ) {
      beginSection(targetUrl);
    }
  });

  useEffect(() => {
    const listener = () => handlePopState();

    // Capture runs before React Router's bubble listener so the section intent
    // is rendered before Router commits the destination. The listener stays
    // registered for the provider's lifetime and reads the committed location
    // when it runs. Registering it again for each location let a second Back
    // arrive while the first one was committing, and that Back did not animate.
    addEventListener("popstate", listener, { capture: true });

    return () => removeEventListener("popstate", listener, true);
  }, []);

  const value = useMemo<PublicViewTransitionContextValue>(
    () => ({
      sectionKey,
      sectionPending: intent !== null,
      beginSection,
    }),
    [beginSection, intent, sectionKey],
  );

  return <PublicViewTransitionContext value={value}>{children}</PublicViewTransitionContext>;
}

/**
   Animates public section changes as an exit and an enter, so each page keeps
   its own on-screen position instead of morphing between scroll offsets.
   Updates never animate, because the Router's pending-navigation commit is an
   update of this boundary too.
 */
export function PublicSectionViewTransition({ children }: { children: React.ReactNode }) {
  const transition = use(PublicViewTransitionContext);
  const sectionClass = transition?.sectionPending ? PUBLIC_SECTION_TRANSITION_CLASS : "none";

  return (
    <ViewTransition
      key={transition?.sectionKey}
      default="none"
      enter={sectionClass}
      exit={sectionClass}
    >
      {children}
    </ViewTransition>
  );
}

export function useOptionalPublicViewTransition() {
  return use(PublicViewTransitionContext);
}

export function useSuppressPublicRouteMotion(): boolean {
  const transition = useOptionalPublicViewTransition();

  return transition?.sectionPending ?? false;
}
