/**
 * Baseline HTTP security headers. Applied as Express middleware so every
 * response - static assets, SSR HTML, admin JSON - gets them. CSP is left
 * out until we know which external domains the admin UI actually uses
 * (we'd otherwise end up allowlisting too much too early).
 */

export function securityHeaders(options: { isProd: boolean }): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  if (options.isProd) {
    // 180 days, preload-eligible. Fly already terminates TLS, so we
    // only enable HSTS in prod so localhost HTTP stays usable.
    headers["Strict-Transport-Security"] = "max-age=15552000; includeSubDomains";
  }
  return headers;
}
