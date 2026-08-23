import { forwardRef, type MouseEvent } from "react";
import { createPath, Link, type LinkProps, useLocation, useResolvedPath } from "react-router";

import { useOptionalPublicViewTransition } from "#app/platform/view-transitions/public-view-transition-provider";

type PublicTransitionLinkProps = Omit<LinkProps, "download" | "reloadDocument" | "viewTransition">;

export const PublicTransitionLink = forwardRef<HTMLAnchorElement, PublicTransitionLinkProps>(
  function PublicTransitionLink({ onClick, relative, target, to, ...props }, ref) {
    const location = useLocation();
    const resolved = useResolvedPath(to, { relative });
    const transition = useOptionalPublicViewTransition();
    const currentUrl = createPath(location);
    const targetUrl = createPath(resolved);
    const alreadyAtDestination = currentUrl === targetUrl;
    const transitionEnabled = transition !== null && !alreadyAtDestination;

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (!shouldHandleTransitionClick(event, target)) return;

      if (alreadyAtDestination) return;

      transition?.beginSection(targetUrl);
    };

    return (
      <Link
        {...props}
        ref={ref}
        to={to}
        relative={relative}
        target={target}
        onClick={handleClick}
        viewTransition={transitionEnabled}
      />
    );
  },
);

function shouldHandleTransitionClick(
  event: Pick<
    MouseEvent<HTMLAnchorElement>,
    "button" | "defaultPrevented" | "metaKey" | "altKey" | "ctrlKey" | "shiftKey"
  >,
  target?: string,
): boolean {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    (!target || target === "_self")
  );
}
