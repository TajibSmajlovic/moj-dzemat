/** Marks <html> while a theme crossfade runs; `view-transitions.css` reads it. */
const THEME_TRANSITION_ATTRIBUTE = "data-theme-transition";

type ViewTransitionHandle = {
  finished: Promise<unknown>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: VoidFunction) => ViewTransitionHandle;
};

let latestThemeTransitionToken = 0;
export function startThemeViewTransition(update: VoidFunction): boolean {
  if (typeof document === "undefined") return false;

  const transitionDocument = document as ViewTransitionDocument;
  if (typeof transitionDocument.startViewTransition !== "function") return false;

  const root = document.documentElement;
  const token = ++latestThemeTransitionToken;
  root.setAttribute(THEME_TRANSITION_ATTRIBUTE, "");

  const clearMarker = () => {
    if (latestThemeTransitionToken !== token) return;

    root.removeAttribute(THEME_TRANSITION_ATTRIBUTE);
  };

  try {
    const transition = transitionDocument.startViewTransition.call(document, update);
    void transition.finished.then(clearMarker).catch(clearMarker);

    return true;
  } catch {
    clearMarker();

    return false;
  }
}
