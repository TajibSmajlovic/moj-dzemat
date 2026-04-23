/**
 * Pop a Facebook share dialog for the current (or provided) path. We
 * only touch `window` at call time so SSR renders stay inert; the
 * caller is responsible for wiring this up to a user-initiated click
 * (popup blockers will eat non-user-triggered `window.open` calls).
 */
export function shareOnFacebook(path?: string): void {
  if (typeof globalThis === "undefined") return;

  const url = `${globalThis.location.origin}${path ?? globalThis.location.pathname}`;
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=600");
}
