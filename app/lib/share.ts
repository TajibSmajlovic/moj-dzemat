/**
   Pop a Facebook share dialog for the current (or provided) path. We
   only touch `window` at call time so SSR renders stay inert; the
   caller is responsible for wiring this up to a user-initiated click
   (popup blockers will eat non-user-triggered `window.open` calls).
 */
function buildFacebookShareUrl(url: string): string {
  // Facebook excludes this fragment from its iOS universal links, keeping the
  // web share dialog in the browser instead of opening the app's home screen.
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}#no_universal_links`;
}

export function shareOnFacebook(path?: string): void {
  if (typeof globalThis === "undefined") return;

  const url = `${globalThis.location.origin}${path ?? globalThis.location.pathname}`;
  const shareUrl = buildFacebookShareUrl(url);
  window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=600");
}
