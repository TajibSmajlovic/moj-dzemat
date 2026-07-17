import { DAY_SECONDS } from "#app/lib/time";

/**
   Baseline HTTP security headers. Applied as Express middleware so every
   response - static assets, SSR HTML, admin JSON - gets them.
 */

const HSTS_MAX_AGE_SECONDS = 180 * DAY_SECONDS;

const PRODUCTION_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://i.ytimg.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "connect-src 'self' https://cloudflareinsights.com",
  "frame-src https://www.youtube-nocookie.com https://www.google.com",
  "upgrade-insecure-requests",
].join("; ");

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
    // Enforce HTTPS for 180 days, including subdomains. This is intentionally
    // not an HSTS preload policy. Localhost HTTP remains usable outside prod.
    headers["Strict-Transport-Security"] = `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains`;
    headers["Content-Security-Policy"] = PRODUCTION_CSP;
  }

  return headers;
}
