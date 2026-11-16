import { useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router";

import { isPublicPathname } from "#app/platform/view-transitions/view-transition-model";

const NAVIGATION_PROGRESS_DELAY_MS = 200;
const NAVIGATION_PROGRESS_MIN_VISIBLE_MS = 140;

export function NavigationProgress() {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);
  const isPublicGetNavigation =
    navigation.state === "loading" &&
    navigation.location !== undefined &&
    isPublicPathname(navigation.location.pathname) &&
    (!navigation.formMethod || navigation.formMethod.toUpperCase() === "GET");

  // Each timer only matters until the next navigation or visibility change, so
  // the effect cleanup cancels it whenever either dependency changes or on unmount.
  useEffect(() => {
    if (isPublicGetNavigation) {
      if (visible) return;

      const delayTimer = setTimeout(() => {
        shownAtRef.current = performance.now();
        setVisible(true);
      }, NAVIGATION_PROGRESS_DELAY_MS);
      return () => clearTimeout(delayTimer);
    }

    if (!visible) return;

    const elapsed = performance.now() - shownAtRef.current;
    const remaining = Math.max(0, NAVIGATION_PROGRESS_MIN_VISIBLE_MS - elapsed);
    const hideTimer = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(hideTimer);
  }, [isPublicGetNavigation, visible]);

  return (
    <div
      data-navigation-progress=""
      data-visible={visible ? "true" : "false"}
      aria-hidden={visible ? undefined : true}
      aria-label={visible ? "Učitavanje stranice" : undefined}
      role={visible ? "progressbar" : undefined}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-50 h-0.5 overflow-hidden"
    >
      <span className="bg-primary block h-full w-1/2 origin-center" />
    </div>
  );
}
