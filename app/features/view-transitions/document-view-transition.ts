import {
  PUBLIC_VIEW_TRANSITION_KINDS,
  VIEW_TRANSITION_KIND_ATTRIBUTE,
  type PublicViewTransitionKind,
} from "#app/features/view-transitions/view-transition-model";

type ViewTransitionHandle = {
  finished: Promise<unknown>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: VoidFunction) => ViewTransitionHandle;
};

function getDocumentViewTransitionKind(): PublicViewTransitionKind | null {
  if (typeof document === "undefined") return null;

  const value = document.documentElement.getAttribute(VIEW_TRANSITION_KIND_ATTRIBUTE);

  return isPublicViewTransitionKind(value) ? value : null;
}

export function setDocumentViewTransitionKind(kind: PublicViewTransitionKind) {
  if (typeof document === "undefined") return;

  document.documentElement.setAttribute(VIEW_TRANSITION_KIND_ATTRIBUTE, kind);
}

export function clearDocumentViewTransitionKind(expectedKind?: PublicViewTransitionKind) {
  if (typeof document === "undefined") return;

  const element = document.documentElement;
  if (expectedKind && element.getAttribute(VIEW_TRANSITION_KIND_ATTRIBUTE) !== expectedKind) return;

  element.removeAttribute(VIEW_TRANSITION_KIND_ATTRIBUTE);
}

let latestThemeTransitionToken = 0;
export function startThemeViewTransition(update: VoidFunction): boolean {
  if (typeof document === "undefined") return false;

  const currentKind = getDocumentViewTransitionKind();
  if (currentKind && currentKind !== "theme") return false;

  const transitionDocument = document as ViewTransitionDocument;
  if (typeof transitionDocument.startViewTransition !== "function") return false;

  const token = ++latestThemeTransitionToken;
  setDocumentViewTransitionKind("theme");

  const clearKind = () => {
    if (latestThemeTransitionToken !== token) return;

    clearDocumentViewTransitionKind("theme");
  };

  try {
    const transition = transitionDocument.startViewTransition.call(document, update);
    void transition.finished.then(clearKind, clearKind);

    return true;
  } catch {
    clearKind();

    return false;
  }
}

function isPublicViewTransitionKind(value: string | null): value is PublicViewTransitionKind {
  return value !== null && PUBLIC_VIEW_TRANSITION_KINDS.some((kind) => kind === value);
}
