import { useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router";

import { isPublicPathname } from "#app/features/view-transitions/view-transition-model";

const NAVIGATION_PROGRESS_DELAY_MS = 200;
const NAVIGATION_PROGRESS_MIN_VISIBLE_MS = 140;

export function NavigationProgress() {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAt = useRef(0);
  const isPublicGetNavigation =
    navigation.state === "loading" &&
    navigation.location !== undefined &&
    isPublicPathname(navigation.location.pathname) &&
    (!navigation.formMethod || navigation.formMethod.toUpperCase() === "GET");

  useEffect(() => {
    if (isPublicGetNavigation) {
      clearTimer(hideTimer);

      if (!visible && !delayTimer.current) {
        delayTimer.current = setTimeout(() => {
          delayTimer.current = null;
          shownAt.current = performance.now();
          setVisible(true);
        }, NAVIGATION_PROGRESS_DELAY_MS);
      }

      return;
    }

    clearTimer(delayTimer);
    if (!visible || hideTimer.current) return;

    const elapsed = performance.now() - shownAt.current;
    const remaining = Math.max(0, NAVIGATION_PROGRESS_MIN_VISIBLE_MS - elapsed);

    hideTimer.current = setTimeout(() => {
      hideTimer.current = null;
      setVisible(false);
    }, remaining);
  }, [isPublicGetNavigation, visible]);

  useEffect(
    () => () => {
      clearTimer(delayTimer);
      clearTimer(hideTimer);
    },
    [],
  );

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

function clearTimer(timer: React.RefObject<ReturnType<typeof setTimeout> | null>) {
  if (!timer.current) return;

  clearTimeout(timer.current);
  timer.current = null;
}
